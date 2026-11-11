// Jarvis: jonli ovozli yordamchi. Ovoz dvigateli: ElevenLabs agenti (sdk.js).
const AGENT_ID = 'agent_7101m74mv1b7fv1tcykfa23vw7qh';

const $ = s => document.querySelector(s);
const orb = $('#orb'), go = $('#go'), mute = $('#mute'), kb = $('#kb'), form = $('#type'), msg = $('#msg');
const pill = $('#pill'), pillTxt = $('#pillTxt'), stateEl = $('#state'), youEl = $('#you'), aiEl = $('#ai');

let conv = null;          // faol suhbat
let phase = 'idle';       // idle | connecting | listening | speaking
let muted = false, wake = null;

const LABEL = { idle: 'Tayyor', connecting: 'Ulanmoqda', listening: 'Tinglayapman', speaking: 'Gapiryapman' };
function setPhase(p){
  phase = p;
  stateEl.textContent = muted && p === 'listening' ? 'Mikrofon o\'chiq' : LABEL[p];
  const live = p === 'listening' || p === 'speaking';
  pill.className = 'pill' + (live ? ' on' : '');
  pillTxt.textContent = live ? 'Jonli' : p === 'connecting' ? 'Ulanmoqda' : 'Uyquda';
  go.textContent = live ? 'Suhbatni tugatish' : p === 'connecting' ? 'Ulanmoqda…' : 'Suhbatni boshlash';
  go.classList.toggle('stop', live);
  go.disabled = p === 'connecting';
  mute.hidden = kb.hidden = !live;
  if (!live) { form.hidden = true; kb.setAttribute('aria-pressed', 'false'); }
  orb.setAttribute('aria-label', live ? 'Suhbatni tugatish' : 'Jarvis bilan suhbatni boshlash');
}
function say(text, isErr){ aiEl.textContent = text; aiEl.classList.toggle('err', !!isErr); }
function fail(text){
  say(text, true); pill.className = 'pill err'; pillTxt.textContent = 'Xato';
}

async function start(){
  if (conv || phase === 'connecting') return;
  if (!window.ElevenLabs || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    fail('Bu brauzerda mikrofon ishlamaydi. Sahifani Safari yoki Chrome\'da oching.'); return;
  }
  setPhase('connecting'); youEl.textContent = ''; say('Ulanyapman…');
  try {
    // Ruxsat oynasi shu yerda chiqadi; rad etilsa aniq xabar beramiz.
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach(t => t.stop());
  } catch (e) {
    setPhase('idle');
    fail('Mikrofonga ruxsat berilmadi. Sozlamalar → Safari → Mikrofon bo\'limida ruxsat bering va qayta bosing.');
    return;
  }
  try {
    conv = await ElevenLabs.Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      onConnect: () => { setPhase('listening'); say(''); keepAwake(true); },
      onDisconnect: () => { conv = null; muted = false; paintMute(); setPhase('idle'); keepAwake(false);
        if (!aiEl.classList.contains('err')) say('Suhbat tugadi. Kerak bo\'lsam, doirani bosing.'); },
      onModeChange: ({ mode }) => { if (conv) setPhase(mode === 'speaking' ? 'speaking' : 'listening'); },
      onMessage: ({ message, source }) => {
        if (!message) return;
        if (source === 'user') youEl.textContent = message; else say(message);
      },
      onError: (m) => { console.error('Jarvis:', m); fail('Aloqa uzildi. Internetni tekshirib, qayta bosing.'); }
    });
  } catch (e) {
    console.error('Jarvis start:', e);
    conv = null; setPhase('idle');
    fail('Ulanib bo\'lmadi. Internetni tekshirib, qayta urinib ko\'ring.');
  }
}
async function stop(){
  const c = conv; if (!c) return;
  try { await c.endSession(); } catch (e) {}
}
function toggle(){ conv ? stop() : start(); }

