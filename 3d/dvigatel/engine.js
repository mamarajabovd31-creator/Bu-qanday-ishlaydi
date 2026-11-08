// Interaktiv 4 taktli dvigatel (Three.js).
// Sikl burchagi phi: 0..4π (720°). Tirsakli val = phi, taqsimlash vali = phi/2.
// 0–180° so'rish, 180–360° siqish, 360–540° ish yo'li, 540–720° chiqarish.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------------- Matnlar (UZ / EN) ---------------- */
const T = {
  uz: {
    crumbHome:"Bosh sahifa", crumbLab:"3D laboratoriya",
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
    crumbHome:"Home", crumbLab:"3D lab",
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
  }
};
let lang = 'uz';
try { const s = localStorage.getItem('bqi-lang'); if (s === 'en' || s === 'uz') lang = s; } catch (e) {}

const $ = id => document.getElementById(id);
function applyLang(){
  const t = T[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (t[k] != null) el.textContent = t[k]; });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; if (t[k] != null) el.innerHTML = t[k]; });
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  paintButtons(); paintPart(); lastStroke = -1;
}
document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang; try { localStorage.setItem('bqi-lang', lang); } catch (e) {}
  applyLang();
}));

/* ---------------- Sahna ---------------- */
const canvas = $('c'), stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
const HOME = { pos: new THREE.Vector3(7.6, 5.4, 10.6), target: new THREE.Vector3(0, 2.6, 0) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 5; controls.maxDistance = 24;
controls.addEventListener('start', () => { $('hint').classList.add('gone'); });

scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x1a1030, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(5, 9, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0x4fe3ff, 0.9); rim.position.set(-6, 3, -5); scene.add(rim);

/* ---------------- Materiallar ---------------- */
const metal = (c, r = 0.35, m = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const glass = (c, o) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.15, metalness: 0, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false });

/* ---------------- Qismlar ---------------- */
const PARTS = {}; // id -> Group (bosiladigan)
function part(id){
  const g = new THREE.Group(); g.userData.part = id; PARTS[id] = g; scene.add(g);
  g.userData.base = new THREE.Vector3(); return g;
}
function add(g, geo, mat, x = 0, y = 0, z = 0){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
const zCyl = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);

const R = 0.9, L = 2.6, BORE = 0.78, DECK = 4.4;

