function $(s, r=document){ return r.querySelector(s); }
const loginForm = $('#loginForm');
const adminArea = $('#adminArea');
const rsvpTableBody = $('#rsvpTable tbody');
const countBadge = $('#countBadge');
const exportLink = $('#exportLink');
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
let currentSettings = null;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#adminKey').value;
  if (!adminKey) { showToast('Password required', 'error'); return; }
  try {
    await loadSettings();
    await loadRSVPs();
    loginForm.style.display = 'none';
    adminArea.style.display = 'block';
  } catch (err) {
    showToast('Unauthorized or server error', 'error');
  }
});

async function loadSettings(){
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('settings');
  currentSettings = await res.json();
}

async function loadRSVPs(){
  const res = await fetch('/api/rsvps', { headers: { 'X-Admin-Key': adminKey }});
  if (!res.ok) throw new Error('unauthorized');
  const data = await res.json();
  const rsvps = Array.isArray(data.rsvps) ? data.rsvps : [];
  rsvpTableBody.innerHTML = rsvps.map(r => `
    <tr>
      <td>${escapeHTML(r.name||'')}</td>
      <td>${r.willAttend ? 'Yes' : 'No'}</td>
      <td>${r.willAttend ? (r.guests||1) : 0}</td>
      <td class="muted">${escapeHTML(r.comments||'')}</td>
      <td class="muted">${escapeHTML(r.timestamp||'')}</td>
    </tr>
  `).join('');
  const guestCount = rsvps.reduce((sum, r) => sum + (r.willAttend ? (r.guests||1) : 0), 0);
  const cap = currentSettings && Number(currentSettings.capacityLimit);
  if (Number.isFinite(cap) && cap > 0) {
    countBadge.textContent = `${guestCount} / ${cap} Guests Confirmed`;
  } else {
    countBadge.textContent = `${guestCount} Guests Confirmed`;
  }
  exportLink.href = '#';
  exportLink.onclick = (ev) => {
    ev.preventDefault();
    downloadCSV();
  };
}

async function downloadCSV(){
  const res = await fetch('/api/export', { headers: { 'X-Admin-Key': adminKey }});
  if (!res.ok) { showToast('Export failed', 'error'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rsvps.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

