function $(s, r=document){ return r.querySelector(s); }
const loginForm = $('#loginForm');
const adminArea = $('#adminArea');
const rsvpTableBody = $('#rsvpTable tbody');
const countBadge = $('#countBadge');
const exportLink = $('#exportLink');
const programJSON = $('#programJSON');
const saveProgramBtn = $('#saveProgram');
const settingsJSON = $('#settingsJSON');
const saveSettingsBtn = $('#saveSettings');
const quickForm = document.getElementById('quickSettings');
const qs = {
  title: document.getElementById('qsTitle'),
  subtitle: document.getElementById('qsSubtitle'),
  date: document.getElementById('qsDate'),
  time: document.getElementById('qsTime'),
  rsvpBy: document.getElementById('qsRsvpBy'),
  capacityLimit: document.getElementById('qsCapacity'),
  venueName: document.getElementById('qsVenueName'),
  venueAddress: document.getElementById('qsVenueAddress'),
  mapQuery: document.getElementById('qsMapQuery'),
  attireTitle: document.getElementById('qsAttire'),
  suggestedColors: document.getElementById('qsColors'),
};
const participantsJSON = $('#participantsJSON');
const saveParticipantsBtn = $('#saveParticipants');
const cbShowRoses = document.getElementById('showRoses');
const cbShowCandles = document.getElementById('showCandles');
const cbShowTreasures = document.getElementById('showTreasures');
const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(msg, kind='success'){
  if (!toastEl) return alert(msg);
  toastEl.className = 'toast ' + (kind || '');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 2600);
}

let adminKey = '';
let currentSettings = null;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#adminKey').value;
  if (!adminKey) { alert('Password required'); return; }
  try {
    await loadRSVPs();
    await loadProgram();
    await loadSettings();
    await loadParticipants();
    loginForm.style.display = 'none';
    adminArea.style.display = 'block';
  } catch (err) {
    alert('Unauthorized or server error.');
  }
});

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
  if (!res.ok) { alert('Export failed'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rsvps.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function loadProgram(){
  const res = await fetch('/api/program');
  if (!res.ok) return;
  const data = await res.json();
  programJSON.value = JSON.stringify(data, null, 2);
}

saveProgramBtn.addEventListener('click', async () => {
  let payload;
  try {
    payload = JSON.parse(programJSON.value || '{}');
  } catch (e){
    alert('Invalid JSON'); return;
  }
  if (!payload || !Array.isArray(payload.items)){
    alert('Expected an object with an "items" array'); return;
  }
  const res = await fetch('/api/program', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ items: payload.items })
  });
  if (!res.ok) { alert('Save failed'); return; }
  alert('Program saved');
});

async function loadSettings(){
  const res = await fetch('/api/settings');
  if (!res.ok) return;
  const data = await res.json();
  currentSettings = data;
  settingsJSON.value = JSON.stringify(data, null, 2);
  if (cbShowRoses) cbShowRoses.checked = data.showRoses !== false;
  if (cbShowCandles) cbShowCandles.checked = data.showCandles !== false;
  if (cbShowTreasures) cbShowTreasures.checked = data.showTreasures !== false;
  if (qs.title) qs.title.value = data.title || '';
  if (qs.subtitle) qs.subtitle.value = data.subtitle || '';
  if (qs.date) qs.date.value = data.date || '';
  if (qs.time) qs.time.value = data.time || '';
  if (qs.rsvpBy) qs.rsvpBy.value = data.rsvpBy || '';
  if (qs.capacityLimit) qs.capacityLimit.value = data.capacityLimit || '';
  if (qs.venueName) qs.venueName.value = data.venueName || '';
  if (qs.venueAddress) qs.venueAddress.value = data.venueAddress || '';
  if (qs.mapQuery) qs.mapQuery.value = data.mapQuery || '';
  if (qs.attireTitle) qs.attireTitle.value = data.attireTitle || '';
  if (qs.suggestedColors) qs.suggestedColors.value = data.suggestedColors || '';
}

saveSettingsBtn.addEventListener('click', async () => {
  let payload;
  try { payload = JSON.parse(settingsJSON.value || '{}'); } catch(e){ alert('Invalid JSON'); return; }
  if (payload && Object.prototype.hasOwnProperty.call(payload,'capacityLimit')){
    const cap = Number(payload.capacityLimit);
    if (!Number.isFinite(cap) || cap < 0){
      showToast('Capacity must be a non-negative number', 'error');
      return;
    }
  }
  if (cbShowRoses) payload.showRoses = !!cbShowRoses.checked;
  if (cbShowCandles) payload.showCandles = !!cbShowCandles.checked;
  if (cbShowTreasures) payload.showTreasures = !!cbShowTreasures.checked;
  const res = await fetch('/api/settings', {
    method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify(payload)
  });
  if (!res.ok) { showToast('Save failed', 'error'); return; }
  showToast('Settings saved', 'success');
  await loadSettings();
});

if (quickForm) {
  quickForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Clear old errors
    if (qs.capacityLimit) qs.capacityLimit.classList.remove('input-error');
    const capVal = qs.capacityLimit?.value;
    if (capVal && (!Number.isFinite(Number(capVal)) || Number(capVal) < 0)){
      qs.capacityLimit.classList.add('input-error');
      showToast('Capacity must be a non-negative number', 'error');
      return;
    }
    const payload = {
      title: qs.title?.value || undefined,
      subtitle: qs.subtitle?.value || undefined,
      date: qs.date?.value || undefined,
      time: qs.time?.value || undefined,
      rsvpBy: qs.rsvpBy?.value || undefined,
      capacityLimit: qs.capacityLimit?.value ? Number(qs.capacityLimit.value) : undefined,
      venueName: qs.venueName?.value || undefined,
      venueAddress: qs.venueAddress?.value || undefined,
      mapQuery: qs.mapQuery?.value || undefined,
      attireTitle: qs.attireTitle?.value || undefined,
      suggestedColors: qs.suggestedColors?.value || undefined,
      showRoses: cbShowRoses ? !!cbShowRoses.checked : undefined,
      showCandles: cbShowCandles ? !!cbShowCandles.checked : undefined,
      showTreasures: cbShowTreasures ? !!cbShowTreasures.checked : undefined,
    };
    const res = await fetch('/api/settings', {
      method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify(payload)
    });
    if (!res.ok) { showToast('Save failed', 'error'); return; }
    showToast('Quick settings saved', 'success');
    await loadSettings();
  });
}

async function loadParticipants(){
  const res = await fetch('/api/participants');
  if (!res.ok) return;
  const data = await res.json();
  participantsJSON.value = JSON.stringify(data, null, 2);
}

saveParticipantsBtn.addEventListener('click', async () => {
  let payload;
  try { payload = JSON.parse(participantsJSON.value || '{}'); } catch(e){ alert('Invalid JSON'); return; }
  if (!payload || !Array.isArray(payload.roses) || !Array.isArray(payload.candles) || !Array.isArray(payload.treasures)){
    alert('Expected { roses:[], candles:[], treasures:[] }'); return;
  }
  const res = await fetch('/api/participants', {
    method:'POST', headers:{ 'Content-Type':'application/json', 'X-Admin-Key': adminKey }, body: JSON.stringify(payload)
  });
  if (!res.ok) { alert('Save failed'); return; }
  alert('Participants saved');
});

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
