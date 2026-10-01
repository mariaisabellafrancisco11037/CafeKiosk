const express=require("express");
const router=express.Router();
const store=require("../services/menuConfigStore");
const auth=require("../middleware/authMiddleware");
const { optionalAuth } = auth;
const verify=auth.verifyToken;
const admin=auth.isAdmin;
const owner=auth.isOwner;

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
      customizations:Array.isArray(value?.customizations)?value.customizations.map(group=>({
        key:String(group?.key||"customization"),
        label:String(group?.label||"Customization"),
        type:group?.type==="radio"?"radio":"checkbox",
        required:group?.required===true,
        options:Array.isArray(group?.options)?group.options.map(option=>({
          label:String(option?.label||option?.value||""),
          value:String(option?.value||option?.label||""),
          price:Math.max(0,Number(option?.price??option?.additionalPrice??0)||0)
        })).filter(option=>option.label):[]
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
