// MySQL-backed order persistence. Keeps the same frontend/API shape as the old JSON store.
const pool = require('../config/dbPool');

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}
function iso(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
function paymentStatus(v){const s=String(v||'').trim().toLowerCase();if(s==='paid')return 'Paid';if(s==='failed')return 'Failed';if(s==='refunded')return 'Refunded';if(s.includes('partial'))return 'Partially Refunded';return 'Pending';}
function eligibility(v){const s=String(v||'General').trim().toLowerCase();if(s==='student')return 'Student';if(s==='senior')return 'Senior';if(s==='pwd')return 'PWD';return 'General';}
function paymentMethod(v){const s=String(v||'Cash').toLowerCase();if(s.includes('gcash'))return 'GCash';if(s.includes('card'))return 'Card';if(s.includes('other'))return 'Other';return 'Cash';}
function safeStatus(v){const allowed=['Pending','Preparing','Ready','Completed','Cancelled','Refunded','Voided'];return allowed.includes(v)?v:'Pending';}

async function hydrateRows(rows){
  if(!rows.length)return [];

  // Resolve the authenticated creator's role so every POS order can expose a
  // human-readable origin without changing the stable source value ("POS").
  // This keeps existing reports/filters compatible while letting the UI show
  // Staff POS, Manager POS, or Admin POS.
  const creatorIds=[...new Set(rows.map(r=>Number(r.created_by_user_id)).filter(id=>Number.isFinite(id)&&id>0))];
  const creatorRoleMap=new Map();
  if(creatorIds.length){
    const userMarks=creatorIds.map(()=>'?').join(',');
    const [creatorRows]=await pool.query(`SELECT user_id, role FROM users WHERE user_id IN (${userMarks})`,creatorIds);
    for(const user of creatorRows){
      creatorRoleMap.set(Number(user.user_id),String(user.role||'').trim());
    }
  }

  const ids=rows.map(r=>r.order_id);
  const marks=ids.map(()=>'?').join(',');
  const [items]=await pool.query(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY order_item_id`,ids);
  const itemIds=items.map(x=>x.order_item_id);
  let customs=[];
  if(itemIds.length){const qm=itemIds.map(()=>'?').join(',');[customs]=await pool.query(`SELECT * FROM order_item_customizations WHERE order_item_id IN (${qm}) ORDER BY customization_id`,itemIds);}
  const customMap=new Map();for(const c of customs){if(!customMap.has(c.order_item_id))customMap.set(c.order_item_id,[]);customMap.get(c.order_item_id).push(c.customization_value);}
  const itemMap=new Map();
  for(const i of items){if(!itemMap.has(i.order_id))itemMap.set(i.order_id,[]);itemMap.get(i.order_id).push({
    productId:i.product_id?String(i.product_id):'',name:i.product_name_snapshot,category:i.category_snapshot||'',price:num(i.base_price),customizationCost:num(i.customization_cost),unitPrice:num(i.unit_price),qty:num(i.quantity,1),quantity:num(i.quantity,1),subtotal:num(i.line_total),total:num(i.line_total),customizations:customMap.get(i.order_item_id)||[],selectedSizeName:i.selected_size_name||''
  });}
  return rows.map(r=>{
    const creatorUserId=r.created_by_user_id?Number(r.created_by_user_id):null;
    const creatorRole=creatorUserId?creatorRoleMap.get(creatorUserId)||'':'';
    const source=String(r.source||'').trim()||'Kiosk';
    const sourceLabel=source.toLowerCase().includes('kiosk')
      ? 'Kiosk'
      : creatorRole==='Manager'
        ? 'Manager POS'
        : creatorRole==='Admin'
          ? 'Admin POS'
          : creatorRole==='Staff'
            ? 'Staff POS'
            : 'POS';

    return {
      id:String(r.order_id),cafeId:r.cafe_id,source,sourceLabel,createdByRole:creatorRole||undefined,createdByUserId:creatorUserId,orderNumber:r.order_number,customerName:r.customer_name,customerEligibility:String(r.customer_eligibility||'General').toLowerCase(),serviceType:r.service_type,paymentMethod:r.payment_method,paymentStatus:r.payment_status,paymentAmount:num(r.payment_amount),cashReceived:num(r.cash_received),change:num(r.change_amount),subtotal:num(r.subtotal),discountAmount:num(r.discount_amount),discount:num(r.discount_amount),total:num(r.total_amount),status:r.status,promotionId:r.promotion_id||undefined,promotionName:r.promotion_name_snapshot||undefined,createdAt:iso(r.created_at),updatedAt:iso(r.updated_at),completedAt:iso(r.completed_at),items:itemMap.get(r.order_id)||[]
    };
  });
}

async function listOrders({cafeId,source,status,limit}={}){
  const where=[],params=[];if(cafeId){where.push('cafe_id=?');params.push(cafeId);}if(source){where.push('source=?');params.push(source);}if(status){where.push('status=?');params.push(status);}
  let sql='SELECT * FROM orders'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY created_at DESC';
  const lim=Number(limit);if(Number.isFinite(lim)&&lim>0)sql+=` LIMIT ${Math.min(Math.floor(lim),500)}`;
  const [rows]=await pool.execute(sql,params);return hydrateRows(rows);
}
async function findOrder(identifier){const wanted=String(identifier||'');const [rows]=await pool.execute('SELECT * FROM orders WHERE CAST(order_id AS CHAR)=? OR order_number=? OR order_uuid=? LIMIT 1',[wanted,wanted,wanted]);const out=await hydrateRows(rows);return out[0]||null;}

async function insertItems(conn,orderId,items=[]){
  for(const item of items||[]){
    let productId=null;if(/^\d+$/.test(String(item.productId||'')))productId=Number(item.productId);
    const qty=Math.max(1,Math.floor(num(item.qty??item.quantity,1)));
    const base=num(item.price??item.basePrice??item.unitPrice,0);const customization=num(item.customizationCost,0);const unit=num(item.unitPrice,base+customization);const line=num(item.subtotal??item.total,unit*qty);
    const [result]=await conn.execute(`INSERT INTO order_items (order_id,product_id,product_name_snapshot,category_snapshot,selected_size_name,recipe_multiplier,base_price,size_price_add,customization_cost,unit_price,quantity,line_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[orderId,productId,String(item.name||'Item'),String(item.category||''),String(item.selectedSizeName||'' )||null,num(item.recipeMultiplier,1),base,num(item.sizePriceAdd,0),customization,unit,qty,line]);
    for(const c of (Array.isArray(item.customizations)?item.customizations:[]))await conn.execute('INSERT INTO order_item_customizations (order_item_id,customization_name,customization_value,additional_price) VALUES (?,?,?,?)',[result.insertId,null,String(c),0]);
  }
}

async function createOrder(order){
  const existing=await findOrder(order.orderNumber);if(existing)return {order:existing,created:false};
  const conn=await pool.getConnection();try{await conn.beginTransaction();
    const uuid=(order.id&&/^[0-9a-f-]{36}$/i.test(String(order.id)))?String(order.id):null;
    const [r]=await conn.execute(`INSERT INTO orders (order_uuid,cafe_id,order_number,source,created_by_user_id,customer_name,customer_eligibility,service_type,status,promotion_id,promotion_name_snapshot,subtotal,discount_amount,total_amount,payment_method,payment_status,payment_amount,cash_received,change_amount,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      uuid,order.cafeId,order.orderNumber,order.source,Number.isFinite(Number(order.createdByUserId))?Number(order.createdByUserId):null,order.customerName||'Walk-in Customer',eligibility(order.customerEligibility),order.serviceType||'Dine In',safeStatus(order.status),order.promotionId||null,order.promotionName||null,num(order.subtotal),num(order.discountAmount??order.discount),num(order.total),paymentMethod(order.paymentMethod),paymentStatus(order.paymentStatus),num(order.paymentAmount),num(order.cashReceived),num(order.change),order.createdAt?new Date(order.createdAt):new Date(),new Date(),order.status==='Completed'?new Date():null
    ]);
    await insertItems(conn,r.insertId,order.items||[]);
    await conn.execute(`INSERT INTO order_status_history (order_id,changed_by_user_id,old_status,new_status,reason,source) VALUES (?,?,?,?,?,?)`,[r.insertId,Number.isFinite(Number(order.createdByUserId))?Number(order.createdByUserId):null,null,safeStatus(order.status),null,order.source||'System']);
    await conn.commit();const saved=await findOrder(String(r.insertId));return {order:saved,created:true};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}}

async function updateOrder(identifier,patch={}){
  const current=await findOrder(identifier);if(!current)return null;const conn=await pool.getConnection();try{await conn.beginTransaction();
    const status=patch.status?safeStatus(patch.status):current.status;
    await conn.execute(`UPDATE orders SET customer_name=?,customer_eligibility=?,service_type=?,status=?,status_reason=?,promotion_id=?,promotion_name_snapshot=?,subtotal=?,discount_amount=?,total_amount=?,payment_method=?,payment_status=?,payment_amount=?,cash_received=?,change_amount=?,completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`,[
      patch.customerName??current.customerName,eligibility(patch.customerEligibility??current.customerEligibility),patch.serviceType??current.serviceType,status,patch.statusReason??patch.reason??null,patch.promotionId??current.promotionId??null,patch.promotionName??current.promotionName??null,num(patch.subtotal,current.subtotal),num(patch.discountAmount??patch.discount,current.discountAmount),num(patch.total,current.total),paymentMethod(patch.paymentMethod??current.paymentMethod),paymentStatus(patch.paymentStatus??current.paymentStatus),num(patch.paymentAmount,current.paymentAmount),num(patch.cashReceived,current.cashReceived),num(patch.change,current.change),status==='Completed'?new Date():null,Number(current.id)
    ]);
    if(status!==current.status)await conn.execute('INSERT INTO order_status_history (order_id,changed_by_user_id,old_status,new_status,reason,source) VALUES (?,?,?,?,?,?)',[Number(current.id),Number.isFinite(Number(patch.changedByUserId))?Number(patch.changedByUserId):null,current.status,status,patch.reason||patch.statusReason||null,patch.source||'API']);
    if(Array.isArray(patch.items)){await conn.execute('DELETE FROM order_items WHERE order_id=?',[Number(current.id)]);await insertItems(conn,Number(current.id),patch.items);}
    await conn.commit();return await findOrder(current.id);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}}
async function resetOrders(){await pool.execute('DELETE FROM orders');return [];}
async function readOrders(){return listOrders({});}
async function ensureStore(){return true;}
module.exports={ensureStore,readOrders,listOrders,findOrder,createOrder,updateOrder,resetOrders};
