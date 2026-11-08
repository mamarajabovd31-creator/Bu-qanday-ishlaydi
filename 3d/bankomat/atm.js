// Interaktiv bankomat (Three.js).
// Sikl holati p: 0..5. Har bir butun qism bitta bosqich:
// 0 Karta, 1 PIN-kod, 2 Bank, 3 Sanash, 4 Pul.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* Matnlar atm-text.js ichida (window.ATM_T) */
const T = window.ATM_T;
const I = window.BQI;
let lang = I ? I.lang : 'en';
const tr = () => T[lang] || T.en;

const $ = id => document.getElementById(id);
function applyLang(){
  const t = tr();
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (t[k] != null) el.textContent = t[k]; });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; if (t[k] != null) el.innerHTML = t[k]; });
  paintButtons(); paintPart(); lastStep = -1; scrKey = '';
}
if (I) I.on(l => { lang = l; applyLang(); });

try { await document.fonts.load('800 40px Manrope'); await document.fonts.load('700 40px Manrope'); } catch (e) {}

/* ---------------- Sahna ---------------- */
const canvas = $('c'), stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
const narrow = () => stage.clientWidth / Math.max(1, stage.clientHeight) < 0.9;
const HOME = narrow()
  ? { pos: new THREE.Vector3(2.3, 2.7, 6.4), target: new THREE.Vector3(0.75, 1.25, -0.9) }
  : { pos: new THREE.Vector3(3.4, 2.5, 5.4), target: new THREE.Vector3(0.9, 1.15, -0.9) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 1.6; controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.49;
controls.addEventListener('start', () => { $('hint').classList.add('gone'); });

scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x1a1030, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 8, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0x4fe3ff, 0.9); rim.position.set(-6, 3, -5); scene.add(rim);

/* ---------------- Yordamchilar ---------------- */
const metal = (c, r = 0.35, m = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const clamp = x => Math.min(1, Math.max(0, x));
const seg = (x, a, b) => clamp((x - a) / (b - a));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (draw) draw(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; tx.userData.g = g; return tx;
}
function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

const PARTS = {};
function part(id, parent = scene){ const g = new THREE.Group(); g.userData.part = id; PARTS[id] = g; parent.add(g); return g; }
function add(g, geo, mat, x = 0, y = 0, z = 0){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }

/* ---------------- Pol ---------------- */
const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.85 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.3, 64), new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.35 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

/* ---------------- Korpus (qobiqlar) ---------------- */
const W = 1.6, D = 0.9, FZ = D / 2;
const cabinet = part('cabinet');
add(cabinet, new RoundedBoxGeometry(W, 1.25, D, 4, 0.05), metal(0x1d2a3d, 0.35, 0.7), 0, 1.775, 0);
{ // tepadagi yozuv
  const tx = canvasTex(512, 80, (g, w, h) => { g.fillStyle = '#062a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#4fe3ff'; g.fillRect(0, h - 8, w, 8); g.fillStyle = '#fff'; g.font = '800 46px Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ATM', w / 2, h / 2 - 2); });
  add(cabinet, new THREE.PlaneGeometry(1.4, 0.22), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, transparent: true }), 0, 2.27, FZ + 0.004);
}
const safe = part('safe');
add(safe, new RoundedBoxGeometry(W, 1.07, D, 4, 0.05), metal(0x2a3446, 0.45, 0.75), 0, 0.615, 0);
add(safe, new THREE.BoxGeometry(W + 0.1, 0.08, D + 0.1), metal(0x8fa3b8, 0.3, 0.9), 0, 0.04, 0);
[-0.79, 0.79].forEach(x => add(cabinet, new THREE.BoxGeometry(0.02, 1.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x4fe3ff, emissive: 0x4fe3ff, emissiveIntensity: 0.5 }), x, 1.75, 0.05));

