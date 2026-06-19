'use strict';

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 25;
const MINI_BLOCK = 22;
const CLEAR_ANIM_MS = 200;

const COLORS = {
  I:'#00d4ff', O:'#ffe600', T:'#b000ff',
  S:'#00ff88', Z:'#ff3060', J:'#0060ff', L:'#ff8800',
  ghost:'rgba(255,255,255,0.12)', bg:'#05050f', grid:'rgba(255,255,255,0.03)',
};

const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]],
};

const LEVEL_SPEED = [800,700,600,500,400,320,260,210,160,120,90];
const SCORE_TABLE  = {1:100, 2:300, 3:500, 4:800};
const TSPIN_TABLE  = {0:400, 1:800, 2:1200, 3:1600};

// SRS 킥 테이블 (y: 양수=아래)
const KICK_JLSTZ = [
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
];
const KICK_I = [
  [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
];

// ─── 사운드 ──────────────────────────────────────────────────────────────────
const SoundManager = (() => {
  let actx = null;
  let bgmRunning = false;
  let bgmTimeout = null;
  let nextBgmTime = 0;

  const BPM = 160;
  const BEAT = 60 / BPM;

  const MELODY = [
    [659,1],[494,.5],[523,.5],[587,1],[523,.5],[494,.5],
    [440,1],[440,.5],[523,.5],[659,1],[587,.5],[523,.5],
    [494,1.5],[523,.5],[587,1],[659,1],[523,1],[440,1],[440,2],
    [587,1.5],[698,.5],[880,1],[784,.5],[698,.5],
    [659,1.5],[523,.5],[659,1],[587,.5],[523,.5],
    [494,1.5],[523,.5],[587,1],[659,1],[523,1],[440,1],[440,2],
  ];

  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function note(freq, dur, type = 'square', vol = 0.12, t = null) {
    if (!actx) return;
    const s = t ?? actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain); gain.connect(actx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, s);
    gain.gain.setValueAtTime(vol, s);
    gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
    osc.start(s); osc.stop(s + dur);
  }

  function play(type) {
    if (!actx) return;
    const t = actx.currentTime;
    switch (type) {
      case 'move':    note(160,.05,'square',.06); break;
      case 'rotate':  note(260,.07,'square',.09); break;
      case 'hold':    note(330,.07,'square',.08); break;
      case 'drop':
        note(120,.08,'sawtooth',.14);
        note(70,.12,'sawtooth',.10, t+.06);
        break;
      case 'clear1':
        note(440,.07,'square',.14);
        note(554,.15,'square',.12, t+.07);
        break;
      case 'clear2':
        note(440,.07,'square',.15); note(554,.07,'square',.12,t+.07);
        note(659,.18,'square',.14, t+.14);
        break;
      case 'clear3':
        note(440,.07,'square',.15); note(554,.07,'square',.12,t+.07);
        note(659,.07,'square',.14,t+.14); note(880,.22,'square',.14,t+.21);
        break;
      case 'clear4':
        note(440,.07,'square',.18); note(554,.07,'square',.16,t+.07);
        note(659,.07,'square',.18,t+.14); note(880,.12,'square',.20,t+.21);
        note(1047,.35,'square',.18,t+.30);
        break;
      case 'tspin':
        note(587,.07,'square',.16); note(740,.07,'square',.16,t+.07);
        note(988,.25,'square',.18,t+.14);
        break;
      case 'levelup':
        note(523,.06,'square',.16); note(659,.06,'square',.16,t+.07);
        note(784,.06,'square',.16,t+.14); note(1047,.22,'square',.18,t+.21);
        break;
      case 'gameover':
        note(440,.18,'sawtooth',.18); note(349,.18,'sawtooth',.18,t+.18);
        note(294,.18,'sawtooth',.18,t+.36); note(220,.5,'sawtooth',.20,t+.54);
        break;
    }
  }

  function scheduleMelody(startTime) {
    let t = startTime;
    for (const [freq, beats] of MELODY) {
      const dur = beats * BEAT;
      note(freq, dur * 0.85, 'square', 0.055, t);
      t += dur;
    }
    return t;
  }

  function bgmLoop() {
    if (!bgmRunning || !actx) return;
    if (actx.currentTime >= nextBgmTime - 1) {
      nextBgmTime = scheduleMelody(nextBgmTime);
    }
    bgmTimeout = setTimeout(bgmLoop, 200);
  }

  function startBGM() {
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    if (bgmRunning) return;
    bgmRunning = true;
    nextBgmTime = actx.currentTime + 0.1;
    bgmLoop();
  }

  function stopBGM() {
    bgmRunning = false;
    clearTimeout(bgmTimeout);
  }

  function suspend()   { actx && actx.state === 'running'   && actx.suspend(); }
  function resumeCtx() { actx && actx.state === 'suspended' && actx.resume();  }

  return { init, play, startBGM, stopBGM, suspend, resumeCtx };
})();

