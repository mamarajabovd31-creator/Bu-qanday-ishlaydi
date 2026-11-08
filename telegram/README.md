# Telegram kanalga postlar

`telegram/posts/` ichiga yangi `.json` fayl qo'shilsa, GitHub Actions ("Telegram post") uni @bu_qandayishlaydi_bot orqali kanalga joylaydi.

## Bir martalik sozlash
1. Telegram: kanal → Administratorlar → Admin qo'shish → `@bu_qandayishlaydi_bot` → "Xabar joylash" huquqini yoqing.
2. GitHub: repo → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `TELEGRAM_BOT_TOKEN`
   - Secret: BotFather bergan token
3. (ixtiyoriy) Variables bo'limida `TELEGRAM_CHAT_ID` — boshqa kanal uchun. Bo'sh bo'lsa `@buqanday_ishlaydi1` ishlatiladi.
4. Tekshirish: Actions → Telegram post → Run workflow → mode = `check`. Bu hech narsa joylamaydi, faqat bot kanalga yoza olishini tekshiradi.

## Post fayli
```json
{
  "video": "videos/bankomat.mp4",
  "thumbnail": "img/bankomat_thumb.jpg",
  "text": "<b>Sarlavha</b>\n\nMatn…",
  "buttons": [[{"text": "Tugma", "url": "https://..."}]],
  "silent": false
}
```
- `video`, `photo` yoki `document` — ixtiyoriy, repo ichidagi fayl (50 MB gacha). Bo'lmasa oddiy matnli post bo'ladi.
- `text` — HTML formatda. Fayl bilan 1024, faylsiz 4096 belgigacha.
- Nomlash: `YYYY-MM-DD-mavzu.json`. Bir marta qo'shilgan fayl bir marta joylanadi; o'zgartirish qayta yubormaydi.