/* ---------------- Ekran ---------------- */
const screenG = part('screen');
add(screenG, new RoundedBoxGeometry(1.18, 0.84, 0.06, 3, 0.03), metal(0x05080d, 0.6, 0.4), 0, 1.72, FZ - 0.01);
const scrTex = canvasTex(640, 440);
add(screenG, new THREE.PlaneGeometry(1.06, 0.73), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), 0, 1.72, FZ + 0.022);
let scrKey = '';
function drawScreen(st, arg){
  const k = lang + st + '|' + arg; if (k === scrKey) return; scrKey = k;
  const s = tr().scr, g = scrTex.userData.g, w = 640, h = 440;
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#0b3b66'); grd.addColorStop(1, '#071c33');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#4fe3ff'; g.fillRect(0, 0, w, 50);
  g.fillStyle = '#04121a'; g.font = '800 26px Manrope, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('BANK', 22, 26);
  g.textAlign = 'center'; g.fillStyle = '#fff';
  const line = (txt, y, f) => { g.font = f; g.fillText(txt, w / 2, y, w - 60); };
  if (st === 'insert') { line(s.welcome, 160, '800 50px Manrope, sans-serif'); line(s.insert, 236, '700 34px Manrope, sans-serif');
    g.strokeStyle = '#4fe3ff'; g.lineWidth = 5; rr(g, 250, 290, 140, 88, 12); g.stroke(); g.fillStyle = '#4fe3ff'; g.fillRect(272, 312, 34, 26); }
  if (st === 'reading') { line(s.reading, 170, '800 44px Manrope, sans-serif');
    for (let i = 0; i < 3; i++) { g.fillStyle = i <= arg ? '#4fe3ff' : '#24496e'; g.beginPath(); g.arc(w / 2 - 60 + i * 60, 270, 16, 0, 7); g.fill(); } }
  if (st === 'pin') { line(s.pin, 150, '800 42px Manrope, sans-serif');
    for (let i = 0; i < 4; i++) { g.fillStyle = '#14385c'; rr(g, 150 + i * 90, 220, 70, 84, 12); g.fill(); if (i < arg) { g.fillStyle = '#fff'; g.beginPath(); g.arc(185 + i * 90, 262, 14, 0, 7); g.fill(); } } }
  if (st === 'check') { line(s.check, 180, '800 40px Manrope, sans-serif');
    g.strokeStyle = '#4fe3ff'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, 300, 44, arg, arg + 4.2); g.stroke(); }
  if (st === 'ok') { g.fillStyle = '#19c37d'; g.beginPath(); g.arc(w / 2, 180, 70, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w / 2 - 32, 182); g.lineTo(w / 2 - 8, 206); g.lineTo(w / 2 + 36, 154); g.stroke();
    g.fillStyle = '#fff'; line(s.ok, 320, '800 44px Manrope, sans-serif'); }
  if (st === 'count') { line(s.count, 170, '800 44px Manrope, sans-serif'); g.fillStyle = '#14385c'; rr(g, 140, 240, 360, 30, 15); g.fill(); g.fillStyle = '#4fe3ff'; rr(g, 140, 240, Math.max(30, 360 * arg), 30, 15); g.fill(); }
  if (st === 'take') { line(s.take, 210, '800 52px Manrope, sans-serif'); }
  scrTex.needsUpdate = true;
}

/* ---------------- Karta o'quvchi ---------------- */
const reader = part('reader');
add(reader, new RoundedBoxGeometry(0.34, 0.14, 0.08, 3, 0.02), metal(0x8fa3b8, 0.25, 0.95), 0.5, 1.2, FZ + 0.02);
add(reader, new THREE.BoxGeometry(0.26, 0.018, 0.02), metal(0x05080d, 0.6, 0.4), 0.5, 1.2, FZ + 0.062);
const readerLed = add(reader, new THREE.BoxGeometry(0.26, 0.012, 0.01), new THREE.MeshStandardMaterial({ color: 0x19ff9c, emissive: 0x19ff9c, emissiveIntensity: 1 }), 0.5, 1.24, FZ + 0.062);

