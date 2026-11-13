/* 兩個角落的故事（官網與產品網站共用同一份文字；數字都出自現有網站與 2026 執行紀錄）。
   at：這一幕在時間軸上的位置（0～1）。校外教學照實際時間 08:00～17:30 排；發票旅程平均排。
   site：'company' | 't-patrol' | 't-vouch'，決定最後一幕的按鈕要去哪裡。 */
(function () {
  function day(hm) { var p = hm.split(':'), m = +p[0] * 60 + +p[1]; return (m - 480) / (1050 - 480); }
  window.V5Stories = function (P, site) {
    var co = site === 'company';
    return {
      patrol: { title: '<b>T-Patrol 平安福</b>　校外教學的一天', endTo: co ? null : 'device', endLabel: co ? '回到城市' : '看裝置',
        chapters: [
          { t: '08:00', at: day('08:00'), h: '七年一班，校外教學出發。', p: '每個學生戴上識別證套或手環。學生證直接放進證套，和平常一樣掛在胸前。', cam: { x: 9.6, y: 13, z: .3, zoom: 2.3 }, beat: 'bus-in', marks: [{ at: 'bus', t: '七年一班・出發', delay: 3000 }],
            vis: '<div class="sv-devs"><img src="../../t-patrol/assets/device-card.webp" alt="識別證套式定位裝置"><img src="../../t-patrol/assets/device-band.webp" alt="手環式定位裝置"></div>' },
          { t: '10:30', at: day('10:30'), h: '自由活動，全班在哪一眼看完。', p: '老師手機上的地圖即時顯示每個學生的位置，不用一個一個打電話。', cam: { x: P.field.x - .3, y: P.field.y + .3, z: .2, zoom: 3.1 }, beat: 'pings', marks: [{ at: 'teacher', t: '老師的手機：14 / 14 在範圍內', cls: 'ok', delay: 1200 }],
            vis: '<p class="sv-big"><span class="ok">14</span> / 14<small>七年一班・在範圍內</small></p>' },
          { t: '11:12', at: day('11:12'), h: '王小明走出範圍了。', p: '在學校後台設好電子圍籬，學生一離開範圍，老師手機馬上收到通知。', cam: { x: P.gate.x - 1.1, y: P.gate.y - .9, z: .2, zoom: 3 }, stray: 'out', beat: 'alert', marks: [{ at: 'stray', t: '王小明 離開範圍', cls: 'alert', delay: 1500 }, { at: 'teacher', t: '老師手機馬上收到通知', delay: 1900 }],
            vis: '<div class="sv-alert" role="img" aria-label="手機通知：王小明已離開設定範圍"><i></i><b>T-Patrol 平安福</b><time>11:12</time><span>王小明 已離開設定範圍</span></div>' },
          { t: '11:30', at: day('11:30'), h: '集合，按一下就點完名。', p: '誰到了、誰還沒到，秒看清楚。王小明也回來了。', cam: { x: P.field.x - .5, y: P.field.y + .4, z: .2, zoom: 3.2 }, stray: 'back', roll: true, beat: 'gather', marks: [{ at: 'teacher', t: '一鍵點名：全員到齊', cls: 'ok', delay: 4200 }],
            vis: '<ul class="sv-roll js-roll"><li><em>·</em>陳同學</li><li><em>·</em>林同學</li><li><em>·</em>黃同學</li><li><em>·</em>張同學</li><li><em>·</em>李同學</li><li><em>·</em>王小明</li></ul><p class="sv-sum js-sum">已到 0 / 14</p>' },
          { t: '17:30', at: 1, h: '平安回家。', p: '活動軌跡保留 6 個月，事後有據。2026 年，T-Patrol 陪七所學校出門：', cam: { x: 13.6, y: 13.6, z: .2, zoom: 1.9 }, beat: 'bus-out', marks: [{ at: 'bus', t: '平安回家', cls: 'ok', delay: 500 }],
            vis: '<div class="sv-stats"><div><b>7</b><span>所學校</span></div><div><b>27</b><span>天活動</span></div><div><b>0</b><span>件事故</span></div></div>' +
              (co ? '<div class="sv-cta"><a class="btn" href="?subject=T-Patrol#talk" data-close-to="talk">預約免費試辦</a><a class="go" href="../t-patrol/">看 T-Patrol 網站</a></div>'
                  : '<div class="sv-cta"><a class="btn" href="#start" data-close-to="start">預約免費試辦</a></div>') }
        ] },
      vouch: { title: '<b>T-Vouch</b>　一張發票的旅程', endTo: co ? null : 'try', endLabel: co ? '回到城市' : '自己試一次',
        chapters: [
          { t: '月底', at: 0, h: '會計部，一疊發票等著輸入。', p: '日期、統編、金額，一張一張打進系統，又慢又容易出錯。', cam: { x: P.tower.x, y: P.tower.y, z: 3, zoom: 2.6 }, beat: 'pile', marks: [{ at: 'floor', t: '會計部：一疊發票等著輸入', delay: 1100 }],
            vis: '<div class="sv-pile" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p class="sv-note">示意：一個月下來，常常是幾百張。</p>' },
          { t: '拍一下', at: .25, h: '拍照上傳，一張或一整疊。', p: '用手機拍，或一次上傳一整疊，AI 同步處理。', cam: { x: P.tower.x + .4, y: P.tower.y, z: 3.4, zoom: 2.4 }, beat: 'snap', marks: [{ at: 'floor', t: '拍一下，上傳', delay: 900 }],
            vis: '<p class="sv-chips"><span>JPG</span><span>PNG</span><span>PDF</span></p>' },
          { t: 'AI 讀出來', at: .5, h: '欄位自己跑出來。', p: 'AI 擷取發票號碼、日期、統編、金額，你只要確認。', cam: { x: P.tower.x, y: P.tower.y, z: 7.4, zoom: 1.9 }, ocr: true, beat: 'ai', marks: [{ at: 'ai', t: 'AI 讀出日期、統編、金額', cls: 'ok', delay: 1200 }],
            vis: '<div class="sv-ocr js-ocr">' + V5Invoice({ ocr: true }) + '<dl><div><dt>日期</dt><dd>2026/10/16</dd></div><div><dt>賣方統編</dt><dd>53880413</dd></div><div><dt>金額</dt><dd>NT$ 1,280</dd></div></dl></div><p class="sv-note">示意資料，非實際系統畫面</p>' },
          { t: '匯出', at: .75, h: '確認後，直接進會計軟體。', p: '匯出 CSV，或用 RESTful API 接進現有的財務系統。', cam: { x: 10, y: 4.6, z: 1, zoom: 1.7 }, beat: 'export', marks: [{ at: 'erp', t: '會計軟體・ERP', delay: 1500 }],
            vis: '<table class="sv-csv"><thead><tr><th>日期</th><th>號碼</th><th>總計</th><th></th></tr></thead><tbody><tr><td>10/16</td><td>AB-12345678</td><td>1,280</td><td>✓</td></tr><tr><td>10/16</td><td>CD-20481937</td><td>360</td><td>✓</td></tr><tr><td>10/17</td><td>收據</td><td>2,450</td><td>✓</td></tr></tbody></table><p class="sv-note">→ 2026-10.csv（示意）</p>' },
          { t: '開始', at: 1, h: '免費方案，每月 50 張。', p: '不用信用卡。付費方案月費 NT$590 起，年繳只付 10 個月。', cam: { x: P.tower.x, y: P.tower.y, z: 5.4, zoom: 1.45 }, beat: 'done', marks: [{ at: 'tower', t: '每月 50 張免費', cls: 'ok', delay: 900 }],
            vis: '<div class="sv-cta"><a class="btn" href="https://app.t-vouch.com/register">免費開始使用</a>' + (co ? '<a class="go" href="../t-vouch/">看 T-Vouch 網站</a>' : '<a class="go" href="#pricing" data-close-to="pricing">看方案</a>') + '</div>' }
        ] }
    };
  };
  /* 故事播放器：官網與產品網站共用。opt: { city, root(故事所在的 .page), main, reduced, onOpen, onClose(goTo), toast, home } */
  window.V5Story = function (opt) {
    var root = opt.root, storyEl = root.querySelector('.story'), steps = storyEl.querySelector('.story-steps'), body = storyEl.querySelector('.story-body');
    var STORIES = opt.stories, city = opt.city, reduced = opt.reduced;
    var id = null, chap = 0, opener = null, rollTimer = 0, ocrTimer = 0, markRaf = 0;
    var marksEl = document.createElement('div'); marksEl.className = 'st-marks'; marksEl.setAttribute('aria-hidden', 'true'); storyEl.insertBefore(marksEl, storyEl.firstChild.nextSibling);
    function placeMarks() {
      cancelAnimationFrame(markRaf);
      var W = innerWidth, topGap = (W < 641 ? 64 : 76) + 8;   // 標籤不要被頂列或螢幕邊緣切掉
      [].forEach.call(marksEl.children, function (el) { var p = city.where && city.where(el.dataset.at); el.style.visibility = p ? 'visible' : 'hidden'; if (p) { var hw = el.offsetWidth / 2 + 8; el.style.left = Math.max(hw, Math.min(W - hw, p.x)) + 'px'; el.style.top = Math.max(topGap + el.offsetHeight + 12, p.y) + 'px'; } });
      if (id && !reduced) markRaf = requestAnimationFrame(placeMarks);
    }
    function open(sid, from) {
      var S = STORIES[sid]; if (!S) return;
      id = sid; opener = from || null; chap = 0;
      storyEl.querySelector('.story-kick').innerHTML = S.title;
      steps.innerHTML = '';
      S.chapters.forEach(function (c, i) { var li = document.createElement('li'), b = document.createElement('button'); li.style.setProperty('--at', c.at); if (i > 0 && c.at - S.chapters[i - 1].at < .05 && !(steps.lastChild && steps.lastChild.className === 'up')) li.className = 'up'; /* 太近就放線上方；上下交錯 */ b.type = 'button'; b.textContent = c.t; b.setAttribute('aria-label', '第 ' + (i + 1) + ' 幕：' + c.t); b.addEventListener('click', function () { show(i); }); li.appendChild(b); steps.appendChild(li); });
      document.body.classList.add('in-story'); opt.main.style.overflowX = 'hidden';
      storyEl.hidden = false; city.storyMode(true);
      if (opt.onOpen) opt.onOpen(sid);
      show(0);
      storyEl.querySelector('.story-x').focus({ preventScroll: true });
    }
    function close(goTo) {
      if (!id) return;
      clearInterval(rollTimer); clearTimeout(ocrTimer); id = null; cancelAnimationFrame(markRaf); marksEl.innerHTML = ''; if (city.setBeat) city.setBeat(null);
      storyEl.hidden = true; document.body.classList.remove('in-story'); opt.main.style.overflowX = '';
      city.storyMode(false); city.setStray('back'); city.setPapers('flow'); city.flyTo(opt.home || null, 1300); if (opt.toast) opt.toast.classList.remove('on');
      if (opt.onClose) opt.onClose(goTo);
      if (!goTo && opener) opener.focus({ preventScroll: true });
    }
    function show(i) {
      var S = STORIES[id], c = S.chapters[i]; chap = i;
      [].forEach.call(steps.querySelectorAll('button'), function (b, k) { b.setAttribute('aria-current', k === i ? 'step' : 'false'); b.classList.toggle('done', k < i); });
      steps.style.setProperty('--p', c.at);
      body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
      body.querySelector('.story-time').textContent = c.t;
      body.querySelector('.story-h').innerHTML = c.h.split(/(?<=，)/).map(function (seg) { return '<span class="nw">' + seg + '</span>'; }).join('');
      body.querySelector('.story-p').textContent = c.p;
      body.querySelector('.story-vis').innerHTML = c.vis;
      storyEl.querySelector('.story-prev').disabled = i === 0;
      var last = i === S.chapters.length - 1;
      storyEl.querySelector('.story-next').firstChild.textContent = last ? S.endLabel : '下一幕 ' + S.chapters[i + 1].t + ' ';
      city.flyTo(c.cam, 1500);
      if (c.stray) city.setStray(c.stray);
      if (c.papers) city.setPapers(c.papers);
      if (city.setBeat) city.setBeat(c.beat || null);
      // 城市裡的標籤：跟著劇情裡的東西走（公車、老師、學生、會計部…）
      marksEl.innerHTML = (c.marks || []).map(function (m) { return '<p class="st-mark ' + (m.cls || '') + '" data-at="' + m.at + '" style="--d:' + (reduced ? 0 : m.delay || 0) + 'ms">' + m.t + '</p>'; }).join('');
      placeMarks();
      clearInterval(rollTimer); clearTimeout(ocrTimer);
      if (c.roll) {
        var lis = [].slice.call(body.querySelectorAll('.js-roll li')), sum = body.querySelector('.js-sum'), n = 0;
        rollTimer = setInterval(function () { n++; if (lis[n - 1]) { lis[n - 1].classList.add('in'); lis[n - 1].querySelector('em').textContent = '✓'; } sum.textContent = '已到 ' + Math.min(14, n + (n >= lis.length ? n * 2 - 4 : 0)) + ' / 14'; if (n >= 6) { clearInterval(rollTimer); sum.textContent = '已到 14 / 14，全員到齊'; } }, reduced ? 1 : 260);
      }
      if (c.ocr) ocrTimer = setTimeout(function () { var o = body.querySelector('.js-ocr'); if (o) o.classList.add('read'); }, reduced ? 0 : 900);
    }
    storyEl.querySelector('.story-x').addEventListener('click', function () { close(); });
    storyEl.querySelector('.story-prev').addEventListener('click', function () { if (chap > 0) show(chap - 1); });
    storyEl.querySelector('.story-next').addEventListener('click', function () { var S = STORIES[id]; if (chap < S.chapters.length - 1) show(chap + 1); else close(S.endTo); });
    storyEl.addEventListener('click', function (e) { var a = e.target.closest('[data-close-to]'); if (a) { e.preventDefault(); close(a.dataset.closeTo); } });
    document.addEventListener('click', function (e) { var t = e.target.closest('[data-story]'); if (!t) return; e.preventDefault(); open(t.dataset.story, t); });
    document.addEventListener('keydown', function (e) {
      if (!id) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (e.key === 'ArrowRight' && !e.target.closest('a, input')) { e.preventDefault(); e.stopImmediatePropagation(); if (chap < STORIES[id].chapters.length - 1) show(chap + 1); }
      else if (e.key === 'ArrowLeft' && !e.target.closest('a, input')) { e.preventDefault(); e.stopImmediatePropagation(); if (chap > 0) show(chap - 1); }
    }, true);
    return { open: open, close: close, current: function () { return id; }, chapter: function () { return chap; } };
  };
  // 故事的 HTML 骨架（兩邊共用）
  window.V5StoryHTML = '<div class="story-scrim"></div>' +
    '<header class="story-head"><button class="story-x" type="button"><span>離開故事</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
    '<div class="story-body" aria-live="polite"><div><p class="story-kick" id="story-title"></p><p class="story-time"></p><h2 class="story-h"></h2><p class="story-p"></p></div><div class="story-vis"></div></div>' +
    '<footer class="story-foot"><button class="story-prev" type="button" aria-label="上一幕"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
    '<ol class="story-steps" aria-label="故事時間軸"></ol><button class="story-next" type="button">下一幕</button></footer>';
})();