// ─── 캔버스 / DOM ─────────────────────────────────────────────────────────────
const canvas     = document.getElementById('game-canvas');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx    = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx    = holdCanvas.getContext('2d');

const scoreEl      = document.getElementById('score');
const bestScoreEl  = document.getElementById('best-score');
const levelEl      = document.getElementById('level');
const linesEl      = document.getElementById('lines');
const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub   = document.getElementById('overlay-sub');
const btnStart     = document.getElementById('btn-start');
const btnPause     = document.getElementById('btn-pause');
const btnRestart   = document.getElementById('btn-restart');

// ─── 게임 상태 ────────────────────────────────────────────────────────────────
let board, piece, nextPiece, holdPiece;
let score, level, lines, combo;
let gameOver, paused, started, holdUsed;
let dropTimer, lastTime, animId;
let lastRotatedT = false;

// 라인 클리어 애니메이션
let clearAnimating = false;
let clearAnimTimer = 0;
let clearingLines  = [];
let tSpinPending   = false;

// 이펙트
let scorePopups = [];   // [{text,color,size,x,y,vy,opacity}]
let shakeTimer  = 0;
let comboDisplay = null; // {count, timer}

let bestScore = parseInt(localStorage.getItem('tetris_best') || '0');

// ─── 7-bag ────────────────────────────────────────────────────────────────────
const TYPES = ['I','O','T','S','Z','J','L'];
let bag = [];

function refillBag() {
  bag = [...TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
function nextFromBag() { if (!bag.length) refillBag(); return bag.pop(); }

// ─── 피스 생성 ────────────────────────────────────────────────────────────────
function createPiece(type) {
  const matrix = SHAPES[type].map(r => [...r]);
  return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0, rotation: 0 };
}

// ─── 회전 행렬 ────────────────────────────────────────────────────────────────
function rotate(matrix) {
  const n = matrix.length, m = matrix[0].length;
  const res = Array.from({length: m}, () => Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < m; c++)
      res[c][n - 1 - r] = matrix[r][c];
  return res;
}

// ─── 충돌 감지 ────────────────────────────────────────────────────────────────
function collides(p, dx = 0, dy = 0, mat = null) {
  const m = mat || p.matrix;
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const nx = p.x + c + dx, ny = p.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  return false;
}

// ─── T-스핀 판정 ──────────────────────────────────────────────────────────────
function checkTSpin() {
  if (piece.type !== 'T' || !lastRotatedT) return false;
  const cx = piece.x, cy = piece.y;
  let filled = 0;
  for (const [dx, dy] of [[0,0],[2,0],[0,2],[2,2]]) {
    const bx = cx + dx, by = cy + dy;
    if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS || board[by]?.[bx]) filled++;
  }
  return filled >= 3;
}

// ─── 피스 고정 ────────────────────────────────────────────────────────────────
function lockPiece() {
  const tspin = checkTSpin();
  lastRotatedT = false;

  for (let r = 0; r < piece.matrix.length; r++)
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (!piece.matrix[r][c]) continue;
      const y = piece.y + r, x = piece.x + c;
      if (y < 0) { endGame(); return; }
      board[y][x] = piece.type;
    }

  const full = [];
  for (let r = 0; r < ROWS; r++)
    if (board[r].every(v => v)) full.push(r);

  piece = null;

  if (full.length === 0) {
    combo = 0;
    spawnPiece();
    return;
  }

  clearingLines  = full;
  tSpinPending   = tspin;
  clearAnimTimer = CLEAR_ANIM_MS;
  clearAnimating = true;
}

