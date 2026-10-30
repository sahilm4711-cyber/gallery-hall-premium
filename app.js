// Gallery Hall — Premium, For Two
// Private, device-local build. No account, no server, no tracking.
// Photos and settings live in this browser (localStorage) unless you export them.
const KEY = 'gallery-hall-premium-v1';
const DEFAULTS = {
  a: '', b: '', dedication: 'Every wall here is a memory. Every memory is you.',
  date: '', theme: 'gold', photos: [], passcode: null,
  avatar: { skin: '#e8c39a', hair: 'short', hairColor: '#2b2118', top: '#222222', trousers: '#e8ddc9' }
};
let state = load();
let scene, camera, renderer, galleryGroup, partnerMesh, playerMesh;
let player = { x: 0, z: 7, yaw: Math.PI, pitch: 0 }; // facing north (-z)
let keys = {}, sitting = false, firstPerson = false, targetWalk = null;
let frameMeshes = [], benchMeshes = [], plaqueMesh = null, screenMesh = null;
let channel = null, musicOn = false, musicTimer = null, audioCtx = null;
let myName = '';

function load() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { return Object.assign({}, DEFAULTS); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Storage is full — remove a large photo and try again.'); } }
function $(id) { return document.getElementById(id); }
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 3500);
}
function names() {
  const a = (state.a || '').trim(), b = (state.b || '').trim();
  if (a && b) return a + ' ♥ ' + b;
  if (a || b) return (a || b) + ' ♥ Gallery Hall';
  return 'Gallery Hall';
}
function show(el, yes) { el.hidden = !yes; }

// ---------- Lock ----------
function initLock() {
  const lock = $('lock-screen');
  $('lock-mode-text').textContent = state.passcode
    ? 'Enter your hall passcode.'
    : 'Set a passcode for your hall (4 or more characters).';
  $('lock-btn').textContent = state.passcode ? 'Unlock Hall' : 'Set Passcode & Enter';
  show(lock, true);
  $('lock-input').focus();
  $('lock-btn').onclick = () => {
    const v = $('lock-input').value;
    if (!state.passcode) {
      if (v.length < 4) return toast('Choose a passcode of 4 or more characters.');
      state.passcode = v; save(); show(lock, false); toast('Passcode set. Welcome to your hall.');
    } else if (v === state.passcode) {
      show(lock, false);
    } else toast('That passcode does not match. Try again.');
    $('lock-input').value = '';
  };
  $('lock-input').onkeydown = e => { if (e.key === 'Enter') $('lock-btn').click(); };
  $('lock-reset').onclick = () => {
    if (confirm('Start fresh? This clears names, dedication, photos and passcode on this device.')) {
      localStorage.removeItem(KEY); location.reload();
    }
  };
  $('btn-lock').onclick = () => { show(lock, true); $('lock-input').focus(); };
}