/* 電子發票證明聯（示意）：照實際 5.7cm 熱感紙證明聯的版面。
   資料都是示意：賣方統編 53880413 刻意選一個「不符合統編檢查碼」的號碼，不會是任何真實公司。
   條碼是真的 Code 39 編法（期別＋字軌號碼＋隨機碼）；QR Code 是裝飾用的隨機圖樣。
   opt.ocr = true 時，日期／賣方統編／總計三個欄位可以被「辨識框」標起來（class f）。 */
(function () {
  var C39 = { '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', '*': 'nwnnwnwnn' };
  function barcode(text) {
    var x = 0, d = '';
    ('*' + text + '*').split('').forEach(function (ch) {
      C39[ch].split('').forEach(function (e, i) { var w = e === 'w' ? 2.5 : 1; if (i % 2 === 0) d += 'M' + x + ' 0h' + w + 'v10h-' + w + 'z'; x += w; });
      x += 1;
    });
    return '<svg class="ei-bar" viewBox="0 0 ' + x + ' 10" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function qr(seed) {
    var n = 25, s = seed, cells = {}, d = '';
    function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (r() < .47) cells[x + ',' + y] = 1;
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (f) {
      for (var y = -1; y < 8; y++) for (var x = -1; x < 8; x++) delete cells[(f[0] + x) + ',' + (f[1] + y)];
      for (y = 0; y < 7; y++) for (x = 0; x < 7; x++) if (x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) cells[(f[0] + x) + ',' + (f[1] + y)] = 1;
    });
    Object.keys(cells).forEach(function (k) { var p = k.split(','); if (p[0] >= 0 && p[1] >= 0 && p[0] < n && p[1] < n) d += 'M' + p[0] + ' ' + p[1] + 'h1v1h-1z'; });
    return '<svg class="ei-qr" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  var cache = {};
  window.V5Invoice = function (opt) {
    opt = opt || {};
    var o = { shop: opt.shop || '示範商行', no: opt.no || 'AB-12345678', date: opt.date || '2026-10-16', time: opt.time || '14:32:05', rnd: opt.rnd || '8421', total: opt.total || '1,280', seller: opt.seller || '53880413', seed: opt.seed || 7 };
    var key = JSON.stringify(o) + !!opt.ocr; if (cache[key]) return cache[key];
    var f = function (t) { return opt.ocr ? '<span class="f">' + t + '</span>' : t; };
    var html = '<div class="einv' + (opt.cls ? ' ' + opt.cls : '') + '" aria-hidden="true">' +
      '<p class="ei-shop">' + o.shop + '</p>' +
      '<p class="ei-t">電子發票證明聯</p>' +
      '<p class="ei-big">115年09-10月</p>' +
      '<p class="ei-big">' + o.no + '</p>' +
      '<p class="ei-row"><span>' + f(o.date) + ' ' + o.time + '</span><span>格式 25</span></p>' +
      '<p class="ei-row"><span>隨機碼 ' + o.rnd + '</span><span>總計 ' + f(o.total) + '</span></p>' +
      '<p class="ei-row"><span>賣方 ' + f(o.seller) + '</span><span>買方</span></p>' +
      barcode('11510' + o.no.replace('-', '') + o.rnd) +
      '<div class="ei-qrs">' + qr(o.seed) + qr(o.seed + 13) + '</div>' +
      '<div class="beam"></div></div>';
    return (cache[key] = html);
  };
})();
