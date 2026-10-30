// Gallery Hall — Premium, For Two
// Private, device-local build. No account, no server, no tracking.
// Photos and settings live in this browser (localStorage) unless you export them.
const KEY = 'gallery-hall-premium-v1';
const DEFAULTS = {
  a: '', b: '', dedication: 'Every wall here is a memory. Every memory is you.',
  date: '', theme: 'gold', photos: [], passcode: null
};
let state = load();
let scene, camera, renderer, galleryGroup, partnerMesh, partnerLabel;
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
    state.theme = $('in-theme').value; save(); refreshSettingsUI(); buildGallery();
  };
  ['in-a', 'in-b', 'in-dedication', 'in-date', 'in-theme'].forEach(id => $(id).addEventListener('input', sync));
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

// ---------- 3D museum ----------
function placeholderTexture(title, caption) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 384); g.addColorStop(0, '#2b2118'); g.addColorStop(1, '#0e0b08');
  x.fillStyle = g; x.fillRect(0, 0, 512, 384);
  x.fillStyle = '#c9a227'; x.font = '90px serif'; x.textAlign = 'center'; x.fillText('♥', 256, 150);
  x.fillStyle = '#f3e5ab'; x.font = 'bold 30px system-ui'; x.fillText(title, 256, 220, 460);
  x.fillStyle = '#cbb98a'; x.font = '20px system-ui'; x.fillText(caption || 'A memory, beautifully framed.', 256, 260, 460);
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
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35 }));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: frameTexture(photo, title, caption) }));
  art.position.z = 0.07; art.userData = { kind: 'photo', title, caption, photo };
  const spot = new THREE.SpotLight(0xffe9a8, 0.9, 12, 0.6, 0.5); spot.position.set(0, 2.5, 1.5); spot.target = art;
  group.add(frame, art, spot, spot.target);
  frameMeshes.push(art);
  return group;
}
function makeBench(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), wood); seat.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.12), wood); back.position.set(0, 1.0, -0.32);
  seat.userData = { kind: 'bench' }; back.userData = { kind: 'bench' };
  benchMeshes.push(seat, back); g.add(seat, back); return g;
}
function makePerson(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), new THREE.MeshStandardMaterial({ color: 0xe8c39a }));
  head.position.y = 1.55;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 16), mat); body.position.y = 0.85;
  g.add(head, body); return g;
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
    { title: 'The Dedication Wall', caption: 'Every word, from the heart.' },
    { title: 'Adventures', caption: 'More to come.' },
    { title: 'Us', caption: names() },
    { title: 'Forever Frame', caption: 'Still to be filled.' }
  ];
  const photos = state.photos;
  const cp = makeFrame('centerpiece', 3.4, 2.5, 0, 2.3, -9.85, 0, slots[0].title, slots[0].caption, photos[0]);
  galleryGroup.add(cp);
  // Dedication plaque under the centerpiece
  const pc = document.createElement('canvas'); pc.width = 1024; pc.height = 512; const px = pc.getContext('2d');
  px.fillStyle = '#14100a'; px.fillRect(0, 0, 1024, 512);
  px.fillStyle = '#c9a227'; px.textAlign = 'center';
  px.font = '28px system-ui'; px.fillText('A PERMANENT COLLECTION', 512, 90);
  px.font = 'bold 44px serif'; px.fillStyle = '#f3e5ab'; px.fillText(state.b ? 'For ' + state.b : 'For your beloved', 512, 180);
  px.font = '30px system-ui'; px.fillStyle = '#e8dcc0';
  const words = (state.dedication || '').match(/.{1,38}(\s|$)/g) || [''];
  words.slice(0, 4).forEach((line, i) => px.fillText(line.trim(), 512, 250 + i * 42));
  px.fillStyle = '#c9a227'; px.font = 'italic 32px serif'; px.fillText(state.a ? 'Always yours, ' + state.a : 'Always yours', 512, 450);
  plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc) }));
  plaqueMesh.position.set(0, 0.9, -9.82); plaqueMesh.userData = { kind: 'plaque' };
  galleryGroup.add(plaqueMesh);
  // Side frames, north + south walls
  const north = [[-13, slots[1]], [-9, slots[2]], [9, slots[3]], [13, slots[4]]];
  const south = [[-12, slots[5]], [-6, slots[6]], [6, slots[7]], [12, slots[8]]];
  north.forEach(([x, s], i) => galleryGroup.add(makeFrame('n' + i, 2.2, 1.6, x, 2.1, -9.85, 0, s.title, s.caption, photos[1 + i])));
  south.forEach(([x, s], i) => galleryGroup.add(makeFrame('s' + i, 2.2, 1.6, x, 2.1, 9.85, Math.PI, s.title, s.caption, photos[5 + i])));
  // Cinema screen (east wall) — shows dedication, cycles photos in the modal flow
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.5),
    new THREE.MeshBasicMaterial({ map: placeholderTexture('Our Film', names()) }));
  screen.position.set(21.85, 2.4, 0); screen.rotation.y = -Math.PI / 2; screen.userData = { kind: 'screen' };
  screenMesh = screen; galleryGroup.add(screen);
  galleryGroup.add(makeBench(-4, -4, 0), makeBench(4, -4, 0), makeBench(-4, 4, Math.PI), makeBench(4, 4, Math.PI));
  // Partner avatar, standing nearby
  partnerMesh = makePerson(0xe75480); partnerMesh.position.set(2.2, 0, 4.5); galleryGroup.add(partnerMesh);
  scene.add(galleryGroup);
}
function init3D() {
  if (typeof THREE === 'undefined') { show($('scene-error'), true); return; }
  const wrap = $('scene-wrap');
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x11101a); scene.fog = new THREE.Fog(0x11101a, 20, 55);
  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const resize = () => {
    const w = wrap.clientWidth || 800, h = wrap.clientHeight || 500;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); addEventListener('resize', resize);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 22),
    new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.25, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xefe8dc, roughness: 0.9 });
  const mkWall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); };
  mkWall(44, 6, 0, 3, -10, 0); mkWall(44, 6, 0, 3, 10, Math.PI);
  mkWall(22, 6, -22, 3, 0, Math.PI / 2); mkWall(22, 6, 22, 3, 0, -Math.PI / 2);
  // Marble pillars + warm lights
  for (let x = -18; x <= 18; x += 6) {
    [-9, 9].forEach(z => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6, 0.7), new THREE.MeshStandardMaterial({ color: 0xcfc4b0 }));
      p.position.set(x, 3, z); scene.add(p);
    });
    const light = new THREE.PointLight(0xffe9a8, 0.6, 18); light.position.set(x, 5, 0); scene.add(light);
  }
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
