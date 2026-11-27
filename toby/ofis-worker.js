/* ★ VERSIYA 3 — "Virtual Ofis": osmon kemasi, alohida xonalar, o'yin kemasi va reyting.
   "Virtual Ofis" — AI xodimlar ishlaydigan ofis uchun server (Cloudflare Worker, bepul).

   Nima qiladi:
   - Rustam (boshliq) sizning xabaringizni AI orqali o'qiydi va ishni kerakli xodimlarga taqsimlaydi.
   - Har bir xodim vazifani AI orqali HAQIQATAN bajaradi (matn, reja, kod, hisob-kitob, ssenariy...).
   - Natija Mini App'da chiqadi va botga ham xabar bo'lib keladi.
   - Botga to'g'ridan-to'g'ri yozsangiz ham ishlaydi (Mini App ochmasdan).
   - Har daqiqada (Cron) qolib ketgan vazifalarni o'zi bajarib qo'yadi.

   Cloudflare sozlamalari (Settings → Variables and Secrets):
     BOT_TOKEN       — BotFather bergan token (Secret)
     WEBHOOK_SECRET  — o'zingiz o'ylab topgan uzun so'z, masalan: ofis2026maxfiy (Secret)
     ADMIN_ID        — /id buyrug'i bergan raqam (Text). Faqat shu odam (va ALLOWED_IDS) ofisdan foydalana oladi
     GEMINI_API_KEY  — ixtiyoriy, lekin tavsiya: aistudio.google.com dan bepul kalit (Secret). O'zbekcha ancha yaxshi bo'ladi
     ALLOWED_IDS     — ixtiyoriy: boshqa ruxsat berilganlar, vergul bilan (Text)
     CHANNEL_ID      — postlar joylanadigan kanal, masalan: @tobyland_uz (Text)
     CHANNEL_BOT_TOKEN — kanalga post tashlaydigan ESKI bot tokeni (Secret). U kanalda admin bo'lishi kerak.
                       Bo'lmasa, yangi botning o'zi joylaydi (uni ham kanalga admin qiling)
     DAILY_POST      — ixtiyoriy: "off" desangiz har kungi post qoralamasi yuborilmaydi
     POST_HOUR       — ixtiyoriy: kunlik qoralama soati (Toshkent vaqti), odatda 10
   Bindings:
     KV namespace  → nomi OFIS
     Workers AI    → nomi AI
   Triggers → Cron Triggers: * * * * *   (har daqiqa)

   Keyin brauzerda bir marta oching: https://<worker-manzili>/setup?key=<WEBHOOK_SECRET>
   Mini App sahifasi shu serverning o'zida turadi (GitHub kerak emas).
*/

