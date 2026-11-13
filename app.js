// Kanal havolalari: manzilni yozsangiz "Aloqa" bo'limida tugma ishlaydi, bo'sh qolsa "tez kunda" turadi.
const LINKS = {
  telegram: "https://t.me/buqanday_ishlaydi1",
  instagram: "",   // tayyor bo'lganda: "https://www.instagram.com/buqanday_.ishlaydi/"
  youtube: ""      // masalan: "https://youtube.com/@kanal_nomi"
};

// "Kutaman" ovozlari serveri (server/worker.js, Cloudflare). Bo'sh bo'lsa ovozlar faqat shu telefonda saqlanadi.
// Masalan: "https://buqanday-bot.SIZNING-NOMINGIZ.workers.dev"
const VOTE_API = "";

// Tarjima (i18n.js). U yuklanmagan bo'lsa o'zbekcha matn qoladi.
const I = window.BQI || { t: k => k, on(){}, lang: 'uz' };
const t = k => I.t(k);
const onLang = fn => { fn(); I.on(fn); };

const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const sess = {
  get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
  set(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
};

/* ---------- Kutib olish oynasi (sessiyada bir marta) ---------- */
const welcome = document.getElementById('welcome');
if (welcome && !sess.get('bqi-welcomed')) {
  welcome.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  const h = new Date().getHours();
  const g = h < 5 ? 0 : h < 11 ? 1 : h < 18 ? 2 : 3;
  const hi = welcome.querySelector('.w-hi');
  onLang(() => { if (hi) hi.textContent = t('app.g' + g) + '!'; });
  const go = welcome.querySelector('.w-go');
  const close = () => {
    sess.set('bqi-welcomed', '1');
    welcome.classList.add('out');
    document.documentElement.style.overflow = '';
    setTimeout(() => { welcome.hidden = true; }, 650);
  };
  go && go.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !welcome.hidden) close(); });
  setTimeout(() => go && go.focus({preventScroll:true}), 900);
}

