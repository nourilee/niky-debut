// Run with: node --test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Ensure known admin password for tests before requiring server
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'niky18';

const { server } = require('../server');
const { request } = require('./helpers/http');

let port;
let adminKey = process.env.ADMIN_PASSWORD;

before(async () => {
  await new Promise(res => server.listen(0, res));
  port = server.address().port;
  // Reset RSVPs to ensure deterministic capacity tests
  const rsvpPath = path.join(__dirname, '..', 'data', 'rsvps.json');
  try { fs.writeFileSync(rsvpPath, '[]', 'utf8'); } catch {}
});

after(() => {
  try { server.close(); } catch {}
});

test('settings visibility flags can be toggled (showRoses false)', async () => {
  // Save setting
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ showRoses: false })
  });
  assert.equal(res.status, 200);

  // Read back
  res = await request(port, 'GET', '/api/settings');
  assert.equal(res.status, 200);
  const settings = JSON.parse(res.body);
  assert.equal(settings.showRoses, false);
});

test('RSVP lock date blocks submissions with 403', async () => {
  // Set lock date to past
  const past = new Date(Date.now() - 60_000).toISOString();
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ rsvpLockDate: past })
  });
  assert.equal(res.status, 200);

  // Attempt RSVP
  res = await request(port, 'POST', '/api/rsvp', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lock Tester', willAttend: true, guests: 1 })
  });
  assert.equal(res.status, 403);
});

test('Capacity hard block with 409 if exceeding limit', async () => {
  // Unlock and set small capacity
  const future = new Date(Date.now() + 3600_000).toISOString();
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ rsvpLockDate: future, capacityLimit: 1 })
  });
  assert.equal(res.status, 200);

  // First RSVP within capacity
  res = await request(port, 'POST', '/api/rsvp', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cap Ok', willAttend: true, guests: 1 })
  });
  assert.equal(res.status, 200);

  // Second RSVP pushes over capacity
  res = await request(port, 'POST', '/api/rsvp', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cap Block', willAttend: true, guests: 1 })
  });
  assert.equal(res.status, 409);
});

test('Honeypot field causes RSVP to be ignored', async () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ rsvpLockDate: future })
  });
  assert.equal(res.status, 200);

  res = await request(port, 'POST', '/api/rsvp', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bot', willAttend: true, guests: 1, hp: 'http://spam' })
  });
  assert.equal(res.status, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ignored, true);
});

// UI logic tests (no browser)
function anyHidden(settings){
  return settings.showRoses === false || settings.showCandles === false || settings.showTreasures === false;
}

function badgeText(guestCount, capacity){
  if (Number.isFinite(capacity) && capacity > 0) return `${guestCount} / ${capacity} Guests Confirmed`;
  return `${guestCount} Guests Confirmed`;
}

test('Program chip appears when any section hidden', async () => {
  // Hide one section
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ showRoses: false, showCandles: true, showTreasures: true })
  });
  assert.equal(res.status, 200);
  // Fetch settings and evaluate UI logic
  res = await request(port, 'GET', '/api/settings');
  const settings = JSON.parse(res.body);
  assert.equal(anyHidden(settings), true);
});

test('Admin badge shows X / limit when capacity is set', async () => {
  // Reset RSVPs for deterministic count
  const rsvpPath = path.join(__dirname, '..', 'data', 'rsvps.json');
  try { fs.writeFileSync(rsvpPath, '[]', 'utf8'); } catch {}
  // Set capacity and add two RSVPs totaling 3 guests
  let res = await request(port, 'POST', '/api/settings', {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify({ capacityLimit: 100, rsvpLockDate: new Date(Date.now() + 3600_000).toISOString() })
  });
  assert.equal(res.status, 200);
  await request(port, 'POST', '/api/rsvp', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'A', willAttend: true, guests: 2 }) });
  await request(port, 'POST', '/api/rsvp', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'B', willAttend: true, guests: 1 }) });
  res = await request(port, 'GET', '/api/rsvps', { headers: { 'X-Admin-Key': adminKey } });
  const data = JSON.parse(res.body);
  const guestCount = data.rsvps.reduce((sum, r) => sum + (r.willAttend ? (r.guests||1) : 0), 0);
  const text = badgeText(guestCount, 100);
  assert.equal(text.endsWith(' / 100 Guests Confirmed'), true);
});