// Mini App sahifasi (o'zgartirmang — pastdagi server kodi uni / manzilida ko'rsatadi)
// Mini App sahifasi (har qator alohida — muharrir qotmasligi uchun)
const HTML = [
"<!doctype html>",
"<html lang=\"uz\">",
"<head>",
"<meta charset=\"utf-8\">",
"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover\">",
"<title>Virtual Ofis</title>",
"<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>",
"<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">",
"<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>",
"<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap\">",
"<style>",
"/* Virtual Ofis — Toby Land osmon kemasi.",
"   Telefon: tepada 3D sahna, pastda tortiladigan varaq (chat / vazifalar / jamoa / reyting).",
"   Noutbuk: chapda 3D sahna, o'ngda keng boshqaruv paneli. */",
":root{",
"  --bg:#0b0e22; --panel:#141836; --card:#1d2248; --card2:#252b5a; --line:#2c3366; --line2:#3a4282;",
"  --text:#F3F1FF; --muted:#B9BDE6; --dim:#7C82B8;",
"  --accent:#E9B44C; --accent2:#FFD98A; --ink:#1A1300; --mint:#3ED6A5; --red:#FF6B5E; --violet:#9B8CFF; --sky:#5AD1FF;",
"  --fd:\"Unbounded\",system-ui,sans-serif; --fb:\"Manrope\",system-ui,-apple-system,sans-serif; --fm:\"JetBrains Mono\",ui-monospace,Menlo,monospace;",
"  --vh:var(--tg-viewport-stable-height,100vh);",
"  --sheet:54%;",
"  color-scheme:dark;",
"}",
"*{box-sizing:border-box}",
"[hidden]{display:none!important}",
"html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font:500 14px/1.45 var(--fb);overflow:hidden;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased}",
"button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}",
"button:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
".app{height:var(--vh);display:flex;flex-direction:column;position:relative}",
"",
"/* ---------- 3D sahna ---------- */",
".stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#03040c}",
"#c{display:block;width:100%;height:100%;touch-action:none;outline:none}",
".labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}",
".tag{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;font:800 12px/1 var(--fb);padding:5px 9px 5px 6px;border-radius:999px;background:rgba(11,14,34,.86);border:1px solid rgba(255,255,255,.12);white-space:nowrap;will-change:transform;pointer-events:auto;cursor:pointer}",
".tag i{width:8px;height:8px;border-radius:50%;background:var(--dim);flex:none}",
".tag.work i{background:var(--accent);box-shadow:0 0 0 3px rgba(233,180,76,.25)}",
".tag.walk i{background:var(--sky)}",
".tag.play i{background:var(--violet)}",
".tag.think i{background:var(--violet);animation:pulse 1s infinite}",
".tag.err i{background:var(--red)}",
".tag em{font:600 11px var(--fm);font-style:normal;color:var(--accent)}",
".tag.sel{background:var(--accent);color:var(--ink);border-color:var(--accent)}",
".tag.sel em{color:var(--ink)}",
"@keyframes pulse{50%{opacity:.35}}",
".bub{position:absolute;left:0;top:0;max-width:190px;font:700 12.5px/1.35 var(--fb);padding:8px 11px;border-radius:13px 13px 13px 3px;background:#fff;color:#141a2a;box-shadow:0 8px 20px rgba(0,0,0,.4);will-change:transform}",
".bub.dots::after{content:\"\";display:inline-block;width:18px;text-align:left;animation:dots 1.2s steps(4) infinite}",
"@keyframes dots{0%{content:\"\"}25%{content:\".\"}50%{content:\"..\"}75%{content:\"...\"}}",
".hud{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));display:flex;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none}",
".pill{pointer-events:auto;display:flex;align-items:center;gap:8px;background:rgba(11,14,34,.8);border:1px solid var(--line);border-radius:13px;padding:7px 11px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}",
".brand b{font:600 12.5px var(--fd)}",
".brand small{display:block;font:600 10px var(--fm);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}",
".led{width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 3px rgba(63,216,166,.18);flex:none}",
".led.demo{background:var(--accent)} .led.off{background:var(--red)}",
".cams{pointer-events:auto;display:flex;gap:4px;background:rgba(11,14,34,.8);border:1px solid var(--line);border-radius:13px;padding:4px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}",
".cams button{display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:9px;font:800 12px var(--fb);color:var(--muted);white-space:nowrap}",
".cams button[aria-pressed=\"true\"]{background:var(--accent);color:var(--ink)}",
".cams svg{width:16px;height:16px;flex:none}",
".cams .lb{display:none}",
"@media (min-width:560px){.cams .lb{display:inline}}",
".act{position:absolute;left:max(10px,env(safe-area-inset-left,0px));bottom:12px;pointer-events:none;font:700 12px var(--fb);color:var(--muted);display:flex;gap:6px;flex-wrap:wrap}",
".act span{background:rgba(11,14,34,.78);border:1px solid var(--line);border-radius:999px;padding:5px 10px}",
".act b{font-family:var(--fm);color:var(--accent)}",
".keys{position:absolute;right:12px;bottom:12px;font:600 11.5px var(--fb);color:var(--dim);background:rgba(11,14,34,.7);border:1px solid var(--line);border-radius:10px;padding:6px 10px;pointer-events:none;display:none}",
"@media (pointer:fine) and (min-width:900px){.keys{display:block}}",
".keys kbd{font:600 11px var(--fm);color:var(--text);background:var(--card);border:1px solid var(--line2);border-radius:5px;padding:1px 5px}",
".toast{position:absolute;left:50%;top:64px;transform:translateX(-50%);max-width:calc(100% - 24px);background:rgba(11,14,34,.92);border:1px solid var(--line2);border-radius:12px;padding:9px 13px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .3s;z-index:5}",
"",
"/* ---------- Varaq (panel) ---------- */",
".sheet{height:var(--sheet);flex:none;display:flex;flex-direction:column;min-height:0;background:var(--panel);border-top:1px solid var(--line);border-radius:20px 20px 0 0;margin-top:-16px;position:relative;z-index:3;box-shadow:0 -1px 0 rgba(233,180,76,.22),0 -18px 40px rgba(0,0,0,.4);transition:height .25s ease}",
".sheet.drag{transition:none}",
".grab{display:flex;justify-content:center;padding:8px 0 4px;cursor:grab;touch-action:none}",
".grab i{width:42px;height:5px;border-radius:9px;background:var(--line2)}",
"@media (min-width:900px){",
"  .app{flex-direction:row}",
"  .sheet{height:auto!important;width:min(480px,40vw);margin:0;border-radius:0;border-top:0;border-left:1px solid var(--line);box-shadow:-18px 0 40px rgba(0,0,0,.35)}",
"  .grab{display:none}",
"}",
".tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px 12px 10px}",
"@media (min-width:900px){.tabs{padding:14px 16px 12px}}",
".tab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px 6px;border-radius:12px;font:800 11.5px var(--fb);color:var(--muted);position:relative}",
".tab svg{width:20px;height:20px}",
".tab[aria-selected=\"true\"]{background:var(--card);color:var(--text);box-shadow:inset 0 0 0 1px var(--line2)}",
".tab[aria-selected=\"true\"] svg{color:var(--accent)}",
".cnt{position:absolute;top:3px;right:calc(50% - 22px);font:700 10px var(--fm);background:var(--accent);color:var(--ink);border-radius:999px;padding:1px 6px;min-width:18px;text-align:center}",
".view{flex:1;min-height:0;display:flex;flex-direction:column}",
".scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:2px 14px 16px}",
"@media (min-width:900px){.scroll{padding:2px 18px 18px}}",
".banner{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:rgba(233,180,76,.08);border:1px solid rgba(233,180,76,.3);font-size:12.5px;color:#ffd99a}",
".empty{color:var(--muted);text-align:center;padding:28px 10px;font-size:13px}",
"",
"/* chat */",
".msgs{display:flex;flex-direction:column;gap:12px}",
".m{display:flex;gap:9px;align-items:flex-start}",
".av{width:34px;height:34px;flex:none;border-radius:12px;display:grid;place-items:center;font:600 13px var(--fd);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3)}",
".m .b{min-width:0;flex:1}",
".m .meta{display:flex;align-items:baseline;gap:6px;margin-bottom:3px;font-size:11px;color:var(--muted)}",
".m .meta b{font-size:13.5px;color:var(--text)}",
".m .meta .t{margin-left:auto;font:500 10px var(--fm);color:var(--dim)}",
".m .txt{background:var(--card);border:1px solid var(--line);border-radius:4px 14px 14px 14px;padding:9px 12px;font-size:14px;overflow-wrap:anywhere}",
".m .txt p{margin:0 0 6px}.m .txt p:last-child{margin:0}",
".mention{color:var(--accent);font-weight:800}",
".me{justify-content:flex-end}",
".me .txt{background:#2c2417;border-color:#4d3a1d;border-radius:14px 4px 14px 14px;max-width:86%}",
".me .to{font:700 11px var(--fb);color:var(--accent);text-align:right;margin-bottom:3px}",
".me.wait{opacity:.6}",
".chips{display:flex;flex-direction:column;gap:6px;margin-top:7px}",
".tchip{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:8px 10px;text-align:left;width:100%}",
".tchip .av{width:24px;height:24px;border-radius:8px;font-size:10px}",
".tchip .tt{min-width:0;font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
".tchip .tt small{display:block;font-weight:600;font-size:11px;color:var(--muted)}",
".tchip .pc{font:600 11.5px var(--fm);color:var(--accent)}",
".tchip .pc.ok{color:var(--mint)} .tchip .pc.err{color:var(--red)}",
".bar{grid-column:1/-1;height:4px;border-radius:9px;background:#212c47;overflow:hidden}",
".bar i{display:block;height:100%;width:0;background:var(--accent);border-radius:9px;transition:width .5s}",
".bar.ok i{background:var(--mint)}",
".res{margin-top:7px;border-radius:12px;border:1px solid rgba(63,216,166,.35);background:linear-gradient(180deg,rgba(63,216,166,.09),rgba(63,216,166,.02));padding:10px 12px}",
".res .rt{font:600 9.5px var(--fd);letter-spacing:.14em;color:var(--mint);text-transform:uppercase}",
".res .rh{font-weight:800;font-size:14px;margin:3px 0 4px}",
".res .rp{font-size:12.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
".res .open{margin-top:8px;background:var(--mint);color:#062a1d;font-weight:800;font-size:13px;border-radius:9px;padding:7px 13px}",
".typing{display:flex;gap:9px;align-items:center;font-size:12.5px;color:var(--muted)}",
".typing .av{width:26px;height:26px;border-radius:9px;font-size:10px}",
"",
"/* vazifa berish (composer) */",
".compose{border-top:1px solid var(--line);padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));position:relative;background:var(--panel)}",
"@media (min-width:900px){.compose{padding:12px 18px 16px}}",
".to-row{display:flex;align-items:center;gap:6px;margin-bottom:8px;min-width:0}",
".to-row>span{font:800 11px var(--fb);color:var(--dim);text-transform:uppercase;letter-spacing:.06em;flex:none}",
".who{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;padding:2px}",
".who::-webkit-scrollbar{display:none}",
".wc{flex:none;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid var(--line);background:var(--card);font:800 12px var(--fb);color:var(--muted)}",
".wc .av{width:22px;height:22px;border-radius:50%;font-size:9.5px}",
".wc[aria-pressed=\"true\"]{border-color:var(--accent);color:var(--text);background:#2d2716}",
".wc.auto{padding-left:10px}",
".row{display:flex;gap:8px;align-items:flex-end}",
".inbox{flex:1;min-width:0;position:relative}",
"#inp{display:block;width:100%;resize:none;max-height:140px;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:14px;padding:11px 44px 11px 13px;font:500 16px/1.4 var(--fb)}",
"@media (min-width:900px){#inp{min-height:78px;max-height:220px;font-size:15px}}",
"#inp::placeholder{color:var(--dim)}",
".tplBtn{position:absolute;right:6px;bottom:6px;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--accent)}",
".tplBtn:hover{background:var(--card2)}",
".send{width:48px;height:48px;flex:none;border-radius:14px;background:var(--accent);color:var(--ink);display:grid;place-items:center}",
".send:disabled{opacity:.45}",
".hint{font:600 11px var(--fb);color:var(--dim);margin-top:6px;display:none}",
"@media (pointer:fine) and (min-width:900px){.hint{display:block}}",
".pop{position:absolute;left:12px;right:12px;bottom:calc(100% - 2px);background:var(--card2);border:1px solid var(--line2);border-radius:14px;padding:6px;max-height:min(300px,48vh);overflow-y:auto;box-shadow:0 -12px 30px rgba(0,0,0,.45);z-index:4}",
"@media (min-width:900px){.pop{left:18px;right:18px}}",
".pop button{display:flex;width:100%;align-items:center;gap:10px;border-radius:10px;padding:8px 9px;text-align:left;font-size:13px}",
".pop button.on,.pop button:hover{background:#2c3460}",
".pop .av{width:28px;height:28px;border-radius:9px;font-size:10px}",
".pop small{color:var(--muted);font-size:11.5px}",
".pop h6{margin:4px 8px 6px;font:800 10.5px var(--fb);color:var(--dim);text-transform:uppercase;letter-spacing:.08em}",
"",
"/* vazifalar */",
".seg{display:flex;gap:6px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none}",
".seg::-webkit-scrollbar{display:none}",
".seg button{flex:none;border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:800;color:var(--muted)}",
".seg button[aria-pressed=\"true\"]{background:var(--text);color:var(--bg);border-color:var(--text)}",
".tl{display:flex;flex-direction:column;gap:9px}",
".task{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 12px;display:grid;grid-template-columns:auto 1fr auto;gap:6px 10px;align-items:center}",
".task .tt{min-width:0;font-weight:800;font-size:14px;line-height:1.3;overflow-wrap:anywhere}",
".task .tt small{display:block;font-weight:600;font-size:11.5px;color:var(--muted);margin-top:2px}",
".st{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}",
".st.run{background:rgba(233,180,76,.14);color:var(--accent)}",
".st.new{background:#232b52;color:var(--muted)}",
".st.done{background:rgba(63,216,166,.14);color:var(--mint)}",
".st.error{background:rgba(255,107,107,.14);color:var(--red)}",
".task .sum{grid-column:1/-1;font-size:12.5px;color:var(--muted)}",
".task .acts{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}",
".btn{border:1px solid var(--line);background:var(--card2);border-radius:10px;padding:8px 13px;font-weight:800;font-size:12.5px}",
".btn.pri{background:var(--accent);border-color:var(--accent);color:var(--ink)}",
".btn.ok{background:var(--mint);border-color:var(--mint);color:#062a1d}",
".btn.ghost{background:none}",
"",
"/* jamoa */",
".team{display:grid;grid-template-columns:repeat(auto-fill,minmax(152px,1fr));gap:8px}",
".mate{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:7px;text-align:left}",
".mate.sel{border-color:var(--accent)}",
".mate .hd{display:flex;gap:8px;align-items:center}",
".mate .hd div{min-width:0}",
".mate b{display:block;font-size:13.5px}",
".mate span{font-size:11px;color:var(--muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
".mate .stt{font-size:11.5px;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:6px;min-height:16px}",
".mate .stt i{width:7px;height:7px;border-radius:50%;background:var(--dim);flex:none}",
".mate .stt.work{color:var(--accent)} .mate .stt.work i{background:var(--accent)}",
".mate .stt.play{color:var(--violet)} .mate .stt.play i{background:var(--violet)}",
".mate .stt.err{color:var(--red)} .mate .stt.err i{background:var(--red)}",
".mate .ft{display:flex;justify-content:space-between;font:600 11px var(--fm);color:var(--muted)}",
".mate .ft b{display:inline;font-size:11px;color:var(--text)}",
".mate .acts{display:flex;gap:6px}",
".mate .acts button{flex:1;border:1px solid var(--line);border-radius:9px;padding:5px 0;font:800 11.5px var(--fb);color:var(--muted)}",
".mate .acts button:hover{color:var(--text);border-color:var(--line2)}",
"",
"/* reyting */",
".live{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}",
".live .lv{display:flex;align-items:center;gap:8px;background:rgba(155,140,255,.08);border:1px solid rgba(155,140,255,.3);border-radius:12px;padding:8px 10px;font-size:12.5px;font-weight:700}",
".live .lv b{color:var(--violet)}",
".board{display:flex;flex-direction:column;gap:6px}",
".rk{display:grid;grid-template-columns:28px auto 1fr auto;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 11px;width:100%;text-align:left}",
".rk .n{font:700 14px var(--fm);color:var(--dim);text-align:center}",
".rk:nth-child(1) .n{color:#ffd24a}.rk:nth-child(2) .n{color:#cfd8ea}.rk:nth-child(3) .n{color:#e2a06a}",
".rk .nm{min-width:0}",
".rk .nm b{display:block;font-size:13.5px}",
".rk .nm small{font-size:11px;color:var(--muted)}",
".rk .sc{font:700 15px var(--fm);color:var(--accent);text-align:right}",
".rk .sc small{display:block;font:600 10.5px var(--fm);color:var(--dim)}",
".hist{margin-top:14px}",
".hist h6{margin:0 0 6px;font:800 11px var(--fb);color:var(--dim);text-transform:uppercase;letter-spacing:.08em}",
".hist div{font-size:12.5px;color:var(--muted);padding:6px 0;border-bottom:1px dashed var(--line)}",
".hist div b{color:var(--text)}",
"",
"/* natija oynasi */",
".modal{position:fixed;inset:0;z-index:20;background:rgba(3,6,14,.62);display:flex;align-items:flex-end;justify-content:center}",
"@media (min-width:900px){.modal{align-items:center}}",
".mbox{width:100%;max-width:720px;max-height:calc(var(--vh) - 40px);background:var(--panel);border:1px solid var(--line);border-radius:20px 20px 0 0;display:flex;flex-direction:column;animation:up .25s ease-out}",
"@media (min-width:900px){.mbox{border-radius:20px;max-height:86vh}}",
"@keyframes up{from{transform:translateY(30px);opacity:0}}",
".mh{display:flex;gap:10px;align-items:center;padding:14px 16px 10px;border-bottom:1px solid var(--line)}",
".mh>div:not(.av){min-width:0;flex:1}",
".mh b{display:block;font:600 14px/1.3 var(--fd)}",
".mh span{font-size:12px;color:var(--muted)}",
".x{width:36px;height:36px;border-radius:11px;background:var(--card);font-size:19px;color:var(--muted)}",
".mb{overflow-y:auto;padding:14px 16px;font-size:14.5px;line-height:1.6;overflow-wrap:anywhere}",
".mb p{margin:0 0 10px}",
".mb .h{display:block;font-size:15px;margin-top:4px}",
".mb pre{position:relative;background:#070b16;border:1px solid var(--line);border-radius:10px;padding:10px 12px;overflow-x:auto;font:500 12.5px/1.5 var(--fm);margin:0 0 10px}",
".mb .sumq{border-left:3px solid var(--mint);padding:2px 0 2px 10px;color:var(--muted);margin-bottom:12px}",
".mf{display:flex;gap:8px;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);flex-wrap:wrap}",
".mf .sp{flex:1}",
".pub{padding:12px 16px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px}",
".pub label{font-size:12px;font-weight:700;color:var(--muted)}",
".pub textarea{width:100%;resize:vertical;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:10px 12px;font:500 15px/1.45 var(--fb);max-height:40vh}",
".pubd{font-size:12px;font-weight:800;color:var(--mint);align-self:center}",
"@media (prefers-reduced-motion:reduce){.mbox{animation:none}.bar i{transition:none}.sheet{transition:none}}",
"</style>",
"</head>",
"<body>",
"<div class=\"app\">",
"  <section class=\"stage\" id=\"stage\" aria-label=\"3D ofis\">",
"    <canvas id=\"c\" tabindex=\"0\"></canvas>",
"    <div class=\"labels\" id=\"labels\"></div>",
"    <div class=\"hud\">",
"      <div class=\"pill brand\"><span class=\"led\" id=\"led\"></span><div><b>Virtual Ofis</b><small id=\"aiName\">ulanmoqda</small></div></div>",
"      <div class=\"cams\" role=\"group\" aria-label=\"Kamera\">",
"        <button data-cam=\"office\" aria-pressed=\"true\" title=\"Ofis\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5\"/></svg><span class=\"lb\">Ofis</span></button>",
"        <button data-cam=\"games\" aria-pressed=\"false\" title=\"O‘yin kemasi\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"7\" width=\"20\" height=\"11\" rx=\"5\"/><path d=\"M7 10v5M4.5 12.5h5M15 11h.01M18 14h.01\"/></svg><span class=\"lb\">O‘yinlar</span></button>",
"        <button data-cam=\"hole\" aria-pressed=\"false\" title=\"Qora tuynuk\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"3.5\"/></svg><span class=\"lb\">Tuynuk</span></button>",
"        <button data-cam=\"full\" aria-pressed=\"false\" title=\"Katta ekran\" id=\"fullBtn\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"/></svg></button>",
"      </div>",
"    </div>",
"    <div class=\"act\" id=\"act\"></div>",
"    <div class=\"keys\"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> yurish · <kbd>Q</kbd><kbd>E</kbd> burish · sichqoncha: aylantirish, o‘ng tugma: surish</div>",
"    <div class=\"toast\" id=\"toast\" hidden></div>",
"  </section>",
"",
"  <section class=\"sheet\" id=\"sheet\">",
"    <div class=\"grab\" id=\"grab\" title=\"Panelni kattalashtirish\"><i></i></div>",
"    <nav class=\"tabs\" role=\"tablist\">",
"      <button class=\"tab\" role=\"tab\" data-tab=\"chat\" aria-selected=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z\"/></svg>Chat</button>",
"      <button class=\"tab\" role=\"tab\" data-tab=\"tasks\" aria-selected=\"false\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2\"/></svg>Vazifalar<span class=\"cnt\" id=\"tcount\" hidden>0</span></button>",
"      <button class=\"tab\" role=\"tab\" data-tab=\"team\" aria-selected=\"false\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14.5a6 6 0 013.5 5.5\"/></svg>Jamoa</button>",
"      <button class=\"tab\" role=\"tab\" data-tab=\"rank\" aria-selected=\"false\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3\"/></svg>Reyting</button>",
"    </nav>",
"",
"    <div class=\"view\" id=\"v-chat\">",
"      <div class=\"scroll\" id=\"chatScroll\">",
"        <div class=\"banner\" id=\"demoBanner\" hidden>Demo rejim: AI ulanmagan, javoblar namunaviy. Botdagi «Ofis» tugmasi orqali ochsangiz, xodimlar haqiqiy AI bilan ishlaydi.</div>",
"        <div class=\"msgs\" id=\"msgs\"></div>",
"      </div>",
"      <div class=\"compose\">",
"        <div class=\"pop\" id=\"pop\" hidden></div>",
"        <div class=\"to-row\"><span>Kimga</span><div class=\"who\" id=\"who\"></div></div>",
"        <form class=\"row\" id=\"f\" autocomplete=\"off\">",
"          <div class=\"inbox\">",
"            <textarea id=\"inp\" rows=\"1\" placeholder=\"Vazifani yozing…\" aria-label=\"Vazifa\"></textarea>",
"            <button type=\"button\" class=\"tplBtn\" id=\"tplBtn\" aria-label=\"Tayyor shablonlar\" title=\"Shablonlar\"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M13 2L4 14h7l-1 8 9-12h-7z\"/></svg></button>",
"          </div>",
"          <button class=\"send\" id=\"sendBtn\" type=\"submit\" aria-label=\"Yuborish\"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg></button>",
"        </form>",
"        <div class=\"hint\">Enter — yuborish · Shift+Enter — yangi qator · @ — xodimni tanlash · ⚡ — shablonlar</div>",
"      </div>",
"    </div>",
"",
"    <div class=\"view\" id=\"v-tasks\" hidden>",
"      <div class=\"scroll\">",
"        <div class=\"seg\" id=\"tseg\" role=\"group\" aria-label=\"Saralash\">",
"          <button data-f=\"all\" aria-pressed=\"true\">Hammasi</button>",
"          <button data-f=\"run\" aria-pressed=\"false\">Jarayonda</button>",
"          <button data-f=\"done\" aria-pressed=\"false\">Tayyor</button>",
"          <button data-f=\"error\" aria-pressed=\"false\">Xato</button>",
"        </div>",
"        <div class=\"tl\" id=\"tlist\"></div>",
"      </div>",
"    </div>",
"",
"    <div class=\"view\" id=\"v-team\" hidden>",
"      <div class=\"scroll\"><div class=\"team\" id=\"team\"></div>",
"        <div style=\"margin-top:18px;display:flex;justify-content:center\"><button class=\"btn ghost\" id=\"resetBtn\">Ofisni tozalash</button></div>",
"      </div>",
"    </div>",
"",
"    <div class=\"view\" id=\"v-rank\" hidden>",
"      <div class=\"scroll\">",
"        <div class=\"live\" id=\"live\"></div>",
"        <div class=\"seg\" id=\"gseg\" role=\"group\" aria-label=\"O‘yin\">",
"          <button data-g=\"all\" aria-pressed=\"true\">Umumiy</button>",
"          <button data-g=\"chess\" aria-pressed=\"false\">♟ Shaxmat</button>",
"          <button data-g=\"tennis\" aria-pressed=\"false\">🏓 Tennis</button>",
"          <button data-g=\"ps5\" aria-pressed=\"false\">🎮 PS5</button>",
"          <button data-g=\"cs2\" aria-pressed=\"false\">🔫 CS2</button>",
"        </div>",
"        <div class=\"board\" id=\"board\"></div>",
"        <div class=\"hist\" id=\"ghist\"></div>",
"      </div>",
"    </div>",
"  </section>",
"</div>",
"",
"<div class=\"modal\" id=\"modal\" hidden>",
"  <div class=\"mbox\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"mTitle\">",
"    <div class=\"mh\"><div class=\"av\" id=\"mAv\"></div><div><b id=\"mTitle\"></b><span id=\"mWho\"></span></div><button class=\"x\" id=\"mClose\" aria-label=\"Yopish\">×</button></div>",
"    <div class=\"mb\" id=\"mBody\"></div>",
"    <div class=\"pub\" id=\"pubBox\" hidden>",
"      <label for=\"pubText\">Kanalga shunday chiqadi (tahrirlash mumkin):</label>",
"      <textarea id=\"pubText\" rows=\"8\"></textarea>",
"    </div>",
"    <div class=\"mf\">",
"      <button class=\"btn pri\" id=\"mCopy\">Nusxa olish</button>",
"      <button class=\"btn\" id=\"mPub\" hidden>📢 Kanalga</button>",
"      <span class=\"sp\"></span>",
"      <button class=\"btn\" id=\"mUp\" aria-label=\"Yaxshi\">👍 Zo‘r</button>",
"      <button class=\"btn\" id=\"mDown\" aria-label=\"Qayta ishlash\">👎 Qayta</button>",
"    </div>",
"  </div>",
"</div>",
"",
"<script src=\"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js\"></script>",
"<script src=\"https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js\"></script>",
"<script>",
"(function(){",
"\"use strict\";",
"/* =========================================================",
"   Sozlamalar va Telegram",
"   ========================================================= */",
"const TG = window.Telegram && window.Telegram.WebApp;",
"const qs = new URLSearchParams(location.search);",
"const INIT = TG && TG.initData || \"\";",
"const API = qs.get(\"api\") || (INIT && /^https?:/.test(location.protocol) ? location.origin : \"\");",
"const DEMO = qs.has(\"demo\") || !INIT || !API;",
"if(TG){ try{ TG.ready(); TG.expand(); TG.setHeaderColor(\"#0b0e22\"); TG.setBackgroundColor(\"#0b0e22\"); if(TG.disableVerticalSwipes) TG.disableVerticalSwipes(); }catch(e){} }",
"const haptic=(k,v)=>{try{ if(!TG||!TG.HapticFeedback) return; k===\"n\"?TG.HapticFeedback.notificationOccurred(v):TG.HapticFeedback.impactOccurred(v);}catch(e){}};",
"const MOBILE=matchMedia(\"(pointer:coarse)\").matches||Math.min(screen.width,screen.height)<600;",
"",
"const TEAM = {",
" rustam:{name:\"Rustam\",role:\"Boshliq\",col:\"#7d8cb3\",shirt:\"#2c3550\",hair:\"#2a221e\",skin:\"#e0b48e\",f:false,style:\"short\"},",
" elyor:{name:\"Elyor\",role:\"Backend dasturchi\",col:\"#3f8cff\",hair:\"#1b1817\",skin:\"#e8c09a\",f:false,style:\"cap\"},",
" doniyor:{name:\"Doniyor\",role:\"Frontend dasturchi\",col:\"#1fb8cd\",hair:\"#3a2a1e\",skin:\"#d9a77e\",f:false,style:\"curly\"},",
" otabek:{name:\"Otabek\",role:\"Dizayner\",col:\"#f06b2a\",hair:\"#141414\",skin:\"#e3b590\",f:false,style:\"bun\"},",
" sanjar:{name:\"Sanjar\",role:\"Marketolog\",col:\"#8061f0\",hair:\"#2a1f18\",skin:\"#dcae86\",f:false,style:\"short\"},",
" feruza:{name:\"Feruza\",role:\"Moliyachi\",col:\"#ee5f97\",hair:\"#3b2416\",skin:\"#efc6a4\",f:true,style:\"long\"},",
" umida:{name:\"Umida\",role:\"HR menejer\",col:\"#1fc796\",hair:\"#24160f\",skin:\"#e6bb96\",f:true,style:\"pony\"},",
" sabina:{name:\"Sabina\",role:\"SMM menejer\",col:\"#c35be6\",hair:\"#5a3a22\",skin:\"#f0c9a8\",f:true,style:\"long\"},",
" dilnoza:{name:\"Dilnoza\",role:\"Kopirayter\",col:\"#f2b01e\",hair:\"#1e1512\",skin:\"#e9bf9b\",f:true,style:\"bob\"},",
" shoxrux:{name:\"Shoxrux\",role:\"Sifat nazorati\",col:\"#4fc764\",hair:\"#1a1a1a\",skin:\"#d7a37a\",f:false,style:\"short\"},",
" laylo:{name:\"Laylo\",role:\"Video montajchi\",col:\"#ff7f7f\",hair:\"#2e1d14\",skin:\"#eec3a0\",f:true,style:\"pony\"},",
" behruz:{name:\"Behruz\",role:\"Sotuv menejeri\",col:\"#4aa6f2\",hair:\"#221a14\",skin:\"#dfb088\",f:false,style:\"short\"},",
" sardor:{name:\"Sardor\",role:\"Yordamchi (junior)\",col:\"#9ad13f\",hair:\"#2f2219\",skin:\"#e4b892\",f:false,style:\"cap\"}",
"};",
"const IDS=Object.keys(TEAM), STAFF=IDS.filter(i=>i!==\"rustam\");",
"const byName=Object.fromEntries(IDS.map(i=>[TEAM[i].name.toLowerCase(),i]));",
"const GAMES={chess:{name:\"Shaxmat\",ico:\"♟\",min:2,max:2},tennis:{name:\"Stol tennisi\",ico:\"🏓\",min:2,max:2},ps5:{name:\"PS5 · FIFA\",ico:\"🎮\",min:2,max:2},cs2:{name:\"CS2\",ico:\"🔫\",min:4,max:8}};",
"const $=id=>document.getElementById(id);",
"const rand=(a,b)=>a+Math.random()*(b-a);",
"const pick=a=>a[Math.floor(Math.random()*a.length)];",
"const esc=s=>String(s==null?\"\":s).replace(/[&<>\"]/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c]));",
"const norm=s=>String(s||\"\").toLowerCase().replace(/[‘’ʻʼ`´]/g,\"'\");",
"const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,\"0\")+\":\"+String(d.getMinutes()).padStart(2,\"0\");};",
"",
"/* =========================================================",
"   Server bilan aloqa (yoki demo)",
"   ========================================================= */",
"async function call(path,body){",
"  if(DEMO) return demo(path,body);",
"  const r=await fetch(API+path,{method:body?\"POST\":\"GET\",headers:{\"Content-Type\":\"application/json\",\"X-Init-Data\":INIT},body:body?JSON.stringify(body):undefined});",
"  const j=await r.json().catch(()=>({error:\"Server javob bermadi\"}));",
"  if(!r.ok) throw new Error(j.error||(\"Xato \"+r.status));",
"  return j;",
"}",
"let D=null;",
"function demoInit(){",
"  D={v:3,nid:1,owner:\"Mehmon\",tasks:[],msgs:[],scores:Object.fromEntries(IDS.map(i=>[i,50])),games:null};",
"  dm(\"rustam\",\"Assalomu alaykum! Bu demo ofis. Pastdagi «Kimga» qatoridan xodimni tanlang yoki vazifani shunchaki yozing — o‘zim taqsimlayman.\");",
"}",
"function dm(from,text,extra){const m={id:D.nid++,from,text,t:Date.now(),...(extra||{})};D.msgs.push(m);return m;}",
"const DKW={elyor:[\"kod\",\"server\",\"bot\",\"api\"],doniyor:[\"sayt\",\"sahifa\",\"ilova\",\"html\"],otabek:[\"dizayn\",\"logo\",\"banner\",\"prevyu\",\"rasm\"],sanjar:[\"reklama\",\"marketing\",\"strategiya\"],feruza:[\"narx\",\"pul\",\"xarajat\",\"hisob\"],umida:[\"xodim\",\"vakansiya\"],sabina:[\"instagram\",\"post\",\"reels\",\"kanal\"],dilnoza:[\"matn\",\"ssenariy\",\"sarlavha\"],shoxrux:[\"test\",\"tekshir\"],laylo:[\"video\",\"montaj\",\"subtitr\"],behruz:[\"mijoz\",\"sotuv\",\"taklif\"]};",
"const wait=ms=>new Promise(r=>setTimeout(r,ms));",
"const clone=o=>JSON.parse(JSON.stringify(o));",
"async function demo(path,body){",
"  if(!D) demoInit();",
"  if(path===\"/api/state\"){ await wait(200); return {state:clone(D),ai:\"demo\",channel:\"@kanal (demo)\"}; }",
"  if(path===\"/api/game\"){ D.games=eloApply(D.games,body); return {games:clone(D.games)}; }",
"  if(path===\"/api/publish\"){ await wait(700); const t=D.tasks.find(x=>x.id===body.id); if(t){t.published=Date.now();t.result=body.text;} dm(\"sabina\",\"«\"+(t&&t.title)+\"» kanalga joylandi ✅ (demo)\",{taskIds:[body.id]}); return {state:clone(D)}; }",
"  if(path===\"/api/send\"){",
"    const text=body.text, low=norm(text); dm(\"me\",text); await wait(rand(800,1400));",
"    const ment=(text.match(/@([A-Za-z]+)/)||[])[1], mid=ment&&byName[ment.toLowerCase()];",
"    if(/hisobot|nima gap/.test(low)){ const run=D.tasks.filter(t=>t.status!==\"done\"); dm(\"rustam\",run.length?\"Hozir \"+run.length+\" ta ish jarayonda: \"+run.map(t=>TEAM[t.who].name+\" — «\"+t.title+\"»\").join(\", \")+\".\":\"Hozircha jarayonda ish yo‘q. Yangi vazifa bering!\"); }",
"    else if(low.split(/\\s+/).length>=3){",
"      let who=[]; if(mid&&mid!==\"rustam\") who=[mid]; else { for(const [id,ws] of Object.entries(DKW)) if(ws.some(w=>low.includes(w))) who.push(id); if(!who.length) who=[\"sardor\"]; who=who.slice(0,3); }",
"      const ids=who.map(w=>{const t={id:D.nid++,who:w,title:text.replace(/@\\S+/g,\"\").trim().slice(0,50),brief:text,status:\"new\",created:Date.now()};D.tasks.push(t);return t.id;});",
"      dm(mid&&mid!==\"rustam\"?mid:\"rustam\",(mid&&mid!==\"rustam\")?\"Qabul qildim, boshladim!\":\"Qabul qildim. \"+who.map(w=>TEAM[w].name).join(\" va \")+\"ga topshirdim.\",{taskIds:ids});",
"    } else dm(mid||\"rustam\",\"Tushunarli! Vazifa bersangiz, kerakli odamga topshiraman.\");",
"    return {state:clone(D)};",
"  }",
"  if(path===\"/api/run\"){",
"    const t=D.tasks.find(x=>x.id===body.id); if(!t||t.status!==\"new\") return {state:clone(D)};",
"    t.status=\"run\"; t.started=Date.now(); await wait(rand(9000,15000));",
"    t.status=\"done\"; t.done=Date.now(); t.summary=\"«\"+t.title+\"» bo‘yicha namunaviy natija tayyor.\";",
"    t.result=\"Bu demo natija. Haqiqiy ofisda bu yerda \"+TEAM[t.who].name+\" (\"+TEAM[t.who].role.toLowerCase()+\") AI orqali tayyorlagan to‘liq ish turadi.\\n\\n**Masalan:**\\n1. Birinchi variant\\n2. Ikkinchi variant\\n\\n```js\\nconsole.log('salom');\\n```\";",
"    D.scores[t.who]+=3; dm(t.who,t.summary,{taskIds:[t.id],kind:\"result\"});",
"    return {state:clone(D)};",
"  }",
"  if(path===\"/api/rate\"){ const t=D.tasks.find(x=>x.id===body.id); if(t&&!t.rated){t.rated=body.v>0?2:-2;D.scores[t.who]+=t.rated;} return {state:clone(D)}; }",
"  if(path===\"/api/retry\"){ const t=D.tasks.find(x=>x.id===body.id); if(t){ t.status=\"new\"; delete t.error; } return {state:clone(D)}; }",
"  if(path===\"/api/reset\"){ demoInit(); return {state:clone(D)}; }",
"}",
"// O'yin reytingi (Elo). Server ham xuddi shunday hisoblaydi.",
"function eloApply(G,m){",
"  G=G||{r:{},w:{},n:{},last:[]};",
"  const g=m.game; if(!GAMES[g]) return G;",
"  [\"r\",\"w\",\"n\"].forEach(k=>{G[k][g]=G[k][g]||{};});",
"  const R=G.r[g], avg=ids=>ids.reduce((s,i)=>s+(R[i]||1000),0)/ids.length;",
"  const ea=1/(1+Math.pow(10,(avg(m.b)-avg(m.a))/400)), sa=m.win===\"a\"?1:m.win===\"b\"?0:.5, K=24;",
"  m.a.forEach(i=>{R[i]=Math.round((R[i]||1000)+K*(sa-ea));G.n[g][i]=(G.n[g][i]||0)+1;if(sa===1)G.w[g][i]=(G.w[g][i]||0)+1;});",
"  m.b.forEach(i=>{R[i]=Math.round((R[i]||1000)+K*((1-sa)-(1-ea)));G.n[g][i]=(G.n[g][i]||0)+1;if(sa===0)G.w[g][i]=(G.w[g][i]||0)+1;});",
"  G.last.unshift({game:g,a:m.a,b:m.b,win:m.win,t:Date.now()}); G.last=G.last.slice(0,30);",
"  return G;",
"}",
"",
"/* =========================================================",
"   3D: renderer, kamera, yorug'lik",
"   ========================================================= */",
"const stage=$(\"stage\"), canvas=$(\"c\");",
"const renderer=new THREE.WebGLRenderer({canvas,antialias:!MOBILE||devicePixelRatio<2,powerPreference:\"high-performance\"});",
"renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,MOBILE?1.75:2));",
"renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;",
"renderer.outputEncoding=THREE.sRGBEncoding;",
"renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;",
"const scene=new THREE.Scene(); scene.background=new THREE.Color(0x02030a);",
"const camera=new THREE.PerspectiveCamera(42,1,.5,4000);",
"camera.position.set(64,34,44);",
"const controls=new THREE.OrbitControls(camera,canvas);",
"controls.enableDamping=true; controls.dampingFactor=.08;",
"controls.screenSpacePanning=false; controls.minDistance=5; controls.maxDistance=420; controls.maxPolarAngle=Math.PI*.495; controls.minPolarAngle=.05;",
"controls.rotateSpeed=.7; controls.panSpeed=1; controls.zoomSpeed=1.1;",
"controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};",
"controls.target.set(-2,0,0);",
"controls.keys={}; // klaviaturani o'zimiz boshqaramiz",
"",
"scene.add(new THREE.HemisphereLight(0xcfdcff,0x2b2440,.55));",
"const key=new THREE.DirectionalLight(0xfff2de,.95); key.position.set(40,70,35); key.target.position.set(20,0,0); scene.add(key.target);",
"key.castShadow=true; key.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);",
"Object.assign(key.shadow.camera,{left:-66,right:66,top:40,bottom:-40,near:5,far:200}); key.shadow.bias=-.0005; key.shadow.normalBias=.02; scene.add(key);",
"const holeLight=new THREE.DirectionalLight(0xff9a4a,.75); holeLight.position.set(-200,30,-40); scene.add(holeLight);",
"const fillL=new THREE.DirectionalLight(0x8fa8ff,.22); fillL.position.set(30,20,-60); scene.add(fillL);",
"",
"/* ---------- yordamchi quruvchilar ---------- */",
"const MC={};",
"const M=(c,o)=>{const k=c+(o?JSON.stringify(o):\"\");return MC[k]||(MC[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{})));};",
"const MB=c=>MC[\"b\"+c]||(MC[\"b\"+c]=new THREE.MeshBasicMaterial({color:c}));",
"const EM=(c,i)=>MC[\"e\"+c+i]||(MC[\"e\"+c+i]=new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i||1,roughness:.5}));",
"function add(geo,mat,x,y,z,cast=true,p=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;m.userData.st=(p===scene);p.add(m);return m;}",
"const keep=m=>{m.userData.keep=true;return m;};",
"// Qimirlamaydigan narsalarni material bo'yicha bitta mesh'ga birlashtiramiz (telefonda tez ishlashi uchun)",
"function mergeStatic(){",
"  scene.updateMatrixWorld(true);",
"  const groups=new Map();",
"  scene.children.slice().forEach(m=>{ if(!m.isMesh||!m.userData.st||m.userData.keep) return; const k=m.material.uuid; if(!groups.has(k)) groups.set(k,{mat:m.material,list:[],cast:false}); const g=groups.get(k); g.list.push(m); g.cast=g.cast||m.castShadow; });",
"  let before=0,after=0;",
"  groups.forEach(g=>{ before+=g.list.length; if(g.list.length<2) {after+=g.list.length;return;}",
"    let n=0; const geos=g.list.map(m=>{ let gg=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone(); gg.applyMatrix4(m.matrixWorld); if(!gg.attributes.uv){ gg.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count*2),2)); } n+=gg.attributes.position.count; return gg; });",
"    const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2); let o=0;",
"    geos.forEach(gg=>{ pos.set(gg.attributes.position.array,o*3); nor.set(gg.attributes.normal.array,o*3); uv.set(gg.attributes.uv.array,o*2); o+=gg.attributes.position.count; gg.dispose(); });",
"    const mg=new THREE.BufferGeometry(); mg.setAttribute('position',new THREE.BufferAttribute(pos,3)); mg.setAttribute('normal',new THREE.BufferAttribute(nor,3)); mg.setAttribute('uv',new THREE.BufferAttribute(uv,2)); mg.computeBoundingSphere();",
"    const mm=new THREE.Mesh(mg,g.mat); mm.castShadow=g.cast; mm.receiveShadow=true; scene.add(mm); g.list.forEach(m=>{ scene.remove(m); m.geometry.dispose(); }); after++; });",
"  return [before,after];",
"}",
"const box=(w,h,d,mat,x,y,z,cast,p)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,cast,p);",
"const cyl=(rt,rb,h,mat,x,y,z,seg=18,cast=true,p)=>add(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z,cast,p);",
"const sph=(r,mat,x,y,z,cast=true,p,ws=18,hs=12)=>add(new THREE.SphereGeometry(r,ws,hs),mat,x,y,z,cast,p);",
"function rbox(w,h,d,r,mat,x,y,z,cast=true,p=scene){",
"  const s=new THREE.Shape(),hw=w/2-r,hd=d/2-r;",
"  s.moveTo(-hw,-d/2);s.lineTo(hw,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-hd);s.lineTo(w/2,hd);s.quadraticCurveTo(w/2,d/2,hw,d/2);s.lineTo(-hw,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,hd);s.lineTo(-w/2,-hd);s.quadraticCurveTo(-w/2,-d/2,-hw,-d/2);",
"  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:6});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);",
"  return add(g,mat,x,y,z,cast,p);",
"}",
"function canvasTex(w,h,draw,rep){const c=document.createElement(\"canvas\");c.width=w;c.height=h;draw(c.getContext(\"2d\"),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=4;return t;}",
"function plane(w,h,mat,x,y,z,ry=0,p=scene){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=ry;p.add(m);return m;}",
"const glassM=new THREE.MeshStandardMaterial({color:0xa9d8ff,transparent:true,opacity:.16,roughness:.05,metalness:.1,depthWrite:false});",
"const frameM=M(\"#3a4366\",{metalness:.5,roughness:.4});",
"const railM=M(\"#c9d3ea\",{metalness:.7,roughness:.3});",
"const trimM=new THREE.MeshStandardMaterial({color:0x2ad4ff,emissive:0x2ad4ff,emissiveIntensity:1.3,roughness:.4});",
"const SPACE={};",
"",
"/* =========================================================",
"   Yulduzlar va qora tuynuk (Interstellar uslubida)",
"   ========================================================= */",
"(function stars(){",
"  const N=MOBILE?2600:4200, pos=new Float32Array(N*3), col=new Float32Array(N*3);",
"  for(let i=0;i<N;i++){ const u=Math.random()*2-1,th=Math.random()*Math.PI*2,r=1600+Math.random()*600,s=Math.sqrt(1-u*u);",
"    pos[i*3]=Math.cos(th)*s*r; pos[i*3+1]=u*r; pos[i*3+2]=Math.sin(th)*s*r;",
"    const k=Math.random(); const c=k<.15?[1,.8,.6]:k<.3?[.7,.8,1]:[1,1,1]; const b=rand(.45,1); col[i*3]=c[0]*b;col[i*3+1]=c[1]*b;col[i*3+2]=c[2]*b; }",
"  const g=new THREE.BufferGeometry(); g.setAttribute(\"position\",new THREE.BufferAttribute(pos,3)); g.setAttribute(\"color\",new THREE.BufferAttribute(col,3));",
"  const dot=canvasTex(32,32,c=>{const r=c.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,\"rgba(255,255,255,1)\");r.addColorStop(.35,\"rgba(255,255,255,.55)\");r.addColorStop(1,\"rgba(255,255,255,0)\");c.fillStyle=r;c.fillRect(0,0,32,32);});",
"  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:5.5,map:dot,vertexColors:true,transparent:true,depthWrite:false,sizeAttenuation:true}));",
"  scene.add(pts); SPACE.stars=pts;",
"  // tumanliklar",
"  const neb=canvasTex(256,256,c=>{const r=c.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,\"rgba(255,255,255,.55)\");r.addColorStop(1,\"rgba(255,255,255,0)\");c.fillStyle=r;c.fillRect(0,0,256,256);});",
"  [[0x7a3cc8,[600,300,-1200],900],[0x2f5fff,[-900,-200,900],1100],[0xff7a3a,[1200,500,600],700]].forEach(([c,p,s])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:neb,color:c,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));sp.position.set(...p);sp.scale.set(s,s,1);scene.add(sp);});",
"})();",
"",
"const BH=new THREE.Vector3(-260,6,-50), BHR=34;",
"(function blackHole(){",
"  const g=new THREE.Group(); g.position.copy(BH); scene.add(g); SPACE.bh=g;",
"  // umumiy shovqin funksiyasi (disk va linzalangan halqa uchun)",
"  const NOISE=`",
"    float h3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }",
"    float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);",
"      return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),",
"                 mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }",
"    float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }",
"    vec3 heat(float t){ // 0: ichki (oq-sariq) -> 1: tashqi (to'q qizil)",
"      vec3 c1=vec3(1.0,.97,.88), c2=vec3(1.0,.72,.32), c3=vec3(.85,.30,.08), c4=vec3(.30,.06,.02);",
"      return t<.25?mix(c1,c2,t/.25):t<.6?mix(c2,c3,(t-.25)/.35):mix(c3,c4,(t-.6)/.4); }`;",
"  // 1) Akkretsion disk: tekis halqa, ichi tez, tashqarisi sekin aylanadi; yaqinlashayotgan tomoni yorqinroq (Doppler)",
"  const Rin=BHR*2.3, Rout=BHR*6.2;",
"  const diskMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,",
"    uniforms:{uTime:{value:0},uRin:{value:Rin},uRout:{value:Rout},uCam:{value:new THREE.Vector3()}},",
"    vertexShader:`varying vec3 vP; varying vec3 vW; varying vec3 vV;",
"      void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vV=normalize(mat3(modelMatrix)*vec3(-position.y,position.x,0.0)); gl_Position=projectionMatrix*viewMatrix*w; }`,",
"    fragmentShader:NOISE+`",
"      uniform float uTime,uRin,uRout; uniform vec3 uCam; varying vec3 vP; varying vec3 vW; varying vec3 vV;",
"      void main(){ float r=length(vP.xy); float t=clamp((r-uRin)/(uRout-uRin),0.,1.);",
"        float a=atan(vP.y,vP.x); float sp=1.6*pow(uRin/r,1.5); float ang=a+uTime*sp;",
"        vec3 q=vec3(cos(ang)*3.0, sin(ang)*3.0, r*0.045);",
"        float n=fbm(q*vec3(1.,1.,1.)+vec3(0.,0.,uTime*.05)); float streak=fbm(vec3(cos(ang)*9.,sin(ang)*9.,r*.22));",
"        float dens=smoothstep(0.,.05,t)*(1.-smoothstep(.55,1.,t))*(.35+.9*n)*(.6+.6*streak);",
"        vec3 vd=normalize(vW-uCam); float dop=dot(vV,-vd); float boost=1.0+0.75*dop;",
"        vec3 col=heat(t+.12*(1.-n))*boost*(1.7-t);",
"        gl_FragColor=vec4(col*dens*1.35, dens); }`});",
"  const disk=new THREE.Mesh(new THREE.RingGeometry(Rin,Rout,180,8),diskMat);",
"  disk.rotation.x=-Math.PI/2+0.09; disk.rotation.y=0.18; g.add(disk); SPACE.diskMat=diskMat;",
"  // 2) Qora soya (voqealar gorizonti)",
"  const hole=new THREE.Mesh(new THREE.SphereGeometry(BHR,64,40),new THREE.MeshBasicMaterial({color:0x000000})); g.add(hole);",
"  // 3) Linzalangan halqa: diskning orqa qismi tortishish kuchi bilan tepaga va pastga egilib ko'rinadi (kameraga qaragan tekislik)",
"  const S=BHR*2.2;",
"  const haloMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,",
"    uniforms:{uTime:{value:0},uR:{value:BHR},uS:{value:S}},",
"    vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,",
"    fragmentShader:NOISE+`",
"      uniform float uTime,uR,uS; varying vec2 vU;",
"      void main(){ vec2 p=(vU-.5)*2.0*uS; float r=length(p); float a=atan(p.y,p.x);",
"        float x=r/uR;",
"        // foton halqasi (ingichka, juda yorqin)",
"        float ring=exp(-pow((x-1.04)/0.012,2.0))*1.6;",
"        // linzalangan disk tasviri: soyani o'rab turgan qalin halqa, tepada va pastda qalinroq",
"        float tb=.55+.45*abs(sin(a));",
"        float band=smoothstep(1.06,1.12,x)*(1.-smoothstep(1.25+.28*tb,1.55+.35*tb,x));",
"        float ang=a-uTime*.9; float n=fbm(vec3(cos(ang)*4.,sin(ang)*4.,x*3.+uTime*.04)); float st=fbm(vec3(cos(ang)*12.,sin(ang)*12.,x*8.));",
"        float d=band*(.45+.8*n)*(.6+.5*st)*tb*(1.0+.45*cos(a));",
"        float t=clamp((x-1.08)/.6,0.,1.);",
"        vec3 col=heat(t*.8)*d*1.25+vec3(1.,.95,.85)*ring;",
"        float glow=exp(-pow((x-1.3)/0.9,2.0))*.12*step(1.0,x);",
"        col+=vec3(1.,.55,.2)*glow;",
"        float al=clamp(d+ring+glow,0.,1.);",
"        gl_FragColor=vec4(col,al); }`});",
"  const halo=new THREE.Mesh(new THREE.PlaneGeometry(S*2,S*2),haloMat); g.add(halo); SPACE.halo=halo; SPACE.haloMat=haloMat;",
"  // 4) Yumshoq nur",
"  const glowT=canvasTex(256,256,c=>{const r=c.createRadialGradient(128,128,30,128,128,128);r.addColorStop(0,\"rgba(255,170,80,.55)\");r.addColorStop(.4,\"rgba(255,110,40,.18)\");r.addColorStop(1,\"rgba(120,40,160,0)\");c.fillStyle=r;c.fillRect(0,0,256,256);});",
"  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(BHR*16,BHR*16,1);g.add(glow);",
"})();",
"// kema orqasidan tuynuk tomon oqib ketayotgan zarralar",
"(function stream(){",
"  const N=MOBILE?240:420,pos=new Float32Array(N*3),P=[];",
"  for(let i=0;i<N;i++) P.push({t:Math.random(),y:rand(-4,3),z:rand(-13,13),sp:rand(.03,.07),w:rand(.6,1.6)});",
"  const geo=new THREE.BufferGeometry();geo.setAttribute(\"position\",new THREE.BufferAttribute(pos,3));",
"  const dot=canvasTex(32,32,c=>{const r=c.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,\"rgba(255,220,170,1)\");r.addColorStop(1,\"rgba(255,140,60,0)\");c.fillStyle=r;c.fillRect(0,0,32,32);});",
"  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({map:dot,size:.9,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffc88a})));",
"  SPACE.stream={geo,P,N};",
"})();",
"SPACE.tick=(dt,now)=>{",
"  const t=now/1000;",
"  SPACE.diskMat.uniforms.uTime.value=t; SPACE.diskMat.uniforms.uCam.value.copy(camera.position);",
"  SPACE.haloMat.uniforms.uTime.value=t; SPACE.halo.quaternion.copy(camera.quaternion);",
"  const {geo,P,N}=SPACE.stream, a=geo.attributes.position.array, sx=-40;",
"  for(let i=0;i<N;i++){const q=P[i]; q.t+=dt*q.sp; if(q.t>1){q.t=0;q.y=rand(-4,3);q.z=rand(-13,13);}",
"    const e=q.t*q.t, r=1-e, ang=e*5.5*q.w;",
"    a[i*3]=BH.x+(sx-BH.x)*r+Math.cos(ang)*e*BHR*1.4; a[i*3+1]=BH.y+(q.y-BH.y)*r+Math.sin(ang*1.3)*e*BHR*.25; a[i*3+2]=BH.z+(q.z-BH.z)*r+Math.sin(ang)*e*BHR*1.4;}",
"  geo.attributes.position.needsUpdate=true;",
"  if(SPACE.flames) SPACE.flames.forEach((f,i)=>{const k=.85+Math.sin(now/60+i*2)*.12+Math.random()*.08; f.scale.set(1,k,1);});",
"  trimM.emissiveIntensity=1.2+Math.sin(now/500)*.35;",
"};",
"",
"/* =========================================================",
"   Kema korpusi (usti ochiq), yo'lak, orqa kuzatuv maydoni, burun kafe",
"   ========================================================= */",
"const hullM=M(\"#2b3350\",{roughness:.5,metalness:.45}), hullM2=M(\"#1d2338\",{roughness:.6,metalness:.4});",
"const SHIP={x0:-36,x1:37,z:14.6};",
"rbox(74,1.2,30.4,2,hullM,.5,-.6,0,false);",
"[[72.6,29.2,-2.2],[70,27,-4.2],[64,22,-6.2],[54,16,-8.2],[38,9,-10]].forEach(([w,d,y],i)=>rbox(w,2,d,2.2,i%2?hullM:hullM2,0,y,0,false));",
"// yon chiziqlar va illyuminatorlar",
"box(74,.16,.18,trimM,.5,-1.2,15.25,false); box(74,.16,.18,trimM,.5,-1.2,-15.25,false);",
"for(let x=-32;x<=34;x+=3.6){ sph(.38,MB(\"#9fe6ff\"),x,-2.3,14.65,false); sph(.38,MB(\"#9fe6ff\"),x,-2.3,-14.65,false); }",
"for(let x=-26;x<=28;x+=6){ sph(.3,MB(\"#ffd27a\"),x,-4.3,13.55,false); sph(.3,MB(\"#ffd27a\"),x,-4.3,-13.55,false); }",
"// dvigatellar: kema orqasida, olov qora tuynuk tomonga qaragan (kemani undan uzoqqa itaradi)",
"SPACE.flames=[];",
"const flameT=canvasTex(64,256,(c,w,h)=>{const g2=c.createLinearGradient(0,0,0,h);g2.addColorStop(0,\"rgba(255,255,255,1)\");g2.addColorStop(.15,\"rgba(120,220,255,.95)\");g2.addColorStop(.6,\"rgba(80,120,255,.45)\");g2.addColorStop(1,\"rgba(80,60,255,0)\");c.fillStyle=g2;c.beginPath();c.moveTo(8,0);c.lineTo(56,0);c.lineTo(36,h);c.lineTo(28,h);c.closePath();c.fill();});",
"[[-8,-4.6],[0,-5],[8,-4.6],[-4.5,-8.2],[4.5,-8.2]].forEach(([z,y])=>{",
"  const eg=new THREE.Group(); eg.position.set(-37.5,y,z); eg.rotation.y=-Math.PI/2; scene.add(eg);",
"  const body=new THREE.Mesh(new THREE.CylinderGeometry(1.7,2.1,4.4,22),M(\"#3a4466\",{metalness:.6,roughness:.35}));body.rotation.x=Math.PI/2;eg.add(body);",
"  const r2=new THREE.Mesh(new THREE.TorusGeometry(1.95,.2,8,28),trimM);r2.position.z=-2.2;eg.add(r2);",
"  const fl=new THREE.Mesh(new THREE.PlaneGeometry(3.4,11),new THREE.MeshBasicMaterial({map:flameT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));",
"  fl.geometry.translate(0,-5.5,0); fl.rotation.set(Math.PI/2,0,0); const fl2=fl.clone(); fl2.rotation.set(Math.PI/2,Math.PI/2,0);",
"  const fg=new THREE.Group(); fg.add(fl,fl2); fg.position.z=-2.3; eg.add(fg); SPACE.flames.push(fg);",
"});",
"// asosiy pol",
"box(73,.04,29,M(\"#cfc8bb\",{roughness:.85}),.5,.02,0,false);",
"// yo'lak (markaziy)",
"const corT=canvasTex(256,64,(g,w,h)=>{g.fillStyle=\"#3a4260\";g.fillRect(0,0,w,h);g.strokeStyle=\"rgba(255,255,255,.07)\";for(let x=0;x<w;x+=32){g.strokeRect(x,0,32,h);}g.fillStyle=\"rgba(90,209,255,.5)\";g.fillRect(0,4,w,2);g.fillRect(0,h-6,w,2);},[18,1]);",
"box(73,.05,4.4,M(\"#ffffff\",{map:corT,roughness:.6,metalness:.2}),.5,.06,0,false);",
"// panjaralar",
"const railGlass=new THREE.MeshStandardMaterial({color:0x8fd8ff,transparent:true,opacity:.12,roughness:.1,depthWrite:false});",
"function railX(x0,x1,z){const L=x1-x0,cx=(x0+x1)/2; box(L,.12,.14,railM,cx,1.25,z,false); box(L,.9,.04,railGlass,cx,.75,z,false); for(let k=x0;k<=x1+.01;k+=3) box(.1,1.25,.1,railM,k,.62,z,false);}",
"function railZ(z0,z1,x){const L=z1-z0,cz=(z0+z1)/2; box(.14,.12,L,railM,x,1.25,cz,false); box(.04,.9,L,railGlass,x,.75,cz,false); for(let k=z0;k<=z1+.01;k+=3) box(.1,1.25,.1,railM,x,.62,k,false);}",
"railX(-36,37,14.4); railX(-36,37,-14.4); railZ(-14.4,14.4,-36.2); railZ(-14.4,-1.6,37.2); railZ(1.6,14.4,37.2);",
"",
"/* =========================================================",
"   Joylar (spot) va yo'l: hamma yo'l markaziy chiziq (z=0) orqali",
"   ========================================================= */",
"const SP={};",
"function spot(name,x,z,face,sit,via,opts){const s={name,pos:new THREE.Vector3(x,0,z),face,sit,via:(via||[]).map(p=>new THREE.Vector3(p[0],0,p[1])),occ:null,...(opts||{})};SP[name]=s;return s;}",
"function route(a,b){ if(a===b) return []; return [...a.via,...[...b.via].reverse(),b.pos].map(v=>v.clone()); }",
"",
"/* =========================================================",
"   Xonalar: har xodimga alohida, o'z dizayni bilan",
"   ========================================================= */",
"const ROOMX=[-24,-16,-8,0,8,16,24];",
"const NORTH=[\"sardor\",\"shoxrux\",\"elyor\",\"doniyor\",\"otabek\",\"laylo\",\"rustam\"];",
"const SOUTH=[\"behruz\",\"umida\",\"feruza\",\"sanjar\",\"dilnoza\",\"sabina\",\"meeting\"];",
"const ROOM={}, DESK={};",
"const scrIdle=new THREE.MeshBasicMaterial({color:0x1d2a4f});",
"const codeTex=canvasTex(128,256,(g,w,h)=>{g.fillStyle=\"#0d1530\";g.fillRect(0,0,w,h);const cols=[\"#7cc4ff\",\"#ffcf7a\",\"#a98bff\",\"#6fe3b5\",\"#e7ecf7\"];for(let y=6;y<h;y+=9){let x=6+Math.floor(Math.random()*3)*8;while(x<w-10&&Math.random()<.85){const l=rand(8,30);g.fillStyle=pick(cols);g.globalAlpha=.85;g.fillRect(x,y,l,4);x+=l+5;}}g.globalAlpha=1;},[1,.5]);",
"const scrWork=new THREE.MeshBasicMaterial({map:codeTex});",
"const poolT=canvasTex(128,128,g=>{const r=g.createRadialGradient(64,64,4,64,64,64);r.addColorStop(0,\"rgba(255,196,110,.9)\");r.addColorStop(1,\"rgba(255,196,110,0)\");g.fillStyle=r;g.fillRect(0,0,128,128);});",
"function plateTex(title,sub,col){return canvasTex(512,128,(g,w,h)=>{g.fillStyle=\"#0e1230\";g.fillRect(0,0,w,h);g.fillStyle=col;g.fillRect(0,0,14,h);g.fillStyle=\"#ffffff\";g.font=\"700 50px Manrope, sans-serif\";g.fillText(title,34,62);g.fillStyle=\"rgba(220,225,255,.75)\";g.font=\"600 32px Manrope, sans-serif\";g.fillText(sub,34,106);});}",
"const ROOMFLOOR={rustam:\"#7a5240\",meeting:\"#5b6683\",elyor:\"#2c4f86\",doniyor:\"#21707c\",otabek:\"#a35a3a\",sanjar:\"#5a46a8\",feruza:\"#9a4d6a\",umida:\"#2e8a6c\",sabina:\"#7d4596\",dilnoza:\"#9c7a2a\",shoxrux:\"#3c7d48\",laylo:\"#9b5252\",behruz:\"#2f6b9c\",sardor:\"#5e7f31\"};",
"// xonalar orasidagi devorlar",
"const wallM=M(\"#2a3158\",{roughness:.7}), wallTop=EM(\"#2ad4ff\",.9);",
"[-28,-20,-12,-4,4,12,20,28].forEach(x=>[-1,1].forEach(s=>{ box(.18,2.5,10.2,wallM,x,1.25,s*7.3); box(.2,.06,10.2,wallTop,x,2.52,s*7.3,false); }));",
"// stol, stul, monitor",
"function desk(x,z,s,id,col){",
"  const dz=s*9.4, top=M(\"#f4f0e8\",{roughness:.55}), leg=M(\"#3d4560\",{roughness:.5,metalness:.3});",
"  rbox(3.0,.1,1.3,.14,top,x,1.0,dz); box(.08,.95,1.1,leg,x-1.4,.5,dz); box(.08,.95,1.1,leg,x+1.4,.5,dz);",
"  // monitor xodimga qaragan (xona chuqurligiga), orqasi yo'lakka emas",
"  const mz=dz-s*.42, ry=s>0?Math.PI:0;",
"  const fr=box(1.3,.8,.06,M(\"#151a2b\"),x,1.55,mz); fr.rotation.y=ry;",
"  const scr=plane(1.18,.68,scrIdle,x,1.55,mz+s*.04,s>0?0:Math.PI); scr.castShadow=false;",
"  box(.08,.35,.08,leg,x,1.22,mz);",
"  box(.8,.04,.28,M(\"#373f57\"),x,1.07,dz+s*.12,false);",
"  cyl(.1,.09,.2,M(col),x-1.05,1.15,dz+s*.1,10,false);",
"  // stul",
"  const chairM=M(\"#2a3148\"); const cz=s*10.55;",
"  rbox(.86,.1,.84,.15,chairM,x,.52,cz); rbox(.86,.7,.12,.05,chairM,x,.94,cz+s*.45); cyl(.05,.05,.45,leg,x,.27,cz,8);",
"  const pl=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial({map:poolT,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));",
"  pl.rotation.x=-Math.PI/2;pl.position.set(x,.1,s*9.8);scene.add(pl);",
"  return {scr,pl};",
"}",
"// xona bezaklari (rolga qarab)",
"function plantAt(x,z,h=1){cyl(.3,.24,.5,M(\"#ece6dc\"),x,.25,z,12);const m=sph(.5*h,M(\"#3b9a5e\"),x,.5+.5*h,z);m.scale.y=1.4;}",
"function shelf(x,z,s,n){box(2.2,2.2,.4,M(\"#5a4434\"),x,1.1,z);for(let i=0;i<n;i++) box(.18,.45,.3,M(pick([\"#f06b2a\",\"#3f8cff\",\"#4fc764\",\"#f2b01e\",\"#ee5f97\",\"#9b8cff\"])),x-.9+i*.2,(i%2?1.55:.85),z-s*.02,false);}",
"function screenAt(x,y,z,ry,w,h,tex){box(w+.15,h+.15,.08,M(\"#151a2b\"),x,y,z).rotation.y=ry; const p=plane(w,h,new THREE.MeshBasicMaterial({map:tex}),x+Math.sin(ry)*.05,y,z+Math.cos(ry)*.05,ry); return p;}",
"const chartT=canvasTex(256,160,(g,w,h)=>{g.fillStyle=\"#0d1530\";g.fillRect(0,0,w,h);g.strokeStyle=\"#3fd8a6\";g.lineWidth=5;g.beginPath();let y=120;g.moveTo(10,y);for(let x=10;x<w;x+=24){y=Math.max(20,Math.min(140,y+rand(-30,22)));g.lineTo(x,y);}g.stroke();g.fillStyle=\"#ffb547\";for(let i=0;i<6;i++)g.fillRect(20+i*36,h-10-rand(10,60),20,80);});",
"const DECOR={",
"  elyor(x,s){ // server shkafi, chiroqlar",
"    box(1.2,2.4,1,M(\"#141a2e\",{metalness:.5}),x-3,1.2,s*11); for(let i=0;i<8;i++) box(.9,.06,.02,EM(pick([\"#3fd8a6\",\"#5ad1ff\",\"#ffb547\"]),1.4),x-3,.5+i*.25,s*10.48,false);",
"    box(1.2,2.4,1,M(\"#141a2e\",{metalness:.5}),x-3,1.2,s*9.6); plantAt(x+3.1,s*3.3); box(1.6,.1,.8,M(\"#3d4560\"),x-2.6,.7,s*4);",
"    sph(.6,M(\"#3f8cff\"),x-2.6,1.1,s*4).scale.set(1,.5,1); },",
"  doniyor(x,s){ const b=sph(.85,M(\"#1fb8cd\"),x-2.8,.5,s*4.2); b.scale.set(1,.6,1); plantAt(x+3.1,s*3.3,.8);",
"    screenAt(x-3.85,1.6,s*7.4,Math.PI/2,2.4,1.4,canvasTex(256,150,(g,w,h)=>{g.fillStyle=\"#f4f6ff\";g.fillRect(0,0,w,h);g.fillStyle=\"#1fb8cd\";g.fillRect(0,0,w,24);g.fillStyle=\"#cfd6ec\";g.fillRect(16,40,100,90);g.fillRect(130,40,110,40);g.fillRect(130,90,110,40);})); },",
"  otabek(x,s){ // molbert, rang palitrasi devori",
"    const e=new THREE.Group(); e.position.set(x-2.5,0,s*4.5); scene.add(e);",
"    [[-.4,0],[.4,0],[0,.5]].forEach(([dx,dz])=>{const l=cyl(.05,.05,2.2,M(\"#8b5c45\"),dx,1.05,dz,8,true,e); l.rotation.x=dz?-.3*s:.12*s;});",
"    const cv=plane(1.4,1,new THREE.MeshBasicMaterial({map:canvasTex(160,120,(g,w,h)=>{g.fillStyle=\"#fff8ee\";g.fillRect(0,0,w,h);[\"#f06b2a\",\"#3f8cff\",\"#f2b01e\",\"#c35be6\"].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(30+i*34,60+Math.sin(i)*20,24,0,7);g.fill();});})}),0,1.5,.08,0,e); cv.rotation.x=-.12*s; if(s>0) cv.rotation.y=Math.PI;",
"    [\"#f06b2a\",\"#3f8cff\",\"#4fc764\",\"#f2b01e\",\"#ee5f97\",\"#9b8cff\"].forEach((c,i)=>box(.04,.5,.5,M(c),x+3.85,.9+Math.floor(i/3)*.6,s*(5+(i%3)*.6),false)); plantAt(x+3.1,s*3.3,1.2); },",
"  sanjar(x,s){ screenAt(x-3.85,1.6,s*6.8,Math.PI/2,2.6,1.6,chartT); box(1.4,1.05,.7,M(\"#e9ecf5\"),x-2.2,.52,s*4.2); plantAt(x+3.1,s*3.3); },",
"  feruza(x,s){ box(1,1.2,.9,M(\"#4a5068\",{metalness:.6,roughness:.3}),x-3,.6,s*4.2); cyl(.18,.18,.06,M(\"#c9d3ea\",{metalness:.8}),x-3,.85,s*4.2-s*.46,16).rotation.x=Math.PI/2;",
"    screenAt(x-3.85,1.6,s*7.4,Math.PI/2,2.4,1.4,chartT); plantAt(x+3.1,s*3.3,.8); },",
"  umida(x,s){ rbox(2.6,.5,1,.3,M(\"#1fc796\"),x-2.1,.35,s*4.0); rbox(2.6,.8,.3,.12,M(\"#17a37a\"),x-2.1,.7,s*3.55); cyl(.5,.5,.08,M(\"#f4efe6\"),x-2.1,.6,s*5.4,22); cyl(.06,.06,.55,M(\"#3d4560\"),x-2.1,.3,s*5.4,8); plantAt(x+3.1,s*3.3,1.1); },",
"  sabina(x,s){ const rl=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,10,32),EM(\"#ffffff\",1.6)); rl.position.set(x-2.6,1.9,s*4.4); scene.add(rl); cyl(.04,.04,1.6,M(\"#3d4560\"),x-2.6,.8,s*4.4,8);",
"    const neon=plane(2.2,.6,new THREE.MeshBasicMaterial({map:canvasTex(256,64,(g,w,h)=>{g.fillStyle=\"#000\";g.fillRect(0,0,w,h);g.shadowColor=\"#ff6ad5\";g.shadowBlur=14;g.fillStyle=\"#ff9ae4\";g.font=\"700 40px Manrope\";g.fillText(\"#trend\",50,46);}),transparent:false}),x-3.88,1.9,s*7,Math.PI/2); plantAt(x+3.1,s*3.3,.9); },",
"  dilnoza(x,s){ shelf(x-2.6,s*11.9,s,11); box(1.6,.9,.8,M(\"#6c4a33\"),x-2.4,.45,s*4.4); box(.6,.3,.4,M(\"#2a2f3c\"),x-2.4,1.05,s*4.4); cyl(.04,.04,1.4,M(\"#3d4560\"),x+3,0.7,s*4,8); sph(.22,EM(\"#ffd27a\",1.2),x+3,1.45,s*4); },",
"  shoxrux(x,s){ screenAt(x-3.85,1.6,s*7,Math.PI/2,2.4,1.5,canvasTex(256,160,(g,w,h)=>{g.fillStyle=\"#f6f8ff\";g.fillRect(0,0,w,h);g.font=\"700 22px Manrope\";for(let i=0;i<5;i++){g.fillStyle=i<4?\"#3fbf6a\":\"#ff6b5e\";g.fillText(i<4?\"✔\":\"✖\",16,32+i*28);g.fillStyle=\"#c5cbe0\";g.fillRect(48,18+i*28,150-i*12,10);}}));",
"    const mg=new THREE.Mesh(new THREE.TorusGeometry(.35,.06,8,24),M(\"#c9d3ea\",{metalness:.8})); mg.position.set(x-2.4,1.0,s*4.3); mg.rotation.x=Math.PI/2; scene.add(mg); box(1.2,.9,.7,M(\"#e9ecf5\"),x-2.4,.45,s*4.3); plantAt(x+3.1,s*3.3); },",
"  laylo(x,s){ screenAt(x-3.85,1.7,s*7.2,Math.PI/2,3,1.7,canvasTex(256,144,(g,w,h)=>{g.fillStyle=\"#111\";g.fillRect(0,0,w,h);g.fillStyle=\"#ff7f7f\";g.fillRect(10,110,236,10);[\"#3f8cff\",\"#f2b01e\",\"#4fc764\",\"#c35be6\"].forEach((c,i)=>{g.fillStyle=c;g.fillRect(10+i*60,90,54,14);});g.fillStyle=\"#2b3a6a\";g.fillRect(40,10,176,70);}));",
"    const tri=new THREE.Group(); tri.position.set(x-2.4,0,s*4.2); scene.add(tri); [0,2.1,4.2].forEach(a=>{const l=cyl(.03,.03,1.5,M(\"#222\"),Math.sin(a)*.35,.72,Math.cos(a)*.35,6,true,tri); l.rotation.set(Math.cos(a)*.25,0,-Math.sin(a)*.25);}); box(.5,.32,.3,M(\"#1a1a1a\"),0,1.55,0,true,tri); plantAt(x+3.1,s*3.3,.8); },",
"  behruz(x,s){ shelf(x-2.6,s*11.9,s,6); for(let i=0;i<3;i++){ cyl(.12,.16,.45,M(\"#f2c14e\",{metalness:.8,roughness:.25}),x-3.2+i*.6,1.95+.02,s*11.7,12,false);} box(1.4,.08,.8,M(\"#e9ecf5\"),x-2.2,.75,s*4.2); box(.4,.3,.25,M(\"#222\"),x-2.2,.95,s*4.2); plantAt(x+3.1,s*3.3); },",
"  sardor(x,s){ [[0,0],[.75,.1],[.3,.7]].forEach(([dx,dz],i)=>box(.7,.55,.6,M(\"#b98b5a\"),x-2.8+dx,.28+(i===2?.55:0),s*(4+dz))); plantAt(x+3.1,s*3.3,.7); box(1.4,1,.7,M(\"#e9ecf5\"),x-2.5,.5,s*6.2); }",
"};",
"// xonalarni quramiz",
"function buildRoom(id,cx,s){",
"  const meeting=id===\"meeting\", boss=id===\"rustam\";",
"  const P=meeting?{name:\"Majlis xonasi\",role:\"Hamma uchun\",col:\"#9aa6c4\"}:TEAM[id];",
"  box(7.8,.05,10.1,M(ROOMFLOOR[id]||\"#555\",{roughness:.85}),cx,.07,s*7.35,false);",
"  // yo'lak tomondagi shisha devor (o'rtada eshik)",
"  [-1,1].forEach(k=>{ box(2.85,2.4,.06,glassM,cx+k*2.55,1.2,s*2.25,false); box(.12,2.5,.12,frameM,cx+k*1.1,1.25,s*2.25); box(.12,2.5,.12,frameM,cx+k*3.95,1.25,s*2.25); });",
"  box(7.9,.08,.12,frameM,cx,2.45,s*2.25,false);",
"  const pm=new THREE.MeshBasicMaterial({map:plateTex(P.name,P.role,P.col)}); plane(2.9,.72,pm,cx,2.95,s*2.18,s>0?Math.PI:0);",
"  ROOM[id]={cx,s};",
"  if(meeting){",
"    rbox(5.4,.1,2.2,.6,M(\"#f5f1e9\"),cx,1.0,s*7.6); box(.5,.95,1.4,M(\"#3d4560\"),cx,.5,s*7.6);",
"    [-1.9,-.6,.7,2].forEach(dx=>[-1,1].forEach(k=>{rbox(.7,.1,.7,.15,M(\"#2a3148\"),cx+dx,.52,s*7.6+k*1.6);}));",
"    screenAt(cx,1.9,s*12.2,s>0?Math.PI:0,5,2.4,canvasTex(256,128,(g,w,h)=>{g.fillStyle=\"#2f61d0\";g.fillRect(0,0,w,h);g.fillStyle=\"#fff\";g.font=\"700 26px Manrope\";g.fillText(\"Haftalik reja\",20,44);g.fillStyle=\"rgba(255,255,255,.6)\";for(let i=0;i<4;i++)g.fillRect(20,64+i*14,160-i*20,6);}));",
"    plantAt(cx+3.2,s*3.3); plantAt(cx-3.2,s*3.3);",
"    spot(\"meet-a\",cx-1.9,s*6.0,s>0?Math.PI:0,true,[[cx-1.9,s*3.2],[cx,s*3.0],[cx,0]]);",
"    return;",
"  }",
"  if(boss){",
"    box(4.4,.05,3.2,M(\"#8b5c45\"),cx,.1,s*9.5,false);",
"    rbox(3.4,.14,1.5,.15,M(\"#3b2a20\"),cx,1.0,s*9.2); box(3.2,.9,1.3,M(\"#2b1f17\"),cx,.48,s*9.2);",
"    const fr=box(1.3,.75,.06,M(\"#151a2b\"),cx,1.55,s*8.8); const bscr=plane(1.18,.64,scrIdle,cx,1.55,s*8.84,s>0?0:Math.PI);",
"    rbox(1.1,.14,1.05,.2,M(\"#151a26\"),cx,.56,s*10.4); rbox(1.1,1.35,.16,.06,M(\"#151a26\"),cx,1.22,s*10.95);",
"    shelf(cx+2.4,s*12,s,10); rbox(2.4,.5,1,.3,M(\"#f06b2a\"),cx-2.2,.35,s*4.2); rbox(2.4,.8,.3,.12,M(\"#c75a22\"),cx-2.2,.7,s*3.75); plantAt(cx+3.2,s*3.3,1.2);",
"    const globe=keep(sph(.5,new THREE.MeshStandardMaterial({color:0x2f6cff,emissive:0x1d48c8,emissiveIntensity:.8,roughness:.4}),cx-3,1.25,s*11.3)); SPACE.bossGlobe=globe; cyl(.05,.05,.8,M(\"#9aa6c4\"),cx-3,.4,s*11.3,8);",
"    DESK.rustam={scr:bscr,pl:null};",
"    spot(\"boss\",cx,s*10.4,s>0?Math.PI:0,true,[[cx+2.1,s*10.4],[cx+2.1,s*3.4],[cx,s*3.0],[cx,0]]);",
"    spot(\"hand-a\",cx-.7,s*7.6,s>0?0:Math.PI,false,[[cx-.7,s*3.2],[cx,s*3.0],[cx,0]]);",
"    spot(\"hand-b\",cx+.8,s*7.6,s>0?0:Math.PI,false,[[cx+.8,s*3.2],[cx,s*3.0],[cx,0]]);",
"    return;",
"  }",
"  const d=desk(cx,s*1,s,id,P.col); // pastdagi s*... ichida hisoblanadi",
"  (DECOR[id]||(()=>{}))(cx,s);",
"  const seat=spot(\"desk-\"+id,cx,s*10.55,s>0?Math.PI:0,true,[[cx+2.1,s*10.55],[cx+2.1,s*3.4],[cx,s*3.0],[cx,0]]);",
"  const visit=spot(\"visit-\"+id,cx+2.1,s*9.4,-Math.PI/2,false,[[cx+2.1,s*3.4],[cx,s*3.0],[cx,0]]);",
"  DESK[id]={seat,visit,scr:d.scr,pl:d.pl};",
"}",
"NORTH.forEach((id,i)=>buildRoom(id,ROOMX[i],-1));",
"SOUTH.forEach((id,i)=>buildRoom(id,ROOMX[i],1));",
"",
"/* ---------- burun: kafe ---------- */",
"(function cafe(){",
"  box(8.6,.05,27,M(\"#e9dfcf\",{roughness:.8}),32.6,.07,0,false);",
"  rbox(1.1,1.05,8,.2,M(\"#6c4a33\"),35.6,.53,-8); rbox(1.3,.08,8.2,.2,M(\"#2a2f3c\"),35.6,1.1,-8);",
"  box(.7,.9,.9,M(\"#1d2130\",{metalness:.4,roughness:.4}),35.7,1.6,-10.5); sph(.08,MB(\"#ff5c5c\"),35.3,1.75,-10.5,false);",
"  for(let i=0;i<4;i++) cyl(.07,.06,.16,M(pick([\"#ffffff\",\"#f2b01e\",\"#3f8cff\"])),35.5,1.22,-7.8+i*.4,10,false);",
"  spot(\"coffee\",34.4,-8,Math.PI/2,false,[[32,-8],[32,0]]);",
"  [[31.5,-4.5],[31.5,5],[31.5,10]].forEach(([tx,tz],k)=>{",
"    cyl(.95,.95,.08,M(\"#f4efe6\"),tx,1,tz,28); cyl(.08,.14,1,M(\"#3d4560\"),tx,.5,tz,10);",
"    [-1,1].forEach(d=>{ cyl(.34,.34,.1,M(\"#f06b2a\"),tx+d*1.3,.5,tz,14); cyl(.05,.05,.45,M(\"#3d4560\"),tx+d*1.3,.25,tz,8);",
"      spot(\"cafe\"+k+(d>0?\"b\":\"a\"),tx+d*1.3,tz,d>0?-Math.PI/2:Math.PI/2,true,[[tx+d*1.3,tz>0?tz-1.6:tz+1.6],[tx+d*1.3,0]]); });",
"  });",
"  plantAt(29.5,13.4,1.2); plantAt(29.5,-13.4,1.2);",
"})();",
"/* ---------- orqa: qora tuynukka qaragan kuzatuv maydoni ---------- */",
"(function observe(){",
"  box(7.4,.05,27,M(\"#2f3757\",{roughness:.6,metalness:.3}),-32.2,.07,0,false);",
"  [-6,-2,2,6].forEach(z=>{ rbox(1,.45,2.6,.15,M(\"#3b4380\"),-33.5,.35,z); });",
"  cyl(.12,.12,1.4,railM,-34.6,.7,-10,8); const tel=cyl(.18,.25,1.6,M(\"#c9d3ea\",{metalness:.8,roughness:.25}),-34.8,1.6,-10,14); tel.rotation.z=Math.PI/2-.35;",
"  [-6,-2,2,6].forEach((z,i)=>spot(\"obs\"+i,-33.5,z+(i%2?.6:-.6),-Math.PI/2,true,[[-31,z],[-31,0]]));",
"  // nishon: yo'lak markazidagi yorug' globus",
"  cyl(1.1,1.3,.3,M(\"#1f2a4a\"),-30,.15,10.5,32);",
"  const globe=keep(sph(.8,new THREE.MeshStandardMaterial({color:0x2f6cff,emissive:0x1d48c8,emissiveIntensity:.9,roughness:.4}),-30,1.5,10.5,true,scene,24,16)); SPACE.globe=globe;",
"  const wire=new THREE.Mesh(new THREE.SphereGeometry(.92,16,10),new THREE.MeshBasicMaterial({color:0x9cc3ff,wireframe:true,transparent:true,opacity:.35}));wire.position.set(-30,1.5,10.5);scene.add(wire); SPACE.wire=wire;",
"  plantAt(-30,-12.5,1.2);",
"})();",
"// ofis paneli (KPI) — burun tomonda",
"const boardC=document.createElement(\"canvas\");boardC.width=512;boardC.height=300;",
"const boardT=new THREE.CanvasTexture(boardC);boardT.encoding=THREE.sRGBEncoding;",
"box(.2,2.6,4.4,M(\"#151a2b\"),29.2,1.9,-11.6); plane(4.2,2.4,new THREE.MeshBasicMaterial({map:boardT}),29.32,1.95,-11.6,Math.PI/2); box(.12,.6,.12,M(\"#3d4560\"),29.2,.3,-11.6);",
"",
"/* =========================================================",
"   Ko'prik va o'yin kemasi (alohida kema)",
"   ========================================================= */",
"(function bridge(){",
"  box(11.6,.12,3.2,M(\"#3a4260\",{metalness:.4,roughness:.5}),42.6,.0,0,false);",
"  box(11.6,.06,.12,trimM,42.6,.07,1.5,false); box(11.6,.06,.12,trimM,42.6,.07,-1.5,false);",
"  for(let x=37.5;x<=48;x+=2.1){ const a=new THREE.Mesh(new THREE.TorusGeometry(1.75,.08,8,24,Math.PI),railM); a.position.set(x,0,0); a.rotation.y=Math.PI/2; scene.add(a); }",
"  box(11.6,1.6,.04,glassM,42.6,.9,1.6,false); box(11.6,1.6,.04,glassM,42.6,.9,-1.6,false);",
"})();",
"const GX=62;",
"(function gameShip(){",
"  rbox(30,1.2,24,2,hullM,GX,-.6,0,false); rbox(28.6,2,22.4,2.2,hullM2,GX,-2.2,0,false); rbox(24,2,17,2.2,hullM,GX,-4.2,0,false); rbox(14,1.8,9,2,hullM2,GX,-6,0,false);",
"  box(30,.16,.18,trimM,GX,-1.2,12.05,false); box(30,.16,.18,trimM,GX,-1.2,-12.05,false);",
"  for(let x=GX-12;x<=GX+12;x+=3.4){ sph(.36,MB(\"#d7b4ff\"),x,-2.3,11.45,false); sph(.36,MB(\"#d7b4ff\"),x,-2.3,-11.45,false); }",
"  const gf=canvasTex(128,128,(g,w,h)=>{g.fillStyle=\"#2a2350\";g.fillRect(0,0,w,h);g.strokeStyle=\"rgba(155,140,255,.25)\";g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);},[10,8]);",
"  box(29,.05,23,M(\"#ffffff\",{map:gf,roughness:.7}),GX,.03,0,false);",
"  box(29,.05,3,M(\"#241e48\",{roughness:.6}),GX,.07,0,false); box(29,.06,.1,EM(\"#9b8cff\",1.2),GX,.1,1.45,false); box(29,.06,.1,EM(\"#9b8cff\",1.2),GX,.1,-1.45,false);",
"  railX(GX-14.5,GX+14.5,11.6); railX(GX-14.5,GX+14.5,-11.6); railZ(-11.6,-1.6,GX-14.6); railZ(1.6,11.6,GX-14.6); railZ(-11.6,11.6,GX+14.6);",
"  // vimpel: \"O'yin kemasi\"",
"  const sign=new THREE.MeshBasicMaterial({map:plateTex(\"O‘yin kemasi\",\"Bo‘sh vaqt · reyting\",\"#9b8cff\")}); plane(4,1,sign,GX-14.3,3,0,Math.PI/2); cyl(.08,.08,3.2,railM,GX-14.4,1.6,1.9,8); cyl(.08,.08,3.2,railM,GX-14.4,1.6,-1.9,8);",
"})();",
"// --- shaxmat (2 stol) ---",
"const CHESS=[];",
"[[GX-9,-6.5],[GX-9,6.5]].forEach(([x,z],k)=>{",
"  cyl(.7,.7,.08,M(\"#f4efe6\"),x,.9,z,24); cyl(.08,.14,.9,M(\"#3d4560\"),x,.45,z,10);",
"  const bt=canvasTex(64,64,g=>{for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%2?\"#3a2a1e\":\"#efe2c8\";g.fillRect(i*8,j*8,8,8);}}); bt.magFilter=THREE.NearestFilter;",
"  const b=box(.9,.04,.9,M(\"#ffffff\",{map:bt}),x,.96,z,false);",
"  const pcs=[]; for(let i=0;i<10;i++){ const w=i<5; const p=keep(cyl(.04,.06,.16,M(w?\"#f7f3ea\":\"#1a1a1a\"),x-.35+((i%5)*.17),1.06,z+(w?.3:-.3),8,false)); pcs.push(p); }",
"  CHESS.push(pcs);",
"  [-1,1].forEach(d=>{ rbox(.7,.1,.7,.15,M(\"#9b8cff\"),x+d*1.2,.52,z); cyl(.05,.05,.45,M(\"#3d4560\"),x+d*1.2,.27,z,8); });",
"  spot(\"chess\"+k+\"a\",x-1.2,z,Math.PI/2,true,[[x-1.2,z>0?1.8:-1.8],[x-1.2,0]],{game:\"chess\",slot:0,table:k});",
"  spot(\"chess\"+k+\"b\",x+1.2,z,-Math.PI/2,true,[[x+1.2,z>0?1.8:-1.8],[x+1.2,0]],{game:\"chess\",slot:1,table:k});",
"});",
"// --- stol tennisi ---",
"const TT={x:GX-1,z:-6.8};",
"rbox(2.8,.08,1.6,.05,M(\"#1f6fb0\"),TT.x,.92,TT.z); box(2.8,.02,.04,MB(\"#ffffff\"),TT.x,.97,TT.z,false); box(.04,.22,1.7,M(\"#e9ecf5\"),TT.x,1.06,TT.z,false);",
"[[-1.2,-.65],[1.2,-.65],[-1.2,.65],[1.2,.65]].forEach(([dx,dz])=>box(.08,.9,.08,M(\"#3d4560\"),TT.x+dx,.45,TT.z+dz));",
"const ball=keep(sph(.07,MB(\"#ffb347\"),TT.x,1.2,TT.z,false)); SPACE.ball=ball;",
"spot(\"tennis0\",TT.x-2.3,TT.z,Math.PI/2,false,[[TT.x-2.3,-1.8],[TT.x-2.3,0]],{game:\"tennis\",slot:0});",
"spot(\"tennis1\",TT.x+2.3,TT.z,-Math.PI/2,false,[[TT.x+2.3,-1.8],[TT.x+2.3,0]],{game:\"tennis\",slot:1});",
"// --- PS5 burchagi ---",
"const PS={x:GX-1,z:7.2};",
"screenAt(PS.x,1.9,PS.z+3.6,Math.PI,3.4,1.9,(function(){const c=document.createElement(\"canvas\");c.width=256;c.height=144;const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;SPACE.psCanvas=c;SPACE.psTex=t;return t;})());",
"box(1.2,.5,.5,M(\"#e9ecf5\"),PS.x,.55,PS.z+3.4); box(.2,.5,.4,M(\"#f7f7fb\"),PS.x+.9,.6,PS.z+3.4);",
"rbox(3.4,.5,1.1,.3,M(\"#3a2e6e\"),PS.x,.35,PS.z); rbox(3.4,.8,.3,.12,M(\"#2e2458\"),PS.x,.7,PS.z-.5);",
"spot(\"ps0\",PS.x-.7,PS.z+.05,0,true,[[PS.x-.7,1.8],[PS.x-.7,0]],{game:\"ps5\",slot:0});",
"spot(\"ps1\",PS.x+.7,PS.z+.05,0,true,[[PS.x+.7,1.8],[PS.x+.7,0]],{game:\"ps5\",slot:1});",
"// --- CS2 arenasi: 4 ga 4 ---",
"const CS=[];",
"[[-1,\"#ff8a3d\"],[1,\"#5ad1ff\"]].forEach(([s,col],team)=>{",
"  for(let i=0;i<4;i++){ const x=GX+6+i*2, z=s*4.2;",
"    box(1.6,.08,.8,M(\"#1b2033\"),x,.95,z+s*.3); box(.08,.9,.7,M(\"#3d4560\"),x-.7,.48,z+s*.3); box(.08,.9,.7,M(\"#3d4560\"),x+.7,.48,z+s*.3);",
"    box(.95,.6,.05,M(\"#111\"),x,1.4,z+s*.62); const sc=plane(.88,.52,scrIdle,x,1.4,z+s*.59,s>0?Math.PI:0); CS.push(sc);",
"    box(.04,.02,.5,EM(col,1.5),x,1.0,z+s*.05,false);",
"    rbox(.66,.1,.66,.15,M(col),x,.52,z-s*.2); rbox(.66,.7,.1,.05,M(\"#222\"),x,.92,z-s*.55);",
"    spot(\"cs\"+team+i,x,z-s*.2,s>0?0:Math.PI,true,[[x,s*1.8],[x,0]],{game:\"cs2\",slot:team*4+i,team});",
"  }",
"});",
"// CS sahnasi uchun ekran rasmi",
"const csTex=canvasTex(128,80,(g,w,h)=>{g.fillStyle=\"#3b3324\";g.fillRect(0,0,w,h);g.fillStyle=\"#6b5b3e\";g.fillRect(0,40,w,40);g.fillStyle=\"#8a7650\";g.fillRect(30,18,40,30);g.fillStyle=\"#fff\";g.fillRect(62,36,4,8);g.fillRect(60,38,8,4);});",
"const csWork=new THREE.MeshBasicMaterial({map:csTex});",
"// --- reyting ekrani (o'yin kemasi burnida) ---",
"const rankC=document.createElement(\"canvas\"); rankC.width=640; rankC.height=360;",
"const rankT=new THREE.CanvasTexture(rankC); rankT.encoding=THREE.sRGBEncoding;",
"box(.3,5.4,10.4,M(\"#151a2b\"),GX+14.2,3.2,0); plane(10,5,new THREE.MeshBasicMaterial({map:rankT}),GX+14.03,3.2,0,-Math.PI/2);",
"box(.3,.6,.3,M(\"#3d4560\"),GX+14.2,.3,-3); box(.3,.6,.3,M(\"#3d4560\"),GX+14.2,.3,3);",
"// tomoshabinlar uchun skameyka",
"[[GX-4.5,-9.8],[GX-4.5,9.8]].forEach(([x,z],k)=>{ rbox(3,.4,.8,.15,M(\"#3b4380\"),x,.3,z); spot(\"bench\"+k,x,z+(z>0?-.1:.1),z>0?Math.PI:0,true,[[x,z>0?1.8:-1.8],[x,0]]); });",
"",
"/* =========================================================",
"   Xodimlar (kattaroq, har birining soch turmagi bilan)",
"   ========================================================= */",
"const labels=$(\"labels\");",
"const AV={}, hitMeshes=[];",
"const AG_SCALE=1.3, WALK=4.4, JOG=6.2;",
"class Agent{",
"  constructor(id,home){",
"    this.id=id; this.p=TEAM[id]; this.home=home; this.spot=home; this.q=[]; this.path=[]; this.walking=false; this.waitT=0; this.t=Math.random()*9;",
"    this.idleSince=performance.now()-rand(0,10000); this.session=null; this.anim=null;",
"    const p=this.p, shirt=M(p.shirt||p.col,{roughness:.7}), skin=M(p.skin,{roughness:.6}), hair=M(p.hair,{roughness:.8}), pants=M(\"#262d42\"), shoe=M(\"#1c2030\");",
"    this.g=new THREE.Group(); this.g.scale.setScalar(AG_SCALE); this.body=new THREE.Group(); this.g.add(this.body);",
"    const parts=[];",
"    this.legs=[-.13,.13].map(x=>{const pv=new THREE.Group();pv.position.set(x,.56,0);this.body.add(pv);parts.push(cyl(.11,.1,.52,pants,0,-.26,0,10,true,pv));parts.push(sph(.115,shoe,0,-.52,.05,true,pv,10,8));return pv;});",
"    parts.push(cyl(.3,.34,.62,shirt,0,.9,0,18,true,this.body));",
"    const sh=sph(.3,shirt,0,1.2,0,true,this.body);sh.scale.y=.45;parts.push(sh);",
"    if(id===\"rustam\"){parts.push(box(.08,.4,.03,M(\"#d23b3b\"),0,.98,.33,false,this.body));box(.22,.06,.04,MB(\"#ffffff\"),0,1.2,.29,false,this.body);}",
"    else parts.push(box(.38,.05,.02,M(p.col),0,1.02,.335,false,this.body));",
"    this.arms=[-.37,.37].map(x=>{const pv=new THREE.Group();pv.position.set(x,1.17,0);this.body.add(pv);parts.push(cyl(.075,.07,.55,shirt,0,-.27,0,8,true,pv));parts.push(sph(.085,skin,0,-.57,0,true,pv,10,8));return pv;});",
"    parts.push(cyl(.09,.09,.12,skin,0,1.33,0,8,false,this.body));",
"    this.headG=new THREE.Group(); this.headG.position.y=1.64; this.body.add(this.headG);",
"    this.head=sph(.32,skin,0,0,0,true,this.headG,22,16); parts.push(this.head);",
"    const st=p.style;",
"    const cap=new THREE.Mesh(new THREE.SphereGeometry(.34,22,12,0,Math.PI*2,0,Math.PI*.5),hair); cap.position.set(0,.03,-.02); cap.castShadow=true; this.headG.add(cap); parts.push(cap);",
"    if(st===\"cap\"){ const vz=box(.36,.04,.26,M(p.col),0,.13,.3,false,this.headG); vz.rotation.x=-.12; const cp=new THREE.Mesh(new THREE.SphereGeometry(.35,20,10,0,Math.PI*2,0,Math.PI*.42),M(p.col)); cp.position.y=.05; this.headG.add(cp); parts.push(cp); }",
"    if(st===\"curly\") for(let i=0;i<9;i++){ const a=i/9*Math.PI*2; parts.push(sph(.11,hair,Math.cos(a)*.24,.2+Math.random()*.06,Math.sin(a)*.22-.03,false,this.headG,8,6)); }",
"    if(st===\"bun\") parts.push(sph(.13,hair,0,.36,-.1,false,this.headG,10,8));",
"    if(st===\"long\") parts.push(rbox(.56,.7,.16,.07,hair,0,-.18,-.2,true,this.headG));",
"    if(st===\"bob\") parts.push(rbox(.66,.36,.5,.14,hair,0,-.02,-.06,true,this.headG));",
"    if(st===\"pony\"){ const pt=cyl(.08,.04,.5,hair,0,-.12,-.36,8,true,this.headG); pt.rotation.x=.5; parts.push(pt); }",
"    const eye=MB(\"#141414\"); sph(.04,eye,-.11,.02,.29,false,this.headG,8,6); sph(.04,eye,.11,.02,.29,false,this.headG,8,6);",
"    box(.12,.02,.02,MB(\"#7a3b32\"),0,-.11,.305,false,this.headG);",
"    if(id===\"shoxrux\"||id===\"elyor\"){ const gl=M(\"#1a1a1a\"); [-.11,.11].forEach(x=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,6,14),gl);r.position.set(x,.02,.31);this.headG.add(r);}); }",
"    parts.forEach(m=>{m.userData.agent=this;hitMeshes.push(m);});",
"    this.g.position.copy(home.pos); this.g.rotation.y=home.face; scene.add(this.g); this.pose(home.sit);",
"    this.tag=document.createElement(\"div\");this.tag.className=\"tag\";this.tag.dataset.agent=id;labels.appendChild(this.tag);this.tagKey=\"\";",
"    this.bub=document.createElement(\"div\");this.bub.className=\"bub\";this.bub.hidden=true;labels.appendChild(this.bub);this.bubT=0;",
"  }",
"  pose(sit){ this.sitting=sit; this.body.position.y=sit?-.02:0; this.legs.forEach(l=>l.rotation.x=sit?-1.45:0); }",
"  say(text,ms=3200,dots=false){ this.bub.textContent=text.length>90?text.slice(0,88)+\"…\":text; this.bub.classList.toggle(\"dots\",dots); this.bub.hidden=false; this.bubT=dots?999:ms/1000; }",
"  hush(){ this.bub.hidden=true; this.bubT=0; }",
"  act(list){ this.q.push(...list); }",
"  get busy(){ return this.walking||this.waitT>0||this.q.length>0; }",
"  goto(s){",
"    if(this.spot&&this.spot.occ===this) this.spot.occ=null;",
"    if(!s.name.startsWith(\"desk\")&&s.name!==\"boss\") s.occ=this;",
"    this.path=route(this.spot||this.home,s); this.target=s; this.spot=null; this.walking=true; this.pose(false); this.anim=null;",
"    let L=0,prev=this.g.position; for(const v of this.path){L+=prev.distanceTo(v);prev=v;} this.speed=L>26?JOG:WALK;",
"    if(!this.path.length) this.arrive();",
"  }",
"  arrive(){ this.walking=false; const s=this.target; this.spot=s; this.g.position.copy(s.pos); this.g.rotation.y=s.face; this.pose(s.sit); if(s===this.home) this.idleSince=performance.now(); }",
"  goHome(){ this.q.length=0; this.waitT=0; if(this.spot!==this.home||this.walking) this.goto(this.home); }",
"  update(dt){",
"    this.t+=dt;",
"    if(this.walking){",
"      const tg=this.path[0];",
"      if(!tg) this.arrive();",
"      else{ const p=this.g.position,dx=tg.x-p.x,dz=tg.z-p.z,d=Math.hypot(dx,dz),st=this.speed*dt;",
"        if(d<=st){p.x=tg.x;p.z=tg.z;this.path.shift();} else {p.x+=dx/d*st;p.z+=dz/d*st;}",
"        if(d>.01){let a=Math.atan2(dx,dz)-this.g.rotation.y;a=Math.atan2(Math.sin(a),Math.cos(a));this.g.rotation.y+=a*Math.min(1,dt*12);}",
"        const f=this.speed>WALK?14:11, w=Math.sin(this.t*f), amp=this.speed>WALK?.75:.55;",
"        this.legs[0].rotation.x=w*amp; this.legs[1].rotation.x=-w*amp; this.arms[0].rotation.x=-w*amp*.9; this.arms[1].rotation.x=w*amp*.9; this.body.position.y=Math.abs(Math.cos(this.t*f))*.06; }",
"    } else if(this.waitT>0){ this.waitT-=dt; }",
"    else if(this.q.length){ const a=this.q.shift(); if(a.go) this.goto(typeof a.go===\"function\"?a.go():a.go); else if(a.wait) this.waitT=a.wait; else if(a.fn) a.fn(this); }",
"    else if(this.spot!==this.home&&!this.session){ this.goto(this.home); }",
"    if(!this.walking){",
"      const A=this.anim;",
"      if(this.working){ const k=Math.sin(this.t*16)*.08; this.arms[0].rotation.x=-1.15+k; this.arms[1].rotation.x=-1.15-k; this.headG.rotation.x=.08; }",
"      else if(A===\"cs\"){ const k=Math.sin(this.t*22)*.1; this.arms[0].rotation.x=-1.2+k; this.arms[1].rotation.x=-1.25-k*.6; this.headG.rotation.x=.05; }",
"      else if(A===\"ps\"){ const k=Math.sin(this.t*9)*.06; this.arms[0].rotation.x=-1.0+k; this.arms[1].rotation.x=-1.0-k; this.arms[0].rotation.z=-.25; this.arms[1].rotation.z=.25; this.body.rotation.z=Math.sin(this.t*1.7)*.04; }",
"      else if(A===\"chess\"){ this.arms[0].rotation.x=-.4; this.arms[1].rotation.x=-1.0+Math.max(0,Math.sin(this.t*.9))*.4; this.headG.rotation.x=.22; }",
"      else if(A===\"tennis\"){ const k=Math.sin(this.t*5+(this.id.length)); this.arms[1].rotation.x=-.8+k*.7; this.arms[0].rotation.x=-.3; this.g.position.z=this.spot.pos.z+Math.sin(this.t*2.3)*.45; this.body.position.y=Math.abs(Math.sin(this.t*5))*.05; }",
"      else { this.arms[0].rotation.x=this.arms[1].rotation.x=this.sitting?-.35:Math.sin(this.t*1.5)*.04; this.arms[0].rotation.z=this.arms[1].rotation.z=0; this.body.rotation.z=0; this.headG.rotation.x=0; this.body.position.y=this.sitting?-.02:Math.sin(this.t*2)*.01; }",
"    }",
"    if(this.bubT>0&&this.bubT<999){this.bubT-=dt;if(this.bubT<=0)this.bub.hidden=true;}",
"  }",
"}",
"AV.rustam=new Agent(\"rustam\",SP.boss);",
"STAFF.forEach(id=>AV[id]=new Agent(id,DESK[id].seat));",
"const ring=keep(add(new THREE.TorusGeometry(.9,.07,8,36),MB(\"#ffb547\"),0,.1,0,false));ring.rotation.x=Math.PI/2;ring.visible=false;",
"",
"/* =========================================================",
"   Holat",
"   ========================================================= */",
"let S=null, lastMsg=0, aiMode=\"\", CHANNEL=\"\", G=null;",
"const localRun=new Map(); const runQueue=[]; let running=0; let thinking=false;",
"function taskById(id){ return S&&S.tasks.find(t=>t.id===id); }",
"function isActive(t){ return t.status===\"new\"||t.status===\"run\"||localRun.has(t.id); }",
"function hasWork(id){ return !!(S&&S.tasks.some(t=>t.who===id&&isActive(t))); }",
"function progress(t){",
"  if(t.status===\"done\") return 100; if(t.status===\"error\") return 0;",
"  const st=localRun.get(t.id)||(t.status===\"run\"?t.started:0); if(!st) return 0;",
"  return Math.min(95,Math.floor(100*(1-Math.exp(-(Date.now()-st)/14000))));",
"}",
"function freeSpot(names){ return names.map(n=>SP[n]).find(s=>s&&!s.occ)||SP[names[0]]; }",
"",
"/* =========================================================",
"   Bo'sh vaqt: o'yinlar (shaxmat, tennis, PS5, CS2) va reyting",
"   ========================================================= */",
"const SESS={",
"  chess0:{game:\"chess\",spots:[\"chess0a\",\"chess0b\"],players:[],state:\"idle\"},",
"  chess1:{game:\"chess\",spots:[\"chess1a\",\"chess1b\"],players:[],state:\"idle\"},",
"  tennis:{game:\"tennis\",spots:[\"tennis0\",\"tennis1\"],players:[],state:\"idle\"},",
"  ps:{game:\"ps5\",spots:[\"ps0\",\"ps1\"],players:[],state:\"idle\"},",
"  cs:{game:\"cs2\",spots:[\"cs00\",\"cs10\",\"cs01\",\"cs11\",\"cs02\",\"cs12\",\"cs03\",\"cs13\"],players:[],state:\"idle\"}",
"};",
"const DUR={chess:[45,75],tennis:[35,55],ps5:[40,60],cs2:[60,90]};",
"const LINES={chess:[\"Shax!\",\"Hmm…\",\"Otingni ber!\",\"Mat yaqin\"],tennis:[\"Hop!\",\"Zo‘r zarba!\",\"Out!\",\"Yana bir\"],ps5:[\"GOOOL!\",\"Pas ber!\",\"Darvozabon qayerda?!\"],cs2:[\"Rush B!\",\"Bomba qo‘yildi!\",\"Menga yordam!\",\"Headshot!\",\"Eco raund\"]};",
"function eligible(a,now){ return !a.busy&&a.spot===a.home&&!a.session&&!hasWork(a.id)&&!(a.id===\"rustam\"&&thinking)&&now-a.idleSince>14000; }",
"function startSession(key,players){",
"  const s=SESS[key]; s.players=players.slice(); s.state=\"gather\"; s.t=performance.now(); s.ready=0;",
"  players.forEach((a,i)=>{ a.session=s; const sp=SP[s.spots[i]]; a.q.length=0;",
"    a.act([{go:sp},{fn:()=>{ s.ready++; a.anim=s.game===\"cs2\"?\"cs\":s.game===\"ps5\"?\"ps\":s.game; if(s.ready>=s.players.length) playSession(s); }}]); });",
"  if(key===\"cs\") players[0].say(\"Kim CS o‘ynaydi? Lobbi ochdim!\",2600);",
"  else players[0].say(pick([\"Bir partiya?\",\"Kim yutadi, ko‘ramiz!\",\"Tanaffus!\"]),2200);",
"}",
"function playSession(s){ s.state=\"play\"; s.t=performance.now(); const [a,b]=DUR[s.game]; s.dur=rand(a,b)*1000; s.next=performance.now()+rand(4000,8000); }",
"function endSession(s,abort){",
"  const pl=s.players.slice(); s.players=[]; s.state=\"idle\";",
"  pl.forEach(a=>{ a.session=null; a.anim=null; });",
"  if(!abort&&pl.length>=2){",
"    let A,B; if(s.game===\"cs2\"){ A=pl.filter((_,i)=>i%2===0); B=pl.filter((_,i)=>i%2===1); } else { A=[pl[0]]; B=[pl[1]]; }",
"    const R=(G&&G.r&&G.r[s.game])||{}, avg=xs=>xs.reduce((q,x)=>q+(R[x.id]||1000),0)/xs.length;",
"    const pa=1/(1+Math.pow(10,(avg(B)-avg(A))/400));",
"    const draw=s.game===\"chess\"&&Math.random()<.15; const win=draw?\"draw\":Math.random()<pa?\"a\":\"b\";",
"    const W=win===\"a\"?A:win===\"b\"?B:[], L=win===\"a\"?B:win===\"b\"?A:[];",
"    if(draw) pl.forEach(x=>x.say(\"Durang 🤝\",2400)); else { W.forEach(x=>x.say(pick([\"G‘alaba! 🏆\",\"Ha-ha, yutdim!\",\"Zo‘r o‘yin edi\"]),2600)); L.forEach(x=>x.say(pick([\"Keyingi safar…\",\"Revansh!\",\"Omadim kelmadi\"]),2600)); }",
"    recordGame({game:s.game,a:A.map(x=>x.id),b:B.map(x=>x.id),win});",
"  }",
"  pl.forEach((a,i)=>{ a.act([{wait:abort?0:rand(1.5,3.5)},{go:a.home}]); });",
"  renderLive();",
"}",
"function leaveSession(a){ const s=a.session; if(!s) return;",
"  if(s.game===\"cs2\"&&s.players.length-1>=4&&s.state===\"play\"){ s.players=s.players.filter(x=>x!==a); a.session=null; a.anim=null; a.goHome(); a.say(\"Ish chiqdi, ketdim!\",2200); return; }",
"  a.say(\"Ish chiqdi!\",2000); endSession(s,true); a.goHome(); }",
"async function recordGame(m){",
"  try{ const r=await call(\"/api/game\",m); if(r&&r.games){ G=r.games; if(S) S.games=G; } }catch(e){ G=eloApply(G,m); }",
"  renderRank(); drawRankBoard();",
"}",
"let dirT=6;",
"function director(dt,now){",
"  dirT-=dt; if(dirT>0) return; dirT=rand(3,5);",
"  const cand=IDS.map(i=>AV[i]).filter(a=>eligible(a,now));",
"  const cs=SESS.cs;",
"  if(cs.state===\"gather\"&&cs.players.length<8&&cand.length&&performance.now()-cs.t<9000){ // lobbiga qo'shilish",
"    const a=cand[0]; const i=cs.players.length; cs.players.push(a); a.session=cs; a.q.length=0;",
"    a.act([{go:SP[cs.spots[i]]},{fn:()=>{ cs.ready++; a.anim=\"cs\"; if(cs.state===\"gather\"&&cs.ready>=cs.players.length&&cs.players.length%2===0&&performance.now()-cs.t>6000) playSession(cs); }}]); return; }",
"  if(cs.state===\"gather\"&&performance.now()-cs.t>9000&&cs.ready>=cs.players.length){ if(cs.players.length%2) { const x=cs.players.pop(); x.session=null; x.goHome(); } if(cs.players.length>=4) playSession(cs); else endSession(cs,true); return; }",
"  if(cand.length<1||Math.random()<.35) return;",
"  const free=Object.entries(SESS).filter(([k,s])=>s.state===\"idle\"&&(k!==\"cs\"||cand.length>=4));",
"  if(cand.length>=2&&free.length){",
"    const [k,s]=pick(free); const n=k===\"cs\"?Math.min(cand.length,8)-(Math.min(cand.length,8)%2):2;",
"    const shuffled=cand.sort(()=>Math.random()-.5).slice(0,n); startSession(k,shuffled); return;",
"  }",
"  // yolg'iz: kofe yoki qora tuynukni tomosha qilish",
"  const a=pick(cand); const dest=Math.random()<.5?freeSpot([\"coffee\",\"cafe0a\",\"cafe1b\",\"cafe2a\"]):freeSpot([\"obs0\",\"obs1\",\"obs2\",\"obs3\"]);",
"  a.act([{go:dest},{fn:()=>a.say(dest.name.startsWith(\"obs\")?pick([\"Qanday go‘zal…\",\"Unga hech qachon yetmaymiz\",\"Gargantua…\"]):pick([\"Bir piyola choy…\",\"Kofe vaqti!\"]),2600)},{wait:rand(12,22)}]);",
"}",
"function sessionTick(now){",
"  for(const s of Object.values(SESS)){",
"    if(s.state===\"gather\"&&s.game!==\"cs2\"&&now-s.t>60000) endSession(s,true);",
"    if(s.state!==\"play\") continue;",
"    if(!s.players.length){ s.state=\"idle\"; continue; }",
"    if(now>s.next){ s.next=now+rand(5000,11000); const sp=pick(s.players); if(sp) sp.say(pick(LINES[s.game]),2000);",
"      if(s.game===\"chess\"){ const pcs=CHESS[s===SESS.chess0?0:1]; const pc=pick(pcs); pc.position.x+=rand(-.17,.17); pc.position.z+=rand(-.17,.17); } }",
"    if(now-s.t>s.dur) endSession(s,false);",
"  }",
"  // tennis to'pi",
"  const tn=SESS.tennis; if(tn.state===\"play\"){ const k=(now/700)%2, f=k<1?k:2-k; SPACE.ball.position.set(TT.x-1.2+2.4*f,1.05+Math.sin(f*Math.PI)*.7,TT.z+Math.sin(now/900)*.4); SPACE.ball.visible=true; } else SPACE.ball.visible=false;",
"  // PS5 ekrani",
"  if(SPACE.psCanvas){ const g=SPACE.psCanvas.getContext(\"2d\"),W2=256,H2=144; g.fillStyle=\"#2f8f3e\";g.fillRect(0,0,W2,H2);",
"    if(SESS.ps.state===\"play\"){ g.strokeStyle=\"rgba(255,255,255,.6)\";g.lineWidth=2;g.strokeRect(8,8,W2-16,H2-16);g.beginPath();g.moveTo(W2/2,8);g.lineTo(W2/2,H2-8);g.stroke();",
"      for(let i=0;i<6;i++){g.fillStyle=i<3?\"#ff5d5d\":\"#5d8bff\";g.beginPath();g.arc(W2/2+Math.sin(now/800+i*1.7)*90,H2/2+Math.cos(now/650+i*2.3)*45,5,0,7);g.fill();}",
"      g.fillStyle=\"#fff\";g.beginPath();g.arc(W2/2+Math.sin(now/500)*100,H2/2+Math.sin(now/370)*50,3.5,0,7);g.fill(); }",
"    else { g.fillStyle=\"#0b1030\";g.fillRect(0,0,W2,H2);g.fillStyle=\"#ffffff\";g.font=\"700 20px Manrope\";g.fillText(\"PS5\",110,78); }",
"    SPACE.psTex.needsUpdate=true; }",
"  CS.forEach(sc=>{ sc.material=SESS.cs.state===\"play\"?csWork:scrIdle; });",
"}",
"",
"/* =========================================================",
"   Ish xoreografiyasi",
"   ========================================================= */",
"function assignFlow(tasks){",
"  const R=AV.rustam; R.hush(); if(R.session) leaveSession(R);",
"  tasks.forEach(t=>{ const who=AV[t.who]; if(who.session) leaveSession(who); else if(who.spot!==who.home) who.goHome();",
"    R.act([{go:()=>DESK[t.who].visit},{fn:()=>{R.say(\"«\"+t.title+\"»\"); setTimeout(()=>who.say(\"Qabul qildim!\",2200),700);}},{wait:1.5}]); });",
"  R.act([{go:SP.boss}]);",
"}",
"function reviewFlow(t){",
"  const src=taskById(t.review), sh=AV.shoxrux; if(sh.session) leaveSession(sh);",
"  if(src&&DESK[src.who]) sh.act([{go:()=>DESK[src.who].visit},{fn:()=>{sh.say(\"Ko‘rib chiqaman\");AV[src.who].say(\"Mana, tayyor!\",2000);}},{wait:1.6}]);",
"}",
"function doneFlow(t){",
"  const a=AV[t.who], R=AV.rustam;",
"  a.act([{go:()=>freeSpot([\"hand-a\",\"hand-b\"])},{fn:()=>{a.say(\"Tayyor: «\"+t.title+\"»\",2600); setTimeout(()=>R.say(pick([\"Barakalla, \",\"Zo‘r ish, \",\"Rahmat, \"])+a.p.name+\"!\",2400),900);}},{wait:2}]);",
"}",
"function errorFlow(t){ AV[t.who].say(\"Xatolik bo‘ldi, qayta urinaman?\",3500); }",
"function enqueueRun(t){ if(runQueue.includes(t.id)||localRun.has(t.id)) return; runQueue.push(t.id); pump(); }",
"function pump(){",
"  while(running<2&&runQueue.length){",
"    const id=runQueue.shift(); const t=taskById(id); if(!t||t.status===\"done\") continue;",
"    running++; localRun.set(id,Date.now());",
"    call(\"/api/run\",{id}).then(r=>applyState(r.state)).catch(e=>toast(e.message)).finally(()=>{running--;localRun.delete(id);pump();});",
"  }",
"}",
"function applyState(ns,initial){",
"  const prev=new Map(S?S.tasks.map(t=>[t.id,t.status]):[]);",
"  S=ns; if(ns.games) G=ns.games;",
"  document.querySelectorAll(\".m.wait\").forEach(e=>e.remove());",
"  const fresh=ns.msgs.filter(m=>m.id>lastMsg);",
"  if(initial){ $(\"msgs\").innerHTML=\"\"; }",
"  fresh.forEach(m=>{ $(\"msgs\").appendChild(renderMsg(m)); if(!initial&&m.from!==\"me\"&&AV[m.from]&&m.kind!==\"result\"&&!(m.from===\"rustam\"&&m.taskIds)) AV[m.from].say(m.text.split(\"\\n\")[0],3800); });",
"  if(fresh.length){ lastMsg=Math.max(...fresh.map(m=>m.id)); scrollChat(!initial||true); }",
"  if(!initial){",
"    const neu=ns.tasks.filter(t=>!prev.has(t.id));",
"    const normal=neu.filter(t=>!t.review); if(normal.length) assignFlow(normal);",
"    neu.filter(t=>t.review).forEach(reviewFlow);",
"    ns.tasks.forEach(t=>{const p=prev.get(t.id); if(p&&p!==\"done\"&&t.status===\"done\"){doneFlow(t);haptic(\"n\",\"success\");} if(p&&p!==\"error\"&&t.status===\"error\") errorFlow(t);});",
"  }",
"  // vazifasi bor xodim o'yinda bo'lsa — ishga qaytadi",
"  IDS.forEach(id=>{ const a=AV[id]; if(a.session&&hasWork(id)) leaveSession(a); });",
"  ns.tasks.forEach(t=>{ if(t.status===\"new\"||(t.status===\"run\"&&Date.now()-(t.started||0)>150000)) enqueueRun(t); });",
"  renderTasks(); renderTeam(); renderRank(); drawBoard(); drawRankBoard(); tick();",
"}",
"function scrollChat(force){ const sc=$(\"chatScroll\"); if(force||sc.scrollHeight-sc.scrollTop-sc.clientHeight<200) requestAnimationFrame(()=>sc.scrollTop=sc.scrollHeight); }",
"",
"/* =========================================================",
"   Chat",
"   ========================================================= */",
"function avHTML(id,cls){ const p=TEAM[id]||TEAM.rustam; return '<div class=\"av '+(cls||\"\")+'\" style=\"background:'+p.col+'\">'+p.name[0]+'</div>'; }",
"function textHTML(t){ return String(t).split(/\\n{2,}/).map(p=>\"<p>\"+esc(p).replace(/\\n/g,\"<br>\").replace(/@([A-Za-z‘’ʻ']+)/g,(m,n)=>byName[n.toLowerCase()]?'<span class=\"mention\">'+m+\"</span>\":m)+\"</p>\").join(\"\"); }",
"function stText(t){ if(t.status===\"done\") return \"tayyor\"; if(t.status===\"error\") return \"xato\"; const a=AV[t.who]; if(localRun.has(t.id)||t.status===\"run\") return a&&a.working?\"ishlayapti\":\"boshlayapti\"; return \"navbatda\"; }",
"function chipHTML(t){",
"  if(!t) return \"\";",
"  const done=t.status===\"done\", err=t.status===\"error\";",
"  return '<button class=\"tchip\" data-open=\"'+t.id+'\">'+avHTML(t.who)+'<div class=\"tt\">'+esc(t.title)+'<small>'+TEAM[t.who].name+' · <span data-ts=\"'+t.id+'\">'+stText(t)+'</span></small></div><span class=\"pc'+(done?\" ok\":err?\" err\":\"\")+'\" data-tl=\"'+t.id+'\">'+(err?\"!\":progress(t)+\"%\")+'</span><div class=\"bar'+(done?\" ok\":\"\")+'\"><i data-tp=\"'+t.id+'\" style=\"width:'+progress(t)+'%\"></i></div></button>';",
"}",
"function renderMsg(m){",
"  const d=document.createElement(\"div\");",
"  if(m.from===\"me\"){ d.className=\"m me\"; const to=(m.text.match(/^@([A-Za-z‘’ʻ']+)/)||[])[1]; d.innerHTML='<div><div class=\"txt\">'+textHTML(m.text)+'</div></div>'; return d; }",
"  const p=TEAM[m.from]||TEAM.rustam; d.className=\"m\";",
"  let extra=\"\";",
"  if(m.kind===\"result\"&&m.taskIds){ const t=taskById(m.taskIds[0]);",
"    extra=t?'<div class=\"res\"><div class=\"rt\">Natija tayyor</div><div class=\"rh\">'+esc(t.title)+'</div><div class=\"rp\">'+esc((t.result||\"\").replace(/\\*\\*|```[\\w+-]*|^#{1,4}\\s*/gm,\"\").slice(0,260))+'</div><button class=\"open\" data-open=\"'+t.id+'\">Natijani ochish</button></div>':\"\";",
"  } else if(m.taskIds){ extra='<div class=\"chips\">'+m.taskIds.map(id=>chipHTML(taskById(id))).join(\"\")+'</div>'; }",
"  d.innerHTML=avHTML(m.from)+'<div class=\"b\"><div class=\"meta\"><b>'+p.name+'</b><span>'+p.role+'</span><span class=\"t\">'+hhmm(m.t)+'</span></div><div class=\"txt\">'+textHTML(m.text)+'</div>'+extra+'</div>';",
"  return d;",
"}",
"function showTyping(on){",
"  let el=$(\"typing\");",
"  if(on&&!el){ el=document.createElement(\"div\"); el.id=\"typing\"; el.className=\"typing\"; el.innerHTML=avHTML(S_TO&&S_TO!==\"rustam\"?S_TO:\"rustam\")+\"<span>\"+(S_TO&&S_TO!==\"rustam\"?TEAM[S_TO].name:\"Rustam\")+\" o‘ylayapti…</span>\"; $(\"msgs\").appendChild(el); scrollChat(true); }",
"  if(!on&&el) el.remove();",
"}",
"async function send(text){",
"  text=text.trim(); if(!text||thinking) return;",
"  if(S_TO&&!/^@/.test(text)) text=\"@\"+TEAM[S_TO].name+\" \"+text;",
"  haptic(\"i\",\"light\");",
"  const d=document.createElement(\"div\"); d.className=\"m me wait\"; d.innerHTML='<div><div class=\"txt\">'+textHTML(text)+'</div></div>'; $(\"msgs\").appendChild(d); scrollChat(true);",
"  thinking=true; $(\"sendBtn\").disabled=true; showTyping(true);",
"  const sp=AV[S_TO||\"rustam\"]||AV.rustam; sp.say(\"O‘ylayapman\",0,true);",
"  try{ const r=await call(\"/api/send\",{text}); sp.hush(); showTyping(false); applyState(r.state); }",
"  catch(e){ sp.hush(); showTyping(false); d.classList.remove(\"wait\"); toast(e.message); }",
"  finally{ thinking=false; $(\"sendBtn\").disabled=false; }",
"}",
"",
"/* =========================================================",
"   Vazifa berish paneli: kimga, shablonlar, @ ro'yxati",
"   ========================================================= */",
"let S_TO=null;",
"function renderWho(){",
"  $(\"who\").innerHTML='<button type=\"button\" class=\"wc auto\" data-to=\"\" aria-pressed=\"'+(!S_TO)+'\">🤖 Avto (Rustam)</button>'+STAFF.map(id=>'<button type=\"button\" class=\"wc\" data-to=\"'+id+'\" aria-pressed=\"'+(S_TO===id)+'\" title=\"'+TEAM[id].role+'\">'+avHTML(id)+TEAM[id].name+'</button>').join(\"\");",
"  $(\"inp\").placeholder=S_TO?TEAM[S_TO].name+\"ga vazifa (\"+TEAM[S_TO].role.toLowerCase()+\")…\":\"Vazifani yozing — Rustam kerakli odamga beradi…\";",
"}",
"function setTo(id,focusInp){ S_TO=id||null; renderWho(); const b=document.querySelector('.wc[aria-pressed=\"true\"]'); if(b) b.scrollIntoView({block:\"nearest\",inline:\"center\",behavior:\"smooth\"}); if(focusInp){ setTab(\"chat\"); $(\"inp\").focus(); } }",
"$(\"who\").addEventListener(\"click\",e=>{ const b=e.target.closest(\"[data-to]\"); if(b) setTo(b.dataset.to,true); });",
"const TPL=[",
"  [\"Kontent\",[[\"Hisobot ber\",\"Kim nima qilyapti\",true],[\"Kanal uchun yangi post tayyorla\",\"Sabina + Dilnoza\",true,\"qcPost\"],[\"YouTube video uchun 5 ta sarlavha va prevyu g‘oyasi kerak\",\"Sarlavha + prevyu\"],[\"Instagram uchun bir haftalik post rejasi tuz\",\"Post rejasi\"]]],",
"  [\"Von Reich zu Arm\",[[\"@Dilnoza Von Reich zu Arm uchun keyingi Shorts ssenariysini yoz: nemischa, 2 daqiqa, 0–3 soniyada ilgak, 3 ta sabab, oxirida savol\",\"Shorts ssenariy\"],[\"@Sabina Von Reich zu Arm uchun 2 haftalik Shorts jadvali tuz: 2–3 kunda bitta, Germaniya vaqti 17:00, haftada bitta uzun video\",\"Chiqish jadvali\"],[\"@Laylo Arxiv suratlardan 2 daqiqalik Shorts uchun montaj rejasi ber: sahnalar soniyalar bilan, subtitr uslubi\",\"Montaj rejasi\"],[\"@Shoxrux Oxirgi ssenariyni tekshir: raqamlar manbaga mosmi, siyosiy betaraflik, ilgak kuchimi\",\"Ssenariy tekshiruvi\"]]],",
"  [\"Ish\",[[\"@Feruza Reels reklamasi narxini hisobla: 30 soniya, 3D animatsiya\",\"Narx hisobla\"],[\"@Elyor Telegram bot uchun /start buyrug‘iga javob beradigan kod yoz (Cloudflare Worker)\",\"Bot kodi\"],[\"@Doniyor Mini App uchun chiroyli bosh sahifa HTML kodini yoz\",\"Sahifa kodi\"],[\"@Behruz Reklama beruvchiga tijorat taklifi matnini yoz\",\"Tijorat taklifi\"]]]",
"];",
"const pop=$(\"pop\"); let popMode=null, mlI=0, mlItems=[];",
"function openTpl(){ popMode=\"tpl\"; pop.innerHTML=TPL.map(([h,list])=>'<h6>'+h+'</h6>'+list.filter(x=>x[3]!==\"qcPost\"||CHANNEL).map(x=>'<button type=\"button\" data-tpl=\"'+esc(x[0])+'\"'+(x[2]?' data-now=\"1\"':'')+'><span><b>'+esc(x[1])+'</b><br><small>'+esc(x[0].replace(/^@\\S+\\s/,\"\").slice(0,70))+(x[0].length>70?\"…\":\"\")+'</small></span></button>').join(\"\")).join(\"\"); pop.hidden=false; }",
"function closePop(){ pop.hidden=true; popMode=null; }",
"$(\"tplBtn\").onclick=()=>{ if(!pop.hidden&&popMode===\"tpl\") closePop(); else openTpl(); };",
"pop.addEventListener(\"mousedown\",e=>e.preventDefault());",
"pop.addEventListener(\"click\",e=>{",
"  const t=e.target.closest(\"[data-tpl]\"); if(t){ closePop(); const v=t.dataset.tpl; if(t.dataset.now){ send(v); return; } const m=v.match(/^@(\\S+)\\s/); if(m&&byName[m[1].toLowerCase()]){ setTo(byName[m[1].toLowerCase()]); inp.value=v.slice(m[0].length); } else inp.value=v; grow(); inp.focus(); return; }",
"  const n=e.target.closest(\"[data-n]\"); if(n) insertM(n.dataset.n);",
"});",
"const inp=$(\"inp\");",
"function grow(){ inp.style.height=\"auto\"; inp.style.height=Math.min(window.innerWidth>=900?220:140,inp.scrollHeight)+\"px\"; }",
"function mq(){ const m=inp.value.slice(0,inp.selectionStart).match(/@([A-Za-z‘’ʻ']*)$/); return m?m[1]:null; }",
"function showML(){ const q=mq(); if(q===null){ if(popMode===\"ml\") closePop(); return; } mlItems=IDS.filter(i=>TEAM[i].name.toLowerCase().startsWith(q.toLowerCase())); if(!mlItems.length){ closePop(); return; } mlI=Math.min(mlI,mlItems.length-1);",
"  popMode=\"ml\"; pop.innerHTML=mlItems.map((i,k)=>'<button type=\"button\" data-n=\"'+TEAM[i].name+'\" class=\"'+(k===mlI?\"on\":\"\")+'\">'+avHTML(i)+'<span><b>'+TEAM[i].name+'</b><br><small>'+TEAM[i].role+'</small></span></button>').join(\"\"); pop.hidden=false; }",
"function insertM(n){ const pos=inp.selectionStart,v=inp.value; const id=byName[n.toLowerCase()];",
"  if(id&&id!==\"rustam\"&&/^\\s*@[A-Za-z‘’ʻ']*$/.test(v.slice(0,pos))){ inp.value=v.slice(pos).trimStart(); setTo(id); }",
"  else { const b=v.slice(0,pos).replace(/@([A-Za-z‘’ʻ']*)$/,\"@\"+n+\" \"); inp.value=b+v.slice(pos); inp.setSelectionRange(b.length,b.length); }",
"  inp.focus(); closePop(); grow(); }",
"inp.addEventListener(\"input\",()=>{grow();mlI=0;showML();});",
"inp.addEventListener(\"keydown\",e=>{",
"  if(popMode===\"ml\"&&!pop.hidden){ if(e.key===\"ArrowDown\"){e.preventDefault();mlI=(mlI+1)%mlItems.length;showML();return;} if(e.key===\"ArrowUp\"){e.preventDefault();mlI=(mlI-1+mlItems.length)%mlItems.length;showML();return;} if(e.key===\"Enter\"||e.key===\"Tab\"){e.preventDefault();insertM(TEAM[mlItems[mlI]].name);return;} }",
"  if(e.key===\"Escape\"){ closePop(); return; }",
"  if(e.key===\"Backspace\"&&!inp.value&&S_TO){ setTo(null); return; }",
"  if(e.key===\"Enter\"&&!e.shiftKey&&window.matchMedia(\"(pointer:fine)\").matches){ e.preventDefault(); $(\"f\").requestSubmit(); }",
"});",
"document.addEventListener(\"click\",e=>{ if(!pop.hidden&&!e.target.closest(\".pop,#tplBtn,#inp\")) closePop(); });",
"$(\"f\").addEventListener(\"submit\",e=>{e.preventDefault();const v=inp.value;if(!v.trim()){inp.focus();return;}inp.value=\"\";grow();closePop();send(v);});",
"",
"/* =========================================================",
"   Vazifalar, jamoa, reyting",
"   ========================================================= */",
"let filt=\"all\";",
"function renderTasks(){",
"  if(!S) return;",
"  let list=S.tasks.slice().sort((a,b)=>(isActive(b)-isActive(a))||b.id-a.id);",
"  if(filt===\"run\") list=list.filter(t=>isActive(t)); if(filt===\"done\") list=list.filter(t=>t.status===\"done\"); if(filt===\"error\") list=list.filter(t=>t.status===\"error\");",
"  const n=S.tasks.filter(t=>isActive(t)).length; $(\"tcount\").textContent=n; $(\"tcount\").hidden=!n;",
"  $(\"tlist\").innerHTML=list.length?list.map(t=>{const cls=t.status===\"done\"?\"done\":t.status===\"error\"?\"error\":(localRun.has(t.id)||t.status===\"run\")?\"run\":\"new\";",
"    const lab={done:\"Tayyor\",error:\"Xato\",run:progress(t)+\"%\",new:\"Navbatda\"}[cls];",
"    return '<div class=\"task\">'+avHTML(t.who)+'<div class=\"tt\">'+esc(t.title)+'<small>'+TEAM[t.who].name+' · '+TEAM[t.who].role+(t.done?' · '+hhmm(t.done):'')+'</small></div><span class=\"st '+cls+'\"'+(cls===\"run\"?' data-tl=\"'+t.id+'\"':'')+'>'+lab+'</span>'",
"      +(cls===\"done\"?'<div class=\"sum\">'+esc(t.summary||\"\")+'</div><div class=\"acts\"><button class=\"btn ok\" data-open=\"'+t.id+'\">Natijani ochish</button>'+(t.published?'<span class=\"pubd\">📢 kanalda</span>':\"\")+(t.rated?'<span class=\"st '+(t.rated>0?\"done\":\"error\")+'\" style=\"align-self:center\">'+(t.rated>0?\"👍 baholandi\":\"👎 baholandi\")+'</span>':\"\")+'</div>'",
"       :cls===\"error\"?'<div class=\"sum\">'+esc(t.error||\"\")+'</div><div class=\"acts\"><button class=\"btn pri\" data-retry=\"'+t.id+'\">Qayta urinish</button></div>'",
"       :'<div class=\"bar\" style=\"grid-column:1/-1\"><i data-tp=\"'+t.id+'\" style=\"width:'+progress(t)+'%\"></i></div>')+'</div>';}).join(\"\")",
"    :'<div class=\"empty\">'+(filt===\"all\"?\"Hali vazifa yo‘q. Chatga ish yozing, Rustam taqsimlaydi.\":\"Bu bo‘limda hozircha hech narsa yo‘q.\")+'</div>';",
"}",
"function agentState(a){",
"  if(a.id===\"rustam\"&&thinking) return [\"think\",\"O‘ylayapti\"];",
"  if(a.working){ const t=S&&S.tasks.find(x=>x.who===a.id&&isActive(x)); return [\"work\",t?progress(t)+\"% · «\"+t.title+\"»\":\"Ishlayapti\"]; }",
"  if(a.session){ const g=GAMES[a.session.game]; return [\"play\",(a.session.state===\"play\"?g.ico+\" \"+g.name+\" o‘ynayapti\":\"O‘yinga ketyapti\")]; }",
"  if(a.walking) return [\"walk\",\"Yo‘lda\"];",
"  if(S&&S.tasks.some(x=>x.who===a.id&&x.status===\"error\")) return [\"err\",\"Xato, qayta urinish kerak\"];",
"  if(a.spot&&/^(cafe|coffee)/.test(a.spot.name)) return [\"idle\",\"Tanaffusda ☕\"];",
"  if(a.spot&&/^obs/.test(a.spot.name)) return [\"idle\",\"Qora tuynukni tomosha qilyapti\"];",
"  return [\"idle\",a.id===\"rustam\"?\"Kabinetida\":\"Bo‘sh\"];",
"}",
"function renderTeam(){",
"  if(!S) return;",
"  const done={}; S.tasks.forEach(t=>{if(t.status===\"done\")done[t.who]=(done[t.who]||0)+1;});",
"  $(\"team\").innerHTML=IDS.map(id=>{const a=AV[id],[k,txt]=agentState(a);",
"    return '<div class=\"mate'+(sel===a?\" sel\":\"\")+'\"><div class=\"hd\">'+avHTML(id)+'<div><b>'+TEAM[id].name+'</b><span>'+TEAM[id].role+'</span></div></div><div class=\"stt '+k+'\" data-st=\"'+id+'\"><i></i><span>'+esc(txt)+'</span></div><div class=\"ft\"><span><b>'+(S.scores[id]||50)+'</b> ball</span><span><b>'+(done[id]||0)+'</b> ish</span></div><div class=\"acts\"><button data-look=\"'+id+'\">👁 Ko‘rish</button>'+(id!==\"rustam\"?'<button data-give=\"'+id+'\">✍️ Vazifa</button>':'<button data-give=\"\">✍️ Yozish</button>')+'</div></div>';}).join(\"\");",
"}",
"let gTab=\"all\";",
"function totals(){",
"  const out={}; IDS.forEach(i=>out[i]={pts:1000,w:0,n:0});",
"  if(G&&G.r) for(const g of Object.keys(GAMES)){ const R=(G.r[g]||{}); for(const i of IDS){ if(R[i]!=null) out[i].pts+=R[i]-1000; out[i].w+=((G.w||{})[g]||{})[i]||0; out[i].n+=((G.n||{})[g]||{})[i]||0; } }",
"  return out;",
"}",
"function rankList(g){",
"  if(g===\"all\"){ const T=totals(); return IDS.map(i=>({id:i,r:T[i].pts,w:T[i].w,n:T[i].n})).sort((a,b)=>b.r-a.r||b.w-a.w); }",
"  const R=(G&&G.r&&G.r[g])||{}, W=(G&&G.w&&G.w[g])||{}, N=(G&&G.n&&G.n[g])||{};",
"  return IDS.map(i=>({id:i,r:R[i]||1000,w:W[i]||0,n:N[i]||0})).sort((a,b)=>b.r-a.r||b.w-a.w);",
"}",
"function renderLive(){",
"  const lv=Object.values(SESS).filter(s=>s.state===\"play\"||s.state===\"gather\");",
"  $(\"live\").innerHTML=lv.length?lv.map(s=>{const g=GAMES[s.game]; const names=s.players.map(p=>p.p.name);",
"    const vs=s.game===\"cs2\"?names.filter((_,i)=>i%2===0).join(\", \")+\" <b>vs</b> \"+names.filter((_,i)=>i%2===1).join(\", \"):names.join(\" <b>vs</b> \");",
"    return '<div class=\"lv\">'+g.ico+' <span>'+(s.state===\"play\"?\"Hozir: \":\"Yig‘ilyapti: \")+vs+'</span></div>';}).join(\"\"):'<div class=\"lv\" style=\"background:none;border-style:dashed;color:var(--muted)\">Hozir hech kim o‘ynamayapti. Xodimlar bo‘sh qolsa, o‘yin kemasiga borishadi.</div>';",
"}",
"function renderRank(){",
"  renderLive();",
"  const list=rankList(gTab);",
"  $(\"board\").innerHTML=list.map((x,i)=>'<button class=\"rk\" data-look=\"'+x.id+'\"><span class=\"n\">'+(i+1)+'</span>'+avHTML(x.id)+'<span class=\"nm\"><b>'+TEAM[x.id].name+'</b><small>'+x.w+' g‘alaba · '+x.n+' o‘yin</small></span><span class=\"sc\">'+x.r+'<small>reyting</small></span></button>').join(\"\");",
"  const last=(G&&G.last||[]).filter(m=>gTab===\"all\"||m.game===gTab).slice(0,8);",
"  $(\"ghist\").innerHTML=last.length?'<h6>So‘nggi o‘yinlar</h6>'+last.map(m=>{const n=xs=>xs.map(i=>TEAM[i]?TEAM[i].name:i).join(\", \"); const g=GAMES[m.game]||{ico:\"\"};",
"    return '<div>'+g.ico+' '+(m.win===\"draw\"?n(m.a)+\" va \"+n(m.b)+\" — durang\":\"<b>\"+n(m.win===\"a\"?m.a:m.b)+\"</b> yutdi · \"+n(m.win===\"a\"?m.b:m.a))+' <span style=\"float:right;font-family:var(--fm);font-size:11px\">'+hhmm(m.t)+'</span></div>';}).join(\"\"):\"\";",
"}",
"$(\"gseg\").addEventListener(\"click\",e=>{const b=e.target.closest(\"[data-g]\"); if(!b) return; gTab=b.dataset.g; $(\"gseg\").querySelectorAll(\"button\").forEach(x=>x.setAttribute(\"aria-pressed\",String(x===b))); renderRank();});",
"$(\"tseg\").addEventListener(\"click\",e=>{const b=e.target.closest(\"[data-f]\"); if(!b) return; filt=b.dataset.f; $(\"tseg\").querySelectorAll(\"button\").forEach(x=>x.setAttribute(\"aria-pressed\",String(x===b))); renderTasks();});",
"function drawBoard(){",
"  const g=boardC.getContext(\"2d\"),W2=512,H2=300; g.fillStyle=\"#0d1530\";g.fillRect(0,0,W2,H2);",
"  const done=S?S.tasks.filter(t=>t.status===\"done\").length:0, run=S?S.tasks.filter(isActive).length:0;",
"  const top=S?STAFF.slice().sort((a,b)=>(S.scores[b]||0)-(S.scores[a]||0))[0]:\"rustam\";",
"  g.fillStyle=\"#ffb547\";g.font=\"600 24px Unbounded, sans-serif\";g.fillText(\"OFIS PANELI\",28,48);",
"  g.fillStyle=\"#8994b0\";g.font=\"600 20px Manrope, sans-serif\";g.fillText(\"Tayyor\",28,104);g.fillText(\"Jarayonda\",210,104);",
"  g.fillStyle=\"#3fd8a6\";g.font=\"700 64px JetBrains Mono, monospace\";g.fillText(String(done),28,172);g.fillStyle=\"#ffb547\";g.fillText(String(run),210,172);",
"  g.fillStyle=\"#8994b0\";g.font=\"600 20px Manrope, sans-serif\";g.fillText(\"Eng faol: \"+TEAM[top].name+\" · \"+(S?S.scores[top]:0)+\" ball\",28,236);",
"  g.fillStyle=\"#1c2742\";g.fillRect(28,256,456,10);g.fillStyle=\"#3fd8a6\";g.fillRect(28,256,456*(done/Math.max(1,done+run)),10);",
"  boardT.needsUpdate=true;",
"}",
"function drawRankBoard(){",
"  const g=rankC.getContext(\"2d\"),W2=640,H2=360; const gr=g.createLinearGradient(0,0,0,H2); gr.addColorStop(0,\"#1a1446\"); gr.addColorStop(1,\"#0b0e24\"); g.fillStyle=gr; g.fillRect(0,0,W2,H2);",
"  g.fillStyle=\"#d7c8ff\"; g.font=\"700 30px Unbounded, sans-serif\"; g.fillText(\"🏆 REYTING\",28,52);",
"  g.fillStyle=\"#8994b0\"; g.font=\"600 18px Manrope\"; g.fillText(\"Shaxmat · Tennis · PS5 · CS2\",300,50);",
"  rankList(\"all\").slice(0,6).forEach((x,i)=>{ const y=96+i*44; g.fillStyle=i===0?\"#ffd24a\":i===1?\"#cfd8ea\":i===2?\"#e2a06a\":\"#7c82b8\"; g.font=\"700 26px JetBrains Mono\"; g.fillText(String(i+1),32,y+8);",
"    g.fillStyle=TEAM[x.id].col; g.beginPath(); g.arc(88,y,15,0,7); g.fill(); g.fillStyle=\"#fff\"; g.font=\"700 24px Manrope\"; g.fillText(TEAM[x.id].name,116,y+9);",
"    g.fillStyle=\"#ffb547\"; g.font=\"700 26px JetBrains Mono\"; g.fillText(String(x.r),470,y+9); g.fillStyle=\"#8994b0\"; g.font=\"600 16px Manrope\"; g.fillText(x.w+\" g‘alaba\",546,y+8); });",
"  rankT.needsUpdate=true;",
"}",
"",
"/* =========================================================",
"   Natija oynasi",
"   ========================================================= */",
"function md(src){",
"  return String(src||\"\").split(\"```\").map((p,i)=>{",
"    if(i%2) return \"<pre><code>\"+esc(p.replace(/^[\\w+-]*\\n/,\"\"))+\"</code></pre>\";",
"    return esc(p).replace(/\\*\\*(.+?)\\*\\*/g,\"<b>$1</b>\").replace(/`([^`\\n]+)`/g,'<code style=\"font-family:var(--fm);background:#0b1124;padding:1px 5px;border-radius:5px\">$1</code>').replace(/^#{1,4}\\s*(.+)$/gm,'<b class=\"h\">$1</b>').split(/\\n{2,}/).filter(b=>b.trim()).map(b=>\"<p>\"+b.trim().replace(/\\n/g,\"<br>\")+\"</p>\").join(\"\");",
"  }).join(\"\");",
"}",
"let openId=null;",
"function openResult(id){",
"  const t=taskById(id); if(!t) return;",
"  if(t.status!==\"done\"){ const a=AV[t.who]; select(a,true); toast(t.status===\"error\"?\"Xato: \"+(t.error||\"\"):TEAM[t.who].name+\" ishlayapti: \"+progress(t)+\"%\"); return; }",
"  openId=id; const p=TEAM[t.who];",
"  $(\"mAv\").textContent=p.name[0]; $(\"mAv\").style.background=p.col;",
"  $(\"mTitle\").textContent=t.title; $(\"mWho\").textContent=p.name+\" · \"+p.role+(t.done?\" · \"+hhmm(t.done):\"\");",
"  $(\"mBody\").innerHTML='<div class=\"sumq\">'+esc(t.summary||\"\")+\"</div>\"+md(t.result);",
"  $(\"mUp\").disabled=$(\"mDown\").disabled=!!t.rated;",
"  $(\"pubBox\").hidden=true; $(\"mBody\").hidden=false;",
"  $(\"mPub\").hidden=!CHANNEL; $(\"mPub\").textContent=t.published?\"✓ Kanalda\":\"📢 Kanalga\"; $(\"mPub\").disabled=!!t.published;",
"  $(\"modal\").hidden=false; $(\"mBody\").scrollTop=0;",
"  if(TG&&TG.BackButton){ try{TG.BackButton.show();}catch(e){} }",
"}",
"function closeModal(){ $(\"modal\").hidden=true; openId=null; if(TG&&TG.BackButton){ try{TG.BackButton.hide();}catch(e){} } }",
"$(\"mClose\").onclick=closeModal; $(\"modal\").addEventListener(\"click\",e=>{if(e.target.id===\"modal\")closeModal();});",
"if(TG&&TG.BackButton) try{TG.BackButton.onClick(closeModal);}catch(e){}",
"$(\"mCopy\").onclick=async()=>{const t=taskById(openId);if(!t)return;const txt=t.title+\"\\n\\n\"+(t.summary||\"\")+\"\\n\\n\"+(t.result||\"\");",
"  try{await navigator.clipboard.writeText(txt);toast(\"Nusxa olindi\");}catch(e){const ta=document.createElement(\"textarea\");ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand(\"copy\");toast(\"Nusxa olindi\");}catch(_){toast(\"Nusxa olib bo‘lmadi\");}ta.remove();}};",
"async function rate(v){ const t=taskById(openId); if(!t||t.rated) return; $(\"mUp\").disabled=$(\"mDown\").disabled=true;",
"  try{ const r=await call(\"/api/rate\",{id:t.id,v}); applyState(r.state); toast(v>0?TEAM[t.who].name+\"ga +2 ball\":\"−2 ball. Qayta ishlashga yuborildi\");",
"    if(v<0){ closeModal(); S_TO=null; send(\"@\"+TEAM[t.who].name+\" «\"+t.title+\"» natijasi yoqmadi, qaytadan yaxshiroq qil.\"); } }catch(e){toast(e.message);} }",
"$(\"mPub\").onclick=async()=>{ const t=taskById(openId); if(!t) return;",
"  if($(\"pubBox\").hidden){ $(\"pubText\").value=(t.result||\"\").replace(/\\*\\*(.+?)\\*\\*/g,\"$1\").replace(/^#{1,4}\\s*/gm,\"\"); $(\"pubBox\").hidden=false; $(\"mBody\").hidden=true; $(\"mPub\").textContent=\"Joylash: \"+CHANNEL; $(\"pubText\").focus(); return; }",
"  $(\"mPub\").disabled=true; $(\"mPub\").textContent=\"Joylanmoqda…\";",
"  try{ const r=await call(\"/api/publish\",{id:t.id,text:$(\"pubText\").value}); applyState(r.state); haptic(\"n\",\"success\"); toast(\"Kanalga joylandi\"); closeModal(); }",
"  catch(e){ toast(e.message); $(\"mPub\").disabled=false; $(\"mPub\").textContent=\"Joylash: \"+CHANNEL; } };",
"$(\"mUp\").onclick=()=>rate(1); $(\"mDown\").onclick=()=>rate(-1);",
"",
"/* =========================================================",
"   Panel: tablar va tortiladigan varaq",
"   ========================================================= */",
"let toastT=null;",
"function toast(t){ const el=$(\"toast\"); el.textContent=t; el.hidden=false; el.style.opacity=1; clearTimeout(toastT); toastT=setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.hidden=true,300);},2600); }",
"let curTab=\"chat\";",
"document.querySelectorAll(\".tab\").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));",
"function setTab(t){ curTab=t; document.querySelectorAll(\".tab\").forEach(b=>b.setAttribute(\"aria-selected\",String(b.dataset.tab===t))); [\"chat\",\"tasks\",\"team\",\"rank\"].forEach(k=>$(\"v-\"+k).hidden=k!==t); if(t===\"chat\") scrollChat(true); if(t===\"rank\") renderRank(); if(sheetH()<140&&!DESKTOP()) setSheet(SNAP[1]); }",
"document.addEventListener(\"click\",e=>{",
"  const o=e.target.closest(\"[data-open]\"); if(o){ openResult(+o.dataset.open); return; }",
"  const r=e.target.closest(\"[data-retry]\"); if(r){ call(\"/api/retry\",{id:+r.dataset.retry}).then(x=>applyState(x.state)).catch(er=>toast(er.message)); return; }",
"  const lk=e.target.closest(\"[data-look]\"); if(lk){ select(AV[lk.dataset.look],true); return; }",
"  const gv=e.target.closest(\"[data-give]\"); if(gv){ setTo(gv.dataset.give,true); return; }",
"  const tg=e.target.closest(\".tag[data-agent]\"); if(tg){ select(AV[tg.dataset.agent],true); return; }",
"});",
"let armed=false;",
"$(\"resetBtn\").onclick=async()=>{ const b=$(\"resetBtn\"); if(!armed){armed=true;b.textContent=\"Rostdanmi? Hamma vazifa o‘chadi — yana bosing\";b.style.borderColor=\"var(--red)\";setTimeout(()=>{armed=false;b.textContent=\"Ofisni tozalash\";b.style.borderColor=\"\";},3500);return;}",
"  armed=false; b.textContent=\"Ofisni tozalash\"; b.style.borderColor=\"\";",
"  try{ const r=await call(\"/api/reset\",{}); lastMsg=0; S=null; applyState(r.state,true); toast(\"Ofis tozalandi\"); }catch(e){toast(e.message);} };",
"const DESKTOP=()=>window.innerWidth>=900;",
"const sheet=$(\"sheet\"), app=document.querySelector(\".app\");",
"const SNAP=[96,.54,.88];",
"function vh(){ return app.clientHeight||window.innerHeight; }",
"function sheetH(){ return sheet.getBoundingClientRect().height; }",
"function setSheet(v){ const px=v<=1?v*vh():v; sheet.style.setProperty(\"--sheet\",\"\"); document.documentElement.style.setProperty(\"--sheet\",Math.round(px)+\"px\"); setTimeout(resize,280); }",
"let drag=null;",
"$(\"grab\").addEventListener(\"pointerdown\",e=>{ drag={y:e.clientY,h:sheetH(),moved:false}; sheet.classList.add(\"drag\"); $(\"grab\").setPointerCapture(e.pointerId); });",
"$(\"grab\").addEventListener(\"pointermove\",e=>{ if(!drag) return; const dy=drag.y-e.clientY; if(Math.abs(dy)>4) drag.moved=true; const h=Math.max(90,Math.min(vh()*.92,drag.h+dy)); document.documentElement.style.setProperty(\"--sheet\",h+\"px\"); resize(); });",
"$(\"grab\").addEventListener(\"pointerup\",e=>{ if(!drag) return; sheet.classList.remove(\"drag\"); const h=sheetH();",
"  if(!drag.moved){ const cur=SNAP.map(s=>s<=1?s*vh():s); let i=cur.findIndex(c=>Math.abs(c-h)<30); setSheet(SNAP[(i+1)%SNAP.length]); }",
"  else { const cur=SNAP.map(s=>s<=1?s*vh():s); let best=0; cur.forEach((c,i)=>{ if(Math.abs(c-h)<Math.abs(cur[best]-h)) best=i; }); setSheet(SNAP[best]); }",
"  drag=null; });",
"let fullOn=false;",
"function toggleFull(){ fullOn=!fullOn; $(\"fullBtn\").setAttribute(\"aria-pressed\",String(fullOn)); if(DESKTOP()){ sheet.hidden=fullOn; resize(); } else setSheet(fullOn?SNAP[0]:SNAP[1]); }",
"",
"/* =========================================================",
"   Kamera: tayyor ko'rinishlar, erkin yurish (WASD), kuzatish",
"   ========================================================= */",
"const VIEWS={",
"  office:()=>DESKTOP()?{p:[20,30,36],t:[-2,0,2]}:{p:[10,34,34],t:[-1,0,1]},",
"  games:()=>DESKTOP()?{p:[GX+16,18,22],t:[GX+1,0,0]}:{p:[GX+10,26,26],t:[GX,0,0]},",
"  hole:()=>DESKTOP()?{p:[18,26,58],t:[-120,6,-26]}:{p:[30,34,80],t:[-110,6,-26]},",
"  intro:()=>DESKTOP()?{p:[74,30,30],t:[-30,0,-6]}:{p:[62,34,52],t:[-28,0,-6]}",
"};",
"let fly=null;",
"function flyTo(p,t,ms=1400){ fly={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),s:performance.now(),d:ms}; }",
"document.querySelector(\".cams\").addEventListener(\"click\",e=>{ const b=e.target.closest(\"[data-cam]\"); if(!b) return; const k=b.dataset.cam;",
"  if(k===\"full\"){ toggleFull(); return; }",
"  document.querySelectorAll(\".cams [data-cam]:not(#fullBtn)\").forEach(x=>x.setAttribute(\"aria-pressed\",String(x===b)));",
"  const v=VIEWS[k](); flyTo(v.p,v.t); select(null); });",
"const KEYS=new Set();",
"const typing=()=>{ const a=document.activeElement; return a&&(a.tagName===\"TEXTAREA\"||a.tagName===\"INPUT\"); };",
"addEventListener(\"keydown\",e=>{ if(typing()||e.metaKey||e.ctrlKey) return; const k=e.key.toLowerCase(); if(k===\"shift\"){ KEYS.add(\"shift\"); return; } if(\"wasdqezxrf\".includes(k)&&k.length===1||k.startsWith(\"arrow\")){ KEYS.add(k); if(k.startsWith(\"arrow\")) e.preventDefault(); fly=null; } if(k===\"escape\") select(null); });",
"addEventListener(\"keyup\",e=>KEYS.delete(e.key.toLowerCase()));",
"addEventListener(\"blur\",()=>KEYS.clear());",
"const fwd=new THREE.Vector3(), rgt=new THREE.Vector3(), mv=new THREE.Vector3(), UP=new THREE.Vector3(0,1,0);",
"function keyMove(dt){",
"  if(!KEYS.size) return;",
"  const dist=camera.position.distanceTo(controls.target), sp=Math.max(10,dist*.9)*dt*(KEYS.has(\"shift\")?2:1);",
"  camera.getWorldDirection(fwd); fwd.y=0; fwd.normalize(); rgt.crossVectors(fwd,UP).normalize(); mv.set(0,0,0);",
"  if(KEYS.has(\"w\")||KEYS.has(\"arrowup\")) mv.add(fwd); if(KEYS.has(\"s\")||KEYS.has(\"arrowdown\")) mv.sub(fwd);",
"  if(KEYS.has(\"d\")||KEYS.has(\"arrowright\")) mv.add(rgt); if(KEYS.has(\"a\")||KEYS.has(\"arrowleft\")) mv.sub(rgt);",
"  if(KEYS.has(\"r\")) mv.y+=1; if(KEYS.has(\"f\")) mv.y-=1;",
"  if(mv.lengthSq()){ mv.normalize().multiplyScalar(sp); camera.position.add(mv); controls.target.add(mv); follow=null; }",
"  if(KEYS.has(\"q\")||KEYS.has(\"e\")){ const a=(KEYS.has(\"q\")?1:-1)*dt*1.4; const off=camera.position.clone().sub(controls.target); off.applyAxisAngle(UP,a); camera.position.copy(controls.target).add(off); }",
"  if(KEYS.has(\"z\")||KEYS.has(\"x\")){ const off=camera.position.clone().sub(controls.target); off.multiplyScalar(KEYS.has(\"z\")?1-dt*1.2:1+dt*1.2); const L=off.length(); if(L>controls.minDistance&&L<controls.maxDistance) camera.position.copy(controls.target).add(off); }",
"}",
"function clampTarget(){ const t=controls.target; t.x=Math.max(-330,Math.min(130,t.x)); t.z=Math.max(-150,Math.min(150,t.z)); t.y=Math.max(-40,Math.min(80,t.y)); }",
"// tanlash va kuzatish",
"let sel=null, follow=null;",
"function select(a,flyClose){ if(sel) sel.tag.classList.remove(\"sel\"); sel=a; ring.visible=!!a; follow=a||null;",
"  if(a){ a.tag.classList.add(\"sel\"); if(flyClose){ const p=a.g.position, off=camera.position.clone().sub(controls.target); off.setLength(Math.min(off.length(),22)); if(off.y<8) off.y=8; flyTo([p.x+off.x,p.y+off.y,p.z+off.z],[p.x,1.5,p.z],900); }",
"    const [,txt]=agentState(a); toast(a.p.name+\" · \"+txt); }",
"  renderTeam(); }",
"const ray=new THREE.Raycaster(),ptr=new THREE.Vector2(); let down=null;",
"canvas.addEventListener(\"pointerdown\",e=>{down=[e.clientX,e.clientY];});",
"canvas.addEventListener(\"pointerup\",e=>{ if(!down)return; const m=Math.hypot(e.clientX-down[0],e.clientY-down[1]); down=null; if(m>6)return;",
"  const r=canvas.getBoundingClientRect(); ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ptr,camera);",
"  const h=ray.intersectObjects(hitMeshes,false)[0]; const a=h&&h.object.userData.agent; select(a||null,false); });",
"canvas.addEventListener(\"dblclick\",e=>{ const r=canvas.getBoundingClientRect(); ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ptr,camera);",
"  const pl=new THREE.Plane(UP,0), hit=new THREE.Vector3(); if(ray.ray.intersectPlane(pl,hit)){ const off=camera.position.clone().sub(controls.target).multiplyScalar(.6); flyTo([hit.x+off.x,hit.y+off.y,hit.z+off.z],[hit.x,0,hit.z],800); } });",
"controls.addEventListener(\"start\",()=>{ fly=null; });",
"",
"/* =========================================================",
"   O'lcham va sikl",
"   ========================================================= */",
"let W=1,H=1;",
"function resize(){ W=stage.clientWidth;H=stage.clientHeight;if(!W||!H)return; renderer.setSize(W,H,false); camera.aspect=W/H; camera.fov=W/H<1?55:42; camera.updateProjectionMatrix(); }",
"new ResizeObserver(resize).observe(stage); resize();",
"function tick(){",
"  for(const id of IDS){ const a=AV[id]; const has=S&&S.tasks.some(t=>t.who===id&&(localRun.has(t.id)||t.status===\"run\"));",
"    a.working=!!has&&!a.busy&&a.spot===a.home; const d=DESK[id]; if(d&&d.scr) d.scr.material=(a.working||(id===\"rustam\"&&thinking))?scrWork:scrIdle; }",
"  if(!S) return;",
"  const run=S.tasks.filter(isActive).length, play=Object.values(SESS).filter(s=>s.state===\"play\").reduce((n,s)=>n+s.players.length,0);",
"  $(\"act\").innerHTML=(run?'<span><b>'+run+'</b> ish jarayonda</span>':'<span>Hamma bo‘sh</span>')+(play?'<span>🎮 <b>'+play+'</b> kishi o‘yinda</span>':'');",
"  for(const t of S.tasks){ const p=progress(t);",
"    document.querySelectorAll('[data-tp=\"'+t.id+'\"]').forEach(el=>{el.style.width=p+\"%\"; if(t.status===\"done\") el.parentNode.classList.add(\"ok\");});",
"    document.querySelectorAll('[data-tl=\"'+t.id+'\"]').forEach(el=>{el.textContent=t.status===\"error\"?\"!\":p+\"%\"; el.classList.toggle(\"ok\",t.status===\"done\");});",
"    document.querySelectorAll('[data-ts=\"'+t.id+'\"]').forEach(el=>el.textContent=stText(t)); }",
"  IDS.forEach(id=>{const el=document.querySelector('[data-st=\"'+id+'\"]'); if(el){const [k,txt]=agentState(AV[id]); el.className=\"stt \"+k; el.lastChild.textContent=txt;}});",
"  if(curTab===\"rank\") renderLive();",
"}",
"setInterval(tick,600);",
"const v3=new THREE.Vector3(); let last=performance.now(), checkT=20;",
"const reduce=window.matchMedia&&matchMedia(\"(prefers-reduced-motion: reduce)\").matches;",
"function loop(now){",
"  requestAnimationFrame(loop);",
"  const dt=Math.min(.05,(now-last)/1000); last=now;",
"  for(const id of IDS) AV[id].update(dt);",
"  try{ director(dt,now); sessionTick(now); }catch(e){ if(qs.has(\"shot\")) console.error(\"dir\",e&&e.stack); }",
"  checkT-=dt;",
"  if(checkT<=0){ checkT=rand(24,36); const R=AV.rustam; const w=STAFF.filter(id=>AV[id].working);",
"    if(S&&w.length&&!R.busy&&!thinking&&R.spot===SP.boss&&!R.session){ const id=pick(w), t=S.tasks.find(x=>x.who===id&&isActive(x));",
"      R.act([{go:()=>DESK[id].visit},{fn:()=>{R.say(pick([\"Qalay ketyapti?\",\"Yordam kerakmi?\",\"Dedlayn esingdami?\"]));setTimeout(()=>AV[id].say(t?progress(t)+\"% bo‘ldi, ozgina qoldi\":\"Ishlayapman!\",2400),900);}},{wait:2.4}]); } }",
"  codeTex.offset.y=(codeTex.offset.y+dt*.12)%1;",
"  for(const id of STAFF){ const pl=DESK[id].pl&&DESK[id].pl.material; if(pl) pl.opacity+=((AV[id].working?.55:0)-pl.opacity)*Math.min(1,dt*3); }",
"  if(SPACE.globe){ SPACE.globe.rotation.y+=dt*.35; SPACE.wire.rotation.y-=dt*.2; } if(SPACE.bossGlobe) SPACE.bossGlobe.rotation.y+=dt*.3;",
"  SPACE.tick(dt,reduce?0:now);",
"  // kamera",
"  if(fly){ const k=Math.min(1,(now-fly.s)/fly.d), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; camera.position.lerpVectors(fly.p0,fly.p1,e); controls.target.lerpVectors(fly.t0,fly.t1,e); if(k>=1) fly=null; }",
"  else if(follow){ const p=follow.g.position; v3.set(p.x,1.5,p.z).sub(controls.target).multiplyScalar(Math.min(1,dt*3)); controls.target.add(v3); camera.position.add(v3); }",
"  keyMove(dt); clampTarget();",
"  if(sel) ring.position.set(sel.g.position.x,.1,sel.g.position.z);",
"  controls.update(); renderer.render(scene,camera);",
"  // yorliqlar",
"  for(const id of IDS){ const a=AV[id];",
"    v3.copy(a.g.position); v3.y+=(a.sitting?2.35:2.95)*AG_SCALE/1.3; v3.project(camera);",
"    const x=(v3.x+1)/2*W, y=(1-v3.y)/2*H, inView=v3.z<1&&x>-60&&x<W+60&&y>-30&&y<H+30;",
"    const dist=camera.position.distanceTo(a.g.position);",
"    const [k]=agentState(a); const show=inView&&dist<160&&(k!==\"idle\"||sel===a||id===\"rustam\"||dist<60);",
"    a.tag.style.display=show?\"\":\"none\";",
"    if(show){ a.tag.style.transform=\"translate(\"+x.toFixed(1)+\"px,\"+y.toFixed(1)+\"px) translate(-50%,-100%)\";",
"      const t=k===\"work\"&&S&&S.tasks.find(q=>q.who===id&&isActive(q)); const key=k+\"|\"+(t?progress(t):\"\")+\"|\"+(sel===a);",
"      if(key!==a.tagKey){ a.tagKey=key; a.tag.className=\"tag \"+k+(sel===a?\" sel\":\"\"); a.tag.innerHTML=\"<i></i>\"+a.p.name+(t?\"<em>\"+progress(t)+\"%</em>\":k===\"play\"?\"<em>\"+GAMES[a.session.game].ico+\"</em>\":\"\"); } }",
"    if(!a.bub.hidden){ a.bub.style.display=inView&&dist<160?\"\":\"none\"; a.bub.style.transform=\"translate(\"+x.toFixed(1)+\"px,\"+(y-30).toFixed(1)+\"px) translate(-18%,-100%)\"; }",
"  }",
"}",
"",
"/* =========================================================",
"   Ishga tushirish",
"   ========================================================= */",
"async function boot(){",
"  $(\"led\").className=\"led\"+(DEMO?\" demo\":\"\");",
"  if(DEMO) $(\"demoBanner\").hidden=false;",
"  renderWho();",
"  const mg=mergeStatic(); if(qs.has(\"shot\")) console.log(\"merge\",mg.join(\" -> \"));",
"  const iv=VIEWS.intro(); camera.position.set(...iv.p); controls.target.set(...iv.t); controls.update();",
"  setTimeout(()=>{ const v=VIEWS.office(); flyTo(v.p,v.t,2600); },1600);",
"  if(!DESKTOP()) setSheet(SNAP[1]);",
"  try{",
"    const r=await call(\"/api/state\");",
"    aiMode=r.ai; CHANNEL=r.channel||\"\"; $(\"aiName\").textContent={gemini:\"Gemini AI\",cloudflare:\"Cloudflare AI\",demo:\"demo rejim\",none:\"AI ulanmagan\"}[r.ai]||r.ai;",
"    if(r.ai===\"none\") $(\"led\").className=\"led off\";",
"    applyState(r.state,true);",
"    const h=location.hash.match(/t=(\\d+)/); if(h) setTimeout(()=>openResult(+h[1]),600);",
"    if(!DEMO) setInterval(async()=>{ if(thinking||document.hidden) return; try{ const r2=await call(\"/api/state\"); applyState(r2.state);}catch(e){} },15000);",
"  }catch(e){",
"    $(\"aiName\").textContent=\"ulanmadi\"; $(\"led\").className=\"led off\";",
"    $(\"msgs\").innerHTML='<div class=\"empty\">'+esc(e.message)+'<br><br>Ofisni botdagi «Ofis» tugmasi orqali oching.</div>';",
"  }",
"  if(qs.has(\"shot\")){ IDS.forEach(i=>AV[i].idleSince=-1e9); dirT=.3; window.__dbg={AV,SESS,SP,camera,controls}; }",
"  requestAnimationFrame(loop);",
"}",
"boot();",
"})();",
"</script>",
"</body>",
"</html>",
""
].join("\n");

