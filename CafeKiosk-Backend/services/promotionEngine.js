"use strict";
function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
function text(v){return String(v??"").trim();}
function dayKey(d){return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()];}
function dateYMD(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function minutes(t){if(!t)return null;const m=String(t).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;}
function activeNow(p, now=new Date()){
  if(!p || p.active===false) return false;
  const today=dateYMD(now);
  if(p.startDate && today < p.startDate) return false;
  if(p.endDate && today > p.endDate) return false;
  if(Array.isArray(p.weekdays) && p.weekdays.length && !p.weekdays.map(x=>String(x).toLowerCase().slice(0,3)).includes(dayKey(now))) return false;
  const s=minutes(p.startTime), e=minutes(p.endTime), cur=now.getHours()*60+now.getMinutes();
  if(s!==null && e!==null){ if(s<=e){if(cur<s||cur>e)return false;} else {if(cur>e&&cur<s)return false;} }
  return true;
}
function eligibilityMatches(p, eligibility){
  const wanted=text(eligibility||"all").toLowerCase()||"all";
  const list=Array.isArray(p.eligibility)&&p.eligibility.length?p.eligibility.map(x=>String(x).toLowerCase()):["all"];
  return list.includes("all") || list.includes(wanted);
}
function itemQty(i){return Math.max(1,n(i.qty ?? i.quantity ?? 1));}
function itemUnit(i){return n(i.unitPrice ?? i.price)+n(i.customizationCost ?? i.customizationPrice);}
function itemLine(i){const direct=n(i.subtotal ?? i.itemTotal ?? i.total);return direct>0?direct:itemUnit(i)*itemQty(i);}
function canonicalCategory(v){
  const x=text(v).toLowerCase().replace(/[_\s]+/g,"-").replace(/-+/g,"-");
  if(["coffee","coffees"].includes(x)) return "coffee";
  if(["non-coffee","non-coffees","noncoffee","noncoffees"].includes(x)) return "non-coffee";
  if(["milk-tea","milktea","milk-teas","milkteas"].includes(x)) return "milk-tea";
  if(["food","foods"].includes(x)) return "foods";
  if(["snack","snacks"].includes(x)) return "snacks";
  if(["dessert","desserts"].includes(x)) return "dessert";
  return x;
}
function itemCategory(i){return canonicalCategory(i.category);}
function itemName(i){return text(i.name ?? i.productName).toLowerCase();}
function promoBase(p, items, subtotal){
  if(p.scope==="category"){
    const cats=(p.categories||[]).map(canonicalCategory);
    return items.reduce((s,i)=>s+(cats.includes(itemCategory(i))?itemLine(i):0),0);
  }
  if(p.scope==="products"){
    const names=(p.productNames||[]).map(x=>String(x).toLowerCase());
    return items.reduce((s,i)=>s+(names.includes(itemName(i))?itemLine(i):0),0);
  }
  return subtotal;
}
function calculatePromotion(p, order){
  const items=Array.isArray(order.items)?order.items:[];
  const subtotal=n(order.subtotal)>0?n(order.subtotal):items.reduce((s,i)=>s+itemLine(i),0);
  if(subtotal < n(p.minimumSubtotal)) return null;
  const base=promoBase(p,items,subtotal);
  if(base<=0) return null;
  let discount = p.type==="fixed" ? n(p.value) : base*(Math.min(100,Math.max(0,n(p.value)))/100);
  discount=Math.max(0,Math.min(subtotal,discount));
  return {promotion:p, subtotal, base, discount, total:Math.max(0,subtotal-discount)};
}
function bestPromotion(order, promotions, now=new Date()){
  const eligibility=text(order.customerEligibility||order.eligibility||"all").toLowerCase()||"all";
  let best=null;
  for(const p of promotions||[]){
    if(String(p.cafeId||"cafe-1")!==String(order.cafeId||"cafe-1"))continue;
    if(!activeNow(p,now)||!eligibilityMatches(p,eligibility))continue;
    const result=calculatePromotion(p,order);
    if(result && (!best || result.discount>best.discount)) best=result;
  }
  return best;
}
function applyBestPromotion(order, promotions, now=new Date()){
  const result=bestPromotion(order,promotions,now);
  const items=Array.isArray(order.items)?order.items:[];
  const subtotal=n(order.subtotal)>0?n(order.subtotal):items.reduce((s,i)=>s+itemLine(i),0);
  const existingDiscount=Math.max(0,Math.min(subtotal,n(order.discountAmount??order.discount)));
  if(!result || existingDiscount>=result.discount){
    return {...order, subtotal, discountAmount:existingDiscount, discount:existingDiscount,
      total:Math.max(0,subtotal-existingDiscount),
      customerEligibility:text(order.customerEligibility||order.eligibility||"all").toLowerCase()||"all"};
  }
  return {...order, subtotal:result.subtotal, discountAmount:result.discount, discount:result.discount, total:result.total,
    promotionId:result.promotion.id, promotionName:result.promotion.name, promotionType:result.promotion.type,
    customerEligibility:text(order.customerEligibility||order.eligibility||"all").toLowerCase()||"all"};
}
module.exports={activeNow,bestPromotion,applyBestPromotion};
