// ★★★ VERSIYA 4 — Protos AI: yangi dizayn, rasmli /start menyusi ★★★
/* "Bu qanday ishlaydi?" — AI studiya boti (Cloudflare Worker).

   Nima qiladi:
   - Bot ichida rasm va video yaratadi (fal.ai orqali):
       Oddiy:   Nano Banana 2, Kling 2.5 Turbo, Veo 3.1 Fast
       Premium: Nano Banana Pro, Kling 3.0 Pro, Seedance 2.0 (Fast va to'liq), Veo 3.1, Sora 2 Pro
   - Har bir ishning narxi Telegram Stars'da. Foydalanuvchi balansni Stars bilan to'ldiradi, har bir ish uchun yechiladi,
     xato bo'lsa avtomatik qaytariladi. /balans — balans, /paysupport — to'lov bo'yicha yordam.
   - /start yoki /ai — «🎬 AI studiya» Mini App'ini ochadi (sayt/ai/).
   - Tayyor rasm/video botga ham yuboriladi (Mini App yopilgan bo'lsa ham).
   - /id — Telegram ID raqamingizni aytadi (ADMIN_ID uchun kerak).
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
const CHANNEL = 'https://t.me/buqanday_ishlaydi1';

/* ---------------- Yordamchilar ---------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data'
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
const getBal = async (env, uid) => Number(await env.VOTES.get('bal:' + uid) || 0);
const setBal = (env, uid, v) => env.VOTES.put('bal:' + uid, String(Math.max(0, Math.round(v))));
async function addBal(env, uid, delta){ const v = (await getBal(env, uid)) + delta; await setBal(env, uid, v); return Math.max(0, v); }
// To'ldirish paketlari (Stars)
const PACKS = [100, 300, 500, 1000, 2500];

function allowedIds(env){
  return new Set([env.ADMIN_ID, ...String(env.ALLOWED_IDS || '').split(',')].map(s => String(s || '').trim()).filter(Boolean));
}
// Mini App so'rovi: Telegram foydalanuvchisini tekshiradi va ruxsatini ko'radi
async function aiUser(req, env, bodyInit){
  const user = await verifyInitData(bodyInit || req.headers.get('X-Init-Data'), env.BOT_TOKEN);
  if (!user || !user.id) return { err: json({ error: 'auth', msg: "Telegram ichida oching" }, 401) };
  if (env.PUBLIC !== '1' && !allowedIds(env).has(String(user.id))) return { err: json({ error: 'denied', msg: "Hozircha bu bo'lim yopiq. Tez orada hamma uchun ochiladi!" }, 403) };
  return { user };
}

// fal javobidan rasm/video manzillarini ajratib olish
function falUrls(out){
  if (!out) return [];
  if (out.video && out.video.url) return [out.video.url];
  if (Array.isArray(out.images)) return out.images.map(i => i && i.url).filter(Boolean);
  if (out.image && out.image.url) return [out.image.url];
  return [];
}

async function sendResult(env, job){
  if (job.sent) return;
  job.sent = true;
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
  await tg(env, 'sendMessage', { chat_id: job.uid, text: `❌ Yaratib bo'lmadi: ${String(job.error).slice(0, 300)}${back}` });
}

const saveJob = (env, job) => env.VOTES.put('job:' + job.id, JSON.stringify(job), { expirationTtl: 86400 * 30 });

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
  b.prompt = String(b.prompt || '').trim().slice(0, 2500);
  if (!b.prompt) return json({ error: 'prompt', msg: 'Tavsif yozing' }, 400);
  if (b.aspect && !m.aspects.includes(b.aspect)) b.aspect = m.aspects[0];
  if (b.duration && !(m.durations || []).includes(String(b.duration))) b.duration = (m.durations || [])[0];
  if (!m.res || !m.res.includes(b.res)) b.res = m.res ? m.res[0] : undefined;
  if (!m.audio) delete b.audio;
  const img = typeof b.image === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(b.image) && b.image.length < 7e6 ? b.image : null;

  // Kunlik limit (pul tejash uchun)
  const day = new Date().toISOString().slice(0, 10), lk = `lim:${a.user.id}:${day}`;
  const used = Number(await env.VOTES.get(lk) || 0), limit = Number(env.DAILY_LIMIT || 30);
  if (used >= limit) return json({ error: 'limit', msg: `Bugungi limit tugadi (${limit} ta)` }, 429);

  // To'lov: egasi bepul, boshqalar balansdan to'laydi
  const price = priceStars(env, m, b);
  const free = isAdmin(env, a.user.id) && env.ADMIN_PAYS !== '1';
  if (!free) {
    const bal = await getBal(env, a.user.id);
    if (bal < price) return json({ error: 'balance', msg: `Balans yetmaydi: kerak ${price} ⭐, sizda ${bal} ⭐`, need: price, balance: bal }, 402);
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
    cost: Math.round(m.cost(b) * 1000) / 1000, stars: price, charged: free ? 0 : price, res: b.res || '',
    status: 'queue', status_url: d.status_url, response_url: d.response_url, created: Date.now()
  };
  await saveJob(env, job);
  const lkey = 'hist:' + a.user.id;
  const hist = (await env.VOTES.get(lkey, 'json')) || [];
  hist.unshift(job.id); await env.VOTES.put(lkey, JSON.stringify(hist.slice(0, 40)));
  return json({ id: job.id, kind: m.kind, left: limit - used - 1, balance: await getBal(env, a.user.id), free });
}

const pub = j => ({ stars: j.stars || 0, res: j.res || '', id: j.id, model: j.model, name: AI_MODELS[j.model] ? AI_MODELS[j.model].name : j.model, kind: j.kind, prompt: j.prompt, status: j.status, urls: j.urls || [], error: j.error || '', created: j.created, done_at: j.done_at || 0, queue: j.queue_position, aspect: j.aspect, duration: j.duration });

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
  return json({ jobs: jobs.map(pub), left: Math.max(0, Number(env.DAILY_LIMIT || 30) - used),
    balance: await getBal(env, a.user.id), free: isAdmin(env, a.user.id) && env.ADMIN_PAYS !== '1', packs: PACKS });
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
    await env.VOTES.put(key, JSON.stringify({ uid: m.from.id, amount: sp.total_amount, at: Date.now() }));
    const bal = await addBal(env, m.from.id, sp.total_amount);
    await tg(env, 'sendMessage', { chat_id: m.chat.id, parse_mode: 'HTML',
      text: `✅ Balans to'ldirildi: <b>+${sp.total_amount} ⭐</b>\nHozirgi balans: <b>${bal} ⭐</b>`,
      reply_markup: { inline_keyboard: [[{ text: '✨ Studiyani ochish', web_app: { url: appUrl } }]] } });
    if (env.ADMIN_ID && !isAdmin(env, m.from.id))
      await tg(env, 'sendMessage', { chat_id: env.ADMIN_ID, parse_mode: 'HTML',
        text: `💰 <b>Yangi to'lov!</b> ${esc(m.from.first_name || '')}${m.from.username ? ' (@' + esc(m.from.username) + ')' : ''} — <b>${sp.total_amount} ⭐</b>` });
    return;
  }
  if (!m.text) return;
  const chat = m.chat.id;
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start' || cmd === '/ai') {
    const bal = await getBal(env, m.from.id);
    const kb = { inline_keyboard: [
      [{ text: '✨ Protos studiyasini ochish', web_app: { url: appUrl } }],
      [{ text: `⭐ Balans: ${bal}`, web_app: { url: appUrl + '&topup=1' } }, { text: '📢 Kanal', url: CHANNEL }]
    ] };
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
  }
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });


    // AI studiya
    if (url.pathname === '/ai/models' && req.method === 'GET')
      return json({
        starUsd: Number(env.STAR_USD || 0.01),
        markup: { std: Number(env.MARKUP_STD || 1.6), pro: Number(env.MARKUP_PRO || 2.2) },
        models: Object.fromEntries(Object.entries(AI_MODELS).map(([k, m]) => [k, {
          name: m.name, kind: m.kind, tier: m.tier, desc: m.desc, aspects: m.aspects, durations: m.durations || [],
          audio: !!m.audio, imgAspect: m.imgAspect !== false,
          // narx jadvali: har bir davomiylik (va ovoz) uchun Stars
          res: m.res || [],
          // narx jadvali: "davomiylik|sifat|ovoz" → Stars
          prices: Object.fromEntries((m.durations && m.durations.length ? m.durations : ['0']).flatMap(d =>
            (m.res || ['']).flatMap(rs => [true, false].map(au => [`${d}|${rs}|${au ? 1 : 0}`, priceStars(env, m, { duration: d, res: rs || undefined, audio: au })]))))
        }]))
      });
    if (url.pathname === '/ai/gen' && req.method === 'POST') return aiGenerate(req, env, url.origin);
    if (url.pathname === '/ai/job' && req.method === 'GET') return aiJob(req, env, url.searchParams.get('id') || '');
    if (url.pathname === '/ai/history' && req.method === 'GET') return aiHistory(req, env);
    if (url.pathname === '/ai/invoice' && req.method === 'POST') return aiInvoice(req, env);
    if (url.pathname === '/fal' && req.method === 'POST') return falWebhook(req, env);

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      try { await onUpdate(await req.json(), env, url.origin); } catch (e) {}
      return new Response('ok');
    }

    // Bir martalik sozlash: botni shu serverga ulaydi
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Kalit noto\'g\'ri', { status: 403 });
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'pre_checkout_query'] });
      const cmds = await tg(env, 'setMyCommands', { commands: [
        { command: 'start', description: 'Boshlash' },
        { command: 'ai', description: 'Protos studiyasi — video va rasm yaratish' },
        { command: 'balans', description: 'Balansim' },
        { command: 'paysupport', description: "To'lov bo'yicha yordam" },
        { command: 'id', description: 'Telegram ID raqamim' }
      ] });
      await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Protos AI', web_app: { url: AI_APP + '?api=' + encodeURIComponent(url.origin) } } });
      const ok = hook.ok && cmds.ok;
      return new Response(ok ? "✅ Tayyor! Bot serverga ulandi. Endi botga /id yozing." : '❌ Xato: ' + JSON.stringify({ hook, cmds }), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('AI studiya bot serveri ishlayapti ✅ (versiya 4)', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
