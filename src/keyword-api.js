// 關鍵字規則管理 API（/api/keywords）
const express = require('express');
const router = express.Router();

const { ADMIN_API_KEY } = require('./message-service');
const svc = require('./keyword-service');

router.use((req,res,next)=>{
  const key=req.header('X-Admin-Key');
  if (!ADMIN_API_KEY || key===ADMIN_API_KEY) return next();
  return res.status(401).json({ success:false, error:'未授權' });
});

router.get('/', (req,res)=>{
  const data = svc.listRules();
  res.json({ success:true, data });
});

router.post('/', (req,res)=>{
  try{ const rec = svc.addRule(req.body||{}); res.json({ success:true, data:rec }); }
  catch(e){ res.json({ success:false, error:e.message }); }
});

router.patch('/:id', (req,res)=>{
  try{ const rec = svc.updateRule(req.params.id, req.body||{}); if(!rec) return res.json({ success:false, error:'找不到規則' }); res.json({ success:true, data:rec }); }
  catch(e){ res.json({ success:false, error:e.message }); }
});

router.delete('/:id', (req,res)=>{
  try{ const ok = svc.deleteRule(req.params.id); res.json({ success:ok }); }
  catch(e){ res.json({ success:false, error:e.message }); }
});

router.post('/test', (req,res)=>{
  try{
    const { text, sourceType } = req.body||{};
    const rule = svc.findFirstMatch(text||'', { sourceType });
    res.json({ success:true, rule });
  }catch(e){ res.json({ success:false, error:e.message }); }
});

module.exports = router;

