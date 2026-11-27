// ★★★ VERSIYA 8 — Protos AI: alohida sayt (Google bilan kirish, so'mdagi balans, Click/Payme) + bot + admin panel ★★★
/* "Protos AI" (Toby Land loyihasi) — AI studiya boti (Cloudflare Worker).

   Nima qiladi:
   - Bot ichida rasm va video yaratadi (fal.ai orqali):
       Oddiy:   Nano Banana 2, Kling 2.5 Turbo, Veo 3.1 Fast
       Premium: Nano Banana Pro, Kling 3.0 Pro, Seedance 2.0 (Fast va to'liq), Veo 3.1, Sora 2 Pro
   - Har bir ishning narxi Telegram Stars'da. Foydalanuvchi balansni Stars bilan to'ldiradi, har bir ish uchun yechiladi,
     xato bo'lsa avtomatik qaytariladi. /balans — balans, /paysupport — to'lov bo'yicha yordam.
   - /start yoki /ai — «🎬 AI studiya» Mini App'ini ochadi (sayt/ai/).
   - ALOHIDA SAYT (protos/studio/): Telegram'siz. Google akkaunt bilan kirish, balans so'mda, to'lov Click va Payme orqali.
     Sayt foydalanuvchilari ("g:..." ID) bot foydalanuvchilaridan alohida: o'z balansi, o'z tarixi.

   Sayt uchun sozlamalar (Settings → Variables and Secrets):
     GOOGLE_CLIENT_ID   — Google Cloud'dan olingan OAuth Client ID (Text)  ← busiz saytga kirib bo'lmaydi
     ADMIN_EMAIL        — (ixtiyoriy) sizning Gmail'ingiz: saytda siz bepul yaratasiz (Text)
     UZS_PER_USD        — (ixtiyoriy) 1 dollar necha so'm, standart 12800 (Text)
     PAYME_MERCHANT_ID  — Payme kassa ID (Text)            ┐ Payme ulanganda
     PAYME_KEY          — Payme kassa kaliti (Secret)       │ Payme kabinetida "endpoint": https://<worker>/pay/payme
     PAYME_TEST         — (ixtiyoriy) 1 = Payme test rejimi ┘
     CLICK_SERVICE_ID   — Click servis ID (Text)            ┐ Click ulanganda
     CLICK_MERCHANT_ID  — Click merchant ID (Text)          │ Prepare URL:  https://<worker>/pay/click/prepare
     CLICK_SECRET_KEY   — Click maxfiy kalit (Secret)       ┘ Complete URL: https://<worker>/pay/click/complete
   - Tayyor rasm/video botga ham yuboriladi (Mini App yopilgan bo'lsa ham).
   - /id — Telegram ID raqamingizni aytadi (ADMIN_ID uchun kerak).
   - /admin — faqat egasi uchun: statistika, foydalanuvchilar, balans qo'shish, botni hamma uchun ochish.
   - Hozircha faqat ruxsat berilgan odamlar ishlata oladi (ADMIN_ID va ALLOWED_IDS).

   Cloudflare sozlamalari (Settings → Variables and Secrets):
     BOT_TOKEN       — BotFather bergan token (Secret)
     WEBHOOK_SECRET  — o'zingiz o'ylab topgan uzun so'z (Secret)
     ADMIN_ID        — /id buyrug'i bergan raqam (Text)
     FAL_KEY         — fal.ai'dan olingan API kalit (Secret)  ← busiz AI ishlamaydi
     ALLOWED_IDS     — (ixtiyoriy) vergul bilan Telegram ID'lar, masalan: 111,222 (Text)
     DAILY_LIMIT     — (ixtiyoriy) bir kishi kuniga nechta yarata oladi, standart 30 (Text)
     MARKUP_STD      — (ixtiyoriy) oddiy modellar ustamasi, standart 1.6 = +60% (Text)
     MARKUP_PRO      — (ixtiyoriy) premium modellar ustamasi, standart 2.2 = +120% (Text)
     PUBLIC          — (ixtiyoriy) 1 qilsangiz hamma ishlata oladi (balansdan to'lab). Bo'lmasa faqat ADMIN_ID va ALLOWED_IDS (Text)
     ADMIN_PAYS      — (ixtiyoriy) 1 qilsangiz egasi ham balansdan to'laydi (sinash uchun). Standart: egasi bepul (Text)
     STAR_USD        — (ixtiyoriy) 1 Star sizga necha dollar bo'lib qaytadi, standart 0.01 (Text)
   Bindings → KV namespace: nomi VOTES (ishlar tarixi shu yerda saqlanadi)

   Keyin brauzerda bir marta oching: https://<worker-manzili>/setup?key=<WEBHOOK_SECRET>
*/

const SITE = 'https://mamarajabovd31-creator.github.io/Bu-qanday-ishlaydi/';
const CHANNEL = 'https://t.me/tobyland_uz';
const WEBSITE = SITE + 'protos/';