// ─── 라인 클리어 완료 ─────────────────────────────────────────────────────────
function finishClear() {
  const count = clearingLines.length;
  const prevLevel = level;

  clearingLines.sort((a, b) => b - a);
  for (const r of clearingLines) {
    board.splice(r, 1);
    board.unshift(Array(COLS).fill(0));
  }
  clearingLines = [];

  lines += count;
  level = Math.min(10, Math.floor(lines / 10) + 1);

  let gained;
  if (tSpinPending) {
    gained = (TSPIN_TABLE[count] || 0) * level;
    addPopup(`T-SPIN! +${gained.toLocaleString()}`, '#b000ff', 24);
    SoundManager.play('tspin');
  } else {
    gained = (SCORE_TABLE[count] || 0) * level;
    if (count === 4) {
      addPopup(`TETRIS! +${gained.toLocaleString()}`, '#00d4ff', 24);
      shakeTimer = 380;
      SoundManager.play('clear4');
    } else {
      addPopup(`+${gained.toLocaleString()}`, '#ffffff', 20);
      SoundManager.play(`clear${count}`);
    }
  }
  tSpinPending = false;
  score += gained;

  combo++;
  if (combo >= 2) {
    const bonus = 50 * combo * level;
    score += bonus;
    comboDisplay = { count: combo, timer: 1500 };
    addPopup(`COMBO ×${combo}  +${bonus}`, comboColor(combo), 18);
  }

  if (level > prevLevel) SoundManager.play('levelup');

  updateUI();
  flashScore();
  spawnPiece();
}

function comboColor(n) {
  if (n >= 6) return '#ff3060';
  if (n >= 4) return '#ff8800';
  if (n >= 3) return '#ffe600';
  return '#00ff88';
}

// ─── 스폰 / 홀드 ──────────────────────────────────────────────────────────────
function spawnPiece() {
  piece = createPiece(nextPiece);
  nextPiece = nextFromBag();
  holdUsed = false;
  if (collides(piece)) { endGame(); return; }
  drawNext();
}

function holdPieceFn() {
  if (holdUsed || !piece) return;
  holdUsed = true;
  SoundManager.play('hold');
  if (!holdPiece) {
    holdPiece = piece.type;
    piece = null;
    spawnPiece();
  } else {
    const tmp = holdPiece;
    holdPiece = piece.type;
    piece = createPiece(tmp);
  }
  drawHold();
}

// ─── 이동 / 회전 / 드롭 ──────────────────────────────────────────────────────
function ghostY() {
  let dy = 0;
  while (!collides(piece, 0, dy + 1)) dy++;
  return piece.y + dy;
}

function moveLeft() {
  if (!piece || collides(piece, -1, 0)) return;
  piece.x--; lastRotatedT = false; SoundManager.play('move');
}
function moveRight() {
  if (!piece || collides(piece, 1, 0)) return;
  piece.x++; lastRotatedT = false; SoundManager.play('move');
}

function rotatePiece() {
  if (!piece) return;
  const rot = rotate(piece.matrix);
  const newRot = (piece.rotation + 1) % 4;
  const kicks = piece.type === 'I' ? KICK_I[piece.rotation]
              : piece.type === 'O' ? [[0,0]]
              : KICK_JLSTZ[piece.rotation];
  for (const [dx, dy] of kicks) {
    if (!collides(piece, dx, dy, rot)) {
      piece.matrix = rot; piece.x += dx; piece.y += dy;
      piece.rotation = newRot;
      lastRotatedT = (piece.type === 'T');
      SoundManager.play('rotate');
      return;
    }
  }
}

function softDrop() {
  if (!piece) return;
  if (!collides(piece, 0, 1)) {
    piece.y++; score += 1; lastRotatedT = false; updateUI();
  } else { lockPiece(); }
  dropTimer = 0;
}

