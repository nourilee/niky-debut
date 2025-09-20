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
  rsvpTableBody.innerHTML = rsvps.map(r => {
    const total = r.willAttend ? (Number(r.guests) || 0) : 0;
    const kids = r.willAttend ? Math.max(0, Math.min(Number(r.kids) || 0, total)) : 0;
    return `
    <tr data-rsvp-id="${escapeHTML(r.id || '')}">
      <td>${escapeHTML(r.name||'')}</td>
      <td>${r.willAttend ? 'Yes' : 'No'}</td>
      <td>${total}</td>
      <td>${kids}</td>
      <td class="muted">${escapeHTML(r.comments||'')}</td>
      <td class="muted">${escapeHTML(r.timestamp||'')}</td>
      <td><button type="button" class="table-action danger" data-action="delete" data-id="${escapeHTML(r.id || '')}">Delete</button></td>
    </tr>
  `;
  }).join('');
  const guestCount = rsvps.reduce((sum, r) => sum + (r.willAttend ? (Number(r.guests) || 0) : 0), 0);
  const kidCount = rsvps.reduce((sum, r) => {
    if (!r.willAttend) return sum;
    const total = Number(r.guests) || 0;
    const kids = Math.max(0, Math.min(Number(r.kids) || 0, total));
    return sum + kids;
  }, 0);
  const adultCount = Math.max(0, guestCount - kidCount);
  const cap = currentSettings && Number(currentSettings.capacityLimit);
  if (Number.isFinite(cap) && cap > 0) {
    countBadge.textContent = `Adults ${adultCount} • Kids ${kidCount} (Total ${guestCount} / ${cap})`;
    if (guestCount > cap) {
      countBadge.style.background = 'rgba(240,96,25,.18)';
      countBadge.style.borderColor = 'rgba(240,96,25,.35)';
      countBadge.style.color = '#5f1d00';
    } else {
      countBadge.style.background = '';
      countBadge.style.borderColor = '';
      countBadge.style.color = '';
    }
  } else {
    countBadge.textContent = `Adults ${adultCount} • Kids ${kidCount} (Total ${guestCount})`;
    countBadge.style.background = '';
    countBadge.style.borderColor = '';
    countBadge.style.color = '';
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

if (rsvpTableBody) {
  rsvpTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;
    event.preventDefault();
    handleDelete(button);
  });
}

async function handleDelete(button){
  if (!adminKey) { showToast('Sign in first', 'error'); return; }
  const id = button.dataset.id;
  if (!id) return;
  const row = button.closest('tr');
  const nameCell = row ? row.querySelector('td') : null;
  const name = nameCell ? nameCell.textContent.trim() : '';
  const label = name ? ` for ${name}` : '';
  if (typeof confirm === 'function' && !confirm(`Delete RSVP${label}?`)) return;
  button.disabled = true;
  button.classList.add('busy');
  button.textContent = 'Deleting…';
  try {
    const res = await fetch(`/api/rsvps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': adminKey }
    });
    if (!res.ok) {
      let message = 'Delete failed';
      try {
        const payload = await res.json();
        if (payload && payload.error) message = payload.error;
      } catch (_) {}
      showToast(message, 'error');
      return;
    }
    showToast('RSVP removed', 'success');
    await loadRSVPs();
  } catch (_) {
    showToast('Network error while deleting', 'error');
  } finally {
    // If the element still exists (wasn't replaced by reload), restore button state
    if (button.isConnected) {
      button.disabled = false;
      button.classList.remove('busy');
      button.textContent = 'Delete';
    }
  }
}