const CHANNEL_ABOUT = "«Toby Land» — loyihalar oroli: har bir bino alohida loyiha. Protos AI (rasm, video va ovoz yaratuvchi bot, @bu_qandayishlaydi_bot) va Virtual Ofis (12 ta AI xodim ishlaydigan ofis, @Ofisbek_bot) haqida yangiliklar, yangi imkoniyatlar va natijalar beriladigan o'zbek tilidagi kanal";
const CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const GEMINI_MODEL = 'gemini-flash-latest';

const TEAM = {
  rustam:  { name: 'Rustam',  role: 'Boshliq', ico: '👔' },
  elyor:   { name: 'Elyor',   role: 'Backend dasturchi', ico: '🧑‍💻', guide: "Ishlaydigan kod yoz (JavaScript yoki Python). Kodni ``` ichida ber, oldidan 2-3 jumla izoh va qanday ishga tushirishni yoz." },
  doniyor: { name: 'Doniyor', role: 'Frontend dasturchi', ico: '🖥', guide: "Interfeys uchun HTML/CSS/JS kod yoz yoki sahifa tuzilmasini bloklar bo'yicha aniq ber. Kod bo'lsa ``` ichida." },
  otabek:  { name: 'Otabek',  role: 'Dizayner', ico: '🎨', guide: "Rasm chiza olmaysan, shuning uchun 3 ta aniq dizayn konsepsiyasi ber: kompozitsiya, ranglar (HEX kodlari bilan), shrift, ustidagi matn. Har biriga rasm generatori uchun inglizcha prompt yoz." },
  sanjar:  { name: 'Sanjar',  role: 'Marketolog', ico: '📈', guide: "Aniq marketing reja ber: maqsadli auditoriya, kanallar, byudjet taqsimoti, KPI va 2 haftalik qadam-baqadam reja." },
  feruza:  { name: 'Feruza',  role: 'Moliyachi', ico: '💰', guide: "Hisob-kitob qil: formulalar, raqamlar, jadval ko'rinishida, oxirida xulosa. Ma'lumot yetmasa, taxminlarni aniq yozib, shu taxmin bilan hisobla. Valyuta: so'm, kerak bo'lsa dollar ham." },
  umida:   { name: 'Umida',   role: 'HR menejer', ico: '🤝', guide: "Vakansiya matni, talablar, intervyu savollari va nomzodni baholash mezonlarini tayyorla." },
  sabina:  { name: 'Sabina',  role: 'SMM menejer', ico: '📱', guide: "Kontent reja tuz: kunlar bo'yicha postlar, har biriga tayyor matn, heshteglar va chiqarish vaqti. Instagram, Telegram, YouTube xususiyatlarini hisobga ol." },
  dilnoza: { name: 'Dilnoza', role: 'Kopirayter', ico: '✍️', guide: "Tayyor matn yoz: sarlavhalar, post matni, ssenariy (sahna va ovoz matni alohida). Kamida 2 xil variant ber." },
  shoxrux: { name: 'Shoxrux', role: 'Sifat nazorati', ico: '🔍', guide: "Berilgan ishni tekshir: xatolar ro'yxati, xavflar, aniq tuzatish tavsiyalari va 10 ballik yakuniy baho." },
  laylo:   { name: 'Laylo',   role: 'Video montajchi', ico: '🎬', guide: "Montaj rejasi ber: kadrlar ketma-ketligi soniyalar bilan, o'tishlar, musiqa kayfiyati, subtitr uslubi, eksport sozlamalari (o'lcham, fps)." },
  behruz:  { name: 'Behruz',  role: 'Sotuv menejeri', ico: '💼', guide: "Mijozga tayyor xabar yoki tijorat taklifi matnini yoz, e'tirozlarga javoblar va qo'ng'iroq skriptini ber." },
  sardor:  { name: 'Sardor',  role: 'Yordamchi (junior)', ico: '🧩', guide: "Umumiy topshiriqni bajar: ro'yxatlar, g'oyalar, tartiblash, qisqa tadqiqot rejasi." }
};
const STAFF = Object.keys(TEAM).filter(id => id !== 'rustam');

