const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { google } = require('googleapis');

// Load .env early so ADMIN_PASSWORD/PORT can be set via file without extra deps
const root = __dirname;
try {
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return; // ignore malformed lines
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    });
  }
} catch (_) { /* ignore .env parse errors */ }

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'niky18';
const publicDir = path.join(root, 'public');
const dataDir = path.join(root, 'data');
const rsvpFile = path.join(dataDir, 'rsvps.json');
const programFile = path.join(dataDir, 'program.json');
const participantsFile = path.join(dataDir, 'participants.json');
const settingsFile = path.join(dataDir, 'settings.json');

const sheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  range: process.env.GOOGLE_SHEETS_RANGE || 'RSVPs!A:G',
  clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
};

let sheetsClientPromise = null;

function googleSheetsEnabled() {
  return Boolean(sheetsConfig.spreadsheetId && sheetsConfig.clientEmail && sheetsConfig.privateKey);
}

async function getSheetsClient() {
  if (!googleSheetsEnabled()) return null;
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const auth = new google.auth.JWT(
        sheetsConfig.clientEmail,
        undefined,
        (sheetsConfig.privateKey || '').replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      return google.sheets({ version: 'v4', auth });
    })().catch(err => {
      sheetsClientPromise = null;
      console.error('Failed to initialize Google Sheets client:', err.message || err);
      throw err;
    });
  }
  return sheetsClientPromise;
}

async function appendRsvpToGoogleSheet(entry) {
  if (!googleSheetsEnabled()) return;
  try {
    const sheets = await getSheetsClient();
    if (!sheets) return;
    const values = [[
      entry.timestamp,
      entry.name,
      entry.willAttend ? 'Yes' : 'No',
      entry.guests,
      entry.kids,
      entry.comments || '',
      entry.id,
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: sheetsConfig.range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  } catch (err) {
    console.error('Failed to append RSVP to Google Sheet:', err.message || err);
  }
}

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(rsvpFile)) fs.writeFileSync(rsvpFile, '[]', 'utf8');
  if (!fs.existsSync(programFile)) fs.writeFileSync(programFile, JSON.stringify({ items: [] }, null, 2));
  if (!fs.existsSync(participantsFile)) fs.writeFileSync(participantsFile, JSON.stringify({ roses: [], candles: [], treasures: [] }, null, 2));
  if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, JSON.stringify({
    title: "Niky's 18th Birthday",
    subtitle: "A Tangled-inspired debut celebration under floating lanterns.",
    date: "March 15, 2025",
    time: "6:00 PM",
    rsvpBy: "November 30, 2025",
    rsvpLockDate: "2025-12-01T00:00:00Z",
    inviteHeading: "You Are Invited to a Night of Light and Wonder",
    debutanteName: "Niky",
    turningTagline: "is turning 18",
    suggestedColors: "soft gold, lavender, sage, dusty rose",
    attireTitle: "Whimsical Formal",
    attireLadies: "Tulle dresses, dreamy layers, and floral elegance.",
    attireGentlemen: "Tailored looks in muted tones—garden prince meets fairytale evening.",
    entourageTitle: "Entourage of Light and Love",
    rosesTitle: "18 Waltz of Flowers",
    candlesTitle: "18 Circle of Light",
    treasuresTitle: "18 Treasures from the Heart",
    showRoses: true,
    showCandles: true,
    showTreasures: true,
    giftNote: "Your presence is the most precious gift of all.\nBut if you’re wondering what else to bring, Niky is building the first steps toward her dreams.\nMonetary gifts would be a thoughtful way to support her journey, as she saves for future adventures and grown-up goals.",
    venueName: "The Sunflower Hall",
    venueAddress: "Manila",
    mapQuery: "The Sunflower Hall, Manila"
  }, null, 2));
}

ensureDataFiles();

function send(res, status, body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
  res.writeHead(status, { ...defaultHeaders, ...headers });
  res.end(body);
}

