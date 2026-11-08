/* Telegram Mini App rejimi.
   Sayt Telegram bot ichida ochilganda: tilni foydalanuvchi Telegram tilidan oladi, kutib olish oynasini ko'rsatmaydi,
   Telegram ranglari va "Orqaga" tugmasini sozlaydi, 3D modelni surganda ilova yopilib ketmasligini ta'minlaydi.
   Oddiy brauzerda hech narsa qilmaydi. i18n.js va app.js dan OLDIN yuklanadi. */
(function(){
  const ss = {
    get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  const hash = location.hash || '';
  const fromTg = hash.indexOf('tgWebAppData') !== -1 || hash.indexOf('tgWebAppPlatform') !== -1;
  if (fromTg) ss.set('bqi-tg', '1');
  if (ss.get('bqi-tg') !== '1') return;

  const root = document.documentElement;
  root.classList.add('tg');
  window.BQI_TG = true;

  // Telegram ma'lumotlarini manzil oxiridan o'qiymiz (skript yuklanishini kutmasdan)
  let tgLang = '';
  if (fromTg) {
    try {
      const p = new URLSearchParams(hash.slice(1));
      const data = new URLSearchParams(p.get('tgWebAppData') || '');
      const user = JSON.parse(data.get('user') || '{}');
      tgLang = (user.language_code || '').slice(0, 2);
      if (tgLang) ss.set('bqi-tg-lang', tgLang);
    } catch (e) {}
  }
  tgLang = tgLang || ss.get('bqi-tg-lang') || '';
  // Foydalanuvchi o'zi til tanlamagan bo'lsa, Telegram tili ishlatiladi
  window.BQI_DEFAULT = tgLang === 'ru' ? 'ru' : tgLang === 'uz' ? 'uz' : 'en';
  // Kutib olish oynasi Telegram ichida kerak emas
  ss.set('bqi-welcomed', '1');

  function setup(){
    const W = window.Telegram && window.Telegram.WebApp;
    // Telegram kutubxonasi ma'lumotni o'qib bo'ldi: endi manzildagi uzun yozuvni olib tashlaymiz
    if (/tgWebApp/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (!W) return;
    try {
      W.ready();
      W.expand();
      if (W.setHeaderColor) W.setHeaderColor('#050a16');
      if (W.setBackgroundColor) W.setBackgroundColor('#050a16');
      if (W.setBottomBarColor) W.setBottomBarColor('#050a16');
      if (W.disableVerticalSwipes) W.disableVerticalSwipes(); // 3D modelni surganda ilova yopilmasin
    } catch (e) {}

    // Ichki sahifalarda Telegram'ning "Orqaga" tugmasi
    const home = !!document.querySelector('.panel');
    if (W.BackButton) {
      const back = () => {
        if (!home) {
          if (document.referrer && new URL(document.referrer).origin === location.origin) history.back();
          else location.href = new URL('.', document.querySelector('script[src$="tg.js"]').src).href;
        } else location.hash = '#bosh';
      };
      const paint = () => {
        const onHome = home && (!location.hash || location.hash === '#bosh');
        onHome ? W.BackButton.hide() : W.BackButton.show();
      };
      W.BackButton.onClick(back);
      paint();
      addEventListener('hashchange', paint);
    }

    // Yengil tebranish: menyu, tugmalar
    const haptic = W.HapticFeedback;
    if (haptic) {
      document.addEventListener('click', e => {
        const el = e.target.closest('.tabbar a, .door, .labcard, .strokes button, .controls .gbtn, .lp-menu button, .vote button');
        if (el) { try { haptic.selectionChanged(); } catch (x) {} }
      }, true);
    }

    // t.me havolalari Telegram ichida ochilsin
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="https://t.me/"]');
      if (!a || !W.openTelegramLink) return;
      e.preventDefault(); W.openTelegramLink(a.href);
    }, true);
  }

  const s = document.createElement('script');
  s.src = 'https://telegram.org/js/telegram-web-app.js';
  s.onload = setup;
  document.head.appendChild(s);
})();