/* ---------------- Yordamchilar ---------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data, X-Session'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function tg(env, method, body){
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({ ok: false }));
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
// Telegram Mini App ma'lumotini tekshirish: so'rov haqiqatan shu foydalanuvchidan kelganini bildiradi
async function verifyInitData(initData, token){
  if (!initData || !token) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const enc = new TextEncoder();
  const k1 = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', k1, enc.encode(token));
  const k2 = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  if (hex(await crypto.subtle.sign('HMAC', k2, enc.encode(check))) !== hash) return null;
  const age = Date.now() / 1000 - Number(p.get('auth_date') || 0);
  if (!(age < 86400 * 7)) return null; // bir haftadan eski ma'lumot qabul qilinmaydi
  try { return JSON.parse(p.get('user') || 'null'); } catch (e) { return null; }
}

/* ---------------- Sayt orqali kirish (Telegram Login) ---------------- */
// Telegram Login tugmasi bergan ma'lumotni tekshiradi (https://core.telegram.org/widgets/login)
async function verifyLogin(d, token){
  if (!d || !d.hash || !d.id || !token) return null;
  const check = Object.keys(d).filter(k => k !== 'hash' && d[k] != null && d[k] !== '').sort().map(k => `${k}=${d[k]}`).join('\n');
  const enc = new TextEncoder();
  const secret = await crypto.subtle.digest('SHA-256', enc.encode(token));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  if (hex(await crypto.subtle.sign('HMAC', key, enc.encode(check))) !== String(d.hash)) return null;
  if (!(Date.now() / 1000 - Number(d.auth_date || 0) < 86400)) return null;
  return { id: Number(d.id), first_name: d.first_name || '', last_name: d.last_name || '', username: d.username || '', photo_url: d.photo_url || '' };
}
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function sessKey(env){
  const raw = new TextEncoder().encode('protos-web:' + (env.WEBHOOK_SECRET || '') + ':' + (env.BOT_TOKEN || ''));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
// Saytga kirgan odamga 30 kunlik imzolangan "kalit" beriladi
async function makeSession(env, u){
  const body = b64u(new TextEncoder().encode(JSON.stringify({ id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, email: u.email || '', exp: Date.now() + 30 * 86400e3 })));
  const sig = b64u(new Uint8Array(await crypto.subtle.sign('HMAC', await sessKey(env), new TextEncoder().encode(body))));
  return body + '.' + sig;
}
async function readSession(env, tok){
  try {
    const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
    const good = b64u(new Uint8Array(await crypto.subtle.sign('HMAC', await sessKey(env), new TextEncoder().encode(body))));
    if (good !== sig) return null;
    const u = JSON.parse(new TextDecoder().decode(unb64u(body)));
    return u && u.id && u.exp > Date.now() ? u : null;
  } catch (e) { return null; }
}
async function webLogin(req, env){
  let d; try { d = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const u = await verifyLogin(d, env.BOT_TOKEN);
  if (!u) return json({ error: 'auth', msg: "Telegram orqali kirishni tasdiqlab bo'lmadi. Qayta urinib ko'ring." }, 401);
  await touchUser(env, u).catch(() => {});
  return json({ token: await makeSession(env, u), user: { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' '), username: u.username, photo: u.photo_url } });
}

/* ---------------- AI studiya (fal.ai) ---------------- */
const AI_APP = SITE + 'ai/';
const FAL_QUEUE = 'https://queue.fal.run/';

// Modellar: Mini App shu kalitlarni yuboradi. Rasm yuklangan bo'lsa "img" yo'li ishlatiladi.
// cost(b) — fal.ai sizdan oladigan taxminiy narx (dollar). Sotuv narxi Stars'da shundan hisoblanadi.
// tier: 'std' — oddiy, 'pro' — premium (ustamasi kattaroq).
const sec = (b, d) => Number(String(b.duration || d).replace('s', '')) || Number(d);
const AI_MODELS = {
  /* ---------- Oddiy ---------- */
  'nano': {
    name: 'Nano Banana 2', kind: 'image', tier: 'std', desc: 'Rasm · tez va arzon',
    text: 'fal-ai/nano-banana-2', img: 'fal-ai/nano-banana-2/edit',
    aspects: ['auto', '1:1', '9:16', '16:9', '4:5', '3:4', '4:3'],
    res: ['1K', '2K'], cost: b => b.res === '2K' ? 0.06 : 0.04,
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', num_images: 1, resolution: b.res || '1K', output_format: 'jpeg', ...(img ? { image_urls: [img] } : {}) })
  },
  'seedream': {
    name: 'Seedream 4.5', kind: 'image', tier: 'std', desc: 'Rasm · multfilm va illyustratsiya',
    text: 'fal-ai/bytedance/seedream/v4.5/text-to-image', img: 'fal-ai/bytedance/seedream/v4.5/edit',
    aspects: ['auto', '1:1', '9:16', '16:9', '3:4', '4:3'],
    cost: () => 0.04,
    build: (b, img) => ({
      prompt: b.prompt, num_images: 1,
      image_size: ({ 'auto': 'auto_2K', '1:1': 'square_hd', '9:16': 'portrait_16_9', '16:9': 'landscape_16_9', '3:4': 'portrait_4_3', '4:3': 'landscape_4_3' })[b.aspect || 'auto'] || 'auto_2K',
      ...(img ? { image_urls: [img] } : {})
    })
  },
  'kling': {
    name: 'Kling 2.5 Turbo', kind: 'video', tier: 'std', desc: 'Video · arzon, ovozsiz',
    text: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', img: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    aspects: ['9:16', '16:9', '1:1'], durations: ['5', '10'], imgAspect: false,
    cost: b => 0.07 * sec(b, 5),
    build: (b, img) => img
      ? { prompt: b.prompt, image_url: img, duration: b.duration || '5' }
      : { prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: b.duration || '5' }
  },
  'veo-fast': {
    name: 'Veo 3.1 Fast', kind: 'video', tier: 'std', desc: 'Video · Google, ovozli',
    text: 'fal-ai/veo3.1/fast', img: 'fal-ai/veo3.1/fast/image-to-video',
    aspects: ['9:16', '16:9'], durations: ['4', '6', '8'], audio: true,
    cost: b => (b.audio === false ? 0.10 : 0.15) * sec(b, 8), // 720p va 1080p narxi bir xil
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: (b.duration || '8') + 's', resolution: '1080p', generate_audio: b.audio !== false, ...(img ? { image_url: img } : {}) })
  },
  /* ---------- Premium ---------- */
  'nano-pro': {
    name: 'Nano Banana Pro', kind: 'image', tier: 'pro', desc: 'Rasm · eng sifatli',
    text: 'fal-ai/nano-banana-pro', img: 'fal-ai/nano-banana-pro/edit',
    aspects: ['auto', '1:1', '9:16', '16:9', '4:5', '3:4', '4:3'],
    cost: () => 0.15,
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', num_images: 1, output_format: 'jpeg', ...(img ? { image_urls: [img] } : {}) })
  },
  'kling3': {
    name: 'Kling 3.0 Pro', kind: 'video', tier: 'pro', desc: 'Video · kinematografik, ovozli',
    text: 'fal-ai/kling-video/v3/pro/text-to-video', img: 'fal-ai/kling-video/v3/pro/image-to-video',
    aspects: ['9:16', '16:9', '1:1'], durations: ['5', '10', '15'], audio: true, imgAspect: false,
    cost: b => (b.audio === false ? 0.112 : 0.168) * sec(b, 5),
    build: (b, img) => img
      ? { prompt: b.prompt, start_image_url: img, duration: b.duration || '5', generate_audio: b.audio !== false }
      : { prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: b.duration || '5', generate_audio: b.audio !== false }
  },
  'seedance': {
    name: 'Seedance 2.0 Fast', kind: 'video', tier: 'pro', desc: 'Video · ovozli, harakat zo\'r',
    text: 'bytedance/seedance-2.0/fast/text-to-video', img: 'bytedance/seedance-2.0/fast/image-to-video',
    aspects: ['auto', '9:16', '16:9', '1:1', '3:4', '4:3'], durations: ['5', '8', '10'],
    cost: b => 0.242 * sec(b, 5),
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', duration: b.duration || '5', resolution: '720p', generate_audio: true, ...(img ? { image_url: img } : {}) })
  },
  'seedance-pro': {
    name: 'Seedance 2.0', kind: 'video', tier: 'pro', desc: 'Video · eng yaxshi sifat',
    text: 'bytedance/seedance-2.0/text-to-video', img: 'bytedance/seedance-2.0/image-to-video',
    aspects: ['auto', '9:16', '16:9', '1:1', '3:4', '4:3'], durations: ['5', '8', '10'],
    res: ['720p', '1080p'], cost: b => (b.res === '1080p' ? 0.682 : 0.304) * sec(b, 5),
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', duration: b.duration || '5', resolution: b.res || '720p', generate_audio: true, ...(img ? { image_url: img } : {}) })
  },
  'veo': {
    name: 'Veo 3.1', kind: 'video', tier: 'pro', desc: 'Video · Google, eng real',
    text: 'fal-ai/veo3.1', img: 'fal-ai/veo3.1/image-to-video',
    aspects: ['9:16', '16:9'], durations: ['4', '6', '8'], audio: true,
    cost: b => (b.audio === false ? 0.20 : 0.40) * sec(b, 8),
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: (b.duration || '8') + 's', resolution: '1080p', generate_audio: b.audio !== false, ...(img ? { image_url: img } : {}) })
  },
  /* ---------- Ovoz (faqat botda: /ovoz) ---------- */
  'voice': {
    name: 'ElevenLabs ovoz', kind: 'audio', tier: 'std', desc: 'Ovoz · matndan diktor ovozi',
    text: 'fal-ai/elevenlabs/tts/multilingual-v2', aspects: ['auto'], maxText: 10000,
    cost: b => Math.max(0.01, 0.10 * String(b.prompt || '').length / 1000), // fal.ai: $0.10 / 1000 belgi
    build: b => ({ text: b.prompt, voice: (VOICES[String(b.voice || '').toLowerCase()] || VOICES.daniel).id, stability: 0.5, similarity_boost: 0.75, speed: 1,
      apply_text_normalization: 'auto', ...(b.lang ? { language_code: b.lang } : {}) })
  },
  'sora': {
    name: 'Sora 2 Pro', kind: 'video', tier: 'pro', desc: 'Video · OpenAI, hikoya',
    text: 'fal-ai/sora-2/text-to-video/pro', img: 'fal-ai/sora-2/image-to-video/pro',
    aspects: ['9:16', '16:9'], durations: ['4', '8', '12'],
    res: ['720p', '1080p'], cost: b => (b.res === '1080p' ? 0.50 : 0.30) * sec(b, 4),
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: Number(b.duration || 4), resolution: b.res || '720p', ...(img ? { image_url: img } : {}) })
  }
};

// Sotuv narxi (Telegram Stars). 1 Star sizga taxminan STAR_USD dollar bo'lib qaytadi.
// Ustama: oddiy modellarga MARKUP_STD (standart 1.6), premiumga MARKUP_PRO (standart 2.2).
function priceStars(env, m, b){
  const starUsd = Number(env.STAR_USD || 0.01);
  const mk = Number(m.tier === 'pro' ? (env.MARKUP_PRO || 2.2) : (env.MARKUP_STD || 1.6));
  return Math.max(1, Math.ceil(m.cost(b) * mk / starUsd));
}

const isAdmin = (env, uid) => String(uid) === String(env.ADMIN_ID || '');

// /ovoz uchun ovozlar (ElevenLabs tayyor ovozlari) va tillar
const VOICES = {
  daniel: { id: 'Daniel', d: "erkak, yangiliklar diktori — hujjatli film uchun" },
  george: { id: 'George', d: "erkak, iliq hikoyachi" },
  brian: { id: 'Brian', d: "erkak, chuqur ovoz" },
  bill: { id: 'Bill', d: "erkak, keksa, salobatli" },
  charlotte: { id: 'Charlotte', d: "ayol, yumshoq" },
  alice: { id: 'Alice', d: "ayol, aniq va jiddiy" }
};
const LANGS = { de: 'nemischa', ru: 'ruscha', en: 'inglizcha' };
const getBal = async (env, uid) => Number(await env.VOTES.get('bal:' + uid) || 0);
const setBal = (env, uid, v) => { const n = Math.max(0, Math.round(v)); return env.VOTES.put('bal:' + uid, String(n), { metadata: { v: n } }); };
async function addBal(env, uid, delta){ const v = (await getBal(env, uid)) + delta; await setBal(env, uid, v); return Math.max(0, v); }
// To'ldirish paketlari (Stars)
const PACKS = [100, 300, 500, 1000, 2500];

function allowedIds(env){
  return new Set([env.ADMIN_ID, ...String(env.ALLOWED_IDS || '').split(',')].map(s => String(s || '').trim()).filter(Boolean));
}
// Mini App so'rovi: Telegram foydalanuvchisini tekshiradi va ruxsatini ko'radi
// Foydalanuvchilarni eslab qolish (admin panel uchun). Yozish kam bo'lsin: 6 soatda bir marta yangilanadi.
async function touchUser(env, u){
  if (!u || !u.id) return;
  const key = 'user:' + u.id, now = Date.now();
  const old = await env.VOTES.getWithMetadata(key).catch(() => null);
  const md = (old && old.metadata) || null;
  if (md && now - (md.l || 0) < 6 * 3600 * 1000) return;
  const meta = { n: String([u.first_name, u.last_name].filter(Boolean).join(' ')).slice(0, 60), un: String(u.username || '').slice(0, 40), f: (md && md.f) || now, l: now };
  await env.VOTES.put(key, '1', { metadata: meta });
}
// "Hamma uchun ochiq" rejimi: Cloudflare'dagi PUBLIC=1 yoki admin paneldagi tugma
async function isPublic(env){ return env.PUBLIC === '1' || (await env.VOTES.get('cfg:public')) === '1'; }