/* ---------------- Yordamchilar ---------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s || '').toLowerCase().replace(/[‘’ʻʼ`´]/g, "'");

async function tg(env, method, body){
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({ ok: false }));
}
async function sendLong(env, chat, head, body, extra = {}){
  const text = head + '\n\n' + esc(body);
  const parts = [];
  for (let i = 0; i < text.length; i += 3900) parts.push(text.slice(i, i + 3900));
  for (let i = 0; i < parts.length; i++) {
    await tg(env, 'sendMessage', { chat_id: chat, text: parts[i], parse_mode: 'HTML', disable_web_page_preview: true, ...(i === parts.length - 1 ? extra : {}) });
  }
}

// Natijaning qisqa ko'rinishi: kod bloklari <pre> ichida, uzunlik cheklangan
function tgPreview(text, max){
  let out = '', used = 0;
  const parts = String(text || '').split('```');
  for (let i = 0; i < parts.length && used < max; i++) {
    let p = parts[i];
    if (i % 2) { p = p.replace(/^[\w+-]*\n/, ''); const c = p.slice(0, Math.max(0, max - used)); out += '<pre>' + esc(c.trimEnd()) + (c.length < p.length ? '\n…' : '') + '</pre>'; used += c.length; }
    else { p = p.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,4}\s*/gm, '').trim(); if (!p) continue; const c = p.slice(0, Math.max(0, max - used)); out += (out ? '\n' : '') + esc(c) + (c.length < p.length ? '…' : ''); used += c.length; }
  }
  return out;
}

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
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
  if (!(age < 86400 * 7)) return null;
  try { return JSON.parse(p.get('user') || 'null'); } catch (e) { return null; }
}
function allowed(env, id){
  const list = [env.ADMIN_ID, ...String(env.ALLOWED_IDS || '').split(/[,\s]+/)].filter(Boolean).map(String);
  return !list.length || list.includes(String(id));
}
const ownerName = u => (u && (u.first_name || u.username)) ? (u.first_name || u.username) + ' aka' : 'Xo‘jayin';

