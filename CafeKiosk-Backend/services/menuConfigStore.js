"use strict";
const state = require('./appStateStore');
function blank(){return {products:{},categoryDefaults:{},updatedAt:new Date().toISOString()};}
async function get(cafeId='cafe-1'){
  const row = await state.getState(cafeId,'menu-config',null);
  return row && typeof row === 'object' ? row : blank();
}
async function put(cafeId='cafe-1',cfg={}){
  const current = await get(cafeId);
  const next={
    products:cfg.products&&typeof cfg.products==='object'?cfg.products:current.products||{},
    categoryDefaults:cfg.categoryDefaults&&typeof cfg.categoryDefaults==='object'?cfg.categoryDefaults:current.categoryDefaults||{},
    updatedAt:new Date().toISOString()
  };
  await state.setState(cafeId,'menu-config',next);
  return next;
}
module.exports={get,put};
