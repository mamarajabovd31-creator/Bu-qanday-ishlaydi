/* "Bu qanday ishlaydi?" boti uchun kichik server (Cloudflare Worker, bepul).

   ★ YANGI: AI studiya — bot ichida rasm va video yaratish (Nano Banana, Kling, Seedance) fal.ai orqali.
     - Botda /start → «🎬 AI studiya» tugmasi Mini App'ni (sayt/ai/) ochadi.
     - Tayyor rasm/video botga ham yuboriladi (Mini App yopilgan bo'lsa ham).
     - Hozircha faqat ruxsat berilgan odamlar ishlata oladi (ADMIN_ID va ALLOWED_IDS).
     Qo'shimcha sozlamalar:
       FAL_KEY      — fal.ai'dan olingan API kalit (Secret)  ← SHARTLI, busiz AI ishlamaydi
       ALLOWED_IDS  — (ixtiyoriy) vergul bilan Telegram ID'lar, masalan: 111,222 (Text)
       DAILY_LIMIT  — (ixtiyoriy) bir kishi kuniga nechta yarata oladi, standart 30 (Text)

   Nima qiladi:
   - Saytdagi/botdagi "Kutaman" tugmasi bosilganda ovozni saqlaydi va bot egasiga Telegram'da xabar yuboradi.
   - Har bir mavzuni necha kishi va necha foiz kutayotganini qaytaradi (sayt shuni ko'rsatadi).
   - Botda /start bosilganda rasm, matn va "Ochish" tugmasi bilan salomlashadi (foydalanuvchi tilida).
   - /id — sizning Telegram ID raqamingizni aytadi (ADMIN_ID uchun kerak).
   - /stats — faqat egasiga: hozirgi natijalar.

   Cloudflare sozlamalari (Settings → Variables and Secrets):
     BOT_TOKEN       — BotFather bergan token (Secret)
     WEBHOOK_SECRET  — o'zingiz o'ylab topgan uzun so'z, masalan: buqanday2026maxfiy (Secret)
     ADMIN_ID        — /id buyrug'i bergan raqam (Text)
   Bindings → KV namespace: nomi VOTES

   Keyin brauzerda bir marta oching: https://<worker-manzili>/setup?key=<WEBHOOK_SECRET>
*/

const SITE = 'https://mamarajabovd31-creator.github.io/Bu-qanday-ishlaydi/';

// Mavzular: saytdagi data-topic bilan bir xil bo'lishi kerak
const TOPICS = {
  'muzlatgich':     { ico: '🧊', uz: 'Muzlatgich',          en: 'Refrigerator',    ru: 'Холодильник' },
  'mikroto-lqinli': { ico: '📡', uz: "Mikroto'lqinli pech", en: 'Microwave oven',  ru: 'Микроволновка' },
  'konditsioner':   { ico: '❄️', uz: 'Konditsioner',        en: 'Air conditioner', ru: 'Кондиционер' },
  'changyutgich':   { ico: '🌀', uz: 'Changyutgich',        en: 'Vacuum cleaner',  ru: 'Пылесос' }
};

const WELCOME = {
  uz: { text: "⚙️ <b>Bu qanday ishlaydi?</b>\n\nKundalik texnika ichida aslida nima bo'ladi? Qisqa 3D videolar va o'zingiz aylantirib, ochib ko'radigan interaktiv 3D modellar.\n\n👇 Boshlash uchun «Ochish» tugmasini bosing.", btn: '🚀 Ochish', ch: '📢 Kanal' },
  en: { text: "⚙️ <b>How does it work?</b>\n\nWhat really happens inside everyday technology? Short 3D videos and interactive 3D models you can rotate and take apart yourself.\n\n👇 Tap «Open» to start.", btn: '🚀 Open', ch: '📢 Channel' },
  ru: { text: "⚙️ <b>Как это работает?</b>\n\nЧто на самом деле происходит внутри привычной техники? Короткие 3D-видео и интерактивные 3D-модели, которые можно вращать и разбирать самому.\n\n👇 Нажмите «Открыть», чтобы начать.", btn: '🚀 Открыть', ch: '📢 Канал' }
};
const CHANNEL = 'https://t.me/buqanday_ishlaydi1';