/* ---------------- AI ---------------- */
async function ai(env, system, user, { asJson = false, maxTokens = 1800 } = {}){
  if (env.GEMINI_API_KEY) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: Math.max(4096, maxTokens * 2), ...(asJson ? { responseMimeType: 'application/json' } : {}) }
        })
      });
      const j = await r.json();
      const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
      if (text) return text;
      if (!env.AI) throw new Error('Gemini: ' + (j.error?.message || 'bo‘sh javob'));
    } catch (e) { if (!env.AI) throw e; }
  }
  if (!env.AI) throw new Error('AI ulanmagan: Workers AI (AI) binding yoki GEMINI_API_KEY qo‘shing');
  const out = await env.AI.run(env.CF_MODEL || CF_MODEL, {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: maxTokens, temperature: 0.6
  });
  const t = typeof out?.response === 'string' ? out.response : JSON.stringify(out?.response ?? '');
  return t.trim();
}
function parseJson(t){
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}

/* ---------------- Holat (KV) ---------------- */
const blank = () => ({ v: 3, nid: 1, owner: '', tasks: [], msgs: [], scores: Object.fromEntries(Object.keys(TEAM).map(id => [id, 50])), games: { r: {}, w: {}, n: {}, last: [] } });
async function load(env, uid){ const s = (await env.OFIS.get('u:' + uid, 'json')) || blank(); if (!s.games) s.games = { r: {}, w: {}, n: {}, last: [] }; return s; }

