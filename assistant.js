/* "Yordamchi" bo'limi: obunachilar uchun jonli ovozli yordamchi (ElevenLabs agenti).
   Ovoz dvigateli (lib/elevenlabs.js, ~600 KB) faqat suhbat boshlanganda yuklanadi.
   Agent tomonida: bir vaqtda 2 ta, kuniga 40 ta suhbat; bu yerda har suhbat 3 daqiqagacha. */
(function(){
const AGENT_ID = 'agent_6701m74pmjz5f2gvr2q44fz9h08a';
const MAX_SECS = 180;
const box = document.getElementById('yordamchi');
if (!box) return;

const I = window.BQI || { t: k => k, on(){}, lang: 'uz' };
const t = k => I.t(k);
const $ = id => document.getElementById(id);
const orb = $('ai-orb'), go = $('ai-go'), mute = $('ai-mute'), openBtn = $('ai-open');
const stateEl = $('ai-state'), youEl = $('ai-you'), sayEl = $('ai-say');
const base = new URL('.', document.currentScript.src).href;

let conv = null, phase = 'idle', muted = false, timer = null, sdk = null, msgKey = null;

function paint(){
  const live = phase === 'listening' || phase === 'speaking';
  stateEl.removeAttribute('data-t');
  stateEl.textContent = t(muted && phase === 'listening' ? 'ai.muted' : { idle: 'ai.ready', connecting: 'ai.connecting', listening: 'ai.listening', speaking: 'ai.speaking' }[phase]);
  go.removeAttribute('data-t');
  go.textContent = t(live ? 'ai.stop' : phase === 'connecting' ? 'ai.wait' : 'ai.go');
  go.classList.toggle('stop', live);
  go.disabled = phase === 'connecting';
  mute.hidden = !live;
  mute.setAttribute('aria-pressed', muted);
}
// msg: tarjima kaliti (til almashsa qayta yoziladi) yoki suhbatdagi matn
function say(text, key, err){
  sayEl.removeAttribute('data-t');
  msgKey = key || null;
  sayEl.textContent = key ? t(key) : text;
  sayEl.classList.toggle('err', !!err);
}
I.on(() => { paint(); if (msgKey) sayEl.textContent = t(msgKey); });

function loadSdk(){
  if (sdk) return sdk;
  sdk = new Promise((ok, no) => {
    if (window.ElevenLabs) return ok();
    const s = document.createElement('script');
    s.src = base + 'lib/elevenlabs.js'; s.onload = ok; s.onerror = no;
    document.head.appendChild(s);
  }).catch(e => { sdk = null; throw e; });
  return sdk;
}
// Telegram ichida mikrofon ishlamasa: tashqi brauzerda ochish
function offerBrowser(){
  const W = window.Telegram && window.Telegram.WebApp;
  openBtn.hidden = false;
  openBtn.onclick = () => {
    const url = location.origin + location.pathname + '#yordamchi';
    if (W && W.openLink) W.openLink(url); else window.open(url, '_blank', 'noopener');
  };
}

async function start(){
  if (conv || phase === 'connecting') return;
  openBtn.hidden = true; youEl.textContent = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('', 'ai.errNoMic', true); offerBrowser(); return; }
  phase = 'connecting'; paint(); say('', 'ai.wait');
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach(tr => tr.stop());
  } catch (e) {
    phase = 'idle'; paint(); say('', 'ai.errMic', true); if (window.BQI_TG) offerBrowser(); return;
  }
  try {
    await loadSdk();
    const lang = I.lang;
    const opts = {
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      onConnect: () => {
        phase = 'listening'; paint(); say('');
        timer = setTimeout(() => { if (conv) { say('', 'ai.timeup'); stop(true); } }, MAX_SECS * 1000);
      },
      onDisconnect: () => {
        clearTimeout(timer); conv = null; muted = false; phase = 'idle'; paint();
        if (!sayEl.classList.contains('err') && msgKey !== 'ai.timeup') say('', 'ai.ended');
      },
      onModeChange: ({ mode }) => { if (conv) { phase = mode === 'speaking' ? 'speaking' : 'listening'; paint(); } },
      onMessage: ({ message, source }) => {
        if (!message) return;
        if (source === 'user') youEl.textContent = message; else say(message);
      },
      onError: (m) => { console.error('Yordamchi:', m); say('', 'ai.errDrop', true); }
    };
    if (lang === 'ru' || lang === 'en') opts.overrides = { agent: { language: lang } };
    conv = await window.ElevenLabs.Conversation.startSession(opts);
  } catch (e) {
    console.error('Yordamchi start:', e);
    conv = null; phase = 'idle'; paint(); say('', 'ai.errNet', true);
  }
}
async function stop(){
  clearTimeout(timer);
  const c = conv; if (!c) return;
  try { await c.endSession(); } catch (e) {}
}
const toggle = () => conv ? stop() : start();
orb.addEventListener('click', toggle);
go.addEventListener('click', toggle);
mute.addEventListener('click', () => {
  if (!conv) return;
  muted = !muted; try { conv.setMicMuted(muted); } catch (e) {}
  paint();
});
// Boshqa bo'limga o'tilsa suhbat to'xtaydi
addEventListener('hashchange', () => { if (conv && location.hash !== '#yordamchi') stop(); });