/* ---------- Pastki menyu (bosh sahifada bo'limlarni almashtiradi) ---------- */
const tabbar = document.querySelector('.tabbar');
const blob = tabbar && tabbar.querySelector('.blob');
const tabs = tabbar ? [...tabbar.querySelectorAll('a')] : [];
const panels = [...document.querySelectorAll('.panel')];
const ALIAS = { haqida: 'bosh' }; // eski havolalar
/* Slot reel: har bir ikonka baraban. Bosilgani aylanib, o'z ikonkasida to'xtaydi. */
const REEL_STEP = 22; // ikonka balandligi (style.css bilan bir xil)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tabIcons = tabs.map(a => a.querySelector('svg'));
tabs.forEach((a, i) => {
  const own = tabIcons[i]; if (!own) return;
  const reel = document.createElement('span'); reel.className = 'reel'; reel.setAttribute('aria-hidden', 'true');
  const strip = document.createElement('span'); strip.className = 'reel-strip';
  own.replaceWith(reel); reel.appendChild(strip); strip.appendChild(own);
  // o'zidan keyingi ikonkalardan boshlab, aylana bo'ylab qolgan ikonkalar, oxirida yana o'zi
  for (let k = 1; k < tabs.length; k++) {
    const src = tabIcons[(i + k) % tabs.length]; if (!src) continue;
    const g = src.cloneNode(true); g.classList.add('ghost'); strip.appendChild(g);
  }
  strip.appendChild(own.cloneNode(true));
  a._strip = strip;
});
function spinTab(a){
  const strip = a && a._strip;
  if (!strip || calm || !strip.animate) return;
  const from = -(strip.children.length - 1) * REEL_STEP;
  strip.getAnimations().forEach(x => x.cancel());
  strip.animate([
    { transform: `translateY(${from}px)`, filter: 'blur(0)', easing: 'cubic-bezier(.45,0,.2,1)' },
    { transform: `translateY(${from * .45}px)`, filter: 'blur(1.4px)', offset: .45, easing: 'cubic-bezier(.1,.7,.3,1)' },
    { transform: 'translateY(3px)', filter: 'blur(0)', offset: .82, easing: 'ease-out' },
    { transform: 'translateY(0)', filter: 'blur(0)' }
  ], { duration: 720 });
}
let curTab = null;
function markTab(id, spin){
  tabs.forEach((a, i) => {
    const on = a.dataset.tab === id;
    if (on) {
      a.setAttribute('aria-current', 'page'); if (blob) blob.style.transform = `translateX(${i * 100}%)`;
      if (spin && curTab !== id) spinTab(a);
    }
    else a.removeAttribute('aria-current');
  });
  if (blob) blob.style.opacity = tabs.some(a => a.dataset.tab === id) ? '' : '0';
  curTab = id;
}
// allaqachon ochiq bo'lim qayta bosilsa ham baraban aylanadi
tabs.forEach(a => a.addEventListener('click', () => { if (a.dataset.tab === curTab) spinTab(a); }));
function showPanel(id, scroll){
  if (!panels.length) return;
  id = ALIAS[id] || id;
  if (!panels.some(p => p.id === id)) id = panels[0].id;
  panels.forEach(p => {
    p.hidden = p.id !== id;
    p.classList.toggle('swap', !!scroll && !p.hidden); // animatsiya faqat bo'lim almashganda
    if (p.hidden) p.querySelectorAll('video').forEach(v => v.pause());
    // video muqovalari faqat bo'lim ochilganda yuklanadi (bosh sahifa tezroq ochiladi)
    else p.querySelectorAll('.play[data-bg]').forEach(b => { b.style.backgroundImage = `url(${b.dataset.bg})`; b.removeAttribute('data-bg'); });
  });
  markTab(id, scroll);
  if (scroll) window.scrollTo({top: 0, behavior: 'smooth'});
}
if (panels.length) {
  showPanel(location.hash.slice(1), false);
  addEventListener('hashchange', () => showPanel(location.hash.slice(1), true));
} else if (tabbar) {
  markTab(tabbar.dataset.current || 'videolar');
}

/* ---------- Videolar: ijro, "Ko'rildi" belgisi ---------- */
const seen = new Set(store.get('bqi-seen', []));
document.querySelectorAll('.card[data-id]').forEach(c => {
  const b = c.querySelector('.badge.seen'); if (b && seen.has(c.dataset.id)) b.hidden = false;
});
const count = document.getElementById('v-count');
function paintCount(){
  if (!count) return;
  const n = document.querySelectorAll('#videolar .card').length;
  const s = [...document.querySelectorAll('#videolar .card[data-id]')].filter(c => seen.has(c.dataset.id)).length;
  count.textContent = t('app.count').replace('{n}', n) + (s ? t('app.countSeen').replace('{s}', s) : '');
}
onLang(paintCount);
document.querySelectorAll('.player').forEach(p => {
  const v = p.querySelector('video'), b = p.querySelector('.play');
  if (!v || !b) return;
  b.addEventListener('click', () => {
    document.querySelectorAll('video').forEach(o => { if (o !== v) o.pause(); });
    if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; // muqova faqat kerak bo'lganda yuklanadi
    b.hidden = true; v.play().catch(() => {});
  });
  v.addEventListener('ended', () => {
    const id = p.closest('[data-id]')?.dataset.id; if (!id) return;
    seen.add(id); store.set('bqi-seen', [...seen]);
    const badge = p.closest('[data-id]').querySelector('.badge.seen'); if (badge) badge.hidden = false;
    paintCount();
  });
});

