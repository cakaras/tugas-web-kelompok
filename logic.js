/* ============================================================
   IKAN DUYUNG PEMBURU ILMU — game.js
   Logika utama game: soal, karakter, ikan, collision, skor
   ============================================================ */

'use strict';

// ============================================================
// DATA SOAL (HTML, CSS, JavaScript)
// ============================================================
const QUESTIONS = [
  {
    q: 'Tag HTML yang digunakan untuk membuat tautan (hyperlink) adalah...',
    correct: '<a>',
    wrong: ['<link>', '<href>']
  },
  {
    q: 'Property CSS untuk mengubah warna teks adalah...',
    correct: 'color',
    wrong: ['font-color', 'text-color']
  },
  {
    q: 'Metode JavaScript untuk menampilkan elemen berdasarkan ID adalah...',
    correct: 'getElementById()',
    wrong: ['getElement()', 'findById()']
  },
  {
    q: 'Tag HTML yang digunakan untuk membuat tabel adalah...',
    correct: '<table>',
    wrong: ['<grid>', '<tbl>']
  },
  {
    q: 'Property CSS untuk membuat elemen menjadi fleksibel (flexbox) adalah...',
    correct: 'display: flex',
    wrong: ['display: grid', 'position: flex']
  },
  {
    q: 'Tipe data JavaScript yang bernilai benar/salah disebut...',
    correct: 'Boolean',
    wrong: ['String', 'Integer']
  },
  {
    q: 'Tag HTML untuk menyisipkan gambar adalah...',
    correct: '<img>',
    wrong: ['<image>', '<pic>']
  },
  {
    q: 'Property CSS untuk mengatur jarak di dalam elemen (dalam border) adalah...',
    correct: 'padding',
    wrong: ['margin', 'spacing']
  },
  {
    q: 'Cara mendeklarasikan variabel dengan nilai tetap (konstanta) di JavaScript modern adalah...',
    correct: 'const',
    wrong: ['var', 'static']
  },
  {
    q: 'Tag HTML yang digunakan untuk judul utama halaman adalah...',
    correct: '<h1>',
    wrong: ['<title>', '<header>']
  }
];

// ============================================================
// KONFIGURASI GAME
// ============================================================
const CONFIG = {
  maxLives:      3,
  scoreCorrect:  10,
  scorePenalty:  5,
  fishSpeed:     5,    // pixel per frame (kecepatan dasar ikan)
  fishSpeedInc:  0.5,   // penambahan kecepatan tiap ronde
  mermaidSpeed:  5,      // pixel per frame gerakan duyung
  fishCount:     3,      // jumlah ikan per ronde
  fishGap:       180,    // jarak horizontal antar ikan (px)
  totalRounds:   QUESTIONS.length
};

// ============================================================
// STATE GAME
// ============================================================
let state = {
  screen:      'title', // 'title' | 'game' | 'gameover'
  score:       0,
  lives:       CONFIG.maxLives,
  round:       0,       // indeks soal saat ini
  fishes:      [],      // array objek ikan aktif
  mermaid:     { x: 0, y: 0, w: 90, h: 90 },
  keys:        { up: false, down: false },
  animId:      null,
  roundActive: true,    // false saat jeda antar ronde
  correct:     0,       // jumlah jawaban benar
  wrong:       0        // jumlah jawaban salah
};

// ============================================================
// REFERENSI DOM
// ============================================================
const screens = {
  title:    document.getElementById('screen-title'),
  game:     document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover')
};

const canvas   = document.getElementById('game-canvas');
const ctx      = canvas.getContext('2d');
const hudScore = document.getElementById('hud-score');
const hudLives = document.getElementById('hud-lives');
const hudRound = document.getElementById('hud-round');
const questionText = document.getElementById('question-text');
const feedbackEl   = document.getElementById('feedback');

// ============================================================
// HELPER: Tampilkan layar tertentu
// ============================================================
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
  state.screen = name;
}

