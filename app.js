// Kanal havolalari: manzilni yozsangiz "Aloqa" bo'limida tugma ishlaydi, bo'sh qolsa "tez kunda" turadi.
const LINKS = {
  telegram: "https://t.me/buqanday_ishlaydi1",
  instagram: "",   // tayyor bo'lganda: "https://www.instagram.com/buqanday_.ishlaydi/"
  youtube: ""      // masalan: "https://youtube.com/@kanal_nomi"
};

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
function markTab(id){
  tabs.forEach((a, i) => {
    const on = a.dataset.tab === id;
    if (on) { a.setAttribute('aria-current', 'page'); if (blob) blob.style.transform = `translateX(${i * 100}%)`; }
    else a.removeAttribute('aria-current');
  });
  if (blob) blob.style.opacity = tabs.some(a => a.dataset.tab === id) ? '' : '0';
}
function showPanel(id, scroll){
  if (!panels.length) return;
  id = ALIAS[id] || id;
  if (!panels.some(p => p.id === id)) id = panels[0].id;
  panels.forEach(p => {
    p.hidden = p.id !== id;
    if (p.hidden) p.querySelectorAll('video').forEach(v => v.pause());
  });
  markTab(id);
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
document.querySelectorAll('.topic[data-topic]').forEach(tp => {
  const btn = tp.querySelector('button'), lbl = tp.querySelector('.vote span'), id = tp.dataset.topic;
  const paint = () => {
    const on = wants.has(id);
    btn.setAttribute('aria-pressed', on);
    btn.textContent = t(on ? 'app.wanted' : 'app.want');
    if (lbl) lbl.textContent = on ? t('app.onList') : '';
  };
  btn.addEventListener('click', () => { wants.has(id) ? wants.delete(id) : wants.add(id); store.set('bqi-wants', [...wants]); paint(); });
  onLang(paint);
});

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
