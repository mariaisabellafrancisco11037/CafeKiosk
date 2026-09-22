const express=require('express');const router=express.Router();const {verifyToken,isAdmin}=require('../middleware/authMiddleware');const {listAuditLogs}=require('../services/auditLogStore');
router.get('/',verifyToken,isAdmin,async(req,res,next)=>{try{const cafeId=String(req.query.cafeId||req.user?.cafeId||'cafe-1');const limit=Number(req.query.limit||1000);const logs=await listAuditLogs({cafeId,limit});res.json({success:true,cafeId,count:logs.length,logs});}catch(e){next(e);}});
module.exports=router;
