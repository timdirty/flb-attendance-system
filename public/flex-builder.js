// Flex Builder 前端（原生 JS）

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

function renderPreview(data) {
  const box = $('#previewBox');
  box.innerHTML = '';
  const alt = ($('#altText').value||'').trim();
  const note = document.createElement('div'); note.style.color='#475569'; note.style.fontSize='12px'; note.textContent = `altText: ${alt||'(未填)'}`; box.appendChild(note);
  function renderBubble(b) {
    const card = document.createElement('div'); card.className='card';
    if (b.hero?.url) { const img=document.createElement('img'); img.src=b.hero.url; card.appendChild(img); }
    function renderBox(boxNode) {
      if (!boxNode) return; const div=document.createElement('div'); div.style.margin='6px 0';
      (boxNode.contents||[]).forEach(c=>{
        if (c.type==='text') { const p=document.createElement('div'); p.textContent=c.text||''; p.style.fontWeight=c.weight==='bold'?'700':'400'; p.style.color=c.color||'#111'; card.appendChild(p); }
        else if (c.type==='image') { const i=document.createElement('img'); i.src=c.url||''; card.appendChild(i); }
        else if (c.type==='separator') { const hr=document.createElement('hr'); card.appendChild(hr); }
        else if (c.type==='spacer') { const s=document.createElement('div'); s.style.height=(c.size==='lg'?24:12)+'px'; card.appendChild(s); }
        else if (c.type==='button') { const btn=document.createElement('button'); btn.textContent=(c.action?.label)||'按鈕'; btn.className='primary'; card.appendChild(btn); }
        else if (c.type==='box') { renderBox(c); }
      });
      return div;
    }
    renderBox(b.body);
    return card;
  }
  if (data?.type==='carousel') {
    (data.contents||[]).forEach(b=> box.appendChild(renderBubble(b)) );
  } else if (data?.type==='bubble') {
    box.appendChild(renderBubble(data));
  } else {
    box.textContent='請建立 bubble 或 carousel 結構';
  }
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

