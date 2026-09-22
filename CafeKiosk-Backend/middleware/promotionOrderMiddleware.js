"use strict";
const store=require("../services/promotionStore");
const {applyBestPromotion}=require("../services/promotionEngine");
module.exports=async function promotionOrderMiddleware(req,res,next){
  try{
    if(req.method!=="POST") return next();
    const body=req.body&&typeof req.body==="object"?req.body:{};
    const source=String(body.source||"").toLowerCase();
    if(source!=="pos" && source!=="kiosk") return next();
    const cafeId=String(body.cafeId||"cafe-1");
    req.body=applyBestPromotion(body,await store.list(cafeId));
  }catch(err){ console.error("Promotion middleware:",err); }
  next();
};
