# Bu qanday ishlaydi?

Kundalik texnika ichida nima bo'ladi: 3D animatsiyada, o'zbek tilida.

Sayt GitHub Pages orqali ishlaydi.

- `index.html` — bosh sahifa: kutib olish oynasi va pastki menyu (Bosh, Videolar, 3D lab, Mavzular, Aloqa). Kirganda faqat "Bosh" bo'limi ko'rinadi
- `i18n.js` — 3 til: English (standart), O'zbekcha, Русский. Tepadagi bayroqli tanlagich. HTML'dagi asl matn o'zbekcha, tarjima kerak bo'lgan elementga `data-t="kalit"` qo'yib, kalitni `i18n.js` ichidagi `en` va `ru` bo'limlariga yozing
- `img/flags/` — bayroqlar
- `tg.js` — Telegram Mini App rejimi: bot ichida ochilganda foydalanuvchining Telegram tili, Telegram ranglari, "Orqaga" tugmasi, tebranish. Oddiy brauzerda hech narsa qilmaydi
- `zaryadlovchi/`, `kir-mashina/`, `bankomat/` — har bir video uchun alohida sahifa: video, bosqichma-bosqich matn, savol-javob
- `style.css`, `app.js` — barcha sahifalar uchun umumiy dizayn va skript
- `3d/dvigatel/` — 3D laboratoriya: interaktiv 4 taktli dvigatel (Three.js, `engine.js`; matnlari `engine-text.js` ichida, 3 tilda)
- `3d/bankomat/` — interaktiv bankomat: 5 bosqich, "Ichini ko'rish" rejimi, bosiladigan qismlar (`atm.js`, matnlari `atm-text.js` ichida, 3 tilda)
- `videos/`, `img/` — videolar va muqovalar
- `manifest.webmanifest` — saytni telefonga ilova kabi o'rnatish uchun
- `sitemap.xml` — Google uchun sahifalar ro'yxati (yangi sahifa qo'shilganda shu yerga ham yozing)

Ijtimoiy tarmoq havolalarini `app.js` ichidagi `LINKS` qismiga yozing.

Yangi video qo'shish: `zaryadlovchi/` papkasidan nusxa oling, matnni almashtiring, bosh sahifaga karta qo'shing va `sitemap.xml` ni yangilang.

Yangi 3D model qo'shish: `3d/dvigatel/` papkasidan nusxa oling, `engine.js` ichidagi qismlar va matnlarni almashtiring, bosh sahifaga `labcard` qo'shing va `sitemap.xml` ni yangilang.

## "Kutaman" ovozlari va bot serveri

`server/worker.js` — Cloudflare Worker (bepul). Ovozlarni saqlaydi, bot egasiga har yangi "Kutaman" haqida Telegram xabar yuboradi, foizlarni beradi, botda /start ga rasmli salomlashuv yuboradi (`img/bot-cover.png`).
Sozlash tartibi faylning boshida yozilgan. Server manzilini `app.js` dagi `VOTE_API` ga yozing.

## Telegram kanalga postlar

`telegram/posts/` ga `.json` post qo'shilsa, `.github/workflows/telegram-post.yml` uni bot orqali kanalga joylaydi. Sozlash va post formati: `telegram/README.md`.