async function aiUser(req, env, bodyInit){
  // 1) Telegram ichidan (Mini App) yoki 2) saytdan (Telegram bilan kirgan, X-Session)
  const user = (await verifyInitData(bodyInit || req.headers.get('X-Init-Data'), env.BOT_TOKEN)) || (await readSession(env, req.headers.get('X-Session')));
  if (!user || !user.id) return { err: json({ error: 'auth', msg: "Avval Telegram orqali kiring" }, 401) };
  await touchUser(env, user).catch(() => {});
  if (!isWeb(user.id) && !allowedIds(env).has(String(user.id)) && !(await isPublic(env))) return { err: json({ error: 'denied', msg: "Hozircha bu bo'lim yopiq. Tez orada hamma uchun ochiladi!" }, 403) };
  return { user };
}

/* ---------------- Admin panel (faqat ADMIN_ID) ---------------- */
async function adminUser(req, env, bodyInit){
  const user = await verifyInitData(bodyInit || req.headers.get('X-Init-Data'), env.BOT_TOKEN);
  if (!user || !user.id) return { err: json({ error: 'auth', msg: 'Telegram ichida oching' }, 401) };
  if (!isAdmin(env, user.id)) return { err: json({ error: 'denied', msg: "Bu sahifa faqat bot egasi uchun" }, 403) };
  return { user };
}
// KV'dagi kalitlarni metadata bilan o'qish (sahifalab)
async function listAll(env, prefix, max = 20000){
  const out = []; let cursor;
  do {
    const r = await env.VOTES.list({ prefix, cursor, limit: 1000 });
    out.push(...r.keys); cursor = r.list_complete ? null : r.cursor;
  } while (cursor && out.length < max);
  return out;
}
const dayOf = t => new Date(t + 5 * 3600 * 1000).toISOString().slice(0, 10); // Toshkent vaqti (UTC+5)

async function adminStats(req, env){
  const a = await adminUser(req, env); if (a.err) return a.err;
  const starUsd = Number(env.STAR_USD || 0.01);
  const [jobKeys, payKeys, userKeys] = await Promise.all([listAll(env, 'job:'), listAll(env, 'pay:'), listAll(env, 'user:')]);
  // Eski ishlarda (admin paneldan oldin) metadata yo'q — ularni o'qib olamiz (ko'pi bilan 300 ta)
  let fill = 0;
  const jobs = await Promise.all(jobKeys.map(async k => {
    if (k.metadata && k.metadata.t) return k.metadata;
    if (fill++ > 300) return null;
    const j = await env.VOTES.get(k.name, 'json'); if (!j) return null;
    return { u: j.uid, m: j.model, k: j.kind, c: j.cost || 0, s: j.charged || 0, st: j.status, t: j.created, w: j.withImage ? 1 : 0 };
  }));
  const pays = await Promise.all(payKeys.map(async k => {
    if (k.metadata && k.metadata.t) return k.metadata;
    const p = await env.VOTES.get(k.name, 'json'); return p ? { u: p.uid, a: p.amount, t: p.at } : null;
  }));
  const now = Date.now(), today = dayOf(now), DAY = 86400000;
  const ranges = { today: d => d === today, d7: (d, t) => now - t < 7 * DAY, d30: (d, t) => now - t < 30 * DAY, all: () => true };
  const blank = () => ({ jobs: 0, images: 0, videos: 0, errors: 0, cost: 0, stars: 0, paid: 0, payments: 0, active: new Set(), newUsers: 0 });
  const R = Object.fromEntries(Object.keys(ranges).map(k => [k, blank()]));
  const models = {}, series = {};
  for (let i = 13; i >= 0; i--) series[dayOf(now - i * DAY)] = { jobs: 0, cost: 0, stars: 0, paid: 0 };
  for (const j of jobs) {
    if (!j || !j.t) continue;
    const d = dayOf(j.t), err = j.st === 'error';
    for (const [k, f] of Object.entries(ranges)) if (f(d, j.t)) {
      const r = R[k]; r.jobs++; if (j.k === 'video') r.videos++; else if (j.k !== 'audio') r.images++;
      if (err) r.errors++; else { r.cost += j.c || 0; r.stars += j.s || 0; }
      r.active.add(String(j.u));
    }
    if (now - j.t < 30 * DAY) {
      const m = models[j.m] || (models[j.m] = { name: AI_MODELS[j.m] ? AI_MODELS[j.m].name : j.m, kind: j.k, jobs: 0, errors: 0, cost: 0, stars: 0 });
      m.jobs++; if (err) m.errors++; else { m.cost += j.c || 0; m.stars += j.s || 0; }
    }
    if (series[d]) { series[d].jobs++; if (!err) { series[d].cost += j.c || 0; series[d].stars += j.s || 0; } }
  }
  for (const p of pays) {
    if (!p || !p.t) continue; const d = dayOf(p.t);
    for (const [k, f] of Object.entries(ranges)) if (f(d, p.t)) { R[k].paid += p.a || 0; R[k].payments++; }
    if (series[d]) series[d].paid += p.a || 0;
  }
  for (const u of userKeys) {
    const f = u.metadata && u.metadata.f; if (!f) continue;
    for (const [k, fn] of Object.entries(ranges)) if (fn(dayOf(f), f)) R[k].newUsers++;
  }
  const r2 = x => Math.round(x * 1000) / 1000;
  const out = {};
  for (const [k, r] of Object.entries(R)) {
    const revenue = r.stars * starUsd;
    out[k] = { jobs: r.jobs, images: r.images, videos: r.videos, errors: r.errors, cost: r2(r.cost), stars: r.stars, revenue: r2(revenue),
      profit: r2(revenue - r.cost), paid: r.paid, paidUsd: r2(r.paid * starUsd), payments: r.payments, active: r.active.size, newUsers: r.newUsers };
  }
  // oxirgi 12 ta ish (to'liq ma'lumot bilan)
  const recentKeys = jobKeys.filter(k => k.metadata && k.metadata.t).sort((x, y) => y.metadata.t - x.metadata.t).slice(0, 12);
  const recent = (await Promise.all(recentKeys.map(k => env.VOTES.get(k.name, 'json')))).filter(Boolean).map(j => ({
    id: j.id, uid: j.uid, model: AI_MODELS[j.model] ? AI_MODELS[j.model].name : j.model, kind: j.kind, prompt: String(j.prompt || '').slice(0, 140),
    status: j.status, cost: j.cost || 0, stars: j.charged || 0, created: j.created, url: (j.urls || [])[0] || '', error: String(j.error || '').slice(0, 160)
  }));
  return json({ ranges: out, models: Object.values(models).map(m => ({ ...m, cost: r2(m.cost) })).sort((x, y) => y.jobs - x.jobs),
    series: Object.entries(series).map(([d, v]) => ({ d, ...v, cost: r2(v.cost) })), recent, totals: { users: userKeys.length },
    config: { public: await isPublic(env), publicEnv: env.PUBLIC === '1', starUsd, markup: { std: Number(env.MARKUP_STD || 1.6), pro: Number(env.MARKUP_PRO || 2.2) }, dailyLimit: Number(env.DAILY_LIMIT || 30), allowed: [...allowedIds(env)] } });
}

async function adminUsers(req, env){
  const a = await adminUser(req, env); if (a.err) return a.err;
  const [userKeys, balKeys, jobKeys] = await Promise.all([listAll(env, 'user:'), listAll(env, 'bal:'), listAll(env, 'job:')]);
  const users = {};
  const U = id => users[id] || (users[id] = { id, name: '', username: '', first: 0, last: 0, balance: 0, jobs: 0, cost: 0, stars: 0 });
  for (const k of userKeys) { const id = k.name.slice(5), m = k.metadata || {}; Object.assign(U(id), { name: m.n || '', username: m.un || '', first: m.f || 0, last: m.l || 0 }); }
  await Promise.all(balKeys.map(async k => {
    const id = k.name.slice(4);
    U(id).balance = k.metadata && typeof k.metadata.v === 'number' ? k.metadata.v : Number(await env.VOTES.get(k.name) || 0);
  }));
  for (const k of jobKeys) { const m = k.metadata; if (!m || !m.u) continue; const u = U(String(m.u)); u.jobs++; if (m.st !== 'error') { u.cost += m.c || 0; u.stars += m.s || 0; } if ((m.t || 0) > u.last) u.last = m.t; }
  const list = Object.values(users).map(u => ({ ...u, cost: Math.round(u.cost * 1000) / 1000, admin: isAdmin(env, u.id) })).sort((x, y) => (y.last || 0) - (x.last || 0));
  return json({ users: list.slice(0, 500), total: list.length });
}

