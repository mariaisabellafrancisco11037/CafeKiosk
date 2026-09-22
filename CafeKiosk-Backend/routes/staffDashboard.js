const express=require('express');
const router=express.Router();
const controller=require('../controllers/staffDashboardController');
const {verifyToken,isStaffOrAdmin}=require('../middleware/authMiddleware');
router.get('/',verifyToken,isStaffOrAdmin,controller.getDashboard);
module.exports=router;