/* ---------------- Yordamchilar ---------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const langOf = code => { code = (code || '').slice(0, 2); return code === 'ru' ? 'ru' : code === 'uz' ? 'uz' : 'en'; };

async function tg(env, method, body){
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({ ok: false }));
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
// Telegram Mini App ma'lumotini tekshirish: ovoz haqiqatan shu foydalanuvchidan kelganini bildiradi
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

/* ---------------- Ovozlar (KV) ---------------- */
async function getSet(env, topic){
  const v = await env.VOTES.get('t:' + topic, 'json');
  return Array.isArray(v) ? v : [];
}
async function stats(env){
  const topics = {}, all = new Set();
  for (const id of Object.keys(TOPICS)) {
    const s = await getSet(env, id);
    topics[id] = s.length; s.forEach(x => all.add(x));
  }
  const voters = all.size;
  const pct = {};
  for (const id in topics) pct[id] = voters ? Math.round(topics[id] * 100 / voters) : 0;
  return { voters, topics, pct };
}
function statsText(st, lang = 'uz'){
  const head = { uz: "Hozir kutayotganlar", en: 'Currently waiting', ru: 'Сейчас ждут' }[lang];
  const ppl = { uz: 'kishi', en: 'people', ru: 'чел.' }[lang];
  const rows = Object.keys(TOPICS)
    .sort((a, b) => st.topics[b] - st.topics[a])
    .map(id => `${TOPICS[id].ico} ${TOPICS[id][lang]}: <b>${st.topics[id]}</b> ${ppl} (${st.pct[id]}%)`);
  const tot = { uz: `Jami ovoz berganlar: <b>${st.voters}</b>`, en: `Total voters: <b>${st.voters}</b>`, ru: `Всего проголосовали: <b>${st.voters}</b>` }[lang];
  return `📊 <b>${head}</b>\n\n${rows.join('\n')}\n\n${tot}`;
}

async function vote(req, env){
  let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const topic = String(body.topic || '');
  if (!TOPICS[topic]) return json({ error: 'unknown topic' }, 400);
  const on = !!body.on;

  // Kim ovoz beryapti: Telegram foydalanuvchisi (tekshirilgan) yoki saytdagi anonim mehmon
  let voter, who;
  const user = await verifyInitData(body.initData, env.BOT_TOKEN);
  if (user && user.id) {
    voter = 'tg:' + user.id;
    who = `<a href="tg://user?id=${user.id}">${esc([user.first_name, user.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi')}</a>` + (user.username ? ` (@${esc(user.username)})` : '');
  } else {
    const anon = String(body.anon || '');
    if (!/^[a-z0-9-]{16,64}$/i.test(anon)) return json({ error: 'no voter' }, 400);
    voter = 'web:' + anon;
    who = 'Saytdan mehmon 🌐';
  }

  const set = await getSet(env, topic);
  const had = set.includes(voter);
  if (on && !had) set.push(voter);
  if (!on && had) set.splice(set.indexOf(voter), 1);
  if (on !== had) await env.VOTES.put('t:' + topic, JSON.stringify(set));

  const st = await stats(env);
  // Egasiga xabar: faqat yangi "Kutaman" bosilganda
  if (on && !had && env.ADMIN_ID) {
    const t = TOPICS[topic];
    await tg(env, 'sendMessage', {
      chat_id: env.ADMIN_ID, parse_mode: 'HTML', disable_web_page_preview: true,
      text: `🔔 <b>Yangi «Kutaman»!</b>\n${t.ico} <b>${t.uz}</b> — ${who}\n${t.uz}ni hozir <b>${st.topics[topic]}</b> kishi kutyapti (${st.pct[topic]}%).\n\n${statsText(st, 'uz')}`
    });
  }
  return json(st);
}

/* ---------------- AI studiya (fal.ai) ---------------- */
const AI_APP = SITE + 'ai/';
const FAL_QUEUE = 'https://queue.fal.run/';