// Tirsakli val (z o'qi bo'ylab)
const crank = part('crank');
{
  const steel = metal(0x8b97ab, 0.3);
  add(crank, zCyl(0.22, 0.9), steel, 0, 0, 0.85);
  add(crank, zCyl(0.22, 0.6), steel, 0, 0, -0.75);
  const web = new THREE.BoxGeometry(0.62, R + 0.3, 0.16);
  add(crank, web, steel, 0, (R + 0.3) / 2 - 0.15, 0.33);
  add(crank, web, steel, 0, (R + 0.3) / 2 - 0.15, -0.33);
  const cw = new THREE.CylinderGeometry(0.72, 0.72, 0.16, 32, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
  add(crank, cw, metal(0x5d6778, 0.4), 0, 0, 0.33);
  add(crank, cw, metal(0x5d6778, 0.4), 0, 0, -0.33);
  add(crank, zCyl(0.19, 0.5), metal(0xd8dee8, 0.2), 0, R, 0);
}
// Maxovik
const fly = part('flywheel');
{
  const m = metal(0x3b4252, 0.45);
  add(fly, zCyl(1.35, 0.18, 64), m, 0, 0, 0);
  add(fly, new THREE.TorusGeometry(1.35, 0.07, 10, 64), metal(0xffd34d, 0.35), 0, 0, 0.0);
  add(fly, new THREE.BoxGeometry(0.16, 0.5, 0.2), metal(0xffd34d, 0.3), 0, 1.0, 0.02);
  fly.userData.base.set(0, 0, -1.15);
}
// Shatun
const rod = part('rod');
{
  const m = metal(0x6fa8c9, 0.32);
  add(rod, new THREE.TorusGeometry(0.27, 0.09, 12, 32), m, 0, 0, 0);
  add(rod, new THREE.BoxGeometry(0.2, L - 0.5, 0.16), m, 0, L / 2, 0);
  add(rod, new THREE.TorusGeometry(0.17, 0.07, 12, 28), m, 0, L, 0);
}
// Porshen
const piston = part('piston');
{
  add(piston, new THREE.CylinderGeometry(0.74, 0.74, 0.9, 48), metal(0xc9d1dc, 0.28), 0, 0, 0);
  const ring = new THREE.TorusGeometry(0.745, 0.025, 8, 48).rotateX(Math.PI / 2);
  [0.32, 0.22, 0.12].forEach(y => add(piston, ring, metal(0x2b2f38, 0.5), 0, y, 0));
  add(piston, zCyl(0.13, 1.2), metal(0xffd34d, 0.3), 0, -0.1, 0);
}
// Silindr (shaffof)
const cyl = part('cylinder');
{
  add(cyl, new THREE.CylinderGeometry(BORE + 0.02, BORE + 0.02, DECK - 1.3, 48, 1, true), glass(0x9fd8ff, 0.16), 0, (DECK + 1.3) / 2, 0);
  const fin = new THREE.TorusGeometry(1.05, 0.05, 6, 48).rotateX(Math.PI / 2);
  for (let y = 1.7; y < DECK; y += 0.42) add(cyl, fin, glass(0x9fd8ff, 0.22), 0, y, 0);
}
// Karter
const crankcase = part('crankcase');
add(crankcase, new THREE.BoxGeometry(2.6, 2.4, 2.0), glass(0x9b7bff, 0.07), 0, 0.1, 0.1);
// Kallak + quvurlar
const head = part('head');
add(head, new THREE.BoxGeometry(2.3, 0.8, 1.9), glass(0x4fe3ff, 0.13), 0, DECK + 0.4, 0);
const inPipe = part('inPipe');
add(inPipe, new THREE.CylinderGeometry(0.22, 0.22, 1.4, 24).rotateZ(Math.PI / 2), glass(0x4fe3ff, 0.35), -1.75, DECK + 0.45, 0);
const exPipe = part('exPipe');
add(exPipe, new THREE.CylinderGeometry(0.22, 0.22, 1.4, 24).rotateZ(Math.PI / 2), glass(0xff8a3d, 0.35), 1.75, DECK + 0.45, 0);

// Klapanlar (prujina bilan)
const VX = 0.45, STEM = 1.6, LIFT = 0.28;
function valve(id, x, color){
  const g = part(id);
  const m = metal(color, 0.3, 0.7);
  add(g, new THREE.CylinderGeometry(0.26, 0.2, 0.07, 32), m, 0, 0.035, 0);
  add(g, new THREE.CylinderGeometry(0.045, 0.045, STEM, 12), m, 0, STEM / 2, 0);
  add(g, new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), m, 0, STEM - 0.18, 0);
  g.userData.base.set(x, DECK, 0);
  return g;
}
const vIn = valve('intake', -VX, 0x4fe3ff);
const vEx = valve('exhaust', VX, 0xff8a3d);
// Prujinalar (kallakka biriktirilgan, siqiladi)
function spring(){
  const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 * 5; pts.push(new THREE.Vector3(Math.cos(a) * 0.12, i / 120, Math.sin(a) * 0.12)); }
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.018, 6), metal(0xe8ecf2, 0.3));
  return mesh;
}
const sprIn = spring(), sprEx = spring();
vIn.add(sprIn); vEx.add(sprEx);

