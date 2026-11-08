# Bu qanday ishlaydi?

Kundalik texnika ichida nima bo'ladi: 3D animatsiyada, o'zbek tilida.

Sayt GitHub Pages orqali ishlaydi.

- `index.html` — bosh sahifa: kutib olish oynasi va pastki menyu (Videolar, Mavzular, Biz haqimizda, Aloqa)
- `zaryadlovchi/`, `kir-mashina/` — har bir video uchun alohida sahifa: video, bosqichma-bosqich matn, savol-javob
- `style.css`, `app.js` — barcha sahifalar uchun umumiy dizayn va skript
- `3d/dvigatel/` — 3D laboratoriya: interaktiv 4 taktli dvigatel (Three.js, `engine.js`). Aylantirish, ochib ko'rish, takt bo'yicha qadam, qismni bosib o'qish, UZ/EN
- `videos/`, `img/` — videolar va muqovalar
- `manifest.webmanifest` — saytni telefonga ilova kabi o'rnatish uchun
- `sitemap.xml` — Google uchun sahifalar ro'yxati (yangi sahifa qo'shilganda shu yerga ham yozing)

Ijtimoiy tarmoq havolalarini `app.js` ichidagi `LINKS` qismiga yozing.

Yangi video qo'shish: `zaryadlovchi/` papkasidan nusxa oling, matnni almashtiring, bosh sahifaga karta qo'shing va `sitemap.xml` ni yangilang.

Yangi 3D model qo'shish: `3d/dvigatel/` papkasidan nusxa oling, `engine.js` ichidagi qismlar va matnlarni almashtiring, bosh sahifaga `labcard` qo'shing va `sitemap.xml` ni yangilang.