/* ---------- Mavzular: "Kutaman" (shu qurilmada eslab qolinadi) ---------- */
const wants = new Set(store.get('bqi-wants', []));
let voteStats = null;          // serverdan: { voters, topics:{id:n}, pct:{id:%} }
const topicPainters = [];
function anonId(){
  let id = store.get('bqi-anon', '');
  if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); store.set('bqi-anon', id); }
  return id;
}
async function sendVote(topic, on){
  if (!VOTE_API) return;
  const W = window.Telegram && window.Telegram.WebApp;
  try {
    const r = await fetch(VOTE_API.replace(/\/$/, '') + '/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, on, initData: (W && W.initData) || '', anon: anonId() })
    });
    if (r.ok) { voteStats = await r.json(); topicPainters.forEach(f => f()); }
  } catch (e) {}
}
document.querySelectorAll('.topic[data-topic]').forEach(tp => {
  const btn = tp.querySelector('button'), lbl = tp.querySelector('.vote span'), id = tp.dataset.topic;
  // foiz chizig'i (server ulangan bo'lsa ko'rinadi)
  const meter = document.createElement('div');
  meter.className = 'meter'; meter.hidden = true;
  meter.innerHTML = '<span class="bar"><i></i></span><small></small>';
  tp.insertBefore(meter, tp.querySelector('.vote'));
  const paint = () => {
    const on = wants.has(id);
    btn.setAttribute('aria-pressed', on);
    btn.textContent = t(on ? 'app.wanted' : 'app.want');
    if (lbl) lbl.textContent = on ? t('app.onList') : '';
    if (voteStats && voteStats.topics) {
      const n = voteStats.topics[id] || 0, p = (voteStats.pct && voteStats.pct[id]) || 0;
      meter.hidden = false;
      meter.querySelector('i').style.width = p + '%';
      meter.querySelector('small').textContent = voteStats.voters ? t('app.pct').replace('{p}', p).replace('{n}', n) : t('app.pctNone');
    }
  };
  btn.addEventListener('click', () => {
    const on = !wants.has(id);
    on ? wants.add(id) : wants.delete(id);
    store.set('bqi-wants', [...wants]); paint();
    sendVote(id, on);
  });
  topicPainters.push(paint);
  onLang(paint);
});
if (VOTE_API && topicPainters.length) {
  fetch(VOTE_API.replace(/\/$/, '') + '/stats').then(r => r.ok ? r.json() : null)
    .then(s => {
      if (!s) return;
      voteStats = s; topicPainters.forEach(f => f());
      // server ulanishidan oldin bosilgan "Kutaman"larni bir marta yuboramiz
      if (!store.get('bqi-synced', false)) { store.set('bqi-synced', true); wants.forEach(id => sendVote(id, true)); }
    }).catch(() => {});
}

/* ---------- Aloqa havolalari ---------- */
document.querySelectorAll('.contact[data-link]').forEach(a => {
  const url = LINKS[a.dataset.link];
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  else {
    a.removeAttribute('href'); a.classList.add('soon');
    const s = a.querySelector('small');
    if (s) onLang(() => { s.textContent = t('app.soon'); });
  }
});

/* ---------- Telefonga ilova kabi o'rnatish ---------- */
const inst = document.getElementById('install');
if (inst) {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const txt = inst.querySelector('p'), btn = inst.querySelector('button');
  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (!standalone) inst.hidden = false; });
  if (ios && !standalone) {
    inst.hidden = false; btn.hidden = true;
    onLang(() => { txt.innerHTML = t('app.ios'); });
  }
  btn && btn.addEventListener('click', async () => {
    if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; inst.hidden = true;
  });
}

const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();

