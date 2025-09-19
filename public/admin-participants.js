function $(s, r=document){ return r.querySelector(s); }
const loginForm = $('#loginForm');
const partsArea = $('#partsArea');
const tblNames = $('#tblNames tbody');
const tabs = Array.from(document.querySelectorAll('.tab'));
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, kind='success'){
  if (!toastEl) return alert(msg);
  toastEl.className = 'toast ' + (kind || '');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 2400);
}

let adminKey = '';
let state = { roses: [], candles: [], treasures: [] };
let current = 'roses';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#adminKey').value;
  if (!adminKey) { showToast('Password required', 'error'); return; }
  try {
    await loadParticipants();
    loginForm.style.display = 'none';
    partsArea.style.display = 'block';
  } catch (err) { showToast('Unauthorized or server error', 'error'); }
});

async function loadParticipants(){
  const res = await fetch('/api/participants');
  if (!res.ok) throw new Error('participants');
  const data = await res.json();
  state.roses = (data.roses || []).map(x => ({ name: x.name || '' }));
  state.candles = (data.candles || []).map(x => ({ name: x.name || '' }));
  state.treasures = (data.treasures || []).map(x => ({ name: x.name || '' }));
  renderCurrent();
}

function renderCurrent(){
  tblNames.innerHTML = '';
  const arr = state[current] || [];
  if (arr.length === 0) arr.push({ name: '' });
  arr.forEach((it, idx) => tblNames.appendChild(rowEl(it, idx)));
  tabs.forEach(btn => btn.classList.toggle('tab-active', btn.dataset.tab === current));
}

function rowEl(it, idx){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${escapeHTML(it.name||'')}" placeholder="Name"/></td>
    <td><button class="btn btn-del" type="button">Delete</button></td>
  `;
  const input = tr.querySelector('input');
  input.addEventListener('input', (e) => { state[current][idx].name = e.target.value; });
  tr.querySelector('.btn-del').addEventListener('click', () => { state[current].splice(idx,1); renderCurrent(); });
  return tr;
}

document.getElementById('addRow').addEventListener('click', () => { state[current].push({ name: '' }); renderCurrent(); });
tabs.forEach(btn => btn.addEventListener('click', () => { current = btn.dataset.tab; renderCurrent(); }));

document.getElementById('saveParticipants').addEventListener('click', async () => {
  const payload = {
    roses: state.roses.filter(i => i.name && i.name.trim()),
    candles: state.candles.filter(i => i.name && i.name.trim()),
    treasures: state.treasures.filter(i => i.name && i.name.trim())
  };
  const res = await fetch('/api/participants', {
    method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify(payload)
  });
  if (!res.ok) { showToast('Save failed', 'error'); return; }
  showToast('Participants saved', 'success');
});

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