function sendJSON(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function notFound(res) { send(res, 404, 'Not Found'); }

function unauthorized(res) { send(res, 401, 'Unauthorized'); }

function isAuthorized(req) {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === ADMIN_PASSWORD;
}

function serveStatic(req, res) {
  let pathname = url.parse(req.url).pathname || '/';
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return notFound(res);
  fs.readFile(filePath, (err, data) => {
    if (err) return notFound(res);
    const ext = path.extname(filePath).toLowerCase();
    const type = ({
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
    })[ext] || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function handleAPI(req, res) {
  const { pathname, query } = url.parse(req.url, true);

  if (req.method === 'OPTIONS') return send(res, 200, 'OK');

  // GET RSVPs (admin)
  if (req.method === 'GET' && pathname === '/api/rsvps') {
    if (!isAuthorized(req)) return unauthorized(res);
    const list = JSON.parse(fs.readFileSync(rsvpFile, 'utf8'));
    return sendJSON(res, 200, { rsvps: list });
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/rsvps/')) {
    if (!isAuthorized(req)) return unauthorized(res);
    let id;
    try {
      id = decodeURIComponent(pathname.slice('/api/rsvps/'.length));
    } catch (_) {
      return sendJSON(res, 400, { error: 'Invalid RSVP id' });
    }
    if (!id) return sendJSON(res, 400, { error: 'Missing RSVP id' });
    let list = [];
    try { list = JSON.parse(fs.readFileSync(rsvpFile, 'utf8')); } catch (_) {}
    const index = list.findIndex(r => r && r.id === id);
    if (index === -1) return sendJSON(res, 404, { error: 'RSVP not found' });
    const [removed] = list.splice(index, 1);
    fs.writeFileSync(rsvpFile, JSON.stringify(list, null, 2));
    return sendJSON(res, 200, { ok: true, removedId: removed && removed.id ? removed.id : id });
  }

  // POST RSVP (guest)
  if (req.method === 'POST' && pathname === '/api/rsvp') {
    readBody(req)
      .then(body => {
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch (e) {
          return sendJSON(res, 400, { error: 'Invalid JSON' });
        }
        const name = (payload.name || '').trim();
        const willAttend = payload.willAttend === true || payload.willAttend === 'yes' || payload.willAttend === 'true' || payload.willAttend === 'Yes';
        let guests = parseInt(payload.guests, 10);
        if (!Number.isFinite(guests)) guests = willAttend ? 1 : 0;
        guests = Math.max(0, Math.min(5, guests));
        if (!willAttend) guests = 0;
        let kids = parseInt(payload.kids, 10);
        if (!Number.isFinite(kids)) kids = 0;
        kids = Math.max(0, Math.min(5, kids));
        if (!willAttend) kids = 0;
        if (kids > guests) kids = guests;
        const comments = (payload.comments || '').toString().slice(0, 1000);
        if (!name) return sendJSON(res, 400, { error: 'Name is required' });
        // Lock date
        try {
          const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
          if (settings.rsvpLockDate) {
            const lockTs = Date.parse(settings.rsvpLockDate);
            if (!isNaN(lockTs) && Date.now() >= lockTs) {
              const contact = settings.contactEmail ? ` Please contact ${settings.contactEmail} for any concerns.` : '';
              return sendJSON(res, 403, { error: 'RSVP is closed as of the lock date.' + contact });
            }
          }
        } catch (_) {}
        // Honeypot: ignore if bot filled hidden field
        if ((payload.hp && String(payload.hp).trim()) || (payload.website && String(payload.website).trim())) {
          return sendJSON(res, 200, { ok: true, ignored: true });
        }

        const entry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          name,
          willAttend,
          guests,
          kids,
          comments,
          timestamp: new Date().toISOString(),
        };
        const list = JSON.parse(fs.readFileSync(rsvpFile, 'utf8'));
        const confirmed = list.reduce((sum, r) => sum + (r.willAttend ? (r.guests || 1) : 0), 0);
        let warning;
        try {
          const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
          const cap = Number(settings.capacityLimit);
          if (Number.isFinite(cap) && cap > 0 && entry.willAttend && (confirmed + entry.guests) > cap) {
            const contact = settings.contactEmail ? ` Please contact ${settings.contactEmail} to check availability.` : '';
            return sendJSON(res, 409, { error: `We're at capacity. Unable to accept additional attendees.${contact}` });
          }
        } catch (_) {}
        list.push(entry);
        fs.writeFileSync(rsvpFile, JSON.stringify(list, null, 2));
        appendRsvpToGoogleSheet(entry).catch(() => {});
        return sendJSON(res, 200, { ok: true, entry, warning });
      })
      .catch(() => sendJSON(res, 500, { error: 'Server error' }));
    return;
  }

  // Export CSV (admin)
  if (req.method === 'GET' && pathname === '/api/export') {
    if (!isAuthorized(req)) return unauthorized(res);
    const list = JSON.parse(fs.readFileSync(rsvpFile, 'utf8'));
    const header = ['Name', 'WillAttend', 'Guests', 'Kids', 'Comments', 'Timestamp'];
    const rows = list.map(r => [
      r.name,
      r.willAttend ? 'Yes' : 'No',
      r.guests || 0,
      r.kids || 0,
      r.comments || '',
      r.timestamp,
    ]);
    const csv = [header, ...rows].map(cols => cols.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    return send(res, 200, csv, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rsvps.csv"',
    });
  }

  // Program: GET (public) and POST (admin editable)
  if (pathname === '/api/program') {
    if (req.method === 'GET') {
      const data = JSON.parse(fs.readFileSync(programFile, 'utf8'));
      return sendJSON(res, 200, data);
    }
    if (req.method === 'POST') {
      if (!isAuthorized(req)) return unauthorized(res);
      return readBody(req)
        .then(body => {
          let payload = {};
          try { payload = JSON.parse(body || '{}'); } catch (e) { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
          if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
            return sendJSON(res, 400, { error: 'Expected { items: [...] }' });
          }
          fs.writeFileSync(programFile, JSON.stringify({ items: payload.items }, null, 2));
          return sendJSON(res, 200, { ok: true });
        })
        .catch(() => sendJSON(res, 500, { error: 'Server error' }));
    }
  }

  // Participants: GET (public)
  if (req.method === 'GET' && pathname === '/api/participants') {
    const data = JSON.parse(fs.readFileSync(participantsFile, 'utf8'));
    return sendJSON(res, 200, data);
  }

  // Participants: POST (admin)
  if (req.method === 'POST' && pathname === '/api/participants') {
    if (!isAuthorized(req)) return unauthorized(res);
    return readBody(req)
      .then(body => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch (e) { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
        const ok = payload && typeof payload === 'object' && Array.isArray(payload.roses) && Array.isArray(payload.candles) && Array.isArray(payload.treasures);
        if (!ok) return sendJSON(res, 400, { error: 'Expected { roses:[], candles:[], treasures:[] }' });
        fs.writeFileSync(participantsFile, JSON.stringify({
          roses: payload.roses,
          candles: payload.candles,
          treasures: payload.treasures,
        }, null, 2));
        return sendJSON(res, 200, { ok: true });
      })
      .catch(() => sendJSON(res, 500, { error: 'Server error' }));
  }

  // Settings: GET (public) and POST (admin)
  if (pathname === '/api/settings') {
    if (req.method === 'GET') {
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      return sendJSON(res, 200, data);
    }
    if (req.method === 'POST') {
      if (!isAuthorized(req)) return unauthorized(res);
      return readBody(req)
        .then(body => {
          let payload = {};
          try { payload = JSON.parse(body || '{}'); } catch (e) { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
          const allowed = ['title','subtitle','date','time','rsvpBy','rsvpLockDate','inviteHeading','debutanteName','turningTagline','suggestedColors','attireTitle','attireLadies','attireGentlemen','attireLadiesImage','attireGentlemenImage','debutantePhotoUrl','entourageTitle','rosesTitle','candlesTitle','treasuresTitle','showRoses','showCandles','showTreasures','giftNote','venueName','venueAddress','mapQuery','capacityLimit','contactEmail'];
          const next = {};
          for (const k of allowed) next[k] = typeof payload[k] === 'undefined' ? undefined : payload[k];
          // Merge with existing settings to allow partial updates
          const existing = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
          const merged = { ...existing, ...Object.fromEntries(Object.entries(next).filter(([,v]) => typeof v !== 'undefined')) };
          fs.writeFileSync(settingsFile, JSON.stringify(merged, null, 2));
          return sendJSON(res, 200, { ok: true });
        })
        .catch(() => sendJSON(res, 500, { error: 'Server error' }));
    }
  }

  return notFound(res);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleAPI(req, res);
  return serveStatic(req, res);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Niky Debut app running on http://localhost:${PORT}`);
  });
}

module.exports = { server, PORT };
