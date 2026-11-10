/**
 * NEON CARNIVAL // PLAYABLE ARCADE MINI-GAMES ENGINE
 * Real playable implementations for all 7 catalog cabinets:
 * Pinball Bounce, Mystery Box, Coin Drop, Cyber Claw 3000,
 * Neon Skee-Ball, Ring Toss Blitz, and Laser Duck Alley.
 */

const MiniGamesArcade = {
  currentGame: null,
  isOpen: false,
  isRoundActive: false,
  rafId: null,
  intervals: [],
  timeouts: [],
  cleanupFns: [],

  // DOM References
  modal: null,
  canvas: null,
  ctx: null,
  domStage: null,
  controlsBar: null,
  overlay: null,

  init() {
    this.modal = document.getElementById('arcade-cabinet-modal');
    this.canvas = document.getElementById('arcade-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.domStage = document.getElementById('arcade-dom-stage');
    this.controlsBar = document.getElementById('arcade-controls-bar');
    this.overlay = document.getElementById('arcade-stage-overlay');

    document.getElementById('btn-close-cabinet')?.addEventListener('click', () => this.close());
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.getElementById('btn-cabinet-start')?.addEventListener('click', () => {
      this.startRound();
    });

    document.getElementById('btn-cabinet-back')?.addEventListener('click', () => {
      this.close();
    });
  },

  open(game) {
    if (!this.modal || !game) return;
    this.clearRuntime();
    this.currentGame = game;
    this.isOpen = true;
    this.isRoundActive = false;

    // Populate Cabinet Header
    document.getElementById('cabinet-icon').textContent = game.icon;
    document.getElementById('cabinet-title').textContent = game.title;
    document.getElementById('cabinet-badge').textContent = game.badge;
    document.getElementById('cabinet-cost-pill').textContent = `${game.tokenCost} Tokens / Round`;

    // Reset HUD
    this.setHud({ scoreLabel: 'Tickets Won', scoreVal: '0', infoLabel: 'Status', infoVal: 'Ready' });

    // Show Start Overlay
    this.showOverlay({
      title: game.title.toUpperCase(),
      subtitle: game.description,
      rewardText: '',
      btnText: `INSERT ${game.tokenCost} TOKENS & PLAY`,
      showBack: false
    });

    // Render idle preview frame for the selected game
    this.prepareGameIdleView(game.id);

    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
  },

  close() {
    if (!this.modal) return;
    this.clearRuntime();
    this.isOpen = false;
    this.isRoundActive = false;
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
  },

  clearRuntime() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.intervals.forEach((id) => clearInterval(id));
    this.timeouts.forEach((id) => clearTimeout(id));
    this.intervals = [];
    this.timeouts = [];
    this.cleanupFns.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    this.cleanupFns = [];
    if (this.controlsBar) this.controlsBar.innerHTML = '';
  },

  setHud({ scoreLabel, scoreVal, infoLabel, infoVal }) {
    if (scoreLabel !== undefined) document.getElementById('cabinet-hud-score-label').textContent = scoreLabel;
    if (scoreVal !== undefined) document.getElementById('cabinet-hud-score').textContent = scoreVal;
    if (infoLabel !== undefined) document.getElementById('cabinet-hud-info-label').textContent = infoLabel;
    if (infoVal !== undefined) document.getElementById('cabinet-hud-info').textContent = infoVal;
  },

  showOverlay({ title, subtitle, rewardText, btnText, showBack = false }) {
    if (!this.overlay) return;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-subtitle').textContent = subtitle;
    const rewardBox = document.getElementById('overlay-reward-box');
    const rewardVal = document.getElementById('overlay-reward-val');
    if (rewardText) {
      rewardBox.classList.remove('hidden');
      rewardVal.textContent = rewardText;
    } else {
      rewardBox.classList.add('hidden');
    }
    document.getElementById('btn-cabinet-start').textContent = btnText;
    const backBtn = document.getElementById('btn-cabinet-back');
    if (showBack) backBtn.classList.remove('hidden');
    else backBtn.classList.add('hidden');

    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');
  },

  hideOverlay() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
  },

  useCanvasMode(w, h) {
    if (this.domStage) {
      this.domStage.classList.add('hidden');
      this.domStage.innerHTML = '';
    }
    if (this.canvas) {
      this.canvas.classList.remove('hidden');
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.aspectRatio = `${w} / ${h}`;
    }
  },

  useDomMode() {
    if (this.canvas) this.canvas.classList.add('hidden');
    if (this.domStage) this.domStage.classList.remove('hidden');
  },

  prepareGameIdleView(gameId) {
    if (gameId === 'mystery-box') {
      this.useDomMode();
      this.domStage.innerHTML = `
        <div class="grid grid-cols-3 gap-3 sm:gap-4 p-4 w-full max-w-md mx-auto">
          ${Array.from({ length: 6 })
            .map(
              (_, i) => `
            <div class="aspect-square rounded-2xl bg-slate-900/90 border border-purple-500/40 flex flex-col items-center justify-center gap-1 glow-purple">
              <span class="text-3xl sm:text-4xl">🎁</span>
              <span class="font-mono-num text-[10px] text-purple-300 font-bold">VAULT #${i + 1}</span>
            </div>`
            )
            .join('')}
        </div>`;
      return;
    }

    // Draw nice background grid for canvas games while waiting to start
    const dims = {
      'pinball-bounce': [420, 500],
      'coin-drop': [440, 480],
      'cyber-claw': [440, 460],
      'neon-skeeball': [400, 500],
      'ring-toss': [440, 460],
      'laser-duck': [460, 420]
    }[gameId] || [440, 460];

    this.useCanvasMode(dims[0], dims[1]);
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, dims[0], dims[1]);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < dims[0]; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims[1]); ctx.stroke();
    }
    for (let y = 0; y < dims[1]; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dims[0], y); ctx.stroke();
    }
  },

  startRound() {
    const game = this.currentGame;
    if (!game) return;

    if (ArcadeState.tokens < game.tokenCost) {
      ArcadeAudio.playError();
      showToast('Token tidak cukup! Klik "+FREE" di bar atas untuk isi ulang +250 Token.', 'amber');
      return;
    }

    this.clearRuntime();
    ArcadeAudio.playCoinInsert();
    updateBalances(-game.tokenCost, 0);
    this.isRoundActive = true;
    this.hideOverlay();

    switch (game.id) {
      case 'pinball-bounce':
        this.runPinball();
        break;
      case 'mystery-box':
        this.runMysteryBox();
        break;
      case 'coin-drop':
        this.runCoinDrop();
        break;
      case 'cyber-claw':
        this.runCyberClaw();
        break;
      case 'neon-skeeball':
        this.runSkeeBall();
        break;
      case 'ring-toss':
        this.runRingToss();
        break;
      case 'laser-duck':
        this.runLaserDuck();
        break;
    }
  },

  finishRound(ticketsWon, summaryTitle, summaryDetail) {
    if (!this.isOpen) return;
    this.isRoundActive = false;
    this.clearRuntime();

    const finalTickets = Math.max(0, Math.round(ticketsWon));
    if (finalTickets > 0) {
      updateBalances(0, finalTickets);
      const isBig = finalTickets >= 150;
      ArcadeAudio.playWinFanfare(isBig);
      ConfettiEngine.burst(isBig ? 140 : 60);
      addNotification(
        `${this.currentGame.title}: +${finalTickets.toLocaleString()} Tickets!`,
        summaryDetail,
        isBig ? 'amber' : 'cyan'
      );
    } else {
      ArcadeAudio.playClick();
    }

    this.showOverlay({
      title: summaryTitle,
      subtitle: summaryDetail,
      rewardText: `+${finalTickets.toLocaleString()} PRIZE TICKETS`,
      btnText: `PLAY AGAIN (${this.currentGame.tokenCost} TOKENS)`,
      showBack: true
    });
  },

  // ==================== GAME 1: PINBALL BOUNCE ====================
  runPinball() {
    const W = 420, H = 500;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let ballsLeft = 3;
    let tickets = 0;
    let combo = 1;
    let ballActive = false;

    const ball = { x: 210, y: 70, vx: 0, vy: 0, r: 10 };
    const bumpers = [
      { x: 130, y: 145, r: 24, pts: 15, color: '#22d3ee', flash: 0 },
      { x: 290, y: 145, r: 24, pts: 15, color: '#22d3ee', flash: 0 },
      { x: 210, y: 195, r: 28, pts: 30, color: '#fbbf24', flash: 0 },
      { x: 145, y: 270, r: 20, pts: 20, color: '#c084fc', flash: 0 },
      { x: 275, y: 270, r: 20, pts: 20, color: '#c084fc', flash: 0 }
    ];

    const leftFlipper = { px: 118, py: 448, len: 74, restAngle: 0.45, activeAngle: -0.45, angle: 0.45, pressed: false };
    const rightFlipper = { px: 302, py: 448, len: 74, restAngle: Math.PI - 0.45, activeAngle: Math.PI + 0.45, angle: Math.PI - 0.45, pressed: false };
    const sparks = [];

    const updateHud = () => {
      this.setHud({
        scoreLabel: `Tickets (${combo}x)`,
        scoreVal: tickets.toLocaleString(),
        infoLabel: 'Balls Left',
        infoVal: '●'.repeat(ballsLeft) + '○'.repeat(3 - ballsLeft)
      });
    };
    updateHud();

    const launchBall = () => {
      if (ballActive || ballsLeft <= 0) return;
      ballActive = true;
      ball.x = 185 + Math.random() * 50;
      ball.y = 48;
      ball.vx = (Math.random() - 0.5) * 4.5;
      ball.vy = 1.5;
      combo = 1;
      ArcadeAudio.playLaser();
      updateHud();
    };

    // Controls Bar (Mobile + Hint)
    this.controlsBar.innerHTML = `
      <div class="flex items-center justify-between gap-2 w-full">
        <button id="pb-left" class="flex-1 py-3 rounded-xl bg-slate-900 active:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-display font-bold text-xs uppercase select-none">◀ Left (A / ←)</button>
        <button id="pb-launch" class="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-xs uppercase select-none">Launch (Space)</button>
        <button id="pb-right" class="flex-1 py-3 rounded-xl bg-slate-900 active:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-display font-bold text-xs uppercase select-none">Right (D / →) ▶</button>
      </div>
    `;

    const bindHold = (el, onDown, onUp) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointerleave', onUp);
      el.addEventListener('pointercancel', onUp);
    };

    bindHold(document.getElementById('pb-left'), () => (leftFlipper.pressed = true), () => (leftFlipper.pressed = false));
    bindHold(document.getElementById('pb-right'), () => (rightFlipper.pressed = true), () => (rightFlipper.pressed = false));
    document.getElementById('pb-launch')?.addEventListener('click', launchBall);

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); leftFlipper.pressed = true; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); rightFlipper.pressed = true; }
      if (e.code === 'Space') { e.preventDefault(); launchBall(); }
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftFlipper.pressed = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightFlipper.pressed = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.cleanupFns.push(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });

    const collideSegment = (x1, y1, x2, y2, boost = 0) => {
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + t * dx, cy = y1 + t * dy;
      const distX = ball.x - cx, distY = ball.y - cy;
      const dist = Math.hypot(distX, distY);
      const minDist = ball.r + 5;
      if (dist < minDist && dist > 0.0001) {
        const nx = distX / dist, ny = distY / dist;
        ball.x = cx + nx * minDist;
        ball.y = cy + ny * minDist;
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx -= 1.82 * dot * nx;
          ball.vy -= 1.82 * dot * ny;
          if (boost > 0) {
            ball.vx += nx * boost * t;
            ball.vy += ny * boost * t;
            ArcadeAudio.playBounce();
          }
        }
      }
    };

    // Auto-launch first ball after 350ms
    const tId = setTimeout(launchBall, 350);
    this.timeouts.push(tId);

    const loop = () => {
      if (!this.isRoundActive) return;

      // Update flippers
      const prevL = leftFlipper.angle;
      const prevR = rightFlipper.angle;
      leftFlipper.angle += ((leftFlipper.pressed ? leftFlipper.activeAngle : leftFlipper.restAngle) - leftFlipper.angle) * 0.42;
      rightFlipper.angle += ((rightFlipper.pressed ? rightFlipper.activeAngle : rightFlipper.restAngle) - rightFlipper.angle) * 0.42;
      const lVel = Math.abs(leftFlipper.angle - prevL);
      const rVel = Math.abs(rightFlipper.angle - prevR);

      if (ballActive) {
        for (let step = 0; step < 3; step++) {
          ball.vy += 0.075; // gravity per substep
          ball.vx *= 0.999;
          ball.vy *= 0.999;
          ball.x += ball.vx / 3;
          ball.y += ball.vy / 3;

          // Walls
          if (ball.x - ball.r < 18) { ball.x = 18 + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
          if (ball.x + ball.r > W - 18) { ball.x = W - 18 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
          if (ball.y - ball.r < 18) { ball.y = 18 + ball.r; ball.vy = Math.abs(ball.vy) * 0.85; }

          // Angled corner walls & slingshots
          collideSegment(18, 80, 75, 18);
          collideSegment(W - 18, 80, W - 75, 18);
          collideSegment(18, 395, 118, 448);
          collideSegment(W - 18, 395, 302, 448);

          // Flippers
          const lx2 = leftFlipper.px + Math.cos(leftFlipper.angle) * leftFlipper.len;
          const ly2 = leftFlipper.py + Math.sin(leftFlipper.angle) * leftFlipper.len;
          collideSegment(leftFlipper.px, leftFlipper.py, lx2, ly2, leftFlipper.pressed && lVel > 0.02 ? 9.5 : 0.6);

          const rx2 = rightFlipper.px + Math.cos(rightFlipper.angle) * rightFlipper.len;
          const ry2 = rightFlipper.py + Math.sin(rightFlipper.angle) * rightFlipper.len;
          collideSegment(rightFlipper.px, rightFlipper.py, rx2, ry2, rightFlipper.pressed && rVel > 0.02 ? 9.5 : 0.6);

          // Bumpers
          for (const b of bumpers) {
            const dx = ball.x - b.x, dy = ball.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ball.r + b.r && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              ball.x = b.x + nx * (ball.r + b.r + 1);
              ball.y = b.y + ny * (ball.r + b.r + 1);
              ball.vx = nx * 7.2;
              ball.vy = ny * 7.2;
              b.flash = 1;
              const earned = b.pts * combo;
              tickets += earned;
              combo = Math.min(4, combo + 1);
              ArcadeAudio.playBounce();
              updateHud();
              for (let s = 0; s < 8; s++) {
                sparks.push({ x: b.x + nx * b.r, y: b.y + ny * b.r, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 1, color: b.color });
              }
            }
          }
        }

        // Speed clamp
        const spd = Math.hypot(ball.vx, ball.vy);
        if (spd > 13) { ball.vx = (ball.vx / spd) * 13; ball.vy = (ball.vy / spd) * 13; }

        // Drain check
        if (ball.y > H + 20) {
          ballActive = false;
          ballsLeft -= 1;
          ArcadeAudio.playError();
          updateHud();
          if (ballsLeft <= 0) {
            this.finishRound(tickets, 'PINBALL ROUND COMPLETE!', `Kamu mengumpulkan ${tickets.toLocaleString()} Prize Tickets dari pantulan bumper neon!`);
            return;
          }
        }
      }

      // Render Table
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Subtle Grid
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Table Borders & Guides
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(18, 395); ctx.lineTo(18, 80); ctx.lineTo(75, 18);
      ctx.lineTo(W - 75, 18); ctx.lineTo(W - 18, 80); ctx.lineTo(W - 18, 395);
      ctx.stroke();

      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(18, 395); ctx.lineTo(118, 448);
      ctx.moveTo(W - 18, 395); ctx.lineTo(302, 448);
      ctx.stroke();

      // Draw Bumpers
      for (const b of bumpers) {
        if (b.flash > 0) b.flash = Math.max(0, b.flash - 0.08);
        const rad = b.r + b.flash * 6;
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = b.flash > 0.2 ? b.color : '#0f172a';
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14 + b.flash * 16;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = b.color;
        ctx.stroke();
        ctx.fillStyle = b.flash > 0.2 ? '#070913' : '#ffffff';
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${b.pts}`, b.x, b.y);
        ctx.restore();
      }

      // Draw Flippers
      const drawFlipper = (f, color) => {
        const x2 = f.px + Math.cos(f.angle) * f.len;
        const y2 = f.py + Math.sin(f.angle) * f.len;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(f.px, f.py);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(f.px, f.py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawFlipper(leftFlipper, '#22d3ee');
      drawFlipper(rightFlipper, '#c084fc');

      // Draw Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.life -= 0.06;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 4, 4);
        ctx.globalAlpha = 1;
      }

      // Draw Ball or Prompt
      if (ballActive) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 2, ball.x, ball.y, ball.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#67e8f9');
        g.addColorStop(1, '#0284c7');
        ctx.fillStyle = g;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.font = 'bold 14px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE OR LAUNCH BUTTON!', W / 2, 355);
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  },

  // ==================== GAME 2: MYSTERY BOX ====================
  runMysteryBox() {
    this.useDomMode();
    let picksLeft = 3;
    let totalTickets = 0;
    let multiplierBonus = false;
    let finished = false;

    const prizePool = [
      { label: '500 TIX', sub: 'MEGA KEY', value: 500, type: 'jackpot', icon: '👑', color: 'border-amber-400 bg-amber-500/20 text-amber-300 glow-amber' },
      { label: '2x BOOST', sub: 'DOUBLE ALL', value: 0, type: 'mult', icon: '⚡', color: 'border-purple-400 bg-purple-500/20 text-purple-300 glow-purple' },
      { label: '200 TIX', sub: 'RARE GEM', value: 200, type: 'high', icon: '💎', color: 'border-cyan-400 bg-cyan-500/20 text-cyan-300 glow-cyan' },
      { label: '120 TIX', sub: 'NEON CORE', value: 120, type: 'mid', icon: '🔮', color: 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200' },
      { label: '75 TIX', sub: 'STAR CHIP', value: 75, type: 'low', icon: '⭐', color: 'border-slate-500 bg-slate-800/80 text-slate-200' },
      { label: '40 TIX', sub: 'MINI PACK', value: 40, type: 'low', icon: '🎟️', color: 'border-slate-600 bg-slate-800/70 text-slate-300' }
    ].sort(() => Math.random() - 0.5);

    const opened = new Array(6).fill(false);

    const updateHud = () => {
      this.setHud({
        scoreLabel: multiplierBonus ? 'Tickets (2x!)' : 'Tickets Found',
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Picks Left',
        infoVal: `${picksLeft} / 3`
      });
    };
    updateHud();

    this.controlsBar.innerHTML = `<p class="text-xs text-center text-cyan-300 font-semibold">Pilih 3 dari 6 Holo-Vault Box untuk membuka hadiah tersembunyi!</p>`;

    const renderBoxes = () => {
      this.domStage.innerHTML = `
        <div class="grid grid-cols-3 gap-3 sm:gap-4 p-4 w-full max-w-md mx-auto">
          ${prizePool
            .map((p, i) => {
              if (opened[i]) {
                return `
                  <div class="aspect-square rounded-2xl border-2 ${p.color} flex flex-col items-center justify-center p-2 text-center animate-[bumpScale_0.35s_ease]">
                    <span class="text-2xl sm:text-3xl mb-1">${p.icon}</span>
                    <span class="font-display font-black text-xs sm:text-sm">${p.label}</span>
                    <span class="text-[9px] uppercase tracking-wider opacity-85">${p.sub}</span>
                  </div>`;
              }
              return `
                <button data-box-idx="${i}" ${finished ? 'disabled' : ''} class="mystery-crate aspect-square rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-purple-500/40 hover:border-cyan-400 flex flex-col items-center justify-center gap-1.5 transition-all hover:-translate-y-1 active:scale-95 glow-purple cursor-pointer">
                  <span class="text-3xl sm:text-4xl">🎁</span>
                  <span class="font-mono-num text-[10px] text-cyan-300 font-bold">OPEN #${i + 1}</span>
                </button>`;
            })
            .join('')}
        </div>`;

      if (!finished) {
        this.domStage.querySelectorAll('.mystery-crate').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (finished || picksLeft <= 0) return;
            const idx = parseInt(btn.getAttribute('data-box-idx'), 10);
            if (opened[idx]) return;

            opened[idx] = true;
            picksLeft -= 1;
            const prize = prizePool[idx];

            if (prize.type === 'mult') {
              multiplierBonus = true;
              totalTickets = totalTickets > 0 ? totalTickets * 2 : 100;
              ArcadeAudio.playWinFanfare(true);
            } else {
              const added = multiplierBonus ? prize.value * 2 : prize.value;
              totalTickets += added;
              ArcadeAudio.playCoinInsert();
            }

            updateHud();
            renderBoxes();

            if (picksLeft <= 0) {
              finished = true;
              // Reveal all remaining crates after a brief pause
              const t1 = setTimeout(() => {
                for (let k = 0; k < 6; k++) opened[k] = true;
                renderBoxes();
              }, 450);
              const t2 = setTimeout(() => {
                this.finishRound(
                  totalTickets,
                  'MYSTERY VAULTS UNLOCKED!',
                  `Kamu membuka 3 crate dan membawa pulang ${totalTickets.toLocaleString()} Prize Tickets!`
                );
              }, 1450);
              this.timeouts.push(t1, t2);
            }
          });
        });
      }
    };

    renderBoxes();
  },

  // ==================== GAME 3: COIN DROP (PLINKO) ====================
  runCoinDrop() {
    const W = 440, H = 480;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let coinsLeft = 5;
    let totalTickets = 0;
    let dropperX = W / 2;
    const activeCoins = [];
    const pegs = [];
    const slotValues = [15, 40, 80, 300, 80, 40, 15];
    const slotFlashes = new Array(7).fill(0);

    // Build staggered pegboard
    const rows = 8;
    const startY = 90;
    const rowGap = 40;
    const colGap = 48;
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? 7 : 8;
      const offsetX = (W - (cols - 1) * colGap) / 2;
      for (let c = 0; c < cols; c++) {
        pegs.push({ x: offsetX + c * colGap, y: startY + r * rowGap, r: 5, flash: 0 });
      }
    }

    const updateHud = () => {
      this.setHud({
        scoreLabel: 'Tickets Won',
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Coins Left',
        infoVal: `${coinsLeft} Coins`
      });
    };
    updateHud();

    const dropCoin = () => {
      if (coinsLeft <= 0) return;
      coinsLeft -= 1;
      activeCoins.push({
        x: dropperX + (Math.random() - 0.5) * 4,
        y: 38,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 1.5,
        r: 9
      });
      ArcadeAudio.playClick();
      updateHud();
    };

    this.controlsBar.innerHTML = `
      <div class="flex items-center justify-between gap-2 w-full">
        <span class="text-xs text-slate-300">Geser koin di papan &amp; klik/tap untuk menjatuhkan!</span>
        <button id="cd-drop-btn" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-xs uppercase shrink-0">Drop Coin (Space)</button>
      </div>
    `;
    document.getElementById('cd-drop-btn')?.addEventListener('click', dropCoin);

    const onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      dropperX = Math.max(40, Math.min(W - 40, relX));
    };
    const onCanvasClick = (e) => {
      onPointerMove(e);
      dropCoin();
    };
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') dropperX = Math.max(40, dropperX - 22);
      if (e.key === 'ArrowRight' || e.key === 'd') dropperX = Math.min(W - 40, dropperX + 22);
      if (e.code === 'Space') { e.preventDefault(); dropCoin(); }
    };

    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('click', onCanvasClick);
    window.addEventListener('keydown', onKeyDown);
    this.cleanupFns.push(() => {
      this.canvas.removeEventListener('pointermove', onPointerMove);
      this.canvas.removeEventListener('click', onCanvasClick);
      window.removeEventListener('keydown', onKeyDown);
    });

    const slotWidth = (W - 28) / 7;

    const loop = () => {
      if (!this.isRoundActive) return;

      for (let i = activeCoins.length - 1; i >= 0; i--) {
        const c = activeCoins[i];
        c.vy += 0.25;
        c.vx *= 0.992;
        c.x += c.vx;
        c.y += c.vy;

        if (c.x - c.r < 14) { c.x = 14 + c.r; c.vx = Math.abs(c.vx) * 0.7; }
        if (c.x + c.r > W - 14) { c.x = W - 14 - c.r; c.vx = -Math.abs(c.vx) * 0.7; }

        for (const p of pegs) {
          const dx = c.x - p.x, dy = c.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < c.r + p.r && dist > 0.001) {
            const nx = dx / dist, ny = dy / dist;
            c.x = p.x + nx * (c.r + p.r + 0.5);
            c.y = p.y + ny * (c.r + p.r + 0.5);
            const dot = c.vx * nx + c.vy * ny;
            if (dot < 0) {
              c.vx -= 1.65 * dot * nx;
              c.vy -= 1.65 * dot * ny;
              c.vx += (Math.random() - 0.5) * 0.9;
              p.flash = 1;
              ArcadeAudio.playTick(0.6);
            }
          }
        }

        // Landed in bottom bucket
        if (c.y >= H - 44) {
          const slotIdx = Math.max(0, Math.min(6, Math.floor((c.x - 14) / slotWidth)));
          const won = slotValues[slotIdx];
          totalTickets += won;
          slotFlashes[slotIdx] = 1;
          ArcadeAudio.playCoinInsert();
          activeCoins.splice(i, 1);
          updateHud();

          if (coinsLeft === 0 && activeCoins.length === 0) {
            const t = setTimeout(() => {
              this.finishRound(totalTickets, 'COIN DROP COMPLETE!', `5 koin mendarat dengan total ${totalTickets.toLocaleString()} Prize Tickets!`);
            }, 450);
            this.timeouts.push(t);
          }
        }
      }

      // Draw Board
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Top Rail & Dropper
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(W - 24, 24); ctx.stroke();

      if (coinsLeft > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(dropperX, 34, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      }

      // Draw Pegs
      for (const p of pegs) {
        if (p.flash > 0) p.flash = Math.max(0, p.flash - 0.08);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + p.flash * 2, 0, Math.PI * 2);
        ctx.fillStyle = p.flash > 0.2 ? '#fbbf24' : '#22d3ee';
        ctx.fill();
      }

      // Draw Bottom Prize Slots
      for (let s = 0; s < 7; s++) {
        if (slotFlashes[s] > 0) slotFlashes[s] = Math.max(0, slotFlashes[s] - 0.05);
        const sx = 14 + s * slotWidth;
        const isCenter = s === 3;
        ctx.fillStyle = slotFlashes[s] > 0.1
          ? 'rgba(251, 191, 36, 0.45)'
          : isCenter
          ? 'rgba(251, 191, 36, 0.18)'
          : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = isCenter ? '#fbbf24' : '#334155';
        ctx.lineWidth = 2;
        ctx.fillRect(sx + 2, H - 50, slotWidth - 4, 42);
        ctx.strokeRect(sx + 2, H - 50, slotWidth - 4, 42);

        ctx.fillStyle = isCenter ? '#fde047' : '#67e8f9';
        ctx.font = 'bold 13px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slotValues[s], sx + slotWidth / 2, H - 25);
      }

      // Draw Falling Coins
      for (const c of activeCoins) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fffbeb';
        ctx.stroke();
        ctx.restore();
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  },

  // ==================== GAME 4: CYBER CLAW 3000 ====================
  runCyberClaw() {
    const W = 440, H = 460;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let triesLeft = 3;
    let totalTickets = 0;
    let clawX = 220;
    let clawY = 72;
    let clawState = 'idle'; // idle | down | grab | up | deliver
    let moveDir = 0;
    let grabbedCap = null;
    let openAmount = 1; // 1 open, 0 closed

    const capsules = [
      { x: 130, y: 398, r: 21, val: 50, color: '#22d3ee', icon: '💠' },
      { x: 182, y: 405, r: 20, val: 80, color: '#c084fc', icon: '🔮' },
      { x: 236, y: 395, r: 23, val: 350, color: '#fbbf24', icon: '👑' },
      { x: 292, y: 404, r: 20, val: 120, color: '#f472b6', icon: '💎' },
      { x: 348, y: 398, r: 21, val: 60, color: '#22d3ee', icon: '⭐' },
      { x: 394, y: 406, r: 19, val: 40, color: '#34d399', icon: '🎟️' }
    ];

    const updateHud = () => {
      this.setHud({
        scoreLabel: 'Tickets Grabbed',
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Claw Tries',
        infoVal: `${triesLeft} Left`
      });
    };
    updateHud();

    const dropClaw = () => {
      if (clawState !== 'idle' || triesLeft <= 0) return;
      clawState = 'down';
      moveDir = 0;
      ArcadeAudio.playLaser();
    };

    this.controlsBar.innerHTML = `
      <div class="flex items-center justify-between gap-2 w-full">
        <button id="cc-left" class="flex-1 py-3 rounded-xl bg-slate-900 active:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-display font-bold text-xs uppercase select-none">◀ Geser Kiri</button>
        <button id="cc-drop" class="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-xs uppercase select-none">Drop Claw (Space)</button>
        <button id="cc-right" class="flex-1 py-3 rounded-xl bg-slate-900 active:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-display font-bold text-xs uppercase select-none">Geser Kanan ▶</button>
      </div>
    `;

    const bindHold = (id, dir) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); moveDir = dir; });
      const stop = () => { if (moveDir === dir) moveDir = 0; };
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointerleave', stop);
    };
    bindHold('cc-left', -1);
    bindHold('cc-right', 1);
    document.getElementById('cc-drop')?.addEventListener('click', dropClaw);

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveDir = -1;
      if (e.key === 'ArrowRight' || e.key === 'd') moveDir = 1;
      if (e.code === 'Space') { e.preventDefault(); dropClaw(); }
    };
    const onKeyUp = (e) => {
      if ((e.key === 'ArrowLeft' || e.key === 'a') && moveDir === -1) moveDir = 0;
      if ((e.key === 'ArrowRight' || e.key === 'd') && moveDir === 1) moveDir = 0;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.cleanupFns.push(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });

    const loop = () => {
      if (!this.isRoundActive) return;

      if (clawState === 'idle') {
        clawX = Math.max(95, Math.min(W - 40, clawX + moveDir * 4));
      } else if (clawState === 'down') {
        clawY += 4.8;
        // Check capsule hit or floor
        for (const cap of capsules) {
          if (Math.hypot(clawX - cap.x, clawY + 18 - cap.y) < cap.r + 12) {
            grabbedCap = cap;
            clawState = 'grab';
            openAmount = 0.25;
            ArcadeAudio.playBounce();
            break;
          }
        }
        if (clawState === 'down' && clawY >= 382) {
          clawState = 'grab';
          openAmount = 0.2;
        }
      } else if (clawState === 'grab') {
        clawState = 'up';
      } else if (clawState === 'up') {
        clawY -= 4;
        if (grabbedCap) {
          grabbedCap.x = clawX;
          grabbedCap.y = clawY + 24;
        }
        if (clawY <= 72) {
          clawY = 72;
          clawState = grabbedCap ? 'deliver' : 'reset';
        }
      } else if (clawState === 'deliver') {
        clawX -= 4.5;
        if (grabbedCap) {
          grabbedCap.x = clawX;
          grabbedCap.y = clawY + 24;
        }
        if (clawX <= 52) {
          // Drop into chute!
          totalTickets += grabbedCap.val;
          ArcadeAudio.playCoinInsert();
          const idx = capsules.indexOf(grabbedCap);
          if (idx > -1) capsules.splice(idx, 1);
          grabbedCap = null;
          openAmount = 1;
          clawState = 'reset';
          updateHud();
        }
      } else if (clawState === 'reset') {
        triesLeft -= 1;
        clawState = 'idle';
        openAmount = 1;
        clawX = Math.max(120, clawX);
        updateHud();
        if (triesLeft <= 0 || capsules.length === 0) {
          const t = setTimeout(() => {
            this.finishRound(totalTickets, 'CLAW SESSION FINISHED!', `Kamu berhasil mencapit total ${totalTickets.toLocaleString()} Prize Tickets!`);
          }, 350);
          this.timeouts.push(t);
        }
      }

      // Draw Cabinet
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Prize Chute on Left
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.fillRect(16, 330, 74, 118);
      ctx.strokeRect(16, 330, 74, 118);
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 10px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRIZE', 53, 360);
      ctx.fillText('CHUTE', 53, 374);

      // Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(92, 420, W - 108, 28);

      // Gantry Rail
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, 26, W - 32, 10);

      // Cable & Claw
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(clawX, 36); ctx.lineTo(clawX, clawY); ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(clawX - 12, clawY - 8, 24, 12);

      // Pincers
      const spread = 10 + openAmount * 14;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(clawX - 6, clawY + 4);
      ctx.lineTo(clawX - spread, clawY + 20);
      ctx.lineTo(clawX - spread + 8, clawY + 32);
      ctx.moveTo(clawX + 6, clawY + 4);
      ctx.lineTo(clawX + spread, clawY + 20);
      ctx.lineTo(clawX + spread - 8, clawY + 32);
      ctx.stroke();

      // Capsules
      for (const cap of capsules) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, cap.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.shadowColor = cap.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = cap.color;
        ctx.stroke();
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cap.icon, cap.x, cap.y - 4);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`${cap.val}`, cap.x, cap.y + 11);
        ctx.restore();
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  },

  // ==================== GAME 5: NEON SKEE-BALL ====================
  runSkeeBall() {
    const W = 400, H = 500;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let ballsLeft = 5;
    let totalTickets = 0;
    const ball = { x: 200, y: 442, vx: 0, vy: 0, r: 14, rolling: false, scale: 1 };
    let dragStart = null;
    let dragCurr = null;
    let oscT = 0;

    const pockets = [
      { x: 105, y: 80, r: 22, pts: 100, color: '#fbbf24', flash: 0 },
      { x: 295, y: 80, r: 22, pts: 100, color: '#fbbf24', flash: 0 },
      { x: 200, y: 120, r: 24, pts: 50, color: '#c084fc', flash: 0 },
      { x: 200, y: 120, r: 52, pts: 30, color: '#22d3ee', flash: 0 },
      { x: 200, y: 120, r: 84, pts: 20, color: '#38bdf8', flash: 0 },
      { x: 200, y: 120, r: 118, pts: 10, color: '#64748b', flash: 0 }
    ];

    const updateHud = () => {
      this.setHud({
        scoreLabel: 'Tickets Won',
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Balls Left',
        infoVal: `${ballsLeft} Balls`
      });
    };
    updateHud();

    const shootBall = (vx, vy) => {
      if (ball.rolling || ballsLeft <= 0) return;
      ball.rolling = true;
      ball.vx = vx;
      ball.vy = vy;
      ArcadeAudio.playLaser();
    };

    this.controlsBar.innerHTML = `
      <div class="flex items-center justify-between gap-2 w-full">
        <span class="text-xs text-slate-300">Tarik &amp; lepaskan bola ke atas, atau klik Quick Roll!</span>
        <button id="sb-quick-roll" class="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-black text-xs uppercase shrink-0">Quick Roll</button>
      </div>
    `;

    document.getElementById('sb-quick-roll')?.addEventListener('click', () => {
      const aimX = Math.sin(oscT * 2.5) * 3.8;
      shootBall(aimX, -11.5 - Math.random() * 2.5);
    });

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
    };

    const onDown = (e) => {
      if (ball.rolling) return;
      dragStart = getPos(e);
      dragCurr = dragStart;
    };
    const onMove = (e) => {
      if (!dragStart) return;
      dragCurr = getPos(e);
    };
    const onUp = () => {
      if (!dragStart || !dragCurr) return;
      const dx = dragCurr.x - dragStart.x;
      const dy = dragCurr.y - dragStart.y;
      if (dy < -18) {
        shootBall(Math.max(-6, Math.min(6, dx * 0.08)), Math.max(-15.5, Math.min(-7, dy * 0.11)));
      }
      dragStart = null;
      dragCurr = null;
    };

    this.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    this.cleanupFns.push(() => {
      this.canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    });

    const loop = () => {
      if (!this.isRoundActive) return;
      oscT += 0.03;

      if (ball.rolling) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.985;
        ball.vy *= 0.978;

        if (ball.x < 34) { ball.x = 34; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - 34) { ball.x = W - 34; ball.vx = -Math.abs(ball.vx); }

        const speed = Math.hypot(ball.vx, ball.vy);
        // Check if entered scoring zone or stopped
        if (ball.y < 190 && (speed < 3.6 || ball.y < 60)) {
          let earned = 10;
          for (const p of pockets) {
            if (Math.hypot(ball.x - p.x, ball.y - p.y) <= p.r) {
              earned = p.pts;
              p.flash = 1;
              break;
            }
          }
          totalTickets += earned;
          ArcadeAudio.playCoinInsert();
          ball.rolling = false;
          ball.x = 200;
          ball.y = 442;
          ballsLeft -= 1;
          updateHud();

          if (ballsLeft <= 0) {
            const t = setTimeout(() => {
              this.finishRound(totalTickets, 'SKEE-BALL CHAMPION!', `5 lemparan bola menghasilkan total ${totalTickets.toLocaleString()} Prize Tickets!`);
            }, 400);
            this.timeouts.push(t);
          }
        } else if (speed < 0.7 || ball.y > H) {
          // Short throw
          ball.rolling = false;
          ball.x = 200;
          ball.y = 442;
          ballsLeft -= 1;
          ArcadeAudio.playError();
          updateHud();
          if (ballsLeft <= 0) {
            const t = setTimeout(() => {
              this.finishRound(totalTickets, 'SKEE-BALL COMPLETE!', `Total perolehan: ${totalTickets.toLocaleString()} Prize Tickets!`);
            }, 400);
            this.timeouts.push(t);
          }
        }
      }

      // Draw Alley
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Perspective Lane Walls
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 20, W - 48, H - 36);

      // Draw Scoring Pockets (from largest to smallest)
      for (let i = pockets.length - 1; i >= 0; i--) {
        const p = pockets[i];
        if (p.flash > 0) p.flash = Math.max(0, p.flash - 0.06);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.flash > 0.1 ? p.color : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = p.flash > 0.1 ? '#060913' : '#fff';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.pts, p.x, p.y - (i >= 3 ? p.r - 12 : -4));
        ctx.restore();
      }

      // Aim Arrow while dragging
      if (dragStart && dragCurr && !ball.rolling) {
        const dx = dragCurr.x - dragStart.x;
        const dy = dragCurr.y - dragStart.y;
        if (dy < -10) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.x + dx * 1.1, ball.y + dy * 1.1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Ball
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  },

  // ==================== GAME 6: RING TOSS BLITZ ====================
  runRingToss() {
    const W = 440, H = 460;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let ringsLeft = 8;
    let totalTickets = 0;
    let timePhase = 0;
    let aimX = W / 2, aimY = 230;
    const flyingRings = [];
    const landedRings = [];

    const bottles = [
      { baseX: 110, y: 270, pts: 30, color: '#22d3ee', ringed: false },
      { baseX: 220, y: 270, pts: 30, color: '#22d3ee', ringed: false },
      { baseX: 330, y: 270, pts: 30, color: '#22d3ee', ringed: false },
      { baseX: 155, y: 170, pts: 60, color: '#c084fc', ringed: false },
      { baseX: 285, y: 170, pts: 60, color: '#c084fc', ringed: false },
      { baseX: 220, y: 105, pts: 200, color: '#fbbf24', ringed: false }
    ];

    const updateHud = () => {
      this.setHud({
        scoreLabel: 'Tickets Won',
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Rings Left',
        infoVal: `${ringsLeft} Rings`
      });
    };
    updateHud();

    this.controlsBar.innerHTML = `<p class="text-xs text-center text-cyan-300 font-semibold">Arahkan bidikan ke leher botol neon yang bergoyang lalu klik/tap untuk melempar gelang!</p>`;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
    };

    const onMove = (e) => {
      const p = getPos(e);
      aimX = p.x;
      aimY = Math.min(340, Math.max(60, p.y));
    };

    const onToss = (e) => {
      if (ringsLeft <= 0) return;
      onMove(e);
      ringsLeft -= 1;
      flyingRings.push({
        startX: W / 2,
        startY: H - 20,
        targetX: aimX,
        targetY: aimY,
        t: 0
      });
      ArcadeAudio.playLaser();
      updateHud();
    };

    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('click', onToss);
    this.cleanupFns.push(() => {
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('click', onToss);
    });

    const loop = () => {
      if (!this.isRoundActive) return;
      timePhase += 0.035;

      // Update bottle sway
      bottles.forEach((b, idx) => {
        b.x = b.baseX + Math.sin(timePhase + idx * 1.1) * (idx === 5 ? 32 : 18);
      });

      // Update flying rings
      for (let i = flyingRings.length - 1; i >= 0; i--) {
        const r = flyingRings[i];
        r.t += 0.05;
        if (r.t >= 1) {
          // Check hit on any bottle
          let hit = false;
          for (const b of bottles) {
            if (Math.hypot(r.targetX - b.x, r.targetY - (b.y - 12)) < 26) {
              hit = true;
              totalTickets += b.pts;
              landedRings.push({ bottle: b, color: b.color });
              ArcadeAudio.playCoinInsert();
              updateHud();
              break;
            }
          }
          if (!hit) ArcadeAudio.playTick(0.2);
          flyingRings.splice(i, 1);

          if (ringsLeft === 0 && flyingRings.length === 0) {
            const t = setTimeout(() => {
              this.finishRound(totalTickets, 'RING TOSS COMPLETE!', `8 lemparan gelang memberimu ${totalTickets.toLocaleString()} Prize Tickets!`);
            }, 450);
            this.timeouts.push(t);
          }
        }
      }

      // Draw Stage
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Draw Bottles
      for (const b of bottles) {
        ctx.save();
        // Bottle body
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(b.x - 16, b.y - 6, 32, 42, 6);
        ctx.fill();
        ctx.stroke();

        // Bottle neck
        ctx.fillRect(b.x - 7, b.y - 24, 14, 18);
        ctx.strokeRect(b.x - 7, b.y - 24, 14, 18);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${b.pts}`, b.x, b.y + 18);
        ctx.restore();
      }

      // Landed Rings on Bottles
      for (const lr of landedRings) {
        ctx.save();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(lr.bottle.x, lr.bottle.y - 6, 17, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Flying Rings
      for (const r of flyingRings) {
        const cx = r.startX + (r.targetX - r.startX) * r.t;
        const cy = r.startY + (r.targetY - r.startY) * r.t - Math.sin(r.t * Math.PI) * 70;
        const radX = 36 - r.t * 16;
        const radY = 16 - r.t * 7;
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Aim Reticle
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(aimX, aimY, 22, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  },

  // ==================== GAME 7: LASER DUCK ALLEY ====================
  runLaserDuck() {
    const W = 460, H = 420;
    this.useCanvasMode(W, H);
    const ctx = this.ctx;

    let timeLeft = 20;
    let totalTickets = 0;
    let combo = 0;
    const ducks = [];
    const lasers = [];
    const popups = [];

    const spawnDuck = (row) => {
      const dir = row % 2 === 0 ? 1 : -1;
      const roll = Math.random();
      const type = roll < 0.14 ? 'gold' : roll < 0.28 ? 'bomb' : roll < 0.55 ? 'purple' : 'cyan';
      const specs = {
        cyan: { pts: 20, speed: 2.3, color: '#22d3ee', icon: '🦆' },
        purple: { pts: 45, speed: 3.3, color: '#c084fc', icon: '🦆' },
        gold: { pts: 120, speed: 4.1, color: '#fbbf24', icon: '👑' },
        bomb: { pts: -20, speed: 2.6, color: '#f43f5e', icon: '💣' }
      }[type];

      ducks.push({
        x: dir === 1 ? -30 : W + 30,
        y: 85 + row * 105,
        dir,
        type,
        pts: specs.pts,
        speed: specs.speed + Math.random() * 0.7,
        color: specs.color,
        icon: specs.icon,
        r: 24
      });
    };

    for (let r = 0; r < 3; r++) spawnDuck(r);

    const updateHud = () => {
      this.setHud({
        scoreLabel: `Tickets (${combo}x)`,
        scoreVal: totalTickets.toLocaleString(),
        infoLabel: 'Timer',
        infoVal: `${timeLeft}s`
      });
    };
    updateHud();

    this.controlsBar.innerHTML = `<p class="text-xs text-center text-cyan-300 font-semibold">Klik/Tap bebek holo untuk menembak! Hindari 💣 Bomb agar poin tidak berkurang!</p>`;

    const timerId = setInterval(() => {
      timeLeft -= 1;
      updateHud();
      if (timeLeft <= 0) {
        clearInterval(timerId);
        this.finishRound(
          Math.max(0, totalTickets),
          'TIME UP — SHARP SHOOTER!',
          `Kamu mencetak ${Math.max(0, totalTickets).toLocaleString()} Prize Tickets dalam 20 detik!`
        );
      }
    }, 1000);
    const spawnerId = setInterval(() => {
      if (ducks.length < 7) spawnDuck(Math.floor(Math.random() * 3));
    }, 680);
    this.intervals.push(timerId, spawnerId);

    const onShoot = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const my = ((e.clientY - rect.top) / rect.height) * H;

      lasers.push({ x: mx, y: my, life: 1 });
      ArcadeAudio.playLaser();

      let hitAny = false;
      for (let i = ducks.length - 1; i >= 0; i--) {
        const d = ducks[i];
        if (Math.hypot(mx - d.x, my - d.y) <= d.r + 10) {
          hitAny = true;
          if (d.type === 'bomb') {
            combo = 0;
            totalTickets = Math.max(0, totalTickets + d.pts);
            ArcadeAudio.playError();
            popups.push({ x: d.x, y: d.y, text: `${d.pts}`, color: '#f43f5e', life: 1 });
          } else {
            combo += 1;
            const mult = combo >= 5 ? 2 : 1;
            const gained = d.pts * mult;
            totalTickets += gained;
            ArcadeAudio.playCoinInsert();
            popups.push({ x: d.x, y: d.y, text: `+${gained}`, color: d.color, life: 1 });
          }
          ducks.splice(i, 1);
          updateHud();
          break;
        }
      }
      if (!hitAny) combo = 0;
    };

    this.canvas.addEventListener('pointerdown', onShoot);
    this.cleanupFns.push(() => this.canvas.removeEventListener('pointerdown', onShoot));

    const loop = () => {
      if (!this.isRoundActive) return;

      for (let i = ducks.length - 1; i >= 0; i--) {
        const d = ducks[i];
        d.x += d.speed * d.dir;
        if (d.x < -50 || d.x > W + 50) ducks.splice(i, 1);
      }

      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, W, H);

      // Conveyor Tracks
      for (let r = 0; r < 3; r++) {
        const ry = 85 + r * 105 + 24;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
      }

      // Draw Ducks
      for (const d of ducks) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = d.color;
        ctx.stroke();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.icon, d.x, d.y - 3);
        ctx.fillStyle = d.color;
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(d.pts > 0 ? `+${d.pts}` : `${d.pts}`, d.x, d.y + 14);
        ctx.restore();
      }

      // Lasers
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.life -= 0.12;
        if (l.life <= 0) { lasers.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = l.life;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(l.x, l.y); ctx.stroke();
        ctx.restore();
      }

      // Score Popups
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 1.2;
        p.life -= 0.03;
        if (p.life <= 0) { popups.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }
};

