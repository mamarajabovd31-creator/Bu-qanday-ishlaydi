/* "Bu qanday ishlaydi?" boti uchun kichik server (Cloudflare Worker, bepul).

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
  'Access-Control-Allow-Headers': 'Content-Type'
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

/* ---------------- Bot (webhook) ---------------- */
async function onUpdate(update, env){
  const m = update.message;
  if (!m || !m.text) return;
  const chat = m.chat.id, lang = langOf(m.from && m.from.language_code);
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start') {
    const w = WELCOME[lang];
    await tg(env, 'sendPhoto', {
      chat_id: chat, photo: SITE + 'img/bot-cover.png', caption: w.text, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: w.btn, web_app: { url: SITE } }], [{ text: w.ch, url: CHANNEL }]] }
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

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      try { await onUpdate(await req.json(), env); } catch (e) {}
      return new Response('ok');
    }

    // Bir martalik sozlash: botni shu serverga ulaydi
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Kalit noto\'g\'ri', { status: 403 });
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'] });
      const cmds = await tg(env, 'setMyCommands', { commands: [
        { command: 'start', description: 'Boshlash' },
        { command: 'id', description: 'Telegram ID raqamim' }
      ] });
      const ok = hook.ok && cmds.ok;
      return new Response(ok ? "✅ Tayyor! Bot serverga ulandi. Endi botga /id yozing." : '❌ Xato: ' + JSON.stringify({ hook, cmds }), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Bu qanday ishlaydi? bot serveri ishlayapti ✅', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
