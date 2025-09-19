function $(s, r=document){ return r.querySelector(s); }
const loginForm = $('#loginForm');
const settingsArea = $('#settingsArea');
const quickForm = document.getElementById('quickSettings');
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
const qs = {
  title: $('#qsTitle'), subtitle: $('#qsSubtitle'), date: $('#qsDate'), time: $('#qsTime'),
  rsvpBy: $('#qsRsvpBy'), rsvpLockDate: $('#qsLock'), capacityLimit: $('#qsCapacity'),
  venueName: $('#qsVenueName'), venueAddress: $('#qsVenueAddress'), mapQuery: $('#qsMapQuery'),
  attireTitle: $('#qsAttire'), suggestedColors: $('#qsColors')
};
const cbShowRoses = document.getElementById('showRoses');
const cbShowCandles = document.getElementById('showCandles');
const cbShowTreasures = document.getElementById('showTreasures');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#adminKey').value;
  if (!adminKey) { showToast('Password required', 'error'); return; }
  try {
    await loadSettings();
    loginForm.style.display = 'none';
    settingsArea.style.display = 'block';
  } catch (err) { showToast('Unauthorized or server error', 'error'); }
});

async function loadSettings(){
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('settings');
  const data = await res.json();
  currentSettings = data;
  for (const k in qs) if (qs[k]) qs[k].value = data[k] || '';
  if (cbShowRoses) cbShowRoses.checked = data.showRoses !== false;
  if (cbShowCandles) cbShowCandles.checked = data.showCandles !== false;
  if (cbShowTreasures) cbShowTreasures.checked = data.showTreasures !== false;
}

quickForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (qs.capacityLimit && qs.capacityLimit.value){
    const n = Number(qs.capacityLimit.value);
    if (!Number.isFinite(n) || n < 0){ showToast('Capacity must be a non-negative number', 'error'); return; }
  }
  const payload = {
    title: qs.title?.value || undefined,
    subtitle: qs.subtitle?.value || undefined,
    date: qs.date?.value || undefined,
    time: qs.time?.value || undefined,
    rsvpBy: qs.rsvpBy?.value || undefined,
    rsvpLockDate: qs.rsvpLockDate?.value || undefined,
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
  showToast('Settings saved', 'success');
  await loadSettings();
});

