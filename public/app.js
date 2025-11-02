const routes = {
  '/': renderHome,
  '/rsvp': renderRSVP,
  '/program': renderProgram,
  '/venue': renderVenue,
  '/roses': (el) => renderParticipants(
    el,
    'roses',
  (settingsCache && settingsCache.rosesTitle) || '18 Waltz of Flowers',
  `To Our 18 Roses 🌹:
You are among the special men in Nicoleen’s life who have offered her strength, love, and protection through the years.
As one of her 18 Roses, you’ll have the honor of sharing a dance with her during this milestone celebration — a gesture of love, respect, and encouragement as she steps into womanhood.

Be ready to own the spotlight and make the moment unforgettable!`
    , 'letter'
  ),
  '/candles': (el) => renderParticipants(
    el,
    'candles',
  (settingsCache && settingsCache.candlesTitle) || '18 Circle of Light',
  `To Our 18 Lanterns 🕯️:

“All those days watching from the windows, all those years outside looking in…”

As Nicoleen enters this new chapter of her life, she will be surrounded by the glow of her guiding lights — you.
You will walk with her — each bearing a lantern, that symbolizes your love and presence.
During the celebration, you will be invited to share a short message, a spark of wisdom and warmth to illuminate her journey ahead.
May your light remind her that she will never walk alone in the dark, for she carries your warmth wherever she goes.`
    , 'letter'
  ),
  '/treasures': (el) => renderParticipants(
    el,
    'treasures',
  (settingsCache && settingsCache.treasuresTitle) || '18 Gifts of Grace',
  `To Our Dear 18 Treasures 🎁,
You have been chosen not only for your love and presence in Nicoleen’s life, but also for the faith, wisdom, and joy you’ve shared with her through the years.
During the program, we invite you to present a gift or token of significance — it may be a keepsake, symbolic item, or monetary blessing — and to share briefly on stage the reason or meaning behind your chosen gift.
Your presence and words will be among the evening’s most treasured moments.`
    , 'letter'
  ),
  '/shots': (el) => renderParticipants(
    el,
    'shots',
    '18 Cheers of Friendship',
  `To Our 18 Shots 🍸:
Get ready to raise your glass!
As one of Nicoleen’s 18 Shots, you’ll take part in a lively and unforgettable moment — offering a fun toast, message, or cheer to celebrate her coming of age.
You’ll help kick off the energy of the night and lead the way into her candle-blowing celebration.
Feel free to make it lighthearted, witty, or sentimental — just make it you!`
    , 'letter'
  ),
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

let settingsCache = null;
let navToggleInitialized = false;
let floatingElementsInitialized = false;

async function ensureSettings(force){
  if (settingsCache && !force) return settingsCache;
  try {
    const res = await fetch('/api/settings');
    settingsCache = await res.json();
  } catch (e) {
    settingsCache = {};
  }
  const brand = document.getElementById('brandTitle');
  if (brand && settingsCache && settingsCache.title) {
    brand.textContent = settingsCache.title.replace(/'s 18th Birthday$/, "'s 18th");
  }
  applyNavLabels();
  return settingsCache;
}

function closeNavMenu(){
  const toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}

function setupNavToggle(){
  if (navToggleInitialized) return;
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  document.body.classList.add('nav-enhanced');
  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    toggle.setAttribute('aria-expanded', String(next));
    document.body.classList.toggle('nav-open', next);
  });

  nav.addEventListener('click', (ev) => {
    if (ev.target.closest('a')) closeNavMenu();
  });

  document.addEventListener('click', (ev) => {
    if (!document.body.classList.contains('nav-open')) return;
    if (ev.target.closest('.nav') || ev.target.closest('.nav-toggle')) return;
    closeNavMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNavMenu();
  });

  navToggleInitialized = true;
}

