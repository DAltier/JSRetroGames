class SpaceInvadersGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particlesCanvas = document.getElementById('particles-canvas');
    this.particlesCtx = this.particlesCanvas.getContext('2d');
    
    this.gameState = 'stopped';
    this.difficulty = 'easy';
    this.gameMode = 'classic';
    
    this.difficulties = {
      easy: {
        enemySpeed: 0.5,
        enemyFireRate: 0.003,
        enemyHealth: 1,
        waveMultiplier: 1
      },
      medium: {
        enemySpeed: 1,
        enemyFireRate: 0.006,
        enemyHealth: 2,
        waveMultiplier: 1.5
      },
      hard: {
        enemySpeed: 1.5,
        enemyFireRate: 0.009,
        enemyHealth: 3,
        waveMultiplier: 2
      },
      insane: {
        enemySpeed: 2,
        enemyFireRate: 0.012,
        enemyHealth: 4,
        waveMultiplier: 3
      }
    };
    
    this.stats = {
      score: 0,
      lives: 3,
      wave: 1,
      kills: 0,
      credits: 0,
      shotsFired: 0,
      accuracy: 0
    };
    
    this.powerUps = {
      rapidFire: 0,
      spreadShot: 0,
      shield: 0,
      nuke: 0
    };
    
    this.activePowerUps = {
      rapidFire: { active: false, timer: 0 },
      spreadShot: { active: false, timer: 0 },
      shield: { active: false, timer: 0 }
    };
    
    this.player = {
      x: this.canvas.width / 2 - 20,
      y: this.canvas.height - 60,
      width: 40,
      height: 30,
      speed: 5,
      fireRate: 150,
      lastShot: 0,
      invulnerable: false,
      invulnerabilityTimer: 0
    };
    
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUpDrops = [];
    this.boss = null;
    
    this.enemyDirection = 1;
    this.enemyMoveTimer = 0;
    this.enemyMoveDelay = 1000;
    
    this.keys = {};
    this.lastTime = 0;
    this.animationId = null;
    
    this.achievements = [];
    this.leaderboard = this.loadLeaderboard();
    this.soundEnabled = true;
    
    this.enemyTypes = {
      basic: { points: 10, health: 1, color: '#ff6b6b', size: 25, speed: 1 },
      fast: { points: 20, health: 1, color: '#4ecdc4', size: 20, speed: 1.5 },
      tank: { points: 50, health: 3, color: '#45b7d1', size: 35, speed: 0.5 },
      shooter: { points: 30, health: 2, color: '#f39c12', size: 30, speed: 1, fireRate: 0.01 }
    };
    
    this.bossTypes = {
      overlord: { 
        health: 100, 
        maxHealth: 100, 
        points: 1000, 
        color: '#e74c3c', 
        size: 80, 
        speed: 1,
        fireRate: 0.02,
        patterns: ['spread', 'laser', 'spiral']
      }
    };
    
    this.initializeElements();
    this.attachEventListeners();
    this.createSounds();
    this.resetGame();
    this.updateDisplay();
    this.resizeCanvas();
    
    // Make canvas focusable for keyboard events
    this.canvas.tabIndex = 1;
    this.canvas.focus();
  }

  initializeElements() {
    this.elements = {
      scoreEl: document.getElementById('score'),
      livesEl: document.getElementById('lives'),
      waveEl: document.getElementById('wave'),
      killsEl: document.getElementById('kills'),
      
      startBtn: document.getElementById('start-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resetBtn: document.getElementById('reset-btn'),
      soundBtn: document.getElementById('sound-btn'),
      leaderboardBtn: document.getElementById('leaderboard-btn'),
      
      gameOverModal: document.getElementById('game-over-modal'),
      waveCompleteModal: document.getElementById('wave-complete-modal'),
      bossModal: document.getElementById('boss-modal'),
      pauseModal: document.getElementById('pause-modal'),
      leaderboardModal: document.getElementById('leaderboard-modal'),
      shopModal: document.getElementById('shop-modal'),
      
      achievementsList: document.getElementById('achievements-list'),
      particlesCanvas: document.getElementById('particles-canvas'),
      confettiCanvas: document.getElementById('confetti-canvas')
    };
  }

  attachEventListeners() {
    // Difficulty and mode buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => this.changeDifficulty(btn.dataset.level));
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
    });

    // Control buttons
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    this.elements.soundBtn.addEventListener('click', () => this.toggleSound());
    this.elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());

    // Power-up buttons
    document.querySelectorAll('.power-up').forEach((powerUp, index) => {
      powerUp.addEventListener('click', () => {
        const types = ['rapidFire', 'spreadShot', 'shield', 'nuke'];
        this.usePowerUp(types[index]);
      });
    });

    // Modal buttons
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.resetGame();
      this.startGame();
    });

    document.getElementById('continue-wave-btn').addEventListener('click', () => {
      this.hideModal('wave-complete-modal');
      this.nextWave();
    });

    document.getElementById('fight-boss-btn').addEventListener('click', () => {
      this.hideModal('boss-modal');
      this.spawnBoss();
    });

    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.hideModal('pause-modal');
      this.restartWave();
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        this.hideModal(modal.id);
      });
    });

    // Shop buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.shop-item').dataset.item;
        this.buyItem(item);
      });
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.shoot();
      }
      
      // Alternative shooting keys for testing
      if (e.key === 'x' || e.key === 'X' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        this.shoot();
      }
      
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
      
      if (e.key === 'r' || e.key === 'R') {
        this.resetGame();
      }
      
      // Power-up hotkeys
      if (e.key >= '1' && e.key <= '4') {
        const powerUpIndex = parseInt(e.key) - 1;
        const types = ['rapidFire', 'spreadShot', 'shield', 'nuke'];
        this.usePowerUp(types[powerUpIndex]);
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // Leaderboard tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showLeaderboardTab(btn.dataset.tab));
    });

    // Window resize
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Canvas click for focus and shooting
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
      // Also allow clicking to shoot as backup
      if (this.gameState === 'playing') {
        this.shoot();
      }
    });
  }

  createSounds() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const createTone = (frequency, duration, type = 'sine', volume = 0.3) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    this.sounds = {
      shoot: () => {
        if (this.soundEnabled) createTone(800, 0.1, 'square', 0.1);
      },
      enemyShoot: () => {
        if (this.soundEnabled) createTone(200, 0.2, 'sawtooth', 0.1);
      },
      explosion: () => {
        if (this.soundEnabled) {
          createTone(150, 0.3, 'sawtooth', 0.2);
          setTimeout(() => createTone(100, 0.2, 'triangle', 0.1), 100);
        }
      },
      powerUp: () => {
        if (this.soundEnabled) {
          const notes = [523, 659, 784, 1047];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.1), i * 50);
          });
        }
      },
      waveComplete: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.3), i * 150);
          });
        }
      },
      boss: () => {
        if (this.soundEnabled) {
          createTone(80, 1, 'sawtooth', 0.3);
        }
      },
      achievement: () => {
        if (this.soundEnabled) {
          const notes = [659.25, 783.99, 1046.5];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.2), i * 100);
          });
        }
      }
    };
  }

  resizeCanvas() {
    this.particlesCanvas.width = window.innerWidth;
    this.particlesCanvas.height = window.innerHeight;
  }

  changeDifficulty(level) {
    this.difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
    
    if (this.gameState === 'stopped') {
      this.resetGame();
    }
  }

  changeMode(mode) {
    this.gameMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    if (this.gameState === 'stopped') {
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

    const modeSettings = {
      classic: { lives: 3 },
      survival: { lives: 1 },
      'boss-rush': { lives: 5 }
    };

    this.stats = {
      score: 0,
      lives: modeSettings[this.gameMode].lives,
      wave: 1,
      kills: 0,
      credits: 0,
      shotsFired: 0,
      accuracy: 0
    };

    this.powerUps = {
      rapidFire: 0,
      spreadShot: 0,
      shield: 0,
      nuke: 0
    };

    this.activePowerUps = {
      rapidFire: { active: false, timer: 0 },
      spreadShot: { active: false, timer: 0 },
      shield: { active: false, timer: 0 }
    };

    this.player = {
      x: this.canvas.width / 2 - 20,
      y: this.canvas.height - 60,
      width: 40,
      height: 30,
      speed: 5,
      fireRate: 150,
      lastShot: 0,
      invulnerable: false,
      invulnerabilityTimer: 0
    };

    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUpDrops = [];
    this.boss = null;

    this.enemyDirection = 1;
    this.enemyMoveTimer = 0;

    if (this.gameMode === 'boss-rush') {
      this.spawnBoss();
    } else {
      this.spawnEnemyWave();
    }

    this.updateDisplay();
    this.updateButtons();
    this.updatePowerUpDisplay();
    this.hideAllModals();
  }

  spawnEnemyWave() {
    this.enemies = [];
    const settings = this.difficulties[this.difficulty];
    const rows = Math.min(4 + Math.floor(this.stats.wave / 3), 6);
    const cols = Math.min(6 + Math.floor(this.stats.wave / 2), 10);
    
    const startX = (this.canvas.width - (cols * 60)) / 2;
    const startY = 50;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let type = 'basic';
        
        if (row === 0 && Math.random() < 0.3) type = 'fast';
        else if (row === rows - 1 && Math.random() < 0.2) type = 'tank';
        else if (Math.random() < 0.15) type = 'shooter';

        const enemyType = this.enemyTypes[type];
        
        this.enemies.push({
          x: startX + col * 60,
          y: startY + row * 50,
          width: enemyType.size,
          height: enemyType.size,
          type: type,
          health: enemyType.health * settings.enemyHealth,
          maxHealth: enemyType.health * settings.enemyHealth,
          speed: enemyType.speed,
          lastShot: 0,
          alive: true
        });
      }
    }
  }

  spawnBoss() {
    const bossType = this.bossTypes.overlord;
    this.boss = {
      x: this.canvas.width / 2 - 40,
      y: 50,
      width: bossType.size,
      height: bossType.size,
      health: bossType.health * this.stats.wave,
      maxHealth: bossType.health * this.stats.wave,
      speed: bossType.speed,
      lastShot: 0,
      pattern: 0,
      patternTimer: 0,
      alive: true
    };
    
    this.sounds.boss();
  }

  gameLoop(currentTime = 0) {
    if (this.gameState !== 'playing') return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateEnemyBullets(deltaTime);
    this.updatePowerUpDrops(deltaTime);
    this.updateParticles(deltaTime);
    this.updatePowerUpTimers(deltaTime);
    
    if (this.boss) {
      this.updateBoss(deltaTime);
    }
    
    this.checkCollisions();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  updatePlayer(deltaTime) {
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      this.player.x -= this.player.speed;
    }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      this.player.x += this.player.speed;
    }
    
    // Continuous shooting when spacebar is held
    if (this.keys[' ']) {
      this.shoot();
    }
    
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
    
    if (this.player.invulnerable) {
      this.player.invulnerabilityTimer -= deltaTime;
      if (this.player.invulnerabilityTimer <= 0) {
        this.player.invulnerable = false;
      }
    }
  }

  updateBullets(deltaTime) {
    this.bullets.forEach((bullet, index) => {
      // Move bullet up
      bullet.y -= bullet.speed;
      
      // Move bullet horizontally if it has vx (for spread shots)
      if (bullet.vx !== undefined) {
        bullet.x += bullet.vx;
      }
      
      // Remove bullets that go off screen
      if (bullet.y < 0 || bullet.x < 0 || bullet.x > this.canvas.width) {
        this.bullets.splice(index, 1);
      }
    });
  }

  updateEnemies(deltaTime) {
    if (this.enemies.length === 0) return;
    
    this.enemyMoveTimer += deltaTime;
    
    if (this.enemyMoveTimer >= this.enemyMoveDelay) {
      let shouldMoveDown = false;
      
      // Check if any enemy hits the edge
      for (let enemy of this.enemies) {
        if ((enemy.x <= 0 && this.enemyDirection === -1) || 
            (enemy.x >= this.canvas.width - enemy.width && this.enemyDirection === 1)) {
          shouldMoveDown = true;
          break;
        }
      }
      
      if (shouldMoveDown) {
        this.enemies.forEach(enemy => {
          enemy.y += 20;
        });
        this.enemyDirection *= -1;
      } else {
        this.enemies.forEach(enemy => {
          enemy.x += this.enemyDirection * 20;
        });
      }
      
      this.enemyMoveTimer = 0;
    }
    
    // Enemy shooting
    const settings = this.difficulties[this.difficulty];
    this.enemies.forEach(enemy => {
      if (enemy.type === 'shooter' || Math.random() < settings.enemyFireRate) {
        this.enemyShoot(enemy);
      }
    });
  }

  updateBoss(deltaTime) {
    if (!this.boss || !this.boss.alive) return;
    
    // Boss movement pattern
    this.boss.patternTimer += deltaTime;
    
    if (this.boss.patternTimer >= 2000) {
      this.boss.pattern = (this.boss.pattern + 1) % 3;
      this.boss.patternTimer = 0;
    }
    
    // Boss movement
    if (this.boss.pattern === 0) {
      this.boss.x += Math.sin(Date.now() * 0.002) * 2;
    } else if (this.boss.pattern === 1) {
      this.boss.x += this.boss.x < this.player.x ? 1 : -1;
    }
    
    this.boss.x = Math.max(0, Math.min(this.canvas.width - this.boss.width, this.boss.x));
    
    // Boss shooting patterns
    if (Math.random() < 0.02) {
      this.bossShoot();
    }
  }

  updateEnemyBullets(deltaTime) {
    this.enemyBullets.forEach((bullet, index) => {
      bullet.y += bullet.speed;
      
      if (bullet.y > this.canvas.height) {
        this.enemyBullets.splice(index, 1);
      }
    });
  }

  updatePowerUpDrops(deltaTime) {
    this.powerUpDrops.forEach((drop, index) => {
      drop.y += drop.speed;
      
      if (drop.y > this.canvas.height) {
        this.powerUpDrops.splice(index, 1);
      }
    });
  }

  updateParticles(deltaTime) {
    this.particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
      }
    });
  }

  updatePowerUpTimers(deltaTime) {
    Object.keys(this.activePowerUps).forEach(type => {
      if (this.activePowerUps[type].active) {
        this.activePowerUps[type].timer -= deltaTime;
        
        if (this.activePowerUps[type].timer <= 0) {
          this.activePowerUps[type].active = false;
        }
      }
    });
  }

  shoot() {
    if (this.gameState !== 'playing') return;
    
    const currentTime = Date.now();
    let fireRate = this.player.fireRate;
    
    if (this.activePowerUps.rapidFire.active) {
      fireRate /= 3;
    }
    
    // Check if enough time has passed since last shot
    if (this.player.lastShot !== 0 && currentTime - this.player.lastShot < fireRate) {
      return;
    }
    
    this.sounds.shoot();
    this.stats.shotsFired++;
    
    if (this.activePowerUps.spreadShot.active) {
      // Triple shot
      for (let i = -1; i <= 1; i++) {
        this.bullets.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y,
          width: 4,
          height: 10,
          speed: 8,
          vx: i * 2
        });
      }
    } else {
      // Single shot
      this.bullets.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y,
        width: 4,
        height: 10,
        speed: 8,
        vx: 0
      });
    }
    
    this.player.lastShot = currentTime;
  }

  enemyShoot(enemy) {
    this.sounds.enemyShoot();
    this.enemyBullets.push({
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height,
      width: 4,
      height: 8,
      speed: 3
    });
  }

  bossShoot() {
    if (!this.boss) return;
    
    const pattern = this.boss.pattern;
    
    if (pattern === 0) {
      // Spread pattern
      for (let i = -2; i <= 2; i++) {
        this.enemyBullets.push({
          x: this.boss.x + this.boss.width / 2,
          y: this.boss.y + this.boss.height,
          width: 6,
          height: 10,
          speed: 4,
          vx: i * 1.5,
          vy: 4
        });
      }
    } else if (pattern === 1) {
      // Direct shot at player
      const dx = this.player.x - this.boss.x;
      const dy = this.player.y - this.boss.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      this.enemyBullets.push({
        x: this.boss.x + this.boss.width / 2,
        y: this.boss.y + this.boss.height,
        width: 8,
        height: 12,
        speed: 5,
        vx: (dx / distance) * 3,
        vy: (dy / distance) * 3
      });
    } else {
      // Spiral pattern
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.01;
        this.enemyBullets.push({
          x: this.boss.x + this.boss.width / 2,
          y: this.boss.y + this.boss.height,
          width: 4,
          height: 8,
          speed: 3,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2 + 2
        });
      }
    }
  }

  checkCollisions() {
    // Player bullets vs enemies
    this.bullets.forEach((bullet, bulletIndex) => {
      this.enemies.forEach((enemy, enemyIndex) => {
        if (this.isColliding(bullet, enemy)) {
          this.bullets.splice(bulletIndex, 1);
          enemy.health--;
          
          this.createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff6b6b');
          
          if (enemy.health <= 0) {
            this.stats.score += this.enemyTypes[enemy.type].points;
            this.stats.kills++;
            this.stats.credits += Math.floor(this.enemyTypes[enemy.type].points / 10);
            
            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            this.sounds.explosion();
            
            // Power-up drop chance
            if (Math.random() < 0.1) {
              this.dropPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            }
            
            this.enemies.splice(enemyIndex, 1);
          }
        }
      });
      
      // Player bullets vs boss
      if (this.boss && this.boss.alive && this.isColliding(bullet, this.boss)) {
        this.bullets.splice(bulletIndex, 1);
        this.boss.health -= 5;
        
        this.createParticles(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, '#e74c3c');
        
        if (this.boss.health <= 0) {
          this.stats.score += 1000 * this.stats.wave;
          this.stats.kills++;
          this.stats.credits += 100;
          
          this.createExplosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
          this.sounds.explosion();
          
          this.boss.alive = false;
          this.boss = null;
        }
      }
    });
    
    // Enemy bullets vs player
    if (!this.player.invulnerable && !this.activePowerUps.shield.active) {
      this.enemyBullets.forEach((bullet, index) => {
        if (this.isColliding(bullet, this.player)) {
          this.enemyBullets.splice(index, 1);
          this.playerHit();
        }
      });
      
      // Enemies vs player
      this.enemies.forEach((enemy) => {
        if (this.isColliding(enemy, this.player)) {
          this.playerHit();
        }
      });
      
      // Boss vs player
      if (this.boss && this.boss.alive && this.isColliding(this.boss, this.player)) {
        this.playerHit();
      }
    }
    
    // Power-up drops vs player
    this.powerUpDrops.forEach((drop, index) => {
      if (this.isColliding(drop, this.player)) {
        this.collectPowerUpDrop(drop.type);
        this.powerUpDrops.splice(index, 1);
      }
    });
  }

  isColliding(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }

  playerHit() {
    this.stats.lives--;
    this.player.invulnerable = true;
    this.player.invulnerabilityTimer = 2000;
    
    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.sounds.explosion();
    
    this.updateDisplay();
  }

  dropPowerUp(x, y) {
    const types = ['rapidFire', 'spreadShot', 'shield', 'nuke'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    this.powerUpDrops.push({
      x: x - 15,
      y: y,
      width: 30,
      height: 30,
      speed: 2,
      type: type
    });
  }

  collectPowerUpDrop(type) {
    this.powerUps[type]++;
    this.sounds.powerUp();
    this.updatePowerUpDisplay();
  }

  usePowerUp(type) {
    if (this.powerUps[type] <= 0 || this.gameState !== 'playing') return;
    
    this.powerUps[type]--;
    this.sounds.powerUp();
    
    switch (type) {
      case 'rapidFire':
        this.activePowerUps.rapidFire.active = true;
        this.activePowerUps.rapidFire.timer = 10000;
        break;
      case 'spreadShot':
        this.activePowerUps.spreadShot.active = true;
        this.activePowerUps.spreadShot.timer = 8000;
        break;
      case 'shield':
        this.activePowerUps.shield.active = true;
        this.activePowerUps.shield.timer = 5000;
        break;
      case 'nuke':
        this.useNuke();
        break;
    }
    
    this.updatePowerUpDisplay();
  }

  useNuke() {
    this.enemies.forEach(enemy => {
      this.stats.score += this.enemyTypes[enemy.type].points;
      this.stats.kills++;
      this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    });
    
    this.enemies = [];
    this.enemyBullets = [];
    
    if (this.boss && this.boss.alive) {
      this.boss.health -= 50;
      this.createExplosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
      
      if (this.boss.health <= 0) {
        this.boss.alive = false;
        this.boss = null;
      }
    }
    
    this.sounds.explosion();
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color: color,
        size: Math.random() * 4 + 2,
        life: 500
      });
    }
  }

  createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        color: ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 6 + 3,
        life: 800
      });
    }
  }

  checkWaveComplete() {
    if (this.gameMode === 'boss-rush') {
      if (!this.boss || !this.boss.alive) {
        this.waveComplete();
      }
    } else {
      if (this.enemies.length === 0) {
        this.waveComplete();
      }
    }
  }

  waveComplete() {
    this.gameState = 'paused';
    
    const waveBonus = this.stats.wave * 100;
    this.stats.score += waveBonus;
    
    const accuracy = this.stats.shotsFired > 0 ? Math.round((this.stats.kills / this.stats.shotsFired) * 100) : 0;
    this.stats.accuracy = accuracy;
    
    document.getElementById('wave-bonus').textContent = waveBonus;
    document.getElementById('wave-accuracy').textContent = accuracy + '%';
    
    this.sounds.waveComplete();
    this.checkAchievements();
    this.elements.waveCompleteModal.classList.remove('hidden');
  }

  nextWave() {
    this.stats.wave++;
    
    if (this.stats.wave % 5 === 0 && this.gameMode !== 'boss-rush') {
      this.showBossModal();
    } else {
      if (this.gameMode === 'boss-rush') {
        this.spawnBoss();
      } else {
        this.spawnEnemyWave();
      }
      
      this.gameState = 'playing';
      this.gameLoop();
    }
    
    this.updateDisplay();
  }

  restartWave() {
    // Reset player position and clear projectiles
    this.player.x = this.canvas.width / 2 - 20;
    this.player.y = this.canvas.height - 60;
    this.player.invulnerable = false;
    this.player.invulnerabilityTimer = 0;
    
    // Clear all projectiles
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.powerUpDrops = [];
    
    // Reset power-ups
    this.activePowerUps = {
      rapidFire: { active: false, timer: 0 },
      spreadShot: { active: false, timer: 0 },
      shield: { active: false, timer: 0 }
    };
    
    // Respawn current wave
    if (this.gameMode === 'boss-rush' || (this.stats.wave % 5 === 0 && this.gameMode !== 'boss-rush')) {
      this.spawnBoss();
    } else {
      this.spawnEnemyWave();
    }
    
    // Resume the game
    this.gameState = 'playing';
    this.gameLoop();
    this.updateDisplay();
    this.updatePowerUpDisplay();
  }

  showBossModal() {
    const bossNames = ['Alien Overlord', 'Space Destroyer', 'Void Commander', 'Star Eater'];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];
    
    document.getElementById('boss-name').textContent = bossName;
    document.getElementById('boss-health').style.width = '100%';
    
    this.elements.bossModal.classList.remove('hidden');
  }

  checkGameOver() {
    if (this.stats.lives <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.gameState = 'stopped';
    
    this.updateLeaderboard();
    this.showGameOverModal();
    this.checkAchievements();
    this.updateButtons();
  }

  showGameOverModal() {
    document.getElementById('final-score').textContent = this.stats.score;
    document.getElementById('final-wave').textContent = this.stats.wave;
    document.getElementById('final-kills').textContent = this.stats.kills;
    
    this.elements.gameOverModal.classList.remove('hidden');
    
    if (this.stats.score > 0) {
      this.launchConfetti();
    }
  }

  checkAchievements() {
    if (this.stats.score >= 1000 && !this.hasAchievement('score_1k')) {
      this.unlockAchievement('score_1k', '🏆', 'Score Master');
    }
    
    if (this.stats.kills >= 50 && !this.hasAchievement('killer_50')) {
      this.unlockAchievement('killer_50', '💥', 'Exterminator');
    }
    
    if (this.stats.wave >= 10 && !this.hasAchievement('wave_10')) {
      this.unlockAchievement('wave_10', '🌊', 'Wave Rider');
    }
    
    if (this.stats.accuracy >= 80 && this.stats.shotsFired >= 20 && !this.hasAchievement('sniper')) {
      this.unlockAchievement('sniper', '🎯', 'Sniper');
    }
    
    if (this.boss && !this.boss.alive && !this.hasAchievement('boss_killer')) {
      this.unlockAchievement('boss_killer', '👾', 'Boss Killer');
    }
  }

  hasAchievement(id) {
    return this.achievements.some(a => a.id === id);
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
      this.sounds.achievement();
    }
  }

  render() {
    // Clear main canvas
    this.ctx.fillStyle = '#000814';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw stars background
    this.drawStars();
    
    // Draw player
    this.drawPlayer();
    
    // Draw enemies
    this.enemies.forEach(enemy => this.drawEnemy(enemy));
    
    // Draw boss
    if (this.boss && this.boss.alive) {
      this.drawBoss();
    }
    
    // Draw bullets
    this.bullets.forEach(bullet => this.drawBullet(bullet, '#00ffff'));
    this.enemyBullets.forEach(bullet => this.drawBullet(bullet, '#ff4444'));
    
    // Draw power-up drops
    this.powerUpDrops.forEach(drop => this.drawPowerUpDrop(drop));
    
    // Draw particles
    this.drawParticles();
    
    // Draw UI overlays
    this.drawShield();
    this.drawBossHealth();
  }

  drawStars() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % this.canvas.width;
      const y = (i * 97 + Date.now() * 0.1) % this.canvas.height;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  drawPlayer() {
    if (this.player.invulnerable && Math.floor(Date.now() / 100) % 2) return;
    
    this.ctx.fillStyle = this.activePowerUps.shield.active ? '#00ffff' : '#00ff00';
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // Draw player details
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(this.player.x + 10, this.player.y + 5, 20, 10);
    this.ctx.fillRect(this.player.x + 18, this.player.y, 4, 8);
  }

  drawEnemy(enemy) {
    const enemyType = this.enemyTypes[enemy.type];
    this.ctx.fillStyle = enemyType.color;
    this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    
    // Health indicator for damaged enemies
    if (enemy.health < enemy.maxHealth) {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
      this.ctx.fillStyle = '#00ff00';
      this.ctx.fillRect(enemy.x, enemy.y - 8, (enemy.health / enemy.maxHealth) * enemy.width, 4);
    }
  }

  drawBoss() {
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);
    
    // Boss eyes
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(this.boss.x + 15, this.boss.y + 15, 8, 8);
    this.ctx.fillRect(this.boss.x + 57, this.boss.y + 15, 8, 8);
    
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(this.boss.x + 17, this.boss.y + 17, 4, 4);
    this.ctx.fillRect(this.boss.x + 59, this.boss.y + 17, 4, 4);
  }

  drawBullet(bullet, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }

  drawPowerUpDrop(drop) {
    const colors = {
      rapidFire: '#ffff00',
      spreadShot: '#ff6600',
      shield: '#00ffff',
      nuke: '#ff0080'
    };
    
    this.ctx.fillStyle = colors[drop.type];
    this.ctx.fillRect(drop.x, drop.y, drop.width, drop.height);
    
    // Glow effect
    this.ctx.strokeStyle = colors[drop.type];
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(drop.x - 2, drop.y - 2, drop.width + 4, drop.height + 4);
  }

  drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.life / 800;
      this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    this.ctx.globalAlpha = 1;
  }

  drawShield() {
    if (!this.activePowerUps.shield.active) return;
    
    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 40, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawBossHealth() {
    if (!this.boss || !this.boss.alive) return;
    
    const barWidth = this.canvas.width - 40;
    const barHeight = 20;
    const barX = 20;
    const barY = 20;
    
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(barX, barY, (this.boss.health / this.boss.maxHealth) * barWidth, barHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('BOSS', this.canvas.width / 2, barY + 14);
  }

  updateDisplay() {
    this.elements.scoreEl.textContent = this.stats.score;
    this.elements.livesEl.textContent = this.stats.lives;
    this.elements.waveEl.textContent = this.stats.wave;
    this.elements.killsEl.textContent = this.stats.kills;
  }

  updateButtons() {
    this.elements.startBtn.disabled = this.gameState === 'playing';
    this.elements.pauseBtn.disabled = this.gameState === 'stopped';
    
    if (this.gameState === 'paused') {
      this.elements.pauseBtn.innerHTML = '<span>▶️</span> Resume';
    } else {
      this.elements.pauseBtn.innerHTML = '<span>⏸️</span> Pause';
    }
  }

  updatePowerUpDisplay() {
    const types = ['rapidFire', 'spreadShot', 'shield', 'nuke'];
    const ids = ['rapid-fire-power', 'spread-shot-power', 'shield-power', 'nuke-power'];
    
    types.forEach((type, index) => {
      const element = document.getElementById(ids[index]);
      const countEl = element.querySelector('.power-count');
      countEl.textContent = this.powerUps[type];
      
      element.classList.toggle('disabled', this.powerUps[type] <= 0);
      element.classList.toggle('active', this.activePowerUps[type]?.active || false);
    });
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.elements.soundBtn.innerHTML = this.soundEnabled ? 
      '<span>🔊</span> Sound On' : '<span>🔇</span> Sound Off';
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('spaceInvadersLeaderboard');
    return saved ? JSON.parse(saved) : {
      easy: [], medium: [], hard: [], insane: []
    };
  }

  updateLeaderboard() {
    const entry = {
      score: this.stats.score,
      wave: this.stats.wave,
      kills: this.stats.kills,
      date: new Date().toISOString()
    };
    
    if (!this.leaderboard[this.difficulty]) {
      this.leaderboard[this.difficulty] = [];
    }
    
    this.leaderboard[this.difficulty].push(entry);
    this.leaderboard[this.difficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.difficulty] = this.leaderboard[this.difficulty].slice(0, 10);
    
    localStorage.setItem('spaceInvadersLeaderboard', JSON.stringify(this.leaderboard));
  }

  showLeaderboard() {
    this.showLeaderboardTab(this.difficulty);
    this.elements.leaderboardModal.classList.remove('hidden');
  }

  showLeaderboardTab(difficulty) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === difficulty);
    });
    
    const entries = this.leaderboard[difficulty] || [];
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (entries.length === 0) {
      leaderboardList.innerHTML = '<li>No scores yet!</li>';
    } else {
      leaderboardList.innerHTML = entries
        .map((entry, index) => `
          <li>
            <span>#${index + 1} - ${entry.score}</span>
            <span>Wave ${entry.wave} | ${entry.kills} kills</span>
          </li>
        `)
        .join('');
    }
  }

  buyItem(item) {
    const costs = {
      'rapid-fire': 50,
      'spread-shot': 100,
      'shield': 75,
      'nuke': 200
    };
    
    const cost = costs[item];
    if (this.stats.credits >= cost) {
      this.stats.credits -= cost;
      
      const powerUpKey = item.replace('-', '');
      this.powerUps[powerUpKey]++;
      
      this.updatePowerUpDisplay();
      document.getElementById('credits').textContent = this.stats.credits;
      
      this.sounds.powerUp();
    }
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
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
        color: colors[Math.floor(Math.random() * colors.length)]
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
  new SpaceInvadersGame();
});