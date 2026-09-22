require('dotenv').config({path:require('path').resolve(__dirname,'..','.env')});

const fs = require('fs');
const path = require('path');
const pool = require('./config/dbPool');
const appState = require('./services/appStateStore');
const catalog = require('./services/catalogStore');
const orderStore = require('./services/orderStore');
const promoStore = require('./services/promotionStore');

let CAFE = null;
const requestedCafeId = String(process.env.MIGRATION_CAFE_ID || '').trim();

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', name), 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function stateForCafe(container, fallback) {
  if (!container || typeof container !== 'object' || Array.isArray(container)) return fallback;
  if (container[CAFE] !== undefined) return container[CAFE];
  if (container['cafe-1'] !== undefined) return container['cafe-1'];
  const first = Object.values(container)[0];
  return first !== undefined ? first : fallback;
}

async function cafeExists(cafeId) {
  const [rows] = await pool.execute('SELECT cafe_id,cafe_name,status FROM cafes WHERE cafe_id=? LIMIT 1', [cafeId]);
  return rows[0] || null;
}

async function bootstrapLegacyDemoCafe() {
  console.log('No cafe record exists yet. Restoring the current-branch CafeKiosk demo parent records...');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(`
      INSERT INTO cafes (cafe_id,cafe_name,timezone,status)
      VALUES ('cafe-1','CafeKiosk Demo Cafe','Asia/Manila','Active')
      ON DUPLICATE KEY UPDATE cafe_name=VALUES(cafe_name),status='Active'
    `);

    // These are the same evaluation/demo accounts used by this database branch.
    // Passwords: admin123 / staff123. They can be changed after login.
    await conn.execute(`
      INSERT INTO users (
        cafe_id,full_name,username,email,phone,password_hash,role,is_owner,status,
        email_verified_at,must_change_password,failed_attempts,lock_until
      ) VALUES (
        'cafe-1','CafeKiosk Administrator','admin','admin@cafekiosk.local',NULL,
        '$2a$10$0fCJYl3RSX358.MYVM0SHe7F8KR2j7eorArbdBuAoHANfIVAPWDJy',
        'Admin',1,'Active',NOW(),0,0,NULL
      )
      ON DUPLICATE KEY UPDATE
        full_name=VALUES(full_name),role='Admin',is_owner=1,status='Active',
        email_verified_at=COALESCE(email_verified_at,NOW()),failed_attempts=0,lock_until=NULL
    `);

    await conn.execute(`
      INSERT INTO users (
        cafe_id,full_name,username,email,phone,password_hash,role,is_owner,status,
        email_verified_at,must_change_password,failed_attempts,lock_until
      ) VALUES (
        'cafe-1','CafeKiosk Staff','staff','staff@cafekiosk.local',NULL,
        '$2a$10$39BmwZeX8lS6AgsoST2BCeAZCSRTGdizTMx2/7n4yFVd8Lf1SzMua',
        'Staff',0,'Active',NOW(),0,0,NULL
      )
      ON DUPLICATE KEY UPDATE
        full_name=VALUES(full_name),role='Staff',is_owner=0,status='Active',
        email_verified_at=COALESCE(email_verified_at,NOW()),failed_attempts=0,lock_until=NULL
    `);

    await conn.execute(`
      INSERT INTO store_settings (cafe_id,store_name)
      VALUES ('cafe-1','CafeKiosk Demo Cafe')
      ON DUPLICATE KEY UPDATE store_name=VALUES(store_name)
    `);

    for (const [method, label, enabled, sort] of [
      ['Cash','Cash',1,1],['GCash','GCash / E-wallet',0,2],['Card','Card',0,3],['Other','Other',0,4]
    ]) {
      await conn.execute(`
        INSERT INTO payment_methods (cafe_id,method_name,display_name,is_enabled,sort_order)
        VALUES ('cafe-1',?,?,?,?)
        ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),is_enabled=VALUES(is_enabled),sort_order=VALUES(sort_order)
      `, [method, label, enabled, sort]);
    }

    await conn.execute(`
      INSERT INTO tax_settings (cafe_id,tax_rate_percent,service_charge_percent)
      VALUES ('cafe-1',0,0)
      ON DUPLICATE KEY UPDATE tax_rate_percent=tax_rate_percent
    `);

    await conn.execute(`
      INSERT INTO system_preferences (
        cafe_id,default_order_type,low_stock_warning_default,currency_code,currency_symbol
      ) VALUES ('cafe-1','Dine In',10,'PHP','₱')
      ON DUPLICATE KEY UPDATE currency_code=VALUES(currency_code),currency_symbol=VALUES(currency_symbol)
    `);

    await conn.commit();
    console.log('Created missing cafe-1 parent record and evaluation accounts safely.');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function resolveTargetCafe() {
  if (requestedCafeId) {
    const row = await cafeExists(requestedCafeId);
    if (!row) {
      throw new Error(`The requested cafe_id "${requestedCafeId}" does not exist in MySQL. Run: SELECT cafe_id,cafe_name,status FROM cafes;`);
    }
    CAFE = row.cafe_id;
    console.log(`Target cafe: ${row.cafe_name} (${row.cafe_id})`);
    return;
  }

  // Prefer the legacy/current-branch demo cafe when it already exists.
  const legacy = await cafeExists('cafe-1');
  if (legacy) {
    CAFE = legacy.cafe_id;
    console.log(`Target cafe: ${legacy.cafe_name} (${legacy.cafe_id})`);
    return;
  }

  const [active] = await pool.execute(`
    SELECT cafe_id,cafe_name,status
    FROM cafes
    WHERE status='Active'
    ORDER BY created_at ASC
  `);

  if (active.length === 1) {
    CAFE = active[0].cafe_id;
    console.log(`Target cafe: ${active[0].cafe_name} (${active[0].cafe_id})`);
    return;
  }

  if (active.length > 1) {
    const choices = active.map(x => `  - ${x.cafe_id} : ${x.cafe_name}`).join('\n');
    throw new Error(`Multiple active cafes exist. Re-run MIGRATE_SAMPLE_DATA_TO_MYSQL.bat and enter the cafe_id that should receive the sample data:\n${choices}`);
  }

  const [all] = await pool.execute('SELECT cafe_id,cafe_name,status FROM cafes ORDER BY created_at ASC');
  if (all.length === 1) {
    CAFE = all[0].cafe_id;
    console.log(`Target cafe: ${all[0].cafe_name} (${all[0].cafe_id}) [currently ${all[0].status}]`);
    return;
  }

  if (all.length > 1) {
    const choices = all.map(x => `  - ${x.cafe_id} : ${x.cafe_name} [${x.status}]`).join('\n');
    throw new Error(`No single target cafe can be chosen automatically. Re-run the migration and enter a cafe_id:\n${choices}`);
  }

  // Current database branch expects cafe-1 sample data. If the database is empty,
  // create only the missing parent/demo setup; do not drop or rebuild anything.
  await bootstrapLegacyDemoCafe();
  CAFE = 'cafe-1';
  console.log('Target cafe: CafeKiosk Demo Cafe (cafe-1)');
}

function extractProducts() {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'CafeKiosk-Frontend', 'Assets', 'js', 'menu.js'), 'utf8');
  const start = txt.indexOf('const menuData = {');
  const end = txt.indexOf('// =====================================================\n// ORDER / CART', start);
  const block = start >= 0 ? (end > start ? txt.slice(start, end) : txt.slice(start)) : '';
  const specs = [['coffee','Coffee'],['non-coffee','Non-Coffee'],['milktea','Milktea'],['food','Food'],['snack','Snack'],['dessert','Dessert']];
  const products = [];
  for (let i=0;i<specs.length;i++) {
    const [key,label] = specs[i];
    const patterns = key === 'non-coffee' ? ['"non-coffee": ['] : [`${key}: [`];
    let a=-1;
    for (const pat of patterns) { a=block.indexOf(pat); if(a>=0) break; }
    if(a<0) continue;
    const nextKeys=specs.slice(i+1).map(([k])=>k==='non-coffee'?block.indexOf('"non-coffee": [',a+1):block.indexOf(`${k}: [`,a+1)).filter(x=>x>a);
    const b=nextKeys.length?Math.min(...nextKeys):block.length;
    const part=block.slice(a,b);
    const rx=/\{\s*name:\s*"([^"]+)"\s*,\s*price:\s*([0-9.]+)/g;
    let m;
    while((m=rx.exec(part))) products.push({name:m[1],category:label,price:Number(m[2]),availability:'Available'});
  }
  return products;
}