// ---------- Settings / stats ----------
function refreshSettingsUI() {
  $('in-a').value = state.a; $('in-b').value = state.b;
  $('in-dedication').value = state.dedication; $('in-date').value = state.date || '';
  $('in-theme').value = state.theme;
  const av = Object.assign({}, DEFAULTS.avatar, state.avatar || {});
  state.avatar = av;
  $('in-skin').value = av.skin; $('in-hair').value = av.hair;
  $('in-haircolor').value = av.hairColor; $('in-top').value = av.top;
  $('in-trousers').value = av.trousers;
  document.body.dataset.theme = state.theme;
  $('brand-names').textContent = names();
  $('hud-title').textContent = (state.a && state.b)
    ? 'Welcome, ' + state.a + ' & ' + state.b
    : 'Welcome to your hall — add your names on the left.';
  $('dedication-for').textContent = state.b ? 'For ' + state.b : 'For your beloved';
  $('dedication-text').textContent = state.dedication;
  $('dedication-sign').textContent = state.a ? 'Always yours, ' + state.a : 'Always yours';
  myName = (state.a || 'Guest').trim() || 'Guest';
  updateStats(); renderPhotoList();
}
function updateStats() {
  if (!state.date) { $('stat-days').textContent = '—'; $('stat-next').textContent = '—'; return; }
  const start = new Date(state.date + 'T00:00:00'), now = new Date();
  const days = Math.max(0, Math.floor((now - start) / 86400000));
  $('stat-days').textContent = days;
  let next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
  if (next < now) next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
  $('stat-next').textContent = Math.ceil((next - now) / 86400000);
}
function renderPhotoList() {
  const list = $('photo-list'); list.innerHTML = '';
  state.photos.forEach((p, i) => {
    const img = document.createElement('img'); img.src = p.src; img.alt = p.title || ('Photo ' + (i + 1));
    img.title = (i === 0 ? 'Centerpiece — ' : '') + (p.title || ('Photo ' + (i + 1))) + ' (click to make centerpiece)';
    img.onclick = () => { const p0 = state.photos.splice(i, 1)[0]; state.photos.unshift(p0); save(); buildGallery(); renderPhotoList(); toast('Centerpiece updated.'); };
    list.appendChild(img);
  });
  if (!state.photos.length) list.innerHTML = '<p class="panel-sub">No photos yet — your hall shows elegant placeholders until you upload your own.</p>';
}
function bindSettings() {
  const sync = () => {
    state.a = $('in-a').value; state.b = $('in-b').value;
    state.dedication = $('in-dedication').value; state.date = $('in-date').value;
    state.theme = $('in-theme').value;
    state.avatar = {
      skin: $('in-skin').value, hair: $('in-hair').value, hairColor: $('in-haircolor').value,
      top: $('in-top').value, trousers: $('in-trousers').value
    };
    save(); refreshSettingsUI(); buildGallery();
  };
  ['in-a', 'in-b', 'in-dedication', 'in-date', 'in-theme', 'in-skin', 'in-hair', 'in-haircolor', 'in-top', 'in-trousers'].forEach(id => $(id).addEventListener('input', sync));
  $('photo-upload').addEventListener('change', e => {
    const files = Array.from(e.target.files || []).slice(0, 12 - state.photos.length);
    if (!files.length) return toast('Photo limit reached (12). Remove one first.');
    let done = 0;
    files.forEach(f => {
      const r = new FileReader();
      r.onload = () => { state.photos.push({ src: r.result, title: f.name.replace(/\.[^.]+$/, '') }); if (++done === files.length) { save(); refreshSettingsUI(); buildGallery(); toast('Photos added to your hall.'); } };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  });
  $('btn-clear-photos').onclick = () => { state.photos = []; save(); refreshSettingsUI(); buildGallery(); };
  $('btn-copy-link').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Hall link copied — share it only with your partner.'); }
    catch (e) { toast('Copy this address from your browser bar: ' + location.href); }
  };
  $('btn-export').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gallery-hall.json'; a.click();
  };
  $('import-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); state = Object.assign({}, DEFAULTS, d); save(); refreshSettingsUI(); buildGallery(); toast('Hall imported.'); } catch (err) { toast('That file is not a valid hall export.'); } };
    r.readAsText(f);
  });
}