// Taqsimlash vallari
const CAM_BASE = 0.22, CAM_Y = DECK + STEM + CAM_BASE;
const bump = a => { a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < Math.PI / 4 ? Math.cos(2 * a) : 0; };
const camShape = new THREE.Shape();
for (let i = 0; i <= 96; i++) {
  const a = i / 96 * Math.PI * 2, r = CAM_BASE + LIFT * bump(a);
  i ? camShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : camShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
}
const camGeo = new THREE.ExtrudeGeometry(camShape, { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15);
const cams = part('cams');
function camShaft(x){
  const g = new THREE.Group(); g.position.set(x, CAM_Y, 0);
  add(g, camGeo, metal(0xffd34d, 0.3));
  add(g, zCyl(0.07, 1.8, 16), metal(0x8b97ab, 0.35));
  cams.add(g); return g;
}
const camIn = camShaft(-VX), camEx = camShaft(VX);

// Sham
const plug = part('plug');
{
  add(plug, new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), metal(0xdddddd, 0.3), 0, 0.06, 0);
  add(plug, new THREE.CylinderGeometry(0.09, 0.09, 0.55, 16), metal(0xaab4c4, 0.3), 0, 0.4, 0);
  add(plug, new THREE.CylinderGeometry(0.15, 0.15, 0.22, 6), metal(0xaab4c4, 0.3), 0, 0.78, 0);
  add(plug, new THREE.CylinderGeometry(0.08, 0.1, 0.7, 20), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.35 }), 0, 1.24, 0);
  add(plug, new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), metal(0xc0c6d0, 0.3), 0, 1.66, 0);
  plug.userData.base.set(0, DECK, 0.45);
}
const spark = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0 }));
spark.position.set(0, DECK - 0.03, 0.45); scene.add(spark);
const sparkLight = new THREE.PointLight(0x9fdcff, 0, 4); sparkLight.position.copy(spark.position); scene.add(sparkLight);

// Silindr ichidagi gaz
const gasMat = new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.3, depthWrite: false });
const gas = new THREE.Mesh(new THREE.CylinderGeometry(BORE - 0.01, BORE - 0.01, 1, 40), gasMat);
scene.add(gas);

/* ---------------- Ochib ko'rish siljishlari ---------------- */
const EXPLODE = {
  crankcase: [0, -0.3, -2.4], crank: [0, -1.0, 0], flywheel: [0, -1.0, -0.9], rod: [0, -0.2, 1.6], piston: [0, 0.2, 2.0],
  cylinder: [0, 0.1, -2.4], head: [0, 0.9, -1.2], inPipe: [-0.8, 0.9, -1.2], exPipe: [0.8, 0.9, -1.2],
  intake: [-0.5, 0.6, 1.6], exhaust: [0.5, 0.6, 1.6], cams: [0, 1.5, -0.4], plug: [0, 0.9, 2.3]
};
let explodeT = 0, explodeTarget = 0;

