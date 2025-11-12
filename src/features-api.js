const express = require('express');
const router = express.Router();
const { ADMIN_API_KEY } = require('./message-service');
const svc = require('./features-service');

router.use((req,res,next)=>{ const key=req.header('X-Admin-Key'); if(!ADMIN_API_KEY || key===ADMIN_API_KEY) return next(); return res.status(401).json({success:false,error:'未授權'}); });

router.get('/', (req,res)=>{ res.json({ success:true, data: svc.listFeatures() }); });
router.patch('/:id', (req,res)=>{ const f=svc.updateFeature(req.params.id, req.body||{}); if(!f) return res.json({success:false,error:'找不到功能'}); res.json({ success:true, data:f }); });
router.post('/:id/synonyms', (req,res)=>{ const s=svc.addSynonym(req.params.id, req.body||{}); if(!s) return res.json({success:false,error:'找不到功能'}); res.json({success:true, data:s}); });
router.delete('/:id/synonyms/:synId', (req,res)=>{ const ok=svc.deleteSynonym(req.params.id, req.params.synId); res.json({ success: ok }); });
router.post('/:id/sync', async (req,res)=>{ const list=svc.listFeatures(); const f=list.find(x=>x.id===req.params.id); if(!f) return res.json({success:false,error:'找不到功能'}); const changed=await svc.syncToKeywordRules(f); res.json({ success:true, changed, feature:f }); });

module.exports = router;