/* ---------- Yuklab olish: iPhone'da "Videoni saqlash", boshqa qurilmalarda oddiy yuklab olish ---------- */
document.querySelectorAll('.dl').forEach(btn => {
  const msg = btn.nextElementSibling, src = btn.dataset.src, name = btn.dataset.name;
  let file = null, msgKey = '';
  const say = k => { msgKey = k; msg.textContent = k ? t(k) : ''; };
  I.on(() => { if (msgKey) msg.textContent = t(msgKey); if (file) btn.textContent = t('app.dlAgain'); });
  const plain = () => { const a = document.createElement('a'); a.href = src; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  btn.addEventListener('click', async () => {
    const canFiles = !!(navigator.canShare && window.File);
    if (!canFiles) { plain(); say('app.dlPlain'); return; }
    if (file) {
      try {
        if (navigator.canShare({files:[file]})) { await navigator.share({files:[file]}); say(''); }
        else plain();
      } catch(e) { if (e && e.name === 'AbortError') say('app.dlCancel'); else plain(); }
      return;
    }
    btn.disabled = true; say('app.dlPrep');
    try {
      const r = await fetch(src); if (!r.ok) throw new Error('fetch');
      file = new File([await r.blob()], name, {type:'video/mp4'});
      btn.classList.add('ready'); btn.removeAttribute('data-t'); btn.textContent = t('app.dlAgain');
      say('app.dlHint');
    } catch(e) { say('app.dlFail'); }
    finally { btn.disabled = false; }
  });
});

/* ---------- Qisqa xabar (toast) ---------- */
let toastEl = null, toastTimer = 0;
function toast(text){
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = text;
  requestAnimationFrame(() => toastEl.classList.add('on'));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

/* ---------- Ulashish: telefonda tizim oynasi, bo'lmasa havola nusxalanadi ---------- */
document.querySelectorAll('.share[data-share]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const url = new URL(btn.dataset.share, location.href).href;
    const card = btn.closest('.card');
    const title = (card && card.querySelector('h3')) ? card.querySelector('h3').textContent.trim() : document.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast(t('sh.copied')); }
    catch (e) { toast(t('sh.fail')); }
  });
});

