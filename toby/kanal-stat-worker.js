// ★ Kanal Statistika boti — versiya 3 (Web App: Reja va Monetizatsiya bilan) (YouTube Data API v3, Cloudflare Worker)
/*
  Nima qiladi:
  - /stat   — kanal va har bir videoning hozirgi raqamlari
  - /top    — eng ko'p ko'rilgan videolar
  - /bugun  — bugun (Toshkent vaqti) qancha o'sdi
  - Har kuni 09:00 (Toshkent) — kechagi kun hisoboti
  - Har soat tekshiradi va muhim o'zgarishda xabar beradi:
      yangi video, obunachi/ko'rish chegaralari (100, 500, 1 000 ...), yangi izohlar, soatlik keskin o'sish
  - Faqat egasi (ADMIN_ID) ishlata oladi.

  Cloudflare sozlamalari (Settings → Variables and Secrets):
    BOT_TOKEN       — BotFather tokeni (Secret)
    YT_KEY          — YouTube Data API v3 kaliti (Secret)
    WEBHOOK_SECRET  — o'zingiz o'ylab topgan so'z (Secret)
    ADMIN_ID        — Telegram ID (Text)
    CHANNEL_ID      — YouTube kanal ID, UC... (Text)
  Bindings → KV namespace: nomi STATS
  Trigger events → Cron: 5 * * * *   (har soat)

  Keyin bir marta oching: https://<worker-manzili>/setup?key=<WEBHOOK_SECRET>
*/

const YT = 'https://www.googleapis.com/youtube/v3/';
const TZ = 5 * 3600 * 1000; // Toshkent UTC+5
const REPORT_HOUR = 9;      // kunlik hisobot soati (Toshkent)
const VIEW_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const SUB_STEPS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const SPIKE = 500; // bir soatda shuncha ko'rish qo'shilsa — "tez o'syapti" xabari

/* ---------- yordamchilar ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = x => Math.round(Number(x) || 0).toLocaleString('en-US').replace(/,/g, ' ');
const plus = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + n(Math.abs(x));
const dayOf = t => new Date(t + TZ).toISOString().slice(0, 10);
const hourOf = t => new Date(t + TZ).getUTCHours();
const short = (s, k = 48) => { s = String(s || ''); return s.length > k ? s.slice(0, k - 1) + '…' : s; };
function dur(iso) { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ''); if (!m) return ''; const s = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const crossed = (steps, a, b) => steps.filter(s => a < s && b >= s).pop();

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({ ok: false }));
}
const say = (env, chat, text, extra = {}) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });

/* ---------- YouTube ---------- */
async function yt(env, path, params) {
  const u = new URL(YT + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', env.YT_KEY);
  const r = await fetch(u.toString());
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || ('YouTube xatosi ' + r.status));
  return d;
}

// Kanal + barcha videolar (eng ko'pi 50 ta oxirgi video). Kvota: ~3 birlik.
async function snapshot(env) {
  const c = await yt(env, 'channels', { part: 'snippet,statistics,contentDetails', id: env.CHANNEL_ID });
  const ch = (c.items || [])[0];
  if (!ch) throw new Error('Kanal topilmadi. CHANNEL_ID ni tekshiring.');
  const up = ch.contentDetails.relatedPlaylists.uploads;
  const pl = await yt(env, 'playlistItems', { part: 'contentDetails', playlistId: up, maxResults: '50' });
  const ids = (pl.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
  let vids = [];
  if (ids.length) {
    const v = await yt(env, 'videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') });
    vids = (v.items || []).map(x => ({
      id: x.id, t: x.snippet.title, p: x.snippet.publishedAt, d: x.contentDetails.duration,
      v: +x.statistics.viewCount || 0, l: +x.statistics.likeCount || 0, c: +x.statistics.commentCount || 0
    }));
  }
  const s = ch.statistics;
  return {
    at: Date.now(), title: ch.snippet.title, handle: ch.snippet.customUrl || '',
    subs: s.hiddenSubscriberCount ? null : (+s.subscriberCount || 0),
    views: vids.reduce((a, x) => a + x.v, 0) || (+s.viewCount || 0),
    likes: vids.reduce((a, x) => a + x.l, 0), comments: vids.reduce((a, x) => a + x.c, 0),
    count: +s.videoCount || vids.length, vids
  };
}

const getJ = async (env, k) => { try { return await env.STATS.get(k, 'json'); } catch (e) { return null; } };
const putJ = (env, k, v, ttl) => env.STATS.put(k, JSON.stringify(v), ttl ? { expirationTtl: ttl } : undefined);


/* ---------- video rejasi (dashboarddan ko'chirildi) ---------- */
// kw — sarlavhada shu so'z bo'lsa, video "Chiqdi" deb avtomatik belgilanadi
const PLAN_DEFAULT = [
  { topic: 'Argentina', hook: 'Reicher als Deutschland – heute pleite', kw: 'argentin' },
  { topic: 'Venesuela', hook: 'Reicher als Spanien – heute hungern Millionen', kw: 'venezuela' },
  { topic: 'Weimar 1923', hook: 'Ein Brot kostete 200 Milliarden Mark', kw: 'weimar|1923' },
  { topic: 'Nauru', hook: 'Das reichste Land der Welt – pro Kopf', kw: 'nauru' },
  { topic: 'Detroit', hook: 'Die reichste Stadt der USA ging pleite', kw: 'detroit' },
  { topic: 'Libanon / Beirut', hook: 'Das „Paris des Nahen Ostens“', kw: 'libanon|beirut' },
  { topic: 'Ruhrgebiet', hook: 'Deutschlands reichste Region – was ist passiert?', kw: 'ruhr' },
  { topic: 'Simbabwe', hook: 'Die Kornkammer Afrikas', kw: 'simbabwe|zimbabwe' },
  { topic: 'Gretsiya', hook: 'Vom Euro-Star zur Pleite', kw: 'griechenland' },
  { topic: 'Gaiti', hook: 'Die reichste Kolonie der Welt', kw: 'haiti' },
  { topic: 'Potosí', hook: 'Die Stadt aus Silber', kw: 'potos' },
  { topic: 'Kuba / Gavana', hook: 'Das Las Vegas der Karibik', kw: 'kuba|havanna|cuba' },
  { topic: 'Shri-Lanka', hook: 'Bankrott 2022 – in Echtzeit', kw: 'sri lanka' }
];
const PLAN_ST = ['Navbatda', 'Tayyorlanmoqda', 'Chiqdi'];
async function planData(env, s) {
  const saved = (await getJ(env, 'plan')) || {};          // { topic: status }
  return PLAN_DEFAULT.map(p => {
    const re = new RegExp(p.kw, 'i');
    const v = (s && s.vids || []).filter(x => re.test(x.t)).sort((a, b) => a.p < b.p ? -1 : 1)[0];
    return { topic: p.topic, hook: p.hook, status: v ? 'Chiqdi' : (saved[p.topic] || 'Navbatda'), auto: !!v, vid: v ? v.id : null, at: v ? v.p : null };
  });
}

/* ---------- xabar matnlari ---------- */
const vlink = v => `https://youtu.be/${v.id}`;

function statText(s, base) {
  const L = [];
  L.push(`📊 <b>${esc(s.title)}</b>${s.handle ? ' · ' + esc(s.handle) : ''}`);
  L.push('');
  L.push(`👥 Obunachilar: <b>${s.subs == null ? 'yashirin' : n(s.subs)}</b>${base && s.subs != null && base.subs != null ? '  (' + plus(s.subs - base.subs) + ' bugun)' : ''}`);
  L.push(`👁 Ko'rishlar: <b>${n(s.views)}</b>${base ? '  (' + plus(s.views - base.views) + ' bugun)' : ''}`);
  L.push(`❤️ Layklar: <b>${n(s.likes)}</b>   💬 Izohlar: <b>${n(s.comments)}</b>`);
  L.push(`🎬 Videolar: <b>${n(s.count)}</b>`);
  if (s.vids.length) {
    L.push('');
    L.push('<b>Videolar:</b>');
    const bv = {}; (base && base.vids || []).forEach(v => bv[v.id] = v);
    s.vids.slice(0, 10).forEach(v => {
      const b = bv[v.id];
      L.push(`• <a href="${vlink(v)}">${esc(short(v.t))}</a>\n   👁 ${n(v.v)}${b ? ' (' + plus(v.v - b.v) + ')' : ''} · ❤️ ${n(v.l)} · 💬 ${n(v.c)} · ${dur(v.d)}`);
    });
  }
  L.push('');
  L.push(`<i>Yangilandi: ${new Date(s.at + TZ).toISOString().slice(11, 16)} (Toshkent)</i>`);
  return L.join('\n');
}

