// Kanal havolalari: manzilni yozsangiz "Aloqa" bo'limida tugma ishlaydi, bo'sh qolsa "tez kunda" turadi.
const LINKS = {
  telegram: "https://t.me/buqanday_ishlaydi1",
  instagram: "",   // tayyor bo'lganda: "https://www.instagram.com/buqanday_.ishlaydi/"
  youtube: ""      // masalan: "https://youtube.com/@kanal_nomi"
};

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
  const greet = h < 5 ? 'Xayrli tun' : h < 11 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech';
  const hi = welcome.querySelector('.w-hi'); if (hi) hi.textContent = greet + '!';
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
function markTab(id){
  tabs.forEach((a, i) => {
    const on = a.dataset.tab === id;
    if (on) { a.setAttribute('aria-current', 'page'); if (blob) blob.style.transform = `translateX(${i * 100}%)`; }
    else a.removeAttribute('aria-current');
  });
}
function showPanel(id, scroll){
  if (!panels.length) return;
  if (!panels.some(p => p.id === id)) id = panels[0].id;
  panels.forEach(p => { p.hidden = p.id !== id; });
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
if (count) {
  const n = document.querySelectorAll('#videolar .card').length;
  const s = [...document.querySelectorAll('#videolar .card[data-id]')].filter(c => seen.has(c.dataset.id)).length;
  count.textContent = `${n} ta video` + (s ? ` · ${s} tasi ko'rildi` : '');
}
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
  });
});

/* ---------- Mavzular: "Kutaman" (shu qurilmada eslab qolinadi) ---------- */
const wants = new Set(store.get('bqi-wants', []));
document.querySelectorAll('.topic[data-topic]').forEach(t => {
  const btn = t.querySelector('button'), lbl = t.querySelector('.vote span'), id = t.dataset.topic;
  const paint = () => {
    const on = wants.has(id);
    btn.setAttribute('aria-pressed', on);
    btn.textContent = on ? '★ Kutyapman' : '☆ Kutaman';
    if (lbl) lbl.textContent = on ? 'Ro\'yxatingizda' : '';
  };
  btn.addEventListener('click', () => { wants.has(id) ? wants.delete(id) : wants.add(id); store.set('bqi-wants', [...wants]); paint(); });
  paint();
});

/* ---------- Aloqa havolalari ---------- */
document.querySelectorAll('.contact[data-link]').forEach(a => {
  const url = LINKS[a.dataset.link];
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  else { a.removeAttribute('href'); a.classList.add('soon'); const s = a.querySelector('small'); if (s) s.textContent = 'Tez kunda'; }
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
    txt.innerHTML = 'Safari\'da pastdagi <b>Ulashish</b> tugmasini, keyin <b>"Bosh ekranga qo\'shish"</b> ni bosing.';
  }
  btn && btn.addEventListener('click', async () => {
    if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; inst.hidden = true;
  });
}

const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();

/* ---------- Yuklab olish: iPhone'da "Videoni saqlash", boshqa qurilmalarda oddiy yuklab olish ---------- */
document.querySelectorAll('.dl').forEach(btn => {
  const msg = btn.nextElementSibling, src = btn.dataset.src, name = btn.dataset.name;
  let file = null;
  const plain = () => { const a = document.createElement('a'); a.href = src; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  btn.addEventListener('click', async () => {
    const canFiles = !!(navigator.canShare && window.File);
    if (!canFiles) { plain(); msg.textContent = "Yuklab olinmoqda… Fayl \"Yuklanmalar\" papkasida bo'ladi."; return; }
    if (file) {
      try {
        if (navigator.canShare({files:[file]})) { await navigator.share({files:[file]}); msg.textContent = ''; }
        else plain();
      } catch(e) { if (e && e.name === 'AbortError') msg.textContent = 'Bekor qilindi.'; else plain(); }
      return;
    }
    btn.disabled = true; msg.textContent = 'Video tayyorlanmoqda…';
    try {
      const r = await fetch(src); if (!r.ok) throw new Error('fetch');
      file = new File([await r.blob()], name, {type:'video/mp4'});
      btn.classList.add('ready'); btn.textContent = 'Saqlash uchun yana bosing';
      msg.textContent = 'Ochilgan oynada "Videoni saqlash" (Save Video) ni tanlang.';
    } catch(e) { msg.textContent = "Video yuklanmadi, internetni tekshirib qayta bosing."; }
    finally { btn.disabled = false; }
  });
});