/* ---------------- Bo'sh vaqt o'yinlari: reyting (Elo) ---------------- */
const GAME_IDS = ['chess', 'tennis', 'ps5', 'cs2'];
function eloApply(G, m){
  const g = m.game; ['r', 'w', 'n'].forEach(k => { G[k][g] = G[k][g] || {}; });
  const R = G.r[g], avg = ids => ids.reduce((s, i) => s + (R[i] || 1000), 0) / ids.length;
  const ea = 1 / (1 + Math.pow(10, (avg(m.b) - avg(m.a)) / 400)), sa = m.win === 'a' ? 1 : m.win === 'b' ? 0 : 0.5, K = 24;
  m.a.forEach(i => { R[i] = Math.round((R[i] || 1000) + K * (sa - ea)); G.n[g][i] = (G.n[g][i] || 0) + 1; if (sa === 1) G.w[g][i] = (G.w[g][i] || 0) + 1; });
  m.b.forEach(i => { R[i] = Math.round((R[i] || 1000) + K * ((1 - sa) - (1 - ea))); G.n[g][i] = (G.n[g][i] || 0) + 1; if (sa === 0) G.w[g][i] = (G.w[g][i] || 0) + 1; });
  G.last.unshift({ game: g, a: m.a, b: m.b, win: m.win, t: Date.now() }); G.last = G.last.slice(0, 30);
  return G;
}
async function save(env, uid, s){
  s.msgs = s.msgs.slice(-80);
  const keep = s.tasks.filter(t => t.status !== 'done').concat(s.tasks.filter(t => t.status === 'done').slice(-40));
  s.tasks = s.tasks.filter(t => keep.includes(t));
  await env.OFIS.put('u:' + uid, JSON.stringify(s));
}
async function update(env, uid, fn){ const s = await load(env, uid); const r = await fn(s); await save(env, uid, s); return r === undefined ? s : r; }
function msg(s, from, text, extra = {}){ const m = { id: s.nid++, from, text, t: Date.now(), ...extra }; s.msgs.push(m); return m; }
async function markPending(env, uid, on){
  const list = (await env.OFIS.get('pending', 'json')) || [];
  const has = list.includes(String(uid));
  if (on && !has) list.push(String(uid));
  if (!on && has) list.splice(list.indexOf(String(uid)), 1);
  if (on !== has) await env.OFIS.put('pending', JSON.stringify(list));
}
const runnable = t => t.status === 'new' || (t.status === 'run' && Date.now() - (t.started || 0) > 150000);

