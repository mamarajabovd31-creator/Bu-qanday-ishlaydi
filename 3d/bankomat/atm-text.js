/* 3D bankomat sahifasi matnlari (EN / UZ / RU).
   Oddiy skript: 3D kutubxona yuklanishini kutmasdan sahifa matnini darhol tarjima qiladi. */
window.ATM_T = {
  uz: {
    crumbHome:"Bosh sahifa", crumbLab:"3D laboratoriya", crumbAtm:"Bankomat",
    title:"Bankomat qanday <em>ishlaydi?</em>",
    lead:"Bu videoni emas, bankomatning o'zini ko'ryapsiz. Aylantiring, ichini oching va istalgan qismini bosib, u nima ish qilishini o'qing.",
    labTitle:"Interaktiv 3D model", hint:"Aylantirish uchun suring · qismni bilish uchun bosing", loading:"3D model yuklanmoqda…",
    s0:"Karta", s1:"PIN-kod", s2:"Bank", s3:"Sanash", s4:"Pul",
    pause:"⏸ To'xtatish", play:"▶ Ishga tushirish", step:"Keyingi bosqich ▸", xray:"Ichini ko'rish", xrayOff:"Yopish", reset:"Kamerani tiklash", speed:"Tezlik",
    nowHappening:"Hozir nima bo'lyapti", partEyebrow:"Tanlangan qism", partNone:"Hech narsa tanlanmagan",
    partHelp:"Modeldagi istalgan qismni bosing: ekran, klaviatura, kassetalar, sensor…",
    d0:"Karta karta o'quvchiga tortiladi. Bankomat chip kontaktlari orqali karta ma'lumotini o'qiydi.",
    d1:"Siz PIN-kod terasiz. Klaviatura ichidagi maxsus chip har bir raqamni darhol shifrlaydi, ochiq kod hech qayerga ketmaydi.",
    d2:"Shifrlangan so'rov bank serveriga boradi: karta haqiqiymi, PIN to'g'rimi, hisobda mablag' yetarlimi? Bank bir zumda ruxsat yoki rad javobini qaytaradi.",
    d3:"Ruxsat kelgach, roliklar kassetalardan kupyuralarni bittalab tortib oladi. Sensor har birining qalinligi va o'lchamini tekshiradi.",
    d4:"Sanalgan pul chiqish joyiga keladi va qopqoq ochiladi. Karta qaytariladi, bankomat esa operatsiyani bankka tasdiqlab yuboradi.",
    scr:{ welcome:"Xush kelibsiz", insert:"Kartani kiriting", reading:"Karta o'qilmoqda", pin:"PIN-kodni kiriting", check:"Bank bilan tekshirilmoqda", ok:"Ruxsat berildi", count:"Pul sanalmoqda", take:"Pulni oling" },
    h4:"Besh bosqich, bir necha soniya",
    p4:"Bankomat aslida ikki qismdan iborat: tepada kompyuter, ekran va klaviatura, pastda esa qalin po'latdan yasalgan seyf. Pulning o'zi seyf ichidagi kassetalarda turadi, qaror esa bankomatda emas, bank serverida qabul qilinadi.",
    fact:"<b>Qiziq fakt:</b> birinchi bankomat 1967-yilda Londonda ishga tushgan. O'shanda plastik karta yo'q edi, odamlar maxsus qog'oz chek kiritardi.",
    faqTitle:"Savol-javob",
    q1:"Bankomat ikki kupyurani yopishtirib berib yubormaydimi?", a1:"Har bir kupyura sensor ostidan o'tadi. Qalinlik odatdagidan katta bo'lsa (ikki varaq yopishgan), bankomat ularni sizga bermaydi, alohida \"rad\" qutisiga tashlaydi va o'rniga yangisini sanaydi.",
    q2:"Karta nega bankomat ichida qolib ketadi?", a2:"PIN bir necha marta noto'g'ri terilsa yoki karta uzoq vaqt olinmasa, bankomat xavfsizlik uchun uni ichkariga tortib oladi. Bunday holda bankingizga murojaat qiling.",
    q3:"Bankomat PIN-kodimni biladimi?", a3:"Yo'q. Klaviatura ichidagi chip raqamlarni darhol shifrlaydi va tekshirishni bank qiladi. Bankomat dasturi ham, operator ham ochiq PIN-kodni ko'rmaydi.",
    ctaTitle:"Qaysi qurilmani 3D'da ochaylik?", ctaText:"Telegram kanalimizda keyingi interaktiv modelni o'zingiz tanlang.", ctaBtn:"Kanalga qo'shilish",
    related:"Videoni ham ko'ring", r1:"Bankomat qanday ishlaydi?", r2:"Dvigatel",
    parts:{
      screen:["Ekran","Sizga nima qilish kerakligini ko'rsatadi. Ko'p bankomatlarda u sensorli bo'ladi."],
      reader:["Karta o'quvchi","Kartani ichkariga tortadi va chip kontaktlari yoki magnit polosa orqali ma'lumotni o'qiydi. Yashil chiroq kartani qayerga qo'yishni ko'rsatadi."],
      keypad:["PIN-klaviatura","Ichida shifrlovchi chip bor. Har bir bosilgan raqam shu zahoti shifrlanadi, shuning uchun PIN-kod ochiq holda hech qayerga yuborilmaydi."],
      dispenser:["Pul chiqarish joyi","Sanalgan kupyuralar shu yerga keladi. Qopqoq faqat pul tayyor bo'lganda ochiladi va pul olinmasa, qaytarib tortib olinadi."],
      cassettes:["Kassetalar","Seyf ichidagi qutilar. Har birida bir xil nominaldagi kupyuralar turadi. Inkassatorlar ularni butunligicha almashtiradi."],
      rollers:["Roliklar","Rezina roliklar va tasmalar kassetadan kupyurani bittalab tortib oladi va chiqish joyiga olib boradi."],
      sensor:["Sensor","Har bir kupyuraning qalinligi va o'lchamini o'lchaydi. Ikki varaq yopishib qolsa yoki kupyura yirtiq bo'lsa, uni rad qutisiga tashlaydi."],
      safe:["Seyf","Bankomatning pastki qismi, qalin po'latdan. Pul kassetalari shu yerda turadi."],
      cabinet:["Yuqori qism","Kompyuter, ekran, klaviatura va karta o'quvchi joylashgan qism. Bu yerda pul bo'lmaydi."],
      card:["Bank kartasi","Chipida karta raqami va maxfiy kalitlar bor. Har bir operatsiyada chip yangi kod yaratadi, shuning uchun uni nusxalash qiyin."],
      server:["Bank serveri","Barcha qarorni shu yerda qabul qiladi: karta, PIN va hisobdagi mablag'ni tekshiradi va javobni bir zumda qaytaradi."]
    }
  },
  en: {
    crumbHome:"Home", crumbLab:"3D Lab", crumbAtm:"ATM",
    title:"How does an ATM <em>work?</em>",
    lead:"This is not a video, it is the ATM itself. Rotate it, look inside and tap any part to read what it does.",
    labTitle:"Interactive 3D model", hint:"Drag to rotate · tap a part to learn about it", loading:"Loading 3D model…",
    s0:"Card", s1:"PIN", s2:"Bank", s3:"Count", s4:"Cash",
    pause:"⏸ Pause", play:"▶ Play", step:"Next step ▸", xray:"Look inside", xrayOff:"Close", reset:"Reset camera", speed:"Speed",
    nowHappening:"What is happening now", partEyebrow:"Selected part", partNone:"Nothing selected",
    partHelp:"Tap any part of the model: screen, keypad, cassettes, sensor…",
    d0:"The card is pulled into the card reader. The ATM reads the card's data through the chip contacts.",
    d1:"You type your PIN. A special chip inside the keypad encrypts every digit right away, so the plain code never travels anywhere.",
    d2:"The encrypted request goes to the bank's server: is the card valid, is the PIN right, is there enough money? The bank sends back approval or refusal in an instant.",
    d3:"Once approved, rollers pull notes from the cassettes one by one. A sensor checks the thickness and size of each note.",
    d4:"The counted cash reaches the slot and the shutter opens. The card is returned and the ATM confirms the transaction to the bank.",
    scr:{ welcome:"Welcome", insert:"Insert your card", reading:"Reading card", pin:"Enter your PIN", check:"Checking with bank", ok:"Approved", count:"Counting cash", take:"Take your cash" },
    h4:"Five steps, a few seconds",
    p4:"An ATM really has two parts: a computer, screen and keypad on top, and a thick steel safe below. The cash sits in cassettes inside the safe, and the decision is made not by the ATM but by the bank's server.",
    fact:"<b>Fun fact:</b> the first ATM started working in London in 1967. There were no plastic cards then; people inserted special paper vouchers.",
    faqTitle:"Questions and answers",
    q1:"Can an ATM hand out two notes stuck together?", a1:"Every note passes under a sensor. If it is thicker than normal (two sheets stuck together), the ATM does not give it to you; it drops it into a separate reject bin and counts a new one instead.",
    q2:"Why does the ATM sometimes keep my card?", a2:"If the PIN is entered wrong several times or the card is not taken in time, the ATM pulls it back inside for safety. Contact your bank if this happens.",
    q3:"Does the ATM know my PIN?", a3:"No. The chip in the keypad encrypts the digits immediately and the bank does the checking. Neither the ATM software nor the operator sees the plain PIN.",
    ctaTitle:"Which device should we open in 3D next?", ctaText:"Pick the next interactive model in our Telegram channel.", ctaBtn:"Join the channel",
    related:"Watch the video too", r1:"How does an ATM work?", r2:"Car engine",
    parts:{
      screen:["Screen","Shows you what to do next. On many ATMs it is a touch screen."],
      reader:["Card reader","Pulls the card in and reads it through the chip contacts or the magnetic stripe. The green light shows where the card goes."],
      keypad:["PIN pad","Has an encrypting chip inside. Each digit is encrypted the moment you press it, so the PIN is never sent in plain form."],
      dispenser:["Cash slot","The counted notes arrive here. The shutter opens only when the cash is ready, and pulls it back if it is not taken."],
      cassettes:["Cassettes","Boxes inside the safe, each holding notes of a single value. Cash handlers swap them as whole units."],
      rollers:["Rollers","Rubber rollers and belts pull notes from a cassette one at a time and carry them to the slot."],
      sensor:["Sensor","Measures the thickness and size of every note. If two sheets are stuck together or a note is torn, it goes to the reject bin."],
      safe:["Safe","The lower part of the ATM, made of thick steel. The cash cassettes live here."],
      cabinet:["Upper cabinet","Holds the computer, screen, keypad and card reader. There is no cash up here."],
      card:["Bank card","Its chip stores the card number and secret keys. It creates a new code for every transaction, which makes it hard to copy."],
      server:["Bank server","Makes the actual decision: checks the card, the PIN and the balance, and replies in an instant."]
    }
  },
  ru: {
    crumbHome:"Главная", crumbLab:"3D-лаборатория", crumbAtm:"Банкомат",
    title:"Как работает <em>банкомат?</em>",
    lead:"Это не видео, а сам банкомат. Вращайте его, загляните внутрь и нажмите на любую деталь, чтобы узнать, что она делает.",
    labTitle:"Интерактивная 3D-модель", hint:"Проведите, чтобы вращать · нажмите на деталь", loading:"Загружается 3D-модель…",
    s0:"Карта", s1:"PIN", s2:"Банк", s3:"Счёт", s4:"Деньги",
    pause:"⏸ Пауза", play:"▶ Запустить", step:"Следующий шаг ▸", xray:"Заглянуть внутрь", xrayOff:"Закрыть", reset:"Сбросить камеру", speed:"Скорость",
    nowHappening:"Что происходит сейчас", partEyebrow:"Выбранная деталь", partNone:"Ничего не выбрано",
    partHelp:"Нажмите на любую деталь: экран, клавиатура, кассеты, датчик…",
    d0:"Карта втягивается в картридер. Банкомат считывает данные карты через контакты чипа.",
    d1:"Вы вводите PIN-код. Специальный чип внутри клавиатуры сразу шифрует каждую цифру, поэтому открытый код никуда не уходит.",
    d2:"Зашифрованный запрос уходит на сервер банка: карта настоящая, PIN верный, хватает ли денег? Банк мгновенно отвечает одобрением или отказом.",
    d3:"После одобрения ролики по одной вытягивают купюры из кассет. Датчик проверяет толщину и размер каждой.",
    d4:"Отсчитанные деньги подходят к окну выдачи, шторка открывается. Карта возвращается, а банкомат подтверждает операцию банку.",
    scr:{ welcome:"Добро пожаловать", insert:"Вставьте карту", reading:"Чтение карты", pin:"Введите PIN-код", check:"Проверка в банке", ok:"Одобрено", count:"Пересчёт денег", take:"Заберите деньги" },
    h4:"Пять шагов за несколько секунд",
    p4:"Банкомат состоит из двух частей: сверху компьютер, экран и клавиатура, снизу толстый стальной сейф. Сами деньги лежат в кассетах внутри сейфа, а решение принимает не банкомат, а сервер банка.",
    fact:"<b>Интересный факт:</b> первый банкомат заработал в Лондоне в 1967 году. Пластиковых карт тогда не было, люди вставляли специальные бумажные чеки.",
    faqTitle:"Вопросы и ответы",
    q1:"Может ли банкомат выдать две слипшиеся купюры?", a1:"Каждая купюра проходит под датчиком. Если она толще обычного (два листа слиплись), банкомат не выдаёт её, а сбрасывает в отдельный ящик отбраковки и отсчитывает новую.",
    q2:"Почему банкомат иногда оставляет карту себе?", a2:"Если PIN несколько раз введён неверно или карту долго не забирают, банкомат втягивает её обратно ради безопасности. В таком случае обратитесь в свой банк.",
    q3:"Знает ли банкомат мой PIN-код?", a3:"Нет. Чип в клавиатуре сразу шифрует цифры, а проверяет их банк. Ни программа банкомата, ни оператор не видят открытый PIN.",
    ctaTitle:"Какое устройство открыть в 3D следующим?", ctaText:"Выберите следующую интерактивную модель в нашем Telegram-канале.", ctaBtn:"Подписаться на канал",
    related:"Посмотрите и видео", r1:"Как работает банкомат?", r2:"Двигатель",
    parts:{
      screen:["Экран","Показывает, что делать дальше. Во многих банкоматах он сенсорный."],
      reader:["Картридер","Втягивает карту и читает её через контакты чипа или магнитную полосу. Зелёный огонёк показывает, куда вставлять карту."],
      keypad:["PIN-клавиатура","Внутри стоит шифрующий чип. Каждая цифра шифруется в момент нажатия, поэтому PIN никогда не передаётся в открытом виде."],
      dispenser:["Окно выдачи","Сюда приходят отсчитанные купюры. Шторка открывается, только когда деньги готовы, и втягивает их обратно, если их не забрали."],
      cassettes:["Кассеты","Ящики внутри сейфа, в каждом купюры одного номинала. Инкассаторы меняют их целиком."],
      rollers:["Ролики","Резиновые ролики и ремни по одной вытягивают купюры из кассеты и везут к окну выдачи."],
      sensor:["Датчик","Измеряет толщину и размер каждой купюры. Если два листа слиплись или купюра порвана, она уходит в ящик отбраковки."],
      safe:["Сейф","Нижняя часть банкомата из толстой стали. Здесь стоят кассеты с деньгами."],
      cabinet:["Верхняя часть","Здесь компьютер, экран, клавиатура и картридер. Денег тут нет."],
      card:["Банковская карта","Её чип хранит номер карты и секретные ключи. Для каждой операции он создаёт новый код, поэтому карту трудно скопировать."],
      server:["Сервер банка","Принимает настоящее решение: проверяет карту, PIN и баланс и мгновенно отвечает."]
    }
  }
};

(function(){
  const T = window.ATM_T, I = window.BQI;
  function paint(lang){
    const t = T[lang] || T.en;
    document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (t[k] != null) el.textContent = t[k]; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; if (t[k] != null) el.innerHTML = t[k]; });
  }
  paint(I ? I.lang : 'en');
  if (I) I.on(paint);
})();
