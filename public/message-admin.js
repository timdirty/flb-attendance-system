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
    else recipients = { mode: 'segment', segment: { role: 'teacher' } };

    const options = {
      botStrategy: $('#botStrategy').value,
      batchSize: Number($('#batchSize').value || 20),
      rateLimitPerSec: Number($('#rateLimit').value || 8),
      maxRetries: Number($('#maxRetries').value || 2)
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
        <div>${stat}</div>`;
      box.appendChild(div);
    });
  } catch (e) { toast(e.message); }
}

// 初始化
loadTemplates();
loadJobs();
setInterval(loadJobs, 5000);

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