async function adminBalance(req, env){
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const a = await adminUser(req, env, b.initData); if (a.err) return a.err;
  const rawId = String(b.uid || '').trim(), uid = /^g:\d+$/.test(rawId) ? rawId : rawId.replace(/\D/g, ''), delta = Math.round(Number(b.delta));
  if (!uid || !Number.isFinite(delta) || !delta || Math.abs(delta) > 100000) return json({ error: 'bad', msg: "Foydalanuvchi ID va miqdorni to'g'ri kiriting" }, 400);
  const bal = await addBal(env, uid, delta);
  await env.VOTES.put('adm:' + Date.now() + ':' + uid, JSON.stringify({ uid, delta, by: a.user.id }), { expirationTtl: 86400 * 365, metadata: { u: uid, d: delta, t: Date.now() } });
  if (b.notify !== false && delta > 0 && !isWeb(uid))
    await tg(env, 'sendMessage', { chat_id: uid, parse_mode: 'HTML', text: `🎁 Balansingizga <b>+${delta} ⭐</b> qo'shildi!\nHozirgi balans: <b>${bal} ⭐</b>` }).catch(() => {});
  return json({ ok: true, uid, balance: bal });
}

async function adminConfig(req, env){
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const a = await adminUser(req, env, b.initData); if (a.err) return a.err;
  if (typeof b.public === 'boolean') await env.VOTES.put('cfg:public', b.public ? '1' : '0');
  return json({ ok: true, public: await isPublic(env), publicEnv: env.PUBLIC === '1' });
}

// fal javobidan rasm/video manzillarini ajratib olish
function falUrls(out){
  if (!out) return [];
  if (out.video && out.video.url) return [out.video.url];
  if (out.audio && out.audio.url) return [out.audio.url];
  if (Array.isArray(out.images)) return out.images.map(i => i && i.url).filter(Boolean);
  if (out.image && out.image.url) return [out.image.url];
  return [];
}

async function sendResult(env, job){
  if (job.sent) return;
  job.sent = true;
  if (isWeb(job.uid)) return; // sayt foydalanuvchisi natijani saytda ko'radi
  if (job.kind === 'audio') {
    const cap = `🎙 <b>Ovoz tayyor</b> · ${esc(job.voice || '')} · ${(job.prompt || '').length} belgi\n<i>${esc(job.prompt).slice(0, 300)}${(job.prompt || '').length > 300 ? '…' : ''}</i>`;
    for (const u of job.urls || []) {
      const r = await tg(env, 'sendAudio', { chat_id: job.uid, audio: u, caption: cap, parse_mode: 'HTML', title: 'Protos ovoz — ' + (job.voice || ''), performer: 'Protos AI' });
      if (!r.ok) await tg(env, 'sendMessage', { chat_id: job.uid, parse_mode: 'HTML', text: `${cap}\n\n⬇️ <a href="${esc(u)}">MP3 yuklab olish</a>` });
    }
    return;
  }
  const cap = `${job.kind === 'video' ? '🎬' : '🖼'} <b>${esc(AI_MODELS[job.model] ? AI_MODELS[job.model].name : job.model)}</b>\n${esc(job.prompt).slice(0, 900)}`;
  for (const u of job.urls || []) {
    const r = await tg(env, job.kind === 'video' ? 'sendVideo' : 'sendPhoto', {
      chat_id: job.uid, parse_mode: 'HTML', caption: cap,
      [job.kind === 'video' ? 'video' : 'photo']: u,
      ...(job.kind === 'video' ? { supports_streaming: true } : {})
    });
    if (!r.ok) await tg(env, 'sendMessage', { chat_id: job.uid, parse_mode: 'HTML', text: `${cap}\n\n⬇️ <a href="${esc(u)}">Yuklab olish</a>` });
  }
}

// Xato bo'lsa: yechilgan Stars balansga qaytadi va foydalanuvchiga xabar boradi
async function failNotice(env, job){
  let back = '';
  if (job.charged && !job.refunded) { job.refunded = true; await addBal(env, job.uid, job.charged); back = `\n↩️ ${job.charged} ⭐ balansingizga qaytarildi.`; }
  if (isWeb(job.uid)) return;
  await tg(env, 'sendMessage', { chat_id: job.uid, text: `❌ Yaratib bo'lmadi: ${String(job.error).slice(0, 300)}${back}` });
}

const saveJob = (env, job) => env.VOTES.put('job:' + job.id, JSON.stringify(job), { expirationTtl: 86400 * 60,
  metadata: { u: job.uid, m: job.model, k: job.kind, c: job.cost || 0, s: job.charged || 0, st: job.status, t: job.created, w: job.withImage ? 1 : 0 } });

// Natijani fal'dan olib, saqlab, botga yuboradi
async function finishJob(env, job, out){
  if (job.status === 'done' || job.status === 'error') return job;
  if (!out) {
    const r = await fetch(job.response_url, { headers: { Authorization: 'Key ' + env.FAL_KEY } });
    out = await r.json().catch(() => null);
    if (!r.ok) { job.status = 'error'; job.error = (out && (out.detail && JSON.stringify(out.detail) || out.error)) || ('fal ' + r.status); }
  }
  if (job.status !== 'error') {
    job.urls = falUrls(out);
    if (job.urls.length) { job.status = 'done'; await sendResult(env, job); }
    else { job.status = 'error'; job.error = "Natija topilmadi (balki xavfsizlik filtri to'xtatdi)"; }
  }
  if (job.status === 'error') await failNotice(env, job);
  job.done_at = Date.now();
  await saveJob(env, job);
  return job;
}