// Modellar: Mini App shu kalitlarni yuboradi. Rasm yuklangan bo'lsa "img" yo'li ishlatiladi.
const AI_MODELS = {
  'nano': {
    name: 'Nano Banana 2', kind: 'image',
    text: 'fal-ai/nano-banana-2', img: 'fal-ai/nano-banana-2/edit',
    aspects: ['auto', '1:1', '9:16', '16:9', '4:5', '3:4', '4:3'],
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', num_images: 1, resolution: '1K', output_format: 'jpeg', ...(img ? { image_urls: [img] } : {}) })
  },
  'nano-pro': {
    name: 'Nano Banana Pro', kind: 'image',
    text: 'fal-ai/nano-banana-pro', img: 'fal-ai/nano-banana-pro/edit',
    aspects: ['auto', '1:1', '9:16', '16:9', '4:5', '3:4', '4:3'],
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', num_images: 1, output_format: 'jpeg', ...(img ? { image_urls: [img] } : {}) })
  },
  'kling': {
    name: 'Kling 2.5 Turbo Pro', kind: 'video',
    text: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', img: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    aspects: ['16:9', '9:16', '1:1'], durations: ['5', '10'],
    build: (b, img) => img
      ? { prompt: b.prompt, image_url: img, duration: b.duration || '5' }
      : { prompt: b.prompt, aspect_ratio: b.aspect || '9:16', duration: b.duration || '5' }
  },
  'seedance': {
    name: 'Seedance 2.0 Fast', kind: 'video',
    text: 'bytedance/seedance-2.0/fast/text-to-video', img: 'bytedance/seedance-2.0/fast/image-to-video',
    aspects: ['auto', '9:16', '16:9', '1:1', '3:4', '4:3'], durations: ['5', '8', '10'],
    build: (b, img) => ({ prompt: b.prompt, aspect_ratio: b.aspect || 'auto', duration: b.duration || '5', resolution: '720p', generate_audio: b.audio !== false, ...(img ? { image_url: img } : {}) })
  }
};

function allowedIds(env){
  return new Set([env.ADMIN_ID, ...String(env.ALLOWED_IDS || '').split(',')].map(s => String(s || '').trim()).filter(Boolean));
}
// Mini App so'rovi: Telegram foydalanuvchisini tekshiradi va ruxsatini ko'radi
async function aiUser(req, env, bodyInit){
  const user = await verifyInitData(bodyInit || req.headers.get('X-Init-Data'), env.BOT_TOKEN);
  if (!user || !user.id) return { err: json({ error: 'auth', msg: "Telegram ichida oching" }, 401) };
  if (!allowedIds(env).has(String(user.id))) return { err: json({ error: 'denied', msg: "Hozircha bu bo'lim yopiq. Tez orada hamma uchun ochiladi!" }, 403) };
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
  if (job.status === 'error') await tg(env, 'sendMessage', { chat_id: job.uid, text: `❌ Yaratib bo'lmadi: ${String(job.error).slice(0, 300)}` });
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
  const img = typeof b.image === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(b.image) && b.image.length < 7e6 ? b.image : null;

  // Kunlik limit (pul tejash uchun)
  const day = new Date().toISOString().slice(0, 10), lk = `lim:${a.user.id}:${day}`;
  const used = Number(await env.VOTES.get(lk) || 0), limit = Number(env.DAILY_LIMIT || 30);
  if (used >= limit) return json({ error: 'limit', msg: `Bugungi limit tugadi (${limit} ta)` }, 429);

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
    return json({ error: 'fal', msg }, 502);
  }
  await env.VOTES.put(lk, String(used + 1), { expirationTtl: 86400 * 2 });
  const job = {
    id: d.request_id, uid: a.user.id, model: b.model, kind: m.kind, prompt: b.prompt,
    aspect: b.aspect || '', duration: b.duration || '', withImage: !!img,
    status: 'queue', status_url: d.status_url, response_url: d.response_url, created: Date.now()
  };
  await saveJob(env, job);
  const lkey = 'hist:' + a.user.id;
  const hist = (await env.VOTES.get(lkey, 'json')) || [];
  hist.unshift(job.id); await env.VOTES.put(lkey, JSON.stringify(hist.slice(0, 40)));
  return json({ id: job.id, kind: m.kind, left: limit - used - 1 });
}

const pub = j => ({ id: j.id, model: j.model, name: AI_MODELS[j.model] ? AI_MODELS[j.model].name : j.model, kind: j.kind, prompt: j.prompt, status: j.status, urls: j.urls || [], error: j.error || '', created: j.created, done_at: j.done_at || 0, queue: j.queue_position, aspect: j.aspect, duration: j.duration });

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