async function migrateCatalog() {
  const [r] = await pool.execute('SELECT COUNT(*) n FROM products WHERE cafe_id=?',[CAFE]);
  if(Number(r[0].n)>0){console.log(`Catalog: kept ${r[0].n} existing MySQL products for ${CAFE}.`);return;}
  const products=extractProducts();
  const categories=[...new Set(products.map(x=>x.category))].map(name=>({name}));
  await catalog.replace(CAFE,categories,products);
  console.log(`Catalog: imported ${products.length} sample products into ${CAFE}.`);
}

async function migrateStates() {
  const menu=readJson('menu-config.json',{});
  const menuValue=stateForCafe(menu,{products:{},categoryDefaults:{}});
  if(await appState.getState(CAFE,'menu-config',null)===null) await appState.setState(CAFE,'menu-config',menuValue);

  const avail=readJson('menu-availability.json',{});
  const availValue=stateForCafe(avail,[]);
  if(await appState.getState(CAFE,'menu-availability',null)===null) await appState.setState(CAFE,'menu-availability',availValue);

  const inv=readJson('recipe-inventory.json',{});
  const invValue=stateForCafe(inv,{ingredients:[],recipes:[],consumptionByOrder:{},adjustments:[]});
  if(await appState.getState(CAFE,'recipe-inventory',null)===null) await appState.setState(CAFE,'recipe-inventory',invValue);

  console.log('Runtime state: menu configuration, availability and recipe inventory are stored in MySQL app_state.');
  return invValue;
}

