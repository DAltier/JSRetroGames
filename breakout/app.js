class BreakoutGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.difficulties = {
      easy: {
        ballSpeed: 3,
        paddleSpeed: 8,
        brickRows: 5,
        brickCols: 10,
        powerUpChance: 0.3,
      },
      medium: {
        ballSpeed: 5,
        paddleSpeed: 10,
        brickRows: 6,
        brickCols: 12,
        powerUpChance: 0.25,
      },
      hard: {
        ballSpeed: 7,
        paddleSpeed: 12,
        brickRows: 7,
        brickCols: 14,
        powerUpChance: 0.2,
      },
      insane: {
        ballSpeed: 9,
        paddleSpeed: 15,
        brickRows: 8,
        brickCols: 16,
        powerUpChance: 0.15,
      },
    };

    this.gameModes = {
      classic: { lives: 3, powerUps: false },
      'power-up': { lives: 3, powerUps: true },
      survival: { lives: 1, powerUps: true },
    };

    this.brickColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'];

    this.currentDifficulty = 'easy';
    this.currentMode = 'classic';
    this.gameState = 'stopped';

    // Game objects
    this.paddle = null;
    this.balls = [];
    this.bricks = [];
    this.powerUps = [];
    this.lasers = [];
    this.particles = [];

    // Game variables
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.streak = 0;
    this.maxStreak = 0;

    // Power-up counts
    this.powerUpCounts = {
      multiBall: 2,
      laser: 1,
      expandPaddle: 1,
      sticky: 1,
    };

    // Active power-ups
    this.activePowerUps = {
      expandPaddle: { active: false, timer: 0 },
      laser: { active: false, timer: 0 },
      sticky: { active: false, timer: 0, ballAttached: false },
    };

    // Controls
    this.keys = {};
    this.mouseX = 0;

    // Game timers
    this.gameTimer = null;
    this.animationId = null;

    // Achievements and leaderboard
    this.achievements = [];
    this.leaderboard = this.loadLeaderboard();
    this.soundEnabled = true;

    this.initializeElements();
    this.attachEventListeners();
    this.createSounds();
    this.resetGame();
    this.updateDisplay();
  }

  initializeElements() {
    this.elements = {
      scoreEl: document.getElementById('score'),
      livesEl: document.getElementById('lives'),
      levelEl: document.getElementById('level'),
      streakEl: document.getElementById('streak'),

      startBtn: document.getElementById('start-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resetBtn: document.getElementById('reset-btn'),
      soundBtn: document.getElementById('sound-btn'),
      leaderboardBtn: document.getElementById('leaderboard-btn'),

      gameOverModal: document.getElementById('game-over-modal'),
      levelCompleteModal: document.getElementById('level-complete-modal'),
      pauseModal: document.getElementById('pause-modal'),
      leaderboardModal: document.getElementById('leaderboard-modal'),

      finalScore: document.getElementById('final-score'),
      finalLevel: document.getElementById('final-level'),
      finalStreak: document.getElementById('final-streak'),

      levelScore: document.getElementById('level-score'),
      levelBonus: document.getElementById('level-bonus'),

      achievementsList: document.getElementById('achievements-list'),
      confettiCanvas: document.getElementById('confetti-canvas'),
    };
  }

  attachEventListeners() {
    // Difficulty and mode buttons
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeDifficulty(btn.dataset.level));
    });

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
    });

    // Control buttons
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    this.elements.soundBtn.addEventListener('click', () => this.toggleSound());
    this.elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());

    // Power-up buttons
    document.getElementById('multi-ball-power').addEventListener('click', () => this.usePowerUp('multiBall'));
    document.getElementById('laser-power').addEventListener('click', () => this.usePowerUp('laser'));
    document.getElementById('expand-paddle-power').addEventListener('click', () => this.usePowerUp('expandPaddle'));
    document.getElementById('sticky-power').addEventListener('click', () => this.usePowerUp('sticky'));

    // Modal buttons
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.resetGame();
      this.startGame();
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.nextLevel();
    });

    document.getElementById('continue-btn').addEventListener('click', () => {
      this.hideModal('level-complete-modal');
      this.nextLevel();
    });

    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

    document.querySelector('.close-modal').addEventListener('click', () => {
      this.hideModal('leaderboard-modal');
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.showLeaderboardTab(btn.dataset.tab));
    });

    // Controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;

      if (e.key === ' ') {
        e.preventDefault();
        if (this.activePowerUps.sticky.ballAttached) {
          this.releaseStickyBall();
        }
      }

      if (this.activePowerUps.laser.active && e.key === ' ') {
        this.fireLaser();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // Mouse controls
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.activePowerUps.sticky.ballAttached) {
        this.releaseStickyBall();
      }

      if (this.activePowerUps.laser.active) {
        this.fireLaser();
      }
    });
  }

  createSounds() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const createTone = (frequency, duration, type = 'sine') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    this.sounds = {
      paddle: () => {
        if (this.soundEnabled) createTone(300, 0.1);
      },
      brick: () => {
        if (this.soundEnabled) {
          createTone(800, 0.1);
          setTimeout(() => createTone(1000, 0.1), 50);
        }
      },
      powerUp: () => {
        if (this.soundEnabled) {
          createTone(1200, 0.1);
          setTimeout(() => createTone(1400, 0.1), 100);
          setTimeout(() => createTone(1600, 0.2), 200);
        }
      },
      laser: () => {
        if (this.soundEnabled) createTone(1500, 0.2, 'sawtooth');
      },
      levelComplete: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.3), i * 150);
          });
        }
      },
      gameOver: () => {
        if (this.soundEnabled) {
          const notes = [440, 392, 349, 294];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.4), i * 300);
          });
        }
      },
    };
  }

  changeDifficulty(level) {
    this.currentDifficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });

    if (this.gameState !== 'playing') {
      this.resetGame();
    }
  }

  changeMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (this.gameState !== 'playing') {
      this.resetGame();
    }
  }

  startGame() {
    this.gameState = 'playing';
    this.updateButtons();
    this.gameLoop();
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.elements.pauseModal.classList.remove('hidden');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.elements.pauseModal.classList.add('hidden');
      this.gameLoop();
    }
    this.updateButtons();
  }

  resetGame() {
    this.gameState = 'stopped';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    const settings = this.difficulties[this.currentDifficulty];
    const modeSettings = this.gameModes[this.currentMode];

    this.score = 0;
    this.lives = modeSettings.lives;
    this.level = 1;
    this.streak = 0;
    this.maxStreak = 0;

    // Reset power-ups
    this.powerUpCounts = {
      multiBall: 2,
      laser: 1,
      expandPaddle: 1,
      sticky: 1,
    };

    this.activePowerUps = {
      expandPaddle: { active: false, timer: 0 },
      laser: { active: false, timer: 0 },
      sticky: { active: false, timer: 0, ballAttached: false },
    };

    this.initializeLevel();
    this.updateDisplay();
    this.updateButtons();
    this.updatePowerUpDisplay();
    this.hideAllModals();
  }

  initializeLevel() {
    const settings = this.difficulties[this.currentDifficulty];

    // Initialize paddle
    this.paddle = {
      x: this.canvas.width / 2 - 60,
      y: this.canvas.height - 40,
      width: 120,
      height: 15,
      speed: settings.paddleSpeed,
      originalWidth: 120,
    };

    // Initialize ball
    this.balls = [
      {
        x: this.canvas.width / 2,
        y: this.canvas.height - 60,
        dx: Math.random() > 0.5 ? settings.ballSpeed : -settings.ballSpeed,
        dy: -settings.ballSpeed,
        radius: 8,
        stuck: this.activePowerUps.sticky.active,
      },
    ];

    // Initialize bricks
    this.bricks = [];
    const brickWidth = (this.canvas.width - 40) / settings.brickCols;
    const brickHeight = 20;

    for (let row = 0; row < settings.brickRows; row++) {
      for (let col = 0; col < settings.brickCols; col++) {
        this.bricks.push({
          x: 20 + col * brickWidth,
          y: 60 + row * (brickHeight + 5),
          width: brickWidth - 2,
          height: brickHeight,
          color: this.brickColors[row % this.brickColors.length],
          hits: row < 2 ? 2 : 1,
          maxHits: row < 2 ? 2 : 1,
          powerUp: Math.random() < settings.powerUpChance ? this.getRandomPowerUpType() : null,
        });
      }
    }

    this.powerUps = [];
    this.lasers = [];
    this.particles = [];
  }

  getRandomPowerUpType() {
    const types = ['multiBall', 'laser', 'expandPaddle', 'sticky', 'extraLife', 'points'];
    return types[Math.floor(Math.random() * types.length)];
  }

  gameLoop() {
    if (this.gameState !== 'playing') return;

    this.update();
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Update paddle
    this.updatePaddle();

    // Update balls
    this.updateBalls();

    // Update power-ups
    this.updatePowerUps();

    // Update lasers
    this.updateLasers();

    // Update particles
    this.updateParticles();

    // Update active power-up timers
    this.updatePowerUpTimers();

    // Check win condition
    if (this.bricks.length === 0) {
      this.levelComplete();
    }

    // Check lose condition
    if (this.balls.length === 0) {
      this.lives--;
      if (this.lives > 0) {
        this.resetBall();
      } else {
        this.gameOver();
      }
    }
  }

  updatePaddle() {
    // Keyboard controls
    if (this.keys['ArrowLeft'] || this.keys['a']) {
      this.paddle.x -= this.paddle.speed;
    }
    if (this.keys['ArrowRight'] || this.keys['d']) {
      this.paddle.x += this.paddle.speed;
    }

    // Mouse controls
    if (this.mouseX > 0) {
      this.paddle.x = this.mouseX - this.paddle.width / 2;
    }

    // Keep paddle in bounds
    this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
  }

  updateBalls() {
    this.balls.forEach((ball, ballIndex) => {
      if (ball.stuck && this.activePowerUps.sticky.ballAttached) {
        ball.x = this.paddle.x + this.paddle.width / 2;
        ball.y = this.paddle.y - ball.radius;
        return;
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collisions
      if (ball.x <= ball.radius || ball.x >= this.canvas.width - ball.radius) {
        ball.dx = -ball.dx;
        ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
      }

      if (ball.y <= ball.radius) {
        ball.dy = -ball.dy;
        ball.y = ball.radius;
      }

      // Paddle collision
      if (ball.y + ball.radius >= this.paddle.y && ball.x >= this.paddle.x && ball.x <= this.paddle.x + this.paddle.width && ball.dy > 0) {
        this.sounds.paddle();

        if (this.activePowerUps.sticky.active && !this.activePowerUps.sticky.ballAttached) {
          ball.stuck = true;
          ball.dx = 0;
          ball.dy = 0;
          this.activePowerUps.sticky.ballAttached = true;
        } else {
          const hitPos = (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
          ball.dx = hitPos * 5;
          ball.dy = -Math.abs(ball.dy);
        }
      }

      // Brick collisions
      this.bricks.forEach((brick, brickIndex) => {
        if (this.ballBrickCollision(ball, brick)) {
          this.hitBrick(brickIndex, ball.x, ball.y);

          // Simple bounce logic
          const ballCenterX = ball.x;
          const ballCenterY = ball.y;
          const brickCenterX = brick.x + brick.width / 2;
          const brickCenterY = brick.y + brick.height / 2;

          if (Math.abs(ballCenterX - brickCenterX) > Math.abs(ballCenterY - brickCenterY)) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }
        }
      });

      // Remove balls that go off screen
      if (ball.y > this.canvas.height) {
        this.balls.splice(ballIndex, 1);
      }
    });
  }

  ballBrickCollision(ball, brick) {
    return ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.width && ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height;
  }

  hitBrick(brickIndex, x, y) {
    const brick = this.bricks[brickIndex];
    brick.hits--;

    this.sounds.brick();
    this.createParticles(x, y, brick.color);

    if (brick.hits <= 0) {
      // Award points
      this.score += 10 * this.level;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);

      // Drop power-up
      if (brick.powerUp && this.gameModes[this.currentMode].powerUps) {
        this.powerUps.push({
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height,
          width: 30,
          height: 20,
          dy: 2,
          type: brick.powerUp,
        });
      }

      this.bricks.splice(brickIndex, 1);
      this.checkAchievements();
    }

    this.updateDisplay();
  }

  updatePowerUps() {
    this.powerUps.forEach((powerUp, index) => {
      powerUp.y += powerUp.dy;

      // Paddle collision
      if (powerUp.y + powerUp.height >= this.paddle.y && powerUp.x + powerUp.width >= this.paddle.x && powerUp.x <= this.paddle.x + this.paddle.width) {
        this.collectPowerUp(powerUp.type);
        this.powerUps.splice(index, 1);
      }

      // Remove if off screen
      if (powerUp.y > this.canvas.height) {
        this.powerUps.splice(index, 1);
      }
    });
  }

  updateLasers() {
    this.lasers.forEach((laser, index) => {
      laser.y -= laser.speed;

      // Check brick collisions
      this.bricks.forEach((brick, brickIndex) => {
        if (laser.x >= brick.x && laser.x <= brick.x + brick.width && laser.y >= brick.y && laser.y <= brick.y + brick.height) {
          this.hitBrick(brickIndex, laser.x, laser.y);
          this.lasers.splice(index, 1);
        }
      });

      // Remove if off screen
      if (laser.y < 0) {
        this.lasers.splice(index, 1);
      }
    });
  }

  updateParticles() {
    this.particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2;
      particle.life--;

      if (particle.life <= 0) {
        this.particles.splice(index, 1);
      }
    });
  }

  updatePowerUpTimers() {
    Object.keys(this.activePowerUps).forEach((type) => {
      if (this.activePowerUps[type].active) {
        this.activePowerUps[type].timer--;

        if (this.activePowerUps[type].timer <= 0) {
          this.deactivatePowerUp(type);
        }
      }
    });
  }

  collectPowerUp(type) {
    this.sounds.powerUp();

    switch (type) {
      case 'multiBall':
        this.createMultiBall();
        break;
      case 'laser':
        this.activatePowerUp('laser', 300);
        break;
      case 'expandPaddle':
        this.activatePowerUp('expandPaddle', 600);
        break;
      case 'sticky':
        this.activatePowerUp('sticky', 600);
        break;
      case 'extraLife':
        this.lives++;
        break;
      case 'points':
        this.score += 100;
        break;
    }

    this.updateDisplay();
    this.updatePowerUpDisplay();
  }

  usePowerUp(type) {
    if (this.powerUpCounts[type] <= 0 || this.gameState !== 'playing') return;

    this.powerUpCounts[type]--;
    this.sounds.powerUp();

    switch (type) {
      case 'multiBall':
        this.createMultiBall();
        break;
      case 'laser':
        this.activatePowerUp('laser', 300);
        break;
      case 'expandPaddle':
        this.activatePowerUp('expandPaddle', 600);
        break;
      case 'sticky':
        this.activatePowerUp('sticky', 600);
        break;
    }

    this.updatePowerUpDisplay();
  }

  activatePowerUp(type, duration) {
    this.activePowerUps[type].active = true;
    this.activePowerUps[type].timer = duration;

    switch (type) {
      case 'expandPaddle':
        this.paddle.width = this.paddle.originalWidth * 1.5;
        break;
      case 'sticky':
        this.activePowerUps.sticky.ballAttached = false;
        break;
    }

    this.updatePowerUpDisplay();
  }

  deactivatePowerUp(type) {
    this.activePowerUps[type].active = false;

    switch (type) {
      case 'expandPaddle':
        this.paddle.width = this.paddle.originalWidth;
        break;
      case 'sticky':
        this.activePowerUps.sticky.ballAttached = false;
        this.balls.forEach((ball) => {
          if (ball.stuck) {
            ball.stuck = false;
            ball.dx = 3;
            ball.dy = -3;
          }
        });
        break;
    }

    this.updatePowerUpDisplay();
  }

  createMultiBall() {
    if (this.balls.length > 0) {
      const originalBall = this.balls[0];
      const newBalls = [];

      for (let i = 0; i < 2; i++) {
        newBalls.push({
          x: originalBall.x,
          y: originalBall.y,
          dx: (Math.random() - 0.5) * 8,
          dy: -Math.abs(originalBall.dy),
          radius: originalBall.radius,
          stuck: false,
        });
      }

      this.balls.push(...newBalls);
    }
  }

  fireLaser() {
    if (this.activePowerUps.laser.active) {
      this.sounds.laser();
      this.lasers.push({
        x: this.paddle.x + this.paddle.width / 2,
        y: this.paddle.y,
        width: 3,
        height: 10,
        speed: 10,
      });
    }
  }

  releaseStickyBall() {
    this.balls.forEach((ball) => {
      if (ball.stuck) {
        ball.stuck = false;
        ball.dx = 3;
        ball.dy = -3;
      }
    });
    this.activePowerUps.sticky.ballAttached = false;
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: color,
        size: Math.random() * 4 + 1,
        life: 30,
      });
    }
  }

  resetBall() {
    this.balls = [
      {
        x: this.canvas.width / 2,
        y: this.canvas.height - 60,
        dx: Math.random() > 0.5 ? 3 : -3,
        dy: -3,
        radius: 8,
        stuck: this.activePowerUps.sticky.active,
      },
    ];

    this.streak = 0;
    this.updateDisplay();
  }

  levelComplete() {
    this.sounds.levelComplete();

    const levelBonus = this.level * 100;
    this.score += levelBonus;

    this.elements.levelScore.textContent = this.score;
    this.elements.levelBonus.textContent = levelBonus;

    this.gameState = 'paused';
    this.elements.levelCompleteModal.classList.remove('hidden');

    this.checkAchievements();
    this.updateDisplay();
  }

  nextLevel() {
    this.level++;

    // Increase difficulty slightly
    this.balls.forEach((ball) => {
      ball.dx *= 1.1;
      ball.dy *= 1.1;
    });

    this.initializeLevel();
    this.gameState = 'playing';
    this.gameLoop();
  }

  gameOver() {
    this.gameState = 'stopped';
    this.sounds.gameOver();

    this.updateLeaderboard();
    this.showGameOverModal();
    this.launchConfetti();
    this.updateButtons();
  }

  showGameOverModal() {
    this.elements.finalScore.textContent = this.score;
    this.elements.finalLevel.textContent = this.level;
    this.elements.finalStreak.textContent = this.maxStreak;

    this.elements.gameOverModal.classList.remove('hidden');
  }

  checkAchievements() {
    if (this.score >= 1000 && !this.hasAchievement('high_scorer')) {
      this.unlockAchievement('high_scorer', '🏆', 'High Scorer');
    }

    if (this.streak >= 10 && !this.hasAchievement('streak_master')) {
      this.unlockAchievement('streak_master', '🔥', 'Streak Master');
    }

    if (this.level >= 5 && !this.hasAchievement('level_master')) {
      this.unlockAchievement('level_master', '🌟', 'Level Master');
    }

    if (this.bricks.length === 0 && this.balls.length > 1 && !this.hasAchievement('multi_ball_master')) {
      this.unlockAchievement('multi_ball_master', '⚡', 'Multi-Ball Master');
    }
  }

  hasAchievement(id) {
    return this.achievements.some((a) => a.id === id);
  }

  unlockAchievement(id, icon, text) {
    if (!this.hasAchievement(id)) {
      this.achievements.push({ id, icon, text });

      const achievementEl = document.createElement('div');
      achievementEl.className = 'achievement-item';
      achievementEl.innerHTML = `
        <span class="achievement-icon">${icon}</span>
        <span class="achievement-text">${text}</span>
      `;

      this.elements.achievementsList.appendChild(achievementEl);
      this.sounds.powerUp();
    }
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw paddle
    this.ctx.fillStyle = this.activePowerUps.expandPaddle.active ? '#3498db' : '#ecf0f1';
    if (this.activePowerUps.laser.active) {
      this.ctx.fillStyle = '#e74c3c';
    }
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

    // Draw balls
    this.ctx.fillStyle = '#f39c12';
    this.balls.forEach((ball) => {
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Draw bricks
    this.bricks.forEach((brick) => {
      this.ctx.fillStyle = brick.color;
      if (brick.hits < brick.maxHits) {
        this.ctx.globalAlpha = 0.7;
      }
      this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      this.ctx.globalAlpha = 1;

      // Draw power-up indicator
      if (brick.powerUp) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('★', brick.x + brick.width / 2, brick.y + brick.height / 2 + 4);
      }
    });

    // Draw power-ups
    this.powerUps.forEach((powerUp) => {
      this.ctx.fillStyle = '#9b59b6';
      this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('P', powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2 + 4);
    });

    // Draw lasers
    this.ctx.fillStyle = '#e74c3c';
    this.lasers.forEach((laser) => {
      this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    });

    // Draw particles
    this.particles.forEach((particle) => {
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.life / 30;
      this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      this.ctx.globalAlpha = 1;
    });
  }

  updateDisplay() {
    this.elements.scoreEl.textContent = this.score;
    this.elements.livesEl.textContent = this.lives;
    this.elements.levelEl.textContent = this.level;
    this.elements.streakEl.textContent = this.streak;
  }

  updateButtons() {
    this.elements.startBtn.disabled = this.gameState === 'playing';
    this.elements.pauseBtn.disabled = this.gameState !== 'playing';

    if (this.gameState === 'paused') {
      this.elements.pauseBtn.innerHTML = '<span>▶️</span> Resume';
    } else {
      this.elements.pauseBtn.innerHTML = '<span>⏸️</span> Pause';
    }
  }

  updatePowerUpDisplay() {
    Object.keys(this.powerUpCounts).forEach((type) => {
      const elementId = type.replace(/([A-Z])/g, '-$1').toLowerCase() + '-power';
      const element = document.getElementById(elementId);
      if (element) {
        const countEl = element.querySelector('.power-count');
        countEl.textContent = this.powerUpCounts[type];
        element.classList.toggle('disabled', this.powerUpCounts[type] <= 0);
        element.classList.toggle('active', this.activePowerUps[type]?.active || false);
      }
    });
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.elements.soundBtn.innerHTML = this.soundEnabled ? '<span>🔊</span> Sound On' : '<span>🔇</span> Sound Off';
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.add('hidden');
    });
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('breakoutLeaderboard');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      easy: [],
      medium: [],
      hard: [],
      insane: [],
    };
  }

  updateLeaderboard() {
    const entry = {
      score: this.score,
      level: this.level,
      streak: this.maxStreak,
      date: new Date().toISOString(),
    };

    if (!this.leaderboard[this.currentDifficulty]) {
      this.leaderboard[this.currentDifficulty] = [];
    }

    this.leaderboard[this.currentDifficulty].push(entry);
    this.leaderboard[this.currentDifficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.currentDifficulty] = this.leaderboard[this.currentDifficulty].slice(0, 10);

    localStorage.setItem('breakoutLeaderboard', JSON.stringify(this.leaderboard));
  }

  showLeaderboard() {
    this.showLeaderboardTab(this.currentDifficulty);
    this.elements.leaderboardModal.classList.remove('hidden');
  }

  showLeaderboardTab(difficulty) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === difficulty);
    });

    const entries = this.leaderboard[difficulty] || [];
    const leaderboardList = document.getElementById('leaderboard-list');

    if (entries.length === 0) {
      leaderboardList.innerHTML = '<li>No scores yet!</li>';
    } else {
      leaderboardList.innerHTML = entries
        .map(
          (entry, index) => `
          <li>
            <span>#${index + 1} - Score: ${entry.score}</span>
            <span>Level: ${entry.level} | Streak: ${entry.streak}</span>
          </li>
        `
        )
        .join('');
    }
  }

  launchConfetti() {
    const canvas = this.elements.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);

        if (p.y > canvas.height) {
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BreakoutGame();
});