async function aiGenerate(req, env, origin){
  if (!env.FAL_KEY) return json({ error: 'nokey', msg: "Serverda FAL_KEY yo'q. Cloudflare'da FAL_KEY qo'shing." }, 500);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const a = await aiUser(req, env, b.initData); if (a.err) return a.err;
  const m = AI_MODELS[b.model]; if (!m) return json({ error: 'model', msg: "Noma'lum model" }, 400);
  b.prompt = String(b.prompt || '').trim().slice(0, m.maxText || 2500);
  if (m.kind === 'audio') { b.voice = VOICES[String(b.voice || '').toLowerCase()] ? String(b.voice).toLowerCase() : 'daniel'; b.lang = LANGS[b.lang] ? b.lang : 'de'; }
  if (!b.prompt) return json({ error: 'prompt', msg: 'Tavsif yozing' }, 400);
  if (b.aspect && !m.aspects.includes(b.aspect)) b.aspect = m.aspects[0];
  if (b.duration && !(m.durations || []).includes(String(b.duration))) b.duration = (m.durations || [])[0];
  if (!m.res || !m.res.includes(b.res)) b.res = m.res ? m.res[0] : undefined;
  if (!m.audio) delete b.audio;
  const img = m.kind !== 'audio' && typeof b.image === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(b.image) && b.image.length < 7e6 ? b.image : null;

  // Kunlik limit (pul tejash uchun)
  const day = new Date().toISOString().slice(0, 10), lk = `lim:${a.user.id}:${day}`;
  const used = Number(await env.VOTES.get(lk) || 0), limit = Number(env.DAILY_LIMIT || 30);
  if (used >= limit) return json({ error: 'limit', msg: `Bugungi limit tugadi (${limit} ta)` }, 429);

  // To'lov: egasi bepul, boshqalar balansdan to'laydi
  const price = priceFor(env, a.user.id, m, b);
  const free = isAdminAny(env, a.user) && env.ADMIN_PAYS !== '1';
  if (!free) {
    const bal = await getBal(env, a.user.id);
    if (bal < price) return json({ error: 'balance', msg: isWeb(a.user.id) ? `Balans yetmaydi: kerak ${sum(price)}, sizda ${sum(bal)}` : `Balans yetmaydi: kerak ${price} ⭐, sizda ${bal} ⭐`, need: price, balance: bal }, 402);
    await setBal(env, a.user.id, bal - price);
  }
  const refund = async () => { if (!free) await addBal(env, a.user.id, price); };

  const endpoint = img ? m.img : m.text;
  const hook = `${origin}/fal?k=${encodeURIComponent(env.WEBHOOK_SECRET || '')}`;
  const r = await fetch(FAL_QUEUE + endpoint + '?fal_webhook=' + encodeURIComponent(hook), {
    method: 'POST',
    headers: { Authorization: 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(m.build(b, img))
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.request_id) {
    const msg = r.status === 401 || r.status === 403 ? "FAL_KEY noto'g'ri" : r.status === 402 || /balance|credit|locked/i.test(JSON.stringify(d)) ? "fal.ai balansi tugagan" : (d.detail ? JSON.stringify(d.detail).slice(0, 300) : 'fal xatosi ' + r.status);
    await refund();
    return json({ error: 'fal', msg }, 502);
  }
  await env.VOTES.put(lk, String(used + 1), { expirationTtl: 86400 * 2 });
  const job = {
    id: d.request_id, uid: a.user.id, model: b.model, kind: m.kind, prompt: b.prompt,
    aspect: b.aspect || '', duration: b.duration || '', withImage: !!img,
    ...(m.kind === 'audio' ? { voice: VOICES[b.voice].id, lang: b.lang } : {}),
    cost: Math.round(m.cost(b) * 1000) / 1000, stars: price, charged: free ? 0 : price, res: b.res || '',
    status: 'queue', status_url: d.status_url, response_url: d.response_url, created: Date.now()
  };
  await saveJob(env, job);
  const lkey = 'hist:' + a.user.id;
  const hist = (await env.VOTES.get(lkey, 'json')) || [];
  hist.unshift(job.id); await env.VOTES.put(lkey, JSON.stringify(hist.slice(0, 40)));
  return json({ id: job.id, kind: m.kind, left: limit - used - 1, balance: await getBal(env, a.user.id), free });
}

const pub = j => ({ stars: j.stars || 0, res: j.res || '', id: j.id, model: j.model, name: AI_MODELS[j.model] ? AI_MODELS[j.model].name : j.model, kind: j.kind, prompt: j.prompt, status: j.status, urls: j.urls || [], error: j.error || '', created: j.created, done_at: j.done_at || 0, queue: j.queue_position, aspect: j.aspect, duration: j.duration, voice: j.voice || '' });

async function aiJob(req, env, id){
  const a = await aiUser(req, env); if (a.err) return a.err;
  let job = await env.VOTES.get('job:' + id, 'json');
  if (!job || String(job.uid) !== String(a.user.id)) return json({ error: 'notfound' }, 404);
  if (job.status !== 'done' && job.status !== 'error') {
    const r = await fetch(job.status_url, { headers: { Authorization: 'Key ' + env.FAL_KEY } });
    const s = await r.json().catch(() => ({}));
    if (s.status === 'COMPLETED') job = await finishJob(env, job);
    else if (s.status === 'IN_PROGRESS' || s.status === 'IN_QUEUE') {
      job.status = s.status === 'IN_QUEUE' ? 'queue' : 'work'; job.queue_position = s.queue_position;
    }
  }
  return json(pub(job));
}

// Hisob to'ldirish: Telegram Stars to'lov havolasini yaratadi
async function aiInvoice(req, env){
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const a = await aiUser(req, env, b.initData); if (a.err) return a.err;
  const amount = Number(b.amount);
  if (!PACKS.includes(amount)) return json({ error: 'pack', msg: "Noto'g'ri paket" }, 400);
  const r = await tg(env, 'createInvoiceLink', {
    title: `AI studiya — ${amount} ⭐`,
    description: `AI studiya balansini ${amount} Stars'ga to'ldirish. Rasm va video yaratish uchun.`,
    payload: `topup:${a.user.id}:${amount}`,
    currency: 'XTR', prices: [{ label: `${amount} ⭐`, amount }]
  });
  if (!r.ok) return json({ error: 'invoice', msg: "To'lov havolasini yaratib bo'lmadi" }, 502);
  return json({ link: r.result });
}

async function aiHistory(req, env){
  const a = await aiUser(req, env); if (a.err) return a.err;
  const ids = (await env.VOTES.get('hist:' + a.user.id, 'json')) || [];
  const jobs = (await Promise.all(ids.slice(0, 30).map(id => env.VOTES.get('job:' + id, 'json')))).filter(Boolean);
  const day = new Date().toISOString().slice(0, 10);
  const used = Number(await env.VOTES.get(`lim:${a.user.id}:${day}`) || 0);
  const web = isWeb(a.user.id);
  return json({ jobs: jobs.map(pub), left: Math.max(0, Number(env.DAILY_LIMIT || 30) - used),
    balance: await getBal(env, a.user.id), free: isAdminAny(env, a.user) && env.ADMIN_PAYS !== '1', packs: web ? WEB_PACKS : PACKS,
    currency: web ? 'uzs' : 'stars', ...(web ? { user: { email: a.user.email || '', name: [a.user.first_name, a.user.last_name].filter(Boolean).join(' ') }, pay: payProviders(env) } : {}) });
}

// fal.ai tayyor bo'lganda shu yerga xabar beradi — Mini App yopiq bo'lsa ham natija botga keladi
async function falWebhook(req, env){
  const u = new URL(req.url);
  if (!env.WEBHOOK_SECRET || u.searchParams.get('k') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
  const d = await req.json().catch(() => null);
  if (!d || !d.request_id) return new Response('ok');
  const job = await env.VOTES.get('job:' + d.request_id, 'json');
  if (!job) return new Response('ok');
  if (d.status === 'OK' && d.payload) await finishJob(env, job, d.payload);
  else if (d.status === 'ERROR' && job.status !== 'done' && job.status !== 'error') {
    job.status = 'error'; job.done_at = Date.now();
    job.error = (d.payload && d.payload.detail && JSON.stringify(d.payload.detail)) || d.error || 'xato';
    await failNotice(env, job);
    await saveJob(env, job);
  }
  return new Response('ok');
}

/* ---------------- Ovoz (/ovoz) ---------------- */
// Matndan ovoz: fal.ai navbatiga qo'yadi, natija webhook orqali botga MP3 bo'lib keladi
async function startTTS(env, origin, from, text, o){
  if (!env.FAL_KEY) return { error: "Serverda FAL_KEY yo'q." };
  if (!allowedIds(env).has(String(from.id)) && !(await isPublic(env))) return { error: "Hozircha bu bo'lim yopiq." };
  const m = AI_MODELS.voice;
  const full = String(text || '').trim();
  const b = { prompt: full.slice(0, m.maxText), voice: (VOICES[o.voice] || VOICES.daniel).id, lang: LANGS[o.lang] ? o.lang : 'de' };
  if (!b.prompt) return { error: "Matn bo'sh." };
  const day = new Date().toISOString().slice(0, 10), lk = `lim:${from.id}:${day}`;
  const used = Number(await env.VOTES.get(lk) || 0), limit = Number(env.DAILY_LIMIT || 30);
  if (used >= limit) return { error: `Bugungi limit tugadi (${limit} ta).` };
  const price = priceStars(env, m, b);
  const free = isAdmin(env, from.id) && env.ADMIN_PAYS !== '1';
  if (!free) {
    const bal = await getBal(env, from.id);
    if (bal < price) return { error: `Balans yetmaydi: kerak ${price} ⭐, sizda ${bal} ⭐. /balans` };
    await setBal(env, from.id, bal - price);
  }
  const hook = `${origin}/fal?k=${encodeURIComponent(env.WEBHOOK_SECRET || '')}`;
  const r = await fetch(FAL_QUEUE + m.text + '?fal_webhook=' + encodeURIComponent(hook), {
    method: 'POST', headers: { Authorization: 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(m.build(b))
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.request_id) {
    if (!free) await addBal(env, from.id, price);
    return { error: r.status === 401 || r.status === 403 ? "FAL_KEY noto'g'ri" : r.status === 402 || /balance|credit|locked/i.test(JSON.stringify(d)) ? "fal.ai balansi tugagan" : (d.detail ? JSON.stringify(d.detail).slice(0, 300) : 'fal xatosi ' + r.status) };
  }
  await env.VOTES.put(lk, String(used + 1), { expirationTtl: 86400 * 2 });
  const job = { id: d.request_id, uid: from.id, model: 'voice', kind: 'audio', prompt: b.prompt, voice: b.voice, lang: b.lang,
    cost: Math.round(m.cost(b) * 1000) / 1000, stars: price, charged: free ? 0 : price,
    status: 'queue', status_url: d.status_url, response_url: d.response_url, created: Date.now() };
  await saveJob(env, job);
  const hk = 'hist:' + from.id, hist = (await env.VOTES.get(hk, 'json')) || [];
  hist.unshift(job.id); await env.VOTES.put(hk, JSON.stringify(hist.slice(0, 40)));
  return { ok: true, chars: b.prompt.length, cut: full.length > m.maxText, voice: b.voice, lang: b.lang, price, free };
}

async function ovozHelp(env, chat, st){
  const v = VOICES[st.voice] || VOICES.daniel;
  await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text:
    `🎙 <b>Ovoz yaratish</b>\n\nEndi matnni yuboring — xabar yoki <b>.txt fayl</b> (10 000 belgigacha). Diktor ovozi MP3 bo'lib keladi.\n\n` +
    `Ovoz: <b>${v.id}</b> — ${v.d}\nTil: <b>${LANGS[st.lang] || 'nemischa'}</b>\nNarx: 1 000 belgi ≈ ${priceStars(env, AI_MODELS.voice, { prompt: 'x'.repeat(1000) })} ⭐\n\n` +
    `<b>O'zgartirish:</b> /ovoz daniel · /ovoz george ru · /ovoz alice en\n` +
    Object.entries(VOICES).map(([k, x]) => `• <code>${k}</code> — ${x.d}`).join('\n') +
    `\nTillar: <code>de</code> nemischa, <code>ru</code> ruscha, <code>en</code> inglizcha` });
}

// Telegram'dan .txt faylni o'qish
async function readTxt(env, doc){
  if (!doc || doc.file_size > 200000) return null;
  if (!/text\/plain/.test(doc.mime_type || '') && !/\.txt$/i.test(doc.file_name || '')) return null;
  const f = await tg(env, 'getFile', { file_id: doc.file_id });
  if (!f.ok) return null;
  const r = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
  return r.ok ? (await r.text()).replace(/^\uFEFF/, '') : null;
}

async function runTTS(env, origin, m, text, st){
  const res = await startTTS(env, origin, m.from, text, st);
  if (res.error) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: '❌ ' + res.error });
  await tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML', text:
    `⏳ Ovoz tayyorlanmoqda: <b>${res.chars}</b> belgi · ${res.voice} · ${LANGS[res.lang]}${res.free ? '' : ` · ${res.price} ⭐`}` +
    (res.cut ? `\n⚠️ Matn 10 000 belgidan uzun edi — qolgan qismini alohida yuboring.` : '') + `\nTayyor bo'lgach shu yerga keladi.` });
}