/* ---------------- Rustam: xabarni tushunish va taqsimlash ---------------- */
function taskLine(t){
  const st = { new: 'navbatda', run: 'jarayonda', done: 'tayyor', error: 'xato' }[t.status] || t.status;
  return `#${t.id} ${TEAM[t.who].name}: «${t.title}» — ${st}` + (t.status === 'done' && t.summary ? ` (${t.summary.slice(0, 120)})` : '');
}
function keywordPick(text){
  const kw = {
    elyor: ['kod', 'server', 'bot', 'api', 'baza', 'backend', 'python'], doniyor: ['sayt', 'sahifa', 'interfeys', 'ilova', 'html', 'mini app'],
    otabek: ['dizayn', 'logo', 'banner', 'rasm', 'prevyu', 'thumbnail', 'oblojka', 'chiz'], sanjar: ['reklama', 'marketing', 'auditoriya', 'strategiya', 'target'],
    feruza: ['narx', 'pul', 'xarajat', 'byudjet', 'hisob', 'marja', "so'm", 'foyda'], umida: ['xodim', 'vakansiya', 'intervyu', 'rezyume'],
    sabina: ['instagram', 'post', 'reels', 'story', 'telegram', 'kanal', 'youtube', 'tiktok'], dilnoza: ['matn', 'ssenariy', 'sarlavha', 'tavsif', 'maqola', "g'oya"],
    shoxrux: ['test', 'tekshir', 'xato'], laylo: ['video', 'montaj', 'subtitr', 'klip'], behruz: ['mijoz', 'sotuv', 'shartnoma', 'taklif']
  };
  const low = norm(text); let best = 'sardor', bs = 0;
  for (const [id, ws] of Object.entries(kw)) { const sc = ws.filter(w => low.includes(w)).reduce((a, w) => a + w.length, 0); if (sc > bs) { bs = sc; best = id; } }
  return best;
}
async function route(env, s, text){
  const team = Object.entries(TEAM).map(([id, t]) => `${id} — ${t.name} — ${t.role}`).join('\n');
  const tasks = s.tasks.slice(-12).map(taskLine).join('\n') || '(hozircha vazifa yo‘q)';
  const history = s.msgs.slice(-14).map(m => (m.from === 'me' ? s.owner : TEAM[m.from]?.name || m.from) + ': ' + String(m.text).slice(0, 300)).join('\n');
  const system = `You are Rustam, the boss of a small virtual company whose AI employees work for the owner "${s.owner}".
Speak Uzbek in Latin script only. Be short, warm and businesslike. Address the owner as "${s.owner}".
Team (id — name — role):
${team}

Current tasks:
${tasks}

Recent chat:
${history}

Decide how to handle the owner's newest message. Return ONLY a JSON object:
{"speaker":"<team id who answers>","reply":"<answer in Uzbek, 1-4 sentences>","tasks":[{"who":"<team id>","title":"<short task title in Uzbek, max 8 words>","brief":"<clear instructions for that employee in Uzbek: what exactly to produce, details from the owner>","channel":<true if the result is a post meant for the owner's Telegram channel, else false>}]}
Rules:
- If the owner asks for work, create 1-3 tasks for the best-fitting employees (never "rustam"). Split big requests across people. The reply says who got what.
- If the owner wrote @Name, that employee is the speaker and writes the reply IN FIRST PERSON in their own voice (as that employee, not as Rustam); work goes to them. If it is just a question to them (not work), they answer it directly in "reply" (up to 6 sentences) and tasks = [].
- Do not create a task that duplicates one already "navbatda" or "jarayonda" in Current tasks for the same person — say it is already in progress instead.
- If the owner asks to fix/improve a finished result, create a task for the same employee and put the main points of the old result into "brief".
- Questions about progress ("hisobot", "nima gap", "qachon tayyor"): answer honestly from Current tasks, tasks = [].
- Greetings and small talk: short reply, tasks = [].
- The owner's channel: ${env.CHANNEL_ID || 'not set'} — ${CHANNEL_ABOUT}. Channel posts usually go to sabina (or dilnoza).
- Never claim work is finished unless Current tasks says "tayyor". Never invent results.`;
  let out = null;
  try { out = parseJson(await ai(env, system, text, { asJson: true, maxTokens: 700 })); } catch (e) { out = null; }
  const mention = (text.match(/@([A-Za-z‘’ʻ']+)/) || [])[1];
  const mid = mention && Object.keys(TEAM).find(id => norm(TEAM[id].name) === norm(mention));
  if (!out || typeof out.reply !== 'string') {
    // AI javobi buzilsa ham ofis ishlayveradi
    const isWork = text.trim().split(/\s+/).length >= 3;
    const who = mid && mid !== 'rustam' ? mid : keywordPick(text);
    out = isWork
      ? { speaker: 'rustam', reply: `Qabul qildim, ${s.owner}. Bu ishni ${TEAM[who].name}ga topshirdim.`, tasks: [{ who, title: text.replace(/@\S+/g, '').trim().slice(0, 60), brief: text }] }
      : { speaker: 'rustam', reply: `Tushunarli, ${s.owner}. Vazifa bersangiz, kerakli odamga topshiraman.`, tasks: [] };
  }
  if (!TEAM[out.speaker]) out.speaker = mid || 'rustam';
  out.tasks = (Array.isArray(out.tasks) ? out.tasks : []).filter(t => t && TEAM[t.who] && t.who !== 'rustam' && t.title).slice(0, 3);
  return out;
}

async function handleText(env, uid, owner, text){
  // 1) xabarni saqlaymiz
  let s = await update(env, uid, st => { st.owner = owner; msg(st, 'me', text.slice(0, 2000)); });
  // 2) Rustam o'ylaydi (AI)
  const r = await route(env, s, text);
  // 3) javob va vazifalarni yozamiz (yangi holat ustiga)
  const created = [];
  s = await update(env, uid, st => {
    const speaker = r.speaker;
    for (const t of r.tasks) {
      const same = st.tasks.find(x => x.who === t.who && (x.status === 'new' || x.status === 'run') && norm(x.title) === norm(t.title));
      if (same) continue; // bir xil vazifa ikki marta yaratilmasin
      const task = { id: st.nid++, who: t.who, title: String(t.title).slice(0, 90), brief: String(t.brief || t.title).slice(0, 1500), status: 'new', created: Date.now(), by: 'rustam', channel: t.channel === true || /kanal/i.test(t.title + ' ' + text) && ['sabina', 'dilnoza'].includes(t.who) };
      st.tasks.push(task); created.push(task);
    }
    msg(st, speaker, String(r.reply).slice(0, 1500), created.length ? { taskIds: created.map(t => t.id) } : {});
  });
  if (created.length) await markPending(env, uid, true);
  return { state: s, created, reply: r };
}

/* ---------------- Xodim vazifani bajaradi ---------------- */
async function runTask(env, uid, id){
  // band qilamiz (ikki marta bajarilmasin)
  let task = null;
  const s0 = await update(env, uid, st => {
    const t = st.tasks.find(x => x.id === id);
    if (t && runnable(t)) { t.status = 'run'; t.started = Date.now(); task = { ...t }; }
  });
  if (!task) return { state: s0, ran: false };
  const p = TEAM[task.who];
  const system = `Sen ${p.name}san, virtual kompaniyada "${p.role}" lavozimida ishlaysan va ${s0.owner} uchun ishlaysan.
${p.guide}
Qoidalar: faqat o'zbek tilida (lotin yozuvida) yoz. Natija tayyor, aniq va foydalanishga yaroqli bo'lsin, umumiy gap va suv qo'shma. Internetga kira olmaysan: aniq bilmagan raqam yoki faktni "taxminan" deb belgila. 450 so'zdan oshma (kod bundan mustasno).
Javob formati: BIRINCHI QATOR — boshliqqa bir jumlali qisqa hisobot (nima qilding). Keyin bo'sh qator. Keyin to'liq natija.` +
    (task.channel ? `\nBU KANAL POSTI: ${CHANNEL_ABOUT}. To'liq natija — kanalga to'g'ridan-to'g'ri joylanadigan BITTA tayyor post: jozibali birinchi qator, 500-900 belgi, mos emoji, oxirida 2-3 heshteg. Post ichida izoh, variant yoki "mana post" degan gaplar bo'lmasin.` : '');
  let out, err = null;
  try { out = await ai(env, system, `Vazifa: ${task.title}\n\nTafsilot: ${task.brief}`, { maxTokens: 1800 }); }
  catch (e) { err = String(e.message || e).slice(0, 300); }

  let follow = null;
  const s = await update(env, uid, st => {
    const t = st.tasks.find(x => x.id === id); if (!t) return;
    if (err || !out) { t.status = 'error'; t.error = err || 'Bo‘sh javob'; msg(st, t.who, `«${t.title}» bajarilmadi: ${t.error}. Qayta urinib ko‘ring.`, { taskIds: [t.id] }); return; }
    const lines = out.replace(/^\s+/, '').split('\n');
    t.summary = lines[0].replace(/^[#*\s]+|\*+$/g, '').slice(0, 300);
    t.result = lines.slice(1).join('\n').trim() || out;
    t.status = 'done'; t.done = Date.now();
    st.scores[t.who] = (st.scores[t.who] || 50) + 3;
    msg(st, t.who, t.summary, { taskIds: [t.id], kind: 'result' });
    // Shoxrux tekshiruvi: baho 7 dan past bo'lsa — muallif bir marta tuzatadi
    if (t.review) {
      const src = st.tasks.find(x => x.id === t.review);
      const m = String(t.result + ' ' + t.summary).match(/(\d{1,2})\s*\/\s*10/g);
      const score = m ? Number(m[m.length - 1].split('/')[0]) : null;
      if (src) src.qa = score;
      if (src && score !== null && score < 7 && !src.fixOf && !src.reworked) {
        src.reworked = true;
        follow = { id: st.nid++, who: src.who, title: 'Tuzatish: ' + src.title.slice(0, 70), brief: `Shoxrux ishingni ${score}/10 deb baholadi. Uning izohlari bo'yicha ishni TO'LIQ qayta yoz (yangi to'liq variant ber, faqat izoh emas).\n\nAsl vazifa: ${src.brief.slice(0, 800)}\n\nShoxrux izohlari:\n${t.result.slice(0, 1800)}\n\nOldingi natija:\n${src.result.slice(0, 2500)}`, status: 'new', created: Date.now(), by: 'rustam', fixOf: src.id };
        st.tasks.push(follow);
        msg(st, 'rustam', `@${TEAM[src.who].name}, Shoxrux ${score}/10 berdi. Izohlarini hisobga olib tuzatib chiq.`, { taskIds: [follow.id] });
      }
    }
    // dasturchi ishini Shoxrux tekshiradi (har bir ish bir marta, tuzatilgani qayta tekshirilmaydi)
    if ((t.who === 'elyor' || t.who === 'doniyor') && !t.review && !t.fixOf && !st.tasks.some(x => x.review === t.id)) {
      follow = { id: st.nid++, who: 'shoxrux', title: 'Tekshiruv: ' + t.title.slice(0, 70), brief: `${TEAM[t.who].name} tayyorlagan ishni tekshir.\n\nVazifa: ${t.title}\n\nNatija:\n${t.result.slice(0, 3500)}`, status: 'new', created: Date.now(), by: 'rustam', review: t.id };
      st.tasks.push(follow);
      msg(st, 'rustam', `@Shoxrux, ${TEAM[t.who].name}ning ishini tekshirib chiq.`, { taskIds: [follow.id] });
    }
  });
  const t = s.tasks.find(x => x.id === id);
  if (t && t.status === 'done' && env.BOT_TOKEN && env.NOTIFY !== 'off') {
    const preview = tgPreview(t.result, 700);
    await tg(env, 'sendMessage', { chat_id: uid, parse_mode: 'HTML', disable_web_page_preview: true,
      text: `✅ <b>${p.ico} ${esc(p.name)}</b> · ${esc(p.role)}\n<b>${esc(t.title)}</b>\n<i>${esc(t.summary)}</i>` + (preview ? '\n\n' + preview : ''),
      reply_markup: { inline_keyboard: [
        [{ text: '📄 To‘liq natija', web_app: { url: env.__site + '#t=' + t.id } }],
        ...(t.channel && env.CHANNEL_ID ? [[{ text: '📢 Kanalga joylash', callback_data: 'pub:' + t.id }]] : [])] } });
  }
  const left = s.tasks.some(runnable);
  if (!left) await markPending(env, uid, false); else if (follow) await markPending(env, uid, true);
  return { state: s, ran: true };
}

/* ---------------- Kanalga joylash (eski bot orqali) ---------------- */
async function publish(env, uid, id, text){
  if (!env.CHANNEL_ID) throw new Error('CHANNEL_ID sozlanmagan');
  const s = await load(env, uid);
  const t = s.tasks.find(x => x.id === id);
  if (!t || t.status !== 'done') throw new Error('Vazifa topilmadi');
  const body = String(text || t.result || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,4}\s*/gm, '').trim().slice(0, 4000);
  if (!body) throw new Error('Post bo‘sh');
  const token = env.CHANNEL_BOT_TOKEN || env.BOT_TOKEN;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CHANNEL_ID, text: body, disable_web_page_preview: true })
  }).then(x => x.json()).catch(() => ({ ok: false, description: 'Telegram javob bermadi' }));
  if (!r.ok) throw new Error('Kanalga joylanmadi: ' + (r.description || '') + '. Bot kanalda admin ekanini tekshiring.');
  return update(env, uid, st => {
    const x = st.tasks.find(q => q.id === id); if (x) { x.published = Date.now(); x.result = body; }
    msg(st, 'sabina', `«${t.title}» kanalga joylandi ✅`, { taskIds: [id] });
  });
}

/* ---------------- Mini App API ---------------- */
async function api(req, env, path){
  const u = await verifyInitData(req.headers.get('X-Init-Data'), env.BOT_TOKEN);
  if (!u) return json({ error: 'Telegram orqali oching' }, 401);
  if (!allowed(env, u.id)) return json({ error: 'Bu ofis shaxsiy. Egasidan ruxsat so‘rang.' }, 403);
  const uid = u.id, owner = ownerName(u);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  if (path === '/api/state') {
    const s = await load(env, uid);
    if (!s.owner) { s.owner = owner; if (!s.msgs.length) msg(s, 'rustam', `Assalomu alaykum, ${owner}! Jamoa joyida, ${STAFF.length} xodim ishga tayyor. Vazifani shu yerga yozing: o‘zim kerakli odamga topshiraman. Masalan: «YouTube video uchun 3 ta sarlavha va prevyu g‘oyasi kerak».`); await save(env, uid, s); }
    return json({ state: s, ai: env.GEMINI_API_KEY ? 'gemini' : env.AI ? 'cloudflare' : 'none', channel: env.CHANNEL_ID || '' });
  }
  if (path === '/api/send') {
    const text = String(body.text || '').trim();
    if (!text) return json({ error: 'Bo‘sh xabar' }, 400);
    const r = await handleText(env, uid, owner, text);
    return json({ state: r.state });
  }
  if (path === '/api/run') { const r = await runTask(env, uid, Number(body.id)); return json({ state: r.state }); }
  if (path === '/api/retry') {
    const s = await update(env, uid, st => { const t = st.tasks.find(x => x.id === Number(body.id)); if (t && t.status === 'error') { t.status = 'new'; delete t.error; } });
    await markPending(env, uid, true);
    return json({ state: s });
  }
  if (path === '/api/rate') {
    const s = await update(env, uid, st => {
      const t = st.tasks.find(x => x.id === Number(body.id)); if (!t || t.rated) return;
      const v = body.v > 0 ? 2 : -2; t.rated = v; st.scores[t.who] = (st.scores[t.who] || 50) + v;
    });
    return json({ state: s });
  }
  if (path === '/api/publish') { try { return json({ state: await publish(env, uid, Number(body.id), body.text) }); } catch (e) { return json({ error: e.message }, 400); } }
  if (path === '/api/game') {
    const ok = GAME_IDS.includes(body.game) && Array.isArray(body.a) && Array.isArray(body.b) && body.a.length && body.b.length && ['a', 'b', 'draw'].includes(body.win)
      && [...body.a, ...body.b].every(i => TEAM[i]) && body.a.length <= 4 && body.b.length <= 4;
    if (!ok) return json({ error: 'Noto‘g‘ri o‘yin natijasi' }, 400);
    const s = await update(env, uid, st => { eloApply(st.games, { game: body.game, a: body.a, b: body.b, win: body.win }); });
    return json({ games: s.games });
  }
  if (path === '/api/reset') { const old = await load(env, uid); const s = blank(); s.games = old.games; s.owner = owner; msg(s, 'rustam', `Ofis yangidan boshlandi, ${owner}. Qanday ish bor?`); await save(env, uid, s); return json({ state: s }); }
  return json({ error: 'not found' }, 404);
}

/* ---------------- Bot (webhook) ---------------- */
async function onUpdate(update, env){
  const cq = update.callback_query;
  if (cq) {
    const [kind, id] = String(cq.data || '').split(':');
    if (kind === 'pub' && allowed(env, cq.from.id)) {
      let note;
      try { await publish(env, cq.from.id, Number(id), null); note = '✅ Kanalga joylandi'; }
      catch (e) { note = '❌ ' + e.message; }
      await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text: note.slice(0, 190), show_alert: note.startsWith('❌') });
      if (note.startsWith('✅') && cq.message) await tg(env, 'editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [[{ text: '🏢 Ofisni ochish', web_app: { url: env.__site } }]] } });
    } else await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });
    return;
  }
  const m = update.message;
  if (!m || !m.text) return;
  const chat = m.chat.id, uid = m.from.id;
  const text = m.text.trim();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  const openBtn = { inline_keyboard: [[{ text: '🏢 Ofisni ochish', web_app: { url: env.__site } }]] };

  if (cmd === '/id') return tg(env, 'sendMessage', { chat_id: chat, text: `🆔 ${uid}` });
  if (!allowed(env, uid)) return tg(env, 'sendMessage', { chat_id: chat, text: '🔒 Bu ofis shaxsiy. Egasidan ruxsat so‘rang.' });
  if (m.chat.type !== 'private') return;

  if (cmd === '/start') {
    return tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', reply_markup: openBtn,
      text: `🏢 <b>Virtual Ofis</b>\n\nSizda ${STAFF.length} ta AI xodim bor: dasturchi, dizayner, SMM, kopirayter, moliyachi va boshqalar. Boshliq Rustam ishni taqsimlaydi.\n\n✍️ Vazifani shu yerga yozing yoki ofisni oching.\nMasalan: <i>Instagram uchun bir haftalik post rejasi tuz</i>\n\n/hisobot — kim nima qilyapti` });
  }
  const q = cmd === '/hisobot' ? 'Hisobot ber' : cmd === '/post' ? 'Kanal uchun yangi post tayyorla' : text;
  await tg(env, 'sendChatAction', { chat_id: chat, action: 'typing' });
  const r = await handleText(env, uid, ownerName(m.from), q);
  const sp = TEAM[r.reply.speaker] || TEAM.rustam;
  let out = `${sp.ico} <b>${esc(sp.name)}</b>: ${esc(r.reply.reply)}`;
  if (r.created.length) out += '\n\n' + r.created.map(t => `▫️ ${TEAM[t.who].ico} ${esc(TEAM[t.who].name)} — ${esc(t.title)}`).join('\n') + '\n\n⏳ Tayyor bo‘lgach shu yerga yuboraman.';
  await tg(env, 'sendMessage', { chat_id: chat, text: out, parse_mode: 'HTML', reply_markup: openBtn });
  // vaqt yetguncha vazifalarni shu yerning o'zida bajaramiz, qolganini Cron oladi
  const t0 = Date.now();
  for (const t of r.created) {
    if (Date.now() - t0 > 12000) break;
    await tg(env, 'sendChatAction', { chat_id: chat, action: 'typing' });
    await runTask(env, uid, t.id);
  }
}

