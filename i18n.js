/* Sayt tillari: English (standart), O'zbekcha, Русский.
   HTML ichidagi asl matn o'zbekcha. data-t="kalit" bo'lgan elementlar tanlangan tilga almashtiriladi
   (o'zbekchada asl matn qaytariladi). data-t-aria="kalit" aria-label uchun.
   Sahifa sarlavhasi: <body data-title="kalit">. Tanlov localStorage'da "bqi-lang" ichida saqlanadi. */
(function(){
const LANGS = [
  { id: 'en', name: 'English',  flag: 'gb' },
  { id: 'uz', name: "O'zbekcha", flag: 'uz' },
  { id: 'ru', name: 'Русский',  flag: 'ru' }
];

const D = {
/* ---------- O'zbekcha: faqat skript yozadigan dinamik matnlar ---------- */
uz: {
  'lang.label': 'Til',
  'app.g0': 'Xayrli tun', 'app.g1': 'Xayrli tong', 'app.g2': 'Xayrli kun', 'app.g3': 'Xayrli kech',
  'app.count': '{n} ta video', 'app.countSeen': " · {s} tasi ko'rildi",
  'app.want': '☆ Kutaman', 'app.wanted': '★ Kutyapman', 'app.onList': "Ro'yxatingizda",
  'app.soon': 'Tez kunda',
  'app.ios': 'Safari\'da pastdagi <b>Ulashish</b> tugmasini, keyin <b>"Bosh ekranga qo\'shish"</b> ni bosing.',
  'app.dlPlain': 'Yuklab olinmoqda… Fayl "Yuklanmalar" papkasida bo\'ladi.', 'app.dlCancel': 'Bekor qilindi.',
  'app.dlPrep': 'Video tayyorlanmoqda…', 'app.dlAgain': 'Saqlash uchun yana bosing',
  'app.dlHint': 'Ochilgan oynada "Videoni saqlash" (Save Video) ni tanlang.', 'app.dlFail': "Video yuklanmadi, internetni tekshirib qayta bosing."
},

/* ---------- English ---------- */
en: {
  'lang.label': 'Language',
  'app.g0': 'Good night', 'app.g1': 'Good morning', 'app.g2': 'Good afternoon', 'app.g3': 'Good evening',
  'app.count': '{n} videos', 'app.countSeen': ' · {s} watched',
  'app.want': '☆ I want this', 'app.wanted': '★ Waiting', 'app.onList': 'On your list',
  'app.soon': 'Coming soon',
  'app.ios': 'In Safari, tap <b>Share</b> at the bottom, then <b>"Add to Home Screen"</b>.',
  'app.dlPlain': 'Downloading… The file will be in your "Downloads" folder.', 'app.dlCancel': 'Cancelled.',
  'app.dlPrep': 'Preparing the video…', 'app.dlAgain': 'Tap again to save',
  'app.dlHint': 'In the window that opens, choose "Save Video".', 'app.dlFail': "The video didn't load. Check your connection and tap again.",

  'tab.home': 'Home', 'tab.videos': 'Videos', 'tab.lab': '3D Lab', 'tab.topics': 'Topics', 'tab.contact': 'Contact',
  'crumb.home': 'Home',
  'badge.new': 'New', 'badge.seen': '✓ Watched',
  'dl.btn': 'Download',
  'more': 'Full explanation →',
  'h.sum': 'In short', 'h.steps': 'Step by step', 'h.faq': 'Frequently asked questions',
  'cta.v.t': 'What should the next video be?', 'cta.v.p': 'Join our Telegram channel and pick the next topic yourself.', 'cta.btn': 'Join the channel',
  'rel.title': 'Watch next', 'rel.m43': '3D video · 0:43', 'rel.m30': '3D video · 0:30',
  'v1.t': 'How does a phone charger work?', 'v2.t': 'How does a washing machine work?',
  'v1.aria': 'Watch the charger video', 'v2.aria': 'Watch the washing machine video',
  'v2.tag': '1200 rpm',

  /* Bosh sahifa */
  'meta.home': 'How It Works — 3D explainer videos and interactive models',
  'w.title': "Welcome! Let's see how things work",
  'w.text': 'We open up everyday technology in 3D animation and show what really happens inside.',
  'w.go': 'Enter', 'w.small': "It'll be fun with us ⚙️",
  'hero.hello': 'Welcome',
  'hero.h1': 'How does it <em>work?</em>',
  'hero.lead': 'What really happens inside the things you use every day? We show every part in 3D, short and clear.',
  'door.v.t': 'Videos', 'door.v.d': 'Short 3D videos with detailed explanations',
  'door.l.t': '3D Lab', 'door.l.d': 'Rotate and take things apart yourself',
  'door.go': 'Open →',
  'about.t': 'About us', 'about.sub': 'We make complicated things simple.',
  'about.p': '“Bu qanday ishlaydi?” means “How does it work?” in Uzbek. It is a popular-science project: using 3D animation, we show what really happens inside the charger in your hand, the washing machine at home or the engine in your car.',
  'how1.b': '🎯 One question', 'how1.s': 'Each video answers one simple question.',
  'how2.b': '🧩 3D animation', 'how2.s': 'We show the device from the inside, part by part.',
  'how3.b': '⏱ Short', 'how3.s': 'The main idea in under a minute.',
  'how4.b': '📖 Full write-up', 'how4.s': 'Every video has a page with a full explanation.',
  'how5.b': '🖐 3D Lab', 'how5.s': 'Rotate the device and open it up yourself.',
  'v.title': 'Videos', 'v.sub': 'Tap a cover to watch; the full explanation is on its page.',
  'v1.d': 'How 220 V safely becomes 5 V: bridge rectifier, capacitor, transistor and transformer.',
  'v2.d': 'From filling to spinning: valve, heater, drum paddles, pump and 1,200 turns a minute.',
  'lab.title': '3D Lab', 'lab.sub': 'Not a video but the object itself: rotate it, open it up, tap any part to learn about it.',
  'lab1.t': 'Car engine', 'lab1.d': 'A four-stroke combustion engine: piston, connecting rod, crankshaft, valves and spark plug.',
  'lab.tagI': 'Interactive', 'lab1.tag': '4-stroke', 'lab.open': 'Open →', 'lab.soon': 'Coming soon',
  'lab2.t': 'Gearbox', 'lab2.d': 'How gears change speed and torque.',
  'lab3.t': 'Fridge compressor', 'lab3.d': 'How a piston pumps heat out of the fridge.',
  'm.title': 'Coming next', 'm.sub': "Videos in the works. Mark the ones you're waiting for.",
  't1.b': 'Refrigerator', 't1.s': 'Where does the cold come from, and where does the heat go?',
  't2.b': 'Microwave oven', 't2.s': 'How does it heat food from the inside?',
  't3.b': 'Air conditioner', 't3.s': 'How does it cool a room?',
  't4.b': 'Vacuum cleaner', 't4.s': 'How does it suck up air?',
  'm.note': 'Have a topic in mind? Write to us in the <a href="#aloqa">Contact</a> section.',
  'a.title': 'Contact', 'a.sub': 'Write to us with questions, ideas or new topics.',
  'a.tg': 'New videos and polls',
  'inst.p': 'Install the site on your phone like an app — one tap to open.', 'inst.btn': 'Install',

  /* Zaryadlovchi */
  'meta.z': 'How does a phone charger work? 220 V to 5 V in 3D | Bu qanday ishlaydi?',
  'z.crumb': 'Charger',
  'z.h1': 'How does a phone charger <em>work?</em>',
  'z.lead': 'The wall socket gives 220 volts, but a phone needs only 5. How does a small white box bridge that gap? Watch the video; below, every stage is explained in plain words.',
  'z.p': "A charger doesn't drop the voltage in one go. First it turns alternating current into direct current, then it “chops” it very fast and steps it down to 5 volts through a tiny transformer. The final job is done by the phone itself: it controls how much current goes into the battery.",
  'z.s1.h': 'The socket', 'z.s1.p': 'The socket supplies <span class="num">220 V</span> alternating current. Its direction flips back and forth <span class="num">50</span> times a second. A phone battery can\'t charge from that.',
  'z.s2.h': 'Rectifying: the diode bridge', 'z.s2.p': 'A “bridge” of four diodes lets current flow in one direction only. Now the current no longer flows backwards, but it is still “wavy”. Its peak is about <span class="num">310 V</span> (220 × 1.41).',
  'z.s3.h': 'Smoothing: the capacitor', 'z.s3.p': 'A large capacitor stores charge as the voltage rises and gives it back as it falls. This smooths the waves into an almost flat <span class="num">≈310 V</span> DC.',
  'z.s4.h': 'The switching transistor', 'z.s4.p': 'A small control chip switches the transistor on and off about <span class="num">100,000</span> times a second (100 kHz). Current reaches the transformer in very frequent, short “bursts”.',
  'z.s5.h': 'The transformer', 'z.s5.p': 'A two-coil transformer steps the voltage down to <span class="num">5 V</span>. Most importantly, its coils never touch: energy crosses through a magnetic field, so the dangerous mains voltage can never reach your phone directly.',
  'z.s6.h': 'Output and feedback', 'z.s6.p': 'At the output, another diode and capacitor smooth the current. A sensor constantly measures the voltage and tells the control chip “too high” or “too low”, so it stays at a steady 5 V.',
  'z.s7.h': 'Control inside the phone', 'z.s7.p': 'The charging chip in the phone fills the battery quickly at first, then slows down as it nears <span class="num">4.2 V</span>. Once the battery is full it stops the current and protects it from overheating.',
  'z.fact': "<b>Fun fact:</b> old chargers were big and heavy because their transformers ran at 50 Hz. Modern ones run at 100 kHz, and the higher the frequency, the smaller the transformer can be. That's why a charger now fits in your palm.",
  'z.q1': 'Why does a charger get warm?', 'z.a1': 'When the voltage is converted, some of the energy turns into heat in the diodes, transistor and transformer. Modern chargers deliver about 85–90% of the energy to the phone; the rest becomes heat. Being warm is normal; if it gets very hot, stop using it.',
  'z.q2': 'Why are chargers so small today?', 'z.a2': 'The switching transistor turns the current on and off tens to hundreds of thousands of times a second. The higher the frequency, the smaller the transformer can be. Old chargers ran at 50 Hz, which is why they were big and heavy.',
  'z.q3': 'Is it bad to leave a phone charging overnight?', 'z.a3': "The phone's charging chip almost completely stops the current once the battery is full, so there's no overcharging. The main danger for the battery is heat: don't charge your phone under a pillow or in a hot place.",
  'z.q4': 'How does fast charging work?', 'z.a4': 'The phone and charger negotiate over the cable, and then the charger supplies 9 V or more instead of 5 V. That way more energy reaches the battery in the same amount of time.',

  /* Kir mashina */
  'meta.k': 'How does a washing machine work? From filling to spin, in 3D | Bu qanday ishlaydi?',
  'k.crumb': 'Washing machine',
  'k.h1': 'How does a washing machine <em>work?</em>',
  'k.lead': 'You press a button, and an hour later the laundry is clean and almost dry. In between, five stages happen inside the machine. Watch the video; below, each one is explained in plain words.',
  'k.p': 'A washing machine really does three simple jobs in turn: it lets water in, tumbles the laundry and pumps the water out. A small computer — the control board — runs all of it based on readings from its sensors.',
  'k.s1.h': 'Filling', 'k.s1.p': 'A solenoid valve opens and tap water flows through the detergent drawer, carrying the powder into the drum. As soon as the pressure sensor detects enough water, the valve closes.',
  'k.s2.h': 'Heating', 'k.s2.p': 'An electric heating element under the tub heats the water to the chosen temperature, for example <span class="num">40°C</span>. A temperature sensor switches the heater off once the water is hot enough.',
  'k.s3.h': 'Washing', 'k.s3.p': 'The drum turns slowly one way, then the other. Paddles inside lift the laundry and drop it into the water. This tumbling and rubbing, together with the detergent, loosens dirt from the fibres.',
  'k.s4.h': 'Rinsing', 'k.s4.p': 'The pump drains the dirty water, then clean water flows in. This repeats several times. On the last rinse the water runs through the fabric-softener compartment.',
  'k.s5.h': 'Spinning', 'k.s5.p': 'The drum spins at up to <span class="num">1,200</span> turns a minute. Centrifugal force flings the water out through the holes in the drum, leaving the laundry almost dry.',
  'k.fact': '<b>Fun fact:</b> a washing machine is so heavy because of the concrete blocks inside. They damp the strong vibration during the spin, while shock absorbers and springs keep the tub “suspended”. Without them, the machine would walk across the room at 1,200 rpm.',
  'k.q1': 'Why does the door lock?', 'k.a1': "An electric lock closes so the door can't open while there's water and a spinning drum inside. After the wash, the lock needs 1–2 minutes to cool down before it releases.",
  'k.q2': 'Why does the machine jump during the spin?', 'k.a2': 'If the laundry bunches up on one side of the drum, the balance is lost at high speed. When the machine senses this, it tries to redistribute the load. Standing the machine level and not loading too little or too much helps.',
  'k.q3': 'How does the machine know how much water to take?', 'k.a3': "There's a pressure sensor at the bottom of the tub. The more water there is, the harder the air inside is squeezed. The sensor measures that pressure and closes the valve at the right level.",
  'k.q4': 'Which compartment does the detergent go in?', 'k.a4': 'Usually II is for the main wash, I is for the pre-wash, and the flower symbol is for fabric softener. Water passes through the right compartment at exactly the right stage and carries its contents into the drum.',

  /* 3D dvigatel sahifasi sarlavhasi va 404 */
  'meta.e': 'How does an engine work? Interactive 3D four-stroke engine | Bu qanday ishlaydi?',
  'nf.h1': 'Where is <em>this page?</em>', 'nf.lead': "Sorry, this page doesn't exist. But 3D videos and models are waiting for you on the home page.", 'nf.btn': 'Go to home page'
},

/* ---------- Русский ---------- */
ru: {
  'lang.label': 'Язык',
  'app.g0': 'Доброй ночи', 'app.g1': 'Доброе утро', 'app.g2': 'Добрый день', 'app.g3': 'Добрый вечер',
  'app.count': '{n} видео', 'app.countSeen': ' · просмотрено: {s}',
  'app.want': '☆ Хочу', 'app.wanted': '★ Жду', 'app.onList': 'В вашем списке',
  'app.soon': 'Скоро',
  'app.ios': 'В Safari нажмите <b>Поделиться</b> внизу, затем <b>«На экран „Домой“»</b>.',
  'app.dlPlain': 'Загрузка… Файл появится в папке «Загрузки».', 'app.dlCancel': 'Отменено.',
  'app.dlPrep': 'Подготовка видео…', 'app.dlAgain': 'Нажмите ещё раз, чтобы сохранить',
  'app.dlHint': 'В открывшемся окне выберите «Сохранить видео».', 'app.dlFail': 'Видео не загрузилось. Проверьте интернет и нажмите ещё раз.',

  'tab.home': 'Главная', 'tab.videos': 'Видео', 'tab.lab': '3D-лаб', 'tab.topics': 'Темы', 'tab.contact': 'Контакты',
  'crumb.home': 'Главная',
  'badge.new': 'Новое', 'badge.seen': '✓ Просмотрено',
  'dl.btn': 'Скачать',
  'more': 'Подробное объяснение →',
  'h.sum': 'Коротко', 'h.steps': 'Шаг за шагом', 'h.faq': 'Частые вопросы',
  'cta.v.t': 'Каким будет следующее видео?', 'cta.v.p': 'Подписывайтесь на наш Telegram-канал и выбирайте следующую тему сами.', 'cta.btn': 'Подписаться на канал',
  'rel.title': 'Смотрите также', 'rel.m43': '3D-видео · 0:43', 'rel.m30': '3D-видео · 0:30',
  'v1.t': 'Как работает зарядка для телефона?', 'v2.t': 'Как работает стиральная машина?',
  'v1.aria': 'Смотреть видео о зарядке', 'v2.aria': 'Смотреть видео о стиральной машине',
  'v2.tag': '1200 об/мин',

  'meta.home': 'Как это работает — 3D-видео и интерактивные модели',
  'w.title': 'Добро пожаловать! Узнаем, как всё устроено',
  'w.text': 'Показываем в 3D-анимации, что на самом деле происходит внутри привычной техники.',
  'w.go': 'Войти', 'w.small': 'С нами будет интересно ⚙️',
  'hero.hello': 'Добро пожаловать',
  'hero.h1': 'Как это <em>работает?</em>',
  'hero.lead': 'Что на самом деле происходит внутри вещей, которыми мы пользуемся каждый день? Показываем каждую деталь в 3D — коротко и понятно.',
  'door.v.t': 'Видео', 'door.v.d': 'Короткие 3D-видео с подробными объяснениями',
  'door.l.t': '3D-лаборатория', 'door.l.d': 'Вращайте и разбирайте устройства сами',
  'door.go': 'Открыть →',
  'about.t': 'О нас', 'about.sub': 'Показываем сложное просто.',
  'about.p': '«Bu qanday ishlaydi?» по-узбекски значит «Как это работает?». Это научно-популярный проект: с помощью 3D-анимации показываем, что на самом деле происходит внутри зарядки в руке, стиральной машины дома или двигателя в машине.',
  'how1.b': '🎯 Один вопрос', 'how1.s': 'Каждое видео отвечает на один простой вопрос.',
  'how2.b': '🧩 3D-анимация', 'how2.s': 'Показываем устройство изнутри, деталь за деталью.',
  'how3.b': '⏱ Коротко', 'how3.s': 'Главная идея меньше чем за минуту.',
  'how4.b': '📖 Подробный текст', 'how4.s': 'У каждого видео есть страница с полным объяснением.',
  'how5.b': '🖐 3D-лаборатория', 'how5.s': 'Вращайте устройство и разбирайте его сами.',
  'v.title': 'Видео', 'v.sub': 'Нажмите на обложку, чтобы смотреть; полное объяснение — на странице видео.',
  'v1.d': 'Как 220 В безопасно превращаются в 5 В: диодный мост, конденсатор, транзистор и трансформатор.',
  'v2.d': 'От набора воды до отжима: клапан, нагреватель, рёбра барабана, насос и 1200 оборотов в минуту.',
  'lab.title': '3D-лаборатория', 'lab.sub': 'Не видео, а сам предмет: вращайте, разбирайте, нажимайте на любую деталь.',
  'lab1.t': 'Двигатель', 'lab1.d': 'Четырёхтактный двигатель внутреннего сгорания: поршень, шатун, коленвал, клапаны и свеча.',
  'lab.tagI': 'Интерактив', 'lab1.tag': '4 такта', 'lab.open': 'Открыть →', 'lab.soon': 'Скоро',
  'lab2.t': 'Коробка передач', 'lab2.d': 'Как шестерни меняют скорость и крутящий момент.',
  'lab3.t': 'Компрессор холодильника', 'lab3.d': 'Как поршень выкачивает тепло из холодильника.',
  'm.title': 'Следующие темы', 'm.sub': 'Видео в работе. Отметьте, какие вы ждёте.',
  't1.b': 'Холодильник', 't1.s': 'Откуда берётся холод и куда уходит тепло?',
  't2.b': 'Микроволновка', 't2.s': 'Как она греет еду изнутри?',
  't3.b': 'Кондиционер', 't3.s': 'Как он охлаждает комнату?',
  't4.b': 'Пылесос', 't4.s': 'Как он всасывает воздух?',
  'm.note': 'Хотите предложить тему? Напишите нам в разделе <a href="#aloqa">Контакты</a>.',
  'a.title': 'Контакты', 'a.sub': 'Пишите с вопросами, идеями или новыми темами.',
  'a.tg': 'Новые видео и опросы',
  'inst.p': 'Установите сайт на телефон как приложение — открывается в одно касание.', 'inst.btn': 'Установить',

  'meta.z': 'Как работает зарядка телефона? 220 В в 5 В в 3D | Bu qanday ishlaydi?',
  'z.crumb': 'Зарядка',
  'z.h1': 'Как работает <em>зарядка?</em>',
  'z.lead': 'В розетке 220 вольт, а телефону нужно всего 5. Как маленький белый блок убирает эту разницу? Посмотрите видео, а ниже каждый этап объяснён простыми словами.',
  'z.p': 'Зарядка не понижает напряжение за один раз. Сначала она превращает переменный ток в постоянный, затем очень быстро «нарезает» его и через крошечный трансформатор понижает до 5 вольт. Последнюю работу делает сам телефон: он следит, сколько тока идёт в батарею.',
  'z.s1.h': 'Розетка', 'z.s1.p': 'Из розетки идёт переменный ток <span class="num">220 В</span>. Его направление меняется туда-обратно <span class="num">50</span> раз в секунду. Батарея телефона так не зарядится.',
  'z.s2.h': 'Выпрямление: диодный мост', 'z.s2.p': '«Мост» из четырёх диодов пропускает ток только в одну сторону. Ток больше не течёт обратно, но всё ещё «волнистый». Его пик — около <span class="num">310 В</span> (220 × 1,41).',
  'z.s3.h': 'Сглаживание: конденсатор', 'z.s3.p': 'Большой конденсатор накапливает заряд, когда напряжение растёт, и отдаёт его, когда падает. Волны сглаживаются, и получается почти ровное постоянное напряжение <span class="num">≈310 В</span>.',
  'z.s4.h': 'Ключевой транзистор', 'z.s4.p': 'Маленькая управляющая микросхема включает и выключает транзистор примерно <span class="num">100 000</span> раз в секунду (100 кГц). Ток идёт в трансформатор очень частыми короткими «порциями».',
  'z.s5.h': 'Трансформатор', 'z.s5.p': 'Трансформатор с двумя обмотками понижает напряжение до <span class="num">5 В</span>. Главное — обмотки не касаются друг друга: энергия передаётся через магнитное поле, поэтому опасное сетевое напряжение никогда не попадёт в телефон напрямую.',
  'z.s6.h': 'Выход и обратная связь', 'z.s6.p': 'На выходе ещё один диод и конденсатор сглаживают ток. Датчик постоянно измеряет напряжение и сообщает управляющей микросхеме «много» или «мало», поэтому оно держится на стабильных 5 В.',
  'z.s7.h': 'Контроль внутри телефона', 'z.s7.p': 'Микросхема зарядки в телефоне сначала заряжает батарею быстро, а ближе к <span class="num">4,2 В</span> — медленнее. Когда батарея заполнена, ток прекращается, и она защищена от перегрева.',
  'z.fact': '<b>Интересный факт:</b> старые зарядки были большими и тяжёлыми, потому что их трансформаторы работали на 50 Гц. Современные работают на 100 кГц, а чем выше частота, тем меньше может быть трансформатор. Поэтому зарядка теперь помещается в ладони.',
  'z.q1': 'Почему зарядка нагревается?', 'z.a1': 'При преобразовании напряжения часть энергии превращается в тепло в диодах, транзисторе и трансформаторе. Современные зарядки передают телефону около 85–90% энергии, остальное уходит в тепло. Тёплая зарядка — это нормально, но если она сильно греется, не пользуйтесь ей.',
  'z.q2': 'Почему современные зарядки такие маленькие?', 'z.a2': 'Ключевой транзистор включает и выключает ток десятки и сотни тысяч раз в секунду. Чем выше частота, тем меньше может быть трансформатор. Старые зарядки работали на 50 Гц, поэтому были большими и тяжёлыми.',
  'z.q3': 'Вредно ли оставлять телефон на зарядке на всю ночь?', 'z.a3': 'Микросхема в телефоне почти полностью прекращает ток, когда батарея заполнена, поэтому перезаряда не бывает. Главная опасность для батареи — тепло: не заряжайте телефон под подушкой или в жарком месте.',
  'z.q4': 'Как работает быстрая зарядка?', 'z.a4': 'Телефон и зарядка договариваются через кабель, и зарядка выдаёт 9 В или больше вместо 5 В. Так за то же время в батарею поступает больше энергии.',

  'meta.k': 'Как работает стиральная машина? От набора воды до отжима в 3D | Bu qanday ishlaydi?',
  'k.crumb': 'Стиральная машина',
  'k.h1': 'Как работает <em>стиральная машина?</em>',
  'k.lead': 'Вы нажимаете кнопку, а через час бельё чистое и почти сухое. За это время внутри машины проходит пять этапов. Посмотрите видео, а ниже каждый объяснён простыми словами.',
  'k.p': 'На самом деле стиральная машина по очереди делает три простые вещи: наливает воду, вращает бельё и сливает воду. Всем этим управляет маленький компьютер — плата управления — по данным датчиков.',
  'k.s1.h': 'Набор воды', 'k.s1.p': 'Открывается электромагнитный клапан, и вода из водопровода проходит через лоток с порошком, унося его в барабан. Как только датчик давления определяет, что воды достаточно, клапан закрывается.',
  'k.s2.h': 'Нагрев', 'k.s2.p': 'Электронагреватель (ТЭН) под баком нагревает воду до выбранной температуры, например до <span class="num">40°C</span>. Датчик температуры выключает нагреватель, когда вода нагрелась.',
  'k.s3.h': 'Стирка', 'k.s3.p': 'Барабан медленно вращается то в одну, то в другую сторону. Рёбра внутри поднимают бельё и бросают его в воду. Удары и трение вместе с порошком отделяют грязь от волокон.',
  'k.s4.h': 'Полоскание', 'k.s4.p': 'Насос сливает грязную воду, затем набирается чистая. Это повторяется несколько раз. При последнем полоскании вода проходит через отсек для кондиционера.',
  'k.s5.h': 'Отжим', 'k.s5.p': 'Барабан вращается со скоростью до <span class="num">1200</span> оборотов в минуту. Центробежная сила выбрасывает воду через отверстия в барабане, и бельё становится почти сухим.',
  'k.fact': '<b>Интересный факт:</b> стиральная машина такая тяжёлая из-за бетонных блоков внутри. Они гасят сильную вибрацию при отжиме, а амортизаторы и пружины держат бак «подвешенным». Без них машина на 1200 об/мин уехала бы через всю комнату.',
  'k.q1': 'Почему блокируется дверца?', 'k.a1': 'Электрический замок закрывается, чтобы дверца не открылась, пока внутри вода и вращается барабан. После стирки замку нужно 1–2 минуты, чтобы остыть, и тогда он открывается.',
  'k.q2': 'Почему машина прыгает при отжиме?', 'k.a2': 'Если бельё собралось на одной стороне барабана, на высокой скорости нарушается баланс. Почувствовав это, машина пытается перераспределить бельё. Помогает ровная установка и загрузка не слишком маленькая и не слишком большая.',
  'k.q3': 'Откуда машина знает, сколько воды набрать?', 'k.a3': 'Внизу бака есть датчик давления. Чем больше воды, тем сильнее сжимается воздух внутри. Датчик измеряет это давление и закрывает клапан на нужном уровне.',
  'k.q4': 'В какой отсек класть порошок?', 'k.a4': 'Обычно II — для основной стирки, I — для предварительной, а значок цветка — для кондиционера. Вода проходит через нужный отсек именно на нужном этапе и уносит содержимое в барабан.',

  'meta.e': 'Как работает двигатель? Интерактивная 3D-модель четырёхтактного двигателя | Bu qanday ishlaydi?',
  'nf.h1': 'Где <em>эта страница?</em>', 'nf.lead': 'К сожалению, такой страницы нет. Но на главной вас ждут 3D-видео и модели.', 'nf.btn': 'На главную'
}
};

/* ---------- Mexanizm ---------- */
const root = document.documentElement;
const base = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : './';
let lang = (window.BQI_DEFAULT && LANGS.some(l => l.id === window.BQI_DEFAULT)) ? window.BQI_DEFAULT : 'en';
try { const s = localStorage.getItem('bqi-lang'); if (LANGS.some(l => l.id === s)) lang = s; } catch (e) {}
const subs = [];
const origTitle = document.title;

function t(key){
  const v = D[lang][key];
  if (v != null) return v;
  if (D.en[key] != null && lang !== 'uz') return D.en[key];
  return D.uz[key] != null ? D.uz[key] : key;
}
function apply(){
  root.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => {
    if (el._uz == null) el._uz = el.innerHTML;
    const k = el.dataset.t;
    const v = D[lang][k] != null ? D[lang][k] : (D.uz[k] != null && lang === 'uz' ? D.uz[k] : null);
    el.innerHTML = lang === 'uz' ? (D.uz[k] != null ? D.uz[k] : el._uz) : (v != null ? v : el._uz);
  });
  document.querySelectorAll('[data-t-aria]').forEach(el => {
    if (el._uzAria == null) el._uzAria = el.getAttribute('aria-label') || '';
    const v = D[lang][el.dataset.tAria];
    el.setAttribute('aria-label', lang !== 'uz' && v != null ? v : el._uzAria);
  });
  const tk = document.body && document.body.dataset.title;
  if (tk) document.title = lang !== 'uz' && D[lang][tk] ? D[lang][tk] : origTitle;
  paintPicker();
  subs.forEach(fn => { try { fn(lang); } catch (e) {} });
  root.classList.remove('i18n-wait');
}
function set(l){
  if (!LANGS.some(x => x.id === l) || l === lang) return;
  lang = l; try { localStorage.setItem('bqi-lang', l); } catch (e) {}
  apply();
}

/* ---------- Bayroqli tanlagich (tepadagi panelda) ---------- */
let pick = null;
function buildPicker(){
  const top = document.querySelector('.top');
  if (!top) return;
  top.querySelectorAll('.top-note,.lang').forEach(n => n.remove());
  pick = document.createElement('div');
  pick.className = 'langpick';
  pick.innerHTML =
    '<button type="button" class="lp-btn" aria-haspopup="true" aria-expanded="false"><img alt="" width="22" height="16"><span></span>' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
    '<div class="lp-menu glass" role="menu" hidden>' +
    LANGS.map(l => `<button type="button" role="menuitemradio" data-lang="${l.id}"><img src="${base}img/flags/${l.flag}.svg" alt="" width="24" height="17"><span>${l.name}</span><i aria-hidden="true">✓</i></button>`).join('') +
    '</div>';
  top.appendChild(pick);
  const btn = pick.querySelector('.lp-btn'), menu = pick.querySelector('.lp-menu');
  const open = v => { menu.hidden = !v; btn.setAttribute('aria-expanded', v); pick.classList.toggle('open', v); };
  btn.addEventListener('click', e => { e.stopPropagation(); open(menu.hidden); });
  menu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; set(b.dataset.lang); open(false); btn.focus(); });
  document.addEventListener('click', e => { if (!pick.contains(e.target)) open(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
}
function paintPicker(){
  if (!pick) return;
  const cur = LANGS.find(l => l.id === lang);
  const btn = pick.querySelector('.lp-btn');
  btn.querySelector('img').src = `${base}img/flags/${cur.flag}.svg`;
  btn.querySelector('span').textContent = cur.id.toUpperCase();
  btn.setAttribute('aria-label', `${t('lang.label')}: ${cur.name}`);
  pick.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-checked', b.dataset.lang === lang));
}

window.BQI = { get lang(){ return lang; }, t, set, on(fn){ subs.push(fn); } };
buildPicker();
apply();
})();