// ============================================================
// HELPER: Buat gelembung dekoratif di background
// ============================================================
function spawnBubbles(containerId, count = 18) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 6 + Math.random() * 24;
    b.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${5 + Math.random() * 10}s;
      animation-delay: ${-Math.random() * 10}s;
      opacity: ${0.2 + Math.random() * 0.5};
    `;
    container.appendChild(b);
  }
}

// ============================================================
// RESIZE CANVAS — selalu isi layar penuh
// ============================================================
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Posisikan duyung di kiri tengah
  state.mermaid.x = 60;
  state.mermaid.y = canvas.height / 2 - state.mermaid.h / 2;
}

// ============================================================
// GAMBAR: Background laut bergradasi + partikel
// ============================================================
function drawBackground() {
  // Gradasi laut
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0,   '#041e3a');
  grad.addColorStop(0.5, '#031428');
  grad.addColorStop(1,   '#020b18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Garis cahaya bawah laut (caustics effect sederhana)
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * canvas.width + Math.sin(Date.now() * 0.0005 + i) * 30;
    const grad2 = ctx.createLinearGradient(x, 0, x + 40, canvas.height);
    grad2.addColorStop(0, 'rgba(0,245,255,0)');
    grad2.addColorStop(0.4, 'rgba(0,245,255,1)');
    grad2.addColorStop(1, 'rgba(0,245,255,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(x, 0, 2, canvas.height);
  }
  ctx.restore();

  // Dasar laut
  ctx.fillStyle = '#031020';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.lineTo(x, canvas.height - 20 - Math.sin(x * 0.04 + Date.now() * 0.001) * 15);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
}

// ============================================================
// GAMBAR: Ikan Duyung (Mermaid)
// ============================================================
function drawMermaid(x, y, w, h) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Ekor duyung
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.28, cy + h * 0.1);
  ctx.quadraticCurveTo(cx - w * 0.55, cy + h * 0.35, cx - w * 0.45, cy + h * 0.48);
  ctx.quadraticCurveTo(cx - w * 0.3,  cy + h * 0.55, cx - w * 0.15, cy + h * 0.35);
  ctx.closePath();
  const tailGrad = ctx.createLinearGradient(cx - w * 0.5, cy, cx, cy);
  tailGrad.addColorStop(0, '#00c9a7');
  tailGrad.addColorStop(1, '#0077b6');
  ctx.fillStyle = tailGrad;
  ctx.fill();

  // Sirip ekor atas
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.28, cy + h * 0.1);
  ctx.quadraticCurveTo(cx - w * 0.6, cy - h * 0.05, cx - w * 0.48, cy + h * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#00f5ff';
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Tubuh duyung
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.05, cy, w * 0.4, h * 0.28, 0, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(cx + w * 0.1, cy - h * 0.05, 0, cx, cy, w * 0.4);
  bodyGrad.addColorStop(0, '#a8e6cf');
  bodyGrad.addColorStop(0.5, '#48cae4');
  bodyGrad.addColorStop(1, '#0077b6');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Kepala
  ctx.beginPath();
  ctx.arc(cx + w * 0.32, cy - h * 0.06, h * 0.22, 0, Math.PI * 2);
  const headGrad = ctx.createRadialGradient(cx + w * 0.35, cy - h * 0.1, 2, cx + w * 0.32, cy - h * 0.06, h * 0.22);
  headGrad.addColorStop(0, '#ffe0b2');
  headGrad.addColorStop(1, '#ffb347');
  ctx.fillStyle = headGrad;
  ctx.fill();

  // Mata
  ctx.beginPath();
  ctx.arc(cx + w * 0.42, cy - h * 0.12, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + w * 0.435, cy - h * 0.135, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Rambut duyung
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.28 + i * 6, cy - h * 0.22);
    ctx.quadraticCurveTo(
      cx + w * 0.2 + i * 4 + Math.sin(Date.now() * 0.003 + i) * 5,
      cy - h * 0.04,
      cx + w * 0.15 + i * 3,
      cy + h * 0.1
    );
    ctx.strokeStyle = `rgba(255, 200, 50, ${0.5 + i * 0.1})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Kilap tubuh
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.12, cy - h * 0.08, w * 0.12, h * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();

  ctx.restore();
}