function hardDrop() {
  if (!piece) return;
  const dy = ghostY() - piece.y;
  piece.y += dy; score += dy * 2;
  lastRotatedT = false; updateUI();
  SoundManager.play('drop');
  lockPiece(); dropTimer = 0;
}

// ─── 팝업 이펙트 ─────────────────────────────────────────────────────────────
function addPopup(text, color, size = 20) {
  scorePopups.push({ text, color, size,
    x: canvas.width / 2, y: canvas.height / 2 - 10,
    vy: -1.1, opacity: 1.0 });
}

function updatePopups() {
  scorePopups = scorePopups.filter(p => p.opacity > 0.02);
  for (const p of scorePopups) {
    p.y += p.vy; p.opacity -= 0.014;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 10;
    ctx.font = `bold ${p.size}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

// ─── 그리기 ──────────────────────────────────────────────────────────────────
function drawBlock(context, x, y, color, size = BLOCK) {
  const px = x * size, py = y * size;
  context.fillStyle = color;
  context.fillRect(px+1, py+1, size-2, size-2);
  context.fillStyle = 'rgba(255,255,255,0.22)';
  context.fillRect(px+2, py+2, size-4, 4);
  context.fillRect(px+2, py+2, 4, size-4);
  context.fillStyle = 'rgba(0,0,0,0.3)';
  context.fillRect(px+2, py+size-5, size-4, 3);
  context.fillRect(px+size-5, py+2, 3, size-4);
}

function drawGrid() {
  ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c*BLOCK, 0); ctx.lineTo(c*BLOCK, ROWS*BLOCK); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r*BLOCK); ctx.lineTo(COLS*BLOCK, r*BLOCK); ctx.stroke();
  }
}

function drawBoard() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  const flashOn = clearAnimating && (Math.floor(clearAnimTimer / 50) % 2 === 0);
  for (let r = 0; r < ROWS; r++) {
    const isClearing = clearingLines.includes(r);
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) continue;
      drawBlock(ctx, c, r, (isClearing && flashOn) ? '#ffffff' : COLORS[board[r][c]]);
    }
  }
}

function drawGhost() {
  if (!piece) return;
  const gy = ghostY();
  for (let r = 0; r < piece.matrix.length; r++)
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (!piece.matrix[r][c]) continue;
      const py = gy + r; if (py < 0) continue;
      ctx.fillStyle = COLORS.ghost;
      ctx.fillRect((piece.x+c)*BLOCK+1, py*BLOCK+1, BLOCK-2, BLOCK-2);
    }
}

function drawPiece() {
  if (!piece) return;
  for (let r = 0; r < piece.matrix.length; r++)
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (!piece.matrix[r][c]) continue;
      const py = piece.y + r; if (py < 0) continue;
      drawBlock(ctx, piece.x + c, py, COLORS[piece.type]);
    }
}

function drawMiniPiece(context, type) {
  const cw = context.canvas.width, ch = context.canvas.height;
  context.fillStyle = '#05050f';
  context.fillRect(0, 0, cw, ch);
  if (!type) return;
  const mat = SHAPES[type];
  const rows = mat.length, cols = mat[0].length;
  const ox = Math.floor((cw - cols * MINI_BLOCK) / 2);
  const oy = Math.floor((ch - rows * MINI_BLOCK) / 2);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (mat[r][c]) drawBlock(context, ox/MINI_BLOCK+c, oy/MINI_BLOCK+r, COLORS[type], MINI_BLOCK);
}

function drawNext() { drawMiniPiece(nextCtx, nextPiece); }
function drawHold() { drawMiniPiece(holdCtx, holdPiece); }

// ─── 게임 루프 ────────────────────────────────────────────────────────────────
function loop(ts) {
  if (gameOver || paused) return;
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;

  // 화면 흔들림
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    const i = (shakeTimer / 380) * 5;
    canvas.style.transform = `translate(${(Math.random()-.5)*i*2}px,${(Math.random()-.5)*i}px)`;
    if (shakeTimer <= 0) canvas.style.transform = '';
  }

  // 라인 클리어 애니메이션
  if (clearAnimating) {
    clearAnimTimer -= dt;
    if (clearAnimTimer <= 0) { clearAnimating = false; finishClear(); }
    else { drawBoard(); updatePopups(); }
    animId = requestAnimationFrame(loop);
    return;
  }

  // 일반 드롭
  dropTimer += dt;
  const speed = LEVEL_SPEED[Math.min(level - 1, LEVEL_SPEED.length - 1)];
  if (dropTimer >= speed) {
    dropTimer = 0;
    if (piece && !collides(piece, 0, 1)) piece.y++;
    else if (piece) lockPiece();
  }

  drawBoard();
  drawGhost();
  drawPiece();
  updatePopups();

  animId = requestAnimationFrame(loop);
}

// ─── 입력 ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!started || gameOver || clearAnimating) return;
  switch (e.code) {
    case 'ArrowLeft':  e.preventDefault(); moveLeft();    break;
    case 'ArrowRight': e.preventDefault(); moveRight();   break;
    case 'ArrowDown':  e.preventDefault(); softDrop();    break;
    case 'ArrowUp':    e.preventDefault(); rotatePiece(); break;
    case 'Space':      e.preventDefault(); hardDrop();    break;
    case 'KeyC':  holdPieceFn();  break;
    case 'KeyP':  togglePause(); break;
  }
});

// ─── 일시정지 ─────────────────────────────────────────────────────────────────
function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? '계속하기' : '일시정지';
  if (paused) {
    cancelAnimationFrame(animId);
    SoundManager.suspend();
    overlayTitle.textContent = 'PAUSED';
    overlaySub.textContent = 'P 키를 눌러 계속하기';
    btnStart.textContent = '계속하기';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    SoundManager.resumeCtx();
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
}

// ─── 게임 초기화 / 종료 ───────────────────────────────────────────────────────
function initGame() {
  board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  score = 0; level = 1; lines = 0; combo = 0;
  gameOver = false; paused = false;
  holdPiece = null; holdUsed = false;
  dropTimer = 0; lastTime = 0;
  lastRotatedT = false;
  clearAnimating = false; clearingLines = [];
  scorePopups = []; shakeTimer = 0; comboDisplay = null;
  bag = [];
  refillBag();
  nextPiece = nextFromBag();
  spawnPiece();
  updateUI();
  drawHold();
}

function endGame() {
  gameOver = true; started = false;
  clearAnimating = false;
  cancelAnimationFrame(animId);
  canvas.style.transform = '';
  SoundManager.play('gameover');
  SoundManager.stopBGM();
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('tetris_best', bestScore);
  }
  overlayTitle.textContent = 'GAME OVER';
  overlaySub.textContent = `최종 점수: ${score.toLocaleString()}`;
  btnStart.textContent = '다시 시작';
  overlay.classList.remove('hidden');
  updateUI();
}

function updateUI() {
  scoreEl.textContent    = score.toLocaleString();
  levelEl.textContent    = level;
  linesEl.textContent    = lines;
  bestScoreEl.textContent = bestScore.toLocaleString();
}

function flashScore() {
  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');
}

// ─── 버튼 ────────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  SoundManager.init();
  if (paused) { togglePause(); return; }
  startGame();
});

btnPause.addEventListener('click', togglePause);

btnRestart.addEventListener('click', () => {
  SoundManager.init();
  cancelAnimationFrame(animId);
  SoundManager.stopBGM();
  canvas.style.transform = '';
  startGame();
});

function startGame() {
  initGame();
  started = true;
  overlay.classList.add('hidden');
  btnPause.textContent = '일시정지';
  lastTime = performance.now();
  SoundManager.startBGM();
  animId = requestAnimationFrame(loop);
}

// ─── 초기 화면 ────────────────────────────────────────────────────────────────
bestScoreEl.textContent = bestScore.toLocaleString();
overlayTitle.textContent = 'TETRIS';
overlaySub.textContent   = '클래식 블록 퍼즐';
btnStart.textContent     = '게임 시작';

board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
ctx.fillStyle = COLORS.bg;
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawGrid();
nextCtx.fillStyle = '#05050f';
nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
holdCtx.fillStyle = '#05050f';
holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