/* ================= ALOHIDA SAYT: Google bilan kirish, so'mdagi balans, Click va Payme ================= */
const isWeb = uid => String(uid || '').startsWith('g:');
const WEB_PACKS = [10000, 30000, 50000, 100000, 250000]; // so'm
const sum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
// Saytdagi narx (so'm): fal.ai narxi × ustama × dollar kursi, 100 so'mga yaxlitlanadi
function priceUzs(env, m, b){
  const mk = Number(m.tier === 'pro' ? (env.MARKUP_PRO || 2.2) : (env.MARKUP_STD || 1.6));
  return Math.max(500, Math.ceil(m.cost(b) * mk * Number(env.UZS_PER_USD || 12800) / 100) * 100);
}
const priceFor = (env, uid, m, b) => isWeb(uid) ? priceUzs(env, m, b) : priceStars(env, m, b);
const isAdminAny = (env, u) => !!u && (isAdmin(env, u.id) || (!!u.email && !!env.ADMIN_EMAIL && String(u.email).toLowerCase() === String(env.ADMIN_EMAIL).trim().toLowerCase()));
const payProviders = env => ({ payme: !!(env.PAYME_MERCHANT_ID && env.PAYME_KEY), click: !!(env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET_KEY) });

function webModels(env){
  const mk = m => Number(m.tier === 'pro' ? (env.MARKUP_PRO || 2.2) : (env.MARKUP_STD || 1.6)), rate = Number(env.UZS_PER_USD || 12800);
  return json({ currency: 'uzs', models: Object.fromEntries(Object.entries(AI_MODELS).map(([k, m]) => [k, {
    name: m.name, kind: m.kind, tier: m.tier, desc: m.desc, aspects: m.aspects, durations: m.durations || [], audio: !!m.audio, imgAspect: m.imgAspect !== false, res: m.res || [],
    ...(m.kind === 'audio' ? { maxText: m.maxText, voices: Object.entries(VOICES).map(([k, v]) => ({ key: k, name: v.id, desc: v.d })), langs: LANGS,
      rate: { perChar: 0.10 / 1000 * mk(m) * rate, min: priceUzs(env, m, { prompt: '' }), round: 100 } } : {}),
    prices: Object.fromEntries((m.durations && m.durations.length ? m.durations : ['0']).flatMap(d =>
      (m.res || ['']).flatMap(rs => [true, false].map(au => [`${d}|${rs}|${au ? 1 : 0}`, priceUzs(env, m, { duration: d, res: rs || undefined, audio: au })]))))
  }])) });
}

// Google bilan kirish: Google bergan ID-tokenni Google'ning o'zida tekshiramiz
async function googleLogin(req, env){
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'nokey', msg: "Serverda GOOGLE_CLIENT_ID yo'q" }, 500);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(b.credential || '')));
  const t = await r.json().catch(() => null);
  const ok = r.ok && t && t.aud === env.GOOGLE_CLIENT_ID && ['accounts.google.com', 'https://accounts.google.com'].includes(t.iss)
    && Number(t.exp) * 1000 > Date.now() && String(t.email_verified) === 'true' && t.sub;
  if (!ok) return json({ error: 'auth', msg: "Google orqali kirishni tasdiqlab bo'lmadi. Qayta urinib ko'ring." }, 401);
  const u = { id: 'g:' + t.sub, first_name: t.given_name || t.name || '', last_name: t.family_name || '', username: t.email, email: t.email, photo_url: t.picture || '' };
  await touchUser(env, u).catch(() => {});
  return json({ token: await makeSession(env, u), user: { id: u.id, name: t.name || t.email, email: t.email, photo: t.picture || '' } });
}

/* ----- Buyurtma (balansni to'ldirish) ----- */
const ordKey = id => 'ord:' + id;
const getOrd = (env, id) => /^\d{6,20}$/.test(String(id)) ? env.VOTES.get(ordKey(id), 'json') : null;
const putOrd = (env, o) => env.VOTES.put(ordKey(o.id), JSON.stringify(o), { metadata: { u: o.uid, a: o.amount, p: o.provider, st: o.status, t: o.created } });
// To'lov tasdiqlanganda: balansga qo'shiladi (bir marta)
async function creditOrder(env, o){
  if (o.status === 'paid') return o;
  o.status = 'paid'; o.paid_at = Date.now();
  await putOrd(env, o);
  await addBal(env, o.uid, o.amount);
  if (env.ADMIN_ID) await tg(env, 'sendMessage', { chat_id: env.ADMIN_ID, parse_mode: 'HTML', text: `💰 <b>Saytda to'lov!</b> ${esc(o.email || o.uid)} — <b>${sum(o.amount)}</b> (${o.provider === 'payme' ? 'Payme' : 'Click'})` }).catch(() => {});
  return o;
}
async function debitOrder(env, o){ // to'langan buyurtma bekor qilinsa (qaytarish)
  if (o.status !== 'paid') return o;
  o.status = 'refunded'; o.refunded_at = Date.now();
  await putOrd(env, o); await addBal(env, o.uid, -o.amount);
  return o;
}

async function webPay(req, env){
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const a = await aiUser(req, env); if (a.err) return a.err;
  if (!isWeb(a.user.id)) return json({ error: 'web', msg: "Bu to'lov sayt uchun" }, 400);
  const amount = Math.round(Number(b.amount)), provider = b.provider === 'click' ? 'click' : 'payme';
  if (!WEB_PACKS.includes(amount)) return json({ error: 'pack', msg: "Noto'g'ri summa" }, 400);
  if (!payProviders(env)[provider]) return json({ error: 'soon', msg: (provider === 'payme' ? 'Payme' : 'Click') + " orqali to'lov tez orada ulanadi" }, 503);
  const id = String(Date.now()) + String(Math.floor(Math.random() * 10));
  const o = { id, uid: a.user.id, email: a.user.email || '', amount, provider, status: 'new', created: Date.now() };
  await putOrd(env, o);
  const back = String(b.back || WEBSITE + 'studio/').slice(0, 300) + (String(b.back || '').includes('?') ? '&' : '?') + 'order=' + id;
  let url;
  if (provider === 'payme') {
    const host = env.PAYME_TEST === '1' ? 'https://checkout.test.paycom.uz/' : 'https://checkout.paycom.uz/';
    url = host + btoa(`m=${env.PAYME_MERCHANT_ID};ac.order_id=${id};a=${amount * 100};l=uz;c=${back}`);
  } else {
    url = 'https://my.click.uz/services/pay?' + new URLSearchParams({ service_id: env.CLICK_SERVICE_ID, merchant_id: env.CLICK_MERCHANT_ID, amount: String(amount), transaction_param: id, return_url: back });
  }
  return json({ url, order: id });
}
async function webOrder(req, env, id){
  const a = await aiUser(req, env); if (a.err) return a.err;
  const o = await getOrd(env, id);
  if (!o || o.uid !== a.user.id) return json({ error: 'notfound' }, 404);
  return json({ id: o.id, status: o.status, amount: o.amount, balance: await getBal(env, a.user.id) });
}