async function aiHistory(req, env){
  const a = await aiUser(req, env); if (a.err) return a.err;
  const ids = (await env.VOTES.get('hist:' + a.user.id, 'json')) || [];
  const jobs = (await Promise.all(ids.slice(0, 30).map(id => env.VOTES.get('job:' + id, 'json')))).filter(Boolean);
  const day = new Date().toISOString().slice(0, 10);
  const used = Number(await env.VOTES.get(`lim:${a.user.id}:${day}`) || 0);
  return json({ jobs: jobs.map(pub), left: Math.max(0, Number(env.DAILY_LIMIT || 30) - used) });
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
    await saveJob(env, job);
    await tg(env, 'sendMessage', { chat_id: job.uid, text: `❌ Yaratib bo'lmadi: ${String(job.error).slice(0, 300)}` });
  }
  return new Response('ok');
}

/* ---------------- Bot (webhook) ---------------- */
async function onUpdate(update, env, origin){
  const appUrl = AI_APP + '?api=' + encodeURIComponent(origin);
  const m = update.message;
  if (!m || !m.text) return;
  const chat = m.chat.id, lang = langOf(m.from && m.from.language_code);
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start' || cmd === '/ai') {
    await tg(env, 'sendMessage', {
      chat_id: chat, parse_mode: 'HTML',
      text: "🎬 <b>AI studiya</b>\n\nMatn yoki rasmdan video va rasm yarating:\n• <b>Nano Banana</b> — rasm yaratish va tahrirlash\n• <b>Kling</b> — kinematografik video\n• <b>Seedance</b> — ovozli video\n\nTayyor natija shu chatga ham keladi.\n\n👇 «AI studiya» tugmasini bosing.",
      reply_markup: { inline_keyboard: [[{ text: '🎬 AI studiya', web_app: { url: appUrl } }], [{ text: '⚙️ 3D sayt', web_app: { url: SITE } }, { text: '📢 Kanal', url: CHANNEL }]] }
    });
  } else if (cmd === '/id') {
    await tg(env, 'sendMessage', { chat_id: chat, text: `🆔 ${m.from.id}` });
  } else if (cmd === '/stats') {
    if (String(m.from.id) !== String(env.ADMIN_ID)) return;
    await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: statsText(await stats(env), 'uz') });
  }
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/stats' && req.method === 'GET') return json(await stats(env));
    if (url.pathname === '/vote' && req.method === 'POST') return vote(req, env);

    // AI studiya
    if (url.pathname === '/ai/models' && req.method === 'GET')
      return json(Object.fromEntries(Object.entries(AI_MODELS).map(([k, m]) => [k, { name: m.name, kind: m.kind, aspects: m.aspects, durations: m.durations || [] }])));
    if (url.pathname === '/ai/gen' && req.method === 'POST') return aiGenerate(req, env, url.origin);
    if (url.pathname === '/ai/job' && req.method === 'GET') return aiJob(req, env, url.searchParams.get('id') || '');
    if (url.pathname === '/ai/history' && req.method === 'GET') return aiHistory(req, env);
    if (url.pathname === '/fal' && req.method === 'POST') return falWebhook(req, env);

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      try { await onUpdate(await req.json(), env, url.origin); } catch (e) {}
      return new Response('ok');
    }

    // Bir martalik sozlash: botni shu serverga ulaydi
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Kalit noto\'g\'ri', { status: 403 });
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'] });
      const cmds = await tg(env, 'setMyCommands', { commands: [
        { command: 'start', description: 'Boshlash' },
        { command: 'ai', description: 'AI studiya — video va rasm yaratish' },
        { command: 'id', description: 'Telegram ID raqamim' }
      ] });
      await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: '🎬 AI studiya', web_app: { url: AI_APP + '?api=' + encodeURIComponent(url.origin) } } });
      const ok = hook.ok && cmds.ok;
      return new Response(ok ? "✅ Tayyor! Bot serverga ulandi. Endi botga /id yozing." : '❌ Xato: ' + JSON.stringify({ hook, cmds }), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Bu qanday ishlaydi? bot serveri ishlayapti ✅', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
