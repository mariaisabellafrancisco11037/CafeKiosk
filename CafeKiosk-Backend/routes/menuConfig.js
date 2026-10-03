const express=require("express");
const router=express.Router();
const store=require("../services/menuConfigStore");
const auth=require("../middleware/authMiddleware");
const { optionalAuth } = auth;
const verify=auth.verifyToken;
const admin=auth.isAdmin;
const owner=auth.isOwner;

router.get("/",optionalAuth,async(req,res,next)=>{
  try{
    const requested=String(req.query.cafeId||"cafe-1");
    const cafeId=String(req.user?.cafeId||requested);
    if(!req.user && cafeId!=="cafe-1"){
      return res.status(404).json({success:false,message:"Menu configuration not found."});
    }
    const config=await store.get(cafeId);
    res.json({success:true,cafeId,config:req.user?config:store.publicView(config)});
  }catch(e){next(e);}
});


router.patch("/product",verify,admin,owner,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||"");
    const productKey=String(req.body?.productKey||"").trim();
    const previousKey=String(req.body?.previousKey||"").trim();
    const productConfig=req.body?.productConfig;
    const categoryDefaultKey=String(req.body?.categoryDefaultKey||"").trim();
    const categoryDefault=Array.isArray(req.body?.categoryDefault)?req.body.categoryDefault:null;

    if(!productKey || !productConfig || typeof productConfig!=="object"){
      return res.status(400).json({success:false,message:"A valid product size configuration is required."});
    }

    const current=await store.get(cafeId);
    const next={
      products:{...(current.products||{})},
      categoryDefaults:{...(current.categoryDefaults||{})}
    };

    next.products[productKey]={...productConfig,updatedAt:new Date().toISOString()};
    if(previousKey && previousKey!==productKey) delete next.products[previousKey];
    if(categoryDefaultKey && categoryDefault) next.categoryDefaults[categoryDefaultKey]=categoryDefault;

    const config=await store.put(cafeId,next);
    res.json({success:true,cafeId,productKey,config});
  }catch(e){next(e);}
});

router.put("/",verify,admin,owner,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||"");
    const config=await store.put(cafeId,req.body?.config||req.body||{});
    res.json({success:true,cafeId,config});
  }catch(e){next(e);}
});
module.exports=router;
