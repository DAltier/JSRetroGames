class FroggerGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.difficulties = {
      easy: {
        vehicleSpeed: 1,
        logSpeed: 0.8,
        vehicleSpawnRate: 0.02,
        timeLimit: 90,
        lanes: 5
      },
      medium: {
        vehicleSpeed: 1.5,
        logSpeed: 1,
        vehicleSpawnRate: 0.03,
        timeLimit: 60,
        lanes: 6
      },
      hard: {
        vehicleSpeed: 2,
        logSpeed: 1.3,
        vehicleSpawnRate: 0.04,
        timeLimit: 45,
        lanes: 7
      },
      insane: {
        vehicleSpeed: 2.5,
        logSpeed: 1.6,
        vehicleSpawnRate: 0.05,
        timeLimit: 30,
        lanes: 8
      }
    };

    this.gameModes = {
      classic: { lives: 3, powerUps: false },
      'time-attack': { lives: 1, powerUps: true, timerMultiplier: 1.5 },
      endless: { lives: 5, powerUps: true, endless: true }
    };

    this.currentDifficulty = 'easy';
    this.currentMode = 'classic';
    this.gameState = 'stopped';
    
    // Game dimensions
    this.gridSize = 13;
    this.cellSize = 50;
    
    // Player
    this.player = null;
    
    // Game objects
    this.vehicles = [];
    this.logs = [];
    this.turtles = [];
    this.collectibles = [];
    this.particles = [];
    
    // Game variables
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.timeLeft = 60;
    this.frogsSaved = 0;
    this.homesFilled = [];
    
    // Power-up counts
    this.powerUpCounts = {
      speedBoost: 3,
      invincible: 2,
      freeze: 2,
      jump: 1
    };
    
    // Active power-ups
    this.activePowerUps = {
      speedBoost: { active: false, timer: 0 },
      invincible: { active: false, timer: 0 },
      freeze: { active: false, timer: 0 }
    };
    
    // Controls
    this.keys = {};
    
    // Timers
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
      timeEl: document.getElementById('time'),
      levelEl: document.getElementById('level'),
      
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
      finalFrogs: document.getElementById('final-frogs'),

      levelScore: document.getElementById('level-score'),
      levelBonus: document.getElementById('level-bonus'),

      achievementsList: document.getElementById('achievements-list'),
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
    document.getElementById('speed-boost-power').addEventListener('click', () => this.usePowerUp('speedBoost'));
    document.getElementById('invincible-power').addEventListener('click', () => this.usePowerUp('invincible'));
    document.getElementById('freeze-power').addEventListener('click', () => this.usePowerUp('freeze'));
    document.getElementById('jump-power').addEventListener('click', () => this.usePowerUp('jump'));

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

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showLeaderboardTab(btn.dataset.tab));
    });

    // Controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      
      if (this.gameState === 'playing') {
        this.handlePlayerMovement(e.key);
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
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
      hop: () => {
        if (this.soundEnabled) createTone(400, 0.1);
      },
      splash: () => {
        if (this.soundEnabled) createTone(150, 0.3, 'sawtooth');
      },
      collect: () => {
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
      home: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.2), i * 100);
          });
        }
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
      }
    };
  }

  changeDifficulty(level) {
    this.currentDifficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
    
    if (this.gameState !== 'playing') {
      this.resetGame();
    }
  }

  changeMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    if (this.gameState !== 'playing') {
      this.resetGame();
    }
  }

  startGame() {
    this.gameState = 'playing';
    this.updateButtons();
    this.startTimer();
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
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }

    const settings = this.difficulties[this.currentDifficulty];
    const modeSettings = this.gameModes[this.currentMode];

    this.score = 0;
    this.lives = modeSettings.lives;
    this.level = 1;
    this.timeLeft = settings.timeLimit;
    this.frogsSaved = 0;
    this.homesFilled = [];

    // Reset power-ups
    this.powerUpCounts = {
      speedBoost: 3,
      invincible: 2,
      freeze: 2,
      jump: 1
    };

    this.activePowerUps = {
      speedBoost: { active: false, timer: 0 },
      invincible: { active: false, timer: 0 },
      freeze: { active: false, timer: 0 }
    };

    this.initializeLevel();
    this.updateDisplay();
    this.updateButtons();
    this.updatePowerUpDisplay();
    this.hideAllModals();
  }

  initializeLevel() {
    // Initialize player
    this.player = {
      x: 6,
      y: 12,
      width: 0.8,
      height: 0.8,
      onLog: false,
      logSpeed: 0
    };

    // Initialize vehicles
    this.vehicles = [];
    this.initializeVehicles();

    // Initialize logs and turtles
    this.logs = [];
    this.turtles = [];
    this.initializeRiver();

    // Initialize collectibles
    this.collectibles = [];
    this.spawnCollectibles();

    // Clear particles
    this.particles = [];
  }

  initializeVehicles() {
    const settings = this.difficulties[this.currentDifficulty];
    
    // Road lanes (rows 7-11)
    for (let lane = 7; lane <= 11; lane++) {
      const direction = lane % 2 === 0 ? 1 : -1;
      const speed = settings.vehicleSpeed * (0.8 + Math.random() * 0.4) * direction;
      
      for (let i = 0; i < 3; i++) {
        this.vehicles.push({
          x: i * 5,
          y: lane,
          width: 1.5,
          height: 0.8,
          speed: speed,
          type: Math.random() > 0.5 ? 'car' : 'truck'
        });
      }
    }
  }

  initializeRiver() {
    const settings = this.difficulties[this.currentDifficulty];
    
    // River lanes (rows 1-5)
    for (let lane = 1; lane <= 5; lane++) {
      const direction = lane % 2 === 0 ? 1 : -1;
      const speed = settings.logSpeed * (0.6 + Math.random() * 0.4) * direction;
      
      if (lane === 3) {
        // Turtle lane
        for (let i = 0; i < 4; i++) {
          this.turtles.push({
            x: i * 4,
            y: lane,
            width: 2,
            height: 0.8,
            speed: speed,
            diving: false,
            diveTimer: Math.random() * 200
          });
        }
      } else {
        // Log lanes
        for (let i = 0; i < 3; i++) {
          this.logs.push({
            x: i * 5,
            y: lane,
            width: 2 + Math.random() * 2,
            height: 0.8,
            speed: speed
          });
        }
      }
    }
  }

  spawnCollectibles() {
    if (Math.random() < 0.02 && this.collectibles.length < 3) {
      this.collectibles.push({
        x: Math.floor(Math.random() * 13),
        y: Math.floor(Math.random() * 11) + 1,
        type: Math.random() > 0.7 ? 'bonus' : 'fly',
        value: Math.random() > 0.7 ? 500 : 100,
        timer: 300
      });
    }
  }

  handlePlayerMovement(key) {
    const moveSpeed = this.activePowerUps.speedBoost.active ? 2 : 1;
    const oldX = this.player.x;
    const oldY = this.player.y;

    this.sounds.hop();

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (this.player.y > 0) {
          this.player.y -= moveSpeed;
          this.score += 10;
        }
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (this.player.y < 12) this.player.y += moveSpeed;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (this.player.x > 0) this.player.x -= moveSpeed;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (this.player.x < 12) this.player.x += moveSpeed;
        break;
      case ' ':
        if (this.powerUpCounts.jump > 0) {
          this.usePowerUp('jump');
        }
        break;
    }

    // Create speed trail effect
    if (this.activePowerUps.speedBoost.active) {
      this.createSpeedTrail(oldX, oldY);
    }

    this.updateDisplay();
  }

  usePowerUp(type) {
    if (this.powerUpCounts[type] <= 0 || this.gameState !== 'playing') return;
    
    this.powerUpCounts[type]--;
    this.sounds.powerUp();
    
    switch (type) {
      case 'speedBoost':
        this.activatePowerUp('speedBoost', 300);
        break;
      case 'invincible':
        this.activatePowerUp('invincible', 300);
        break;
      case 'freeze':
        this.activatePowerUp('freeze', 200);
        break;
      case 'jump':
        // Super jump - move 3 spaces forward
        if (this.player.y >= 3) {
          this.player.y -= 3;
          this.score += 30;
          this.createJumpEffect();
        }
        break;
    }
    
    this.updatePowerUpDisplay();
  }

  activatePowerUp(type, duration) {
    this.activePowerUps[type].active = true;
    this.activePowerUps[type].timer = duration;
    this.updatePowerUpDisplay();
  }

  gameLoop() {
    if (this.gameState !== 'playing') return;

    this.update();
    this.render();
    this.checkCollisions();
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Update vehicles
    if (!this.activePowerUps.freeze.active) {
      this.vehicles.forEach(vehicle => {
        vehicle.x += vehicle.speed * 0.05;
        if (vehicle.x > 14) vehicle.x = -2;
        if (vehicle.x < -2) vehicle.x = 14;
      });

      // Update logs
      this.logs.forEach(log => {
        log.x += log.speed * 0.03;
        if (log.x > 14) log.x = -log.width;
        if (log.x < -log.width) log.x = 14;
      });

      // Update turtles
      this.turtles.forEach(turtle => {
        turtle.x += turtle.speed * 0.03;
        if (turtle.x > 14) turtle.x = -turtle.width;
        if (turtle.x < -turtle.width) turtle.x = 14;
        
        // Diving mechanic
        turtle.diveTimer--;
        if (turtle.diveTimer <= 0) {
          turtle.diving = !turtle.diving;
          turtle.diveTimer = 100 + Math.random() * 100;
        }
      });
    }

    // Update collectibles
    this.collectibles.forEach((collectible, index) => {
      collectible.timer--;
      if (collectible.timer <= 0) {
        this.collectibles.splice(index, 1);
      }
    });

    // Update particles
    this.particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
      }
    });

    // Update power-up timers
    Object.keys(this.activePowerUps).forEach(type => {
      if (this.activePowerUps[type].active) {
        this.activePowerUps[type].timer--;
        
        if (this.activePowerUps[type].timer <= 0) {
          this.activePowerUps[type].active = false;
          this.updatePowerUpDisplay();
        }
      }
    });

    // Spawn new collectibles
    this.spawnCollectibles();

    // Move player with log
    if (this.player.onLog) {
      this.player.x += this.player.logSpeed * 0.03;
      
      // Check if player fell off the edge
      if (this.player.x < 0 || this.player.x > 12) {
        this.handleDeath();
      }
    }
  }

  checkCollisions() {
    const playerRow = Math.round(this.player.y);
    
    // Check home zones
    if (playerRow === 0) {
      const homeIndex = Math.round(this.player.x);
      if ([1, 3, 5, 7, 9, 11].includes(homeIndex)) {
        if (!this.homesFilled.includes(homeIndex)) {
          this.homesFilled.push(homeIndex);
          this.frogsSaved++;
          this.score += 500;
          this.sounds.home();
          this.resetPlayerPosition();
          
          if (this.homesFilled.length >= 5) {
            this.levelComplete();
          }
        }
      } else {
        this.handleDeath();
      }
      return;
    }

    // Check water
    if (playerRow >= 1 && playerRow <= 5) {
      let onPlatform = false;
      
      // Check logs
      this.logs.forEach(log => {
        if (Math.abs(log.y - this.player.y) < 0.5 &&
            this.player.x >= log.x - 0.4 &&
            this.player.x <= log.x + log.width - 0.4) {
          onPlatform = true;
          this.player.onLog = true;
          this.player.logSpeed = log.speed;
        }
      });
      
      // Check turtles
      this.turtles.forEach(turtle => {
        if (!turtle.diving &&
            Math.abs(turtle.y - this.player.y) < 0.5 &&
            this.player.x >= turtle.x - 0.4 &&
            this.player.x <= turtle.x + turtle.width - 0.4) {
          onPlatform = true;
          this.player.onLog = true;
          this.player.logSpeed = turtle.speed;
        }
      });
      
      if (!onPlatform) {
        this.player.onLog = false;
        if (!this.activePowerUps.invincible.active) {
          this.handleDeath();
        }
      }
    } else {
      this.player.onLog = false;
    }

    // Check vehicles
    if (!this.activePowerUps.invincible.active) {
      this.vehicles.forEach(vehicle => {
        if (Math.abs(vehicle.y - this.player.y) < 0.5 &&
            Math.abs(vehicle.x - this.player.x) < 0.8) {
          this.handleDeath();
        }
      });
    }

    // Check collectibles
    this.collectibles.forEach((collectible, index) => {
      if (Math.abs(collectible.y - this.player.y) < 0.5 &&
          Math.abs(collectible.x - this.player.x) < 0.5) {
        this.score += collectible.value;
        this.sounds.collect();
        this.createCollectEffect(collectible.x, collectible.y);
        this.collectibles.splice(index, 1);
        this.checkAchievements();
      }
    });
  }

  handleDeath() {
    if (this.activePowerUps.invincible.active) return;
    
    this.sounds.splash();
    this.createDeathEffect();
    this.lives--;
    
    if (this.lives > 0) {
      this.resetPlayerPosition();
    } else {
      this.gameOver();
    }
    
    this.updateDisplay();
  }

  resetPlayerPosition() {
    this.player.x = 6;
    this.player.y = 12;
    this.player.onLog = false;
    this.player.logSpeed = 0;
  }

  startTimer() {
    this.gameTimer = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timeLeft--;
        this.elements.timeEl.textContent = this.timeLeft;
        
        if (this.timeLeft <= 0) {
          this.handleDeath();
        }
      }
    }, 1000);
  }

  levelComplete() {
    this.sounds.levelComplete();
    
    const timeBonus = this.timeLeft * 10;
    this.score += timeBonus;
    
    this.elements.levelScore.textContent = this.score;
    this.elements.levelBonus.textContent = timeBonus;
    
    this.gameState = 'paused';
    this.elements.levelCompleteModal.classList.remove('hidden');
    
    this.checkAchievements();
    this.updateDisplay();
  }

  nextLevel() {
    this.level++;
    this.homesFilled = [];
    const settings = this.difficulties[this.currentDifficulty];
    this.timeLeft = settings.timeLimit;
    
    // Increase difficulty
    this.difficulties[this.currentDifficulty].vehicleSpeed *= 1.1;
    this.difficulties[this.currentDifficulty].logSpeed *= 1.1;
    
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

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw zones
    this.drawZones();
    
    // Draw home zones
    this.drawHomes();
    
    // Draw logs
    this.logs.forEach(log => {
      this.ctx.fillStyle = '#8B4513';
      this.ctx.fillRect(
        log.x * this.cellSize,
        log.y * this.cellSize,
        log.width * this.cellSize,
        log.height * this.cellSize
      );
    });
    
    // Draw turtles
    this.turtles.forEach(turtle => {
      this.ctx.fillStyle = turtle.diving ? '#2c3e50' : '#228B22';
      this.ctx.fillRect(
        turtle.x * this.cellSize,
        turtle.y * this.cellSize,
        turtle.width * this.cellSize,
        turtle.height * this.cellSize
      );
    });
    
    // Draw vehicles
    this.vehicles.forEach(vehicle => {
      this.ctx.fillStyle = vehicle.type === 'car' ? '#FF0000' : '#FFA500';
      this.ctx.fillRect(
        vehicle.x * this.cellSize,
        vehicle.y * this.cellSize,
        vehicle.width * this.cellSize,
        vehicle.height * this.cellSize
      );
    });
    
    // Draw collectibles
    this.collectibles.forEach(collectible => {
      this.ctx.fillStyle = collectible.type === 'bonus' ? '#FFD700' : '#00FF00';
      this.ctx.beginPath();
      this.ctx.arc(
        (collectible.x + 0.5) * this.cellSize,
        (collectible.y + 0.5) * this.cellSize,
        10,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });
    
    // Draw player
    if (this.activePowerUps.invincible.active) {
      this.ctx.globalAlpha = 0.7;
    }
    
    this.ctx.fillStyle = '#00FF00';
    this.ctx.fillRect(
      this.player.x * this.cellSize,
      this.player.y * this.cellSize,
      this.player.width * this.cellSize,
      this.player.height * this.cellSize
    );
    
    // Draw frog emoji
    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '🐸',
      (this.player.x + 0.4) * this.cellSize,
      (this.player.y + 0.7) * this.cellSize
    );
    
    this.ctx.globalAlpha = 1;
    
    // Draw particles
    this.particles.forEach(particle => {
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.life / 30;
      this.ctx.fillRect(
        particle.x * this.cellSize,
        particle.y * this.cellSize,
        particle.size,
        particle.size
      );
    });
    this.ctx.globalAlpha = 1;
  }

  drawZones() {
    // Draw water
    this.ctx.fillStyle = '#4169E1';
    this.ctx.fillRect(0, this.cellSize, this.canvas.width, 5 * this.cellSize);
    
    // Draw middle safe zone
    this.ctx.fillStyle = '#90EE90';
    this.ctx.fillRect(0, 6 * this.cellSize, this.canvas.width, this.cellSize);
    
    // Draw road
    this.ctx.fillStyle = '#696969';
    this.ctx.fillRect(0, 7 * this.cellSize, this.canvas.width, 5 * this.cellSize);
    
    // Draw starting zone
    this.ctx.fillStyle = '#90EE90';
    this.ctx.fillRect(0, 12 * this.cellSize, this.canvas.width, this.cellSize);
  }

  drawHomes() {
    for (let i = 1; i <= 11; i += 2) {
      const filled = this.homesFilled.includes(i);
      this.ctx.fillStyle = filled ? '#FFD700' : '#228B22';
      this.ctx.fillRect(i * this.cellSize, 0, this.cellSize, this.cellSize);
      
      if (filled) {
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🐸', (i + 0.5) * this.cellSize, 35);
      }
    }
  }

  createSpeedTrail(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        color: '#00FF00',
        size: 5,
        life: 15
      });
    }
  }

  createJumpEffect() {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y + 1,
        vx: (Math.random() - 0.5) * 0.2,
        vy: Math.random() * -0.2,
        color: '#FFFF00',
        size: 8,
        life: 20
      });
    }
  }

  createDeathEffect() {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: '#FF0000',
        size: 10,
        life: 30
      });
    }
  }

  createCollectEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        color: '#FFD700',
        size: 6,
        life: 25
      });
    }
  }

  showGameOverModal() {
    this.elements.finalScore.textContent = this.score;
    this.elements.finalLevel.textContent = this.level;
    this.elements.finalFrogs.textContent = this.frogsSaved;
    
    this.elements.gameOverModal.classList.remove('hidden');
  }

  checkAchievements() {
    if (this.score >= 5000 && !this.hasAchievement('high_scorer')) {
      this.unlockAchievement('high_scorer', '🏆', 'High Scorer');
    }
    
    if (this.frogsSaved >= 10 && !this.hasAchievement('frog_savior')) {
      this.unlockAchievement('frog_savior', '🐸', 'Frog Savior');
    }
    
    if (this.level >= 5 && !this.hasAchievement('level_master')) {
      this.unlockAchievement('level_master', '🌟', 'Level Master');
    }
    
    if (this.lives === 3 && this.level >= 3 && !this.hasAchievement('survivor')) {
      this.unlockAchievement('survivor', '💪', 'Survivor');
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
      this.sounds.powerUp();
    }
  }

  updateDisplay() {
    this.elements.scoreEl.textContent = this.score;
    this.elements.livesEl.textContent = this.lives;
    this.elements.timeEl.textContent = this.timeLeft;
    this.elements.levelEl.textContent = this.level;
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
    Object.keys(this.powerUpCounts).forEach(type => {
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
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('froggerLeaderboard');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      easy: [],
      medium: [],
      hard: [],
      insane: []
    };
  }

  updateLeaderboard() {
    const entry = {
      score: this.score,
      level: this.level,
      frogs: this.frogsSaved,
      date: new Date().toISOString()
    };

    if (!this.leaderboard[this.currentDifficulty]) {
      this.leaderboard[this.currentDifficulty] = [];
    }

    this.leaderboard[this.currentDifficulty].push(entry);
    this.leaderboard[this.currentDifficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.currentDifficulty] = this.leaderboard[this.currentDifficulty].slice(0, 10);

    localStorage.setItem('froggerLeaderboard', JSON.stringify(this.leaderboard));
  }

  showLeaderboard() {
    this.showLeaderboardTab(this.currentDifficulty);
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
            <span>#${index + 1} - Score: ${entry.score}</span>
            <span>Level: ${entry.level} | Frogs: ${entry.frogs}</span>
          </li>
        `)
        .join('');
    }
  }

  launchConfetti() {
    const canvas = this.elements.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#2ecc71', '#27ae60', '#3498db', '#2980b9', '#f39c12', '#e67e22'];

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
  new FroggerGame();
});