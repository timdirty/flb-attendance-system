// Flex Builder 前端（原生 JS） — 強化版：屬性面板/範本庫/建議/重排/多尺寸/暗色/離線驗證

const $ = sel => document.querySelector(sel);

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const key = $('#adminKey').value.trim();
  const op = $('#operator').value.trim();
  if (key) h['X-Admin-Key'] = key;
  if (op) h['X-Operator'] = op;
  return h;
}

async function api(path, method='GET', body) {
  const res = await fetch(`/api/message${path}`, { method, headers: headers(), body: body?JSON.stringify(body):undefined });
  const data = await res.json().catch(()=>({}));
  if (!data.success) throw new Error(data.error||'API 失敗');
  return data;
}

function setFlex(json) { $('#flexJson').value = JSON.stringify(json, null, 2); renderPreview(json); }
function getFlex() { try { return JSON.parse($('#flexJson').value||'{}'); } catch { return null; } }

// 紀錄被選取節點的 JSON 路徑（例如 body.contents[2]）
let selectedPath = null;

function renderPreview(data) {
  const box = $('#previewBox');
  box.innerHTML = '';
  const alt = ($('#altText').value||'').trim();
  const note = document.createElement('div'); note.style.color='#475569'; note.style.fontSize='12px'; note.textContent = `altText: ${alt||'(未填)'}`; box.appendChild(note);
  function renderBubble(b, bubbleIndex) {
    const card = document.createElement('div'); card.className='card';
    if (b.hero?.url) { const img=document.createElement('img'); img.src=b.hero.url; card.appendChild(img); }
    function renderBox(boxNode, path) {
      if (!boxNode) return; const div=document.createElement('div'); div.style.margin='6px 0';
      (boxNode.contents||[]).forEach((c, idx)=>{
        const itemPath = path.concat(['contents', idx]);
        const wrap = document.createElement('div'); wrap.className='wrap'; wrap.style.position='relative';
        wrap.onclick = (e)=>{ e.stopPropagation(); selectedPath = itemPath; showProps(); highlightSelection(); };
        wrap.onmouseenter = ()=> wrap.style.outline='1px dashed #60a5fa';
        wrap.onmouseleave = ()=> wrap.style.outline='';
        const addHandle = (el)=>{ const h=document.createElement('span'); h.className='handle'; h.textContent='⋮⋮'; h.style.position='absolute'; h.style.right='6px'; h.style.top='6px'; el.appendChild(h); };
        if (c.type==='text') { const p=document.createElement('div'); p.textContent=c.text||''; p.style.fontWeight=c.weight==='bold'?'700':'400'; p.style.color=c.color||'#111'; wrap.appendChild(p); addHandle(wrap); card.appendChild(wrap); }
        else if (c.type==='image') { const i=document.createElement('img'); i.src=c.url||''; wrap.appendChild(i); addHandle(wrap); card.appendChild(wrap); }
        else if (c.type==='separator') { const hr=document.createElement('hr'); wrap.appendChild(hr); addHandle(wrap); card.appendChild(wrap); }
        else if (c.type==='spacer') { const s=document.createElement('div'); s.style.height=(c.size==='lg'?24:12)+'px'; wrap.appendChild(s); addHandle(wrap); card.appendChild(wrap); }
        else if (c.type==='button') { const btn=document.createElement('button'); btn.textContent=(c.action?.label)||'按鈕'; btn.className='primary'; wrap.appendChild(btn); addHandle(wrap); card.appendChild(wrap); }
        else if (c.type==='box') { const inner=document.createElement('div'); wrap.appendChild(inner); card.appendChild(wrap); renderBox(c, itemPath); }
      });
      return div;
    }
    renderBox(b.body, ['body']);
    return card;
  }
  if (data?.type==='carousel') {
    (data.contents||[]).forEach((b,bi)=> box.appendChild(renderBubble(b,bi)) );
  } else if (data?.type==='bubble') {
    box.appendChild(renderBubble(data,0));
  } else {
    box.textContent='請建立 bubble 或 carousel 結構';
  }
  // 套用尺寸/暗色
  const sizeSel = $('#previewSize').value;
  const phone = box.parentElement.parentElement;
  phone.style.height = sizeSel==='sm' ? '480px' : sizeSel==='lg' ? '640px' : '560px';
  phone.style.width = sizeSel==='lg' ? '420px' : sizeSel==='sm' ? '340px' : '375px';
  box.classList.toggle('dark', $('#darkMode').checked);
  renderTree();
}