// ---------- Chat / presence ----------
function initChannel() {
  try { channel = new BroadcastChannel('gallery-hall-premium'); } catch (e) { return; }
  channel.onmessage = ev => {
    const m = ev.data || {};
    if (m.type === 'pos' && m.name !== myName) {
      if (partnerMesh) { partnerMesh.position.x = m.x; partnerMesh.position.z = m.z; partnerMesh.rotation.y = m.yaw; }
      $('presence').textContent = m.name + ' is inside ♥';
    }
    if (m.type === 'chat' && m.name !== myName) addChat(m.name, m.text);
    if (m.type === 'emote' && m.name !== myName) toast(m.name + ' sent ' + m.emote);
  };
  setInterval(() => {
    if (channel && !sitting) channel.postMessage({ type: 'pos', name: myName, x: player.x, z: player.z, yaw: player.yaw });
  }, 500);
}
function addChat(name, text) {
  const p = document.createElement('p'); p.innerHTML = '<strong>' + escapeHtml(name) + ':</strong> ' + escapeHtml(text);
  $('chat-log').appendChild(p); $('chat-log').scrollTop = 99999;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function bindChat() {
  $('btn-chat').onclick = () => show($('chat-drawer'), $('chat-drawer').hidden);
  $('chat-close').onclick = () => show($('chat-drawer'), false);
  $('chat-form').onsubmit = e => {
    e.preventDefault(); const v = $('chat-input').value.trim(); if (!v) return;
    addChat(myName, v); if (channel) channel.postMessage({ type: 'chat', name: myName, text: v });
    $('chat-input').value = '';
  };
  document.querySelectorAll('[data-emote]').forEach(b => b.onclick = () => {
    toast('You sent ' + b.dataset.emote);
    if (channel) channel.postMessage({ type: 'emote', name: myName, emote: b.dataset.emote });
  });
}

// ---------- Music (gentle synth, device only) ----------
function toggleMusic() {
  musicOn = !musicOn; $('btn-music').textContent = '♪ Music: ' + (musicOn ? 'On' : 'Off');
  if (!musicOn) { clearInterval(musicTimer); return; }
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6];
    let i = 0;
    const play = () => {
      if (!musicOn) return;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = notes[i++ % notes.length];
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.2);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 2.4);
    };
    play(); musicTimer = setInterval(play, 2400);
  } catch (e) { toast('Audio is not available in this browser.'); }
}

