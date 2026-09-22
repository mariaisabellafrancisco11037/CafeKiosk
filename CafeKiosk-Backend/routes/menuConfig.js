"use strict";
const express=require("express");
const router=express.Router();
const store=require("../services/menuConfigStore");
let auth={};try{auth=require("../middleware/authMiddleware");}catch(_){auth={};}
const verify=typeof auth.verifyToken==="function"?auth.verifyToken:(req,res,next)=>next();
const admin=typeof auth.isAdmin==="function"?auth.isAdmin:(req,res,next)=>next();
router.get("/",async(req,res,next)=>{try{const cafeId=String(req.query.cafeId||"cafe-1");res.json({success:true,cafeId,config:await store.get(cafeId)});}catch(e){next(e);}});
router.put("/",verify,admin,async(req,res,next)=>{try{const cafeId=String(req.body?.cafeId||req.user?.cafeId||"cafe-1");const config=await store.put(cafeId,req.body?.config||req.body||{});res.json({success:true,cafeId,config});}catch(e){next(e);}});
module.exports=router;