// 預設 bubble
$('#btnNewBubble').onclick = () => setFlex({ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'標題', weight:'bold', size:'lg'},{type:'text', text:'內文', wrap:true}]} });
$('#btnNewCarousel').onclick = () => setFlex({ type:'carousel', contents:[{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'卡片 1'}]} },{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'卡片 2'}]} }] });

// 工具列插入
document.querySelectorAll('.toolbar [data-add]').forEach(btn => {
  btn.onclick = () => {
    const obj = getFlex(); if (!obj) return alert('JSON 無效');
    const add = btn.getAttribute('data-add');
    function ensureBody(b) { b.body = b.body || { type:'box', layout:'vertical', contents:[] }; return b.body.contents; }
    if (obj.type==='bubble') {
      const arr = ensureBody(obj);
      if (add==='text') arr.push({ type:'text', text:'新文字', wrap:true });
      if (add==='image') arr.push({ type:'image', url:'https://placehold.co/600x200', size:'full' });
      if (add==='button') arr.push({ type:'button', style:'primary', action:{ type:'uri', label:'前往', uri:'https://example.com' } });
      if (add==='separator') arr.push({ type:'separator' });
      if (add==='spacer') arr.push({ type:'spacer', size:'sm' });
    } else if (obj.type==='carousel') {
      obj.contents = obj.contents || [];
      if (add==='text') obj.contents[0].body.contents.push({ type:'text', text:'新文字', wrap:true });
      if (add==='image') obj.contents[0].body.contents.push({ type:'image', url:'https://placehold.co/600x200' });
      if (add==='button') obj.contents[0].body.contents.push({ type:'button', style:'primary', action:{ type:'uri', label:'前往', uri:'https://example.com' } });
      if (add==='separator') obj.contents[0].body.contents.push({ type:'separator' });
      if (add==='spacer') obj.contents[0].body.contents.push({ type:'spacer', size:'sm' });
    }
    setFlex(obj);
  };
});

$('#btnValidate').onclick = () => { const o=getFlex(); if (!o) return alert('JSON 無效'); alert('JSON 格式看起來沒問題（未連線驗證）'); };

$('#btnPreview').onclick = async () => {
  try {
    const message = { type:'flex', altText: ($('#altText').value||'通知'), contents: getFlex() };
    const { preview } = await api('/preview','POST',{ message, userId: $('#testUserId').value.trim()||undefined });
    renderPreview(preview.contents||message.contents);
  } catch (e) { alert(e.message); }
};

$('#btnSendTest').onclick = async () => {
  try {
    const uid = $('#testUserId').value.trim();
    if (!uid) return alert('請輸入測試 userId');
    const message = { type:'flex', altText: ($('#altText').value||'通知'), contents: getFlex() };
    const recipients = { mode:'userIds', userIds:[uid] };
    const { job } = await api('/send','POST',{ message, recipients, options:{ rateLimitPerSec:1, batchSize:1 } });
    alert('已送出，作業：'+job.id);
  } catch (e) { alert(e.message); }
};

$('#btnSavePreset').onclick = async () => {
  try {
    const name = $('#presetName').value.trim();
    if (!name) return alert('請輸入名稱');
    const altText = $('#altText').value.trim() || '通知';
    const contents = getFlex(); if (!contents) return alert('JSON 無效');
    const scopes = ($('#presetScopes').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const tags = ($('#presetTags').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    await api('/flex-presets','POST',{ name, altText, contents, scopes, tags });
    await loadPresets();
    alert('已儲存');
  } catch (e) { alert(e.message); }
};

async function loadPresets(){
  const { data } = await api('/flex-presets');
  const box = $('#presetList'); box.innerHTML='';
  data.slice().reverse().forEach(p=>{
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `<div><b>${p.name}</b> <small>${(p.scopes||[]).join(',')}</small></div>
      <div>
        <button class="use">使用</button>
        <button class="send">發送</button>
        <button class="del">刪除</button>
      </div>`;
    item.querySelector('.use').onclick = ()=>{
      $('#presetName').value = p.name; $('#altText').value = p.altText||''; $('#presetScopes').value=(p.scopes||[]).join(',');
      setFlex(p.contents);
    };
    item.querySelector('.send').onclick = async ()=>{
      const uid = prompt('輸入測試 userId（或留空取消）');
      if (!uid) return;
      await api(`/flex-presets/${p.id}/send`,'POST',{ recipients:{ mode:'userIds', userIds:[uid] }, options:{ rateLimitPerSec:1, batchSize:1 } });
      alert('已建立作業');
    };
    item.querySelector('.del').onclick = async ()=>{
      if (!confirm('確定刪除？')) return;
      await api(`/flex-presets/${p.id}`,'DELETE');
      loadPresets();
    };
    box.appendChild(item);
  });
}

// 初始化空白 bubble
setFlex({ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'標題', weight:'bold', size:'lg'},{type:'text', text:'內文', wrap:true}] } });
loadPresets();

