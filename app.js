// Kanal havolalari: manzilni yozsangiz tugma paydo bo'ladi, bo'sh qolsa "tez kunda" yoziladi.
const LINKS = {
  instagram: "",   // tayyor bo'lganda: "https://www.instagram.com/buqanday_.ishlaydi/"
  youtube: "",     // masalan: "https://youtube.com/@kanal_nomi"
  telegram: "https://t.me/buqanday_ishlaydi1"
};

const nav = document.getElementById('links');
if (nav) {
  [['telegram','Telegram'],['instagram','Instagram'],['youtube','YouTube']].forEach(([k,label])=>{
    if (LINKS[k]) {
      const a=document.createElement('a');a.href=LINKS[k];a.target='_blank';a.rel='noopener';a.textContent=label;
      if (k==='telegram') a.className='tg';
      nav.appendChild(a);
    } else {
      const s=document.createElement('span');s.className='soon';s.textContent=label+' · tez kunda';nav.appendChild(s);
    }
  });
}

// Rasmni bosganda video ishga tushadi, boshqa videolar to'xtaydi.
document.querySelectorAll('.player').forEach(p=>{
  const v=p.querySelector('video'),b=p.querySelector('.play');
  if(!v||!b)return;
  b.addEventListener('click',()=>{document.querySelectorAll('video').forEach(o=>{if(o!==v)o.pause();});b.hidden=true;v.play().catch(()=>{});});
});

const y=document.getElementById('y'); if(y) y.textContent=new Date().getFullYear();

// Yuklab olish: iPhone'da "Ulashish" oynasi orqali "Videoni saqlash" (Galereyaga),
// boshqa qurilmalarda oddiy yuklab olish.
document.querySelectorAll('.dl').forEach(btn=>{
  const msg=btn.nextElementSibling, src=btn.dataset.src, name=btn.dataset.name;
  let file=null;
  const plain=()=>{const a=document.createElement('a');a.href=src;a.download=name;document.body.appendChild(a);a.click();a.remove();};
  btn.addEventListener('click',async()=>{
    const canFiles=!!(navigator.canShare&&window.File);
    if(!canFiles){plain();msg.textContent="Yuklab olinmoqda… Fayl \"Yuklanmalar\" papkasida bo'ladi.";return;}
    if(file){
      try{
        if(navigator.canShare({files:[file]})){await navigator.share({files:[file]});msg.textContent='';}
        else{plain();}
      }catch(e){if(e&&e.name==='AbortError')msg.textContent='Bekor qilindi.';else{plain();}}
      return;
    }
    btn.disabled=true;msg.textContent='Video tayyorlanmoqda…';
    try{
      const r=await fetch(src);if(!r.ok)throw new Error('fetch');
      file=new File([await r.blob()],name,{type:'video/mp4'});
      btn.classList.add('ready');btn.textContent='Saqlash uchun yana bosing';
      msg.textContent='Ochilgan oynada "Videoni saqlash" (Save Video) ni tanlang.';
    }catch(e){msg.textContent="Video yuklanmadi, internetni tekshirib qayta bosing.";}
    finally{btn.disabled=false;}
  });
});
