// 簡易訊息中心前端（M1）

const $ = sel => document.querySelector(sel);

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const key = $('#adminKey').value.trim();
  const op = $('#operator').value.trim();
  if (key) h['X-Admin-Key'] = key;
  if (op) h['X-Operator'] = op;
  return h;
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`/api/message${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) throw new Error(data.error || 'API 失敗');
  return data;
}

function toast(msg) { console.log('[MC]', msg); }

function parseListArea(val) {
  return (val || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
}

// Composer
$('#msgType').addEventListener('change', () => {
  const t = $('#msgType').value;
  $('#textBox').style.display = t === 'text' ? '' : 'none';
  $('#flexBox').style.display = t === 'flex' ? '' : 'none';
});

$('#btnSend').addEventListener('click', async () => {
  try {
    const type = $('#msgType').value;
    let message;
    if (type === 'text') message = { type: 'text', text: $('#textMsg').value };
    if (type === 'flex') {
      const contents = JSON.parse($('#flexJson').value || '{}');
      message = { type: 'flex', altText: $('#flexAlt').value || '通知', contents };
    }

    const modeSel = $('#recipientMode').value;
    let recipients;
    if (modeSel === 'userIds') recipients = { mode: 'userIds', userIds: parseListArea($('#recipientList').value) };
    else if (modeSel === 'groups') recipients = { mode: 'groups', groups: parseListArea($('#recipientList').value) };
    else if (modeSel === 'upload') recipients = { mode: 'upload', uploadId: sessionStorage.getItem('mc_uploadId') };
    else recipients = { mode: 'segment', segment: { role: 'teacher' } };

  const options = {
    botStrategy: $('#botStrategy').value,
    batchSize: Number($('#batchSize').value || 20),
    rateLimitPerSec: Number($('#rateLimit').value || 8),
    maxRetries: Number($('#maxRetries').value || 2),
    scheduleAt: ($('#scheduleAt').value||'').trim() || undefined
  };

    const { job } = await api('/send', 'POST', { message, recipients, options });
    toast('作業建立：' + job.id);
    loadJobs();
  } catch (e) {
    alert('發送失敗：' + e.message);
  }
});

// 模板庫
async function loadTemplates() {
  try {
    const { data } = await api('/templates');
    const box = $('#tplList');
    box.innerHTML = '';
    data.forEach(t => {
      const div = document.createElement('div');
      div.className = 'job';
      div.innerHTML = `<div><b>${t.name}</b> <span class="badge ok">${t.type}</span></div>
        <div>
          <button data-id="${t.id}" class="use">套用</button>
          <button data-id="${t.id}" class="del">刪除</button>
        </div>`;
      box.appendChild(div);
    });
    box.querySelectorAll('.use').forEach(btn => btn.onclick = () => useTemplate(btn.dataset.id));
    box.querySelectorAll('.del').forEach(btn => btn.onclick = () => delTemplate(btn.dataset.id));
  } catch (e) { toast(e.message); }
}

async function addTemplate() {
  try {
    const type = $('#tplType').value;
    let payload = $('#tplPayload').value;
    if (type === 'text') payload = { text: payload };
    if (type === 'flex') payload = JSON.parse($('#tplPayload').value || '{}');
    const rec = await api('/templates', 'POST', { name: $('#tplName').value, type, payload, tags: ($('#tplTags').value||'').split(',').map(s=>s.trim()).filter(Boolean) });
    toast('模板新增成功');
    loadTemplates();
  } catch (e) { alert('新增模板失敗：' + e.message); }
}

async function delTemplate(id) {
  if (!confirm('確定刪除模板？')) return;
  try { await api(`/templates/${id}`, 'DELETE'); loadTemplates(); } catch (e) { alert(e.message); }
}

function useTemplate(id) {
  // M1 簡版：僅把模板 payload 填回 Composer
  api('/templates').then(({ data }) => {
    const t = data.find(x => x.id === id);
    if (!t) return;
    if (t.type === 'text') {
      $('#msgType').value = 'text';
      $('#textBox').style.display = '';
      $('#flexBox').style.display = 'none';
      $('#textMsg').value = t.payload?.text || '';
    } else if (t.type === 'flex') {
      $('#msgType').value = 'flex';
      $('#textBox').style.display = 'none';
      $('#flexBox').style.display = '';
      $('#flexJson').value = JSON.stringify(t.payload, null, 2);
    }
  });
}

$('#btnAddTpl').addEventListener('click', addTemplate);

// 作業列表
async function loadJobs() {
  try {
    const { data } = await api('/jobs');
    const box = $('#jobs');
    box.innerHTML = '';
    data.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    data.slice(0, 50).forEach(j => {
      const b = j.status === 'success' ? 'ok' : (j.status === 'sending' || j.status==='queued') ? 'warn' : 'err';
      const div = document.createElement('div');
      div.className = 'job';
      const stat = j.stats ? `${j.stats.success||0}/${(j.stats.success||0)+(j.stats.fail||0)}` : '-';
      div.innerHTML = `<div><b>${j.id}</b> <span class="badge ${b}">${j.status}</span><div style="font-size:12px;color:#666">${j.createdAt}</div></div>
        <div>
          ${stat}
          <button class="detail">明細</button>
          <a href="/api/message/export/${j.id}.csv" target="_blank">CSV</a>
          ${(j.status==='error'||j.status==='partial')?`<button class="retry">重送失敗</button>`:''}
        </div>`;
      div.querySelector('.detail').onclick = () => showJobDetail(j.id);
      if (div.querySelector('.retry')) div.querySelector('.retry').onclick = () => retryJob(j.id);
      box.appendChild(div);
    });
  } catch (e) { toast(e.message); }
}

async function showJobDetail(id) {
  try {
    const { items } = await api(`/jobs/${id}/detail`);
    const box = $('#jobDetail');
    box.style.display = '';
    box.innerHTML = '';
    items.slice(-200).forEach(it => {
      const div = document.createElement('div');
      div.className = 'job';
      div.innerHTML = `<div>${it.target} ${it.isGroup?'[G]':''} <small>${it.botId||''}</small></div><div>${it.ok?'<span class="badge ok">OK</span>':'<span class="badge err">ERR</span>'}</div>`;
      box.appendChild(div);
    });
  } catch (e) { alert(e.message); }
}

async function retryJob(id) {
  try {
    const { job } = await api(`/jobs/${id}/retry`, 'POST', {});
    alert('已建立重送作業：'+job.id);
    loadJobs();
  } catch (e) { alert(e.message); }
}

// 上傳名單
$('#btnUpload').addEventListener('click', async () => {
  try {
    const content = $('#uploadContent').value.trim();
    if (!content) return alert('請貼上名單內容');
    const kind = $('#uploadKind').value;
    const { uploadId, count } = await api('/upload-list', 'POST', { name: '前端上傳', content, kind });
    sessionStorage.setItem('mc_uploadId', uploadId);
    $('#uploadInfo').textContent = `已建立名單：${uploadId}（${count} 筆）`;
    $('#recipientMode').value = 'upload';
  } catch (e) { alert(e.message); }
});

// 初始化
loadTemplates();
loadJobs();
setInterval(loadJobs, 5000);

// 若從 Flex Builder 帶入 preset
(async function initFromHash(){
  try {
    const hash = location.hash||'';
    const m = hash.match(/preset=([^&]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    const { data } = await api('/flex-presets');
    const p = data.find(x => x.id===id);
    if (!p) return;
    $('#msgType').value='flex';
    $('#textBox').style.display='none';
    $('#flexBox').style.display='';
    $('#flexJson').value = JSON.stringify(p.contents, null, 2);
    $('#flexAlt').value = p.altText||'通知';
    alert('已從 Flex 預設載入到 Composer');
  } catch (e) {
    console.warn('initFromHash error', e);
  }
})();

// ===== 關鍵字規則管理 =====
async function loadKeywords(){
  try{
    const res = await fetch('/api/keywords', { headers: authHeaders() });
    const { data } = await res.json();
    const box = document.getElementById('kwList'); box.innerHTML='';
    data.sort((a,b)=>(a.priority||100)-(b.priority||100)).forEach(r=>{
      const div = document.createElement('div'); div.className='job';
      div.innerHTML = `<div><b>${r.pattern}</b> <span class="badge ${r.enabled!==false?'ok':'err'}">${r.matchType||'exact'}</span> <small>→ ${r.action}</small></div>
        <div>
          <button class="edit">編輯</button>
          <button class="del">刪除</button>
        </div>`;
      div.querySelector('.edit').onclick = ()=> editKeyword(r);
      div.querySelector('.del').onclick = async ()=>{ if(!confirm('確定刪除？'))return; await fetch(`/api/keywords/${r.id}`, { method:'DELETE', headers:authHeaders() }); loadKeywords(); };
      box.appendChild(div);
    });
  }catch(e){ console.warn(e); }
}

function editKeyword(rule){
  const pattern = prompt('規則關鍵字（pattern）', rule?.pattern||''); if (pattern==null) return;
  const matchType = prompt('匹配方式 exact|contains|regex', rule?.matchType||'exact'); if (matchType==null) return;
  const action = prompt('動作 alias_to|reply_text|reply_flex|http_forward', rule?.action||'reply_text'); if (action==null) return;
  const params = prompt('參數(JSON) 例如 {"text":"Hi"} 或 {"target":"#出缺勤"} 或 {"presetId":"fx_xxx"}', JSON.stringify(rule?.params||{})); if (params==null) return;
  const priority = parseInt(prompt('優先順序（數字越小越先）', rule?.priority??100));
  const enabled = confirm('啟用此規則？');
  const body = { pattern, matchType, action, params: JSON.parse(params||'{}'), priority, enabled };
  const method = rule?.id ? 'PATCH' : 'POST';
  const path = rule?.id ? `/api/keywords/${rule.id}` : '/api/keywords';
  fetch(path, { method, headers: authHeaders(), body: JSON.stringify(body) }).then(()=>loadKeywords());
}

document.getElementById('btnReloadKW').onclick = loadKeywords;
document.getElementById('btnAddKW').onclick = ()=> editKeyword(null);
document.getElementById('btnTestKW').onclick = async ()=>{
  try{
    const text = document.getElementById('kwTestText').value.trim();
    const res = await fetch('/api/keywords/test', { method:'POST', headers:authHeaders(), body: JSON.stringify({ text }) });
    const data = await res.json();
    document.getElementById('kwTestResult').textContent = data.rule ? `匹配：${data.rule.pattern} → ${data.rule.action}` : '未匹配';
  }catch(e){ alert(e.message); }
};

// ===== Webhook 轉發管理 =====
async function loadForwarders(){
  try{
    const res = await fetch('/api/webhook-forward/status');
    const data = await res.json();
    const box = document.getElementById('fwList'); box.innerHTML='';
    (data.targets||[]).forEach(t=>{
      const div=document.createElement('div'); div.className='job';
      div.innerHTML = `<div><b>${t.name||t.url}</b> <small>${t.url}</small> <span class="badge ${t.enabled?'ok':'err'}">${t.enabled?'啟用':'停用'}</span></div>
        <div>
          <button class="toggle">${t.enabled?'停用':'啟用'}</button>
          <button class="del">刪除</button>
        </div>`;
      div.querySelector('.toggle').onclick = async ()=>{ await fetch(`/api/webhook-forward/targets/${encodeURIComponent(t.name||t.url)}`, { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ enabled: !t.enabled }) }); loadForwarders(); };
      div.querySelector('.del').onclick = async ()=>{ if(!confirm('確定移除？'))return; await fetch(`/api/webhook-forward/targets/${encodeURIComponent(t.name||t.url)}`, { method:'DELETE' }); loadForwarders(); };
      box.appendChild(div);
    });
  }catch(e){ console.warn(e); }
}

document.getElementById('btnAddForward').onclick = async ()=>{
  try{
    const name = document.getElementById('fwName').value.trim();
    const url = document.getElementById('fwUrl').value.trim();
    if (!url) return alert('請填 URL');
    await fetch('/api/webhook-forward/targets', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name, url, enabled:true }) });
    loadForwarders();
  }catch(e){ alert(e.message); }
};

// 初始載入
loadKeywords();
loadForwarders();

// Rich Menu 綁定/解除
$('#btnBindRM').addEventListener('click', async () => {
  try {
    const userId = $('#rmUserId').value.trim();
    const richMenuId = $('#rmId').value.trim();
    if (!userId || !richMenuId) return alert('請填入 userId 與 richMenuId');
    await api('/richmenu/bind', 'POST', { userId, richMenuId });
    alert('Rich Menu 綁定成功');
  } catch (e) { alert('綁定失敗：' + e.message); }
});

$('#btnUnbindRM').addEventListener('click', async () => {
  try {
    const userId = $('#rmUserId').value.trim();
    if (!userId) return alert('請填入 userId');
    await api('/richmenu/unbind', 'POST', { userId });
    alert('Rich Menu 解除綁定成功');
  } catch (e) { alert('解除失敗：' + e.message); }
});

// 搜尋/載入收件人
function renderResults(items, formatter, onPick) {
  const box = $('#searchResults');
  box.style.display = '';
  box.innerHTML = '';
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'job';
    div.innerHTML = `<div>${formatter(it)}</div><div><button class="pick">加入</button></div>`;
    div.querySelector('.pick').onclick = () => onPick(it);
    box.appendChild(div);
  });
}

$('#btnFindUsers').addEventListener('click', async () => {
  try {
    const q = $('#searchQ').value.trim();
    const { data } = await api(`/recipients/users?q=${encodeURIComponent(q)}`);
    renderResults(data.slice(0,100), u => `${u.displayName||'-'} <small>${u.userId}</small>`, u => {
      const cur = $('#recipientList').value.trim();
      $('#recipientList').value = (cur ? cur + '\n' : '') + u.userId;
    });
    $('#recipientMode').value = 'userIds';
  } catch (e) { alert(e.message); }
});

$('#btnFindTeachers').addEventListener('click', async () => {
  try {
    const { data } = await api('/recipients/teachers');
    renderResults(data, t => `${t.teacherName||'-'} <small>${t.userId}</small>`, t => {
      const cur = $('#recipientList').value.trim();
      $('#recipientList').value = (cur ? cur + '\n' : '') + t.userId;
    });
    $('#recipientMode').value = 'userIds';
  } catch (e) { alert(e.message); }
});

$('#btnFindGroups').addEventListener('click', async () => {
  try {
    const q = $('#searchQ').value.trim();
    const { data } = await api(`/recipients/groups?q=${encodeURIComponent(q)}`);
    renderResults(data, g => `${g.groupName||'-'} <small>${g.groupId}</small>`, g => {
      const cur = $('#recipientList').value.trim();
      $('#recipientList').value = (cur ? cur + '\n' : '') + g.groupId;
    });
    $('#recipientMode').value = 'groups';
  } catch (e) { alert(e.message); }
});

$('#btnEstimate').addEventListener('click', async () => {
  try {
    const modeSel = $('#recipientMode').value;
    let recipients;
    if (modeSel === 'userIds') recipients = { mode: 'userIds', userIds: parseListArea($('#recipientList').value) };
    else if (modeSel === 'groups') recipients = { mode: 'groups', groups: parseListArea($('#recipientList').value) };
    else recipients = { mode: 'segment', segment: { role: 'teacher' } };
    const { estimate } = await api('/recipients/estimate', 'POST', { recipients });
    $('#estimateLabel').textContent = `估算：使用者 ${estimate.users}，群組 ${estimate.groups}`;
  } catch (e) { alert(e.message); }
});