function topText(s) {
  if (!s.vids.length) return 'Hali video yo\'q.';
  const t = s.vids.slice().sort((a, b) => b.v - a.v).slice(0, 10);
  return '🏆 <b>Eng ko\'p ko\'rilgan videolar</b>\n\n' + t.map((v, i) =>
    `${i + 1}. <a href="${vlink(v)}">${esc(short(v.t))}</a>\n   👁 ${n(v.v)} · ❤️ ${n(v.l)} · layk ${v.v ? (v.l / v.v * 100).toFixed(1) : 0}%`).join('\n');
}

function dailyText(s, prev, day) {
  const L = [`🌅 <b>Kunlik hisobot</b> · ${day}`, ''];
  if (!prev) {
    L.push('Bu birinchi hisobot — ertadan boshlab kunlik o\'sish ko\'rinadi.');
    L.push('');
    L.push(`👥 ${s.subs == null ? 'yashirin' : n(s.subs)} obunachi · 👁 ${n(s.views)} ko'rish · ❤️ ${n(s.likes)} layk`);
    return L.join('\n');
  }
  L.push(`👥 Obunachilar: <b>${s.subs == null ? '—' : n(s.subs)}</b> (${s.subs != null && prev.subs != null ? plus(s.subs - prev.subs) : '—'})`);
  L.push(`👁 Ko'rishlar: <b>${n(s.views)}</b> (${plus(s.views - prev.views)})`);
  L.push(`❤️ Layklar: <b>${n(s.likes)}</b> (${plus(s.likes - prev.likes)})`);
  L.push(`💬 Izohlar: <b>${n(s.comments)}</b> (${plus(s.comments - prev.comments)})`);
  const pv = {}; (prev.vids || []).forEach(v => pv[v.id] = v);
  const grow = s.vids.map(v => ({ v, g: v.v - (pv[v.id] ? pv[v.id].v : 0) })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
  if (grow.length) {
    L.push('', '<b>Kecha eng ko\'p o\'sgan:</b>');
    grow.forEach(x => L.push(`• <a href="${vlink(x.v)}">${esc(short(x.v.t, 40))}</a> — ${plus(x.g)} ko'rish`));
  }
  if (s.views - prev.views === 0) L.push('', '⚠️ Kecha ko\'rish qo\'shilmadi. Yangi video chiqarish vaqti bo\'lishi mumkin.');
  return L.join('\n');
}

/* ---------- tarix (grafik uchun) ---------- */
const HIST_MAX = 24 * 60; // ~60 kunlik soatlik nuqtalar
async function addHist(env, s) {
  const h = (await getJ(env, 'hist')) || [];
  const pt = { t: s.at, s: s.subs, v: s.views, l: s.likes, c: s.comments, pv: Object.fromEntries(s.vids.map(x => [x.id, x.v])) };
  if (h.length && s.at - h[h.length - 1].t < 20 * 60000) h[h.length - 1] = pt; else h.push(pt);
  while (h.length > HIST_MAX) h.shift();
  await putJ(env, 'hist', h);
}

/* ---------- Web App himoyasi (Telegram initData) ---------- */
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? new TextEncoder().encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
async function checkInit(env, initData) {
  if (!initData) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const dcs = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + '=' + v).join('\n');
  const secret = await hmac('WebAppData', env.BOT_TOKEN);
  if (hex(await hmac(secret, dcs)) !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 86400) return null;
  let user = null; try { user = JSON.parse(p.get('user') || 'null'); } catch (e) {}
  if (!user || String(user.id) !== String(env.ADMIN_ID)) return null;
  return user;
}

async function appData(env, fresh) {
  let s = fresh ? null : await getJ(env, 'last');
  if (!s || Date.now() - s.at > 30 * 60000) s = (await check(env, { silent: true })).s;
  const base = await getJ(env, 'day:' + dayOf(s.at));
  const y = await getJ(env, 'day:' + dayOf(s.at - 86400000));
  const hist = (await getJ(env, 'hist')) || [];
  const plan = await planData(env, s);
  const manual = (await getJ(env, 'manual')) || {};
  return { s, base, y, hist, plan, manual, tz: TZ };
}

/* ---------- soatlik tekshiruv ---------- */
async function check(env, opts = {}) {
  const s = await snapshot(env);
  const last = await getJ(env, 'last');
  const alerts = [];
  if (last) {
    const lv = {}; (last.vids || []).forEach(v => lv[v.id] = v);
    for (const v of s.vids) {
      const o = lv[v.id];
      if (!o) { alerts.push(`🆕 <b>Yangi video chiqdi!</b>\n<a href="${vlink(v)}">${esc(v.t)}</a>`); continue; }
      const step = crossed(VIEW_STEPS, o.v, v.v);
      if (step) alerts.push(`🎉 <a href="${vlink(v)}">${esc(short(v.t))}</a> <b>${n(step)}</b> ko'rishdan oshdi! (hozir ${n(v.v)})`);
      else if (v.v - o.v >= SPIKE) alerts.push(`🚀 <a href="${vlink(v)}">${esc(short(v.t))}</a> tez o'syapti: so'nggi tekshiruvdan beri ${plus(v.v - o.v)} ko'rish`);
      if (v.c > o.c) alerts.push(`💬 <a href="${vlink(v)}">${esc(short(v.t))}</a> — ${v.c - o.c} ta yangi izoh. Javob bering!`);
    }
    if (s.subs != null && last.subs != null) {
      const st = crossed(SUB_STEPS, last.subs, s.subs);
      if (st) alerts.push(`🏅 Kanal <b>${n(st)}</b> obunachiga yetdi! (hozir ${n(s.subs)})`);
    }
  }
  await putJ(env, 'last', s);
  await addHist(env, s);

  // kun boshidagi nuqta (bugungi o'sish uchun)
  const today = dayOf(s.at);
  if (!(await env.STATS.get('day:' + today))) await putJ(env, 'day:' + today, s, 86400 * 40);

  if (env.ADMIN_ID && alerts.length && !opts.silent) {
    for (const a of alerts.slice(0, 8)) await say(env, env.ADMIN_ID, a);
  }

  // kunlik hisobot: 09:00 Toshkent, kuniga bir marta
  if (env.ADMIN_ID && hourOf(s.at) === REPORT_HOUR && (await env.STATS.get('sent')) !== today) {
    const y = dayOf(s.at - 86400000);
    const prev = await getJ(env, 'day:' + y);
    await say(env, env.ADMIN_ID, dailyText(s, prev, y));
    await env.STATS.put('sent', today);
  }
  return { s, alerts };
}

/* ---------- bot ---------- */
const CMDS = [
  { command: 'stat', description: 'Hozirgi statistika' },
  { command: 'top', description: 'Eng ko\'p ko\'rilgan videolar' },
  { command: 'bugun', description: 'Bugun qancha o\'sdi' },
  { command: 'app', description: '📊 Statistika ilovasini ochish' },
  { command: 'id', description: 'Telegram ID raqamim' }
];
const appUrl = env => (env.PUBLIC_URL || '') + '/app';