/* ---------- Qidiruv: videolar, 3D modellar va kutilayotgan mavzular bo'ylab ---------- */
const qIn = document.getElementById('q'), qRes = document.getElementById('s-res');
if (qIn && qRes) {
  const norm = x => x.toLowerCase().replace(/[ʻʼ’‘`']/g, "'").replace(/ё/g, 'е').trim();
  const text = (el, sel) => { const n = el.querySelector(sel); return n ? n.textContent.trim() : ''; };
  const attr = (el, sel, name) => { const n = el.querySelector(sel); return n ? n.getAttribute(name) : ''; };
  const items = () => [
    ...[...document.querySelectorAll('#videolar .card')].map(c => ({
      kind: 's.video', title: text(c, 'h3'), desc: text(c, '.desc'), href: attr(c, 'h3 a', 'href') || '#videolar', key: c.dataset.id || '' })),
    ...[...document.querySelectorAll('#lab .labcard')].map(c => ({
      kind: c.classList.contains('soon') ? 's.topic' : 's.lab', title: text(c, 'b'), desc: text(c, 'small'), href: c.getAttribute('href') || '#lab', key: c.getAttribute('href') || '' })),
    ...[...document.querySelectorAll('#mavzular .topic')].map(c => ({
      kind: 's.topic', title: text(c, 'b'), desc: text(c, 'small'), href: '#mavzular', key: c.dataset.topic || '' }))
  ];
  const esc = x => x.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const paint = () => {
    const q = norm(qIn.value);
    if (q.length < 2) { qRes.hidden = true; qRes.innerHTML = ''; return; }
    const words = q.split(/\s+/);
    const hits = items().map(it => {
      const ti = norm(it.title), all = ti + ' ' + norm(it.desc) + ' ' + norm(it.key);
      if (!words.every(w => all.includes(w))) return null;
      return { it, score: words.filter(w => ti.includes(w)).length };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
    qRes.innerHTML = hits.length
      ? hits.map(({ it }) => `<li><a href="${esc(it.href)}"><span><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></span><span class="tag${it.kind === 's.topic' ? ' gold' : ''}">${esc(t(it.kind))}</span></a></li>`).join('')
      : `<li class="s-none">${esc(t('s.none'))}</li>`;
    qRes.hidden = false;
  };
  qIn.addEventListener('input', paint);
  qIn.addEventListener('keydown', e => {
    if (e.key === 'Escape') { qIn.value = ''; paint(); }
    if (e.key === 'Enter') { const a = qRes.querySelector('a'); if (a) a.click(); }
  });
  // bo'limga o'tadigan natija bosilganda qidiruv tozalanadi
  qRes.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) { qIn.value = ''; paint(); } });
  I.on(paint);
}

/* ---------- "Bilasizmi?": har kuni boshqa fakt, tugma bilan keyingisi ---------- */
const factEl = document.getElementById('fact-text'), factBtn = document.getElementById('fact-next');
if (factEl && factBtn) {
  const FACTS = 8;
  let fi = Math.floor(Date.now() / 864e5) % FACTS;
  const show = anim => {
    const k = 'f.' + (fi + 1);
    factEl.dataset.t = k; // til almashganda i18n.js shu kalit bo'yicha tarjima qiladi
    factEl.textContent = t(k);
    if (anim && !calm) { factEl.classList.remove('flip'); void factEl.offsetWidth; factEl.classList.add('flip'); }
  };
  show(false);
  factBtn.addEventListener('click', () => { fi = (fi + 1) % FACTS; show(true); });
}

/* ---------- Test: 5 savol, eng yaxshi natija shu qurilmada saqlanadi ---------- */
const quiz = document.getElementById('quiz');
if (quiz) {
  const RIGHT = [0, 1, 1, 2, 0]; // har bir savolda to'g'ri javob tartib raqami (matnlar i18n.js da: qz.N.q/a/b/c/x)
  const N = RIGHT.length, L = ['a', 'b', 'c'];
  const $ = id => document.getElementById(id);
  const step = $('qz-step'), qEl = $('qz-q'), opts = $('qz-opts'), why = $('qz-why'), next = $('qz-next'), best = $('qz-best'), bar = quiz.querySelector('.qz-bar i');
  qEl.removeAttribute('data-t');
  let i = 0, score = 0, picked = -1, done = false;
  const fill = (k, o) => t(k).replace(/\{(\w+)\}/g, (m, x) => o[x]);
  const paintBest = () => {
    const b = store.get('bqi-quiz', null);
    best.hidden = b == null;
    if (b != null) best.textContent = fill('qz.best', { s: b, n: N });
  };
  const render = () => {
    paintBest();
    if (done) {
      bar.style.width = '100%';
      step.textContent = fill('qz.result', { s: score, n: N });
      qEl.innerHTML = `<span class="qz-score">${score}/${N}</span>`;
      opts.innerHTML = '';
      why.hidden = false; why.textContent = t(score === N ? 'qz.top' : score >= 3 ? 'qz.mid' : 'qz.low');
      next.hidden = false; next.textContent = t('qz.again');
      return;
    }
    const n = i + 1;
    bar.style.width = ((i + (picked >= 0 ? 1 : 0)) / N * 100) + '%';
    step.textContent = fill('qz.step', { i: n, n: N });
    qEl.textContent = t(`qz.${n}.q`);
    opts.innerHTML = '';
    L.forEach((l, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t(`qz.${n}.${l}`);
      if (picked >= 0) {
        b.disabled = true;
        if (k === RIGHT[i]) b.className = 'ok'; else if (k === picked) b.className = 'bad';
      } else b.addEventListener('click', () => {
        picked = k; if (k === RIGHT[i]) score++;
        render();
        next.focus({ preventScroll: true });
      });
      opts.appendChild(b);
    });
    why.hidden = picked < 0;
    if (picked >= 0) why.textContent = t(picked === RIGHT[i] ? 'qz.right' : 'qz.wrong') + ' ' + t(`qz.${n}.x`);
    next.hidden = picked < 0;
    next.textContent = t(i === N - 1 ? 'qz.finish' : 'qz.next');
  };
  next.addEventListener('click', () => {
    if (done) { i = 0; score = 0; picked = -1; done = false; }
    else if (i === N - 1) {
      done = true;
      const b = store.get('bqi-quiz', null);
      if (b == null || score > b) store.set('bqi-quiz', score);
    } else { i++; picked = -1; }
    render();
  });
  onLang(render);
}
