/* Vauuv test bot — Virtual Ofisdagi Elyor yozgan Python botning Cloudflare versiyasi.
   Elyorning kodidagi kamchiliklar tuzatilgan: kompyuter yoqiq turishi shart emas (webhook),
   token kodda emas (Cloudflare'da BOT_TOKEN), imlo to'g'rilangan, /help qo'shilgan.

   Sozlash: Settings → Variables and Secrets → BOT_TOKEN (Secret) = BotFather bergan token.
   Keyin bir marta oching: https://<worker-manzili>/setup */

const APP_URL = 'https://mamarajabovd31-creator.github.io/Bu-qanday-ishlaydi/vauuv/';
const APP_BTN = { inline_keyboard: [[{ text: '🗿 Ilovani ochish', web_app: { url: APP_URL } }]] };

async function tg(env, method, body){
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({ ok: false }));
}
// Webhook maxfiy so'zi tokendan hosil qilinadi (alohida sozlash shart emas)
async function hookSecret(env){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vauuv:' + env.BOT_TOKEN));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 48);
}

function answer(text){
  const t = text.trim(), low = t.toLowerCase(), cmd = low.split(/[\s@]/)[0];
  if (cmd === '/start') return "Salom! Men sizning xabarlaringizni eshitishga tayyorman 🐺\n\n/va_uv — vauuvvv deyman\n/help — yordam\n\nPastdagi tugmani bosing — tosh odam oynani ochib beradi 🗿";
  if (cmd === '/va_uv' || low.includes('vauuvvv')) return 'Vauuvvv! 🐺';
  if (cmd === '/help') return "Buyruqlar:\n/start — boshlash\n/va_uv — vauuvvv\n\nYoki shunchaki biror narsa yozing.";
  return 'Sizning xabaringiz qabul qilindi: «' + t.slice(0, 200) + '»';
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (!env.BOT_TOKEN) return new Response("BOT_TOKEN yo'q: Settings → Variables and Secrets ga qo'shing", { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    if (url.pathname === '/setup') {
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: await hookSecret(env), allowed_updates: ['message'], drop_pending_updates: true });
      await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ilova', web_app: { url: APP_URL } } });
      const cmds = await tg(env, 'setMyCommands', { commands: [
        { command: 'start', description: 'Boshlash' }, { command: 'va_uv', description: 'Vauuvvv!' }, { command: 'help', description: 'Yordam' }] });
      return new Response(hook.ok && cmds.ok ? '✅ Bot ulandi! Endi Telegram\'da /start yozing.' : '❌ ' + JSON.stringify({ hook, cmds }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== await hookSecret(env)) return new Response('no', { status: 403 });
      const u = await req.json().catch(() => null), m = u && u.message;
      if (m && m.text) {
        const isStart = m.text.trim().toLowerCase().startsWith('/start');
        await tg(env, 'sendMessage', Object.assign({ chat_id: m.chat.id, text: answer(m.text) }, isStart ? { reply_markup: APP_BTN } : {}));
      }
      return new Response('ok');
    }
    return new Response('Vauuv test bot ishlayapti ✅', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