async function onUpdate(u, env) {
  const m = u.message;
  if (!m || !m.text) return;
  const chat = m.chat.id;
  const cmd = m.text.trim().split(/[\s@]/)[0].toLowerCase();
  if (cmd === '/id') return say(env, chat, `🆔 <code>${m.from.id}</code>`);
  if (String(m.from.id) !== String(env.ADMIN_ID)) return say(env, chat, 'Bu bot shaxsiy. Hozircha faqat egasi ishlata oladi.');

  if (cmd === '/app') {
    return say(env, chat, '📊 Statistika ilovasi:', { reply_markup: { inline_keyboard: [[{ text: '📊 Ilovani ochish', web_app: { url: appUrl(env) } }]] } });
  }
  if (cmd === '/start') {
    await say(env, chat, '📊 Grafiklar va videolar — ilovada:', { reply_markup: { inline_keyboard: [[{ text: '📊 Ilovani ochish', web_app: { url: appUrl(env) } }]] } });
    return say(env, chat, '👋 <b>Kanal statistikasi</b>\n\nMen YouTube kanalingizni har soat kuzataman:\n• har kuni soat 09:00 da hisobot yuboraman\n• yangi video, 1 000 ko\'rish, yangi izoh kabi muhim o\'zgarishlarda darhol xabar beraman\n\nBuyruqlar: /stat · /top · /bugun', {
      reply_markup: { keyboard: [[{ text: '/stat' }, { text: '/bugun' }, { text: '/top' }]], resize_keyboard: true }
    });
  }
  if (cmd === '/stat' || cmd === '/bugun' || cmd === '/top') {
    try {
      const { s } = await check(env, { silent: true });
      if (cmd === '/top') return say(env, chat, topText(s));
      const base = await getJ(env, 'day:' + dayOf(s.at));
      return say(env, chat, statText(s, base));
    } catch (e) {
      return say(env, chat, '❌ ' + esc(e.message));
    }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    env.PUBLIC_URL = url.origin;
    if (url.pathname === '/app') return new Response(APP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    if (url.pathname === '/api/data' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const user = await checkInit(env, b.initData);
      if (!user) return Response.json({ error: 'Ruxsat yo\'q. Ilovani botdagi tugma orqali oching.' }, { status: 403 });
      try { return Response.json(await appData(env, !!b.fresh)); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const user = await checkInit(env, b.initData);
      if (!user) return Response.json({ error: 'Ruxsat yo\'q.' }, { status: 403 });
      if (b.kind === 'plan' && PLAN_DEFAULT.some(p => p.topic === b.topic) && PLAN_ST.includes(b.status)) {
        const saved = (await getJ(env, 'plan')) || {}; saved[b.topic] = b.status; await putJ(env, 'plan', saved);
        return Response.json({ ok: true });
      }
      if (b.kind === 'hours') {
        const h = Number(b.hours);
        if (!(h >= 0 && h < 1e7)) return Response.json({ error: 'Noto\'g\'ri son' }, { status: 400 });
        await putJ(env, 'manual', { hours: Math.round(h * 10) / 10, at: Date.now() });
        return Response.json({ ok: true });
      }
      return Response.json({ error: 'Noma\'lum so\'rov' }, { status: 400 });
    }
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      try { await onUpdate(await req.json(), env); } catch (e) {}
      return new Response('ok');
    }
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response("Kalit noto'g'ri", { status: 403 });
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'] });
      const cmds = await tg(env, 'setMyCommands', { commands: CMDS });
      const menu = await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: '📊 Statistika', web_app: { url: url.origin + '/app' } } });
      let ytOk = 'YouTube: ';
      try { const s = (await check(env, { silent: true })).s; ytOk += `✅ ${s.title} · ${n(s.subs)} obunachi · ${n(s.views)} ko'rish`; } catch (e) { ytOk += '❌ ' + e.message; }
      const ok = hook.ok && cmds.ok && menu.ok;
      return new Response((ok ? '✅ Tayyor! Bot ulandi. Botga /start yozing.' : '❌ Telegram xatosi: ' + JSON.stringify({ hook, cmds, menu })) + '\n' + ytOk,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return new Response('Statistika bot serveri ishlayapti ✅ (versiya 3)', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(check(env).catch(() => {}));
  }
};