/* ---------------- Klaviatura ---------------- */
const keypad = part('keypad');
const kp = new THREE.Group(); kp.position.set(-0.18, 1.0, FZ); kp.rotation.x = -0.15; keypad.add(kp);
add(kp, new RoundedBoxGeometry(0.5, 0.62, 0.05, 3, 0.02), metal(0x05080d, 0.6, 0.4));
const keys = [];
['1','2','3','4','5','6','7','8','9','*','0','#'].forEach((s, i) => {
  const tx = canvasTex(96, 96, g => { g.fillStyle = '#c9d4e0'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#14202e'; g.font = '800 56px Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 48, 52); });
  const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.4, metalness: 0.1, emissive: 0x4fe3ff, emissiveIntensity: 0 });
  const k = add(kp, new RoundedBoxGeometry(0.12, 0.11, 0.04, 2, 0.015), metal(0x8fa3b8, 0.3, 0.8), -0.145 + (i % 3) * 0.145, 0.21 - Math.floor(i / 3) * 0.14, 0.04);
  add(k, new THREE.PlaneGeometry(0.105, 0.095), m, 0, 0, 0.021);
  keys.push({ k, m });
});
[0xe5484d, 0xf5c518, 0x19c37d].forEach((c, i) => add(kp, new RoundedBoxGeometry(0.14, 0.1, 0.04, 2, 0.015), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), 0.32, 0.17 - i * 0.14, 0));

/* ---------------- Pul chiqarish joyi ---------------- */
const dispenser = part('dispenser');
add(dispenser, new RoundedBoxGeometry(0.86, 0.16, 0.1, 3, 0.03), metal(0x8fa3b8, 0.25, 0.95), 0, 0.62, FZ + 0.01);
add(dispenser, new THREE.BoxGeometry(0.72, 0.03, 0.03), metal(0x05080d, 0.6, 0.4), 0, 0.62, FZ + 0.06);
const shutter = add(dispenser, new THREE.BoxGeometry(0.72, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0x4fe3ff, emissive: 0x4fe3ff, emissiveIntensity: 0.6 }), 0, 0.665, FZ + 0.06);

/* ---------------- Ichki mexanizm ---------------- */
const noteTex = canvasTex(512, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2fae8c'); gr.addColorStop(1, '#1b6e7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(w * 0.7, h / 2, 70, 80, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * 0.25, h / 2, 20 + i * 9, 0, 7); g.stroke(); }
});
const noteMat = new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.7, side: THREE.DoubleSide });
const NW = 0.3, NL = 0.3;
const cassettes = part('cassettes');
[-0.36, 0.36].forEach(x => {
  add(cassettes, new RoundedBoxGeometry(0.6, 0.34, 0.62, 3, 0.03), metal(0x6c7a8a, 0.35, 0.9), x, 0.3, -0.05);
  add(cassettes, new THREE.BoxGeometry(0.61, 0.05, 0.63), new THREE.MeshStandardMaterial({ color: 0x4fe3ff, emissive: 0x4fe3ff, emissiveIntensity: 0.5 }), x, 0.38, -0.05);
  for (let i = 0; i < 10; i++) add(cassettes, new THREE.BoxGeometry(NW, 0.008, NL * 1.2), noteMat, x, 0.48 + i * 0.009, -0.05);
});
const rollersG = part('rollers');
const rollers = [];
for (let i = 0; i < 5; i++) rollers.push(add(rollersG, new THREE.CylinderGeometry(0.035, 0.035, 0.42, 16).rotateZ(Math.PI / 2), metal(0x222a35, 0.5, 0.6), 0, 0.56 + i * 0.012, -0.12 + i * 0.13));
add(rollersG, new THREE.BoxGeometry(0.36, 0.006, 0.62), new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.8 }), 0, 0.6, 0.12);
const sensorG = part('sensor');
add(sensorG, new THREE.BoxGeometry(0.46, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: 0xff3b5c, emissive: 0xff3b5c, emissiveIntensity: 1 }), 0, 0.68, 0.2);
const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
beam.position.set(0, 0.64, 0.2); scene.add(beam);
const notePath = new THREE.CatmullRomCurve3([V(-0.36, 0.6, -0.05), V(-0.15, 0.63, -0.12), V(0, 0.62, 0.05), V(0, 0.62, 0.3), V(0, 0.62, 0.48)]);
const flowNotes = []; for (let i = 0; i < 6; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(NW, NL * 0.95), noteMat); n.rotation.x = -Math.PI / 2; scene.add(n); flowNotes.push(n); }
const outNotes = []; for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.BoxGeometry(NW, 0.004, NL), noteMat); scene.add(n); outNotes.push(n); }