// ===== 屬性面板 =====
function getByPath(obj, path) {
  let cur=obj; for (let i=0;i<path.length;i+=2){ const key=path[i]; const idx=path[i+1]; if (key==='body'){ cur=cur.body; } else if (key==='contents'){ cur=(cur.contents||[])[idx]; } }
  return cur;
}
function setByPath(obj, path, updater) {
  if (!path) return obj; const lastIndex = path.length-1; let parent=obj; let parentPath=[];
  for (let i=0;i<path.length-2;i++){ const k=path[i]; const v=path[i+1]; parentPath.push(k,v); if (k==='body') parent=parent.body; else if (k==='contents') parent=parent.contents[v]; }
  const k=path[path.length-2], v=path[path.length-1];
  if (k==='contents'){ parent.contents[v]=updater(parent.contents[v]); }
  return obj;
}
function arrayMove(arr, from, to){ if (to<0||to>=arr.length) return; const x=arr.splice(from,1)[0]; arr.splice(to,0,x); }

function showProps(){
  const fields=$('#propFields'); const tgt=$('#propTarget'); fields.innerHTML='';
  if (!selectedPath){ tgt.textContent='未選取元件'; return; }
  tgt.textContent = '路徑: '+selectedPath.join(' → ');
  const obj=getFlex(); const node=getByPath(obj, selectedPath);
  if (!node){ fields.textContent='節點不存在'; return; }
  function addField(label, key, type='text', list){
    const row=document.createElement('div'); row.className='row';
    const lab=document.createElement('label'); lab.textContent=label; lab.style.minWidth='72px'; row.appendChild(lab);
    let input; if (type==='select'){ input=document.createElement('select'); (list||[]).forEach(v=>{const o=document.createElement('option'); o.value=v; o.textContent=v; if ((node[key]||'')===v) o.selected=true; input.appendChild(o);}); }
    else if (type==='checkbox'){ input=document.createElement('input'); input.type='checkbox'; input.checked=!!node[key]; }
    else { input=document.createElement('input'); input.value=node[key]||''; }
    input.onchange=()=>{ const val=(type==='checkbox')?input.checked:(type==='select'?input.value:input.value); setFlex(setByPath(getFlex(), selectedPath, n=>({ ...n, [key]: val })) ); };
    row.appendChild(input); fields.appendChild(row);
  }
  // 通用
  addField('type','type','select',['text','image','button','separator','spacer','box']);
  if (node.type==='text'){ addField('text','text'); addField('color','color'); addField('size','size'); addField('weight','weight'); addField('wrap','wrap','checkbox'); }
  if (node.type==='image'){ addField('url','url'); addField('size','size'); addField('aspectRatio','aspectRatio'); }
  if (node.type==='spacer'){ addField('size','size'); }
  if (node.type==='separator'){ /* no-op */ }
  if (node.type==='button'){
    if (!node.action) node.action={ type:'uri', label:'前往', uri:'https://example.com' };
    addField('label','label');
    const row=document.createElement('div'); row.className='row';
    const lab=document.createElement('label'); lab.textContent='action'; lab.style.minWidth='72px'; row.appendChild(lab);
    const sel=document.createElement('select'); ['uri','postback','message'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; if ((node.action.type||'')===v) o.selected=true; sel.appendChild(o); });
    sel.onchange=()=>{ const t=sel.value; setFlex(setByPath(getFlex(), selectedPath, n=>({ ...n, action:{ type:t, label:n.action?.label||'前往', uri:n.action?.uri, data:n.action?.data, text:n.action?.text } })) ); };
    row.appendChild(sel); fields.appendChild(row);
    if (node.action?.type==='uri') addField('uri','uri');
    if (node.action?.type==='postback') addField('data','data');
    if (node.action?.type==='message') addField('text','text');
    addField('style','style');
  }
  if (node.type==='box'){ addField('layout','layout'); }
}