async function syncInventory(inv) {
  let count=0;
  for(const i of inv.ingredients||[]) {
    await pool.execute(`INSERT INTO ingredients (cafe_id,ingredient_code,ingredient_name,ingredient_category,unit,current_stock,low_stock_threshold,status) VALUES (?,?,?,?,?,?,?,'Active') ON DUPLICATE KEY UPDATE ingredient_name=VALUES(ingredient_name),ingredient_category=VALUES(ingredient_category),unit=VALUES(unit),current_stock=VALUES(current_stock),low_stock_threshold=VALUES(low_stock_threshold),status='Active'`,[CAFE,String(i.id||i.name).slice(0,120),i.name,i.category||'Other',i.unit||'g',Number(i.stock||0),Number(i.lowStockThreshold||0)]);
    count++;
  }
  const [ings]=await pool.execute('SELECT ingredient_id,ingredient_code FROM ingredients WHERE cafe_id=?',[CAFE]);
  const imap=new Map(ings.map(x=>[x.ingredient_code,String(x.ingredient_id)]));
  let recipeRows=0;
  for(const rec of inv.recipes||[]) {
    const [ps]=await pool.execute(`SELECT p.product_id FROM products p JOIN categories c ON c.category_id=p.category_id WHERE p.cafe_id=? AND p.product_name=? AND c.canonical_key=? LIMIT 1`,[CAFE,rec.itemName,String(rec.category||'').toLowerCase()]);
    if(!ps.length) continue;
    const pid=ps[0].product_id;
    await pool.execute('DELETE FROM product_recipe_ingredients WHERE product_id=?',[pid]);
    const sm=rec.sizeMultipliers||{};
    for(const [name,mult,sort] of [['Base',Number(sm.base||1),1],['Medium',Number(sm.medium||2),2],['Large',Number(sm.large||3),3]]) {
      await pool.execute(`INSERT INTO product_sizes (product_id,size_name,additional_price,recipe_multiplier,sort_order,is_active) VALUES (?,?,0,?,?,1) ON DUPLICATE KEY UPDATE recipe_multiplier=VALUES(recipe_multiplier),sort_order=VALUES(sort_order),is_active=1`,[pid,name,mult,sort]);
    }
    for(const row of rec.ingredients||[]) {
      const iid=imap.get(String(row.ingredientId));
      if(!iid) continue;
      await pool.execute(`INSERT INTO product_recipe_ingredients (product_id,ingredient_id,base_quantity,usage_type,option_name,scale_with_size,sort_order) VALUES (?,?,?,?,?,?,?)`,[pid,Number(iid),Number(row.amount||0),row.mode==='option'?'Option':'Required',row.optionValue||null,row.scaleWithSize===false?0:1,recipeRows++]);
    }
  }
  console.log(`Inventory: synced ${count} ingredients and recipe relationships into ${CAFE}.`);
}