/* ---------------- Karta ---------------- */
const cardTex = canvasTex(512, 324, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0a5fa8'); gr.addColorStop(1, '#062a44'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(79,227,255,.3)'; g.beginPath(); g.arc(w * 0.9, h * 0.1, 170, 0, 7); g.fill();
  const cg = g.createLinearGradient(60, 110, 140, 180); cg.addColorStop(0, '#f6d97a'); cg.addColorStop(1, '#b8892f'); g.fillStyle = cg; rr(g, 56, 112, 86, 66, 10); g.fill();
  g.fillStyle = '#fff'; g.font = '700 34px Manrope, sans-serif'; g.fillText('•••• •••• •••• 0000', 56, 250);
});
cardTex.center.set(0.5, 0.5); cardTex.rotation = -Math.PI / 2;
const cardG = part('card');
const cBlue = new THREE.MeshStandardMaterial({ color: 0x0a3a66, roughness: 0.4 });
add(cardG, new THREE.BoxGeometry(0.215, 0.006, 0.34), [cBlue, cBlue, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.35, metalness: 0.2 }), cBlue, cBlue, cBlue]);

/* ---------------- Bank serveri ---------------- */
const server = part('server');
server.position.set(3.2, 0, -3.4);
const leds = [];
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let r = 0; r < 3; r++) {
  add(server, new RoundedBoxGeometry(0.8, 2.4, 0.8, 3, 0.04), metal(0x141c28, 0.4, 0.7), (r - 1) * 0.9, 1.2, 0);
  for (let j = 0; j < 9; j++) { const m = new THREE.MeshBasicMaterial({ color: 0x4fe3ff }); add(server, new THREE.PlaneGeometry(0.54, 0.05), m, (r - 1) * 0.9, 0.4 + j * 0.22, 0.402); leds.push({ m, ph: rnd() * 6, sp: 2 + rnd() * 5 }); }
}
{
  const tx = canvasTex(512, 80, (g, w, h) => { g.fillStyle = '#4fe3ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#04121a'; g.font = '800 44px Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BANK', w / 2, h / 2); });
  add(server, new THREE.BoxGeometry(2.7, 0.18, 0.86), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: 0x4fe3ff, emissive: 0x4fe3ff, emissiveIntensity: 0.4 })), 0, 2.5, 0);
}
const sigCurve = new THREE.CatmullRomCurve3([V(0, 2.45, 0), V(0.9, 3.6, -1.0), V(2.4, 3.6, -2.6), V(3.2, 2.7, -3.3)]);
const tube = new THREE.Mesh(new THREE.TubeGeometry(sigCurve, 80, 0.01, 6, false), new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.25 }));
scene.add(tube);
const sigGeo = new THREE.SphereGeometry(0.05, 10, 10);
const sigs = []; for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(sigGeo, new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0 })); scene.add(s); sigs.push(s); }

// Har bir qism o'z materialiga ega bo'lsin (tanlanganda faqat u yorishadi)
Object.values(PARTS).forEach(g => g.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); }));
// Ichini ko'rish uchun shaffof bo'ladigan qobiq materiallari
const shellMats = [];
[cabinet, safe].forEach(g => g.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { m.transparent = true; shellMats.push(m); }); }));

/* ---------------- Holat ---------------- */
let p = 0, playing = true, speed = 1, stopAt = null;
const RATE = 1 / 3.2; // bir bosqich 3.2 soniyada (1×)
if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;
let xrayUser = 0, xr = 0;

