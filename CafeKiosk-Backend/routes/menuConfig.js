const express=require("express");
const router=express.Router();
const store=require("../services/menuConfigStore");
const auth=require("../middleware/authMiddleware");
const { optionalAuth } = auth;
const verify=auth.verifyToken;
const admin=auth.isAdmin;

function publicConfig(config={}){
  const products={};
  for(const [key,value] of Object.entries(config.products||{})){
    products[key]={
      productName:value?.productName||"",
      category:value?.category||"",
      sizes:Array.isArray(value?.sizes)?value.sizes.map(size=>({
        label:String(size?.label||""),
        priceAdd:Math.max(0,Number(size?.priceAdd??size?.price??0)||0),
        multiplier:Math.max(0.01,Number(size?.multiplier??1)||1)
      })):[],
      updatedAt:value?.updatedAt||null
    };
  }
  return {products,categoryDefaults:config.categoryDefaults||{},updatedAt:config.updatedAt||null};
}

router.get("/",optionalAuth,async(req,res,next)=>{
  try{
    const requested=String(req.query.cafeId||"cafe-1");
    const cafeId=String(req.user?.cafeId||requested);
    if(!req.user && cafeId!=="cafe-1"){
      return res.status(404).json({success:false,message:"Menu configuration not found."});
    }
    const config=await store.get(cafeId);
    res.json({success:true,cafeId,config:req.user?config:publicConfig(config)});
  }catch(e){next(e);}
});

router.put("/",verify,admin,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||"");
    const config=await store.put(cafeId,req.body?.config||req.body||{});
    res.json({success:true,cafeId,config});
  }catch(e){next(e);}
});
module.exports=router;
