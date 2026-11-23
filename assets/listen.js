/* Озвучка глав: «сургучная печать» + красная нитка-прогресс.
   Кнопка ставится в подпись главы, если для её id есть файл в AUDIO. */
(function(){
  var AUDIO = { bashnya: '../audio/bashnya.mp3' };
  var css = `
.listen{display:flex;align-items:center;gap:14px;margin-top:14px;max-width:560px;user-select:none;-webkit-user-select:none}
.seal{position:relative;flex:none;width:58px;height:58px;border:0;border-radius:50%;cursor:pointer;color:#f3d9c9;
 background:radial-gradient(circle at 35% 30%,#d8445a 0%,#a51f33 45%,#6d1020 100%);
 box-shadow:0 6px 0 #4a0a15,0 10px 18px rgba(0,0,0,.55),inset 0 -3px 6px rgba(0,0,0,.35),inset 0 2px 3px rgba(255,200,200,.25);
 transition:transform .09s ease-out,box-shadow .09s ease-out;-webkit-tap-highlight-color:transparent}
.seal::before{content:"";position:absolute;inset:6px;border-radius:50%;border:1.5px dashed rgba(60,5,15,.55)}
.seal svg{position:absolute;inset:0;margin:auto;width:22px;height:22px;fill:currentColor;filter:drop-shadow(0 -1px 0 rgba(0,0,0,.45))}
.seal .pa{display:none}
.listen.on .seal .pl{display:none}.listen.on .seal .pa{display:block}
.seal:active,.seal.down{transform:translateY(5px) scale(.97);box-shadow:0 1px 0 #4a0a15,0 3px 6px rgba(0,0,0,.6),inset 0 3px 8px rgba(0,0,0,.45),inset 0 1px 2px rgba(255,200,200,.15)}
.lbody{flex:1;min-width:0}
.ltitle{font:italic 500 19px/1.2 "Cormorant Garamond",serif;color:#efe6da;margin:0 0 6px}
.ltitle small{font:inherit;font-size:16px;color:var(--mute)}
.thread{position:relative;height:26px;cursor:pointer;touch-action:none}
.thread svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.thread .base{fill:none;stroke:rgba(232,225,215,.22);stroke-width:1.5;stroke-dasharray:2 5}
.thread .red{fill:none;stroke:var(--blood);stroke-width:2.5;stroke-linecap:round}
.thread .knot{fill:var(--blood)}
.ltime{font:14px/1 Alegreya,serif;color:var(--mute);margin-top:2px;font-variant-numeric:tabular-nums}
.mini{position:fixed;left:calc(max(3vw,16px) + 40px);bottom:max(18px,env(safe-area-inset-bottom));z-index:45;width:48px;height:48px;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .4s,transform .4s}
.mini.show{opacity:1;pointer-events:auto;transform:none}
.mini .seal{width:48px;height:48px}
.mini .seal svg{width:18px;height:18px}
@media (prefers-reduced-motion:reduce){.seal{transition:none}}
`;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var ICON = '<svg class="pl" viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg><svg class="pa" viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  function fmt(s){ s = Math.max(0, Math.floor(s||0)); return Math.floor(s/60) + ':' + ('0'+(s%60)).slice(-2); }

  var done = {};
  function init(){
    Object.keys(AUDIO).forEach(function(id){
      if(done[id]) return;
      var sec = document.getElementById(id); if(!sec) return;
      var cap = sec.querySelector('.cap, .head'); if(!cap) return;
      var a = new Audio(); a.preload = 'metadata'; a.src = AUDIO[id];

      var box = document.createElement('div'); box.className = 'listen';
      box.innerHTML = '<button class="seal" type="button" aria-label="Слушать главу">'+ICON+'</button>'+
        '<div class="lbody"><p class="ltitle">Слушать главу <small>· читает Нестер</small></p>'+
        '<div class="thread" role="slider" aria-label="Где сейчас чтение" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'+
        '<svg><path class="base"/><path class="red"/><circle class="knot" r="4" cx="0" cy="8"/></svg></div>'+
        '<div class="ltime"><span class="cur">0:00</span> / <span class="dur">—</span></div></div>';
      cap.appendChild(box); done[id] = true;

      var mini = document.createElement('div'); mini.className = 'mini';
      mini.innerHTML = '<button class="seal" type="button" aria-label="Пауза">'+ICON+'</button>';
      document.body.appendChild(mini);

      var seal = box.querySelector('.seal'), mseal = mini.querySelector('.seal');
      var thr = box.querySelector('.thread'), red = box.querySelector('.red'), base = box.querySelector('.base'), knot = box.querySelector('.knot');
      var cur = box.querySelector('.cur'), dur = box.querySelector('.dur');
      var len = 0;

      /* нитка провисает, пока чтение в начале, и натягивается к концу */
      function draw(p){
        var W = thr.clientWidth || 300, sag = 14 - 11*p;   // провис от 14px до 3px
        var d = 'M4 8 Q'+(W/2)+' '+(8+sag)+' '+(W-4)+' 8';
        base.setAttribute('d', d); red.setAttribute('d', d);
        len = red.getTotalLength();
        red.style.strokeDasharray = len; red.style.strokeDashoffset = len*(1-p);
        var pt = red.getPointAtLength(len*p); knot.setAttribute('cx', pt.x); knot.setAttribute('cy', pt.y);
        thr.setAttribute('aria-valuenow', Math.round(p*100)); last = p;
      }
      draw(0); var last = 0;
      addEventListener('resize', function(){ draw(last); });

      function toggle(){ if(a.paused){ a.play(); } else { a.pause(); } }
      [seal, mseal].forEach(function(b){
        b.addEventListener('pointerdown', function(){ b.classList.add('down'); if(navigator.vibrate) navigator.vibrate(8); });
        ['pointerup','pointerleave','pointercancel'].forEach(function(e){ b.addEventListener(e, function(){ b.classList.remove('down'); }); });
        b.addEventListener('click', toggle);
      });

      a.addEventListener('loadedmetadata', function(){ dur.textContent = fmt(a.duration); });
      a.addEventListener('play', function(){ box.classList.add('on'); seal.setAttribute('aria-label','Пауза'); vis(); });
      a.addEventListener('pause', function(){ box.classList.remove('on'); seal.setAttribute('aria-label','Слушать главу'); vis(); });
      a.addEventListener('ended', function(){ a.currentTime = 0; draw(0); });
      a.addEventListener('timeupdate', function(){ if(a.duration){ draw(a.currentTime/a.duration); cur.textContent = fmt(a.currentTime); } });

      /* перемотка: тянуть нитку пальцем */
      function seek(e){ var r = thr.getBoundingClientRect(); var p = Math.min(1, Math.max(0, (e.clientX - r.left)/r.width)); if(a.duration){ a.currentTime = p*a.duration; draw(p); } }
      var drag = false;
      thr.addEventListener('pointerdown', function(e){ drag = true; thr.setPointerCapture(e.pointerId); seek(e); });
      thr.addEventListener('pointermove', function(e){ if(drag) seek(e); });
      thr.addEventListener('pointerup', function(){ drag = false; });
      thr.addEventListener('keydown', function(e){ if(!a.duration) return; if(e.key==='ArrowRight') a.currentTime += 10; if(e.key==='ArrowLeft') a.currentTime -= 10; });

      /* маленькая печать в углу, пока глава играет, а подпись ушла с экрана */
      var inView = true;
      function vis(){ mini.classList.toggle('show', !a.paused && !inView); }
      new IntersectionObserver(function(en){ inView = en[0].isIntersecting; vis(); }).observe(box);
      function syncMini(){ mini.classList.toggle('on', !a.paused); mini.querySelector('.pl').style.display = a.paused ? '' : 'none'; mini.querySelector('.pa').style.display = a.paused ? 'none' : 'block'; }
      a.addEventListener('play', syncMini); a.addEventListener('pause', syncMini);
    });
  }
  /* страница может открыться позже (после пароля), поэтому ждём, пока глава появится */
  function start(){ init(); if(Object.keys(done).length < Object.keys(AUDIO).length){
    var mo = new MutationObserver(function(){ init(); if(Object.keys(done).length >= Object.keys(AUDIO).length) mo.disconnect(); });
    mo.observe(document.body, {childList:true, subtree:true}); } }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
