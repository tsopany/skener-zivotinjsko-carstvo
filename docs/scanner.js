// Kod skener: runs on digitalni-album.igraoni.ca, loaded by the bookmarklet.
// Reads card codes with Claude using the user's OWN Anthropic API key (stored in localStorage only).
(() => {
  const ID = 'kod-skener';

  const old = document.getElementById(ID);
  if (old) { old.style.display = old.style.display === 'none' ? '' : 'none'; return; }

  // Works on any page of the album site: uses the page's code form if present,
  // otherwise posts to /codes with the CSRF token from the page's <meta name="csrf-token">.
  if (location.hostname !== 'digitalni-album.igraoni.ca') {
    alert('Kod skener radi samo na digitalni-album.igraoni.ca.');
    return;
  }
  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
  if (!document.querySelector('form[action*="code"]') && !csrf()) {
    alert('Kod skener: uloguj se na digitalni album pa probaj ponovo.');
    return;
  }

  // ---------- remembered submissions (best-effort) ----------
  const DONE_KEY = 'kodSkenerDone';
  const loadDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch { return {}; } };
  const saveDone = d => { try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch {} };
  const done = loadDone();

  // ---------- settings: user's own API key + model, kept only in this browser ----------
  const KEY_KEY = 'kodSkenerApiKey';
  const MODEL_KEY = 'kodSkenerModel';
  const getKey = () => { try { return localStorage.getItem(KEY_KEY) || ''; } catch { return ''; } };
  const getModel = () => { try { return localStorage.getItem(MODEL_KEY) || 'claude-haiku-5-5'; } catch { return 'claude-haiku-5-5'; } };

  // ---------- UI ----------
  const css = `
    #${ID}{position:fixed;right:12px;bottom:12px;z-index:99999;width:min(370px,calc(100vw - 24px));max-height:80vh;overflow:auto;
      background:linear-gradient(180deg,#1c2330 0%,#11161e 100%);color:#e7ecf2;border:1px solid rgba(231,236,242,.08);border-radius:14px;
      box-shadow:0 24px 60px rgba(0,0,0,.5),0 8px 20px rgba(0,0,0,.3);font:14px/1.5 Inter,system-ui,sans-serif;padding:14px;letter-spacing:-.005em}
    #${ID} *{box-sizing:border-box}
    #${ID} h3{margin:0 0 10px;font:400 19px/1.1 Fraunces,Georgia,serif;letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:center;color:#e7ecf2}
    #${ID} button{font:600 13px Inter,system-ui,sans-serif;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;background:#7cf5d4;color:#0a0d12;
      box-shadow:0 6px 20px rgba(124,245,212,.18),inset 0 1px 0 rgba(255,255,255,.4)}
    #${ID} button.sec{background:transparent;color:#e7ecf2;font-weight:500;border:1px solid rgba(231,236,242,.18);box-shadow:none}
    #${ID} button.sec:hover{border-color:rgba(231,236,242,.4);background:rgba(231,236,242,.04)}
    #${ID} button:disabled{opacity:.5;cursor:default}
    #${ID} .row{display:flex;gap:6px;align-items:center;margin:5px 0}
    #${ID} .row button.sec{padding:6px 10px}
    #${ID} input[type=text],#${ID} input[type=password],#${ID} select,#${ID} textarea{background:#0a0d12;color:#e7ecf2;border:1px solid rgba(231,236,242,.12);border-radius:8px}
    #${ID} .row input[type=text]{flex:1;min-width:0;font:14px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1px;padding:7px 8px;text-transform:uppercase}
    #${ID} .row input.bad{border-color:#ff6b6b;background:rgba(255,107,107,.08)}
    #${ID} .st{width:26px;text-align:center}
    #${ID} .row img{height:32px;border-radius:4px}
    #${ID} textarea{width:100%;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;min-height:48px;padding:8px;resize:vertical}
    #${ID} .msg{font-size:12.5px;color:#8a95a6;margin:6px 0}
    #${ID} .log{color:#7cf5d4}
    #${ID} .bar{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
    #${ID} video{width:100%;border-radius:10px;background:#000;display:block}
    #${ID} .cam{position:relative}
    #${ID} .cam.busy::after{content:'Čitam…';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(10,13,18,.45);color:#7cf5d4;font:500 15px Inter,system-ui,sans-serif;border-radius:10px;pointer-events:none}
    #${ID} .settings{background:rgba(10,13,18,.6);border:1px solid rgba(231,236,242,.06);border-radius:10px;padding:10px;margin-bottom:8px}
    #${ID} .settings input,#${ID} .settings select{width:100%;font:inherit;padding:7px 8px;margin:4px 0}`;
  if (!document.getElementById(ID + '-fonts')) {
    const f = document.createElement('link');
    f.id = ID + '-fonts';
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(f);
  }
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = ID;
  box.innerHTML = `
    <h3>📷 Kod skener <span><button class="sec" data-a="settings" title="Podešavanja">⚙️</button> <button class="sec" data-a="close">✕</button></span></h3>
    <div class="settings" hidden>
      <div class="msg">Tvoj Anthropic API ključ (console.anthropic.com). Čuva se samo u ovom browseru.</div>
      <input type="password" class="key" placeholder="sk-ant-..." autocomplete="off">
      <select class="model">
        <option value="claude-haiku-5-5">Haiku (jeftinije)</option>
        <option value="claude-sonnet-5-5">Sonnet (preciznije)</option>
      </select>
      <div class="bar"><button data-a="savekey">Sačuvaj</button><button class="sec" data-a="forgetkey">Obriši ključ</button></div>
    </div>
    <div class="bar">
      <button data-a="photo">📁 Učitaj sliku</button>
      <button data-a="cam">🎥 Kamera</button>
      <button class="sec" data-a="reload">↻ Osveži album</button>
    </div>
    <input type="file" accept="image/*" multiple hidden>
    <div class="cam" hidden>
      <video playsinline muted></video>
      <div class="bar"><button data-a="snap">📸 Snimi</button><button class="sec" data-a="camoff">Zatvori kameru</button></div>
    </div>
    <div class="msg">Učitaj sliku ili uključi kameru. 1–4 kartice po slici, izbliza i oštro.</div>
    <div class="list"></div>
    <textarea placeholder="…ili nalepi kodove ovde (jedan po redu)"></textarea>
    <div class="bar">
      <button class="sec" data-a="add">+ Dodaj iz teksta</button>
      <button data-a="send">Pošalji sve</button>
    </div>
    <div class="msg log"></div>`;
  document.body.appendChild(box);

  const $ = s => box.querySelector(s);
  const fileInput = $('input[type=file]');
  const list = $('.list');
  const log = t => { $('.log').textContent = t; };

  function showSettings(show) {
    const el = $('.settings');
    el.hidden = !show;
    if (show) { $('.key').value = getKey(); $('.model').value = getModel(); $('.key').focus(); }
  }

  const norm = c => c.toUpperCase().replace(/Ø/g, '0').replace(/[^0-9A-Z?]/g, '');
  const valid = c => /^[0-9A-Z]{11}$/.test(c);

  function addCode(raw) {
    const code = norm(raw);
    if (!code) return;
    if ([...list.querySelectorAll('input')].some(i => norm(i.value) === code)) return;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<input type="text" maxlength="11" spellcheck="false" autocomplete="off"><span class="st"></span><button class="sec" title="Ukloni">✕</button>`;
    const inp = row.querySelector('input');
    const st = row.querySelector('.st');
    inp.value = code;
    const check = () => {
      inp.classList.toggle('bad', !valid(norm(inp.value)));
      if (done[norm(inp.value)]) st.textContent = '✔︎';
    };
    inp.addEventListener('input', () => { st.textContent = ''; check(); });
    row.querySelector('button').onclick = () => row.remove();
    check();
    if (done[code]) st.title = 'Već poslat ranije';
    list.appendChild(row);
  }

  // ---------- photo -> codes ----------
  async function toJpegBase64(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const max = 2000;
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }

  async function readPhoto(file) {
    return readImage(await toJpegBase64(file));
  }

  // ---------- live camera (laptop webcam) ----------
  const camBox = $('.cam');
  const video = $('video');
  let stream = null;

  async function camOn() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' },
        audio: false,
      });
    } catch (e) { log('Kamera nije dostupna: ' + e.message); return; }
    video.srcObject = stream;
    await video.play();
    camBox.hidden = false;
    log('Drži karticu 15–25 cm od kamere, kod okrenut ka kameri, pa Snimi.');
  }

  function camOff() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    camBox.hidden = true;
  }

  async function snap(btn) {
    if (!stream) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    btn.disabled = true;
    video.pause();                       // freeze on the captured frame while it's being read
    camBox.classList.add('busy');
    log('Čitam…');
    try {
      const codes = await readImage(c.toDataURL('image/jpeg', 0.92).split(',')[1]);
      codes.forEach(addCode);
      log(codes.length ? `Pročitano: ${codes.join(', ')}` : 'Nijedan kod. Približi karticu ili pojačaj svetlo.');
    } catch (e) { log('Greška: ' + e.message); }
    camBox.classList.remove('busy');
    if (stream) video.play().catch(() => {});
    btn.disabled = false;
  }

  // ---------- Claude API, called directly from the browser with the user's own key ----------
  const PROMPT = `This photo shows one or more cards. Each card has a code printed in a dot-matrix font.
Cards may be upside down or rotated. Each code is exactly 11 characters, using only digits 0-9 and uppercase letters A-Z.
Zero is printed with a slash through it: output it as 0. Read each code carefully, one character at a time.
If a character is unreadable, put ? in its place.
Reply with JSON only, no other text: {"codes":["..."]}`;

  function extractCodes(text) {
    let found = [];
    try { found = JSON.parse(text.match(/\{[\s\S]*\}/)[0]).codes || []; } catch {}
    if (!found.length) found = text.toUpperCase().match(/\b[0-9A-Z?Ø]{11}\b/g) || [];
    const clean = found
      .map(c => String(c).toUpperCase().replace(/Ø/g, '0').replace(/[^0-9A-Z?]/g, ''))
      .filter(c => c.length === 11);
    return [...new Set(clean)];
  }

  async function readImage(image) {
    const key = getKey();
    if (!key) { showSettings(true); throw new Error('Unesi svoj Anthropic API ključ (⚙️).'); }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { showSettings(true); throw new Error('API ključ nije ispravan.'); }
    if (!r.ok) throw new Error(data.error?.message || 'HTTP ' + r.status);
    return extractCodes((data.content || []).map(c => c.text || '').join(''));
  }

  fileInput.onchange = async () => {
    const files = [...fileInput.files];
    fileInput.value = '';
    let found = 0;
    for (const [i, f] of files.entries()) {
      log(`Čitam sliku ${i + 1}/${files.length}…`);
      try {
        const codes = await readPhoto(f);
        codes.forEach(addCode);
        found += codes.length;
      } catch (e) { log('Greška: ' + e.message); return; }
    }
    log(found ? `Pročitano kodova: ${found}. Proveri ih (crveno = nečitko), pa Pošalji sve.` : 'Nijedan kod nije pronađen. Probaj bliže i oštrije.');
  };

  // ---------- submit ----------
  async function submitOne(code) {
    const form = document.querySelector('form[action*="code"]');
    let fd, action;
    if (form) {
      fd = new FormData(form);
      action = form.action;
    } else {
      fd = new FormData();
      fd.set('utf8', '✓');
      fd.set('authenticity_token', csrf());
      fd.set('commit', 'Pošalji');
      action = '/codes';
    }
    fd.set('code', code);
    const js = await (await fetch(action, {
      method: 'POST', body: fd, credentials: 'same-origin',
      headers: { Accept: 'text/javascript', 'X-Requested-With': 'XMLHttpRequest' },
    })).text();
    const pic = (js.match(/src=\\?"([^"\\]+)/) || [])[1] || '';
    return { ok: js.includes('success-message'), pic };
  }

  async function sendAll(btn) {
    const rows = [...list.querySelectorAll('.row')];
    btn.disabled = true;
    let ok = 0, bad = 0;
    for (const row of rows) {
      const inp = row.querySelector('input');
      const st = row.querySelector('.st');
      const code = norm(inp.value);
      if (st.textContent === '✅' || st.textContent === '❌') continue;
      if (!valid(code)) { st.textContent = '⚠️'; continue; }
      st.textContent = '⏳';
      try {
        const res = await submitOne(code);
        st.textContent = res.ok ? '✅' : '❌';
        if (res.ok) {
          ok++;
          done[code] = Date.now();
          saveDone(done);
          if (res.pic) { const img = document.createElement('img'); img.src = res.pic; row.insertBefore(img, row.lastChild); }
        } else bad++;
      } catch { st.textContent = '⚠️'; }
      await new Promise(r => setTimeout(r, 800));
    }
    btn.disabled = false;
    log(`Gotovo: ✅ ${ok}  ❌ ${bad}. ❌ = sajt kaže "Kod nije ispravno upisan" — proveri slova i pošalji ponovo.`);
  }

  box.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'settings') showSettings($('.settings').hidden);
    if (a === 'savekey') {
      const k = $('.key').value.trim();
      try { localStorage.setItem(KEY_KEY, k); localStorage.setItem(MODEL_KEY, $('.model').value); } catch {}
      showSettings(false);
      log(k ? 'Ključ sačuvan.' : 'Ključ je prazan.');
    }
    if (a === 'forgetkey') {
      try { localStorage.removeItem(KEY_KEY); } catch {}
      $('.key').value = '';
      log('Ključ obrisan iz ovog browsera.');
    }
    if (a === 'close') { camOff(); box.style.display = 'none'; }
    if (a === 'cam') {
      if (!getKey()) { showSettings(true); log('Prvo unesi svoj Anthropic API ključ.'); return; }
      stream ? camOff() : camOn();
    }
    if (a === 'camoff') camOff();
    if (a === 'snap') snap(e.target);
    if (a === 'photo') {
      if (!getKey()) { showSettings(true); log('Prvo unesi svoj Anthropic API ključ.'); return; }
      fileInput.click();
    }
    if (a === 'reload') location.reload();
    if (a === 'add') { $('textarea').value.split(/[\s,;]+/).forEach(addCode); $('textarea').value = ''; }
    if (a === 'send') sendAll(e.target);
  });
  if (!getKey()) { showSettings(true); log('Prvi put: unesi svoj Anthropic API ključ.'); }
})();