function update(t){
  const c = ((p % 5) + 5) % 5;
  const s = Math.floor(c), f = c - s;

  // Karta
  let cz = 0.5;
  if (s === 0) cz = 1.05 - 0.55 * ease(seg(f, 0.1, 0.7));
  if (s === 4) cz = 0.5 + 0.55 * ease(seg(f, 0.55, 0.9));
  cardG.position.set(0.5, 1.2, cz);
  cardG.visible = !(s === 4 && f > 0.97);
  readerLed.material.emissiveIntensity = (s === 0 || (s === 4 && f > 0.5)) ? 0.6 + 0.8 * Math.abs(Math.sin(t * 6)) : 0.4;

  // Ekran
  if (s === 0) f < 0.25 ? drawScreen('insert', 0) : drawScreen('reading', Math.min(2, Math.floor((f - 0.25) / 0.25)));
  else if (s === 1) drawScreen('pin', Math.min(4, Math.max(0, Math.floor((f - 0.1) / 0.2) + 1)));
  else if (s === 2) f < 0.82 ? drawScreen('check', Math.floor(t * 8) % 8 * 0.785) : drawScreen('ok', 0);
  else if (s === 3) drawScreen('count', Math.round(f * 10) / 10);
  else drawScreen('take', 0);

  // Tugmalar
  keys.forEach(({ k, m }) => { m.emissiveIntensity = 0; k.position.z = 0.04; });
  if (s === 1) [3, 8, 1, 10].forEach((ki, j) => {
    const t0 = 0.1 + j * 0.2, q = Math.max(0, 1 - Math.abs(f - t0 - 0.05) / 0.07);
    keys[ki].m.emissiveIntensity = 1.4 * q; keys[ki].k.position.z = 0.04 - 0.015 * q;
  });

  // Signal
  const back = s === 2 && f > 0.5;
  sigs.forEach((m, i) => {
    let u = ((i / sigs.length + t * 0.5) % 1 + 1) % 1; if (back) u = 1 - u;
    const head = back ? seg(f, 0.5, 0.75) : seg(f, 0.0, 0.25);
    const vis = s === 2 && (back ? (1 - u) <= head : u <= head);
    m.position.copy(sigCurve.getPointAt(u));
    m.material.color.set(back ? 0x19ff9c : 0x4fe3ff);
    m.material.opacity = vis ? 0.95 : 0;
  });
  tube.material.opacity = s === 2 ? 0.45 : 0.18;
  const okLed = s === 2 && f > 0.5;
  leds.forEach(l => { const on = Math.sin(t * l.sp + l.ph) > 0.1; l.m.color.set(okLed ? (on ? 0x19ff9c : 0x0b5a3a) : (on ? 0x4fe3ff : 0x08304d)); });

  // Ichini ko'rish: foydalanuvchi tanlovi + sanash bosqichida avtomatik
  const auto = s === 3 ? Math.min(seg(f, 0, 0.04), 1 - seg(f, 0.92, 1)) : 0;
  const target = Math.max(xrayUser, auto);
  xr += (target - xr) * 0.12;
  const op = 1 - 0.85 * xr;
  shellMats.forEach(m => { m.opacity = op; m.depthWrite = op > 0.98; });

  rollers.forEach((r, i) => { if (s === 3) r.rotation.x = t * 14 * (i % 2 ? 1 : -1); });
  beam.material.opacity = s === 3 ? 0.35 * xr * (0.6 + 0.4 * Math.sin(t * 20) ** 2) : 0;
  flowNotes.forEach((n, i) => {
    const u = ((f * 2.5 + i / flowNotes.length) % 1 + 1) % 1;
    n.visible = s === 3 && f > 0.05 && f < 0.95 && xr > 0.2;
    n.position.copy(notePath.getPointAt(u)); n.position.y += 0.004 * i;
  });
  const dOut = s === 4 ? ease(seg(f, 0.0, 0.3)) : 0;
  outNotes.forEach((n, i) => { n.visible = s === 4; n.position.set(0, 0.62 + i * 0.005, 0.47 + 0.18 * dOut); n.rotation.y = (i - 2) * 0.05 * seg(f, 0.3, 0.6); });
  shutter.material.emissiveIntensity = s === 4 ? 1.4 : 0.5;

  updateHud(s, f);
}