// ============================================================
// GAMBAR: Satu Ikan dengan label jawaban
// ============================================================
function drawFish(fish) {
  const { x, y, w, h, label, isCorrect, glowAnim } = fish;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();

  // Glow aura di sekitar ikan (berkedip lambat)
  const glowAlpha = 0.15 + Math.sin(glowAnim) * 0.08;
  const glowColor = '255,77,109'; // Warna disamakan (merah/pink)
  ctx.shadowBlur = 25;
  ctx.shadowColor = `rgba(${glowColor},0.6)`;

  // Tubuh ikan (ellipse)
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
  const bodyColor = ctx.createRadialGradient(cx - w * 0.1, cy, 2, cx, cy, w * 0.42);
  bodyColor.addColorStop(0, '#ffaaaa');
  bodyColor.addColorStop(0.6, '#e63946');
  bodyColor.addColorStop(1, '#9d0208');
  ctx.fillStyle = bodyColor;
  ctx.fill();

  // Ekor ikan
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.38, cy);
  ctx.lineTo(cx - w * 0.62, cy - h * 0.28);
  ctx.lineTo(cx - w * 0.62, cy + h * 0.28);
  ctx.closePath();
  ctx.fillStyle = '#ff4d6d'; // Warna disamakan
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Sirip atas
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.1, cy - h * 0.28);
  ctx.quadraticCurveTo(cx, cy - h * 0.5, cx + w * 0.15, cy - h * 0.28);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,77,109,0.5)'; // Warna disamakan
  ctx.fill();

  // Mata
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx + w * 0.28, cy - h * 0.06, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + w * 0.295, cy - h * 0.075, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Kilap
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.05, cy - h * 0.08, w * 0.1, h * 0.06, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  ctx.restore();

  // ---- Label jawaban ----
  ctx.save();
  // Kotak label
  const padding  = 10;
  const fontSize = Math.min(13, w * 0.18);
  ctx.font = `600 ${fontSize}px 'Exo 2', sans-serif`;
  const textW = ctx.measureText(label).width;
  const boxW  = textW + padding * 2;
  const boxH  = 24;
  const bx    = cx - boxW / 2;
  const by    = cy + h * 0.38;

  ctx.fillStyle = 'rgba(2,11,24,0.85)';
  ctx.strokeStyle = 'rgba(255,77,109,0.4)'; // Warna disamakan
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff8fa3'; // Warna teks disamakan
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, by + boxH / 2);
  ctx.restore();
}

// ============================================================
// INISIALISASI RONDE BARU
// ============================================================
function startRound() {
  if (state.round >= CONFIG.totalRounds) {
    endGame();
    return;
  }

  state.roundActive = true;
  const q = QUESTIONS[state.round];

  // Tampilkan soal
  questionText.textContent = q.q;
  hudRound.textContent     = `${state.round + 1}/${CONFIG.totalRounds}`;

  // Buat array jawaban: 1 benar + 2 salah, lalu acak urutan
  const answers = [
    { label: q.correct, isCorrect: true },
    { label: q.wrong[0], isCorrect: false },
    { label: q.wrong[1], isCorrect: false }
  ].sort(() => Math.random() - 0.5);

  // Kecepatan meningkat setiap ronde
  const speed = CONFIG.fishSpeed + state.round * CONFIG.fishSpeedInc;

  // Posisi Y ketiga ikan (distribusi merata secara vertikal)
  const topPad    = 170;   // hindari HUD & papan soal
  const botPad    = 80;    // hindari dasar
  const availH    = canvas.height - topPad - botPad;
  const sectionH  = availH / CONFIG.fishCount;
  const fw = 130, fh = 65;

  state.fishes = answers.map((ans, i) => ({
    x:         canvas.width + i * CONFIG.fishGap + 50, // mulai dari luar layar kanan
    y:         topPad + sectionH * i + sectionH / 2 - fh / 2,
    w:         fw,
    h:         fh,
    label:     ans.label,
    isCorrect: ans.isCorrect,
    speed:     speed + i * 0.2,  // sedikit variasi kecepatan
    glowAnim:  Math.random() * Math.PI * 2,
    eaten:     false
  }));
}