function highlightSelection(){ /* 簡化：靠 hover 外框即可 */ }

$('#btnUp').onclick = ()=>{
  if (!selectedPath) return; const obj=getFlex();
  const parentPath=selectedPath.slice(0,-2); const idx=selectedPath[selectedPath.length-1];
  const parent=getByPath(obj, parentPath); if (!parent?.contents) return; arrayMove(parent.contents, idx, idx-1); setFlex(obj); selectedPath[selectedPath.length-1]=Math.max(0, idx-1); showProps();
};
$('#btnDown').onclick = ()=>{
  if (!selectedPath) return; const obj=getFlex();
  const parentPath=selectedPath.slice(0,-2); const idx=selectedPath[selectedPath.length-1];
  const parent=getByPath(obj, parentPath); if (!parent?.contents) return; arrayMove(parent.contents, idx, idx+1); setFlex(obj); selectedPath[selectedPath.length-1]=Math.min(parent.contents.length-1, idx+1); showProps();
};
$('#btnRemove').onclick = ()=>{
  if (!selectedPath) return; const obj=getFlex();
  const parentPath=selectedPath.slice(0,-2); const idx=selectedPath[selectedPath.length-1];
  const parent=getByPath(obj, parentPath); if (!parent?.contents) return; parent.contents.splice(idx,1); selectedPath=null; setFlex(obj); showProps();
};

// 預覽控制
$('#previewSize').onchange = ()=> renderPreview(getFlex());
$('#darkMode').onchange = ()=> renderPreview(getFlex());

// ===== 常用範本庫 =====
const PRESETS_LIBRARY = [
  { name:'系統公告（單卡）', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'📣 系統公告', weight:'bold', size:'lg'},{type:'separator'},{type:'text', text:'內容……', wrap:true},{type:'button', style:'primary', action:{type:'uri', label:'詳細', uri:'https://example.com'}}] } } },
  { name:'維護通知', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'🛠️ 系統維護', weight:'bold', size:'lg'},{type:'text', text:'時間：{{date}} 02:00–04:00', wrap:true},{type:'text', text:'造成不便，敬請見諒。', wrap:true}] } } },
  { name:'請假確認', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'🏥 請假已登記', weight:'bold', size:'lg'},{type:'text', text:'學生：{{displayName}}', wrap:true},{type:'text', text:'課程：xxx', wrap:true}] } } },
  { name:'活動宣傳', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'image', url:'https://placehold.co/600x300', size:'full'},{type:'text', text:'🎉 暑期活動', weight:'bold', size:'lg'},{type:'text', text:'立即報名，名額有限！', wrap:true},{type:'button', style:'primary', action:{type:'uri', label:'報名', uri:'https://example.com'}}] } } },
  { name:'課表（單週）', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'📅 本週課表', weight:'bold', size:'lg'},{type:'text', text:'一 19:00-20:00 英文', wrap:true},{type:'text', text:'三 19:00-20:00 數學', wrap:true}] } } },
  { name:'客服資訊', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'📞 客服資訊', weight:'bold', size:'lg'},{type:'text', text:'LINE：@flb', wrap:true},{type:'text', text:'Email：support@example.com', wrap:true}] } } },
  { name:'雙卡 Carousel', json:{ type:'carousel', contents:[{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'卡片 1', weight:'bold', size:'lg'},{type:'text', text:'內容 1', wrap:true}] } },{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'卡片 2', weight:'bold', size:'lg'},{type:'text', text:'內容 2', wrap:true}] } }] } },
  { name:'注意事項', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'⚠️ 注意事項', weight:'bold', size:'lg'},{type:'text', text:'1) 內容 A', wrap:true},{type:'text', text:'2) 內容 B', wrap:true}] } } },
  { name:'上課提醒', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'⏰ 上課提醒', weight:'bold', size:'lg'},{type:'text', text:'今天 {{date}} 19:00 準時上課', wrap:true}] } } },
  { name:'問卷邀請', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'📝 問卷邀請', weight:'bold', size:'lg'},{type:'text', text:'您寶貴的意見是我們前進的動力', wrap:true},{type:'button', style:'primary', action:{type:'uri', label:'前往填寫', uri:'https://example.com'}}] } } },
  { name:'客服回饋', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'💬 客服回覆', weight:'bold', size:'lg'},{type:'text', text:'您好 {{displayName}}，關於您的問題……', wrap:true}] } } },
  { name:'三卡 Carousel', json:{ type:'carousel', contents:[1,2,3].map(i=>({ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:`卡片 ${i}`, weight:'bold', size:'lg'},{type:'text', text:`內容 ${i}`, wrap:true}] } })) } },
  { name:'主視覺 + CTA', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'image', url:'https://placehold.co/600x300', size:'full'},{type:'text', text:'主題標題', weight:'bold', size:'lg'},{type:'button', style:'primary', action:{type:'uri', label:'立即前往', uri:'https://example.com'}}] } } },
  { name:'課程異動公告', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'📣 課程異動', weight:'bold', size:'lg'},{type:'text', text:'原時段：… 新時段：…', wrap:true}] } } },
  { name:'緊急停課通知', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'⛔ 停課通知', weight:'bold', size:'lg'},{type:'text', text:'因天候因素今日停課一日', wrap:true}] } } },
  { name:'開學提醒', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'🎒 開學提醒', weight:'bold', size:'lg'},{type:'text', text:'明日 {{date}} 開學，請準時到校', wrap:true}] } } },
  { name:'優惠券推廣', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'🎁 優惠券', weight:'bold', size:'lg'},{type:'text', text:'輸入代碼 FLB2025 享 9 折', wrap:true},{type:'button', style:'primary', action:{type:'uri', label:'領取', uri:'https://example.com'}}] } } },
  { name:'客製化問候', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'👋 嗨 {{displayName}}', weight:'bold', size:'lg'},{type:'text', text:'祝你有美好的一天！', wrap:true}] } } },
  { name:'維護完成通知', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'✅ 維護完成', weight:'bold', size:'lg'},{type:'text', text:'系統已恢復正常，感謝耐心等待。', wrap:true}] } } },
  { name:'滿意度回饋', json:{ type:'bubble', body:{ type:'box', layout:'vertical', contents:[{type:'text', text:'⭐ 服務滿意度', weight:'bold', size:'lg'},{type:'text', text:'您的回饋對我們很重要', wrap:true},{type:'button', style:'primary', action:{type:'uri', label:'填寫回饋', uri:'https://example.com'}}] } } },
];