/* ----- Payme Merchant API (JSON-RPC). Payme kabinetida endpoint: https://<worker>/pay/payme ----- */
const PM_TIMEOUT = 12 * 3600 * 1000;
const pmErr = (id, code, uz, data) => json({ id, error: { code, message: { uz, ru: uz, en: uz }, ...(data ? { data } : {}) } });
const pmKey = id => 'pmt:' + id;
async function paymeApi(req, env){
  let rpc; try { rpc = await req.json(); } catch (e) { return pmErr(null, -32700, "JSON xato"); }
  const id = rpc.id, p = rpc.params || {};
  const auth = req.headers.get('Authorization') || '';
  let pass = ''; try { pass = atob(auth.replace(/^Basic\s+/i, '')).split(':').slice(1).join(':'); } catch (e) {}
  if (!env.PAYME_KEY || pass !== env.PAYME_KEY) return pmErr(id, -32504, "Ruxsat yo'q");
  const ok = result => json({ id, result });
  const saveTx = tx => env.VOTES.put(pmKey(tx.id), JSON.stringify(tx), { metadata: { t: tx.time } });
  const view = tx => ({ create_time: tx.create_time, perform_time: tx.perform_time, cancel_time: tx.cancel_time, transaction: tx.order, state: tx.state, reason: tx.reason });
  async function checkOrder(){
    const o = await getOrd(env, p.account && p.account.order_id);
    if (!o || o.provider !== 'payme') return { e: pmErr(id, -31050, 'Buyurtma topilmadi', 'order_id') };
    if (o.status !== 'new') return { e: pmErr(id, -31051, "Buyurtma to'langan yoki bekor qilingan", 'order_id') };
    if (Number(p.amount) !== o.amount * 100) return { e: pmErr(id, -31001, "Summa noto'g'ri") };
    return { o };
  }
  async function expire(tx){
    tx.state = -1; tx.reason = 4; tx.cancel_time = Date.now(); await saveTx(tx);
    const o = await getOrd(env, tx.order); if (o && o.status === 'new') { o.status = 'cancel'; await putOrd(env, o); }
  }
  switch (rpc.method) {
    case 'CheckPerformTransaction': {
      const c = await checkOrder(); if (c.e) return c.e;
      return ok({ allow: true });
    }
    case 'CreateTransaction': {
      const old = await env.VOTES.get(pmKey(p.id), 'json');
      if (old) {
        if (old.state !== 1) return pmErr(id, -31008, "Amalni bajarib bo'lmaydi");
        if (Date.now() - old.create_time > PM_TIMEOUT) { await expire(old); return pmErr(id, -31008, "Vaqt tugagan"); }
        return ok({ create_time: old.create_time, transaction: old.order, state: 1 });
      }
      const c = await checkOrder(); if (c.e) return c.e;
      if (c.o.tx && c.o.tx !== p.id) {
        const other = await env.VOTES.get(pmKey(c.o.tx), 'json');
        if (other && other.state === 1) return pmErr(id, -31050, "Buyurtma bo'yicha boshqa to'lov kutilmoqda", 'order_id');
      }
      const tx = { id: p.id, time: Number(p.time) || Date.now(), amount: Number(p.amount), order: c.o.id, create_time: Date.now(), perform_time: 0, cancel_time: 0, state: 1, reason: null };
      await saveTx(tx); c.o.tx = tx.id; await putOrd(env, c.o);
      return ok({ create_time: tx.create_time, transaction: tx.order, state: 1 });
    }
    case 'PerformTransaction': {
      const tx = await env.VOTES.get(pmKey(p.id), 'json');
      if (!tx) return pmErr(id, -31003, "Tranzaksiya topilmadi");
      if (tx.state === 2) return ok({ transaction: tx.order, perform_time: tx.perform_time, state: 2 });
      if (tx.state !== 1) return pmErr(id, -31008, "Amalni bajarib bo'lmaydi");
      if (Date.now() - tx.create_time > PM_TIMEOUT) { await expire(tx); return pmErr(id, -31008, "Vaqt tugagan"); }
      const o = await getOrd(env, tx.order); if (!o) return pmErr(id, -31050, 'Buyurtma topilmadi', 'order_id');
      tx.state = 2; tx.perform_time = Date.now(); await saveTx(tx);
      await creditOrder(env, o);
      return ok({ transaction: tx.order, perform_time: tx.perform_time, state: 2 });
    }
    case 'CancelTransaction': {
      const tx = await env.VOTES.get(pmKey(p.id), 'json');
      if (!tx) return pmErr(id, -31003, "Tranzaksiya topilmadi");
      if (tx.state === 1 || tx.state === 2) {
        const o = await getOrd(env, tx.order);
        if (tx.state === 2) { tx.state = -2; if (o) await debitOrder(env, o); }
        else { tx.state = -1; if (o && o.status === 'new') { o.status = 'cancel'; await putOrd(env, o); } }
        tx.cancel_time = Date.now(); tx.reason = Number(p.reason) || null; await saveTx(tx);
      }
      return ok({ transaction: tx.order, cancel_time: tx.cancel_time, state: tx.state });
    }
    case 'CheckTransaction': {
      const tx = await env.VOTES.get(pmKey(p.id), 'json');
      if (!tx) return pmErr(id, -31003, "Tranzaksiya topilmadi");
      return ok(view(tx));
    }
    case 'GetStatement': {
      const from = Number(p.from) || 0, to = Number(p.to) || Date.now();
      const keys = (await listAll(env, 'pmt:')).filter(k => k.metadata && k.metadata.t >= from && k.metadata.t <= to);
      const txs = (await Promise.all(keys.map(k => env.VOTES.get(k.name, 'json')))).filter(Boolean).sort((x, y) => x.time - y.time);
      return ok({ transactions: txs.map(tx => ({ id: tx.id, time: tx.time, amount: tx.amount, account: { order_id: tx.order }, ...view(tx) })) });
    }
    default: return pmErr(id, -32601, "Noma'lum metod");
  }
}

/* ----- Click (Prepare / Complete). Click kabinetida: /pay/click/prepare va /pay/click/complete ----- */
async function clickApi(req, env, step){
  let f; try { f = Object.fromEntries(new URLSearchParams(await req.text())); } catch (e) { f = {}; }
  const res = (error, error_note, extra = {}) => json({ click_trans_id: f.click_trans_id, merchant_trans_id: f.merchant_trans_id, error, error_note, ...extra });
  if (!env.CLICK_SECRET_KEY) return res(-8, "Click ulanmagan");
  const want = md5(String(f.click_trans_id || '') + (f.service_id || '') + env.CLICK_SECRET_KEY + (f.merchant_trans_id || '') + (step ? (f.merchant_prepare_id || '') : '') + (f.amount || '') + (f.action || '') + (f.sign_time || ''));
  if (want !== String(f.sign_string || '').toLowerCase()) return res(-1, 'SIGN CHECK FAILED!');
  if (String(f.action) !== String(step)) return res(-3, 'Action not found');
  if (String(f.service_id) !== String(env.CLICK_SERVICE_ID)) return res(-8, 'Error in request from click');
  const o = await getOrd(env, f.merchant_trans_id);
  if (!o || o.provider !== 'click') return res(-5, 'User does not exist');
  if (Math.abs(Number(f.amount) - o.amount) > 0.01) return res(-2, 'Incorrect parameter amount');
  if (step === 0) {
    if (o.status === 'paid') return res(-4, 'Already paid');
    if (o.status !== 'new') return res(-9, 'Transaction cancelled');
    o.click_trans_id = String(f.click_trans_id); await putOrd(env, o);
    return res(0, 'Success', { merchant_prepare_id: Number(o.id) });
  }
  if (String(f.merchant_prepare_id) !== String(o.id)) return res(-6, 'Transaction does not exist');
  if (o.status === 'paid') return res(-4, 'Already paid');
  if (o.status !== 'new') return res(-9, 'Transaction cancelled');
  if (Number(f.error) < 0) { o.status = 'cancel'; await putOrd(env, o); return res(-9, 'Transaction cancelled'); }
  await creditOrder(env, o);
  return res(0, 'Success', { merchant_confirm_id: Number(o.id) });
}

// MD5 (Click imzosi uchun; Cloudflare'da tayyor MD5 yo'q)
function md5(str){
  const b = new TextEncoder().encode(str), n = b.length, w = new Uint32Array(((n + 8 >>> 6) + 1) * 16);
  for (let i = 0; i < n; i++) w[i >> 2] |= b[i] << (i % 4 * 8);
  w[n >> 2] |= 0x80 << (n % 4 * 8); w[w.length - 2] = n * 8;
  const K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < w.length; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const t = D; D = C; C = B;
      const x = (A + F + K[i] + w[o + g]) >>> 0, s = S[(i >> 4) * 4 + i % 4];
      B = (B + ((x << s) | (x >>> (32 - s)))) >>> 0; A = t;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(sh => ((v >>> sh) & 255).toString(16).padStart(2, '0')).join('')).join('');
}