// ============================================================
// UPDATE: Gerakan & Logika Per Frame
// ============================================================
function update() {
  // Gerakkan duyung (naik / turun)
  const m = state.mermaid;
  if (state.keys.up   && m.y > 100)                      m.y -= CONFIG.mermaidSpeed;
  if (state.keys.down && m.y < canvas.height - m.h - 30) m.y += CONFIG.mermaidSpeed;

  if (!state.roundActive) return;

  // Update posisi & animasi ikan
  let allGone = true;
  state.fishes.forEach(fish => {
    if (fish.eaten) return;
    fish.x        -= fish.speed;
    fish.glowAnim += 0.05;

    if (fish.x + fish.w > -50) allGone = false; // masih ada ikan di layar

    // Deteksi tabrakan (collision detection) dengan duyung
    if (!fish.eaten && checkCollision(m, fish)) {
      fish.eaten = true;
      handleEat(fish);
    }
  });

  // Jika semua ikan sudah lewat layar tanpa dimakan → ronde gagal
  if (allGone) {
    // Tandai ronde selesai, lanjut ke soal berikutnya
    state.round++;
    setTimeout(startRound, 400);
  }
}

// ============================================================
// COLLISION DETECTION (AABB sederhana)
// ============================================================
function checkCollision(a, b) {
  const ax = a.x + 20, ay = a.y + 15; // offset agar lebih akurat
  const aw = a.w - 30, ah = a.h - 25;
  const bx = b.x + 15, by = b.y + 10;
  const bw = b.w - 20, bh = b.h - 15;

  return ax < bx + bw &&
         ax + aw > bx &&
         ay < by + bh &&
         ay + ah > by;
}

// ============================================================
// HANDLE: Efek setelah memakan ikan
// ============================================================
function handleEat(fish) {
  state.roundActive = false; // jeda sebentar

  if (fish.isCorrect) {
    // ---- BENAR ----
    state.score  += CONFIG.scoreCorrect;
    state.correct++;
    showFeedback('✓ BENAR!', true);
    hudScore.textContent = state.score;
  } else {
    // ---- SALAH ----
    state.score = Math.max(0, state.score - CONFIG.scorePenalty);
    state.lives--;
    state.wrong++;
    showFeedback('✗ SALAH!', false);
    hudScore.textContent = state.score;
    updateLivesHUD();
    shakeScreen();

    if (state.lives <= 0) {
      setTimeout(endGame, 900);
      return;
    }
  }

  // Lanjut ke ronde berikutnya
  state.round++;
  setTimeout(startRound, 900);
}

// ============================================================
// UI: Feedback Teks (benar/salah)
// ============================================================
function showFeedback(text, correct) {
  feedbackEl.textContent = text;
  feedbackEl.className   = 'feedback'; // reset
  feedbackEl.classList.remove('hidden');
  // Trigger reflow agar animasi bisa di-restart
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add(correct ? 'show-correct' : 'show-wrong');
  setTimeout(() => feedbackEl.classList.add('hidden'), 900);
}

// ============================================================
// UI: Update tampilan nyawa
// ============================================================
function updateLivesHUD() {
  const hearts = ['❤️', '❤️', '❤️'];
  for (let i = state.lives; i < CONFIG.maxLives; i++) hearts[i] = '🖤';
  hudLives.textContent = hearts.join(' ');
}

