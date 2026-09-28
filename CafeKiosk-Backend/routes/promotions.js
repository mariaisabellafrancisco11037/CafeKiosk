const express=require("express");
const router=express.Router();
const store=require("../services/promotionStore");
const {activeNow}=require("../services/promotionEngine");
const kioskStore=require("../services/kioskAccessStore");
const auth=require("../middleware/authMiddleware");
const verify=auth.verifyToken;
const admin=auth.isAdmin;
const optionalAuth=auth.optionalAuth;

router.get('/active',optionalAuth,async(req,res,next)=>{
  try{
    let cafeId=String(req.user?.cafeId||"");
    if(!cafeId){
      const slug=String(req.query.kioskSlug||"").trim().toLowerCase();
      if(!slug) return res.status(404).json({success:false,message:"Promotions not found."});
      const kiosk=await kioskStore.getBySlug(slug);
      if(!kiosk||kiosk.cafeStatus!=="Active"||!kiosk.kioskEnabled){
        return res.status(404).json({success:false,message:"Promotions not found."});
      }
      cafeId=String(kiosk.cafeId);
    }
    const rows=(await store.list(cafeId)).filter(x=>activeNow(x));
    res.json({success:true,cafeId,count:rows.length,promotions:rows});
  }catch(e){next(e);}
});

router.get('/',verify,admin,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||'');
    const rows=await store.list(cafeId);
    res.json({success:true,cafeId,count:rows.length,promotions:rows});
  }catch(e){next(e);}
});
router.post('/',verify,admin,async(req,res,next)=>{
  try{
    const row=await store.upsert({...req.body,cafeId:req.user?.cafeId||''});
    res.status(201).json({success:true,promotion:row});
  }catch(e){next(e);}
});
router.patch('/:id',verify,admin,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||'');
    const existing=(await store.list(cafeId)).find(x=>String(x.id)===String(req.params.id));
    if(!existing)return res.status(404).json({success:false,message:'Promotion not found.'});
    const row=await store.upsert({...existing,...req.body,id:existing.id,cafeId:existing.cafeId});
    res.json({success:true,promotion:row});
  }catch(e){next(e);}
});
router.delete('/:id',verify,admin,async(req,res,next)=>{
  try{
    const cafeId=String(req.user?.cafeId||'');
    const ok=await store.remove(req.params.id,cafeId);
    res.status(ok?200:404).json({success:ok,message:ok?'Promotion deleted.':'Promotion not found.'});
  }catch(e){next(e);}
});
module.exports=router;