/* ---------------- Bot (webhook) ---------------- */
async function onUpdate(update, env, origin){
  const appUrl = AI_APP + '?api=' + encodeURIComponent(origin);

  // To'lovdan oldingi tekshiruv: Telegram 10 soniya ichida javob kutadi
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const ok = /^topup:\d+:\d+$/.test(q.invoice_payload || '') && q.currency === 'XTR';
    await tg(env, 'answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: "To'lovni qabul qilib bo'lmadi" });
    return;
  }

  const m = update.message;
  if (!m) return;

  // Muvaffaqiyatli to'lov: Stars balansga qo'shiladi
  if (m.successful_payment) {
    const sp = m.successful_payment;
    const key = 'pay:' + sp.telegram_payment_charge_id;
    if (await env.VOTES.get(key)) return; // takroriy xabar
    await env.VOTES.put(key, JSON.stringify({ uid: m.from.id, amount: sp.total_amount, at: Date.now() }), { metadata: { u: m.from.id, a: sp.total_amount, t: Date.now() } });
    const bal = await addBal(env, m.from.id, sp.total_amount);
    await tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML',
      text: `✅ Balans to'ldirildi: <b>+${sp.total_amount} ⭐</b>\nHozirgi balans: <b>${bal} ⭐</b>`,
      reply_markup: { inline_keyboard: [[{ text: '✨ Studiyani ochish', web_app: { url: appUrl } }]] } });
    if (env.ADMIN_ID && !isAdmin(env, m.from.id))
      await tg(env, 'sendMessage', { chat_id: env.ADMIN_ID, parse_mode: 'HTML',
        text: `💰 <b>Yangi to'lov!</b> ${esc(m.from.first_name || '')}${m.from.username ? ' (@' + esc(m.from.username) + ')' : ''} — <b>${sp.total_amount} ⭐</b>` });
    return;
  }
  if (m.from) await touchUser(env, m.from).catch(() => {});
  if (isAdmin(env, m.from.id)) await adminMenu(env).catch(() => {});

  // /ovoz kutilayotgan bo'lsa: .txt fayl yoki oddiy matn ovozga aylanadi
  const ttsKey = m.from ? 'tts:' + m.from.id : '';
  if (m.document && ttsKey) {
    const st = await env.VOTES.get(ttsKey, 'json');
    if (st) {
      const t = await readTxt(env, m.document);
      if (t == null) { await tg(env, 'sendMessage', { chat_id: m.chat.id, text: "❌ Faqat .txt fayl (200 KB gacha) qabul qilinadi." }); return; }
      await env.VOTES.delete(ttsKey);
      await runTTS(env, origin, m, t, st); return;
    }
  }
  if (!m.text) return;
  const chat = m.chat.id;
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/ovoz' || cmd === '/voice') {
    const prev = (await env.VOTES.get(ttsKey, 'json')) || (await env.VOTES.get('ttspref:' + m.from.id, 'json')) || {};
    const st = { voice: prev.voice || 'daniel', lang: prev.lang || 'de' };
    const words = m.text.trim().split(/\s+/).slice(1);
    let i = 0;
    for (; i < words.length && i < 2; i++) {
      const w = words[i].toLowerCase();
      if (VOICES[w]) st.voice = w; else if (LANGS[w]) st.lang = w; else break;
    }
    await env.VOTES.put('ttspref:' + m.from.id, JSON.stringify(st));
    const rest = words.slice(i).join(' ').trim();
    if (rest) {
      // buyruq va sozlama so'zlaridan keyingi matn (qatorlar saqlanadi)
      const body = m.text.trim().replace(new RegExp('^\\S+(?:\\s+\\S+){' + i + '}\\s*'), '');
      await env.VOTES.delete(ttsKey); await runTTS(env, origin, m, body, st); return;
    }
    await env.VOTES.put(ttsKey, JSON.stringify(st), { expirationTtl: 1800 });
    await ovozHelp(env, chat, st); return;
  }
  if (!cmd.startsWith('/')) {
    const st = await env.VOTES.get(ttsKey, 'json');
    if (st) { await env.VOTES.delete(ttsKey); await runTTS(env, origin, m, m.text, st); return; }
  }

  const admUrl = SITE + 'admin/?api=' + encodeURIComponent(origin);

  if (cmd === '/start' || cmd === '/ai') {
    const bal = await getBal(env, m.from.id);
    const kb = { inline_keyboard: [
      [{ text: '✨ Protos studiyasini ochish', web_app: { url: appUrl } }],
      [{ text: `⭐ Balans: ${bal}`, web_app: { url: appUrl + '&topup=1' } }, { text: '📢 Kanal', url: CHANNEL }],
      [{ text: '🌐 Protos sayti', url: WEBSITE }]
    ] };
    if (isAdmin(env, m.from.id)) kb.inline_keyboard.push([{ text: '📊 Admin panel', web_app: { url: admUrl } }]);
    const caption = `🏛 <b>PROTOS AI</b>\n<i>πρῶτος — birinchi</i>\n\nTasavvuringizni bir necha daqiqada video va rasmga aylantiring.\n\n🖼 <b>Rasm</b> — Nano Banana 2 · Nano Banana Pro\n🎬 <b>Video</b> — Kling · Veo · Seedance · Sora\n👑 <b>Premium</b> — kinematografik sifat, ovoz bilan\n\nTayyor natija shu chatga ham keladi.`;
    const ph = await tg(env, 'sendPhoto', { chat_id: chat, photo: SITE + 'img/protos-cover.png', caption, parse_mode: 'HTML', reply_markup: kb });
    if (!ph.ok) await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: caption, reply_markup: kb });
  } else if (cmd === '/balans' || cmd === '/balance') {
    await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: `⭐ <b>Balansingiz:</b> ${await getBal(env, m.from.id)} Stars\n\nBalans har bir yaratish uchun yechiladi. Xato bilan tugagan ishlar uchun Stars avtomatik qaytariladi.`,
      reply_markup: { inline_keyboard: [[{ text: "⭐ Balansni to'ldirish", web_app: { url: appUrl + '&topup=1' } }], [{ text: '✨ Studiyani ochish', web_app: { url: appUrl } }]] } });
  } else if (cmd === '/paysupport') {
    await tg(env, 'sendMessage', { chat_id: chat, text: "💬 To'lov bo'yicha savol yoki muammo bo'lsa, shu yerga yozing — egasi ko'rib chiqadi. Xato bilan yaratilmagan ishlar uchun Stars avtomatik qaytariladi." });
    if (env.ADMIN_ID) await tg(env, 'sendMessage', { chat_id: env.ADMIN_ID, text: `🆘 /paysupport: ${m.from.first_name || ''} (id ${m.from.id})` });
  } else if (cmd === '/id') {
    await tg(env, 'sendMessage', { chat_id: chat, text: `🆔 ${m.from.id}` });
  } else if (cmd === '/admin') {
    if (!isAdmin(env, m.from.id)) return;
    await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: '🛠 <b>Protos admin paneli</b>\nStatistika, daromad, foydalanuvchilar va sozlamalar.',
      reply_markup: { inline_keyboard: [[{ text: '📊 Admin panelni ochish', web_app: { url: admUrl } }]] } });
  }
}

// Admin uchun «/» menyusida ⚙️ Admin panel (faqat admin chatida ko'rinadi), bir marta o'rnatiladi
const USER_CMDS = [
  { command: 'start', description: 'Boshlash' },
  { command: 'ai', description: 'Protos studiyasi — video va rasm yaratish' },
  { command: 'ovoz', description: 'Matndan diktor ovozi (MP3)' },
  { command: 'balans', description: 'Balansim' },
  { command: 'paysupport', description: "To'lov bo'yicha yordam" },
  { command: 'id', description: 'Telegram ID raqamim' }
];
async function adminMenu(env, force){
  if (!env.ADMIN_ID) return;
  if (!force && await env.VOTES.get('cfg:admcmds') === '6') return;
  const r = await tg(env, 'setMyCommands', { scope: { type: 'chat', chat_id: Number(env.ADMIN_ID) },
    commands: [{ command: 'admin', description: '⚙️ Admin panel — statistika va boshqaruv' }, ...USER_CMDS] });
  if (r.ok) await env.VOTES.put('cfg:admcmds', '6');
  return r;
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });


    // AI studiya
    if (url.pathname === '/ai/models' && req.method === 'GET' && url.searchParams.get('cur') === 'uzs') return webModels(env);
    if (url.pathname === '/ai/models' && req.method === 'GET')
      return json({
        starUsd: Number(env.STAR_USD || 0.01),
        markup: { std: Number(env.MARKUP_STD || 1.6), pro: Number(env.MARKUP_PRO || 2.2) },
        models: Object.fromEntries(Object.entries(AI_MODELS).map(([k, m]) => [k, {
          name: m.name, kind: m.kind, tier: m.tier, desc: m.desc, aspects: m.aspects, durations: m.durations || [],
          audio: !!m.audio, imgAspect: m.imgAspect !== false,
          ...(m.kind === 'audio' ? { maxText: m.maxText, voices: Object.entries(VOICES).map(([k, v]) => ({ key: k, name: v.id, desc: v.d })), langs: LANGS,
            rate: { perChar: 0.10 / 1000 * Number(env.MARKUP_STD || 1.6) / Number(env.STAR_USD || 0.01), min: priceStars(env, m, { prompt: '' }) } } : {}),
          // narx jadvali: har bir davomiylik (va ovoz) uchun Stars
          res: m.res || [],
          // narx jadvali: "davomiylik|sifat|ovoz" → Stars
          prices: Object.fromEntries((m.durations && m.durations.length ? m.durations : ['0']).flatMap(d =>
            (m.res || ['']).flatMap(rs => [true, false].map(au => [`${d}|${rs}|${au ? 1 : 0}`, priceStars(env, m, { duration: d, res: rs || undefined, audio: au })]))))
        }]))
      });
    if (url.pathname === '/web/login' && req.method === 'POST') return webLogin(req, env);
    // Alohida sayt: Google bilan kirish va to'lovlar
    if (url.pathname === '/w/login' && req.method === 'POST') return googleLogin(req, env);
    if (url.pathname === '/w/pay' && req.method === 'POST') return webPay(req, env);
    if (url.pathname === '/w/order' && req.method === 'GET') return webOrder(req, env, url.searchParams.get('id') || '');
    if (url.pathname === '/pay/payme' && req.method === 'POST') return paymeApi(req, env);
    if (url.pathname === '/pay/click/prepare' && req.method === 'POST') return clickApi(req, env, 0);
    if (url.pathname === '/pay/click/complete' && req.method === 'POST') return clickApi(req, env, 1);
    if (url.pathname === '/ai/gen' && req.method === 'POST') return aiGenerate(req, env, url.origin);
    if (url.pathname === '/ai/job' && req.method === 'GET') return aiJob(req, env, url.searchParams.get('id') || '');
    if (url.pathname === '/ai/history' && req.method === 'GET') return aiHistory(req, env);
    if (url.pathname === '/ai/invoice' && req.method === 'POST') return aiInvoice(req, env);
    if (url.pathname === '/fal' && req.method === 'POST') return falWebhook(req, env);
    // Admin panel
    if (url.pathname === '/admin/stats' && req.method === 'GET') return adminStats(req, env);
    if (url.pathname === '/admin/users' && req.method === 'GET') return adminUsers(req, env);
    if (url.pathname === '/admin/balance' && req.method === 'POST') return adminBalance(req, env);
    if (url.pathname === '/admin/config' && req.method === 'POST') return adminConfig(req, env);

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      try { await onUpdate(await req.json(), env, url.origin); } catch (e) {}
      return new Response('ok');
    }

    // Bir martalik sozlash: botni shu serverga ulaydi
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Kalit noto\'g\'ri', { status: 403 });
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'] });
      const cmds = await tg(env, 'setMyCommands', { commands: USER_CMDS });
      await adminMenu(env, true).catch(() => {});
      await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Protos AI', web_app: { url: AI_APP + '?api=' + encodeURIComponent(url.origin) } } });
      const ok = hook.ok && cmds.ok;
      return new Response(ok ? "✅ Tayyor! Bot serverga ulandi. Endi botga /id yozing." : '❌ Xato: ' + JSON.stringify({ hook, cmds }), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('AI studiya bot serveri ishlayapti ✅ (versiya 8)', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
