/* 3D dvigatel sahifasi matnlari (EN / UZ / RU).
   Oddiy skript: 3D kutubxona yuklanishini kutmasdan sahifa matnini darhol tarjima qiladi. */
window.ENGINE_T = {
  uz: {
    crumbHome:"Bosh sahifa", crumbLab:"3D laboratoriya", crumbEngine:"Dvigatel",
    title:"Dvigatel qanday <em>ishlaydi?</em>",
    lead:"Bu videoni emas, dvigatelning o'zini ko'ryapsiz. Barmoq bilan aylantiring, qismlarga ajrating va istalgan detalni bosib, u nima ish qilishini o'qing.",
    labTitle:"Interaktiv 3D model", hint:"Aylantirish uchun suring · qismni bilish uchun bosing", loading:"3D model yuklanmoqda…",
    loadFail:"3D model yuklanmadi. Internetni tekshirib, sahifani yangilang.",
    s0:"So'rish", s1:"Siqish", s2:"Ish yo'li", s3:"Chiqarish",
    pause:"⏸ To'xtatish", play:"▶ Ishga tushirish", step:"Keyingi takt ▸", explode:"Ochib ko'rish", assemble:"Yig'ish", reset:"Kamerani tiklash", speed:"Tezlik",
    nowHappening:"Hozir nima bo'lyapti", partEyebrow:"Tanlangan qism", partNone:"Hech narsa tanlanmagan",
    partHelp:"Modeldagi istalgan qismni bosing: porshen, shatun, klapan, sham…",
    d0:"Porshen pastga tushadi, so'rish klapani ochiq. Silindrga havo va yoqilg'i aralashmasi kiradi.",
    d1:"Ikkala klapan yopiq. Porshen yuqoriga ko'tarilib, aralashmani taxminan 10 baravar kichik hajmga siqadi.",
    d2:"Sham uchqun beradi, aralashma yonib, gaz keskin kengayadi va porshenni kuch bilan pastga itaradi. Faqat shu takt kuch beradi.",
    d3:"Chiqarish klapani ochiladi, porshen yuqoriga ko'tarilib, yongan gazni silindrdan quvurga haydab chiqaradi.",
    h4:"To'rt takt, bitta sikl",
    p4:"Porshen silindr ichida yuqoriga va pastga yuradi. Har bir yurish \"takt\" deyiladi. To'rtta takt bitta to'liq siklni tashkil qiladi va shu vaqtda tirsakli val ikki marta aylanadi.",
    fact:"<b>Qiziq fakt:</b> 3000 ayl/daq tezlikda har bir silindrda uchqun sekundiga 25 marta chaqnaydi.",
    faqTitle:"Savol-javob",
    q1:"Nega dvigatel 4 taktli deyiladi?", a1:"Porshen bir ish siklida to'rt marta yuradi: pastga (so'rish), yuqoriga (siqish), pastga (ish yo'li) va yuqoriga (chiqarish). Shu to'rt harakat davomida tirsakli val ikki marta aylanadi.",
    q2:"Taqsimlash vali nega sekinroq aylanadi?", a2:"Har bir klapan bir siklda faqat bir marta ochilishi kerak, sikl esa tirsakli valning ikki aylanishiga teng. Shuning uchun taqsimlash vali ikki baravar sekin aylanadi. Modelda buni o'zingiz sanab ko'ring.",
    q3:"Maxovik nima uchun kerak?", a3:"To'rt taktdan faqat bittasi kuch beradi. Og'ir maxovik ish yo'lida aylanish kuchini to'plab oladi va qolgan uch taktda valni bir tekis aylantirib turadi.",
    ctaTitle:"Qaysi qurilmani 3D'da ochaylik?", ctaText:"Telegram kanalimizda keyingi interaktiv modelni o'zingiz tanlang.", ctaBtn:"Kanalga qo'shilish",
    related:"Videolarni ham ko'ring", r1:"Telefon zaryadlovchisi qanday ishlaydi?", r2:"Kir mashina qanday ishlaydi?",
    parts:{
      piston:["Porshen","Silindr ichida yuqoriga-pastga yuradigan metall \"stakan\". Yonayotgan gaz uni pastga itaradi, ustidagi halqalar esa gaz pastga sizib ketmasligini ta'minlaydi."],
      rod:["Shatun","Porshenni tirsakli val bilan bog'laydi. Porshenning to'g'ri chiziqli harakatini valning aylanma harakatiga aylantiradi."],
      crank:["Tirsakli val","Dvigatelning \"o'q\"i. Shatun uni aylantiradi, aylanish esa uzatmalar qutisi orqali g'ildiraklarga boradi. Qarama-qarshi tomondagi og'irliklar tebranishni kamaytiradi."],
      flywheel:["Maxovik","Og'ir disk. Ish yo'lida energiyani to'plab, qolgan uch taktda valni bir tekis aylantirib turadi."],
      cylinder:["Silindr","Porshen yuradigan quvur. Yonish aynan shu yerda, porshen va kallak orasida sodir bo'ladi. Atrofidagi qovurg'alar issiqni tarqatadi."],
      head:["Silindr kallagi","Silindrni ustidan yopadi. Unda klapanlar, sham va havo kirib-chiqadigan yo'llar joylashgan."],
      intake:["So'rish klapani","Havo-yoqilg'i aralashmasini silindrga kiritadi. Faqat 1-taktda ochiladi, qolgan vaqtda prujina uni yopiq ushlaydi."],
      exhaust:["Chiqarish klapani","Yongan gazni silindrdan chiqarib yuboradi. Faqat 4-taktda ochiladi. Eng issiq qism, 700°C dan ham qiziydi."],
      cams:["Taqsimlash vallari","Ulardagi \"tuxumsimon\" kulachoklar klapanlarni o'z vaqtida bosib ochadi. Tirsakli valdan ikki baravar sekin aylanadi."],
      plug:["O't oldirish shami","Elektrodlari orasida kuchli uchqun chiqaradi va siqilgan aralashmani yondiradi. Uchqun 3-takt boshida, porshen eng yuqorida bo'lganda chaqnaydi."],
      crankcase:["Karter","Tirsakli valni o'rab turadigan korpus. Pastida moy saqlanadi, u ishqalanayotgan qismlarni moylaydi."],
      inPipe:["So'rish quvuri","Havo filtrdan o'tib, shu yo'l orqali klapanga keladi. Yoqilg'i forsunkasi aralashmani shu yerda hosil qiladi."],
      exPipe:["Chiqarish quvuri","Yongan gaz shu yerdan glushitel tomon chiqib ketadi."]
    }
  },
  en: {
    crumbHome:"Home", crumbLab:"3D Lab", crumbEngine:"Engine",
    title:"How does an engine <em>work?</em>",
    lead:"This isn't a video, it's the engine itself. Drag to rotate, take it apart, and tap any part to read what it does.",
    labTitle:"Interactive 3D model", hint:"Drag to rotate · tap a part to identify it", loading:"Loading 3D model…",
    loadFail:"The 3D model didn't load. Check your connection and refresh the page.",
    s0:"Intake", s1:"Compression", s2:"Power", s3:"Exhaust",
    pause:"⏸ Pause", play:"▶ Play", step:"Next stroke ▸", explode:"Exploded view", assemble:"Assemble", reset:"Reset camera", speed:"Speed",
    nowHappening:"What's happening now", partEyebrow:"Selected part", partNone:"Nothing selected",
    partHelp:"Tap any part of the model: piston, rod, valve, spark plug…",
    d0:"The piston moves down with the intake valve open, drawing an air–fuel mixture into the cylinder.",
    d1:"Both valves are closed. The piston rises and squeezes the mixture into about a tenth of its volume.",
    d2:"The spark plug fires, the mixture burns, and the expanding gas forces the piston down. This is the only stroke that makes power.",
    d3:"The exhaust valve opens and the rising piston pushes the burnt gas out of the cylinder into the exhaust pipe.",
    h4:"Four strokes, one cycle",
    p4:"The piston slides up and down inside the cylinder. Each trip is called a \"stroke\". Four strokes make one full cycle, and during that cycle the crankshaft turns twice.",
    fact:"<b>Fun fact:</b> at 3,000 rpm, the spark in each cylinder fires 25 times every second.",
    faqTitle:"Questions",
    q1:"Why is it called a four-stroke engine?", a1:"The piston travels four times per cycle: down (intake), up (compression), down (power) and up (exhaust). Over those four strokes the crankshaft makes two full turns.",
    q2:"Why does the camshaft turn slower?", a2:"Each valve must open only once per cycle, and a cycle takes two crankshaft turns. So the camshaft turns at half crankshaft speed. Count it yourself on the model.",
    q3:"What is the flywheel for?", a3:"Only one stroke out of four makes power. The heavy flywheel stores energy during the power stroke and keeps the shaft turning smoothly through the other three.",
    ctaTitle:"Which device should we open up in 3D next?", ctaText:"Pick the next interactive model in our Telegram channel.", ctaBtn:"Join the channel",
    related:"Watch the videos too", r1:"How does a phone charger work?", r2:"How does a washing machine work?",
    parts:{
      piston:["Piston","A metal cup that slides up and down in the cylinder. Burning gas pushes it down; the rings around its top stop gas leaking past."],
      rod:["Connecting rod","Links the piston to the crankshaft, turning the piston's straight-line motion into rotation."],
      crank:["Crankshaft","The engine's main shaft. The rod spins it, and its rotation goes through the gearbox to the wheels. The counterweights reduce vibration."],
      flywheel:["Flywheel","A heavy disc that stores energy on the power stroke and keeps the shaft turning smoothly through the other three."],
      cylinder:["Cylinder","The tube the piston moves in. Combustion happens here, between the piston and the head. The fins shed heat."],
      head:["Cylinder head","Closes the top of the cylinder and holds the valves, the spark plug and the intake and exhaust ports."],
      intake:["Intake valve","Lets the air–fuel mixture into the cylinder. It opens only on stroke 1; a spring holds it shut the rest of the time."],
      exhaust:["Exhaust valve","Lets burnt gas out. It opens only on stroke 4 and is the hottest part, often above 700°C."],
      cams:["Camshafts","Their egg-shaped lobes push the valves open at exactly the right moment. They turn at half crankshaft speed."],
      plug:["Spark plug","Makes a strong spark between its electrodes to ignite the compressed mixture. It fires at the start of stroke 3, with the piston at the top."],
      crankcase:["Crankcase","The housing around the crankshaft. Oil collects at the bottom and lubricates the moving parts."],
      inPipe:["Intake port","Filtered air comes through here to the valve; the fuel injector forms the mixture here."],
      exPipe:["Exhaust port","Burnt gas leaves through here toward the muffler."]
    }
  },
  ru: {
    crumbHome:"Главная", crumbLab:"3D-лаборатория", crumbEngine:"Двигатель",
    title:"Как работает <em>двигатель?</em>",
    lead:"Это не видео, а сам двигатель. Вращайте его пальцем, разбирайте на детали и нажимайте на любую, чтобы узнать, что она делает.",
    labTitle:"Интерактивная 3D-модель", hint:"Проведите, чтобы вращать · нажмите на деталь", loading:"Загрузка 3D-модели…",
    loadFail:"3D-модель не загрузилась. Проверьте интернет и обновите страницу.",
    s0:"Впуск", s1:"Сжатие", s2:"Рабочий ход", s3:"Выпуск",
    pause:"⏸ Пауза", play:"▶ Запустить", step:"Следующий такт ▸", explode:"Разобрать", assemble:"Собрать", reset:"Сбросить камеру", speed:"Скорость",
    nowHappening:"Что происходит сейчас", partEyebrow:"Выбранная деталь", partNone:"Ничего не выбрано",
    partHelp:"Нажмите на любую деталь модели: поршень, шатун, клапан, свечу…",
    d0:"Поршень идёт вниз, впускной клапан открыт. В цилиндр поступает смесь воздуха и топлива.",
    d1:"Оба клапана закрыты. Поршень поднимается и сжимает смесь примерно в 10 раз.",
    d2:"Свеча даёт искру, смесь сгорает, газ резко расширяется и с силой толкает поршень вниз. Только этот такт даёт мощность.",
    d3:"Выпускной клапан открывается, поршень поднимается и выталкивает сгоревшие газы из цилиндра в выхлопную трубу.",
    h4:"Четыре такта — один цикл",
    p4:"Поршень движется в цилиндре вверх и вниз. Каждый такой ход называется «тактом». Четыре такта составляют один полный цикл, и за это время коленчатый вал делает два оборота.",
    fact:"<b>Интересный факт:</b> на 3000 об/мин искра в каждом цилиндре вспыхивает 25 раз в секунду.",
    faqTitle:"Вопросы и ответы",
    q1:"Почему двигатель называют четырёхтактным?", a1:"За один цикл поршень проходит четыре хода: вниз (впуск), вверх (сжатие), вниз (рабочий ход) и вверх (выпуск). За эти четыре хода коленчатый вал делает два оборота.",
    q2:"Почему распредвал вращается медленнее?", a2:"Каждый клапан должен открыться только один раз за цикл, а цикл — это два оборота коленвала. Поэтому распредвал вращается в два раза медленнее. Посчитайте сами на модели.",
    q3:"Зачем нужен маховик?", a3:"Только один такт из четырёх даёт мощность. Тяжёлый маховик накапливает энергию на рабочем ходе и равномерно вращает вал в остальные три такта.",
    ctaTitle:"Какое устройство разобрать в 3D следующим?", ctaText:"Выберите следующую интерактивную модель в нашем Telegram-канале.", ctaBtn:"Подписаться на канал",
    related:"Смотрите также видео", r1:"Как работает зарядка для телефона?", r2:"Как работает стиральная машина?",
    parts:{
      piston:["Поршень","Металлический «стакан», который ходит вверх-вниз в цилиндре. Горящий газ толкает его вниз, а кольца сверху не дают газу просочиться."],
      rod:["Шатун","Соединяет поршень с коленвалом и превращает прямолинейное движение поршня во вращение вала."],
      crank:["Коленчатый вал","Главный вал двигателя. Шатун вращает его, а вращение через коробку передач идёт на колёса. Противовесы уменьшают вибрацию."],
      flywheel:["Маховик","Тяжёлый диск. Накапливает энергию на рабочем ходе и равномерно вращает вал в остальные три такта."],
      cylinder:["Цилиндр","Труба, в которой ходит поршень. Сгорание происходит именно здесь, между поршнем и головкой. Рёбра отводят тепло."],
      head:["Головка цилиндра","Закрывает цилиндр сверху. В ней находятся клапаны, свеча и каналы для впуска и выпуска."],
      intake:["Впускной клапан","Впускает топливовоздушную смесь в цилиндр. Открывается только в 1-м такте, остальное время пружина держит его закрытым."],
      exhaust:["Выпускной клапан","Выпускает сгоревшие газы. Открывается только в 4-м такте. Самая горячая деталь — нагревается выше 700°C."],
      cams:["Распределительные валы","Их кулачки в форме яйца вовремя нажимают на клапаны и открывают их. Вращаются в два раза медленнее коленвала."],
      plug:["Свеча зажигания","Даёт мощную искру между электродами и поджигает сжатую смесь. Искра вспыхивает в начале 3-го такта, когда поршень в верхней точке."],
      crankcase:["Картер","Корпус вокруг коленвала. Внизу собирается масло, которое смазывает трущиеся детали."],
      inPipe:["Впускной канал","Очищенный воздух идёт по нему к клапану; здесь форсунка образует топливную смесь."],
      exPipe:["Выпускной канал","Через него сгоревшие газы уходят к глушителю."]
    }
  }
};

(function(){
  const T = window.ENGINE_T, I = window.BQI;
  function paint(lang){
    const t = T[lang] || T.en;
    document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (t[k] != null) el.textContent = t[k]; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; if (t[k] != null) el.innerHTML = t[k]; });
  }
  paint(I ? I.lang : 'en');
  if (I) I.on(paint);
})();