async function migrateOrders() {
  const rows=readJson('orders.json',[]);
  let imported=0;
  for(const original of rows) {
    try {
      const o={...original,cafeId:CAFE};
      const r=await orderStore.createOrder(o);
      if(r.created) imported++;
    } catch(e) {
      console.warn('Order skipped:',original.orderNumber,e.message);
    }
  }
  console.log(`Orders: imported ${imported}; existing duplicates were preserved.`);
}

async function migratePromos() {
  const rows=readJson('promotions.json',[]);
  let n=0;
  for(const original of rows) {
    await promoStore.upsert({...original,cafeId:CAFE});
    n++;
  }
  console.log(`Promotions: imported/updated ${n}.`);
}

async function migrateAudit() {
  const rows=readJson('audit-logs.json',[]);
  let n=0;
  for(const x of rows) {
    const uid=/^\d+$/.test(String(x.userId||''))?Number(x.userId):null;
    await pool.execute(`INSERT IGNORE INTO audit_logs (external_audit_id,cafe_id,user_id,user_name_snapshot,username_snapshot,role_snapshot,action,category,details,entity_id,source,http_method,request_path,ip_address,status_code,success,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[x.id||null,CAFE,uid,x.user||'System',x.userId||null,x.role||'System',x.action||'Activity',x.category||'System',x.details||'',x.entityId||null,x.source||'Server',x.method||null,x.path||null,x.ip||null,Number(x.statusCode||0)||null,x.success===false?0:1,Number(x.durationMs||0)||null,x.createdAt?new Date(x.createdAt):new Date()]);
    n++;
  }
  console.log(`Audit logs: processed ${n} sample entries for ${CAFE}.`);
}

async function verify() {
  const scoped=['users','products','ingredients','orders','promotions','audit_logs','app_state'];
  for(const t of scoped) {
    let sql;
    if(t==='users'||t==='products'||t==='ingredients'||t==='orders'||t==='promotions'||t==='audit_logs'||t==='app_state') sql=`SELECT COUNT(*) n FROM \`${t}\` WHERE cafe_id=?`;
    const [r]=await pool.execute(sql,[CAFE]);
    console.log(`${t.padEnd(14)} ${r[0].n}`);
  }
}

(async()=>{
  try {
    await resolveTargetCafe();
    await appState.ensureTable();
    await migrateCatalog();
    const inv=await migrateStates();
    await syncInventory(inv);
    await migratePromos();
    await migrateOrders();
    await migrateAudit();
    console.log(`\nMySQL integration migration complete for ${CAFE}. Current row counts:`);
    await verify();
    console.log('\nIMPORTANT: JSON files are retained only as backup/sample references. Runtime stores now use MySQL.');
    process.exit(0);
  } catch(e) {
    console.error('\nMigration failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
