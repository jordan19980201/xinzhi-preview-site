// 官網首頁的動態城市（等角視角，Canvas 2D 程序繪製，不用外部圖庫）
// 車在路上跑、人在走、窗戶亮了又暗、雲在飄；兩個產品長在城市裡：
//   學校（T-Patrol）：一班學生在操場的安全範圍裡移動，偶爾有人走出去 → 範圍變紅、跳出提醒
//   辦公大樓（T-Vouch）：發票從辦公室窗口飄出來，被讀成 ✓
// 用法：City.mount(canvas, { theme: 'day' | 'dusk', onSpot(id) }) → 回傳 { setTheme, spots() }
(function () {
  var N = 16;                         // 地圖 N × N 格
  var ROADS = [3, 8, 13];             // 這幾排、這幾列是馬路
  var isRoad = function (x, y) { return ROADS.indexOf(x) >= 0 || ROADS.indexOf(y) >= 0; };

  // ---------- 調色盤 ----------
  var PAL = {
    day: {
      sky: ['#d7e9f2', '#eef4e8'], grass: '#c9dfae', grass2: '#bdd79f', plaza: '#ebe6da', road: '#8d9298', line: '#f6f1e3', walk: '#dcd8cc',
      blds: ['#f4f1ea', '#e6edf2', '#f2e8d8', '#e2ebe3', '#efe3e3'], win: '#a9c2d4', winLit: '#cfe3ef', roofTrim: '#D4A94E',
      tower: '#9fc3d8', towerWin: '#d9edf6', towerWin2: '#bcd8e8', towerDark: '#7fa6bf', towerMull: 'rgba(255,255,255,.55)', towerBase: '#e3ddd0', lobby: '#4f7690', school: '#f6efe2', schoolRoof: '#e07a2e', field: '#d9a36f', fieldLine: '#fff7ea',
      tree: ['#7fb069', '#5e9a4f', '#9cc47b'], trunk: '#8a6a4a', cars: ['#e4572e', '#2e86ab', '#f2c14e', '#ffffff', '#3d405b', '#5fad56'],
      person: ['#3d405b', '#e07a5f', '#2e86ab', '#81b29a', '#f2cc8f'], kid: '#ffffff', kidRing: '#3d405b',
      dim: '#c9c7c1', dimWin: '#b4b2ac', dirt: '#d8c7a8', crane: '#e0a526', fence: 'rgba(23,146,79,', alert: '#e0383e', cloud: 'rgba(255,255,255,.85)', paper: '#ffffff', check: '#17924f', shadow: 'rgba(40,60,40,.18)'
    },
    dusk: {
      sky: ['#141a29', '#2a2338'], grass: '#1f2a24', grass2: '#22302a', plaza: '#2b2b30', road: '#25282d', line: '#b8913f', walk: '#33343a',
      blds: ['#2b3039', '#30333d', '#2a2f37', '#353844', '#2e3238'], win: '#3a404b', winLit: '#f3c76b', roofTrim: '#D4A94E',
      tower: '#26344b', towerWin: '#ffd98a', towerWin2: '#e9bf6c', towerDark: '#1f2a3b', towerMull: 'rgba(10,14,22,.6)', towerBase: '#3b3a3f', lobby: '#ffe3a3', school: '#3a3532', schoolRoof: '#b85a22', field: '#5a3f2c', fieldLine: '#c9a46a',
      tree: ['#24402d', '#1d3626', '#2c4b33'], trunk: '#3a2c20', cars: ['#e4572e', '#2e86ab', '#f2c14e', '#d9d9d9', '#6b6f8a', '#5fad56'],
      person: ['#cfd3e0', '#e9a07f', '#8cc0e0', '#a8d5bb', '#f2cc8f'], kid: '#ffe6a8', kidRing: '#1a1c22',
      dim: '#1d2026', dimWin: '#262a31', dirt: '#2e2a24', crane: '#b98a2a', fence: 'rgba(80,220,140,', alert: '#ff5c61', cloud: 'rgba(120,130,160,.18)', paper: '#fff6e0', check: '#4fe08a', shadow: 'rgba(0,0,0,.35)'
    }
  };

  function mix(hex, k) { // k<1 變暗、k>1 變亮
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(k < 1 ? c * k : c + (255 - c) * (k - 1)))); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function rng(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function mount(canvas, opt) {
    var ctx = canvas.getContext('2d');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var theme = opt.theme || 'day', P = PAL[theme];
    var W = 56, H = 28, ox = 0, oy = 0, scale = 1, dpr = 1, cw = 0, ch = 0;
    var rnd = rng(11);
    // 鏡頭：fx, fy＝基準座標上要放到錨點的那一點；z＝放大倍率；ax, ay＝錨點（畫面比例）
    var cam = { fx: 0, fy: 0, z: 1, ax: 0, ay: 0, home: true }, camAnim = null, camTarget = null;

    // ---------- 城市規劃 ----------
    var SCHOOL = { x: 9, y: 9, w: 4, d: 4 };    // 學校（含操場）：放在城市最前面，才看得到
    var TOWER = { x: 4, y: 4, w: 2, d: 2, h: 7.2 };
    var PARK = { x: 0, y: 9, w: 3, d: 4 };
    var FUTURE = { x: 9, y: 0, w: 4, d: 3 };   // 下一個角落：還沒點亮，有塔吊在施工（產品越多，亮的街區越多）
    var SITE = { x: 10, y: 0, w: 2, d: 2 };    // 工地
    var buildings = [], trees = [];
    function inRect(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.d; }
    for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) {
      if (isRoad(x, y) || inRect(x, y, SCHOOL) || inRect(x, y, TOWER) || inRect(x, y, PARK) || inRect(x, y, SITE)) continue;
      // 塔旁邊留一格廣場，外圈比較矮、中間比較高
      if (inRect(x, y, { x: 6, y: 4, w: 2, d: 4 }) && (x === 7 || y === 7)) { if (rnd() < .5) trees.push({ x: x + .5, y: y + .5, r: .32 + rnd() * .1 }); continue; }
      var center = 1 - Math.hypot(x - 6, y - 6) / 12;
      var nearSchool = x + y > 19 && x > 7 && y > 7;  // 學校前面的房子壓低，不擋住操場
      if (rnd() < .14) { trees.push({ x: x + .5, y: y + .5, r: .3 + rnd() * .12 }); continue; }
      buildings.push({ x: x + .12, y: y + .12, w: .76, d: .76, h: nearSchool ? .5 + rnd() * .6 : .8 + rnd() * (1.2 + center * 3.6), c: P.blds[Math.floor(rnd() * 5)], seed: Math.floor(rnd() * 1e6), roof: rnd() < .3, dark: inRect(x, y, FUTURE) });
    }
    for (var i = 0; i < 16; i++) trees.push({ x: PARK.x + .4 + rnd() * (PARK.w - .8), y: PARK.y + .4 + rnd() * (PARK.d - .8), r: .26 + rnd() * .16 });

    // 窗戶亮暗（每棟一組，慢慢變）
    var lit = {};
    function winOn(b, i) { var k = b.seed + ':' + i; if (!(k in lit)) lit[k] = rng(b.seed + i)() < (theme === 'dusk' ? .55 : .25); return lit[k]; }
    function flickerWindows() { var keys = Object.keys(lit); for (var j = 0; j < 6; j++) { var k = keys[Math.floor(Math.random() * keys.length)]; if (k) lit[k] = !lit[k]; } }

    // ---------- 交通 ----------
    // 紅綠燈：每個路口一組，x 向（左上↔右下）與 y 向輪流綠燈；各路口錯開一點，像綠波
    var CYCLE = 12;
    function light(axis, cx, cy) {
      var off = (ROADS.indexOf(cx) * 1.7 + ROADS.indexOf(cy) * 2.3) % CYCLE, t = (now / 1000 + off) % CYCLE;
      if (axis === 'y') t = (t + CYCLE / 2) % CYCLE;   // y 向和 x 向差半個週期
      return t < 4.6 ? 'g' : t < 5.6 ? 'y' : 'r';     // 綠 4.6 秒、黃 1 秒、紅（含全紅 0.4 秒）
    }
    var CAR_L = .42, CAR_W = .22, STOP = .34;            // 車長、車寬、停止線離路口的距離（中間是斑馬線）
    var cars = [];
    ROADS.forEach(function (r, ri) {
      for (var j = 0; j < 3; j++) {
        [['x', r + .3, 1], ['x', r + .7, -1], ['y', r + .3, -1], ['y', r + .7, 1]].forEach(function (L, k) {
          cars.push({ axis: L[0], lane: L[1], dir: L[2], road: r, pos: (j / 3 + rnd() * .2) * N, v: 0, vmax: .95 + rnd() * .5, brake: false, c: P.cars[(ri * 4 + j + k) % 6] });
        });
      }
    });
    // 行人：走人行道，遇到路口要等綠燈才走斑馬線；偶爾停下來聊天、走進大樓
    var people = [];
    for (i = 0; i < 44; i++) {
      var r0 = ROADS[Math.floor(rnd() * 3)], side = rnd() < .5 ? -.13 : 1.13, d0 = rnd() < .5 ? 1 : -1;
      people.push({ axis: rnd() < .5 ? 'x' : 'y', lane: r0 + side + d0 * .04, road: r0, dir: d0, pos: rnd() * N, v: 0, vmax: .2 + rnd() * .16,
        c: P.person[Math.floor(rnd() * 5)], ph: rnd() * 6, state: 'walk', t: 0, a: 1 });
    }
    // 學校：操場上的學生（安全範圍內移動）
    var FIELD = { cx: 11.4, cy: 11.3, rx: 1.3, ry: 1.0 };
    var kids = [];
    for (i = 0; i < 14; i++) { var a = rnd() * 6.28, d = Math.sqrt(rnd()) * .75; kids.push({ x: FIELD.cx + Math.cos(a) * d * FIELD.rx, y: FIELD.cy + Math.sin(a) * d * FIELD.ry, tx: 0, ty: 0, t: 0 }); }
    kids.forEach(retarget);
    function retarget(k) { var a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * .78; k.tx = FIELD.cx + Math.cos(a) * d * FIELD.rx; k.ty = FIELD.cy + Math.sin(a) * d * FIELD.ry; }
    var stray = { on: false, k: kids[0], t: 0, hold: false };
    var story = false, paperMode = 'flow';
    // 大樓：發票從窗口飄出
    var papers = [];
    // ---------- 故事的劇情：每一幕城市裡真的發生一件事（setBeat）----------
    var beat = null, beatT0 = 0;
    var PATROL_BEATS = { 'bus-in': 1, pings: 1, alert: 1, gather: 1, 'bus-out': 1 }, VOUCH_BEATS = { pile: 1, snap: 1, ai: 1, export: 1, done: 1 };
    var TEACHER = { x: 10.55, y: 12.2, ph: 0 };          // 帶隊老師（金色，手上有手機）
    var BUS_Y = 13.5, bus = { on: false, x: -1.5, from: -1.5, to: 10.3, t0: 0, dur: 4, leaving: false };
    var FLOOR = { z0: 5.0, z1: 5.35 };                   // 會計部那一層：放在高樓上段（金色腰帶下面），周圍矮樓擋不到
    var ROUTE = [[6, 5], [8.5, 5], [8.5, 3.5], [13.5, 3.5], [13.5, 5.5], [14.3, 5.5]], ROUTE_LEN = 0;
    for (i = 1; i < ROUTE.length; i++) ROUTE_LEN += Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]);
    var packets = [], aiParts = [], flashT = -1e9, nextFx = 0;
    function onRoute(s) { for (var j = 1; j < ROUTE.length; j++) { var a = ROUTE[j - 1], b = ROUTE[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (s <= L) return [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L]; s -= L; } return ROUTE[ROUTE.length - 1]; }
    var clouds = [];
    for (i = 0; i < 5; i++) clouds.push({ x: rnd() * 1.4 - .2, y: .05 + rnd() * .35, s: .6 + rnd() * .8, v: .004 + rnd() * .006 });

    // ---------- 投影 ----------
    function iso(x, y, z) { return [ox + (x - y) * W / 2 * scale, oy + (x + y) * H / 2 * scale - (z || 0) * H * scale]; }
    function poly(pts, fill, stroke) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2); cw = r.width; ch = r.height;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      // 地圖投影寬 N*W、高 N*H＋最高大樓；放進畫面（opt.frame 指定城市佔的區域）
      var f = opt.frame ? opt.frame(cw, ch) : { x: 0, y: 0, w: cw, h: ch };
      var mapW = N * W, mapH = N * H + 7.5 * H;
      scale = Math.min(f.w / mapW, f.h / mapH);
      ox = f.x + f.w / 2; oy = f.y + (f.h - (N * H) * scale) / 2 + 7.5 * H * scale * .62;
    }

    // ---------- 繪製元件 ----------
    function box(x, y, w, d, h, top, left, right) {
      var A = iso(x, y, h), B = iso(x + w, y, h), C = iso(x + w, y + d, h), D = iso(x, y + d, h);
      var Bg = iso(x + w, y, 0), Cg = iso(x + w, y + d, 0), Dg = iso(x, y + d, 0);
      poly([D, C, Cg, Dg], left); poly([C, B, Bg, Cg], right); poly([A, B, C, D], top);
    }
    function faceWindows(b, x, y, w, d, h, onCol, offCol) {
      var floors = Math.max(1, Math.floor(h / .55)), cols = 2, idx = 0;
      for (var f = 0; f < floors; f++) {
        var z0 = .25 + f * .55, z1 = z0 + .3; if (z1 > h - .1) break;
        for (var c = 0; c < cols; c++) {
          var u0 = .12 + c * (w - .2) / cols, u1 = u0 + (w - .2) / cols - .1;
          var on = winOn(b, idx++);
          poly([iso(x + u0, y + d, z1), iso(x + u1, y + d, z1), iso(x + u1, y + d, z0), iso(x + u0, y + d, z0)], on ? onCol : offCol);
          on = winOn(b, idx++);
          poly([iso(x + w, y + u0, z1), iso(x + w, y + u1, z1), iso(x + w, y + u1, z0), iso(x + w, y + u0, z0)], on ? onCol : mix(offCol.charAt(0) === '#' ? offCol : '#3a404b', .85));
        }
      }
    }
    function drawBuilding(b) {
      if (b.dark) {   // 未點亮：灰暗、窗戶不亮
        var c = P.dim; box(b.x, b.y, b.w, b.d, b.h, mix(c, 1.04), mix(c, .9), mix(c, .78));
        faceWindows(b, b.x, b.y, b.w, b.d, b.h, P.dimWin, P.dimWin); return;
      }
      box(b.x, b.y, b.w, b.d, b.h, mix(b.c, 1.04), mix(b.c, .9), mix(b.c, .78));
      faceWindows(b, b.x, b.y, b.w, b.d, b.h, P.winLit, P.win);
      if (b.roof) { var t = iso(b.x + b.w / 2, b.y + b.d / 2, b.h); ctx.fillStyle = P.roofTrim; ctx.fillRect(t[0] - 1.5 * scale, t[1] - 6 * scale, 3 * scale, 6 * scale); }
    }
    // 從 z0 蓋到 z1 的方塊（box() 一律從地面開始，大樓上段要用這個）
    function boxZ(x, y, w, d, z0, z1, top, left, right) {
      var A = iso(x, y, z1), B = iso(x + w, y, z1), C = iso(x + w, y + d, z1), D = iso(x, y + d, z1);
      var Bg = iso(x + w, y, z0), Cg = iso(x + w, y + d, z0), Dg = iso(x, y + d, z0);
      poly([D, C, Cg, Dg], left); poly([C, B, Bg, Cg], right); poly([A, B, C, D], top);
    }
    // 帷幕玻璃：兩個看得到的面各畫樓層窗帶＋直向窗框；亮燈的樓層慢慢換（有人在辦公）
    function curtain(x, y, w, d, z0, z1, seed) {
      var floors = Math.floor((z1 - z0) / .34), mull = P.towerMull;
      for (var f = 0; f < floors; f++) {
        var a = z0 + .06 + f * .34, b = a + .24;
        var on = ((f * 7 + seed + Math.floor(now / 2200)) % 10) < (theme === 'dusk' ? 6 : 8);   // 傍晚約六成樓層亮燈，玻璃本體看得出來
        var cL = on ? P.towerWin : P.towerDark, cR = on ? P.towerWin2 : mix(P.towerDark, .85);
        poly([iso(x + .04, y + d, b), iso(x + w - .04, y + d, b), iso(x + w - .04, y + d, a), iso(x + .04, y + d, a)], cL);
        poly([iso(x + w, y + .04, b), iso(x + w, y + d - .04, b), iso(x + w, y + d - .04, a), iso(x + w, y + .04, a)], cR);
      }
      ctx.strokeStyle = mull; ctx.lineWidth = Math.max(.6, .8 * scale);
      for (var k = 1; k < 5; k++) {
        var u = w * k / 5, v = d * k / 5, p0 = iso(x + u, y + d, z0), p1 = iso(x + u, y + d, z1), q0 = iso(x + w, y + v, z0), q1 = iso(x + w, y + v, z1);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
      }
    }
    function drawTower() {
      var T = TOWER, x = T.x, y = T.y, w = T.w, d = T.d, gold = P.roofTrim.slice(0, 7);
      // 1. 石材基座＋玻璃大廳
      boxZ(x + .02, y + .02, w - .04, d - .04, 0, .9, mix(P.towerBase, 1.05), mix(P.towerBase, .9), mix(P.towerBase, .78));
      poly([iso(x + .5, y + d - .02, .55), iso(x + w - .5, y + d - .02, .55), iso(x + w - .5, y + d - .02, .05), iso(x + .5, y + d - .02, .05)], P.lobby);
      poly([iso(x + w - .02, y + .5, .55), iso(x + w - .02, y + d - .5, .55), iso(x + w - .02, y + d - .5, .05), iso(x + w - .02, y + .5, .05)], mix(P.lobby, .85));
      // 2. 主樓：帷幕玻璃
      var x1 = x + .2, y1 = y + .2, w1 = w - .4, d1 = d - .4, zMid = T.h - 1.5;
      boxZ(x1, y1, w1, d1, .9, zMid, mix(P.tower, 1.1), mix(P.tower, .92), mix(P.tower, .78));
      curtain(x1, y1, w1, d1, .9, zMid, 1);
      boxZ(x1 - .03, y1 - .03, w1 + .06, d1 + .06, zMid - .08, zMid + .06, gold, mix(gold, .85), mix(gold, .72));   // 退縮處的金色腰帶
      // 3. 退縮的上段
      var x2 = x + .4, y2 = y + .4, w2 = w - .8, d2 = d - .8;
      boxZ(x2, y2, w2, d2, zMid + .06, T.h, mix(P.tower, 1.1), mix(P.tower, .92), mix(P.tower, .78));
      curtain(x2, y2, w2, d2, zMid + .06, T.h, 3);
      // 4. 金色樓冠（細）＋天線
      boxZ(x2 - .04, y2 - .04, w2 + .08, d2 + .08, T.h, T.h + .22, mix(gold, 1.08), mix(gold, .86), mix(gold, .72));
      boxZ(x2 + .25, y2 + .25, w2 - .5, d2 - .5, T.h + .22, T.h + .45, mix(P.tower, 1.05), mix(P.tower, .85), mix(P.tower, .72));
      var sb = iso(x + w / 2, y + d / 2, T.h + .45), st = iso(x + w / 2, y + d / 2, T.h + 1.7);
      ctx.strokeStyle = gold; ctx.lineWidth = 1.6 * scale; ctx.beginPath(); ctx.moveTo(sb[0], sb[1]); ctx.lineTo(st[0], st[1]); ctx.stroke();
      // 航空障礙燈（傍晚閃）
      var blink = theme === 'dusk' ? (Math.floor(now / 700) % 2 === 0) : true;
      ctx.fillStyle = blink ? '#ff3b30' : '#5a2020'; ctx.beginPath(); ctx.arc(st[0], st[1], 2 * scale, 0, 6.28); ctx.fill();
      if (blink && theme === 'dusk') glow(st, 10, 'rgba(255,59,48,');
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function drawSchool() {
      var S = SCHOOL;
      // 操場（地面）在 ground 畫；這裡畫校舍：L 形的長條建築＋屋頂色帶＋旗桿
      var c = P.school;
      box(S.x + .1, S.y + .1, .9, S.d - .2, 1.3, mix(c, 1.05), mix(c, .9), mix(c, .78));
      box(S.x + 1, S.y + .1, S.w - 1.1, .8, 1.1, mix(c, 1.05), mix(c, .9), mix(c, .78));
      poly([iso(S.x + .1, S.y + S.d - .1, 1.3), iso(S.x + 1, S.y + S.d - .1, 1.3), iso(S.x + 1, S.y + S.d - .1, 1.12), iso(S.x + .1, S.y + S.d - .1, 1.12)], P.schoolRoof);
      poly([iso(S.x + S.w - .1, S.y + .1, 1.1), iso(S.x + S.w - .1, S.y + .9, 1.1), iso(S.x + S.w - .1, S.y + .9, .94), iso(S.x + S.w - .1, S.y + .1, .94)], P.schoolRoof);
      for (var k = 0; k < 4; k++) { var u = .3 + k * .58; poly([iso(S.x + 1, S.y + .2 + u * .0 + k * .55, .75), iso(S.x + 1, S.y + .5 + k * .55, .75), iso(S.x + 1, S.y + .5 + k * .55, .45), iso(S.x + 1, S.y + .2 + k * .55, .45)], P.win); }
      var fp = iso(S.x + S.w - .3, S.y + S.d - .25, 0), ft = iso(S.x + S.w - .3, S.y + S.d - .25, 2.1);
      ctx.strokeStyle = mix('#888888', theme === 'dusk' ? .8 : 1); ctx.lineWidth = 1.5 * scale; ctx.beginPath(); ctx.moveTo(fp[0], fp[1]); ctx.lineTo(ft[0], ft[1]); ctx.stroke();
      var wave = Math.sin(now / 300) * 2 * scale;
      poly([[ft[0], ft[1]], [ft[0] + 16 * scale, ft[1] + 2 * scale + wave], [ft[0] + 15 * scale, ft[1] + 11 * scale + wave], [ft[0], ft[1] + 9 * scale]], '#f59e0b');
    }
    function drawTree(t) {
      var g = iso(t.x, t.y, 0), top = iso(t.x, t.y, .55), r = t.r * W * .5 * scale;
      ctx.fillStyle = P.shadow; ctx.beginPath(); ctx.ellipse(g[0], g[1], r * 1.1, r * .5, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = P.trunk; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.fillStyle = P.tree[1]; ctx.beginPath(); ctx.arc(top[0], top[1] - r * .3, r, 0, 6.28); ctx.fill();
      ctx.fillStyle = P.tree[0]; ctx.beginPath(); ctx.arc(top[0] - r * .25, top[1] - r * .55, r * .72, 0, 6.28); ctx.fill();
    }
    function edgeAlpha(pos) { return Math.max(0, Math.min(1, (Math.min(pos, N - pos) + .1) / .5)); }
    function drawCar(c) {
      var a = edgeAlpha(c.pos); if (a <= 0) return;
      ctx.globalAlpha = a;
      var x = c.axis === 'x' ? c.pos : c.lane, y = c.axis === 'x' ? c.lane : c.pos;
      var w = c.axis === 'x' ? CAR_L : CAR_W, d = c.axis === 'x' ? CAR_W : CAR_L;
      ctx.fillStyle = P.shadow; var sh = iso(x, y, 0); ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 12 * scale, 5 * scale, 0, 0, 6.28); ctx.fill();
      box(x - w / 2, y - d / 2, w, d, .2, mix(c.c, 1.1), mix(c.c, .85), mix(c.c, .7));
      box(x - w / 4, y - d / 4, w / 2, d / 2, .32, mix(c.c, 1.2), mix(c.c, .95), mix(c.c, .8));
      var fx = c.axis === 'x' ? x + c.dir * CAR_L / 2 : x, fy = c.axis === 'y' ? y + c.dir * CAR_L / 2 : y;
      var rx = c.axis === 'x' ? x - c.dir * CAR_L / 2 : x, ry = c.axis === 'y' ? y - c.dir * CAR_L / 2 : y;
      if (theme === 'dusk') glow(iso(fx, fy, .12), 14, 'rgba(255,230,160,');
      if (c.brake) { var b = iso(rx, ry, .14); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(b[0], b[1], 1.8 * scale, 0, 6.28); ctx.fill(); glow(b, theme === 'dusk' ? 12 : 7, 'rgba(255,40,40,'); }
      ctx.globalAlpha = 1;
    }
    function glow(p, r, rgba) { var R = r * scale, g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R); g.addColorStop(0, rgba + '.6)'); g.addColorStop(1, rgba + '0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, 6.28); ctx.fill(); }
    // 小人：頭、身體、會擺動的腿和手；停下來時腿併攏
    function drawPerson(p, col, ring) {
      var x = p.axis === 'x' ? p.pos : p.lane, y = p.axis === 'x' ? p.lane : p.pos;
      if (p.x !== undefined) { x = p.x; y = p.y; }
      var a = p.x !== undefined ? 1 : Math.min(edgeAlpha(p.pos), p.a === undefined ? 1 : p.a); if (a <= 0) return;
      ctx.globalAlpha = a;
      var g = iso(x, y, 0), k = scale, moving = (p.v || 0) > .02 || p.x !== undefined;
      var sw = moving ? Math.sin(p.ph || 0) : 0, bob = moving ? Math.abs(Math.cos(p.ph || 0)) * .8 * k : 0;
      ctx.fillStyle = P.shadow; ctx.beginPath(); ctx.ellipse(g[0], g[1], 3 * k, 1.3 * k, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = mix(col.charAt(0) === '#' ? col : '#666666', .55); ctx.lineWidth = 1.3 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(g[0], g[1] - 4.2 * k - bob); ctx.lineTo(g[0] + sw * 1.8 * k, g[1] - .2 * k);
      ctx.moveTo(g[0], g[1] - 4.2 * k - bob); ctx.lineTo(g[0] - sw * 1.8 * k, g[1] - .2 * k); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(g[0], g[1] - 6.6 * k - bob, 1.9 * k, 3 * k, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.1 * k;
      ctx.beginPath(); ctx.moveTo(g[0], g[1] - 8 * k - bob); ctx.lineTo(g[0] - sw * 1.6 * k, g[1] - 4.6 * k - bob); ctx.stroke();
      ctx.fillStyle = theme === 'dusk' ? '#e8c9a8' : '#f1d2b4'; ctx.beginPath(); ctx.arc(g[0], g[1] - 11 * k - bob, 1.8 * k, 0, 6.28); ctx.fill();
      if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = .9 * k; ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // 紅綠燈：每個路口對角兩根燈桿，各有 x 向、y 向兩組燈
    function drawSignal(cx, cy, px, py) {
      var base = iso(px, py, 0), top = iso(px, py, .95), k = scale;
      ctx.strokeStyle = theme === 'dusk' ? '#5b6170' : '#6c7178'; ctx.lineWidth = 1.4 * k; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ['x', 'y'].forEach(function (ax, n) {
        var st = light(ax, cx, cy), hx = top[0] + (n ? 4.5 : -4.5) * k, hy = top[1] - 2 * k;
        ctx.fillStyle = '#1b1d22'; roundRect(hx - 2.4 * k, hy - 6 * k, 4.8 * k, 12 * k, 1.5 * k); ctx.fill();
        [['r', '#ff3b30', -3.6], ['y', '#ffc531', 0], ['g', '#2fdc6a', 3.6]].forEach(function (L) {
          var on = st === L[0]; ctx.fillStyle = on ? L[1] : '#3a3d45';
          ctx.beginPath(); ctx.arc(hx, hy + L[2] * k, 1.4 * k, 0, 6.28); ctx.fill();
          if (on) glow([hx, hy + L[2] * k], theme === 'dusk' ? 9 : 5, L[0] === 'r' ? 'rgba(255,59,48,' : L[0] === 'y' ? 'rgba(255,197,49,' : 'rgba(47,220,106,');
        });
      });
    }
    // 斑馬線＋停止線（路口四個方向）
    function drawSite() {
      poly([iso(SITE.x, SITE.y), iso(SITE.x + SITE.w, SITE.y), iso(SITE.x + SITE.w, SITE.y + SITE.d), iso(SITE.x, SITE.y + SITE.d)], P.dirt);
      // 蓋到一半：兩層樓板＋上面的柱子
      var bx = SITE.x + .9, by = SITE.y + .9, bw = .9, bd = .9;
      box(bx, by, bw, bd, .7, mix(P.dim, 1.05), mix(P.dim, .9), mix(P.dim, .78));
      ctx.strokeStyle = mix(P.dim, theme === 'dusk' ? 1.6 : .7); ctx.lineWidth = 1.2 * scale;
      [[0, 0], [bw, 0], [bw, bd], [0, bd]].forEach(function (o) { var a = iso(bx + o[0], by + o[1], .7), b = iso(bx + o[0], by + o[1], 1.6); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      poly([iso(bx, by, 1.6), iso(bx + bw, by, 1.6), iso(bx + bw, by + bd, 1.6), iso(bx, by + bd, 1.6)], null, ctx.strokeStyle);
      // 塔吊
      var mx = SITE.x + .35, my = SITE.y + .35, H0 = 5.2, base = iso(mx, my, 0), top = iso(mx, my, H0);
      ctx.strokeStyle = P.crane; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.lineWidth = .8 * scale;
      for (var z = .3; z < H0; z += .45) { var a = iso(mx - .08, my, z), b = iso(mx + .08, my, z + .4); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      var swing = Math.sin(now / 5000) * .25;   // 吊臂慢慢轉
      var jx = mx + 2.2 * Math.cos(swing), jy = my + 2.2 * Math.sin(swing), jEnd = iso(jx, jy, H0), cEnd = iso(mx - .8 * Math.cos(swing), my - .8 * Math.sin(swing), H0);
      ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(cEnd[0], cEnd[1]); ctx.lineTo(jEnd[0], jEnd[1]); ctx.stroke();
      var hx = mx + 1.5 * Math.cos(swing), hy = my + 1.5 * Math.sin(swing), h1 = iso(hx, hy, H0), h2 = iso(hx, hy, 2.2 + Math.sin(now / 1300) * .3);
      ctx.lineWidth = .8 * scale; ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
      ctx.fillStyle = P.crane; ctx.fillRect(h2[0] - 3 * scale, h2[1], 6 * scale, 4 * scale);
      if (Math.floor(now / 800) % 2 === 0) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(top[0], top[1] - 2 * scale, 1.8 * scale, 0, 6.28); ctx.fill(); if (theme === 'dusk') glow([top[0], top[1] - 2 * scale], 9, 'rgba(255,59,48,'); }
    }
    function drawCrossings() {
      ctx.fillStyle = theme === 'dusk' ? 'rgba(230,226,214,.55)' : 'rgba(255,255,255,.92)';
      ROADS.forEach(function (cx) { ROADS.forEach(function (cy) {
        for (var k = 0; k < 6; k++) {
          var u0 = cx + .08 + k * .15, u1 = u0 + .08;
          [[cy - .3, cy - .04], [cy + 1.04, cy + 1.3]].forEach(function (b) { poly([iso(u0, b[0]), iso(u1, b[0]), iso(u1, b[1]), iso(u0, b[1])]); ctx.fill(); });
          var v0 = cy + .08 + k * .15, v1 = v0 + .08;
          [[cx - .3, cx - .04], [cx + 1.04, cx + 1.3]].forEach(function (b) { poly([iso(b[0], v0), iso(b[1], v0), iso(b[1], v1), iso(b[0], v1)]); ctx.fill(); });
        }
        // 停止線：只畫在車道進入路口的那一側
        ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.4 * scale;
        [[iso(cx - STOP, cy + .05), iso(cx - STOP, cy + .5)], [iso(cx + 1 + STOP, cy + .5), iso(cx + 1 + STOP, cy + .95)],
         [iso(cx + .05, cy + 1 + STOP), iso(cx + .5, cy + 1 + STOP)], [iso(cx + .5, cy - STOP), iso(cx + .95, cy - STOP)]].forEach(function (l) { ctx.beginPath(); ctx.moveTo(l[0][0], l[0][1]); ctx.lineTo(l[1][0], l[1][1]); ctx.stroke(); });
        ctx.restore();
      }); });
    }
    function drawGround() {
      for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) {
        var road = isRoad(x, y), col;
        if (road) col = P.road;
        else if (inRect(x, y, PARK)) col = (x + y) % 2 ? P.grass : P.grass2;
        else if (inRect(x, y, SCHOOL)) col = P.plaza;
        else col = (x + y) % 2 ? P.walk : mix(P.walk, .97);
        poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], col);
      }
      // 路中線（虛線）
      ctx.setLineDash([4 * scale, 5 * scale]); ctx.strokeStyle = P.line; ctx.lineWidth = 1.2 * scale;
      ROADS.forEach(function (r) {
        var cuts = [0].concat(ROADS.reduce(function (acc, c) { return acc.concat([c - .32, c + 1.32]); }, []), [N]);
        for (var q = 0; q < cuts.length; q += 2) {
          var a = iso(cuts[q], r + .5), b = iso(cuts[q + 1], r + .5); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          a = iso(r + .5, cuts[q]); b = iso(r + .5, cuts[q + 1]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      });
      ctx.setLineDash([]);
      drawCrossings();
      // 學校操場：跑道
      ctx.save(); ctx.translate(...iso(FIELD.cx, FIELD.cy));
      ctx.scale(1, .5); ctx.rotate(Math.PI / 4);
      var rr = W * scale * .78;
      ctx.fillStyle = P.field; roundRectPath(-rr * 1.3, -rr * .85, rr * 2.6, rr * 1.7, rr * .85); ctx.fill();
      ctx.strokeStyle = P.fieldLine; ctx.lineWidth = 2 * scale; roundRectPath(-rr * 1.1, -rr * .65, rr * 2.2, rr * 1.3, rr * .65); ctx.stroke();
      ctx.fillStyle = theme === 'dusk' ? '#2f4a35' : '#9cc47b'; roundRectPath(-rr * .9, -rr * .45, rr * 1.8, rr * .9, rr * .45); ctx.fill();
      ctx.restore();
    }
    function roundRectPath(x, y, w, h, r) { roundRect(x, y, w, h, r); }
    function drawFence() {
      var alert = stray.on && stray.t > .9;
      ctx.save(); ctx.translate(...iso(FIELD.cx, FIELD.cy)); ctx.scale(1, .5); ctx.rotate(Math.PI / 4);
      var rr = W * scale;
      ctx.beginPath(); ctx.ellipse(0, 0, rr * 1.42, rr * .98, 0, 0, 6.28);
      ctx.fillStyle = alert ? 'rgba(224,56,62,.10)' : P.fence + '.10)'; ctx.fill();
      ctx.setLineDash([7 * scale, 6 * scale]); ctx.lineDashOffset = -now / 60; ctx.lineWidth = 2.2 * scale;
      ctx.strokeStyle = alert ? P.alert : P.fence + '.85)'; ctx.stroke(); ctx.restore();
    }
    function drawPapers() {
      papers.forEach(function (p) {
        var t = p.t, x = TOWER.x + TOWER.w - .1, y = TOWER.y + p.u, z = p.z0 + t * 2.4;
        var g = iso(x + t * .9, y - t * .2, z), s = 7 * scale, a = t < .7 ? 1 : 1 - (t - .7) / .3;
        ctx.globalAlpha = Math.max(0, a);
        if (t < .55) { ctx.save(); ctx.translate(g[0], g[1]); ctx.rotate(Math.sin(now / 300 + p.u * 9) * .35); ctx.fillStyle = P.paper; ctx.fillRect(-s * .6, -s * .8, s * 1.2, s * 1.6); ctx.fillStyle = '#c9c9c9'; ctx.fillRect(-s * .4, -s * .45, s * .8, s * .14); ctx.fillRect(-s * .4, -s * .1, s * .6, s * .14); ctx.fillStyle = '#2f6fed'; ctx.fillRect(-s * .4, s * .25, s * .5, s * .14); ctx.restore(); }
        else { ctx.fillStyle = P.check; ctx.beginPath(); ctx.arc(g[0], g[1], s * .9, 0, 6.28); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(g[0] - s * .4, g[1]); ctx.lineTo(g[0] - s * .1, g[1] + s * .32); ctx.lineTo(g[0] + s * .42, g[1] - s * .3); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
    }
    // ---------- 劇情的畫法 ----------
    function drawBus() {
      var x = bus.x - 1, y = BUS_Y - .26, w = 2, d = .52, c = '#F2B705';
      ctx.fillStyle = P.shadow; var sh = iso(bus.x, BUS_Y, 0); ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 34 * scale, 10 * scale, 0, 0, 6.28); ctx.fill();
      box(x, y, w, d, .62, mix(c, 1.15), mix(c, .9), mix(c, .74));
      poly([iso(x + .12, y + d, .34), iso(x + w - .45, y + d, .34), iso(x + w - .45, y + d, .52), iso(x + .12, y + d, .52)], theme === 'dusk' ? '#ffe3a3' : '#2c3e50');   // 側窗
      poly([iso(x + w, y + .06, .3), iso(x + w, y + d - .06, .3), iso(x + w, y + d - .06, .54), iso(x + w, y + .06, .54)], theme === 'dusk' ? '#ffe3a3' : '#34495e');   // 前擋
      poly([iso(x + .1, y + d, .2), iso(x + w - .1, y + d, .2), iso(x + w - .1, y + d, .25), iso(x + .1, y + d, .25)], '#1b1b1b');
      if (theme === 'dusk') glow(iso(x + w, y + d / 2, .15), 16, 'rgba(255,230,160,');
    }
    function drawTeacher() {
      var t = TEACHER; drawPerson(t, '#D4A94E', '#7a5a14');
      var g = iso(t.x, t.y, 0), k = scale, hx = g[0] + 3.4 * k, hy = g[1] - 8.4 * k;
      var alert = beat === 'alert' && stray.on && stray.t > .9, on = beat && PATROL_BEATS[beat];
      ctx.fillStyle = alert ? (Math.floor(now / 250) % 2 ? '#ff3b30' : '#ffb3ae') : on ? '#bfe9ff' : '#3a3d45';
      ctx.fillRect(hx - 1.2 * k, hy - 2 * k, 2.4 * k, 4 * k);
      if (on) glow([hx, hy], alert ? 16 : 10, alert ? 'rgba(255,59,48,' : 'rgba(150,220,255,');
    }
    function kidHead(k) { var g = iso(k.x, k.y, 0); return [g[0], g[1] - 11 * scale]; }
    function checkMark(p, r, a) {
      ctx.globalAlpha = a; ctx.fillStyle = P.check; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.28); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * .32); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(p[0] - r * .45, p[1]); ctx.lineTo(p[0] - r * .1, p[1] + r * .35); ctx.lineTo(p[0] + r * .48, p[1] - r * .32); ctx.stroke(); ctx.globalAlpha = 1;
    }
    function towerFace(z0, z1, fill) {
      var x1 = TOWER.x + .2, y1 = TOWER.y + .2, w1 = TOWER.w - .4, d1 = TOWER.d - .4;
      poly([iso(x1, y1 + d1, z0), iso(x1 + w1, y1 + d1, z0), iso(x1 + w1, y1 + d1, z1), iso(x1, y1 + d1, z1)], fill);
      poly([iso(x1 + w1, y1, z0), iso(x1 + w1, y1 + d1, z0), iso(x1 + w1, y1 + d1, z1), iso(x1 + w1, y1, z1)], fill);
    }
    var target = null;
    function erpBuilding() { if (target) return target; buildings.forEach(function (b) { if (Math.floor(b.x) === 14 && Math.floor(b.y) === 5) target = b; }); return target || (target = { x: 14.12, y: 5.12, w: .76, d: .76, h: 1.6 }); }
    function drawBeat() {
      if (!beat) return;
      var k = scale, i;
      if (PATROL_BEATS[beat] && beat !== 'bus-in' && beat !== 'bus-out') {
        // 定位訊號：每個學生身上一圈一圈往外擴
        kids.forEach(function (kd, j) {
          var red = stray.on && kd === stray.k && stray.t > .9, r = ((now / 1000 + j * .37) % 1.6) / 1.6, g = iso(kd.x, kd.y, 0);
          ctx.globalAlpha = (1 - r) * .9; ctx.strokeStyle = red ? P.alert : P.check; ctx.lineWidth = 1.4 * k;
          ctx.beginPath(); ctx.ellipse(g[0], g[1], (2 + r * 10) * k, (1 + r * 5) * k, 0, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
        });
      }
      if (beat === 'alert' && stray.on && stray.t > .9) {   // 老師手機 ↔ 走出去的學生
        var a = iso(TEACHER.x, TEACHER.y, 0), h = kidHead(stray.k);
        ctx.setLineDash([5 * k, 4 * k]); ctx.lineDashOffset = -now / 40; ctx.strokeStyle = P.alert; ctx.lineWidth = 2 * k;
        ctx.beginPath(); ctx.moveTo(a[0] + 3.4 * k, a[1] - 8.4 * k); ctx.lineTo(h[0], h[1]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (beat === 'gather') kids.forEach(function (kd) {   // 一個一個打勾
        if (!kd.at || now < kd.chk) return; var e = Math.min(1, (now - kd.chk) / 250), h = kidHead(kd);
        checkMark([h[0], h[1] - 6 * k], 3 * k * (e < 1 ? .6 + e * .5 : 1), Math.min(1, e * 2));
      });
      if (VOUCH_BEATS[beat] && beat !== 'done') {   // 會計部那一層亮起來
        var pul = .45 + Math.sin(now / 300) * .15; towerFace(FLOOR.z0, FLOOR.z1, 'rgba(212,169,78,' + pul.toFixed(2) + ')');
      }
      if (beat === 'pile') {   // 桌上的發票越疊越高
        var n = Math.min(14, Math.floor((now - beatT0) / 260)), base = iso(TOWER.x + TOWER.w - .32, TOWER.y + TOWER.d - .32, TOWER.h - 1.5 + .08);   // 疊在高樓退縮處的平台上
        for (i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#f4f1ea' : '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = .6 * k; var sx = base[0] + Math.sin(i * 1.7) * 1.2 * k, sy = base[1] - i * 1.6 * k; ctx.beginPath(); ctx.moveTo(sx - 7 * k, sy); ctx.lineTo(sx, sy - 3.5 * k); ctx.lineTo(sx + 7 * k, sy); ctx.lineTo(sx, sy + 3.5 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      }
      if (beat === 'snap' && now - flashT < 260) {   // 拍照的閃光
        var f = 1 - (now - flashT) / 260; glow(iso(TOWER.x + TOWER.w - .2, TOWER.y + TOWER.d - .2, (FLOOR.z0 + FLOOR.z1) / 2), 60 * f + 10, 'rgba(255,255,255,');
      }
      if (beat === 'ai') {   // 大樓上方的 AI：發票飛進去、變成綠色勾勾出來
        var c = iso(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, TOWER.h + 3), rx = 30 * k, ry = 15 * k;
        glow(c, 46, 'rgba(212,169,78,');
        ctx.save(); ctx.translate(c[0], c[1]); ctx.strokeStyle = '#D4A94E'; ctx.lineWidth = 2.4 * k; ctx.setLineDash([10 * k, 6 * k]); ctx.lineDashOffset = -now / 30;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
        var sweep = Math.sin(now / 420) * rx * .8; ctx.strokeStyle = 'rgba(80,160,255,.9)'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(sweep, -ry * .7); ctx.lineTo(sweep, ry * .7); ctx.stroke();
        ctx.fillStyle = '#D4A94E'; ctx.font = '800 ' + Math.round(13 * k) + 'px "Bricolage Grotesque", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AI', 0, 0); ctx.restore();
        var src = iso(TOWER.x + TOWER.w - .2, TOWER.y + TOWER.d - .2, FLOOR.z1);
        aiParts.forEach(function (p) {
          var s = 6 * k;
          if (p.t < .55) { var u = p.t / .55, e = u * u * (3 - 2 * u), px = src[0] + (c[0] - src[0]) * e + Math.sin(u * 3.14) * 22 * k * p.side, py = src[1] + (c[1] - src[1]) * e;
            ctx.globalAlpha = u > .85 ? (1 - u) / .15 : 1; ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(now / 200 + p.u * 9) * .4); ctx.fillStyle = P.paper; ctx.fillRect(-s * .6, -s * .8, s * 1.2, s * 1.6); ctx.fillStyle = '#c9c9c9'; ctx.fillRect(-s * .4, -s * .45, s * .8, s * .14); ctx.fillRect(-s * .4, -s * .1, s * .6, s * .14); ctx.restore(); ctx.globalAlpha = 1; }
          else { var v = (p.t - .55) / .45; checkMark([c[0] + p.side * (rx + v * 40 * k), c[1] + v * 18 * k], 5 * k, v > .7 ? (1 - v) / .3 : Math.min(1, v * 4)); }
        });
      }
      if (beat === 'export') {   // 資料沿著馬路送到會計軟體那棟樓
        ctx.setLineDash([3 * k, 5 * k]); ctx.strokeStyle = 'rgba(79,224,138,.55)'; ctx.lineWidth = 1.6 * k; ctx.beginPath();
        ROUTE.forEach(function (p, j) { var q = iso(p[0], p[1], .05); if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.setLineDash([]);
        packets.forEach(function (p) { var q = onRoute(p.s), g = iso(q[0], q[1], .18); ctx.fillStyle = P.check; ctx.fillRect(g[0] - 3 * k, g[1] - 2 * k, 6 * k, 4 * k); glow(g, 8, 'rgba(79,224,138,'); });
        var b = erpBuilding(), pul2 = .5 + Math.sin(now / 280) * .3;
        ctx.strokeStyle = 'rgba(212,169,78,' + pul2.toFixed(2) + ')'; ctx.lineWidth = 3 * k;
        poly([iso(b.x, b.y, b.h), iso(b.x + b.w, b.y, b.h), iso(b.x + b.w, b.y + b.d, b.h), iso(b.x, b.y + b.d, b.h)], null, ctx.strokeStyle);
      }
      if (beat === 'done') {   // 整棟大樓亮起來
        var pul3 = .22 + Math.sin(now / 500) * .08; towerFace(.95, TOWER.h - 1.55, 'rgba(255,214,120,' + pul3.toFixed(2) + ')');
        glow(iso(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, TOWER.h / 2), 120, 'rgba(255,210,120,');
      }
    }
    function drawClouds() {
      clouds.forEach(function (c) {
        var x = c.x * cw, y = c.y * ch, s = c.s * 60 * Math.max(.6, scale);
        ctx.fillStyle = P.cloud; ctx.beginPath();
        ctx.ellipse(x, y, s, s * .38, 0, 0, 6.28); ctx.ellipse(x - s * .45, y + s * .08, s * .55, s * .3, 0, 0, 6.28); ctx.ellipse(x + s * .4, y - s * .1, s * .5, s * .32, 0, 0, 6.28); ctx.fill();
      });
    }

    // ---------- 主迴圈 ----------
    var now = 0, last = 0, raf = 0, running = false, nextPaper = 0, nextStray = 4000, nextFlick = 0;
    // 前方最近的路口（還沒過停止線的那個）
    function nextCross(pos, dir, margin) {
      var best = null, bd = 1e9;
      ROADS.forEach(function (c) { var line = dir > 0 ? c - margin : c + 1 + margin, d = (line - pos) * dir; if (d > -.02 && d < bd) { bd = d; best = c; } });
      return best === null ? null : { c: best, d: bd };
    }
    function updateCars(dt) {
      var lanes = {};
      cars.forEach(function (c) { (lanes[c.axis + c.lane] = lanes[c.axis + c.lane] || []).push(c); });
      Object.keys(lanes).forEach(function (k) {
        var L = lanes[k].sort(function (a, b) { return (b.pos - a.pos) * b.dir; });   // 最前面的車排第一
        L.forEach(function (c, i) {
          var dist = 1e9;
          if (i > 0) dist = (L[i - 1].pos - c.pos) * c.dir - CAR_L - .16;          // 跟前車保持距離
          var x = nextCross(c.pos + c.dir * CAR_L / 2, c.dir, STOP);
          if (x) {
            var st = c.axis === 'x' ? light('x', x.c, c.road) : light('y', c.road, x.c);
            if (st === 'r' || (st === 'y' && (x.d > .35 || c.v < .6))) dist = Math.min(dist, x.d - .02);   // 紅燈停；黃燈來得及就停，停著的車黃燈不起步
          }
          var want = Math.min(c.vmax, Math.sqrt(Math.max(0, 2 * 1.5 * dist)));
          var before = c.v;
          c.v = c.v < want ? Math.min(want, c.v + .9 * dt) : Math.max(want, c.v - 3.2 * dt);
          c.brake = c.v < before - .001 || (c.v < .05 && dist < .5);
          c.pos += c.dir * c.v * dt;
          if (c.pos > N + .7) c.pos = -.7; if (c.pos < -.7) c.pos = N + .7;
        });
      });
    }
    function updatePeople(dt) {
      var lanes = {};
      people.forEach(function (p) { if (p.state !== 'gone') (lanes[p.axis + p.lane] = lanes[p.axis + p.lane] || []).push(p); });
      people.forEach(function (p) {
        p.t -= dt;
        if (p.state === 'gone') { p.a = Math.max(0, p.a - dt * 2); if (p.t <= 0) { p.pos = Math.random() * N; p.state = 'walk'; p.a = 0; } return; }
        if (p.state === 'chat') { p.v = 0; if (p.t <= 0) p.state = 'walk'; return; }
        p.a = Math.min(1, (p.a || 0) + dt * 2);
        var dist = 1e9, x = nextCross(p.pos, p.dir, .06);
        if (x && x.d < .25) {   // 到路口邊：自己這個方向綠燈才過斑馬線（過到一半的繼續走）
          var st = p.axis === 'x' ? light('x', x.c, p.road) : light('y', p.road, x.c);
          if (st !== 'g') dist = x.d;
        }
        var L = lanes[p.axis + p.lane];
        L.forEach(function (o) { if (o !== p) { var d = (o.pos - p.pos) * p.dir; if (d > 0 && d < dist + .14) dist = Math.min(dist, d - .14); } });
        var want = Math.min(p.vmax, Math.max(0, dist) * 3);
        p.v = p.v < want ? Math.min(want, p.v + .8 * dt) : want;
        p.pos += p.dir * p.v * dt; p.ph += p.v * dt * 38;
        if (p.pos > N + .3) p.pos = -.3; if (p.pos < -.3) p.pos = N + .3;
        // 不在路口附近時，偶爾停下來聊天，或走進大樓（淡出，之後從別處走出來）
        if (!x || x.d > .6) {
          if (Math.random() < dt * .03) { p.state = 'chat'; p.t = 1.5 + Math.random() * 2.5; }
          else if (Math.random() < dt * .015) { p.state = 'gone'; p.t = 2 + Math.random() * 3; }
        }
      });
    }
    function update(dt) {
      updateCars(dt); updatePeople(dt);
      kids.forEach(function (k) {
        if (stray.on && k === stray.k) return;
        var gx = k.gx !== undefined, dx = (gx ? k.gx : k.tx) - k.x, dy = (gx ? k.gy : k.ty) - k.y, d = Math.hypot(dx, dy), sp = gx ? .5 : .25;
        if (d < .03) { if (!gx) retarget(k); else k.at = k.at || now; } else { k.x += dx / d * sp * dt; k.y += dy / d * sp * dt; k.ph = (k.ph || 0) + sp * dt * 38; }
      });
      // 每隔一段時間，一個學生走出範圍 → 老師手機收到提醒 → 走回來
      if (!story && !stray.on && now > nextStray) { stray.on = true; stray.t = 0; stray.k = kids[Math.floor(Math.random() * kids.length)]; stray.sx = stray.k.x; stray.sy = stray.k.y; }
      if (stray.on) {
        stray.t += dt / 2.2;
        if (stray.hold && stray.t > 2.3) stray.t = 2.3;
        if (story) stray.t += dt / 2.2;   // 故事裡走出去、走回來都快一倍   // 故事裡：停在範圍外，等下一幕再走回來
        var out = Math.min(1, stray.t), back = Math.max(0, stray.t - 2.4) / .9;
        var ex = FIELD.cx + 2.0, ey = FIELD.cy + 2.1, f = out - Math.min(1, back);
        stray.k.x = stray.sx + (ex - stray.sx) * f; stray.k.y = stray.sy + (ey - stray.sy) * f;
        if (opt.onAlert) opt.onAlert(stray.t > .9 && stray.t < 2.35);   // 開始走回來時提醒就收起來
        if (back >= 1) { stray.on = false; nextStray = now + 6500; retarget(stray.k); if (opt.onAlert) opt.onAlert(false); }
      }
      if (bus.on) { var bk = Math.min(1, (now - bus.t0) / 1000 / bus.dur), be = 1 - Math.pow(1 - bk, 3); bus.x = bus.from + (bus.to - bus.from) * be; if (bk >= 1 && bus.leaving) bus.on = false; }
      if (paperMode === 'snap' && now > nextPaper) { papers.push({ t: 0, u: .4 + Math.random() * 1.1, z0: FLOOR.z0 + .1 }); nextPaper = now + 380; }
      if (paperMode === 'snap' && now - flashT > 1600) flashT = now;
      if (beat === 'ai' && now > nextFx) { aiParts.push({ t: 0, u: Math.random(), side: Math.random() < .5 ? -1 : 1 }); nextFx = now + 420; }
      aiParts.forEach(function (p) { p.t += dt / 2.6; }); aiParts = aiParts.filter(function (p) { return p.t < 1; });
      if (beat === 'export' && now > nextFx) { packets.push({ s: 0 }); nextFx = now + 260; }
      packets.forEach(function (p) { p.s += dt * 2.2; }); packets = packets.filter(function (p) { return p.s < ROUTE_LEN; });
      if (paperMode === 'flow' && now > nextPaper) { papers.push({ t: 0, u: .3 + Math.random() * 1.4, z0: 1 + Math.random() * 4.5 }); nextPaper = now + 900; }
      papers.forEach(function (p) { p.t += dt / 3.2; }); papers = papers.filter(function (p) { return p.t < 1; });
      clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 1.3) c.x = -.3; });
      if (now > nextFlick) { flickerWindows(); nextFlick = now + 700; }
    }
    function camGoal(t) {
      if (!t) return { fx: cw / 2, fy: ch / 2, z: 1, ax: .5, ay: .5, home: true };
      var a = opt.anchor ? opt.anchor(cw, ch) : { x: .5, y: .5 }, p = iso(t.x, t.y, t.z || 0);
      return { fx: p[0], fy: p[1], z: t.zoom || 2, ax: a.x, ay: a.y, home: false };
    }
    function flyTo(t, ms) {
      camTarget = t; var goal = camGoal(t);
      if (reduced || ms === 0) { cam = goal; camAnim = null; if (!running) draw(); return; }
      camAnim = { from: cam, to: goal, t0: now, d: ms || 1500 };
    }
    function stepCam() {
      if (!camAnim) return;
      var k = Math.min(1, (now - camAnim.t0) / camAnim.d), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, A = camAnim.from, B = camAnim.to;
      cam = { fx: A.fx + (B.fx - A.fx) * e, fy: A.fy + (B.fy - A.fy) * e, z: Math.exp(Math.log(A.z) + (Math.log(B.z) - Math.log(A.z)) * e), ax: A.ax + (B.ax - A.ax) * e, ay: A.ay + (B.ay - A.ay) * e, home: B.home && k === 1 };
      if (k === 1) camAnim = null;
    }
    // 鏡頭一直有一點點緩慢漂移（像空拍機懸停），城市不會看起來像一張靜止圖；減少動態時不漂移
    var V = { fx: 0, fy: 0, z: 1 };
    function view() { var k = reduced ? 0 : 1; V.fx = cam.fx + Math.sin(now / 9000) * 2.5 * k / cam.z; V.fy = cam.fy + Math.cos(now / 11000) * 1.5 * k / cam.z; V.z = cam.z * (1 + Math.sin(now / 13000) * .008 * k); /* 幅度很小，依鏡頭遠近換算成固定的螢幕距離（拉近時不會晃得更大） */ return V; }
    function camXY(p) { view(); return [cam.ax * cw + (p[0] - V.fx) * V.z, cam.ay * ch + (p[1] - V.fy) * V.z]; }
    function draw() {
      stepCam();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      if (theme === 'dusk') { ctx.fillStyle = 'rgba(255,255,255,.55)'; var sr = rng(3); for (var s = 0; s < 60; s++) { ctx.fillRect(sr() * cw, sr() * ch * .45, 1.2, 1.2); } }
      drawClouds();
      // 之後畫城市本體：套上鏡頭
      view(); ctx.setTransform(dpr * V.z, 0, 0, dpr * V.z, dpr * (cam.ax * cw - V.fx * V.z), dpr * (cam.ay * ch - V.fy * V.z));
      drawGround();
      drawFence();
      // 依深度（x+y）排序後畫：大樓、樹、車、人、學生、學校、大樓
      var list = [];
      buildings.forEach(function (b) { list.push([b.x + b.w + b.y + b.d, function () { drawBuilding(b); }]); });
      trees.forEach(function (t) { list.push([t.x + t.y + .3, function () { drawTree(t); }]); });
      cars.forEach(function (c) { if (bus.on && c.axis === 'x' && c.road === 13) return; var x = c.axis === 'x' ? c.pos : c.lane, y = c.axis === 'x' ? c.lane : c.pos; list.push([x + y + .3, function () { drawCar(c); }]); });
      if (bus.on) list.push([bus.x + BUS_Y + .6, drawBus]);
      list.push([TEACHER.x + TEACHER.y + .2, drawTeacher]);
      people.forEach(function (p) { var x = p.axis === 'x' ? p.pos : p.lane, y = p.axis === 'x' ? p.lane : p.pos; list.push([x + y + .2, function () { drawPerson(p, p.c); }]); });
      kids.forEach(function (k) { var red = stray.on && k === stray.k && stray.t > .9; list.push([k.x + k.y + .2, function () { drawPerson(k, red ? P.alert : P.kid, P.kidRing); }]); });
      ROADS.forEach(function (cx) { ROADS.forEach(function (cy) {
        list.push([cx + cy - .2, function () { drawSignal(cx, cy, cx - .12, cy - .12); }]);
        list.push([cx + cy + 2.2, function () { drawSignal(cx, cy, cx + 1.12, cy + 1.12); }]);
      }); });
      list.push([SITE.x + SITE.y + 1.6, drawSite]);
      list.push([SCHOOL.x + 1 + SCHOOL.y + SCHOOL.d, drawSchool]);
      list.push([TOWER.x + TOWER.w + TOWER.y + TOWER.d, drawTower]);
      list.sort(function (a, b) { return a[0] - b[0]; });
      list.forEach(function (it) { it[1](); });
      drawBeat();
      drawPapers();
    }
    function frame(t) {
      var dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t; now = t;
      update(dt); draw();
      if (opt.onFrame) opt.onFrame();
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    cam = camGoal(null);
    if (reduced) { now = 3000; draw(); } else start();
    addEventListener('resize', function () { resize(); cam = camGoal(camTarget); camAnim = null; if (!running) draw(); if (opt.onLayout) opt.onLayout(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    var visible = true;

    function startStray(hold) {
      if (!stray.on) { stray.on = true; stray.t = 0; stray.k = kids[3]; stray.sx = stray.k.x; stray.sy = stray.k.y; }
      stray.hold = hold;
    }
    return {
      // 故事模式：關掉自動事件，由頁面一幕一幕控制
      storyMode: function (on) {
        story = on;
        if (on && stray.on) { stray.on = false; stray.hold = false; stray.k.x = stray.sx; stray.k.y = stray.sy; retarget(stray.k); if (opt.onAlert) opt.onAlert(false); }   // 故事從頭開始：先讓剛剛走出去的學生回到原位
        if (!on) { stray.hold = false; paperMode = 'flow'; nextStray = now + 3000; }
      },
      flyTo: flyTo,
      setStray: function (m) {
        if (m === 'out') startStray(true);
        // 走回來：從目前位置直接掉頭（不必先走到最外面）
        else if (m === 'back' && stray.on) { stray.hold = false; if (stray.t < 2.4) stray.t = 2.4 + (1 - Math.min(1, stray.t)) * .9; }
      },
      setPapers: function (m) { paperMode = m; if (m === 'off') papers = []; },
      // 故事的一幕：讓城市裡真的發生這件事（null＝回到平常）
      setBeat: function (b) {
        var prevB = beat; beat = b || null; beatT0 = now; packets = []; aiParts = []; nextFx = 0;
        kids.forEach(function (kd) { delete kd.gx; delete kd.gy; delete kd.at; });
        if (b === 'bus-in') { bus.on = true; bus.leaving = false; bus.from = -1.5; bus.to = 10.3; bus.t0 = now; bus.dur = 3.6; }
        else if (b === 'bus-out') { bus.on = true; bus.leaving = true; bus.from = bus.x > 0 ? bus.x : 10.3; bus.x = bus.from; bus.to = 17.5; bus.t0 = now + 400; bus.dur = 4.5; }
        else if (b && PATROL_BEATS[b]) { if (!bus.on) { bus.on = true; bus.leaving = false; bus.from = bus.to = bus.x = 10.3; bus.t0 = now; bus.dur = .01; } }
        else { bus.on = false; }
        if (b === 'gather') {
          kids.forEach(function (kd, j) { var ang = -2.9 + (j / (kids.length - 1)) * 3.6, r = .42 + (j % 3) * .26; kd.gx = TEACHER.x + .15 + Math.cos(ang) * r; kd.gy = TEACHER.y - .25 + Math.sin(ang) * r * .8; kd.chk = now + 900 + j * 200; });
        }
        if (VOUCH_BEATS[b]) paperMode = b === 'snap' ? 'snap' : 'off';
        if (b === 'pile' || b === 'ai' || b === 'export' || b === 'done') papers = [];
        if (!b) paperMode = 'flow';
        if (!running) draw();
      },
      // 劇情裡的東西現在在螢幕的哪裡（給故事的標籤用）
      where: function (name) {
        var b = erpBuilding(), p = name === 'bus' ? (bus.on ? iso(bus.x, BUS_Y, 1.1) : null)
          : name === 'teacher' ? iso(TEACHER.x, TEACHER.y, 1.05)
          : name === 'stray' ? (stray.on ? iso(stray.k.x, stray.k.y, 1.05) : null)
          : name === 'class' ? iso(FIELD.cx, FIELD.cy, 1.2)
          : name === 'floor' ? iso(TOWER.x + TOWER.w - .2, TOWER.y + TOWER.d - .2, FLOOR.z1 + .9)
          : name === 'ai' ? iso(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, TOWER.h + 4.1)
          : name === 'erp' ? iso(b.x + b.w / 2, b.y + b.d / 2, b.h + .5)
          : name === 'tower' ? iso(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, TOWER.h + 2) : null;
        if (!p) return null; var q = camXY(p); return { x: q[0], y: q[1] };
      },
      // 故事用的地點（世界座標）
      places: { field: { x: FIELD.cx, y: FIELD.cy }, gate: { x: FIELD.cx + 2.0, y: FIELD.cy + 2.1 }, school: { x: SCHOOL.x + 2, y: SCHOOL.y + 2 }, tower: { x: TOWER.x + TOWER.w / 2, y: TOWER.y + TOWER.d / 2, h: TOWER.h }, site: { x: SITE.x + 1, y: SITE.y + 1 } },
      // 城市只在畫面上看得到時才動（省電）
      _debug: function () { return { cars: cars, light: light, ROADS: ROADS, CAR_L: CAR_L, stray: stray, story: story }; },  // 給自動測試讀交通狀態
      setVisible: function (v) { visible = v; if (v && !document.hidden) start(); else stop(); },
      setTheme: function (t) { theme = t; P = PAL[t]; lit = {}; if (!running) draw(); },
      // 給 HTML 標籤用：產品地點的螢幕座標（CSS px）
      spots: function () {
        var s = camXY(iso(SCHOOL.x + 1.4, SCHOOL.y + 1.2, 2.4)), t = camXY(iso(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, TOWER.h + 2.2)), n = camXY(iso(SITE.x + .35, SITE.y + .35, 5.6)), g = camXY(iso(FIELD.cx + 2.0, FIELD.cy + 2.1, 1.2));
        return { patrol: { x: s[0], y: s[1] }, vouch: { x: t[0], y: t[1] }, next: { x: n[0], y: n[1] }, stray: { x: g[0], y: g[1] }, home: cam.home && !camAnim };
      }
    };
  }

  window.City = { mount: mount };
})();