// ---------- 3D museum (Giftvera "Our Museum" style: bright white-box, black ceiling) ----------
function placeholderTexture(title, caption) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = '#f5f3ee'; x.fillRect(0, 0, 512, 384);
  x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(14, 14, 484, 356);
  x.fillStyle = '#111'; x.font = '72px serif'; x.textAlign = 'center'; x.fillText('♥', 256, 140);
  x.fillStyle = '#222'; x.font = 'bold 30px system-ui'; x.fillText(title, 256, 210, 460);
  x.fillStyle = '#666'; x.font = '20px system-ui'; x.fillText(caption || 'A memory, beautifully framed.', 256, 250, 460);
  return new THREE.CanvasTexture(c);
}
function frameTexture(photo, title, caption) {
  if (photo && photo.src) {
    try { const t = new THREE.TextureLoader().load(photo.src); t.encoding = THREE.sRGBEncoding; return t; } catch (e) {}
  }
  return placeholderTexture(title, caption);
}
function makeFrame(slot, w, h, x, y, z, ry, title, caption, photo) {
  const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = ry;
  // Thin black frame + white mat, Giftvera style
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.08, h + 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mat.position.z = 0.045;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: frameTexture(photo, title, caption) }));
  art.position.z = 0.06; art.userData = { kind: 'photo', title, caption, photo };
  const spot = new THREE.SpotLight(0xffffff, 0.9, 12, 0.6, 0.5); spot.position.set(0, 2.5, 1.5); spot.target = art;
  group.add(frame, mat, art, spot, spot.target);
  frameMeshes.push(art);
  return group;
}
function makeBench(x, z, ry) {
  // Low light-wood bench with black legs, no back — the film-area bench
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const wood = new THREE.MeshStandardMaterial({ color: 0xd9c49a, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.7), wood); seat.position.y = 0.5;
  seat.userData = { kind: 'bench' };
  benchMeshes.push(seat); g.add(seat);
  [-1.05, 1.05].forEach(dx => [-0.25, 0.25].forEach(dz => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), dark);
    leg.position.set(dx, 0.25, dz); g.add(leg);
  }));
  return g;
}
function makeNameSprite(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.65)';
  x.fillRect(28, 8, 200, 48);
  x.fillStyle = '#fff'; x.font = 'bold 26px system-ui'; x.textAlign = 'center'; x.fillText(text, 128, 42);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sp.scale.set(1.7, 0.42, 1); sp.position.y = 2.25;
  return sp;
}
// Simple doll-like third-person avatar, Giftvera style: head, hair, top, trousers, shoes
function makeAvatar(av, name) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(av.skin) });
  const hairM = new THREE.MeshStandardMaterial({ color: new THREE.Color(av.hairColor) });
  const topM = new THREE.MeshStandardMaterial({ color: new THREE.Color(av.top) });
  const trM = new THREE.MeshStandardMaterial({ color: new THREE.Color(av.trousers) });
  const shoeM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 20), skin); head.position.y = 1.58; g.add(head);
  if (av.hair === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
    cap.position.y = 1.62; g.add(cap);
    const fall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.12), hairM);
    fall.position.set(0, 1.35, -0.24); g.add(fall);
  } else if (av.hair === 'curly') {
    for (let i = 0; i < 7; i++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), hairM);
      const a = (i / 7) * Math.PI * 2;
      curl.position.set(Math.cos(a) * 0.2, 1.78 + (i % 2) * 0.05, Math.sin(a) * 0.2); g.add(curl);
    }
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM);
    cap.position.y = 1.6; g.add(cap);
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.95, 16), topM); body.position.y = 0.9; g.add(body);
  [-0.2, 0.2].forEach(dx => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 10), topM);
    arm.position.set(dx * 2.1, 0.9, 0); g.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), trM);
    leg.position.set(dx, 0.25, 0); g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.28), shoeM);
    shoe.position.set(dx, 0.045, 0.04); g.add(shoe);
  });
  if (name) g.add(makeNameSprite(name));
  return g;
}
function buildGallery() {
  if (!scene) return;
  if (galleryGroup) { scene.remove(galleryGroup); }
  galleryGroup = new THREE.Group(); frameMeshes = []; benchMeshes = [];
  const slots = [
    { title: 'The Centerpiece', caption: state.dedication },
    { title: 'First Memory', caption: 'Where it all began.' },
    { title: 'A Laugh', caption: 'The kind you remember.' },
    { title: 'Together', caption: 'Side by side, always.' },
    { title: 'A Quiet Day', caption: 'Ordinary, and perfect.' },
    { title: 'East Gallery', caption: 'Every word, from the heart.' },
    { title: 'Adventures', caption: 'More to come.' },
    { title: 'Us', caption: names() },
    { title: 'West Wing', caption: 'Still to be filled.' },
    { title: 'A Favourite', caption: 'Kept close.' },
    { title: 'Forever Frame', caption: 'Still to be filled.' },
    { title: 'And More', caption: 'The story continues.' }
  ];
  const photos = state.photos;
  // Centerpiece: tall freestanding black wall on a wide white platform
  const cpWall = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.4, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  cpWall.position.set(0, 2.2, -6); galleryGroup.add(cpWall);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  platform.position.set(0, 0.125, -6); galleryGroup.add(platform);
  galleryGroup.add(makeFrame('centerpiece', 3.2, 2.3, 0, 2.35, -5.8, 0, slots[0].title, slots[0].caption, photos[0]));
  // Dedication plaque on a white plinth in front of the centerpiece
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.05, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  plinth.position.set(0, 0.525, -4.3); galleryGroup.add(plinth);
  const pc = document.createElement('canvas'); pc.width = 1024; pc.height = 512; const px = pc.getContext('2d');
  px.fillStyle = '#111111'; px.fillRect(0, 0, 1024, 512);
  px.fillStyle = '#bbbbbb'; px.textAlign = 'center';
  px.font = '28px system-ui'; px.fillText('A PERMANENT COLLECTION', 512, 90);
  px.font = 'bold 44px serif'; px.fillStyle = '#f5f3ee'; px.fillText(state.b ? 'For ' + state.b : 'For your beloved', 512, 180);
  px.font = '30px system-ui'; px.fillStyle = '#e8e4dc';
  const words = (state.dedication || '').match(/.{1,38}(\s|$)/g) || [''];
  words.slice(0, 4).forEach((line, i) => px.fillText(line.trim(), 512, 250 + i * 42));
  px.fillStyle = '#f5f3ee'; px.font = 'italic 32px serif'; px.fillText(state.a ? 'Always yours, ' + state.a : 'Always yours', 512, 450);
  plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc) }));
  plaqueMesh.position.set(0, 0.95, -4.06); plaqueMesh.userData = { kind: 'plaque' };
  galleryGroup.add(plaqueMesh);
  // Side frames, single row at eye level: north wall, east + west wings
  const north = [[-13, slots[1]], [-9, slots[2]], [9, slots[3]], [13, slots[4]]];
  const east = [[-1, slots[5]], [3, slots[6]], [7, slots[7]]];
  const west = [[-7, slots[8]], [-2, slots[9]], [3, slots[10]], [8, slots[11]]];
  north.forEach(([x, s], i) => galleryGroup.add(makeFrame('n' + i, 2.2, 1.6, x, 1.7, -9.85, 0, s.title, s.caption, photos[1 + i])));
  east.forEach(([z, s], i) => galleryGroup.add(makeFrame('e' + i, 2.2, 1.6, 21.85, 1.7, z, -Math.PI / 2, s.title, s.caption, photos[5 + i])));
  west.forEach(([z, s], i) => galleryGroup.add(makeFrame('w' + i, 2.2, 1.6, -21.85, 1.7, z, Math.PI / 2, s.title, s.caption, photos[8 + i])));
  // Film screen (east wall) with a thin black frame
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 4.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
  screenFrame.position.set(21.85, 2.4, -7); galleryGroup.add(screenFrame);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.5),
    new THREE.MeshBasicMaterial({ map: placeholderTexture('Our Film', names()) }));
  screen.position.set(21.8, 2.4, -7); screen.rotation.y = -Math.PI / 2; screen.userData = { kind: 'screen' };
  screenMesh = screen; galleryGroup.add(screen);
  galleryGroup.add(makeBench(20.0, -7, Math.PI / 2), makeBench(-4.5, -1.5, 0));
  // Partner avatar, standing nearby
  partnerMesh = makeAvatar({ skin: '#e8c39a', hair: 'long', hairColor: '#1a1a1a', top: '#e8ddc9', trousers: '#222222' }, state.b || 'Partner');
  partnerMesh.position.set(2.2, 0, 4.5); galleryGroup.add(partnerMesh);
  scene.add(galleryGroup);
  // Your own avatar (third-person, walks with you)
  if (playerMesh) scene.remove(playerMesh);
  playerMesh = makeAvatar(state.avatar, myName);
  playerMesh.position.set(player.x, 0, player.z);
  scene.add(playerMesh);
}
function init3D() {
  if (typeof THREE === 'undefined') { show($('scene-error'), true); return; }
  const wrap = $('scene-wrap');
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xeceae4); scene.fog = new THREE.Fog(0xeceae4, 24, 60);
  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const resize = () => {
    const w = wrap.clientWidth || 800, h = wrap.clientHeight || 500;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); addEventListener('resize', resize);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  // Pale large-tile floor with a subtle grout grid
  const tileC = document.createElement('canvas'); tileC.width = tileC.height = 256;
  const tx = tileC.getContext('2d');
  tx.fillStyle = '#efece6'; tx.fillRect(0, 0, 256, 256);
  tx.strokeStyle = '#d8d4cc'; tx.lineWidth = 3; tx.strokeRect(0, 0, 256, 256);
  const tileTex = new THREE.CanvasTexture(tileC);
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(22, 11);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 22),
    new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.4 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.9 });
  const mkWall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); };
  mkWall(44, 6, 0, 3, -10, 0); mkWall(44, 6, 0, 3, 10, Math.PI);
  mkWall(22, 6, -22, 3, 0, Math.PI / 2); mkWall(22, 6, 22, 3, 0, -Math.PI / 2);
  // Dark flat ceiling + black track-light bars
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(44, 22),
    new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 6; scene.add(ceil);
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
  [-5, 0, 5].forEach(z => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(30, 0.08, 0.15), trackMat);
    bar.position.set(0, 5.9, z); scene.add(bar);
  });
  // Classical entrance at the south end: white-stone columns, steps, wooden double doors
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.8 });
  [-9, -3, 3, 9].forEach(x => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 5.4, 16), stoneMat);
    col.position.set(x, 2.7, 8.2); scene.add(col);
  });
  [0.12, 0.24, 0.36].forEach((h, i) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(7, h, 0.6), stoneMat);
    step.position.set(0, h / 2, 9.2 - i * 0.3); scene.add(step);
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 });
  [-0.68, 0.68].forEach(x => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 0.15), doorMat);
    door.position.set(x, 1.6, 9.9); scene.add(door);
  });
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 128;
  const sx2 = signC.getContext('2d');
  sx2.fillStyle = '#f5f3ee'; sx2.fillRect(0, 0, 1024, 128);
  sx2.fillStyle = '#222'; sx2.font = 'bold 64px serif'; sx2.textAlign = 'center'; sx2.fillText('Our Museum', 512, 84);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signC) }));
  sign.position.set(0, 4.4, 9.85); sign.rotation.y = Math.PI; scene.add(sign);
  // Soft neutral lights
  [-12, 0, 12].forEach(x => {
    const light = new THREE.PointLight(0xffffff, 0.5, 20); light.position.set(x, 5, 0); scene.add(light);
  });
  buildGallery();
  // Drag to look
  let dragging = false, lx = 0, ly = 0;
  const cv = $('scene');
  cv.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; });
  addEventListener('pointerup', () => dragging = false);
  addEventListener('pointermove', e => {
    if (!dragging) return;
    player.yaw -= (e.clientX - lx) * 0.005; player.pitch = Math.max(-0.9, Math.min(0.9, player.pitch - (e.clientY - ly) * 0.005));
    lx = e.clientX; ly = e.clientY;
  });
  // Click: photo / plaque / bench / floor-walk
  cv.addEventListener('click', e => {
    if (Math.abs(e.movementX || 0) > 2) return;
    const r = cv.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects([...frameMeshes, plaqueMesh, ...benchMeshes, screenMesh].filter(Boolean), false);
    if (!hits.length) {
      const fh = ray.intersectObject(floor, false);
      if (fh.length) targetWalk = { x: fh[0].point.x, z: fh[0].point.z };
      return;
    }
    const d = hits[0].object.userData;
    if (d.kind === 'photo') openPhoto(d);
    else if (d.kind === 'plaque') show($('dedication-modal'), true);
    else if (d.kind === 'bench') sit();
    else if (d.kind === 'screen') toast('Cinema: your photos play here — upload photos, then click any frame to view it big.');
  });
  addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'e') nearBench() && sit(); });
  addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  bindJoystick(); animate();
}
function nearBench() {
  return benchMeshes.some(b => {
    const p = new THREE.Vector3(); b.getWorldPosition(p); return Math.hypot(p.x - player.x, p.z - player.z) < 2.5;
  });
}
function sit() { sitting = true; toast('Sitting down. Press any movement key to stand up.'); }
function openPhoto(d) {
  $('modal-img').src = (d.photo && d.photo.src) || '';
  if (!d.photo) { $('modal-img').style.display = 'none'; } else $('modal-img').style.display = 'block';
  $('modal-title').textContent = d.title; $('modal-caption').textContent = d.caption || '';
  show($('photo-modal'), true);
}
function bindJoystick() {
  const joy = $('joystick'), stick = $('stick'); let active = false, joyVec = { x: 0, y: 0 };
  const move = e => {
    const t = e.touches ? e.touches[0] : e; const r = joy.getBoundingClientRect();
    let dx = (t.clientX - (r.left + r.width / 2)) / 40, dy = (t.clientY - (r.top + r.height / 2)) / 40;
    const len = Math.hypot(dx, dy) || 1; if (len > 1) { dx /= len; dy /= len; }
    joyVec = { x: dx, y: dy }; stick.style.transform = 'translate(' + (dx * 28) + 'px,' + (dy * 28) + 'px)';
  };
  joy.addEventListener('touchstart', e => { active = true; move(e); e.preventDefault(); }, { passive: false });
  joy.addEventListener('touchmove', e => { if (active) move(e); e.preventDefault(); }, { passive: false });
  joy.addEventListener('touchend', () => { active = false; joyVec = { x: 0, y: 0 }; stick.style.transform = ''; });
  joy._vec = joyVec; joy._get = () => joyVec;
}
function animate() {
  requestAnimationFrame(animate);
  const speed = 0.09, fwd = (keys['w'] || keys['arrowup']) ? 1 : (keys['s'] || keys['arrowdown']) ? -1 : 0;
  const strafe = (keys['d'] || keys['arrowright']) ? 1 : (keys['a'] || keys['arrowleft']) ? -1 : 0;
  const joy = $('joystick')._get ? $('joystick')._get() : { x: 0, y: 0 };
  const jF = -joy.y, jS = joy.x;
  if (fwd || strafe || jF || jS) sitting = false;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const sx = Math.cos(player.yaw), sz = -Math.sin(player.yaw);
  player.x += (fx * (fwd + jF) + sx * (strafe + jS)) * speed;
  player.z += (fz * (fwd + jF) + sz * (strafe + jS)) * speed;
  if (targetWalk) {
    const dx = targetWalk.x - player.x, dz = targetWalk.z - player.z, d = Math.hypot(dx, dz);
    if (d < 0.2) targetWalk = null; else { player.x += dx / d * speed; player.z += dz / d * speed; }
  }
  player.x = Math.max(-21, Math.min(21, player.x)); player.z = Math.max(-9, Math.min(9, player.z));
  if (playerMesh) {
    playerMesh.position.set(player.x, 0, player.z);
    playerMesh.rotation.y = Math.atan2(fx, fz);
    playerMesh.visible = !firstPerson && !sitting;
  }
  if (sitting) {
    camera.position.set(player.x, 1.1, player.z);
    camera.lookAt(player.x + fx, 1.4, player.z + fz);
  } else if (firstPerson) {
    camera.position.set(player.x, 1.7, player.z);
    camera.lookAt(player.x + fx * 5, 1.7 + player.pitch * 3, player.z + fz * 5);
  } else {
    const bx = player.x - fx * 4.5, bz = player.z - fz * 4.5;
    camera.position.set(bx, 3.1, bz);
    camera.lookAt(player.x, 1.6, player.z);
  }
  renderer.render(scene, camera);
}

// ---------- Boot ----------
$('modal-close').onclick = () => show($('photo-modal'), false);
$('dedication-close').onclick = () => show($('dedication-modal'), false);
$('photo-modal').addEventListener('click', e => { if (e.target.id === 'photo-modal') show($('photo-modal'), false); });
$('dedication-modal').addEventListener('click', e => { if (e.target.id === 'dedication-modal') show($('dedication-modal'), false); });
$('btn-view').onclick = () => { firstPerson = !firstPerson; toast(firstPerson ? 'First-person view' : 'Third-person view'); };
$('btn-music').onclick = toggleMusic;
$('btn-setup').onclick = () => { $('setup-panel').scrollIntoView({ behavior: 'smooth' }); };
initLock(); refreshSettingsUI(); bindSettings(); bindChat(); initChannel(); init3D();
