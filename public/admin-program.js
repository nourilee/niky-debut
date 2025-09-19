function $(s, r=document){ return r.querySelector(s); }
const loginForm = $('#loginForm');
const programArea = $('#programArea');
const tableBody = $('#programTable tbody');
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

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#adminKey').value;
  if (!adminKey) { showToast('Password required', 'error'); return; }
  try {
    await loadProgram();
    loginForm.style.display = 'none';
    programArea.style.display = 'block';
  } catch (err) { showToast('Unauthorized or server error', 'error'); }
});

async function loadProgram(){
  const res = await fetch('/api/program');
  if (!res.ok) throw new Error('program');
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  tableBody.innerHTML = '';
  items.forEach(addRowFromItem);
  if (!items.length) addRow();
}

function addRowFromItem(it){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${escapeHTML(it.time||'')}" /></td>
    <td><input type="text" value="${escapeHTML(it.title||'')}" /></td>
    <td><input type="text" value="${escapeHTML(it.notes||'')}" /></td>
    <td><button class="btn btn-del" type="button">Delete</button></td>
  `;
  tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
  tableBody.appendChild(tr);
}

function addRow(){ addRowFromItem({ time:'', title:'', notes:'' }); }

document.getElementById('addRow').addEventListener('click', addRow);
document.getElementById('saveProgram').addEventListener('click', async () => {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const items = rows.map(r => {
    const tds = r.querySelectorAll('td');
    return { time: tds[0].querySelector('input').value, title: tds[1].querySelector('input').value, notes: tds[2].querySelector('input').value };
  });
  const res = await fetch('/api/program', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify({ items }) });
  if (!res.ok) { showToast('Save failed', 'error'); return; }
  showToast('Program saved', 'success');
});

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