/* ---------- Doira: ovoz balandligiga qarab jonlanadi (faqat bo'lim ko'rinib turganda chiziladi) ---------- */
const cv = orb.querySelector('canvas'), cx = cv.getContext('2d');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W = 0, DPR = 1, level = 0, glow = 0, raf = 0;
function fit(){
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  DPR = Math.min(window.devicePixelRatio || 1, 3); W = r.width;
  cv.width = Math.round(W * DPR); cv.height = Math.round(W * DPR);
}
addEventListener('resize', fit);
function arc(r, a0, a1, w, c, a){ cx.beginPath(); cx.arc(0, 0, r, a0, a1); cx.lineWidth = w; cx.strokeStyle = c; cx.globalAlpha = a; cx.stroke(); }
function draw(now){
  raf = 0;
  if (box.hidden) return;
  if (!W) fit();
  const tt = calm ? 0 : now / 1000, R = W / 2;
  let target = 0;
  if (conv) { try { target = phase === 'speaking' ? conv.getOutputVolume() : (muted ? 0 : conv.getInputVolume()); } catch (e) {} }
  if (phase === 'connecting') target = .25 + .2 * Math.sin(tt * 6);
  level += (Math.min(1, target * 1.6) - level) * .22;
  glow += ((phase === 'idle' ? .45 : 1) - glow) * .06;
  const main = phase === 'speaking' ? '#eaf4ff' : '#4fe3ff', second = '#3d8bff';
  cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, W);
  cx.save(); cx.translate(R, R); cx.lineCap = 'round';
  const core = R * (.3 + .1 * level);
  const g = cx.createRadialGradient(0, 0, 0, 0, 0, core * 2.3);
  g.addColorStop(0, phase === 'speaking' ? 'rgba(234,244,255,.95)' : 'rgba(79,227,255,.9)');
  g.addColorStop(.28, 'rgba(61,139,255,.5)'); g.addColorStop(1, 'rgba(61,139,255,0)');
  cx.globalAlpha = .35 + .65 * glow; cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, core * 2.3, 0, 7); cx.fill();
  arc(core, 0, 7, 2, main, .5 + .5 * glow);
  const k = 1 + level * .08;
  arc(R * .58 * k, tt * .9, tt * .9 + 1.9, 3, main, .9 * glow);
  arc(R * .58 * k, tt * .9 + 3.1, tt * .9 + 4.6, 3, second, .8 * glow);
  arc(R * .72 * k, -tt * .55, -tt * .55 + 2.6, 2, second, .75 * glow);
  arc(R * .72 * k, -tt * .55 + 3.6, -tt * .55 + 4.3, 5, main, .85 * glow);
  const N = 60;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, wave = .5 + .5 * Math.sin(i * .7 + tt * 5);
    const r0 = R * .88, len = R * (.025 + level * .08 * wave);
    cx.beginPath(); cx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); cx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len));
    cx.lineWidth = i % 5 ? 1.5 : 2.5; cx.strokeStyle = i % 5 ? second : main; cx.globalAlpha = (i % 5 ? .45 : .9) * glow; cx.stroke();
  }
  cx.restore(); cx.globalAlpha = 1;
  raf = requestAnimationFrame(draw);
}
function wake(){ if (!box.hidden && !raf) { fit(); raf = requestAnimationFrame(draw); } }
new MutationObserver(wake).observe(box, { attributes: true, attributeFilter: ['hidden'] });
wake();
paint();
})();