/* ---------------- HUD va boshqaruv ---------------- */
let lastStep = -1;
function updateHud(s, f){
  $('hudBar').style.transform = `scaleX(${f})`;
  $('hudDeg').textContent = Math.round(f * 100) + '%';
  if (s === lastStep) return;
  lastStep = s;
  const t = tr();
  $('hudStep').textContent = `${s + 1}/5`;
  $('hudName').textContent = t['s' + s];
  stage.dataset.stroke = s;
  $('strokeText').textContent = t['d' + s];
  document.querySelectorAll('#strokes button').forEach((b, i) => { b.setAttribute('aria-selected', i === s); b.classList.toggle('on', i === s); });
}
function paintButtons(){
  const t = tr();
  $('play').firstElementChild.textContent = playing ? t.pause : t.play;
  $('play').setAttribute('aria-pressed', playing);
  $('xray').textContent = xrayUser ? t.xrayOff : t.xray;
  $('xray').setAttribute('aria-pressed', !!xrayUser);
}
$('play').addEventListener('click', () => { playing = !playing; stopAt = null; paintButtons(); });
$('step').addEventListener('click', () => { stopAt = Math.floor(p + 1e-6) + 1; playing = true; paintButtons(); });
$('xray').addEventListener('click', () => { xrayUser = xrayUser ? 0 : 1; paintButtons(); });
$('reset').addEventListener('click', () => { camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.update(); });
$('speed').addEventListener('input', e => { speed = +e.target.value; $('speedVal').textContent = speed + '×'; });
document.querySelectorAll('#strokes button').forEach(b => b.addEventListener('click', () => {
  const k = +b.dataset.s; p = Math.floor(p / 5) * 5 + k + 0.01; stopAt = null; update(performance.now() / 1000);
}));

/* ---------------- Qismni tanlash ---------------- */
let selected = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(Object.values(PARTS), true);
  const shells = new Set(['cabinet', 'safe']);
  let pick = null, shell = null;
  for (const h of hits) {
    let o = h.object; while (o && !o.userData.part) o = o.parent;
    if (!o || !o.visible) continue;
    const id = o.userData.part;
    if (shells.has(id)) { shell = shell || id; if (xr > 0.4) continue; break; }
    pick = id; break;
  }
  select(pick || shell);
});
function setGlow(id, on){
  if (!id) return;
  PARTS[id].traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { if (m.emissive && !m.userData.keyFace) { if (m.userData.e0 == null) { m.userData.e0 = m.emissive.getHex(); m.userData.ei0 = m.emissiveIntensity; } m.emissive.set(on ? 0x2a8fb0 : m.userData.e0); m.emissiveIntensity = on ? 0.9 : m.userData.ei0; } }); });
}
keys.forEach(k => k.m.userData.keyFace = true);
function select(id){
  setGlow(selected, false); selected = id === selected ? null : id; setGlow(selected, true);
  paintPart();
}
function paintPart(){
  const t = tr();
  $('partBox').classList.toggle('on', !!selected);
  if (selected) { const [n, d] = t.parts[selected]; $('partName').textContent = n; $('partText').textContent = d; }
  else { $('partName').textContent = t.partNone; $('partText').textContent = t.partHelp; }
}

/* ---------------- Sikl ---------------- */
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 0.9 ? 52 : 38; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

let last = performance.now(), visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) {
    p += RATE * speed * dt;
    if (stopAt != null && p >= stopAt) { p = stopAt + 0.001; playing = false; stopAt = null; paintButtons(); }
  }
  if (visible) { update(now / 1000); controls.update(); renderer.render(scene, camera); }
  requestAnimationFrame(loop);
}
applyLang();
update(0);
$('loading').hidden = true;
stage.classList.add('ready');
requestAnimationFrame(loop);