function paintMute(){
  mute.setAttribute('aria-pressed', muted);
  mute.setAttribute('aria-label', muted ? 'Mikrofonni yoqish' : 'Mikrofonni o\'chirish');
}
async function keepAwake(on){
  try {
    if (on && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
    else if (wake) { await wake.release(); wake = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && conv) keepAwake(true); });

orb.addEventListener('click', toggle);
go.addEventListener('click', toggle);
mute.addEventListener('click', () => {
  if (!conv) return;
  muted = !muted; try { conv.setMicMuted(muted); } catch (e) {}
  paintMute(); setPhase(phase);
});
kb.addEventListener('click', () => {
  form.hidden = !form.hidden; kb.setAttribute('aria-pressed', !form.hidden);
  if (!form.hidden) msg.focus();
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const t = msg.value.trim(); if (!t || !conv) return;
  try { conv.sendUserMessage(t); youEl.textContent = t; msg.value = ''; } catch (err) {}
});

/* ---------- Doira: ovoz balandligiga qarab jonlanadi ---------- */
const cv = $('#cv'), cx = cv.getContext('2d');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W = 0, DPR = 1, level = 0, glow = 0;
function fit(){
  const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 3);
  W = r.width; DPR = d; cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  cx.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', fit); fit();
function arc(r, a0, a1, w, color, alpha){
  cx.beginPath(); cx.arc(0, 0, r, a0, a1); cx.lineWidth = w; cx.strokeStyle = color; cx.globalAlpha = alpha; cx.stroke();
}
function draw(now){
  const t = calm ? 0 : now / 1000, R = W / 2;
  let target = 0;
  if (conv) { try { target = phase === 'speaking' ? conv.getOutputVolume() : (muted ? 0 : conv.getInputVolume()); } catch (e) {} }
  if (phase === 'connecting') target = .25 + .2 * Math.sin(t * 6);
  level += (Math.min(1, target * 1.6) - level) * .22;
  glow += ((phase === 'idle' ? .35 : 1) - glow) * .06;
  const speaking = phase === 'speaking';
  const main = speaking ? '#eaf4ff' : '#5ce1ff', second = '#3d8bff';

  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cx.clearRect(0, 0, W, W);
  cx.save(); cx.translate(R, R); cx.lineCap = 'round';

  // yadro
  const core = R * (.3 + .1 * level + (phase === 'idle' ? .012 * Math.sin(t * 1.6) : 0));
  const g = cx.createRadialGradient(0, 0, 0, 0, 0, core * 2.3);
  g.addColorStop(0, speaking ? 'rgba(234,244,255,.95)' : 'rgba(92,225,255,.9)');
  g.addColorStop(.28, 'rgba(61,139,255,.55)');
  g.addColorStop(1, 'rgba(61,139,255,0)');
  cx.globalAlpha = .35 + .65 * glow; cx.fillStyle = g;
  cx.beginPath(); cx.arc(0, 0, core * 2.3, 0, 7); cx.fill();
  arc(core, 0, 7, 2, main, .5 + .5 * glow);

  // aylanuvchi yoylar
  const k = 1 + level * .08;
  arc(R * .56 * k, t * .9, t * .9 + 1.9, 3, main, .9 * glow);
  arc(R * .56 * k, t * .9 + 3.1, t * .9 + 4.6, 3, second, .8 * glow);
  arc(R * .68 * k, -t * .55, -t * .55 + 2.6, 2, second, .75 * glow);
  arc(R * .68 * k, -t * .55 + 3.6, -t * .55 + 4.3, 5, main, .85 * glow);
  arc(R * .8, t * .25, t * .25 + .9, 2, main, .55 * glow);
  arc(R * .8, t * .25 + 2.2, t * .25 + 5.4, 1, second, .45 * glow);

  // chetdagi bo'linmalar, ovozga qarab cho'ziladi
  const N = 72;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const wave = .5 + .5 * Math.sin(i * .7 + t * 5);
    const len = R * (.025 + level * .075 * wave);
    const r0 = R * .9;
    cx.beginPath(); cx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); cx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
    cx.lineWidth = i % 6 ? 1.5 : 2.5; cx.strokeStyle = i % 6 ? second : main; cx.globalAlpha = (i % 6 ? .45 : .9) * glow; cx.stroke();
  }
  cx.restore(); cx.globalAlpha = 1;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
setPhase('idle');
