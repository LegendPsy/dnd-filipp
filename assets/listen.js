/* Озвучка глав: «сургучная печать» + красная нитка-прогресс.
   Кнопка ставится в подпись главы, если для её id есть файл в AUDIO. */
(function(){
  var READY = ['bashnya', 'noch', 'izverg', 'uchenik', 'tetrad', 'filipp', 'nitki', 'taverna'];   // главы, у которых есть запись
  var AUDIO = {}, WORDS = {};                       // запись и время каждого слова в ней
  READY.forEach(function(id){ AUDIO[id] = '../audio/' + id + '.mp3'; WORDS[id] = '../audio/' + id + '.json'; });
  var players = [];                                 // все главы: играет только одна
  var RAIN = '../assets/sfx/rain.mp3', RAIN_VOL = 0.10;  // тихий дождь под чтение
  var BASE = 0.85;                         // «×1» = запись, замедленная до 85% (так понравилось автору)
  var SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  var SP = 1; try{ var v = parseFloat(localStorage.getItem('listen-speed')); if(SPEEDS.indexOf(v) >= 0) SP = v; }catch(e){}
  function rate(){ return BASE * SP; }
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
.ltime{font:14px/1 Alegreya,serif;color:var(--mute);margin-top:2px;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:6px}
.spd{margin-left:10px;min-width:52px;height:30px;padding:0 10px;border:1px solid rgba(232,225,215,.28);border-radius:15px;background:rgba(13,10,14,.55);color:#efe6da;font:600 15px/1 "Cormorant Garamond",serif;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.55);transition:transform .08s,box-shadow .08s,border-color .3s;-webkit-tap-highlight-color:transparent}
.spd:hover{border-color:var(--blood)}
.spd:active,.spd.down{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.55)}
.spd b{display:inline-block;transition:transform .18s}
.spd.turn b{transform:translateY(-3px);opacity:.4}
.mini{position:fixed;left:calc(max(3vw,16px) + 40px);bottom:max(18px,env(safe-area-inset-bottom));z-index:45;width:48px;height:48px;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .4s,transform .4s}
.mini.show{opacity:1;pointer-events:auto;transform:none}
.mini .seal{width:48px;height:48px}
.mini .seal svg{width:18px;height:18px}
@media (prefers-reduced-motion:reduce){.seal{transition:none}}
.vw{border-radius:3px;transition:color .25s,text-shadow .35s,background-size .35s ease-out;background:linear-gradient(var(--blood),var(--blood)) 0 100%/0 2px no-repeat}
.follow .vw{cursor:pointer}
.follow .vw:hover{background-size:100% 1px}
.vw.now{color:#fff6ea;text-shadow:0 0 14px rgba(255,190,120,.6);background-color:rgba(255,190,120,.1);background-size:100% 2px}
.vw.tap{display:inline-block;transform:translateY(1.5px);transition:transform .08s}
@media (prefers-reduced-motion:reduce){.vw{transition:none}}
`;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var ICON = '<svg class="pl" viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg><svg class="pa" viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  function fmt(s){ s = Math.max(0, Math.floor(s||0)); return Math.floor(s/60) + ':' + ('0'+(s%60)).slice(-2); }

  /* ---- дождь под чтение: один на всю страницу, Web Audio, чтобы громкость работала и на iPhone ---- */
  var ac = null, rainGain = null, rainSrc = null, rainBuf = null;
  function rainUp(a){
    try{
      if(!ac){ ac = new (window.AudioContext||window.webkitAudioContext)(); rainGain = ac.createGain(); rainGain.gain.value = 0; rainGain.connect(ac.destination);
        fetch(RAIN).then(function(r){ return r.arrayBuffer(); }).then(function(b){ return new Promise(function(ok,no){ ac.decodeAudioData(b, ok, no); }); })
          .then(function(buf){ rainBuf = buf; if(!a.paused) rainUp(a); }).catch(function(){}); }
      if(ac.state === 'suspended') ac.resume();
      if(rainBuf && !rainSrc){ rainSrc = ac.createBufferSource(); rainSrc.buffer = rainBuf; rainSrc.loop = true; rainSrc.connect(rainGain); rainSrc.start(); }
      rainGain.gain.cancelScheduledValues(ac.currentTime); rainGain.gain.setTargetAtTime(RAIN_VOL, ac.currentTime, 0.8);
    }catch(e){}
  }
  function rainOff(){ try{ if(ac && rainGain) rainGain.gain.setTargetAtTime(0, ac.currentTime, 0.5); }catch(e){} }

  var done = {};
  function init(){
    Object.keys(AUDIO).forEach(function(id){
      if(done[id]) return;
      var sec = document.getElementById(id); if(!sec) return;
      var cap = sec.querySelector('.cap, .head'); if(!cap) return;
      var a = new Audio(); a.preload = 'metadata'; a.src = AUDIO[id];
      a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
      a.defaultPlaybackRate = rate(); a.playbackRate = rate();
      a.addEventListener('loadedmetadata', function(){ a.playbackRate = rate(); });
      players.push(a);
      a.addEventListener('play', function(){ players.forEach(function(o){ if(o !== a && !o.paused) o.pause(); }); });

      var box = document.createElement('div'); box.className = 'listen';
      box.innerHTML = '<button class="seal" type="button" aria-label="Слушать главу">'+ICON+'</button>'+
        '<div class="lbody"><p class="ltitle">Слушать главу</p>'+
        '<div class="thread" role="slider" aria-label="Где сейчас чтение" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'+
        '<svg><path class="base"/><path class="red"/><circle class="knot" r="4" cx="0" cy="8"/></svg></div>'+
        '<div class="ltime"><span class="cur">0:00</span> / <span class="dur">—</span><button class="spd" type="button" aria-label="Скорость чтения">×1</button></div></div>';
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

      /* ---- дождь под чтение: Web Audio, чтобы громкость работала и на iPhone ---- */
      function rainOn(){ rainUp(a); }
      a.addEventListener('play', rainOn);
      a.addEventListener('pause', function(){ if(players.every(function(o){ return o.paused; })) rainOff(); });
      a.addEventListener('ended', function(){ if(players.every(function(o){ return o.paused; })) rainOff(); });


      /* ---- следование за голосом: каждое слово в span, подсветка, запуск с любого слова ---- */
      var spans = [], times = [], curW = -1, userScroll = 0;
      if(WORDS[id]) fetch(WORDS[id]).then(function(r){ return r.json(); }).then(function(d){ follow(d); }).catch(function(){});
      function norm(t){ return t.toLowerCase().replace(/ё/g,'е').replace(/[^0-9a-zа-я-]/g,'').replace(/^-+|-+$/g,''); }
      function follow(d){
        var root = sec;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
          var p = n.parentNode; if(!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if(p.closest && p.closest('.listen, .cap, .head, figcaption:not(.leaf), script, style')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT; } });
        var nodes = []; while(walker.nextNode()) nodes.push(walker.currentNode);
        var RX = /[0-9A-Za-zА-Яа-яЁё]+(?:-[0-9A-Za-zА-Яа-яЁё]+)*/g;
        nodes.forEach(function(n){
          var txt = n.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
          RX.lastIndex = 0;
          while((m = RX.exec(txt))){
            if(m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
            var sp = document.createElement('span'); sp.className = 'vw'; sp.textContent = m[0]; frag.appendChild(sp); spans.push(sp);
            last = m.index + m[0].length;
          }
          if(last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
          n.parentNode.replaceChild(frag, n);
        });
        /* сопоставляем слова страницы со словами записи (они почти совпадают) */
        var j = 0;
        spans.forEach(function(sp, i){
          var w = norm(sp.textContent); times[i] = null;
          for(var k = j; k < Math.min(j + 8, d.w.length); k++){ if(d.w[k] === w){ times[i] = d.t[k]; j = k + 1; break; } }
        });
        for(var i = 0; i < times.length; i++){          // пропуски заполняем между соседями
          if(times[i] !== null) continue;
          var p = i - 1, n2 = i + 1; while(n2 < times.length && times[n2] === null) n2++;
          var t0 = p >= 0 ? times[p] : 0, t1 = n2 < times.length ? times[n2] : (a.duration || t0 + 1);
          for(var q = i; q < n2; q++) times[q] = t0 + (t1 - t0) * (q - p) / (n2 - p);
          i = n2;
        }
        root.classList.add('follow');
        root.addEventListener('click', function(e){
          var sp = e.target.closest && e.target.closest('.vw'); if(!sp) return;
          var sel = window.getSelection && window.getSelection(); if(sel && String(sel).length) return;  // выделяют текст, а не нажимают
          var i = spans.indexOf(sp); if(i < 0) return;
          sp.classList.add('tap'); setTimeout(function(){ sp.classList.remove('tap'); }, 120);
          if(navigator.vibrate) navigator.vibrate(6);
          a.currentTime = Math.max(0, times[i] - 0.05); userScroll = 0; if(a.paused) a.play();
          mark(i);
        });
        ['wheel','touchmove','keydown'].forEach(function(ev){ addEventListener(ev, function(){ userScroll = Date.now(); }, {passive:true}); });
        requestAnimationFrame(tick);
      }
      function mark(i){
        if(i === curW) return;
        if(curW >= 0 && spans[curW]) spans[curW].classList.remove('now');
        curW = i; if(i < 0) return;
        var sp = spans[i]; sp.classList.add('now');
        if(!a.paused && Date.now() - userScroll > 5000){      // страница идёт за голосом, если читатель сам не листает
          var r = sp.getBoundingClientRect(), h = innerHeight;
          if(r.top < h * 0.18 || r.bottom > h * 0.78) scrollTo({ top: scrollY + r.top - h * 0.4, behavior: 'smooth' });
        }
      }
      function tick(){
        if(times.length && !a.paused){
          var t = a.currentTime, lo = 0, hi = times.length - 1, ans = -1;
          while(lo <= hi){ var mid = (lo + hi) >> 1; if(times[mid] <= t){ ans = mid; lo = mid + 1; } else hi = mid - 1; }
          mark(ans);
        }
        requestAnimationFrame(tick);
      }
      a.addEventListener('ended', function(){ mark(-1); });

      /* скорость: нажатие переключает 1 → 1,25 → 1,5 → 1,75 → 2 → 1, выбор запоминается */
      var spd = box.querySelector('.spd');
      function showSpd(){ spd.innerHTML = '<b>×' + String(SP).replace('.', ',') + '</b>'; }
      showSpd();
      spd.addEventListener('pointerdown', function(){ spd.classList.add('down'); if(navigator.vibrate) navigator.vibrate(5); });
      ['pointerup','pointerleave','pointercancel'].forEach(function(e){ spd.addEventListener(e, function(){ spd.classList.remove('down'); }); });
      spd.addEventListener('click', function(){
        SP = SPEEDS[(SPEEDS.indexOf(SP) + 1) % SPEEDS.length];
        try{ localStorage.setItem('listen-speed', SP); }catch(e){}
        spd.classList.add('turn'); setTimeout(function(){ spd.classList.remove('turn'); }, 140);
        dispatchEvent(new Event('listen-speed'));
      });
      addEventListener('listen-speed', function(){       // скорость общая для всех глав
        a.playbackRate = rate(); a.defaultPlaybackRate = rate();
        setTimeout(showSpd, 140);
        if(a.duration){ dur.textContent = fmt(a.duration / rate()); cur.textContent = fmt(a.currentTime / rate()); }
      });
      function toggle(){ if(a.paused){ a.play(); } else { a.pause(); } }
      [seal, mseal].forEach(function(b){
        b.addEventListener('pointerdown', function(){ b.classList.add('down'); if(navigator.vibrate) navigator.vibrate(8); });
        ['pointerup','pointerleave','pointercancel'].forEach(function(e){ b.addEventListener(e, function(){ b.classList.remove('down'); }); });
        b.addEventListener('click', toggle);
      });

      a.addEventListener('loadedmetadata', function(){ dur.textContent = fmt(a.duration / rate()); });
      a.addEventListener('play', function(){ box.classList.add('on'); seal.setAttribute('aria-label','Пауза'); vis(); });
      a.addEventListener('pause', function(){ box.classList.remove('on'); seal.setAttribute('aria-label','Слушать главу'); vis(); });
      a.addEventListener('ended', function(){ a.currentTime = 0; draw(0); });
      a.addEventListener('timeupdate', function(){ if(a.duration){ draw(a.currentTime/a.duration); cur.textContent = fmt(a.currentTime / rate()); } });

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
