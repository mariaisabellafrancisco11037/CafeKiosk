const pool = require('../config/dbPool');

function n(value) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function iso(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

exports.getDashboard = async (req, res, next) => {
  try {
    const cafeId = String(req.user?.cafeId || req.query?.cafeId || 'cafe-1');
    const userId = Number(req.user?.userId);
    const personalTrackingAvailable = Number.isFinite(userId) && userId > 0;

    let profile = {
      userId: personalTrackingAvailable ? userId : null,
      displayName: req.user?.displayName || req.user?.username || 'CafeKiosk Staff',
      username: req.user?.username || '', role: req.user?.role || 'Staff', cafeId, cafeName: ''
    };

    if (personalTrackingAvailable) {
      const [rows] = await pool.execute(
        `SELECT u.user_id,u.full_name,u.username,u.role,u.cafe_id,c.cafe_name
           FROM users u LEFT JOIN cafes c ON c.cafe_id=u.cafe_id
          WHERE u.user_id=? AND u.cafe_id=? LIMIT 1`, [userId,cafeId]);
      if (rows.length) profile = {
        userId:Number(rows[0].user_id), displayName:rows[0].full_name||rows[0].username,
        username:rows[0].username, role:rows[0].role, cafeId:rows[0].cafe_id, cafeName:rows[0].cafe_name||''
      };
    }

    const [queueRows] = await pool.execute(
      `SELECT COUNT(*) totalToday,
              SUM(status='Pending') pendingCount,
              SUM(status='Preparing') preparingCount,
              SUM(status='Ready') readyCount,
              SUM(status='Completed') completedToday,
              COALESCE(SUM(CASE WHEN status='Completed' THEN total_amount ELSE 0 END),0) completedSalesToday
         FROM orders
        WHERE cafe_id=? AND created_at>=CURDATE() AND created_at<CURDATE()+INTERVAL 1 DAY`, [cafeId]);
    const q = queueRows[0] || {};

    let personal = { ordersCreatedToday:0, salesCreatedToday:0, completedByMeToday:0 };
    let recentOrders = [];
    if (personalTrackingAvailable) {
      const [pRows] = await pool.execute(
        `SELECT COUNT(*) ordersCreatedToday, COALESCE(SUM(total_amount),0) salesCreatedToday
           FROM orders
          WHERE cafe_id=? AND source='POS' AND created_by_user_id=?
            AND created_at>=CURDATE() AND created_at<CURDATE()+INTERVAL 1 DAY`, [cafeId,userId]);
      const [hRows] = await pool.execute(
        `SELECT COUNT(DISTINCT h.order_id) completedByMeToday
           FROM order_status_history h JOIN orders o ON o.order_id=h.order_id
          WHERE o.cafe_id=? AND h.changed_by_user_id=? AND h.new_status='Completed'
            AND h.changed_at>=CURDATE() AND h.changed_at<CURDATE()+INTERVAL 1 DAY`, [cafeId,userId]);
      personal = { ordersCreatedToday:n(pRows[0]?.ordersCreatedToday), salesCreatedToday:n(pRows[0]?.salesCreatedToday), completedByMeToday:n(hRows[0]?.completedByMeToday) };

      const [rows] = await pool.execute(
        `SELECT o.order_id,o.order_number,o.customer_name,o.service_type,o.status,o.total_amount,o.payment_status,o.created_at,COUNT(oi.order_item_id) item_count
           FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.order_id
          WHERE o.cafe_id=? AND o.created_by_user_id=?
          GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT 8`, [cafeId,userId]);
      recentOrders = rows.map(r => ({ id:String(r.order_id),orderNumber:r.order_number,customerName:r.customer_name||'Walk-in Customer',serviceType:r.service_type,status:r.status,total:n(r.total_amount),paymentStatus:r.payment_status,itemCount:n(r.item_count),createdAt:iso(r.created_at) }));
    }

    const [shopRows] = await pool.execute(
      `SELECT order_id,order_number,source,customer_name,service_type,status,total_amount,created_at
         FROM orders WHERE cafe_id=? ORDER BY created_at DESC LIMIT 6`, [cafeId]);
    const [stockRows] = await pool.execute(
      `SELECT ingredient_id,ingredient_name,unit,current_stock,low_stock_threshold
         FROM ingredients
        WHERE cafe_id=? AND status='Active' AND current_stock<=low_stock_threshold
        ORDER BY (current_stock<=0) DESC,current_stock ASC,ingredient_name ASC LIMIT 6`, [cafeId]);
    const [stockCounts] = await pool.execute(
      `SELECT SUM(current_stock<=low_stock_threshold) lowStockCount,SUM(current_stock<=0) outOfStockCount
         FROM ingredients WHERE cafe_id=? AND status='Active'`, [cafeId]);

    res.json({ success:true, generatedAt:new Date().toISOString(), personalTrackingAvailable, profile, personal,
      shop:{ totalToday:n(q.totalToday),pendingCount:n(q.pendingCount),preparingCount:n(q.preparingCount),readyCount:n(q.readyCount),completedToday:n(q.completedToday),completedSalesToday:n(q.completedSalesToday),lowStockCount:n(stockCounts[0]?.lowStockCount),outOfStockCount:n(stockCounts[0]?.outOfStockCount) },
      recentOrders,
      recentShopOrders:shopRows.map(r=>({id:String(r.order_id),orderNumber:r.order_number,source:r.source,customerName:r.customer_name||'Walk-in Customer',serviceType:r.service_type,status:r.status,total:n(r.total_amount),createdAt:iso(r.created_at)})),
      stockAlerts:stockRows.map(r=>({id:String(r.ingredient_id),name:r.ingredient_name,unit:r.unit,currentStock:n(r.current_stock),threshold:n(r.low_stock_threshold),status:n(r.current_stock)<=0?'Out of Stock':'Low Stock'}))
    });
  } catch (error) { next(error); }
};