function initFloatingElements(){
  if (floatingElementsInitialized) return;
  const container = document.querySelector('.floating-elements');
  if (!container) return;
  const icons = ['🌸','🌺','🌼','💮','🍃','✨'];
  const total = 18;
  for (let i = 0; i < total; i++) {
    const span = document.createElement('span');
    span.className = 'float-item';
    span.textContent = icons[i % icons.length];
    span.style.setProperty('--x', `${Math.random() * 100}%`);
    span.style.setProperty('--delay', `${(-Math.random() * 14).toFixed(2)}s`);
    span.style.setProperty('--duration', `${(14 + Math.random() * 10).toFixed(2)}s`);
    span.style.setProperty('--size', `${(1.4 + Math.random() * 1.8).toFixed(2)}rem`);
    span.style.setProperty('--drift', `${(Math.random() * 60 - 30).toFixed(1)}px`);
    span.style.setProperty('--spin', `${(Math.random() > 0.5 ? '' : '-')}${(200 + Math.random() * 260).toFixed(0)}deg`);
    container.appendChild(span);
  }
  floatingElementsInitialized = true;
}

function applyNavLabels(){
  const s = settingsCache || {};
  const map = {
    '#/roses': s.rosesTitle || '18 Waltz of Flowers',
    '#/candles': s.candlesTitle || '18 Circle of Light',
    '#/treasures': s.treasuresTitle || '18 Gifts of Grace',
    '#/shots': s.shotsTitle || '18 Cheers of Friendship',
  };
  $all('a[data-route]').forEach(a => {
    const href = a.getAttribute('href');
    if (map[href]) a.textContent = map[href];
    const hidden = (href === '#/roses' && s.showRoses === false) ||
                   (href === '#/candles' && s.showCandles === false) ||
                   (href === '#/treasures' && s.showTreasures === false);
    a.classList.toggle('disabled', !!hidden);
    if (hidden) a.title = 'Not yet announced'; else a.removeAttribute('title');
  });
}

async function navigate(){
  const hash = location.hash.replace(/^#/, '') || '/';
  let route = routes[hash] ? hash : '/';
  const el = document.getElementById('app');
  closeNavMenu();
  await ensureSettings(true);
  if (route === '/roses' && settingsCache.showRoses === false) return renderHiddenSection(el, settingsCache.rosesTitle || '18 Waltz of Flowers');
  if (route === '/candles' && settingsCache.showCandles === false) return renderHiddenSection(el, settingsCache.candlesTitle || '18 Circle of Light');
  if (route === '/treasures' && settingsCache.showTreasures === false) return renderHiddenSection(el, settingsCache.treasuresTitle || '18 Gifts of Grace');
  routes[route](el);
  // highlight nav
  $all('a[data-route]').forEach(a => {
    const active = a.getAttribute('href') === `#${route}`;
    a.classList.toggle('active', !!active);
  });
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  initFloatingElements();
  navigate();
});

