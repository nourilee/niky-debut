const http = require('http');
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'niky18';

const { server } = require('../server');

function request(port, method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port, path, method, headers };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  const adminKey = process.env.ADMIN_PASSWORD;
  console.log('Smoke test on port', port);

  // 1) Static index
  const resIndex = await request(port, 'GET', '/');
  console.log('GET /', resIndex.status, resIndex.headers['content-type']);

  // 2) Public program
  const resProg = await request(port, 'GET', '/api/program');
  console.log('GET /api/program', resProg.status);

  // 3) Admin list unauthorized
  const res401 = await request(port, 'GET', '/api/rsvps');
  console.log('GET /api/rsvps (no key)', res401.status);

  // 4) Submit RSVP
  const payload = JSON.stringify({ name: 'Test Guest', willAttend: true, guests: 2, comments: 'Looking forward!' });
  const resRSVP = await request(port, 'POST', '/api/rsvp', { headers: { 'Content-Type': 'application/json' }, body: payload });
  console.log('POST /api/rsvp', resRSVP.status);

  // 5) Admin list authorized
  const resList = await request(port, 'GET', '/api/rsvps', { headers: { 'X-Admin-Key': adminKey } });
  console.log('GET /api/rsvps (with key)', resList.status);

  // 6) Export CSV
  const resCSV = await request(port, 'GET', '/api/export', { headers: { 'X-Admin-Key': adminKey } });
  console.log('GET /api/export', resCSV.status, resCSV.headers['content-type']);

  server.close();
}

run().catch(err => {
  console.error('Smoke test failed:', err);
  try { server.close(); } catch {}
  process.exit(1);
});
