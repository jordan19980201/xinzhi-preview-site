/* 信誌科技 v5 共用程式（T-Patrol、T-Vouch 產品網站）
   左右翻頁、開場城市（鏡頭停在產品的角落）、飛進角落看故事、影片對話框。
   用法：V5.init({ home: function (P) { return 鏡頭 }, spot: 'patrol'|'vouch', stories: function (P) { return {...} }, enter: function (page) {} }) */
(function () {
  function init(cfg) {
    var main = document.querySelector('main'), pages = [].slice.call(main.children);
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var navBtns = [].slice.call(document.querySelectorAll('.top nav button[data-to]'));
    var prev = document.querySelector('.pager .prev'), next = document.querySelector('.pager .next'), nextLabel = document.querySelector('.js-next-label');
    var idx = -1, lock = false, seen = new Set();

    function go(i) { i = Math.max(0, Math.min(pages.length - 1, i)); main.scrollTo({ left: pages[i].offsetLeft, behavior: reduced ? 'auto' : 'smooth' }); }
    function byId(id) { return pages.findIndex(function (p) { return p.id === id; }); }
    function sync() {
      var i = Math.round(main.scrollLeft / main.clientWidth);
      if (i === idx) return;
      idx = i;
      var id = pages[i].id;
      navBtns.forEach(function (b) { b.setAttribute('aria-current', b.dataset.to === id); });
      var bar = document.querySelector('.progress i'); if (bar) bar.style.setProperty('--p', (i + 1) / pages.length);
      prev.disabled = i === 0;
      next.disabled = i === pages.length - 1;
      if (i < pages.length - 1) nextLabel.textContent = '下一頁：' + pages[i + 1].dataset.name;
      if (!seen.has(id)) { seen.add(id); pages[i].classList.add('in'); if (cfg.enter) cfg.enter(pages[i]); }
      if (city) scene(id);
    }
    main.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    addEventListener('resize', function () { if (idx >= 0) main.scrollLeft = pages[idx].offsetLeft; });
    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx + 1); });
    document.addEventListener('click', function (e) { var t = e.target.closest('[data-to]'); if (!t) return; e.preventDefault(); go(byId(t.dataset.to)); });
    main.addEventListener('wheel', function (e) {
      if (document.body.classList.contains('in-story')) { e.preventDefault(); return; }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var p = pages[idx];
      if ((e.deltaY > 0 && p.scrollTop + p.clientHeight < p.scrollHeight - 2) || (e.deltaY < 0 && p.scrollTop > 2)) return;
      e.preventDefault();
      if (lock || Math.abs(e.deltaY) < 4) return;
      lock = true; go(idx + (e.deltaY > 0 ? 1 : -1)); setTimeout(function () { lock = false; }, 700);
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (document.querySelector('dialog[open]') || (e.target.closest && e.target.closest('input, textarea, [role="tablist"]'))) return;
      var d = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[e.key];
      if (d) { e.preventDefault(); go(idx + d); }
    });

    // ---------- 開場城市：先看到整座城，再飛進這個產品的角落 ----------
    var hello = document.querySelector('.p-hello'), copy = hello.querySelector('.copy');
    var pin = hello.querySelector('.pin'), toast = hello.querySelector('.toast'), hqTag = hello.querySelector('.pin-hq');
    var storyId = null, curId = 'hello';
    // 城市是整個網站的背景：畫布移到所有頁面後面，每一頁都看得到它在動
    var canvas = hello.querySelector('.city'); document.body.insertBefore(canvas, main);
    var city = window.__cityApi = window.City.mount(canvas, {
      theme: document.documentElement.dataset.theme === 'paper' ? 'day' : 'dusk',
      frame: function (w, h) { return w < 641 ? { x: 4, y: 64, w: w - 8, h: Math.max(120, copy.getBoundingClientRect().top - 72) } : w < 961 ? { x: 4, y: 64, w: w - 8, h: h * .4 } : { x: w * .4, y: 70, w: w * .6, h: h - 110 }; },
      onAlert: function (on) { if (toast) toast.classList.toggle('on', on); },
      minZoom: function (w) { return w < 641 ? 1.8 : 0; },   // 手機：城市放大填滿畫面
      onLayout: placePin, onFrame: function () { placePin(); if (story) story.frame(); },
      anchor: function (w, h) {
        if (w < 961) return { x: .5, y: storyId ? .24 : w < 641 && curId === 'hello' ? (64 + copy.getBoundingClientRect().top) / 2 / h : .27 };   // 手機：城市佔全螢幕，焦點放在文字上方的空間
        if (storyId) return { x: .6, y: .36 };
        if (curId === 'hello') return { x: .72, y: .56 };
        var c = CAMS[curId] || {}; return { x: c.ax || .64, y: c.ay || .5 };
      }
    });
    hello.addEventListener('scroll', placePin, { passive: true });
    var P = city.places, HOME = cfg.home(P), CAMS = cfg.cams ? cfg.cams(P) : {}, strayOn = false;
    function camFor(id) { return id === 'hello' ? HOME : CAMS[id] || HOME; }
    // 每一頁一個鏡頭位置與城市事件（例如「老師最怕的事」那頁，學生真的走出範圍）
    function scene(id) {
      curId = id; city.setVisible(true);
      if (storyId) return;
      var c = camFor(id);
      if (c.stray === 'out' && !strayOn) { strayOn = true; city.storyMode(true); city.setStray('out'); }
      else if (c.stray !== 'out' && strayOn) { strayOn = false; city.setStray('back'); city.storyMode(false); }
      if (c.papers) city.setPapers(c.papers);
      city.flyTo(c, reduced ? 0 : 1800);
    }
    function placePin() {
      var s = city.spots();
      var st = hello.scrollTop;   // 手機開場頁可以往下捲：加上捲動距離，標籤才會一直貼在固定不動的城市上
      if (pin) pin.style.translate = s[cfg.spot].x.toFixed(2) + 'px ' + ((st > 0 ? s[cfg.spot].y : Math.max((innerWidth < 641 ? 64 : 76) + pin.offsetHeight + 4, s[cfg.spot].y)) + st).toFixed(2) + 'px';   // 標籤不要壓到頂列
      if (hqTag) hqTag.style.translate = s.hq.x.toFixed(2) + 'px ' + (s.hq.y + st).toFixed(2) + 'px';
      if (toast) toast.style.translate = s.stray.x.toFixed(2) + 'px ' + (s.stray.y + st).toFixed(2) + 'px';
    }
    // 進場：先停在整座城一下，再飛進角落（減少動態時直接到位）
    setTimeout(function () { if (!storyId) city.flyTo(camFor(curId), 2200); }, reduced ? 0 : 700);
    if (reduced) city.flyTo(camFor(curId), 0);

    // ---------- 故事（播放器在 stories.js，官網共用） ----------
    var storyEl = hello.querySelector('.story'); storyEl.innerHTML = window.V5StoryHTML;
    var story = window.V5Story({ city: city, root: hello, main: main, reduced: reduced, toast: toast, home: HOME, stories: cfg.stories(P),
      onOpen: function () { storyId = true; strayOn = false; hello.scrollTop = 0; if (idx !== 0) { main.scrollLeft = 0; sync(); } },
      onClose: function (goTo) { storyId = null; if (goTo) go(byId(goTo)); } });

    // ---------- 影片 ----------
    var dlg, vid;
    document.querySelectorAll('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!dlg) {
          dlg = document.createElement('dialog'); dlg.className = 'vbox'; dlg.setAttribute('aria-label', '介紹影片');
          dlg.innerHTML = '<button type="button" class="x" aria-label="關閉影片">×</button><video controls playsinline preload="none"></video>';
          document.body.appendChild(dlg); vid = dlg.querySelector('video');
          dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.x')) dlg.close(); });
          dlg.addEventListener('close', function () { vid.pause(); if (dlg._from) dlg._from.focus(); });
        }
        dlg._from = b; vid.poster = b.dataset.poster || ''; vid.src = b.dataset.video;
        dlg.showModal(); vid.play().catch(function () {});
      });
    });

    // ---------- 分頁籤（role="tablist"）：左右鍵切換 ----------
    document.querySelectorAll('[role="tablist"]').forEach(function (list) {
      var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
      function sel(t) {
        tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
        if (cfg.onTab) cfg.onTab(t);
      }
      tabs.forEach(function (t) { t.addEventListener('click', function () { sel(t); }); });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (i < 0 || !d) return; e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); sel(n);
      });
    });

    var start = location.hash && byId(location.hash.slice(1));
    if (start > 0) main.scrollLeft = pages[start].offsetLeft;
    sync(); placePin();
    if (location.hash === '#patrol' || location.hash === '#vouch') story.open(location.hash.slice(1));
    window.__check = function () { return { page: idx, story: story.current(), chapter: story.chapter() }; };
    return { go: go, city: city, story: story };
  }
  window.V5 = { init: init };
})();