function renderHome(el){
  const s = settingsCache || {};
  const title = s.title || "Nicoleen's 18th Birthday";
  const inviteHeading = s.inviteHeading || '';
  const debutantePhotoUrl = s.debutantePhotoUrl || '';
  const subtitle = s.subtitle || 'A Tangled-inspired debut celebration under floating lanterns.';
  const heroTitle = s.heroTitle || (title.endsWith("'s 18th Birthday") ? title.replace(/'s 18th Birthday$/, ' is Turning 18') : title);
  const heroTagline = inviteHeading || 'A Night of Light and Wonder';
  const heroSubtitle = s.heroSubtitle || 'Join us beneath floating lanterns for a whimsical formal celebration.';
  const date = s.date || 'Date TBD';
  const time = s.time || 'Time TBD';
  const venueName = s.venueName || 'Venue';
  const venueAddress = s.venueAddress || '';
  const rsvpBy = s.rsvpBy || '';
  const attireTitle = s.attireTitle || 'Attire';
  const attireImage = s.attireImage || '/attire.png';
  const attirePaletteImage = s.attirePaletteImage || '/color-palette.png';
  const giftNote = s.giftNote || '';
  const suggestedColors = s.suggestedColors || '';
  el.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <div class="hero-main">
          <div class="hero-tagline">${escapeHTML(heroTagline)}</div>
          <h1>${escapeHTML(heroTitle)}</h1>
          <p class="hero-subtitle">${escapeHTML(heroSubtitle)}</p>

          <div class="hero-details">
            <div class="hero-detail">
              <h3>DATE & VENUE</h3>
              <p>${escapeHTML(date)}</p>
              <p>${escapeHTML(venueName)}</p>
              ${venueAddress ? `<p class="detail-sub">${escapeHTML(venueAddress)}</p>` : ''}
            </div>
            <div class="hero-detail">
              <h3>RSVP DEADLINE</h3>
              <p>${rsvpBy || 'December 10, 2025'}</p>
              <p class="detail-sub">Strictly RSVP. We regret that we cannot accommodate walk-ins without an RSVP.: "No RSVP, no seat"</p>
            </div>
            <div class="hero-detail">
              <h3>THEME</h3>
              <p>Tangled / Whimsical Formal</p>
              <p class="detail-sub">Dreamy pastels • Lantern glow • Florals</p>
            </div>
          </div>
        </div>
        <div class="hero-rsvp">
          <a href="#/rsvp" class="cta-button">RSVP Now</a>
        </div>
      </div>
    </section>
    <section class="secondary-nav section-block">
      <div class="nav-cards">
        <div class="nav-card">
          <div class="nav-card-icon">📝</div>
          <div class="nav-card-title">RSVP</div>
          <p class="nav-card-desc">Let us know if you can join.</p>
          <a href="#/rsvp" class="nav-card-btn">Respond</a>
        </div>
        <div class="nav-card">
          <div class="nav-card-icon">📅</div>
          <div class="nav-card-title">Program</div>
          <p class="nav-card-desc">See the evening's flow.</p>
          <a href="#/program" class="nav-card-btn">View</a>
        </div>
        <div class="nav-card">
          <div class="nav-card-icon">📍</div>
          <div class="nav-card-title">Venue</div>
          <p class="nav-card-desc">Map and directions.</p>
          <a href="#/venue" class="nav-card-btn">Open</a>
        </div>
      </div>
    </section>
    <section class="section-block">
      <div class="section-title">The 18s</div>
      <div class="nav-cards eighteens-row">
        <div class="nav-card">
          <div class="nav-card-icon">🌸</div>
          <div class="nav-card-title">18 Waltz of Flowers</div>
          <p class="nav-card-desc">(The Traditional 18 Roses)</p>
          <a href="#/roses" class="nav-card-btn">View List</a>
        </div>
        <div class="nav-card">
          <div class="nav-card-icon">🕯️</div>
          <div class="nav-card-title">18 Circle of Light</div>
          <p class="nav-card-desc">(The 18 Lanterns)</p>
          <a href="#/candles" class="nav-card-btn">View List</a>
        </div>
        <div class="nav-card">
          <div class="nav-card-icon">🎁</div>
          <div class="nav-card-title">18 Gifts of Grace</div>
          <p class="nav-card-desc">(The 18 Treasures)</p>
          <a href="#/treasures" class="nav-card-btn">View List</a>
        </div>
        <div class="nav-card">
          <div class="nav-card-icon">🥂</div>
          <div class="nav-card-title">18 Cheers of Friendship</div>
          <p class="nav-card-desc">(The 18 Shots)</p>
          <a href="#/shots" class="nav-card-btn">View List</a>
        </div>
      </div>
    </section>
    <div class="divider section-block"><span class="line"></span><img src="/sun.svg" alt="divider"/><span class="line"></span></div>
    <section class="section-block attire-section">
      <div class="card callout">
        <div class="section-title">Attire/Theme: ${escapeHTML(attireTitle)}</div>
        <div class="attire-visual">
          <img class="attire-img" src="${escapeHTML(attireImage)}" alt="Suggested attire inspiration">
        </div>
        ${(suggestedColors || attirePaletteImage) ? `<div class="card-footer attire-palette">${suggestedColors ? `<div class="attire-palette-text">Suggested colors: ${escapeHTML(suggestedColors)}</div>` : ''}${attirePaletteImage ? `<img class="attire-palette-img" src="${escapeHTML(attirePaletteImage)}" alt="Suggested color palette">` : ''}</div>` : ''}
      </div>
      ${giftNote ? `<div class="gift-note-footer subtle">${escapeHTML(giftNote)}</div>` : ''}
    </section>
  `;
}

function renderRSVP(el){
  el.innerHTML = `
    <section class="card">
      <div class="section-title">RSVP</div>
      <p class="subtle">${settingsCache && settingsCache.rsvpBy ? `Please respond by ${escapeHTML(settingsCache.rsvpBy)}` : ''}</p>
      <form id="rsvpForm" class="mt-16">
        <div class="hp-field">
          <label for="hp">Website</label>
          <input type="text" id="hp" name="hp" autocomplete="off" tabindex="-1" />
        </div>
        <label for="name">Name <span class="pill">required</span></label>
        <input type="text" id="name" name="name" placeholder="Your full name" required />

        <label for="willAttend">Will you be attending?</label>
        <select id="willAttend" name="willAttend" class="select-wide">
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        <div id="guestsWrap" class="mt-16">
          <label for="guests">If yes, how many people (age 12+, including yourself)?</label>
          <select id="guests" name="guests" class="select-wide">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
          <label for="kids" class="mt-16">Number of kids (under 12)</label>
          <select id="kids" name="kids" class="select-wide">
            <option value="0" selected>0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <label for="comments" class="mt-16">Comments and/or questions</label>
        <textarea id="comments" name="comments" rows="3" placeholder="Optional"></textarea>

        <button class="mt-16" type="submit">Submit RSVP</button>
      </form>
      <div id="rsvpThanks" class="mt-16" style="display:none"></div>
      <div class="mt-24 contact-info">
        <div><strong>Need help with your RSVP?</strong></div>
        <div class="mt-8"><strong>Phone:</strong> <a href="tel:09156143858">09156143858</a> | <a href="tel:09060212223">09060212223</a></div>
        <div class="mt-4"><strong>Facebook:</strong> Ryan Oyie | Rhean Nicoleen Santos</div>
      </div>
    </section>
  `;
  const form = $('#rsvpForm');
  const thanks = $('#rsvpThanks');
  const attendSel = $('#willAttend');
  const guestsWrap = $('#guestsWrap');
  const kidsSel = $('#kids');
  let submitting = false;
  // Lock UI if past lock date
  const lock = settingsCache && settingsCache.rsvpLockDate && !isNaN(Date.parse(settingsCache.rsvpLockDate)) && Date.now() >= Date.parse(settingsCache.rsvpLockDate);
  if (lock) {
    form.style.display = 'none';
    thanks.style.display = 'block';
    thanks.innerHTML = `<div class="card"><strong>RSVP is now closed.</strong> We appreciate your understanding.</div>`;
    return;
  }
  attendSel.addEventListener('change', () => {
    const yes = attendSel.value === 'yes';
    guestsWrap.style.display = yes ? 'block' : 'none';
  });
  attendSel.dispatchEvent(new Event('change'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const now = Date.now();
    const last = Number(localStorage.getItem('rsvp_last_submit') || '0');
    if (submitting || now - last < 5000) { alert('Please wait a moment before submitting again.'); return; }
    submitting = true;
    const payload = {
      name: form.name.value.trim(),
      willAttend: form.willAttend.value === 'yes',
      guests: parseInt(form.guests.value, 10) || 1,
      kids: parseInt((kidsSel && kidsSel.value) || '0', 10) || 0,
      comments: form.comments.value.trim(),
      hp: (document.getElementById('hp').value || '').trim()
    };
    if (!payload.name){ alert('Name is required'); return; }
    try {
      const res = await fetch('/api/rsvp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok){ throw new Error(data.error || 'Failed to submit'); }
      form.reset();
      form.style.display = 'none';
      thanks.style.display = 'block';
      localStorage.setItem('rsvp_last_submit', String(now));
      const warn = data.warning ? `<div class="mt-16 warning">${escapeHTML(data.warning)}</div>` : '';
      thanks.innerHTML = `<div class="card"><strong>Thank you!</strong> Your response has been recorded.${warn}</div>`;
    } catch (err){
      alert('Error: ' + err.message);
    } finally { submitting = false; }
  });
}

async function renderProgram(el){
  const s = settingsCache || {};
  const entourage = s.entourageTitle || '';
  const anyHidden = (s.showRoses === false) || (s.showCandles === false) || (s.showTreasures === false);
  const chip = anyHidden ? `<span class="pill" style="margin-left:8px">Not yet announced</span>` : '';
  el.innerHTML = `<section class="card"><div class="section-title">Program ${chip}</div>${entourage?`<div class=\"mt-8 subtle\">${escapeHTML(entourage)}</div>`:''}<div id="programList" class="mt-16"></div></section>`;
  const listEl = $('#programList');
  try{
    const res = await fetch('/api/program');
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length){
      listEl.innerHTML = `<p class="subtle">Program details coming soon.</p>`;
      return;
    }
    listEl.innerHTML = `
      <table class="table">
        <thead><tr><th style="width:140px">Time</th><th>Activity</th><th>Notes</th></tr></thead>
        <tbody>
          ${items.map(it => `<tr><td class="muted">${escapeHTML(it.time||'')}</td><td>${escapeHTML(it.title||'')}</td><td class="subtle">${escapeHTML(it.notes||'')}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }catch(e){
    listEl.innerHTML = `<p class="subtle">Unable to load program.</p>`;
  }
}

function renderVenue(el){
  const s = settingsCache || {};
  const address = `${s.venueName || 'Venue'}${s.venueAddress ? ', ' + s.venueAddress : ''}`;
  const mapQuery = encodeURIComponent(s.mapQuery || address);
  const attireTitle = (settingsCache && settingsCache.attireTitle) || null;
  el.innerHTML = `
    <section class="grid cols-2">
      <div class="card">
        <div class="section-title">Venue</div>
        <p class="subtle">${address}</p>
        <p>Parking available on-site.</p>
        <p class="mt-16">We highly recommend booking an overnight room early; only a few rooms are available. You can contact the venue directly or let us help you secure discounted rates.</p>
        <ul class="list mt-16">
          <li><strong>Budget Standard Room</strong> (good for 4 pax) - PHP 3,500<br><span class="subtle">Separate bathrooms.</span></li>
          <li class="mt-8"><strong>Elegant Standard Room</strong> (4 rooms available, 4 pax each) - PHP 4,000 per room.</li>
          <li class="mt-8"><strong>Duplex Room</strong> (2 rooms available, 6 pax each) - PHP 6,000 per room.</li>
          <li class="mt-8"><strong>Family Room</strong> (2 rooms available, 8 pax each) - PHP 8,000 per room.</li>
          <li class="mt-8"><strong>Dormitory Room</strong> (good for 16 pax) - PHP 16,000<br><span class="subtle">Separate bathroom.</span></li>
        </ul>
        <p class="mt-16 subtle">No free breakfast included.</p>
        <p class="subtle">Check-in: 2:00 PM | Check-out: 12:00 NN the following day.</p>
      </div>
      <div class="card">
        <img src="/venue.jpg" alt="Venue photo" style="width:100%;border-radius:12px;object-fit:cover;max-height:320px" loading="lazy" />
        <iframe class="mt-16" title="Venue Map" width="100%" height="320" style="border:0;border-radius:12px" loading="lazy" allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${mapQuery}&output=embed"></iframe>
        <a class="btn mt-16" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}">Open in Google Maps</a>
      </div>
    </section>
  `;
}

async function renderParticipants(el, key, title, caption, captionClass){
  const heading = escapeHTML(title || '');
  const intro = caption ? `<p class="subtle mt-8 preline${captionClass ? ' ' + captionClass : ''}">${escapeHTML(caption)}</p>` : '';
  el.innerHTML = `
    <section class="card">
      <div class="section-title">${heading}</div>
      ${intro}
      <ul id="plist" class="list mt-16"></ul>
    </section>
  `;
  const listEl = $('#plist');
  try{
    const res = await fetch('/api/participants');
    const data = await res.json();
    const arr = Array.isArray(data[key]) ? data[key] : [];
    if (!arr.length){ listEl.innerHTML = `<li class="subtle">List coming soon.</li>`; return; }
    listEl.innerHTML = arr.map(p => participantItemHTML(p)).join('');
  }catch(e){
    listEl.innerHTML = `<li class="subtle">Unable to load participants.</li>`;
  }
}

function participantItemHTML(p){
  const name = escapeHTML(p.name || '');
  const role = p.role ? `<span class="pill" style="margin-left:6px">${escapeHTML(p.role)}</span>` : '';
  const msg = p.message ? `<div class="subtle mt-8">${escapeHTML(p.message)}</div>` : '';
  return `<li><strong>${name}</strong>${role}${msg}</li>`;
}

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function renderHiddenSection(el, title){
  const by = settingsCache && settingsCache.rsvpBy ? ` after ${escapeHTML(settingsCache.rsvpBy)}` : '';
  el.innerHTML = `
    <section class="card">
      <div class="section-title">${escapeHTML(title)} <span class="pill">Not yet announced</span></div>
      <p class="subtle">List will be updated${by}. Please check back later.</p>
    </section>
  `;
}