// ============================================================
// UI: Efek guncangan layar saat salah
// ============================================================
function shakeScreen() {
  const gameEl = screens.game;
  gameEl.classList.remove('shake');
  void gameEl.offsetWidth;
  gameEl.classList.add('shake');
  setTimeout(() => gameEl.classList.remove('shake'), 400);
}

// ============================================================
// RENDER: Gambar semua elemen ke canvas
// ============================================================
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  // Gambar ikan
  state.fishes.forEach(fish => {
    if (!fish.eaten) drawFish(fish);
  });

  // Gambar duyung
  const m = state.mermaid;
  drawMermaid(m.x, m.y, m.w, m.h);
}

// ============================================================
// GAME LOOP UTAMA
// ============================================================
function gameLoop() {
  update();
  render();
  state.animId = requestAnimationFrame(gameLoop);
}

// ============================================================
// MULAI GAME
// ============================================================
function startGame() {
  // Reset state
  state.score       = 0;
  state.lives       = CONFIG.maxLives;
  state.round       = 0;
  state.fishes      = [];
  state.roundActive = true;
  state.correct     = 0;
  state.wrong       = 0;

  // Reset HUD
  hudScore.textContent = '0';
  hudRound.textContent = `1/${CONFIG.totalRounds}`;
  updateLivesHUD();

  // Resize dan posisikan canvas
  resizeCanvas();

  // Tampilkan layar game
  showScreen('game');

  // Mulai ronde pertama
  startRound();

  // Mulai loop
  if (state.animId) cancelAnimationFrame(state.animId);
  gameLoop();
}

// ============================================================
// AKHIRI GAME
// ============================================================
function endGame() {
  if (state.animId) cancelAnimationFrame(state.animId);

  // Tentukan kategori hasil
  let category, icon;
  if (state.score <= 50) {
    category = '🐠 Lumayan';
    icon = '🐟';
  } else if (state.score <= 70) {
    category = '🐬 Hebat!';
    icon = '🐬';
  } else {
    category = '🦈 Master!';
    icon = '🏆';
  }

  // Update layar game over
  document.getElementById('gameover-icon').textContent     = icon;
  document.getElementById('gameover-title').textContent    = 'Permainan Selesai!';
  document.getElementById('gameover-category').textContent = category;
  document.getElementById('final-score').textContent       = state.score;

  // Stats
  const statsEl = document.getElementById('gameover-stats');
  statsEl.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${state.correct}</div>
      <div class="stat-label">Jawaban Benar</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${state.wrong}</div>
      <div class="stat-label">Jawaban Salah</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${state.round}</div>
      <div class="stat-label">Soal Dijawab</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${CONFIG.maxLives - state.lives}</div>
      <div class="stat-label">Nyawa Hilang</div>
    </div>
  `;

  spawnBubbles('bubbles-gameover');
  showScreen('gameover');
}

// ============================================================
// INPUT: Keyboard
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') state.keys.up   = true;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = true;
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') state.keys.up   = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = false;
});

// ============================================================
// INPUT: Touch / Mobile (swipe naik-turun)
// ============================================================
let touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (state.screen !== 'game') return;
  const dy = e.touches[0].clientY - touchStartY;
  state.keys.up   = dy < -10;
  state.keys.down = dy > 10;
}, { passive: true });

document.addEventListener('touchend', () => {
  state.keys.up   = false;
  state.keys.down = false;
});

// ============================================================
// EVENT: Tombol-tombol UI
// ============================================================
document.getElementById('btn-start').addEventListener('click', startGame);

document.getElementById('btn-restart').addEventListener('click', startGame);

document.getElementById('btn-menu').addEventListener('click', () => {
  if (state.animId) cancelAnimationFrame(state.animId);
  showScreen('title');
});

// ============================================================
// EVENT: Resize window
// ============================================================
window.addEventListener('resize', () => {
  if (state.screen === 'game') resizeCanvas();
});

// ============================================================
// INIT: Jalankan gelembung di layar judul saat halaman load
// ============================================================
spawnBubbles('bubbles-title');