/* ---------------- Cron: qolib ketgan vazifalar ---------------- */
async function dailyPost(env){
  if (!env.CHANNEL_ID || !env.ADMIN_ID || env.DAILY_POST === 'off') return;
  const now = new Date(Date.now() + 5 * 3600 * 1000); // Toshkent vaqti
  if (now.getUTCHours() < Number(env.POST_HOUR || 10)) return;
  const day = now.toISOString().slice(0, 10);
  if (await env.OFIS.get('daily:' + day)) return;
  await env.OFIS.put('daily:' + day, '1', { expirationTtl: 3 * 86400 });
  const uid = env.ADMIN_ID;
  await update(env, uid, st => {
    const recent = st.tasks.filter(t => t.channel).slice(-8).map(t => '«' + t.title + '»').join(', ') || 'yo‘q';
    const t = { id: st.nid++, who: 'sabina', title: 'Kunlik kanal posti', brief: `Kanal uchun bugungi postni yoz. Mavzuni o'zing tanla: kundalik texnika yoki qurilma qanday ishlashi haqida qiziq fakt yoki qisqa tushuntirish. Oldingi postlar mavzulari (takrorlama): ${recent}.`, status: 'new', created: Date.now(), by: 'rustam', channel: true };
    st.tasks.push(t);
    msg(st, 'rustam', 'Sabina, bugungi kanal postini tayyorla. Tayyor bo‘lsa, '+ (st.owner || 'egamiz') +' tasdiqlab joylaydi.', { taskIds: [t.id] });
  });
  await markPending(env, uid, true);
}

async function cron(env){
  try { await dailyPost(env); } catch (e) {}
  const list = (await env.OFIS.get('pending', 'json')) || [];
  const t0 = Date.now();
  for (const uid of list.slice(0, 5)) {
    const s = await load(env, uid);
    const next = s.tasks.find(runnable);
    if (!next) { await markPending(env, uid, false); continue; }
    if (Date.now() - t0 > 20000) break;
    await runTask(env, uid, next.id);
  }
}

export default {
  async fetch(req, env, ctx){
    const url = new URL(req.url);
    env.__site = url.origin + '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html'))
      return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });

    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url.pathname); }
      catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 500); }
    }

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      const upd = await req.json().catch(() => null);
      if (upd) ctx.waitUntil(onUpdate(upd, env).catch(() => {}));
      return new Response('ok');
    }

    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Kalit noto\'g\'ri', { status: 403 });
      if (env.OFIS) await env.OFIS.put('origin', url.origin);
      const hook = await tg(env, 'setWebhook', { url: url.origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true });
      const cmds = await tg(env, 'setMyCommands', { commands: [
        { command: 'start', description: 'Boshlash' },
        { command: 'hisobot', description: 'Kim nima qilyapti' },
        { command: 'post', description: 'Kanal uchun yangi post' },
        { command: 'id', description: 'Telegram ID raqamim' }
      ] });
      const btn = await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ofis', web_app: { url: env.__site } } });
      const checks = [
        ['Bot ulandi', hook.ok && cmds.ok],
        ['Menyu tugmasi «Ofis»', btn.ok],
        ['KV «OFIS»', !!env.OFIS],
        ['AI', env.GEMINI_API_KEY ? 'Gemini ✅' : env.AI ? 'Cloudflare AI ✅ (Gemini kaliti qo‘shsangiz o‘zbekcha yaxshiroq)' : false],
        ['Kanal', env.CHANNEL_ID ? env.CHANNEL_ID + (env.CHANNEL_BOT_TOKEN ? ' (eski bot orqali)' : ' (shu bot orqali)') : 'ixtiyoriy — CHANNEL_ID qo‘shmagansiz'],
        ['ADMIN_ID', env.ADMIN_ID ? env.ADMIN_ID : 'yo‘q — botga /id yozing va qo‘shing']
      ];
      const ok = checks.every(c => c[1]);
      return new Response((ok ? '✅ Tayyor!\n\n' : '⚠️ Nimadir yetishmayapti:\n\n') + checks.map(c => (c[1] ? '✅ ' : '❌ ') + c[0] + (typeof c[1] === 'string' ? ': ' + c[1] : '')).join('\n') + (hook.ok ? '' : '\n\nTelegram javobi: ' + JSON.stringify(hook)), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Topilmadi', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
  async scheduled(event, env, ctx){
    const origin = await env.OFIS.get('origin');
    env.__site = (origin || '') + '/';
    ctx.waitUntil(cron(env));
  }
};