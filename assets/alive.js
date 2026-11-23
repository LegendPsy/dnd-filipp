/* «Живой сайт»: свет свечи у курсора, пылинки, глубина артов, проявление чернил,
   красная нитка, ответ замка, дышащая полка, свеча повести, время суток.
   Один файл на все страницы. Ничего не трогает в текстах, только добавляет слой жизни.
   Если у человека в системе включено «уменьшить движение», остаётся только спокойный свет. */
(function () {
  'use strict';
  const W = window, D = document, H = D.documentElement;

  // страница могла быть заменена через document.write (замок): гасим прошлую жизнь
  if (W.__alive) { try { W.__alive.stop(); } catch (e) {} }
  const ac = new AbortController();
  const sig = {signal: ac.signal};
  let gen = (W.__aliveGen = (W.__aliveGen || 0) + 1);
  const alive = () => gen === W.__aliveGen;
  const observers = [];
  W.__alive = {stop() { ac.abort(); observers.forEach(o => o.disconnect()); try { amb.forEach(a => a.pause()); if (actx) actx.close(); } catch (e) {} W.__aliveGen++; }};

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SMALL = matchMedia('(max-width: 760px)').matches;
  const ls = {get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
              set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }};
  const ss = {get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
              set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
              del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }};

  /* ---------- время суток у посетителя ---------- */
  const hr = new Date().getHours();
  const TIME = hr >= 22 || hr < 5 ? 'night' : hr < 10 ? 'morning' : hr < 18 ? 'day' : 'evening';
  H.dataset.aliveTime = TIME;
  const TONE = {
    night:   {light: [255, 176, 96], a: .26, dark: .34, dust: 1,   beam: 0},
    evening: {light: [255, 168, 92], a: .22, dark: .26, dust: .9,  beam: 0},
    morning: {light: [255, 206, 170], a: .16, dark: .16, dust: .75, beam: .5},
    day:     {light: [236, 226, 206], a: .12, dark: .12, dust: .6,  beam: .8}
  }[TIME];

  /* ---------- вход после пароля: страница проявляется из темноты ---------- */
  const entering = ss.get('alive-enter') === '1';
  if (entering) { ss.del('alive-enter'); H.classList.add('alive-entering'); }

  /* ---------- стили слоя жизни ---------- */
  const css = `
@view-transition{navigation:auto}
.alive-name{position:absolute;pointer-events:none;font:400 1.2em/1 "Marck Script",cursive;text-shadow:0 0 6px #0d0a0e,0 0 2px #0d0a0e;color:#c9adff;opacity:0;transition:opacity 2.4s ease;white-space:nowrap}
.alive-name.on{opacity:.75}
.alive-fiber{position:fixed;inset:0;width:100vw;height:100vh;z-index:29;pointer-events:none;overflow:visible;transition:opacity .5s}
.alive-fiber path{fill:none;stroke:#c0283f;stroke-width:1.3;stroke-linecap:round;opacity:.85}
.alive-fiber circle{fill:#c0283f;transition:opacity .4s}
.alive-tear{position:absolute;pointer-events:none;margin:0;transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.alive-tear-gap{position:absolute;left:0;right:0;pointer-events:none;display:flex;gap:1.2em;justify-content:center;align-items:center;font:400 15px/1 "Marck Script",cursive;color:#b89cff;opacity:0;transition:opacity .4s;white-space:nowrap;overflow:hidden}
::view-transition-old(root){animation:alive-vt-out .45s ease-in both}
::view-transition-new(root){animation:alive-vt-in .7s ease-out both}
@keyframes alive-vt-out{to{opacity:0;filter:brightness(.4) blur(4px)}}
@keyframes alive-vt-in{from{opacity:0;filter:brightness(1.4) sepia(.4)}}
html.alive-entering body{opacity:0}
.alive-snd{position:fixed;left:max(10px,1.4vw);bottom:max(16px,env(safe-area-inset-bottom));z-index:46;width:44px;height:44px;display:grid;place-items:center;
  border:1px solid rgba(232,225,215,.22);border-radius:50%;background:rgba(13,10,14,.78);color:#cfc6ba;cursor:pointer;padding:0;transition:border-color .3s,color .3s,opacity .5s;opacity:.75}
.alive-snd:hover{opacity:1;border-color:rgba(232,184,106,.6);color:#fff}
.alive-snd:focus-visible{outline:2px solid #a57cff;outline-offset:3px}
.alive-snd svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.alive-snd .w{opacity:0;transition:opacity .4s}
.alive-snd[aria-pressed=true]{color:#e8b86a;border-color:rgba(232,184,106,.55);opacity:1}
.alive-snd[aria-pressed=true] .w{opacity:1}
.alive-snd[aria-pressed=true] .x{opacity:0}
@media (max-width:760px){.alive-snd{width:38px;height:38px;left:6px;opacity:.6}.alive-snd.away{opacity:0;pointer-events:none}}
body:has(.alive-candle) .alive-snd{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 96px)}
html.alive-entered body{animation:alive-enter 1.4s ease-out both}
@keyframes alive-enter{from{opacity:0;filter:brightness(1.8) sepia(.6) blur(6px)}to{opacity:1;filter:none}}
.alive-fx{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict}
.alive-fx canvas{position:absolute;inset:0;width:100%;height:100%}
.alive-light,.alive-shade{position:absolute;left:0;top:0;border-radius:50%;will-change:transform,opacity}
.alive-light{width:1000px;height:1000px;margin:-500px 0 0 -500px;mix-blend-mode:screen;
  background:radial-gradient(closest-side,rgba(var(--alive-l),.95),rgba(var(--alive-l),.35) 35%,rgba(var(--alive-l),0) 100%)}
.alive-shade{width:4000px;height:4000px;margin:-2000px 0 0 -2000px;
  background:radial-gradient(closest-side,rgba(6,4,7,0) 0,rgba(6,4,7,0) 9%,rgba(6,4,7,var(--alive-d)) 30%)}
.alive-beam{position:absolute;inset:-20% -10%;mix-blend-mode:screen;opacity:var(--alive-b);
  background:linear-gradient(115deg,rgba(220,214,200,0) 30%,rgba(220,214,200,.10) 40%,rgba(220,214,200,0) 52%,rgba(220,214,200,.06) 60%,rgba(220,214,200,0) 70%);
  animation:alive-beam 14s ease-in-out infinite alternate}
@keyframes alive-beam{to{transform:translateX(4%)}}
.alive-depth{transition:translate .9s cubic-bezier(.2,.7,.2,1)}
.alive-ink{opacity:0;translate:0 14px;transition:opacity 1.1s ease-out,translate 1.1s cubic-bezier(.2,.7,.2,1),filter 1.1s ease-out}
.alive-ink.alive-blur{filter:blur(3px)}
.alive-ink.alive-in{opacity:1;translate:none;filter:none}
.alive-write{-webkit-mask-image:linear-gradient(90deg,#000 45%,transparent 55%);mask-image:linear-gradient(90deg,#000 45%,transparent 55%);
  -webkit-mask-size:240% 100%;mask-size:240% 100%;-webkit-mask-position:100% 0;mask-position:100% 0}
.alive-write.alive-go{animation:alive-write 2.4s cubic-bezier(.4,.1,.3,1) forwards}
@keyframes alive-write{to{-webkit-mask-position:0 0;mask-position:0 0}}
.lead.alive-in::first-letter{animation:alive-gold 3.2s ease-out both}
@keyframes alive-gold{0%{color:#ffe2a0;text-shadow:0 0 18px rgba(255,200,110,.9)}60%{color:#e8b86a;text-shadow:0 0 8px rgba(255,190,100,.4)}100%{}}
.alive-thread{position:fixed;top:0;right:max(6px,1.2vw);width:30px;height:100vh;z-index:30;pointer-events:none;overflow:visible}
.alive-thread path{fill:none;stroke:#c0283f;stroke-width:1.4;stroke-linecap:round;opacity:.8}
.alive-thread circle{fill:#c0283f}
@media (max-width:640px){.alive-thread{right:2px;opacity:.75}}
.alive-shelf-thread{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:2}
.alive-shelf-thread path{fill:none;stroke:#c0283f;stroke-width:1.5;opacity:.7;stroke-dasharray:var(--len);stroke-dashoffset:var(--len);transition:stroke-dashoffset 2.6s ease-in-out}
.alive-shelf-thread.on path{stroke-dashoffset:0}
.shelf{position:relative}
.shelf a{position:relative}
.shelf a:not(.read){animation:alive-breathe 7s ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes alive-breathe{50%{box-shadow:inset 0 0 26px rgba(192,40,63,.13),0 0 0 rgba(0,0,0,0)}}
.shelf a.read .ok{animation:alive-flame 2.2s ease-in-out infinite;transform-origin:50% 90%}
@keyframes alive-flame{25%{transform:scale(1.06,.94)}50%{transform:scale(.95,1.07) skewX(3deg)}75%{transform:scale(1.03,.97) skewX(-2deg)}}
.alive-rustle{animation:alive-rustle .55s ease-out}
@keyframes alive-rustle{20%{rotate:-.7deg}45%{rotate:.5deg}70%{rotate:-.2deg}100%{rotate:0deg}}
.alive-tilt{transition:transform .5s cubic-bezier(.2,.7,.2,1),border-color .35s,box-shadow .35s!important}
.alive-tilt.alive-tilting{transition:transform .12s linear,border-color .35s,box-shadow .35s!important}
.alive-glare{position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .4s;mix-blend-mode:screen;
  background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,214,150,.16),rgba(255,214,150,0) 55%)}
.alive-tilting .alive-glare{opacity:1}
.alive-smudge{animation:alive-smudge .9s ease-out}
@keyframes alive-smudge{15%{filter:blur(2.5px);transform:skewX(-6deg) translateX(-4px);opacity:.55}40%{filter:blur(1px);transform:skewX(3deg);opacity:.85}100%{filter:none;transform:none;opacity:1}}
.alive-seal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;pointer-events:none}
.alive-seal .glow{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,220,150,1),rgba(255,170,90,.6) 40%,rgba(255,150,80,0));opacity:0}
.alive-seal .veil{position:absolute;inset:0;background:#0d0a0e;opacity:0}
.alive-seal svg{position:relative;width:120px;height:120px;overflow:visible;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
.alive-seal .half{transform-box:fill-box}
.alive-seal.go svg{animation:alive-seal-in .32s cubic-bezier(.2,1.6,.4,1) both}
.alive-seal.crack .l{animation:alive-l .7s cubic-bezier(.5,0,.8,.4) forwards}
.alive-seal.crack .r{animation:alive-r .7s cubic-bezier(.5,0,.8,.4) forwards}
.alive-seal.crack .glow{animation:alive-glow 1.1s ease-out forwards}
.alive-seal.crack .veil{animation:alive-veil 1.1s ease-in forwards}
@keyframes alive-seal-in{from{transform:scale(1.8);opacity:0}to{transform:none;opacity:1}}
@keyframes alive-l{to{transform:translate(-60px,140px) rotate(-38deg);opacity:0}}
@keyframes alive-r{to{transform:translate(60px,150px) rotate(42deg);opacity:0}}
@keyframes alive-glow{0%{opacity:0;transform:scale(1)}25%{opacity:1}100%{opacity:0;transform:scale(70)}}
@keyframes alive-veil{0%,45%{opacity:0}100%{opacity:1}}
.alive-candle{position:fixed;left:max(8px,1.4vw);bottom:max(20px,env(safe-area-inset-bottom));z-index:44;width:14px;height:86px;pointer-events:none;opacity:0;transition:opacity .6s}
.alive-candle.on{opacity:1}
.alive-candle .wax{position:absolute;left:0;right:0;bottom:0;height:calc(10px + 66px * var(--left,1));border-radius:3px 3px 2px 2px;
  background:linear-gradient(90deg,#b9ad9c,#efe6d6 45%,#c9bda9);box-shadow:0 0 14px rgba(255,180,90,.25)}
.alive-candle .wax::before{content:"";position:absolute;left:3px;top:-1px;width:4px;height:12px;border-radius:0 0 3px 3px;background:#efe6d6}
.alive-candle .wick{position:absolute;left:6.5px;width:1.5px;height:5px;background:#2a1f22;bottom:calc(10px + 66px * var(--left,1))}
.alive-candle .fl{position:absolute;left:1px;width:12px;height:20px;bottom:calc(13px + 66px * var(--left,1));border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
  background:radial-gradient(ellipse at 50% 75%,#fff6d8 0,#ffd27a 30%,rgba(255,140,60,.85) 60%,rgba(255,120,50,0) 72%);
  transform-origin:50% 90%;animation:alive-flame 1.6s ease-in-out infinite;filter:drop-shadow(0 0 6px rgba(255,170,80,.8))}
.alive-candle .halo{position:absolute;left:-40px;width:94px;height:94px;bottom:calc(-20px + 66px * var(--left,1));border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,180,90,.22),rgba(255,180,90,0));animation:alive-halo 3s ease-in-out infinite}
@keyframes alive-halo{50%{opacity:.6;transform:scale(.92)}}
@media (max-width:640px){.alive-candle{left:4px;transform:scale(.8);transform-origin:0 100%}}
.alive-laugh{position:fixed;z-index:60;pointer-events:none;font:400 22px/1 "Marck Script",cursive;color:#b89cff;opacity:0;animation:alive-ha 3.4s ease-in-out forwards}
@keyframes alive-ha{30%{opacity:.55}100%{opacity:0;transform:translateY(-18px)}}
.alive-q-shiver{animation:alive-shiver 1.6s ease-in-out}
@keyframes alive-shiver{20%{letter-spacing:.02em;opacity:.7}50%{letter-spacing:-.01em;opacity:1}}
@media (prefers-reduced-motion:reduce){.alive-ink,.alive-write{opacity:1!important;translate:none!important;filter:none!important;-webkit-mask-image:none!important;mask-image:none!important}
  .shelf a,.shelf a .ok,.alive-candle .fl,.alive-candle .halo,.alive-beam{animation:none!important}}
`;
  const st = D.createElement('style');
  st.id = 'alive-css';
  st.textContent = css;
  (D.head || H).appendChild(st);
  H.style.setProperty('--alive-l', TONE.light.join(','));
  H.style.setProperty('--alive-d', TONE.dark);
  H.style.setProperty('--alive-b', TONE.beam);

  const ready = fn => D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', fn, {once: true, signal: ac.signal}) : fn();
  ready(init);

  /* ---------- общий цикл кадров: работает, только пока есть что двигать ---------- */
  const jobs = new Set();
  let raf = 0, last = 0;
  const loop = t => {
    raf = 0;
    if (!alive() || D.hidden) return;
    const dt = Math.min(50, last ? t - last : 16); last = t;
    let more = false;
    jobs.forEach(j => { if (j(t, dt)) more = true; });
    if (more) raf = requestAnimationFrame(loop); else last = 0;
  };
  const wake = () => { if (!raf && alive() && !D.hidden) raf = requestAnimationFrame(loop); };
  D.addEventListener('visibilitychange', wake, sig);

  // простой «шум» для мерцания пламени
  const flick = t => .78 + .1 * Math.sin(t / 130) + .07 * Math.sin(t / 47 + 1.3) + .05 * Math.sin(t / 23 + 4.1);

  let lastInput = performance.now();
  let gust = 0; // сила сквозняка, 0..1
  const poke = () => { lastInput = performance.now(); };
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(e => addEventListener(e, poke, {passive: true, signal: ac.signal}));

  function init() {
    if (!alive()) return;
    if (entering) {
      requestAnimationFrame(() => { H.classList.remove('alive-entering'); H.classList.add('alive-entered'); });
      setTimeout(() => H.classList.remove('alive-entered'), 1600);
    }
    D.querySelectorAll('.stage, .cover, .scene, .hero').forEach(hostInit);
    if (!RM) inkInit();
    tiltInit();
    shelfInit();
    threadInit();
    candleInit();
    gateInit();
    idleInit();
    soundInit();
    tearInit();
    smokeHandInit();
    W.dispatchEvent(new CustomEvent('alive:ready'));
  }

  /* ---------- 1–3, 9: свет свечи, пылинки, глубина ---------- */
  function hostInit(host) {
    const pic = host.querySelector(':scope > img, :scope > .pic img, :scope > video');
    if (!pic) return;
    host.classList.add('alive-host');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (getComputedStyle(host).overflow === 'visible') host.style.overflow = 'clip'; // увеличенный арт не вылезает за край
    const isolated = getComputedStyle(host).isolation === 'isolate';
    const fx = D.createElement('div');
    fx.className = 'alive-fx';
    fx.setAttribute('aria-hidden', 'true');
    const shade = D.createElement('div'); shade.className = 'alive-shade';
    const light = D.createElement('div'); light.className = 'alive-light';
    const cv = D.createElement('canvas');
    if (TONE.beam) { const b = D.createElement('div'); b.className = 'alive-beam'; fx.appendChild(b); }
    fx.append(shade, cv, light);
    const anchor = pic.closest('.pic') && pic.closest('.pic').parentNode === host ? pic.closest('.pic') : pic;
    anchor.after(fx);
    // текст поверх слоя жизни
    [...host.children].forEach(ch => {
      if (ch === fx || ch === anchor || ch.tagName === 'IMG' || ch.tagName === 'VIDEO') return;
      const cs = getComputedStyle(ch);
      if (cs.position === 'static') ch.style.position = 'relative';
      if (cs.zIndex === 'auto' || +cs.zIndex < 1) ch.style.zIndex = '1';
    });
    if (isolated) fx.style.zIndex = '0';
    // на телефоне арт бывает ниже, чем весь блок: тогда слой жизни только над артом и без увеличения
    const partial = () => anchor.offsetHeight < host.offsetHeight * .9;
    const fit = () => { fx.style.bottom = partial() ? 'auto' : ''; fx.style.height = partial() ? anchor.offsetHeight + 'px' : ''; };
    fit();

    const S = {host, fx, light, shade, cv, pic: anchor, visible: false, w: 0, h: 0,
      x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, user: false, wander: Math.random() * 1000, parts: [], ctx: null, dpr: 1};
    // где «стоит» свеча, пока человек ничего не делает: ближе к арту
    const home = () => {
      const r = fx.getBoundingClientRect();
      const sm = r.width < 760;
      return [r.width * (sm ? .62 : .66), r.height * (sm ? .3 : .38)];
    };
    const size = () => {
      fit();
      const r = fx.getBoundingClientRect();
      S.w = r.width; S.h = r.height;
      let dpr = Math.min(1.5, W.devicePixelRatio || 1);
      if (S.w * S.h * dpr * dpr > 2.6e6) dpr = 1;
      S.dpr = dpr;
      cv.width = Math.round(S.w * dpr); cv.height = Math.round(S.h * dpr);
      S.ctx = cv.getContext('2d');
      const n = RM ? 0 : Math.round(Math.max(12, Math.min(46, S.w * S.h / 38000)) * TONE.dust * (SMALL ? .6 : 1));
      while (S.parts.length < n) S.parts.push(mote(S, true));
      S.parts.length = n;
      if (!S.user) { const [hx, hy] = home(); S.tx = hx; S.ty = hy; if (!S.x) { S.x = hx; S.y = hy; } }
    };
    size();
    addEventListener('resize', size, {passive: true, signal: ac.signal});

    const onMove = e => {
      const r = fx.getBoundingClientRect();
      S.tx = e.clientX - r.left; S.ty = e.clientY - r.top; S.user = true;
      S.px = (e.clientX - r.left) / r.width * 2 - 1; S.py = (e.clientY - r.top) / r.height * 2 - 1;
      wake();
    };
    host.addEventListener('pointermove', onMove, {passive: true, signal: ac.signal});
    host.addEventListener('pointerdown', onMove, {passive: true, signal: ac.signal});
    host.addEventListener('pointerleave', () => { S.user = false; S.px = S.py = 0; wake(); }, {passive: true, signal: ac.signal});

    if (!RM) pic.classList.add('alive-depth');

    const io = new IntersectionObserver(es => { S.visible = es[0].isIntersecting; if (S.visible) wake(); });
    io.observe(host); observers.push(io);

    jobs.add((t, dt) => {
      if (!S.visible) return false;
      const k = dt / 16;
      if (!S.user) {
        const [hx, hy] = home();
        S.wander += dt / 1000;
        S.tx = hx + Math.sin(S.wander * .35) * S.w * .05;
        S.ty = hy + Math.sin(S.wander * .23 + 1) * S.h * .04;
      }
      const ease = RM ? 1 : 1 - Math.pow(1 - .07, k);
      S.x += (S.tx - S.x) * ease; S.y += (S.ty - S.y) * ease;
      const f = RM ? .85 : flick(t) * (1 - gust * .65);
      const scale = (Math.min(S.w, 1400) / 1000) * (SMALL ? 1.1 : .9) * (1 + (1 - f) * .25);
      light.style.transform = `translate3d(${S.x}px,${S.y}px,0) scale(${scale.toFixed(3)})`;
      light.style.opacity = (TONE.a * f * 2.4).toFixed(3);
      shade.style.transform = `translate3d(${S.x}px,${S.y}px,0) scale(${(scale * (1.05 + gust * .4)).toFixed(3)})`;
      if (!RM && !partial()) {
        const sy = Math.max(-1, Math.min(1, -host.getBoundingClientRect().top / Math.max(1, S.h)));
        const dx = FINE ? -S.px * 12 : 0, dy = (FINE ? -S.py * 8 : 0) + sy * 40;
        S.pic.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        S.pic.style.scale = '1.06';
      }
      if (!RM) drawMotes(S, t, k);
      return !RM; // при «меньше движения» свет ставится один раз и замирает
    });
    wake();
  }

  // одна пылинка
  function mote(S, anywhere) {
    return {x: Math.random() * S.w, y: anywhere ? Math.random() * S.h : S.h + 10,
      r: .5 + Math.random() * Math.random() * 2.2, vy: -(.06 + Math.random() * .22), vx: (Math.random() - .5) * .08,
      ph: Math.random() * 6.28, sp: .4 + Math.random() * 1.2, a: .25 + Math.random() * .55};
  }
  let sprite = null;
  function getSprite() {
    if (sprite) return sprite;
    sprite = D.createElement('canvas'); sprite.width = sprite.height = 32;
    const g = sprite.getContext('2d'), c = TONE.light;
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(255,244,220,1)`); gr.addColorStop(.3, `rgba(${c},.55)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return sprite;
  }
  function drawMotes(S, t, k) {
    const g = S.ctx; if (!g || !S.parts.length) return;
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g.clearRect(0, 0, S.w, S.h);
    const sp = getSprite(), R = Math.min(S.w, S.h) * .55;
    for (const p of S.parts) {
      p.ph += .01 * p.sp * k;
      p.x += (p.vx + Math.sin(p.ph) * .12 + gust * 1.8) * k;
      p.y += (p.vy - gust * .3) * k;
      if (p.y < -10 || p.x > S.w + 20 || p.x < -20) Object.assign(p, mote(S, false), {x: gust > .1 ? -10 : Math.random() * S.w});
      const d = Math.hypot(p.x - S.x, p.y - S.y);
      const near = Math.max(0, 1 - d / R);
      const tw = .6 + .4 * Math.sin(p.ph * 3);
      g.globalAlpha = Math.min(1, p.a * (.18 + near * 1.1) * tw);
      const s = p.r * (4 + near * 3);
      g.drawImage(sp, p.x - s, p.y - s, s * 2, s * 2);
    }
    g.globalAlpha = 1;
  }

  /* ---------- 4: чернила проявляются ---------- */
  function inkInit() {
    const sel = '.band h2,.band h3,.band .lead,.band p:not(.entry p),.band li,.band blockquote,.band figure,.band .leaf,.band .ask,.band table,' +
                '.ch h2,.ch p,.ch figure,.ch blockquote,.ch .say,.cta p';
    const list = [...D.querySelectorAll(sel)].filter(el => !el.closest('.entry') && !el.closest('nav') && !el.parentElement.closest('.alive-ink'));
    const vh = innerHeight;
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const el = e.target; io.unobserve(el);
        const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
        el.style.transitionDelay = ((sib % 5) * 90) + 'ms';
        el.classList.add('alive-in');
        if (el.classList.contains('alive-write')) setTimeout(() => el.classList.add('alive-go'), 250 + (sib % 5) * 90);
        setTimeout(() => { el.style.transitionDelay = ''; }, 1600);
      }
    }, {rootMargin: '0px 0px -8% 0px', threshold: .01});
    observers.push(io);
    list.forEach(el => {
      if (el.getBoundingClientRect().top < vh * .92) return; // то, что уже на экране, не прячем
      el.classList.add('alive-ink');
      if (!SMALL && el.tagName !== 'FIGURE') el.classList.add('alive-blur');
      io.observe(el);
    });
    // рукописные строки дописываются сами
    D.querySelectorAll('.q:not(.qa .q), .hand, .cta p, .poem').forEach(el => {
      el.classList.add('alive-write');
      if (el.getBoundingClientRect().top < vh * .92) setTimeout(() => el.classList.add('alive-go'), entering ? 900 : 500);
      else { el.classList.add('alive-ink'); io.observe(el); }
    });
  }

  /* ---------- карты и страницы наклоняются к свету ---------- */
  function tiltInit() {
    if (!FINE || RM) return;
    D.querySelectorAll('.card, .shelf a, .rgrid blockquote, .leaf').forEach(el => {
      el.classList.add('alive-tilt');
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      const gl = D.createElement('span'); gl.className = 'alive-glare'; gl.setAttribute('aria-hidden', 'true');
      el.appendChild(gl);
      const base = getComputedStyle(el).transform;
      const baseT = base && base !== 'none' ? base + ' ' : '';
      const lift = el.classList.contains('card') ? -8 : el.closest('.shelf') ? -3 : -2;
      const max = el.classList.contains('card') ? 6 : 3;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('alive-tilting');
        el.style.transform = `${baseT}perspective(900px) translateY(${lift}px) rotateX(${((.5 - y) * max).toFixed(2)}deg) rotateY(${((x - .5) * max).toFixed(2)}deg)`;
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      }, {passive: true, signal: ac.signal});
      el.addEventListener('pointerleave', () => { el.classList.remove('alive-tilting'); el.style.transform = ''; }, {passive: true, signal: ac.signal});
    });
  }

  /* ---------- 7, 5: полка памяти дышит, открытые страницы связаны ниткой ---------- */
  function shelfInit() {
    const shelf = D.querySelector('.shelf');
    if (!shelf) return;
    const items = [...shelf.querySelectorAll('a')];
    items.forEach((a, i) => {
      a.style.setProperty('--dl', (-i * 1.3).toFixed(1) + 's');
      if (!RM) a.addEventListener('pointerenter', () => { a.classList.remove('alive-rustle'); void a.offsetWidth; a.classList.add('alive-rustle'); }, {signal: ac.signal});
    });
    // полка отмечает открытые страницы своим скриптом; ждём его
    setTimeout(() => {
      const read = items.filter(a => a.classList.contains('read'));
      if (read.length < 2) return;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'alive-shelf-thread'); svg.setAttribute('aria-hidden', 'true');
      const path = D.createElementNS(NS, 'path'); svg.appendChild(path); shelf.appendChild(svg);
      const draw = () => {
        const R = shelf.getBoundingClientRect();
        const pts = read.map(a => { const c = a.getBoundingClientRect(); return [c.left - R.left + 9, c.top - R.top + 7]; });
        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
          const sag = y0 === y1 ? 6 + Math.abs(x1 - x0) * .012 : 0;
          d += ` Q${(x0 + x1) / 2},${Math.max(y0, y1) + sag} ${x1},${y1}`;
        }
        path.setAttribute('d', d);
        const len = Math.ceil(path.getTotalLength());
        svg.style.setProperty('--len', len);
      };
      draw();
      addEventListener('resize', draw, {passive: true, signal: ac.signal});
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { svg.classList.add('on'); io.disconnect(); } }, {threshold: .4});
      io.observe(shelf); observers.push(io);
      if (RM) svg.classList.add('on');
    }, 60);
  }

  /* ---------- 5: красная нитка вдоль страницы ---------- */
  function threadInit() {
    if (!D.querySelector('.band') || D.querySelector('.bar #prog')) return; // в повести вместо нитки свеча
    const NS = 'http://www.w3.org/2000/svg';
    const svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'alive-thread'); svg.setAttribute('aria-hidden', 'true');
    const path = D.createElementNS(NS, 'path'), knot = D.createElementNS(NS, 'circle');
    knot.setAttribute('r', '2.6');
    svg.append(path, knot); D.body.appendChild(svg);
    let sway = 0, vel = 0, lastY = scrollY, still = 0;
    const render = t => {
      const vh = innerHeight, max = Math.max(1, D.documentElement.scrollHeight - vh);
      const p = Math.min(1, Math.max(0, scrollY / max));
      const L = 26 + p * (vh - 70);
      const x = 15, bend = sway + Math.sin(t / 900) * (RM ? 0 : 1.6);
      path.setAttribute('d', `M${x},-2 Q${x + bend},${L * .55} ${x + bend * .35},${L}`);
      knot.setAttribute('cx', (x + bend * .35).toFixed(1)); knot.setAttribute('cy', L.toFixed(1));
      if (fiber) fiber(L, bend);
    };
    const fiber = fiberInit(svg);
    jobs.add((t, dt) => {
      const y = scrollY; const v = y - lastY; lastY = y;
      if (Math.abs(v) > .5) still = 0; else still += dt;
      if (!RM) { vel += (-v * .06 - sway * .02) * (dt / 16); vel *= .9; sway += vel; sway = Math.max(-14, Math.min(14, sway)); }
      render(t);
      return still < 5000 || Math.abs(sway) > .05;
    });
    addEventListener('scroll', wake, {passive: true, signal: ac.signal});
    addEventListener('resize', wake, {passive: true, signal: ac.signal});
    render(0); wake();
  }

  /* ---------- сюжет: нитка вытягивается из шарфа на арте таверны ---------- */
  function fiberInit(threadSvg) {
    const img = D.querySelector('.cover > img[src*="portrait"]');
    if (!img || SMALL) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'alive-fiber'); svg.setAttribute('aria-hidden', 'true');
    const path = D.createElementNS(NS, 'path'), end = D.createElementNS(NS, 'circle');
    end.setAttribute('r', '2.2');
    svg.append(path, end); D.body.appendChild(svg);
    const SCARF = [.4, .45]; // шарф над тетрадью, в долях исходной картинки
    const anchor = () => {
      const r = img.getBoundingClientRect(), nw = img.naturalWidth || 1536, nh = img.naturalHeight || 2048;
      const sc = Math.max(r.width / nw, r.height / nh), w = nw * sc, h = nh * sc;
      const op = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
      const ox = (r.width - w) * (isNaN(op[0]) ? .5 : op[0]), oy = (r.height - h) * (isNaN(op[1]) ? .5 : op[1]);
      return [r.left + ox + w * SCARF[0], r.top + oy + h * SCARF[1]];
    };
    let len = 0;
    return (L, bend) => {
      const [ax, ay] = anchor();
      const tr = threadSvg.getBoundingClientRect();
      const tx = tr.left + 15 + bend * .35, ty = L;
      const cover = img.parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -cover.top / Math.max(1, cover.height * .55))); // сколько пролистали обложку
      const mx = (ax + tx) / 2, my = Math.max(ay, ty) + 60 + Math.abs(tx - ax) * .08; // нитка провисает
      path.setAttribute('d', `M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
      const l = path.getTotalLength();
      if (Math.abs(l - len) > 1) { len = l; path.style.strokeDasharray = l; }
      path.style.strokeDashoffset = (l * (1 - (RM ? 1 : p))).toFixed(1);
      end.setAttribute('cx', ax.toFixed(1)); end.setAttribute('cy', ay.toFixed(1));
      svg.style.opacity = p > .02 || RM ? '1' : '0';
      const on = p > .02 && cover.bottom > -40;
      end.style.opacity = on ? '1' : '0';
    };
  }

  /* ---------- 8: свеча повести догорает, пока читаешь ---------- */
  function candleInit() {
    const prog = D.querySelector('.bar #prog');
    if (!prog) return;
    prog.style.display = 'none';
    const c = D.createElement('div'); c.className = 'alive-candle'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span class="halo"></span><span class="wax"></span><span class="wick"></span><span class="fl"></span>';
    D.body.appendChild(c);
    const upd = () => {
      const vh = innerHeight, max = Math.max(1, D.documentElement.scrollHeight - vh);
      const p = Math.min(1, Math.max(0, scrollY / max));
      c.style.setProperty('--left', (1 - p).toFixed(3));
      c.classList.toggle('on', scrollY > vh * .8);
    };
    let tk = false;
    addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(() => { tk = false; upd(); }); } }, {passive: true, signal: ac.signal});
    addEventListener('resize', upd, {passive: true, signal: ac.signal});
    upd();
  }

  /* ---------- 6: замок отвечает ---------- */
  function gateInit() {
    const form = D.getElementById('gate');
    if (!form) return;
    const h1 = D.querySelector('.scene h1');
    D.addEventListener('alive:fail', () => {
      gustNow(1);
      if (RM || !h1) return;
      h1.classList.remove('alive-smudge'); void h1.offsetWidth; h1.classList.add('alive-smudge');
    }, sig);
    W.aliveUnlock = () => new Promise(res => {
      ss.set('alive-enter', '1');
      sfx('seal', .8);
      if (RM) { res(); return; }
      const box = D.createElement('div'); box.className = 'alive-seal'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = `<span class="glow"></span><span class="veil"></span>
<svg viewBox="0 0 120 120"><defs><radialGradient id="aw" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e3485d"/><stop offset=".6" stop-color="#9e1c31"/><stop offset="1" stop-color="#5e0f1c"/></radialGradient></defs>
<g class="half l"><path d="M60 6 C30 6 8 28 9 58 C8 88 30 114 60 113 L56 96 L63 80 L55 64 L64 48 L57 30 Z" fill="url(#aw)"/></g>
<g class="half r"><path d="M60 6 C90 6 112 30 111 60 C112 90 88 114 60 113 L56 96 L63 80 L55 64 L64 48 L57 30 Z" fill="url(#aw)"/></g>
<g fill="none" stroke="rgba(255,210,200,.55)" stroke-width="2.2" stroke-linecap="round"><circle cx="60" cy="60" r="38" stroke-dasharray="3 5"/>
</g><text x="60" y="78" text-anchor="middle" font-family="Cormorant Garamond,serif" font-weight="600" font-size="52" fill="rgba(255,214,204,.6)" stroke="rgba(70,8,18,.5)" stroke-width="1">Ф</text></svg>`;
      D.body.appendChild(box);
      requestAnimationFrame(() => box.classList.add('go'));
      setTimeout(() => box.classList.add('crack'), 520);
      setTimeout(res, 1450);
    });
  }

  // сквозняк: свет приседает, пылинки летят вбок
  function gustNow(power) {
    if (RM) return;
    const t0 = performance.now();
    const job = t => { const k = (t - t0) / 1600; gust = k < 1 ? power * Math.sin(Math.PI * Math.min(1, k)) : 0; if (k >= 1) { jobs.delete(job); return false; } return true; };
    jobs.add(job); wake();
  }

  /* ---------- сайт замечает, что ты затих ---------- */
  function idleInit() {
    if (RM) return;
    const hasLaugh = !!D.querySelector('.stage .q, .cover .no') && !D.querySelector('.bar #prog') && !D.getElementById('gate');
    let laughed = false;
    const tick = () => {
      if (!alive()) return;
      const idle = performance.now() - lastInput;
      if (!D.hidden && idle > 24000) {
        lastInput = performance.now();
        gustNow(.8);
        if (hasLaugh && !laughed) { laughed = true; setTimeout(laughOnce, 1200); }
      }
      setTimeout(tick, 2000);
    };
    setTimeout(tick, 2000);
  }
  function laughOnce() {
    const q = D.querySelector('.stage .q');
    if (q) { q.classList.remove('alive-q-shiver'); void q.offsetWidth; q.classList.add('alive-q-shiver'); }
    const s = D.createElement('span'); s.className = 'alive-laugh'; s.setAttribute('aria-hidden', 'true');
    s.textContent = 'ха';
    const left = Math.random() < .5;
    s.style.left = (left ? 3 + Math.random() * 10 : 82 + Math.random() * 10) + 'vw';
    s.style.top = (18 + Math.random() * 55) + 'vh';
    s.style.rotate = (Math.random() * 24 - 12) + 'deg';
    s.addEventListener('animationend', () => s.remove());
    D.body.appendChild(s);
  }

  /* ---------- звук: только по кнопке, тишина по умолчанию ---------- */
  // файлы лежат в assets/sfx/; если файла нет, кнопка просто не появляется
  const SFX_BASE = (() => { const sc = D.querySelector('script[src$="assets/alive.js"]'); return sc ? sc.src.replace(/alive\.js$/, 'sfx/') : 'assets/sfx/'; })();
  const PAGE_AMB = () => {
    if (D.getElementById('gate')) return ['rain'];
    if (D.querySelector('.shelf')) return ['tavern'];          // таверна
    if (D.querySelector('.bar #prog')) return ['rain', 'fire']; // повесть
    if (D.querySelector('.hero')) return ['fire'];              // мастер
    if (D.querySelector('.journal')) return ['fire', 'rain'];   // страницы памяти
    return ['rain'];                                            // главная
  };
  const VOL = {tavern: .55, fire: .5, rain: .4};
  const sndOn = () => ls.get('alive-sound') === 'on';
  const amb = [];
  function sfx(name, v) {
    if (!sndOn()) return;
    try { const a = new Audio(SFX_BASE + name + '.mp3'); a.volume = v || .6; a.play().catch(() => {}); } catch (e) {}
  }
  // фон играет через Web Audio: так петля звучит без щелчка на стыке
  let actx = null, master = null, loading = null;
  async function ambStart() {
    try {
      if (!actx) { actx = new (W.AudioContext || W.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination); }
      if (actx.state === 'suspended') await actx.resume();
      if (!amb.length && !loading) loading = Promise.all(PAGE_AMB().map(async n => {
        const buf = await actx.decodeAudioData(await (await fetch(SFX_BASE + n + '.mp3')).arrayBuffer());
        const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
        const g = actx.createGain(); g.gain.value = VOL[n] || .4;
        src.connect(g).connect(master);
        src.start(0, Math.random() * buf.duration); // каждый раз с нового места
        amb.push({pause() { try { src.stop(); } catch (e) {} }});
      }));
      await loading;
      if (!alive() || !sndOn()) return;
      const t = actx.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(1, t + 2);
    } catch (e) {}
  }
  function ambStop() {
    if (!actx) return;
    const t = actx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + .8);
  }
  async function soundInit() {
    const names = PAGE_AMB();
    let ok = false;
    try { const r = await fetch(SFX_BASE + names[0] + '.mp3', {method: 'HEAD'}); ok = r.ok; } catch (e) {}
    if (!ok || !alive()) return;
    const b = D.createElement('button');
    b.type = 'button'; b.className = 'alive-snd';
    b.setAttribute('aria-label', 'Звук'); b.title = 'Звук';
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="x" d="M16 10l4 4M20 10l-4 4"/></svg>';
    const sync = () => b.setAttribute('aria-pressed', sndOn() ? 'true' : 'false');
    sync();
    b.addEventListener('click', () => {
      ls.set('alive-sound', sndOn() ? 'off' : 'on'); sync();
      if (sndOn()) ambStart(); else ambStop();
    }, sig);
    D.body.appendChild(b);
    // на телефоне кнопка не мешает читать: прячется, пока листаешь
    if (SMALL) { let tm = 0; addEventListener('scroll', () => { b.classList.add('away'); clearTimeout(tm); tm = setTimeout(() => b.classList.remove('away'), 1400); }, {passive: true, signal: ac.signal}); }
    if (sndOn()) {
      ambStart();
      // браузер может не дать играть до первого касания: тогда начнём с него
      const kick = () => { if (sndOn()) ambStart(); };
      addEventListener('pointerdown', kick, {once: true, signal: ac.signal});
      addEventListener('keydown', kick, {once: true, signal: ac.signal});
    }
    D.addEventListener('visibilitychange', () => { if (!sndOn() || !actx) return; if (D.hidden) actx.suspend(); else actx.resume(); }, sig);
  }

  /* ---------- сюжет: смех рвёт строку «Вы слышите? Кто-то смеётся» ---------- */
  function tearInit() {
    const q = D.querySelector('.stage .q');
    if (!q || RM) return;
    let busy = false, hold = 0;
    const jag = (y, n) => { const pts = []; for (let i = 0; i <= n; i++) pts.push([i / n * 100, y + (Math.random() - .5) * 7]); return pts; };
    const tear = () => {
      if (busy) return; busy = true;
      const host = q.parentElement;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      const hr = host.getBoundingClientRect(), r = q.getBoundingClientRect();
      const cut = jag(50, 14);
      const top = 'polygon(0% 0%,100% 0%,' + cut.slice().reverse().map(([x, y]) => `${x}% ${y}%`).join(',') + ')';
      const bot = 'polygon(' + cut.map(([x, y]) => `${x}% ${y}%`).join(',') + ',100% 100%,0% 100%)';
      const mk = clip => {
        const c = q.cloneNode(true);
        c.classList.remove('alive-write', 'alive-go', 'alive-ink', 'alive-in', 'alive-q-shiver');
        c.classList.add('alive-tear'); c.setAttribute('aria-hidden', 'true');
        Object.assign(c.style, {left: (r.left - hr.left) + 'px', top: (r.top - hr.top) + 'px', width: r.width + 'px', clipPath: clip, WebkitClipPath: clip});
        host.appendChild(c); return c;
      };
      const a = mk(top), b = mk(bot);
      const gap = D.createElement('div'); gap.className = 'alive-tear-gap'; gap.setAttribute('aria-hidden', 'true');
      gap.innerHTML = '<span>ха</span><span>ха-ха</span><span>ха</span>';
      Object.assign(gap.style, {left: (r.left - hr.left) + 'px', width: r.width + 'px', top: (r.top - hr.top + r.height / 2 - 9) + 'px', height: '18px'});
      host.appendChild(gap);
      q.style.visibility = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        a.style.transform = 'translateY(-13px) rotate(-.7deg)';
        b.style.transform = 'translateY(13px) rotate(.6deg)';
        gap.style.opacity = '.85';
        gustNow(.6);
      }));
      setTimeout(() => { a.style.transform = b.style.transform = ''; gap.style.opacity = '0'; }, 2100);
      setTimeout(() => { a.remove(); b.remove(); gap.remove(); q.style.visibility = ''; busy = false; }, 2700);
    };
    q.addEventListener('pointerenter', () => { clearTimeout(hold); hold = setTimeout(tear, 900); }, sig);
    q.addEventListener('pointerleave', () => clearTimeout(hold), sig);
    q.addEventListener('click', tear, sig);
  }

  /* ---------- сюжет: под растаявшим «Ро…» проступает новое имя (повесть, глава «Филипп») ---------- */
  function smokeHandInit() {
    const p = D.querySelector('p.forget');
    if (!p || RM) return;
    const NS = 'http://www.w3.org/2000/svg';
    const run = () => {
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      // под растаявшим «Ро…» проступает новое имя
      const ro = p.querySelector('.ro');
      if (ro) setTimeout(() => {
        const n = D.createElement('span'); n.className = 'alive-name'; n.setAttribute('aria-hidden', 'true'); n.textContent = 'Филипп';
        const pr = p.getBoundingClientRect(), rr = ro.getBoundingClientRect();
        n.style.left = (rr.left - pr.left) + 'px'; n.style.top = (rr.top - pr.top - rr.height * .15) + 'px';
        p.appendChild(n); requestAnimationFrame(() => n.classList.add('on'));
      }, 6200);
    };
    if (p.classList.contains('seen')) { run(); return; }
    const mo = new MutationObserver(() => { if (p.classList.contains('seen')) { mo.disconnect(); run(); } });
    mo.observe(p, {attributes: true, attributeFilter: ['class']}); observers.push(mo);
  }
})();