/* ---------- Web App sahifasi ---------- */
const APP_HTML = "<!doctype html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<title>Kanal statistikasi</title>\n<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>\n<style>\n/* Toby Land — shared design system for Diyor's Telegram Mini Apps.\n   Concept: instruments on the deck of the Toby Land sky ship.\n   Night-indigo hull, brass family accent, one signal colour per app (--sig). */\n@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Unbounded:wght@500;600;700&display=swap');\n:root{\n  --night:#10132B; --hull:#181C3D; --hull2:#20254D; --rim:#2E3568; --rim2:#3B4380;\n  --paper:#F3F1FF; --mist:#B9BDE6; --fog:#7C82B8;\n  --brass:#E9B44C; --brass2:#FFD98A;\n  --rise:#3ED6A5; --fall:#FF6B5E;\n  --sig:var(--brass); --sig-ink:#1A1300;\n  --fd:\"Unbounded\",system-ui,sans-serif; --fb:\"Manrope\",system-ui,-apple-system,sans-serif;\n  --r1:10px; --r2:16px; --r3:24px;\n  --safe-b:env(safe-area-inset-bottom,0px);\n  color-scheme:dark;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nhtml{background:var(--night)}\nbody{margin:0;min-height:100vh;color:var(--paper);font:600 15px/1.45 var(--fb);-webkit-font-smoothing:antialiased;\n  background:\n    radial-gradient(120% 60% at 50% -10%, color-mix(in srgb,var(--sig) 16%,transparent), transparent 60%),\n    radial-gradient(1px 1px at 12% 18%, #fff8 50%, transparent 51%),\n    radial-gradient(1px 1px at 78% 9%, #fff6 50%, transparent 51%),\n    radial-gradient(1px 1px at 64% 31%, #fff5 50%, transparent 51%),\n    radial-gradient(1px 1px at 31% 44%, #fff4 50%, transparent 51%),\n    radial-gradient(1px 1px at 88% 52%, #fff4 50%, transparent 51%),\n    var(--night);\n  background-attachment:fixed;\n  padding:0 16px calc(96px + var(--safe-b));}\nbutton{font:inherit;color:inherit}\n:focus-visible{outline:2px solid var(--sig);outline-offset:2px;border-radius:8px}\n.num{font-family:var(--fd);font-variant-numeric:tabular-nums;letter-spacing:-.02em}\n.rise{color:var(--rise)} .fall{color:var(--fall)} .calm{color:var(--fog)}\n\n/* app bar: ship emblem + app name + one action */\n.bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;margin:0 -16px 14px;\n  padding:calc(12px + env(safe-area-inset-top,0px)) 16px 12px;\n  background:linear-gradient(var(--night) 60%, color-mix(in srgb,var(--night) 0%,transparent));}\n.emblem{width:40px;height:40px;flex:none;border-radius:13px;display:grid;place-items:center;\n  background:conic-gradient(from 210deg,var(--sig),var(--brass),var(--sig));box-shadow:0 6px 18px -6px var(--sig)}\n.emblem svg{width:22px;height:22px;stroke:var(--sig-ink);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\n.bar .ttl{flex:1;min-width:0}\n.bar h1{margin:0;font:600 17px/1.15 var(--fd);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.bar p{margin:2px 0 0;color:var(--fog);font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.icon-btn{width:40px;height:40px;flex:none;border:1px solid var(--rim);border-radius:13px;background:var(--hull);display:grid;place-items:center;cursor:pointer}\n.icon-btn:active{transform:scale(.94)}\n.icon-btn svg{width:19px;height:19px;stroke:var(--mist);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\n.icon-btn.busy svg{animation:spin .9s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* panels: the hull plates. Primary plate is larger and has a brass rim. */\n.plate{background:linear-gradient(180deg,var(--hull2),var(--hull));border:1px solid var(--rim);border-radius:var(--r3);padding:16px;margin-bottom:12px}\n.plate.prime{border-color:color-mix(in srgb,var(--sig) 45%,var(--rim));box-shadow:0 0 0 4px color-mix(in srgb,var(--sig) 7%,transparent)}\n.plate h2{margin:0 0 12px;font:600 14px/1.2 var(--fd);display:flex;align-items:baseline;justify-content:space-between;gap:8px}\n.plate h2 small{font:700 12.5px var(--fb);color:var(--fog)}\n.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}\n.cell{background:var(--hull);border:1px solid var(--rim);border-radius:var(--r2);padding:12px 13px}\n.cell .k{color:var(--fog);font-size:12.5px;font-weight:700}\n.cell .v{font:600 22px/1.15 var(--fd);margin-top:4px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}\n.cell .d{font-size:12.5px;font-weight:800;margin-top:3px}\n\n/* the instrument: a dial gauge (signature element) */\n.dial{position:relative;width:148px;height:148px;flex:none}\n.dial svg{width:100%;height:100%;transform:rotate(135deg)}\n.dial .track{stroke:var(--rim);stroke-width:12;fill:none;stroke-linecap:round}\n.dial .fill{stroke:var(--sig);stroke-width:12;fill:none;stroke-linecap:round;transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)}\n.dial .tick{stroke:var(--rim2);stroke-width:2}\n.dial .mid{position:absolute;inset:0;display:grid;place-content:center;text-align:center}\n.dial .mid b{font:600 30px/1 var(--fd);letter-spacing:-.03em}\n.dial .mid span{color:var(--fog);font-size:12px;font-weight:700;margin-top:6px}\n\n/* segmented switch */\n.seg{display:flex;gap:4px;padding:4px;background:var(--night);border:1px solid var(--rim);border-radius:13px;margin-bottom:12px}\n.seg button{flex:1;border:0;background:transparent;color:var(--fog);font:700 13px var(--fb);padding:8px 4px;border-radius:9px;cursor:pointer}\n.seg button[aria-pressed=true]{background:var(--hull2);color:var(--paper);box-shadow:inset 0 0 0 1px var(--rim2)}\n\n/* list rows */\n.row{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--rim);cursor:pointer}\n.row:first-child{border-top:0}\n.row:active{opacity:.7}\n\n/* bottom sheet */\n.scrim{position:fixed;inset:0;background:#06081acc;opacity:0;pointer-events:none;transition:opacity .25s;z-index:40}\n.sheet{position:fixed;left:0;right:0;bottom:0;z-index:41;background:var(--hull);border-top:1px solid var(--rim2);border-radius:var(--r3) var(--r3) 0 0;\n  padding:10px 16px calc(20px + var(--safe-b));transform:translateY(105%);visibility:hidden;transition:transform .32s cubic-bezier(.2,.9,.2,1),visibility 0s .32s;max-height:86vh;overflow:auto}\n.sheet:before{content:\"\";display:block;width:42px;height:5px;border-radius:9px;background:var(--rim2);margin:0 auto 12px}\n.open .scrim{opacity:1;pointer-events:auto}\n.open .sheet{transform:none;visibility:visible;transition:transform .32s cubic-bezier(.2,.9,.2,1)}\n\n/* buttons */\n.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;padding:14px;background:var(--sig);color:var(--sig-ink);font:800 15px var(--fb);cursor:pointer}\n.btn.ghost{background:var(--hull2);color:var(--paper);border:1px solid var(--rim)}\n.btn:active{transform:scale(.98)}\n\n/* bottom dock */\n.dock{position:fixed;left:12px;right:12px;bottom:calc(10px + var(--safe-b));z-index:20;display:flex;gap:4px;padding:6px;\n  background:color-mix(in srgb,var(--hull) 88%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);\n  border:1px solid var(--rim);border-radius:20px}\n.dock button{flex:1;border:0;background:transparent;color:var(--fog);font:700 11px var(--fb);padding:7px 2px;border-radius:14px;display:grid;justify-items:center;gap:3px;cursor:pointer}\n.dock svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\n.dock button[aria-current=page]{color:var(--paper);background:var(--hull2)}\n.dock button[aria-current=page] svg{stroke:var(--sig)}\n\n/* skeleton + toast */\n.sk{background:linear-gradient(90deg,var(--hull2),var(--rim),var(--hull2));background-size:200% 100%;animation:sk 1.2s infinite;border-radius:8px;color:transparent!important}\n@keyframes sk{to{background-position:-200% 0}}\n.toast{position:fixed;left:50%;bottom:calc(92px + var(--safe-b));transform:translate(-50%,20px);opacity:0;background:var(--paper);color:var(--night);\n  font:800 13.5px var(--fb);padding:10px 16px;border-radius:99px;transition:.25s;z-index:60;pointer-events:none;white-space:nowrap}\n.toast.on{opacity:1;transform:translate(-50%,0)}\n.note{background:color-mix(in srgb,var(--fall) 14%,var(--hull));border:1px solid color-mix(in srgb,var(--fall) 40%,var(--rim));border-radius:var(--r2);padding:12px 14px;margin-bottom:12px;font-size:14px}\n.empty{color:var(--fog);text-align:center;padding:28px 10px;font-size:13.5px}\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n@media (min-width:720px){body{max-width:560px;margin:0 auto}}\n\n:root{--sig:#E9B44C;--sig-ink:#1A1300}\n.hero{display:flex;gap:14px;align-items:center}\n.hero .side{flex:1;min-width:0;display:grid;gap:10px}\n.hero .goal{font-size:13px;color:var(--mist);font-weight:700;line-height:1.35}\n.hero .goal b{color:var(--paper)}\n.today{display:grid;gap:2px}\n.today .k{color:var(--fog);font-size:12px;font-weight:700}\n.today .v{font:600 19px/1.1 var(--fd);font-variant-numeric:tabular-nums}\n.today .y{font-size:12px;color:var(--fog);font-weight:700}\nsvg.chart{display:block;width:100%;height:180px;touch-action:pan-y}\n.tip{position:absolute;transform:translate(-50%,-110%);background:var(--paper);color:var(--night);font:800 12px var(--fb);padding:5px 8px;border-radius:8px;white-space:nowrap;pointer-events:none}\n.chartbox{position:relative}\n.bars{display:flex;align-items:flex-end;gap:4px;height:120px;padding-top:18px}\n.bars .b{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}\n.bars .b i{display:block;width:100%;border-radius:6px 6px 3px 3px;background:var(--rim2);min-height:3px;transition:height .8s cubic-bezier(.2,.8,.2,1)}\n.bars .b.hi i{background:var(--sig)}\n.bars .b span{font-size:10.5px;color:var(--fog);font-weight:700}\n.bars .b em{font-style:normal;font-size:10.5px;color:var(--mist);font-weight:800;min-height:13px}\n.vid img{width:104px;height:58px;object-fit:cover;border-radius:10px;background:var(--night);flex:none;border:1px solid var(--rim)}\n.vid.sh img{width:44px;height:70px}\n.vid .m{min-width:0;flex:1}\n.vid .t{font-size:14px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.vid .s{color:var(--fog);font-size:12.5px;margin-top:4px;font-weight:700;font-variant-numeric:tabular-nums}\n.vid .s b{color:var(--paper)}\n.kind{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:6px;margin-right:6px;vertical-align:1px;background:var(--rim);color:var(--mist)}\n.kind.short{background:color-mix(in srgb,var(--fall) 22%,var(--hull));color:#FFB3AA}\n.sheet h3{margin:0 0 4px;font:600 16px/1.3 var(--fd)}\n.sheet .meta{color:var(--fog);font-size:13px;font-weight:700;margin-bottom:14px}\n.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 14px}\n.facts div{background:var(--night);border:1px solid var(--rim);border-radius:12px;padding:10px}\n.facts span{display:block;color:var(--fog);font-size:11.5px;font-weight:700}\n.facts b{font:600 16px var(--fd)}\n.insight{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--rim)}\n.insight:first-of-type{border-top:0;padding-top:0}\n.insight .ic{width:36px;height:36px;border-radius:11px;flex:none;display:grid;place-items:center;background:var(--night);border:1px solid var(--rim);font-size:18px}\n.insight p{margin:0;font-size:14px;line-height:1.4}\n.insight p small{display:block;color:var(--fog);font-size:12.5px;margin-top:2px}\n.hours{display:flex;align-items:flex-end;gap:2px;height:90px;margin-top:8px}\n.hours i{flex:1;background:var(--rim2);border-radius:3px 3px 1px 1px;min-height:2px}\n.hours i.hi{background:var(--sig)}\n.hlabels{display:flex;justify-content:space-between;color:var(--fog);font-size:10.5px;font-weight:700;margin-top:5px}\n[hidden]{display:none!important}\n\n/* reja + monetizatsiya */\n.plan{display:flex;gap:12px;align-items:center;padding:11px 0;border-top:1px solid var(--rim)}\n.plan:first-child{border-top:0;padding-top:2px}\n.plan .no{width:30px;height:30px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--night);border:1px solid var(--rim);font:600 12px var(--fd);color:var(--mist)}\n.plan .tx{flex:1;min-width:0}\n.plan .tx b{display:block;font-size:14.5px}\n.plan .tx span{display:block;color:var(--fog);font-size:12.5px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.pill{flex:none;border:1px solid var(--rim2);background:var(--hull);color:var(--mist);font:800 11.5px var(--fb);padding:6px 10px;border-radius:99px;cursor:pointer}\n.pill.s1{color:var(--sig);border-color:color-mix(in srgb,var(--sig) 55%,var(--rim))}\n.pill.s2{color:var(--rise);border-color:color-mix(in srgb,var(--rise) 50%,var(--rim));background:color-mix(in srgb,var(--rise) 10%,var(--hull))}\n.pill[disabled]{cursor:default}\n.plan.done .tx b{color:var(--mist)}\n.ypp{padding:12px 0;border-top:1px solid var(--rim)}\n.ypp:first-of-type{border-top:0;padding-top:0}\n.ypp .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}\n.ypp .top b{font-size:14px}\n.ypp .top .num{font-size:15px}\n.ypp .track{height:10px;border-radius:99px;background:var(--night);border:1px solid var(--rim);margin:8px 0 6px;overflow:hidden}\n.ypp .track i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--sig),var(--brass2));transition:width 1s cubic-bezier(.2,.8,.2,1)}\n.ypp small{color:var(--fog);font-size:12.5px;font-weight:700}\n.ypp .lnk{border:0;background:none;color:var(--sig);font:800 12.5px var(--fb);padding:0;cursor:pointer;margin-left:6px}\n.info{background:color-mix(in srgb,var(--sig) 9%,var(--hull));border:1px solid color-mix(in srgb,var(--sig) 30%,var(--rim));border-radius:var(--r2);padding:12px 14px;font-size:13.5px;line-height:1.45;margin-bottom:12px}\n.field{width:100%;margin:14px 0 12px;padding:13px 14px;border-radius:14px;border:1px solid var(--rim2);background:var(--night);color:var(--paper);font:700 18px var(--fd)}\n.cad{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n</style>\n</head>\n<body>\n<header class=\"bar\">\n  <div class=\"emblem\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M4 19V9M10 19V5M16 19v-7M22 19H2\"/></svg></div>\n  <div class=\"ttl\"><h1 id=\"title\">Kanal statistikasi</h1><p id=\"upd\">Ma'lumot olinmoqda…</p></div>\n  <button class=\"icon-btn\" id=\"ref\" aria-label=\"Yangilash\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5\"/></svg></button>\n</header>\n\n<div id=\"err\" class=\"note\" hidden></div>\n\n<main id=\"v-home\">\n  <section class=\"plate prime\">\n    <div class=\"hero\">\n      <div class=\"dial\" id=\"dial\">\n        <svg viewBox=\"0 0 160 160\"><circle class=\"track\" cx=\"80\" cy=\"80\" r=\"66\" pathLength=\"100\" stroke-dasharray=\"75 100\"/>\n        <circle class=\"fill\" id=\"dial-fill\" cx=\"80\" cy=\"80\" r=\"66\" pathLength=\"100\" stroke-dasharray=\"75 100\" stroke-dashoffset=\"75\"/></svg>\n        <div class=\"mid\"><b class=\"num\" id=\"k-subs\">—</b><span>obunachi</span></div>\n      </div>\n      <div class=\"side\">\n        <div class=\"goal\" id=\"goal\">Maqsad hisoblanmoqda</div>\n        <div class=\"today\"><span class=\"k\">Bugun ko'rishlar</span><span class=\"v num\" id=\"t-views\">—</span><span class=\"y\" id=\"t-yest\"></span></div>\n      </div>\n    </div>\n  </section>\n\n  <div class=\"grid2\">\n    <div class=\"cell\"><div class=\"k\">Ko'rishlar</div><div class=\"v\" id=\"k-v\">—</div><div class=\"d\" id=\"d-v\"></div></div>\n    <div class=\"cell\"><div class=\"k\">Obunachilar bugun</div><div class=\"v\" id=\"k-sd\">—</div><div class=\"d\" id=\"d-s\"></div></div>\n    <div class=\"cell\"><div class=\"k\">Layklar</div><div class=\"v\" id=\"k-l\">—</div><div class=\"d\" id=\"d-l\"></div></div>\n    <div class=\"cell\"><div class=\"k\">Izohlar</div><div class=\"v\" id=\"k-c\">—</div><div class=\"d\" id=\"d-c\"></div></div>\n  </div>\n\n  <section class=\"plate\">\n    <h2>O'sish <small id=\"g-delta\"></small></h2>\n    <div class=\"seg\" id=\"metric\"><button data-m=\"v\" aria-pressed=\"true\">Ko'rishlar</button><button data-m=\"s\" aria-pressed=\"false\">Obunachilar</button><button data-m=\"l\" aria-pressed=\"false\">Layklar</button></div>\n    <div class=\"seg\" id=\"range\"><button data-r=\"1\" aria-pressed=\"false\">24 soat</button><button data-r=\"7\" aria-pressed=\"true\">7 kun</button><button data-r=\"30\" aria-pressed=\"false\">30 kun</button></div>\n    <div class=\"chartbox\" id=\"chart\"></div>\n  </section>\n\n  <section class=\"plate\">\n    <h2>Kunlik ko'rishlar <small>oxirgi 14 kun</small></h2>\n    <div id=\"days\"></div>\n  </section>\n</main>\n\n<main id=\"v-vids\" hidden>\n  <section class=\"plate\">\n    <h2>Videolar <small id=\"vcount\"></small></h2>\n    <div class=\"seg\" id=\"sort\"><button data-o=\"new\" aria-pressed=\"true\">Yangilari</button><button data-o=\"top\" aria-pressed=\"false\">Ko'p ko'rilgan</button><button data-o=\"today\" aria-pressed=\"false\">Bugun o'sgan</button></div>\n    <div id=\"vids\"></div>\n  </section>\n</main>\n\n<main id=\"v-ins\" hidden>\n  <section class=\"plate prime\">\n    <h2>Kanal haqida xulosalar</h2>\n    <div id=\"ins\"></div>\n  </section>\n  <section class=\"plate\">\n    <h2>Qaysi soatda ko'rishyapti <small>Toshkent vaqti</small></h2>\n    <div class=\"hours\" id=\"hours\"></div>\n    <div class=\"hlabels\"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>\n    <p class=\"calm\" id=\"hours-note\" style=\"font-size:12.5px;margin:10px 0 0\"></p>\n  </section>\n</main>\n\n<main id=\"v-plan\" hidden>\n<section class=\"plate prime\">\n  <h2>Chiqish ritmi <small>yangi reja</small></h2>\n  <div class=\"cad\">\n    <div class=\"cell\"><div class=\"k\">Uzun video</div><div class=\"v\">1 / hafta</div><div class=\"d calm\">4–5 daqiqa, nemischa</div></div>\n    <div class=\"cell\"><div class=\"k\">Shorts</div><div class=\"v\">har kuni</div><div class=\"d calm\">uzun videodan kesiladi</div></div>\n  </div>\n</section>\n<section class=\"plate\">\n  <h2>Mavzular navbati <small id=\"plan-count\"></small></h2>\n  <div id=\"plan\"></div>\n  <p class=\"calm\" style=\"font-size:12.5px;margin:10px 0 0\">Holatni o'zgartirish uchun tugmani bosing. Kanalga chiqqan video sarlavhasidan avtomatik «Chiqdi» bo'ladi.</p>\n</section>\n</main>\n\n<main id=\"v-goal\" hidden>\n<section class=\"plate prime\">\n  <h2>YouTube monetizatsiyasigacha <small>hozirgi shartlar</small></h2>\n  <div id=\"ypp\"></div>\n</section>\n<div class=\"info\"><b>1-fevral 2027 dan</b> yangi arizalar uchun shart ikki baravar oshadi: 20 mln Shorts ko'rish yoki 8 000 soat. <b>O'zbekiston</b> hali YouTube monetizatsiyasi ro'yxatida yo'q, shuning uchun hozir asosiy maqsad — 1 000 obunachi va homiylik.</div>\n</main>\n\n<nav class=\"dock\" aria-label=\"Bo'limlar\">\n  <button data-v=\"home\" aria-current=\"page\"><svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 13l4-4M12 5V3\"/></svg>Asosiy</button>\n  <button data-v=\"vids\"><svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M10 9.5v5l4.5-2.5z\"/></svg>Videolar</button>\n  <button data-v=\"plan\"><svg viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"17\" rx=\"3\"/><path d=\"M8 2v4M16 2v4M8 11h8M8 15h5\"/></svg>Reja</button>\n  <button data-v=\"goal\"><svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\"/></svg>Maqsad</button>\n  <button data-v=\"ins\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z\"/></svg>Xulosalar</button>\n</nav>\n\n<div id=\"sh\" class=\"\">\n  <div class=\"scrim\" id=\"scrim\"></div>\n  <div class=\"sheet\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"sh-t\"><div id=\"sh-body\"></div></div>\n</div>\n<div class=\"toast\" id=\"toast\"></div>\n\n<script>\nvar tg = window.Telegram && Telegram.WebApp;\nif (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor('#10132B'); tg.setBackgroundColor('#10132B'); } catch (e) {} }\nvar D = null, metric = 'v', range = 7, order = 'new';\nvar $ = function (id) { return document.getElementById(id); };\nvar H = function (k) { if (tg && tg.HapticFeedback) { try { k === 's' ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.notificationOccurred(k); } catch (e) {} } };\nfunction fmt(x) { x = Math.round(Number(x) || 0); return String(Math.abs(x)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' '); }\nfunction compact(x) { x = Number(x) || 0; if (x >= 1e6) return (x / 1e6).toFixed(x >= 1e7 ? 0 : 1).replace('.', ',') + ' mln'; if (x >= 1e4) return Math.round(x / 1e3) + ' ming'; return fmt(x); }\nfunction signed(d) { return (d > 0 ? '+' : d < 0 ? '−' : '±') + fmt(d); }\nfunction cls(d) { return d > 0 ? 'rise' : d < 0 ? 'fall' : 'calm'; }\nfunction setD(el, d, suffix) { if (d == null) { el.textContent = ''; return; } el.className = 'd ' + cls(d); el.textContent = signed(d) + (suffix || ' bugun'); }\nfunction loc(t) { return new Date(t + D.tz); }\nfunction hhmm(t) { var d = loc(t); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }\nvar MON = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];\nfunction dm(t) { var d = loc(t); return d.getUTCDate() + '-' + MON[d.getUTCMonth()]; }\nfunction dayKey(t) { return loc(t).toISOString().slice(0, 10); }\nfunction secs(iso) { var m = /PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/.exec(iso || ''); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; }\nfunction dur(iso) { var s = secs(iso); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }\nfunction isShort(v) { return /#shorts/i.test(v.t) || secs(v.d) <= 60; }\nfunction toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.k); toast.k = setTimeout(function () { e.classList.remove('on'); }, 1800); }\nfunction showErr(m) { var e = $('err'); e.hidden = !m; e.textContent = m || ''; }\nfunction el(tag, cl, txt) { var e = document.createElement(tag); if (cl) e.className = cl; if (txt != null) e.textContent = txt; return e; }\n\n/* ---------- data ---------- */\nfunction load(fresh) {\n  var b = $('ref'); b.classList.add('busy');\n  if (!D) ['k-subs', 'k-v', 'k-sd', 'k-l', 'k-c', 't-views'].forEach(function (i) { $(i).classList.add('sk'); });\n  return fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg ? tg.initData : '', fresh: !!fresh }) })\n    .then(function (r) { return r.json(); })\n    .then(function (d) {\n      if (d.error) { showErr(d.error); return; }\n      showErr(''); D = d; render();\n      if (fresh) { H('success'); toast('Yangilandi'); }\n    })\n    .catch(function () { showErr(\"Server bilan aloqa yo'q. Internetni tekshirib, yangilash tugmasini bosing.\"); })\n    .then(function () { b.classList.remove('busy'); document.querySelectorAll('.sk').forEach(function (e) { e.classList.remove('sk'); }); });\n}\n\n/* ---------- home ---------- */\nvar GOALS = [[100, 'Birinchi 100 ta'], [250, 'Chorak ming'], [500, \"A'zolik va Super Thanks ochiladi\"], [1000, 'Monetizatsiya sharti'], [2500, 'Kanal o\\'smoqda'], [5000, 'Katta auditoriya'], [10000, 'Kumush tugma yo\\'lida'], [100000, 'Kumush tugma']];\nfunction render() {\n  var s = D.s, b = D.base, y = D.y;\n  $('title').textContent = s.title;\n  $('upd').textContent = 'Yangilandi ' + hhmm(s.at) + (s.handle ? ' · ' + s.handle : '');\n  // dial: progress from previous goal to next\n  var subs = s.subs || 0, prev = 0, goal = GOALS[GOALS.length - 1];\n  for (var i = 0; i < GOALS.length; i++) { if (subs < GOALS[i][0]) { goal = GOALS[i]; prev = i ? GOALS[i - 1][0] : 0; break; } }\n  var p = Math.max(0, Math.min(1, (subs - prev) / (goal[0] - prev)));\n  $('k-subs').textContent = s.subs == null ? '?' : fmt(subs);\n  requestAnimationFrame(function () { $('dial-fill').style.strokeDashoffset = String(75 - 75 * p); });\n  $('goal').innerHTML = '';\n  var g1 = el('div'); g1.appendChild(el('b', '', fmt(goal[0]) + ' obunachigacha'));\n  g1.appendChild(document.createTextNode(' ' + fmt(goal[0] - subs) + ' ta qoldi'));\n  $('goal').appendChild(g1); $('goal').appendChild(el('div', 'calm', goal[1]));\n  var tv = b ? s.views - b.views : null, yv = (b && y) ? b.views - y.views : null;\n  $('t-views').textContent = tv == null ? '—' : signed(tv);\n  $('t-views').className = 'v num ' + (tv == null ? '' : cls(tv));\n  $('t-yest').textContent = yv == null ? 'Kecha bilan solishtirish ertaga chiqadi' : 'Kecha butun kun: ' + signed(yv);\n  $('k-v').textContent = compact(s.views); setD($('d-v'), b ? s.views - b.views : null);\n  $('k-sd').textContent = (b && s.subs != null && b.subs != null) ? signed(s.subs - b.subs) : '—';\n  $('d-s').className = 'd calm'; $('d-s').textContent = s.subs != null ? 'jami ' + fmt(s.subs) : '';\n  $('k-l').textContent = compact(s.likes); setD($('d-l'), b ? s.likes - b.likes : null);\n  $('k-c').textContent = compact(s.comments); setD($('d-c'), b ? s.comments - b.comments : null);\n  chart(); days(); vids(); insights(); plan(); ypp();\n}\n\nfunction series(key, from) {\n  var pts = D.hist.filter(function (p) { return p.t >= from && p[key] != null; }).map(function (p) { return { t: p.t, y: p[key] }; });\n  var cur = key === 'v' ? D.s.views : key === 's' ? D.s.subs : D.s.likes;\n  if (cur != null && (!pts.length || pts[pts.length - 1].t < D.s.at)) pts.push({ t: D.s.at, y: cur });\n  return pts;\n}\n\nfunction lineChart(box, pts, opt) {\n  box.textContent = '';\n  if (pts.length < 2) { box.appendChild(el('div', 'empty', opt.empty || \"Grafik uchun ma'lumot yig'ilmoqda. Bot har soat yangi nuqta qo'shadi.\")); return; }\n  var W = 360, Hh = opt.h || 180, L = 4, R = 4, T = 16, B = 22;\n  var t0 = pts[0].t, t1 = pts[pts.length - 1].t, ys = pts.map(function (p) { return p.y; });\n  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys); if (y1 === y0) { y1 += 1; y0 -= 1; }\n  var X = function (t) { return L + (W - L - R) * (t1 === t0 ? 1 : (t - t0) / (t1 - t0)); };\n  var Y = function (v) { return T + (Hh - T - B) * (1 - (v - y0) / (y1 - y0)); };\n  var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');\n  var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');\n  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh); svg.setAttribute('class', 'chart'); svg.setAttribute('preserveAspectRatio', 'none'); svg.style.height = Hh + 'px';\n  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opt.label || 'Grafik');\n  function add(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }\n  var gid = 'g' + Math.random().toString(36).slice(2);\n  var defs = add('defs', {}); var lg = document.createElementNS(NS, 'linearGradient'); lg.id = gid; lg.setAttribute('x1', 0); lg.setAttribute('x2', 0); lg.setAttribute('y1', 0); lg.setAttribute('y2', 1);\n  [['0', '.32'], ['1', '0']].forEach(function (s) { var st = document.createElementNS(NS, 'stop'); st.setAttribute('offset', s[0]); st.setAttribute('stop-color', 'var(--sig)'); st.setAttribute('stop-opacity', s[1]); lg.appendChild(st); }); defs.appendChild(lg);\n  [0, .5, 1].forEach(function (f) { var yy = T + (Hh - T - B) * f; add('line', { x1: L, x2: W - R, y1: yy, y2: yy, stroke: 'var(--rim)', 'stroke-width': 1, 'stroke-dasharray': '2 4', 'vector-effect': 'non-scaling-stroke' }); });\n  add('path', { d: d + ' L' + X(t1).toFixed(1) + ' ' + (Hh - B) + ' L' + X(t0).toFixed(1) + ' ' + (Hh - B) + ' Z', fill: 'url(#' + gid + ')' });\n  add('path', { d: d, fill: 'none', stroke: 'var(--sig)', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });\n  var lbl = function (x, txt, anchor, yy) { var e = add('text', { x: x, y: yy, fill: 'var(--fog)', 'font-size': 11, 'font-weight': 700, 'text-anchor': anchor }); e.textContent = txt; };\n  lbl(L, opt.fmtT(t0), 'start', Hh - 5); lbl(W - R, opt.fmtT(t1), 'end', Hh - 5); lbl(W - R, compact(y1), 'end', 11);\n  var cur = add('line', { x1: 0, x2: 0, y1: T, y2: Hh - B, stroke: 'var(--mist)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', opacity: 0 });\n  var dot = add('circle', { r: 4.5, fill: 'var(--sig)', stroke: 'var(--night)', 'stroke-width': 2, opacity: 0 });\n  box.appendChild(svg);\n  var tip = el('div', 'tip'); tip.hidden = true; box.appendChild(tip);\n  function scrub(e) {\n    var r = svg.getBoundingClientRect(), cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W;\n    var best = pts[0], bd = 1e9; pts.forEach(function (p) { var dd = Math.abs(X(p.t) - cx); if (dd < bd) { bd = dd; best = p; } });\n    var x = X(best.t), y = Y(best.y);\n    cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('opacity', .5);\n    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);\n    tip.hidden = false; tip.textContent = fmt(best.y) + ' · ' + opt.fmtT(best.t);\n    tip.style.left = Math.max(40, Math.min(r.width - 40, x / W * r.width)) + 'px'; tip.style.top = (y / Hh * r.height) + 'px';\n    if (scrub.last !== best) { scrub.last = best; H('s'); }\n  }\n  function end() { cur.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.hidden = true; }\n  svg.addEventListener('pointerdown', scrub); svg.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'mouse') scrub(e); });\n  svg.addEventListener('pointerleave', end); svg.addEventListener('pointerup', function () { setTimeout(end, 1200); });\n  var g = pts[pts.length - 1].y - pts[0].y; return g;\n}\n\nfunction chart() {\n  var pts = series(metric, D.s.at - range * 86400000);\n  var g = lineChart($('chart'), pts, { fmtT: range === 1 ? hhmm : dm, label: \"O'sish grafigi\" });\n  var gd = $('g-delta'); if (g == null) { gd.textContent = ''; return; }\n  gd.className = cls(g); gd.textContent = signed(g) + (range === 1 ? ' 24 soatda' : ' ' + range + ' kunda');\n}\n\nfunction dailyGains(n) {\n  var out = [], byDay = {};\n  D.hist.concat([{ t: D.s.at, v: D.s.views }]).forEach(function (p) { if (p.v == null) return; var k = dayKey(p.t); byDay[k] = byDay[k] || []; byDay[k].push(p); });\n  var keys = Object.keys(byDay).sort();\n  keys.forEach(function (k, i) {\n    var arr = byDay[k], start = i && byDay[keys[i - 1]] ? byDay[keys[i - 1]][byDay[keys[i - 1]].length - 1].v : arr[0].v;\n    out.push({ k: k, g: Math.max(0, arr[arr.length - 1].v - start), part: i === 0 });\n  });\n  return out.slice(-n);\n}\n\nfunction days() {\n  var box = $('days'); box.textContent = '';\n  var g = dailyGains(14).filter(function (x) { return !x.part; });\n  if (g.length < 2) { box.appendChild(el('div', 'empty', \"Kunlik ustunlar ikki kundan keyin ko'rinadi.\")); return; }\n  var mx = Math.max.apply(null, g.map(function (x) { return x.g; })) || 1;\n  var wrap = el('div', 'bars');\n  g.forEach(function (x) {\n    var b = el('div', 'b' + (x.g === mx ? ' hi' : '')), i = el('i');\n    b.appendChild(el('em', '', x.g === mx ? compact(x.g) : ''));\n    i.style.height = '0%'; b.appendChild(i); b.appendChild(el('span', '', String(+x.k.slice(8))));\n    b.title = x.k + ': +' + fmt(x.g);\n    wrap.appendChild(b); requestAnimationFrame(function () { i.style.height = Math.max(3, x.g / mx * 100) + '%'; });\n  });\n  box.appendChild(wrap);\n}\n\n/* ---------- videos ---------- */\nfunction todayMap() { var m = {}; ((D.base && D.base.vids) || []).forEach(function (v) { m[v.id] = v; }); return m; }\nfunction vids() {\n  var box = $('vids'); box.textContent = '';\n  var bv = todayMap();\n  var list = D.s.vids.map(function (v) { return { v: v, g: bv[v.id] ? v.v - bv[v.id].v : null }; });\n  if (order === 'top') list.sort(function (a, b) { return b.v.v - a.v.v; });\n  else if (order === 'today') list.sort(function (a, b) { return (b.g || 0) - (a.g || 0); });\n  else list.sort(function (a, b) { return a.v.p < b.v.p ? 1 : -1; });\n  $('vcount').textContent = list.length + ' ta';\n  if (!list.length) { box.appendChild(el('div', 'empty', \"Kanalda hali ochiq video yo'q.\")); return; }\n  list.forEach(function (x) {\n    var v = x.v, sh = isShort(v), row = el('div', 'row vid' + (sh ? ' sh' : ''));\n    row.setAttribute('role', 'button'); row.tabIndex = 0;\n    var img = el('img'); img.loading = 'lazy'; img.alt = ''; img.onerror = function () { this.style.visibility = 'hidden'; }; img.src = 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg';\n    var m = el('div', 'm'), t = el('div', 't');\n    t.appendChild(el('span', 'kind' + (sh ? ' short' : ''), sh ? 'Shorts' : 'Video')); t.appendChild(document.createTextNode(v.t.replace(/\\s*#shorts/i, '')));\n    var st = el('div', 's'); st.appendChild(el('b', '', fmt(v.v) + \" ko'rish\"));\n    if (x.g) st.appendChild(el('span', cls(x.g), '  ' + signed(x.g)));\n    st.appendChild(document.createTextNode('  ·  ' + dm(Date.parse(v.p))));\n    m.appendChild(t); m.appendChild(st); row.appendChild(img); row.appendChild(m);\n    row.addEventListener('click', function () { openVid(v, x.g); });\n    row.addEventListener('keydown', function (e) { if (e.key === 'Enter') openVid(v, x.g); });\n    box.appendChild(row);\n  });\n}\n\nfunction openVid(v, g) {\n  H('s');\n  var b = $('sh-body'); b.textContent = '';\n  var h = el('h3', '', v.t.replace(/\\s*#shorts/i, '')); h.id = 'sh-t'; b.appendChild(h);\n  b.appendChild(el('div', 'meta', (isShort(v) ? 'Shorts' : 'Video') + ', ' + dur(v.d) + ', ' + dm(Date.parse(v.p)) + ' chiqqan'));\n  var pts = D.hist.filter(function (p) { return p.pv && p.pv[v.id] != null; }).map(function (p) { return { t: p.t, y: p.pv[v.id] }; });\n  pts.push({ t: D.s.at, y: v.v });\n  var cb = el('div', 'chartbox'); b.appendChild(cb);\n  lineChart(cb, pts, { fmtT: function (t) { return dm(t) + ' ' + hhmm(t); }, h: 150, empty: \"Bu video uchun o'sish tarixi hali yig'ilmagan.\", label: \"Video o'sishi\" });\n  var f = el('div', 'facts');\n  [[\"Ko'rish\", fmt(v.v)], ['Bugun', g == null ? '—' : signed(g)], ['Layk', fmt(v.l)], ['Izoh', fmt(v.c)], ['Layk ulushi', v.v ? (v.l / v.v * 100).toFixed(1).replace('.', ',') + '%' : '—'], [\"Kunlik o'rtacha\", fmt(v.v / Math.max(1, (D.s.at - Date.parse(v.p)) / 86400000))]]\n    .forEach(function (a) { var d = el('div'); d.appendChild(el('span', '', a[0])); d.appendChild(el('b', '', a[1])); f.appendChild(d); });\n  b.appendChild(f);\n  var open = el('button', 'btn', \"YouTube'da ochish\");\n  open.addEventListener('click', function () { var u = 'https://youtu.be/' + v.id; if (tg) tg.openLink(u); else window.open(u, '_blank'); });\n  b.appendChild(open);\n  var cl = el('button', 'btn ghost', 'Yopish'); cl.style.marginTop = '8px'; cl.addEventListener('click', closeSheet); b.appendChild(cl);\n  $('sh').classList.add('open');\n  if (tg && tg.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(closeSheet); }\n}\nfunction closeSheet() { $('sh').classList.remove('open'); if (tg && tg.BackButton) { tg.BackButton.hide(); tg.BackButton.offClick(closeSheet); } }\n$('scrim').addEventListener('click', closeSheet);\ndocument.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });\n\n/* ---------- insights ---------- */\nfunction insights() {\n  var box = $('ins'); box.textContent = '';\n  var s = D.s, list = [];\n  function add(ic, main, sub) { var r = el('div', 'insight'); r.appendChild(el('div', 'ic', ic)); var p = el('p', '', main); if (sub) p.appendChild(el('small', '', sub)); r.appendChild(p); box.appendChild(r); }\n  if (s.vids.length) {\n    var top = s.vids.slice().sort(function (a, b) { return b.v - a.v; })[0];\n    var share = s.views ? Math.round(top.v / s.views * 100) : 0;\n    add('🏆', 'Eng kuchli video: ' + top.t.replace(/\\s*#shorts/i, ''), fmt(top.v) + \" ko'rish, kanal ko'rishlarining \" + share + '%.');\n    var sh = s.vids.filter(isShort), lg = s.vids.filter(function (v) { return !isShort(v); });\n    var avg = function (a) { return a.length ? a.reduce(function (x, v) { return x + v.v; }, 0) / a.length : 0; };\n    if (sh.length && lg.length) add('⚖️', \"Shorts o'rtacha \" + fmt(avg(sh)) + \", uzun video \" + fmt(avg(lg)) + \" ko'rish oladi.\", avg(sh) > avg(lg) ? 'Hozircha Shorts kanalni ko\\'proq olib boryapti.' : 'Uzun videolar yaxshiroq ishlayapti.');\n    var lr = s.views ? s.likes / s.views * 100 : 0;\n    add('❤️', 'Layk ulushi: ' + lr.toFixed(1).replace('.', ',') + '%', lr >= 4 ? \"Yaxshi ko'rsatkich: tomoshabinlarga yoqyapti.\" : \"Oxirida layk bosishni so'rash yordam berishi mumkin.\");\n    var newest = s.vids.slice().sort(function (a, b) { return a.p < b.p ? 1 : -1; })[0];\n    var days = Math.floor((s.at - Date.parse(newest.p)) / 86400000);\n    add('🗓', days <= 0 ? 'Bugun yangi video chiqdi.' : 'Oxirgi video ' + days + ' kun oldin chiqdi.', days >= 3 ? 'Shorts 2–3 kunda bitta chiqsa, kanal tezroq o\\'sadi.' : 'Ritm yaxshi, shunday davom eting.');\n  }\n  var gains = dailyGains(8).filter(function (x) { return !x.part; });\n  if (gains.length >= 2) { var best = gains.slice().sort(function (a, b) { return b.g - a.g; })[0]; add('📈', 'Eng yaxshi kun: ' + dm(Date.parse(best.k + 'T12:00:00Z') - D.tz), '+' + fmt(best.g) + \" ko'rish bir kunda.\"); }\n  if (!box.children.length) box.appendChild(el('div', 'empty', \"Xulosalar uchun hali ma'lumot kam.\"));\n  hours();\n}\n\nfunction hours() {\n  var box = $('hours'); box.textContent = '';\n  var sum = new Array(24).fill(0), cnt = new Array(24).fill(0), h = D.hist;\n  for (var i = 1; i < h.length; i++) {\n    var dt = h[i].t - h[i - 1].t; if (dt > 2 * 3600000 || h[i].v == null || h[i - 1].v == null) continue;\n    var hr = loc(h[i].t).getUTCHours(); sum[hr] += Math.max(0, h[i].v - h[i - 1].v); cnt[hr]++;\n  }\n  var avg = sum.map(function (s, i) { return cnt[i] ? s / cnt[i] : 0; }), mx = Math.max.apply(null, avg);\n  if (!mx) { box.appendChild(el('div', 'empty', \"Soatlik tahlil uchun bir-ikki kunlik ma'lumot kerak.\")); $('hours-note').textContent = ''; return; }\n  var best = avg.indexOf(mx);\n  avg.forEach(function (a, i) { var b = el('i', i === best ? 'hi' : ''); b.style.height = Math.max(2, a / mx * 100) + '%'; b.title = String(i).padStart(2, '0') + ':00 — ' + fmt(a); box.appendChild(b); });\n  $('hours-note').textContent = \"Eng ko'p ko'rish soat \" + String(best).padStart(2, '0') + ':00 atrofida keladi (o\\'rtacha ' + fmt(mx) + ' ta). Videolarni shu vaqtdan 1–2 soat oldin chiqaring.';\n}\n\n/* ---------- reja ---------- */\nfunction save(body) {\n  body.initData = tg ? tg.initData : '';\n  return fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })\n    .then(function (r) { return r.json(); });\n}\nvar ST = ['Navbatda', 'Tayyorlanmoqda', 'Chiqdi'];\nfunction plan() {\n  var box = $('plan'); box.textContent = '';\n  var P = D.plan || [], done = P.filter(function (p) { return p.status === 'Chiqdi'; }).length;\n  $('plan-count').textContent = done + ' / ' + P.length + ' chiqdi';\n  P.forEach(function (p, i) {\n    var r = el('div', 'plan' + (p.status === 'Chiqdi' ? ' done' : ''));\n    r.appendChild(el('div', 'no', String(i + 1)));\n    var t = el('div', 'tx'); t.appendChild(el('b', '', p.topic)); t.appendChild(el('span', '', '„' + p.hook + '“')); r.appendChild(t);\n    var b = el('button', 'pill s' + ST.indexOf(p.status), p.status === 'Chiqdi' && p.at ? 'Chiqdi · ' + dm(Date.parse(p.at)) : p.status);\n    if (p.auto) { b.disabled = true; b.title = 'Kanaldagi videodan aniqlandi'; }\n    else b.addEventListener('click', function () {\n      var old = p.status; p.status = ST[(ST.indexOf(p.status) + 1) % ST.length]; plan(); H('s');\n      save({ kind: 'plan', topic: p.topic, status: p.status }).then(function (d) { if (!d.ok) throw 0; })\n        .catch(function () { p.status = old; plan(); toast('Saqlanmadi'); });\n    });\n    r.appendChild(b); box.appendChild(r);\n  });\n}\n\n/* ---------- monetizatsiya ---------- */\nfunction ypp() {\n  var box = $('ypp'); box.textContent = '';\n  var s = D.s, m = D.manual || {}, from = s.at - 90 * 86400000;\n  var shortsV = s.vids.filter(function (v) { return isShort(v) && Date.parse(v.p) >= from; }).reduce(function (a, v) { return a + v.v; }, 0);\n  function row(name, val, need, sub, unit, extra) {\n    var w = el('div', 'ypp'), top = el('div', 'top');\n    top.appendChild(el('b', '', name));\n    top.appendChild(el('span', 'num', val == null ? '—' : (unit ? String(val).replace('.', ',') : fmt(val)) + (unit || '')));\n    w.appendChild(top);\n    var tr = el('div', 'track'), i = el('i'); tr.appendChild(i); w.appendChild(tr);\n    var pc = val == null ? 0 : Math.min(100, val / need * 100);\n    requestAnimationFrame(function () { i.style.width = Math.max(pc ? 1.5 : 0, pc) + '%'; });\n    var sm = el('small', '', (val == null ? '' : (pc < 1 && pc > 0 ? pc.toFixed(2).replace('.', ',') : Math.round(pc)) + '% · ') + fmt(need) + (unit || '') + ' kerak' + (sub ? ' · ' + sub : ''));\n    w.appendChild(sm); if (extra) w.appendChild(extra);\n    box.appendChild(w);\n  }\n  row('Obunachilar', s.subs, 1000, '');\n  row(\"Shorts ko'rishlari · 90 kun\", shortsV, 10000000, 'taxminan');\n  var ed = el('button', 'lnk', m.hours != null ? 'O\\'zgartirish' : 'Kiritish');\n  ed.addEventListener('click', hoursSheet);\n  row(\"Uzun videolar ko'rish soati · 12 oy\", m.hours != null ? m.hours : null, 4000,\n      m.hours != null ? 'Studio, ' + dm(m.at) : \"YouTube API bermaydi, Studio'dan kiriting\", ' soat', ed);\n}\nfunction hoursSheet() {\n  var b = $('sh-body'); b.textContent = '';\n  b.appendChild(el('h3', '', \"Uzun videolar ko'rish soati\"));\n  b.appendChild(el('p', 'calm', \"YouTube Studio → Monetizatsiya bo'limidagi «Public watch hours» sonini yozing.\"));\n  var f = el('input', 'field'); f.type = 'number'; f.inputMode = 'decimal'; f.min = '0'; f.step = '0.1'; f.placeholder = 'masalan 42.5';\n  if (D.manual && D.manual.hours != null) f.value = D.manual.hours;\n  b.appendChild(f);\n  var ok = el('button', 'btn', 'Saqlash');\n  ok.addEventListener('click', function () {\n    var v = parseFloat(String(f.value).replace(',', '.'));\n    if (!(v >= 0)) { toast('Son kiriting'); return; }\n    ok.disabled = true;\n    save({ kind: 'hours', hours: v }).then(function (d) {\n      if (!d.ok) throw 0; D.manual = { hours: Math.round(v * 10) / 10, at: Date.now() }; ypp(); closeSheet(); H('success'); toast('Saqlandi');\n    }).catch(function () { ok.disabled = false; toast('Saqlanmadi'); });\n  });\n  b.appendChild(ok);\n  $('sh').classList.add('open');\n  if (tg && tg.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(closeSheet); }\n  setTimeout(function () { f.focus(); }, 300);\n}\n\n/* ---------- controls ---------- */\nfunction seg(id, attr, set) {\n  $(id).addEventListener('click', function (e) {\n    var b = e.target.closest('button'); if (!b) return;\n    [].forEach.call($(id).children, function (x) { x.setAttribute('aria-pressed', x === b); });\n    set(b.getAttribute(attr)); if (D) { id === 'sort' ? vids() : chart(); } H('s');\n  });\n}\nseg('metric', 'data-m', function (v) { metric = v; });\nseg('range', 'data-r', function (v) { range = +v; });\nseg('sort', 'data-o', function (v) { order = v; });\ndocument.querySelector('.dock').addEventListener('click', function (e) {\n  var b = e.target.closest('button'); if (!b) return;\n  [].forEach.call(this.children, function (x) { x.toggleAttribute('aria-current', x === b); if (x === b) x.setAttribute('aria-current', 'page'); });\n  ['home', 'vids', 'plan', 'goal', 'ins'].forEach(function (v) { $('v-' + v).hidden = v !== b.dataset.v; });\n  window.scrollTo(0, 0); H('s');\n});\n$('ref').addEventListener('click', function () { load(true); });\nload(false);\n</script>\n</body>\n</html>\n";