async function loadLibrary(){
  const list=$('#libraryList'); list.innerHTML='';
  PRESETS_LIBRARY.forEach(p=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div><b>${p.name}</b></div><div><button class="use">插入</button></div>`;
    div.querySelector('.use').onclick=()=> setFlex(p.json);
    list.appendChild(div);
  });
}
loadLibrary();

// ===== 範圍自動建議 =====
async function loadScopeHints(){
  const { data } = await api('/flex-presets');
  const set=new Set(); data.forEach(p=> (p.scopes||[]).forEach(s=>set.add(s)) );
  const chips=$('#scopeChips'); chips.innerHTML='';
  Array.from(set).sort().forEach(s=>{ const c=document.createElement('span'); c.className='chip'; c.textContent=s; c.onclick=()=>{ const cur=$('#presetScopes').value; const arr=new Set(cur.split(',').map(x=>x.trim()).filter(Boolean)); arr.add(s); $('#presetScopes').value=Array.from(arr).join(','); }; chips.appendChild(c); });
}
loadScopeHints();

// ===== 簡化的離線 Schema 驗證 =====
function validateFlex(obj){
  const errors=[];
  function err(p,m){ errors.push(`${p}: ${m}`); }
  function isStr(x){ return typeof x==='string'; }
  function checkComponent(c, p){
    if (!c || typeof c!=='object') return err(p,'需為物件');
    if (!isStr(c.type)) return err(p,'缺少 type');
    if (c.type==='text' && !isStr(c.text)) err(p,'text 要有 text');
    if (c.type==='image' && !isStr(c.url)) err(p,'image 要有 url');
    if (c.type==='button' && (!c.action || !isStr(c.action.type))) err(p,'button 要有 action');
    if (c.type==='box') { if (!c.layout) err(p,'box 缺少 layout'); (c.contents||[]).forEach((cc,i)=>checkComponent(cc,`${p}.contents[${i}]`)); }
  }
  if (obj.type==='bubble') { if (!obj.body) err('bubble','需要 body'); else if (!obj.body.contents) err('bubble.body','需要 contents'); else (obj.body.contents||[]).forEach((c,i)=>checkComponent(c,`body.contents[${i}]`)); }
  else if (obj.type==='carousel') { if (!Array.isArray(obj.contents)) err('carousel','contents 要為陣列'); else obj.contents.forEach((b,i)=>{ if (b.type!=='bubble') err(`contents[${i}]`,'需為 bubble'); else if (b.body) (b.body.contents||[]).forEach((c,j)=>checkComponent(c,`contents[${i}].body.contents[${j}]`)); }); }
  else err('root','type 需為 bubble 或 carousel');
  return errors;
}
$('#btnValidate').onclick = () => { const o=getFlex(); if (!o) return alert('JSON 無效'); const errs=validateFlex(o); if (errs.length) alert('驗證失敗:\n'+errs.join('\n')); else alert('✅ 通過離線驗證'); };

// ===== 結構樹 + 拖曳重排 =====
function pathLabel(path){ return path ? path.join('→') : 'root'; }
function eachNode(obj, cb, path=['root']){
  if (!obj) return; if (obj.type==='bubble'){ const p=path.concat(['body']); cb({node:obj.body, path:p, label:'body'}); if (obj.body?.contents) obj.body.contents.forEach((c,i)=>{ cb({node:c, path: p.concat(['contents', i]), label:`contents[${i}] ${c.type}`}); if (c.type==='box') eachNode({type:'bubble', body:c}, cb, p.concat(['contents', i])); }); }
  if (obj.type==='carousel'){ (obj.contents||[]).forEach((b,i)=>{ cb({node:b, path:['contents', i], label:`bubble[${i}]`}); eachNode(b, cb, ['contents', i]); }); }
}
function renderTree(){
  const obj=getFlex(); const panel=$('#treePanel'); panel.innerHTML=''; if (!obj) return;
  const list=document.createElement('div');
  eachNode(obj, ({node,path,label})=>{
    if (label==='body') return; // 簡化: 不顯示 body 行
    const d=document.createElement('div'); d.className='node indent-'+Math.min(3, Math.floor(path.length/2));
    d.draggable=true; d.dataset.path=JSON.stringify(path);
    d.innerHTML = `<span class="handle">⋮⋮</span><span class="label">${label}</span><small>${node.type||''}</small>`;
    d.onclick=()=>{ selectedPath=path; showProps(); };
    d.ondragstart=(e)=>{ e.dataTransfer.setData('text/plain', d.dataset.path); };
    d.ondragover=(e)=>{ e.preventDefault(); d.classList.add('drag-over'); };
    d.ondragleave=()=> d.classList.remove('drag-over');
    d.ondrop=(e)=>{
      e.preventDefault(); d.classList.remove('drag-over');
      try{
        const fromPath=JSON.parse(e.dataTransfer.getData('text/plain'));
        const toPath=JSON.parse(d.dataset.path);
        const obj=getFlex();
        // 若同一父：重排；若目標是 box，則 append 到目標 box.contents
        const fromParentPath=fromPath.slice(0,-2); const toParentPath=toPath.slice(0,-2);
        if (JSON.stringify(fromParentPath)===JSON.stringify(toParentPath)){
          const parent=getByPath(obj, fromParentPath); const fromIdx=fromPath[fromPath.length-1]; const toIdx=toPath[toPath.length-1];
          arrayMove(parent.contents, fromIdx, toIdx); setFlex(obj);
        } else {
          const fromParent=getByPath(obj, fromParentPath); const fromIdx=fromPath[fromPath.length-1]; const item=fromParent.contents.splice(fromIdx,1)[0];
          // 如果目標自身是 box：插入到其 contents 末尾；否則插入到目標 parent 的位置
          const toNode=getByPath(obj, toPath);
          if (toNode && toNode.type==='box'){
            toNode.contents = toNode.contents || []; toNode.contents.push(item);
          } else {
            const toParent=getByPath(obj, toParentPath); const toIdx=toPath[toPath.length-1]; toParent.contents.splice(toIdx,0,item);
          }
          setFlex(obj);
        }
      }catch(err){ console.warn(err); }
    };
    list.appendChild(d);
  });
  panel.appendChild(list);
}

// 將內容送往訊息中心
$('#btnSendToMC').onclick = async ()=>{
  try{
    const name = ($('#presetName').value||'臨時預設')+'-'+Date.now().toString(36);
    const altText=$('#altText').value||'通知';
    const contents=getFlex();
    const scopes = ($('#presetScopes').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const tags = ($('#presetTags').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const { data } = await api('/flex-presets','POST',{ name, altText, contents, scopes, tags });
    location.href = `/message-admin.html#preset=${encodeURIComponent(data.id)}`;
  }catch(e){ alert(e.message); }
};