/* ---------------- Holat ---------------- */
let phi = 0, playing = true, speed = 1, stopAt = null;
const BASE_RATE = Math.PI * 4 / 6; // bir sikl 6 soniyada (1×)
if (matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;

const tmp = new THREE.Vector3();
function place(id, x, y, z){
  const g = PARTS[id], o = EXPLODE[id] || [0, 0, 0];
  g.position.set(x + o[0] * explodeT, y + o[1] * explodeT, z + o[2] * explodeT);
}

function update(){
  const th = phi;
  const px = R * Math.sin(th), py = R * Math.cos(th);
  const pinY = py + Math.sqrt(L * L - px * px);
  const pTop = pinY + 0.1 + 0.45;

  place('crank', 0, 0, 0); crank.rotation.z = -th;
  place('flywheel', 0, 0, -1.15); fly.rotation.z = -th;
  const cOff = EXPLODE.crank;
  const pinW = new THREE.Vector3(px + cOff[0] * explodeT, py + cOff[1] * explodeT, cOff[2] * explodeT);
  const pistonPos = [0, pinY + 0.1, 0];
  place('piston', ...pistonPos);
  // Shatun: tirsak bo'ynidan porshen barmog'iga qarab turadi
  const pinTop = tmp.set(piston.position.x, piston.position.y - 0.1, piston.position.z);
  const dx = pinTop.x - pinW.x, dy = pinTop.y - pinW.y;
  const ro = EXPLODE.rod;
  rod.position.set(pinW.x + ro[0] * explodeT, pinW.y + ro[1] * explodeT, pinW.z + ro[2] * explodeT);
  rod.rotation.set(0, 0, Math.atan2(-dx, dy));

  place('cylinder', 0, 0, 0); place('crankcase', 0, 0, 0);
  place('head', 0, 0, 0); place('inPipe', 0, 0, 0); place('exPipe', 0, 0, 0);

  // Kulachoklar: pastga qaragan nuqtadagi profil = klapan ochilishi
  const rIn = -Math.PI / 2 + (phi / 2 - Math.PI / 4);
  const rEx = -Math.PI / 2 + (phi / 2 - 7 * Math.PI / 4);
  camIn.rotation.z = rIn; camEx.rotation.z = rEx;
  const liftIn = LIFT * bump(rIn + Math.PI / 2), liftEx = LIFT * bump(rEx + Math.PI / 2);
  place('cams', 0, 0, 0);
  place('intake', -VX, DECK - liftIn, 0);
  place('exhaust', VX, DECK - liftEx, 0);
  // prujinalar: kallak ustidan (DECK+0.8) tarelkagacha
  for (const [spr, lift] of [[sprIn, liftIn], [sprEx, liftEx]]) {
    const bottom = DECK + 0.8 - (DECK - lift), top = STEM - 0.2;
    spr.position.set(0, bottom, 0); spr.scale.set(1, Math.max(0.05, top - bottom), 1);
  }
  place('plug', 0, DECK, 0.45);

  // Gaz
  const c = ((phi % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
  const s = Math.floor(c / Math.PI), f = (c - s * Math.PI) / Math.PI;
  const h = Math.max(0.02, DECK - pTop);
  gas.position.set(piston.position.x, pTop - pistonPos[1] + piston.position.y + h / 2, piston.position.z);
  gas.scale.set(1, h, 1);
  gas.visible = explodeT < 0.05;
  const col = gasMat.color;
  if (s === 0) { col.set(0x4fe3ff); gasMat.opacity = 0.18 + 0.14 * f; }
  else if (s === 1) { col.set(0x4fe3ff).lerp(new THREE.Color(0x9fd0ff), f); gasMat.opacity = 0.32 + 0.3 * f; }
  else if (s === 2) { col.set(0xffc34d).lerp(new THREE.Color(0xc0432a), Math.min(1, f * 1.4)); gasMat.opacity = 0.85 - 0.5 * f; }
  else { col.set(0x7d8592); gasMat.opacity = 0.32 - 0.24 * f; }

  // Uchqun: 360° atrofida
  const ds = c - 2 * Math.PI;
  const on = ds > -0.1 && ds < 0.22 ? 1 - Math.abs(ds - 0.06) / 0.16 : 0;
  spark.material.opacity = Math.max(0, on);
  spark.scale.setScalar(0.6 + Math.max(0, on));
  sparkLight.intensity = Math.max(0, on) * 30;
  spark.visible = explodeT < 0.05;

  updateHud(s, f, c);
}

/* ---------------- HUD va boshqaruv ---------------- */
let lastStroke = -1;
function updateHud(s, f, c){
  $('hudBar').style.transform = `scaleX(${f})`;
  $('hudDeg').textContent = Math.round(c * 180 / Math.PI) + '°';
  if (s === lastStroke) return;
  lastStroke = s;
  const t = T[lang];
  $('hudStep').textContent = `${s + 1}/4`;
  $('hudName').textContent = t['s' + s];
  stage.dataset.stroke = s;
  $('strokeText').textContent = t['d' + s];
  document.querySelectorAll('#strokes button').forEach((b, i) => { b.setAttribute('aria-selected', i === s); b.classList.toggle('on', i === s); });
}
function paintButtons(){
  const t = T[lang];
  $('play').firstElementChild.textContent = playing ? t.pause : t.play;
  $('play').setAttribute('aria-pressed', playing);
  $('explode').textContent = explodeTarget ? t.assemble : t.explode;
  $('explode').setAttribute('aria-pressed', !!explodeTarget);
}
$('play').addEventListener('click', () => { playing = !playing; stopAt = null; paintButtons(); });
$('step').addEventListener('click', () => {
  const k = Math.floor(phi / Math.PI + 1e-6);
  stopAt = (k + 1) * Math.PI; playing = true; paintButtons();
});
$('explode').addEventListener('click', () => { explodeTarget = explodeTarget ? 0 : 1; paintButtons(); });
$('reset').addEventListener('click', () => { camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.update(); });
$('speed').addEventListener('input', e => { speed = +e.target.value; $('speedVal').textContent = speed + '×'; });
document.querySelectorAll('#strokes button').forEach(b => b.addEventListener('click', () => {
  const k = +b.dataset.s, base = Math.floor(phi / (4 * Math.PI)) * 4 * Math.PI;
  phi = base + k * Math.PI + 0.01; stopAt = null; update();
}));

/* ---------------- Qismni tanlash ---------------- */
let selected = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(Object.values(PARTS), true);
  // shaffof qobiqlardan ichkaridagi qattiq qismni afzal ko'ramiz
  const shells = new Set(['cylinder', 'crankcase', 'head', 'inPipe', 'exPipe']);
  let pick = null, shell = null;
  for (const h of hits) {
    let o = h.object; while (o && !o.userData.part) o = o.parent;
    if (!o) continue;
    if (shells.has(o.userData.part)) { shell = shell || o.userData.part; continue; }
    pick = o.userData.part; break;
  }
  select(pick || shell);
});
function setGlow(id, on){
  if (!id) return;
  PARTS[id].traverse(o => { if (o.material && o.material.emissive) { o.material.emissive.set(on ? 0x2a8fb0 : 0x000000); o.material.emissiveIntensity = on ? 0.9 : 0; } });
}
function select(id){
  setGlow(selected, false); selected = id === selected ? null : id; setGlow(selected, true);
  paintPart();
}
function paintPart(){
  const t = T[lang];
  $('partBox').classList.toggle('on', !!selected);
  if (selected) { const [n, d] = t.parts[selected]; $('partName').textContent = n; $('partText').textContent = d; }
  else { $('partName').textContent = t.partNone; $('partText').textContent = t.partHelp; }
}
// Materiallar har bir qismda alohida bo'lishi uchun nusxa olamiz (yorqinlik faqat tanlangan qismda)
Object.values(PARTS).forEach(g => g.traverse(o => { if (o.isMesh) o.material = o.material.clone(); }));

/* ---------------- Sikl ---------------- */
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 0.9 ? 50 : 38; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

let last = performance.now(), visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) {
    phi += BASE_RATE * speed * dt;
    if (stopAt != null && phi >= stopAt) { phi = stopAt + 0.001; playing = false; stopAt = null; paintButtons(); }
  }
  const prevE = explodeT;
  explodeT += (explodeTarget - explodeT) * Math.min(1, dt * 5);
  // ochilganda qismlar tepaga ko'tariladi, kamera ham ozgina ko'tariladi
  const dy = (explodeT - prevE) * 1.0; controls.target.y += dy; camera.position.y += dy;
  if (visible) { update(); controls.update(); renderer.render(scene, camera); }
  requestAnimationFrame(loop);
}
applyLang();
update();
$('loading').hidden = true;
stage.classList.add('ready');
requestAnimationFrame(loop);
