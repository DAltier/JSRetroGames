class WhacAMoleGame {
  constructor() {
    this.difficulties = {
      easy: {
        moleSpeed: 1500,
        moleStayTime: 2000,
        gameTime: 60,
        specialChance: 0.1,
      },
      medium: {
        moleSpeed: 1000,
        moleStayTime: 1500,
        gameTime: 60,
        specialChance: 0.15,
      },
      hard: {
        moleSpeed: 700,
        moleStayTime: 1000,
        gameTime: 45,
        specialChance: 0.2,
      },
      insane: {
        moleSpeed: 400,
        moleStayTime: 600,
        gameTime: 30,
        specialChance: 0.3,
      },
    };

    this.gameModes = {
      classic: { lives: Infinity, timeLimit: true },
      arcade: { lives: Infinity, timeLimit: true, powerUps: true },
      survival: { lives: 3, timeLimit: false, powerUps: true },
    };

    this.moleTypes = {
      normal: { emoji: '🐹', points: 10, penalty: 0 },
      golden: { emoji: '✨', points: 50, penalty: 0 },
      bomb: { emoji: '💣', points: 0, penalty: -20 },
      speed: { emoji: '⚡', points: 25, penalty: 0 },
    };

    this.currentDifficulty = 'easy';
    this.currentMode = 'classic';
    this.gameState = 'stopped'; // stopped, playing, paused

    // Game variables
    this.score = 0;
    this.timeLeft = 60;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = 3;
    this.hitCount = 0;
    this.missCount = 0;

    // Power-ups
    this.powerUps = {
      freeze: { count: 2, active: false, duration: 5000 },
      multiHit: { count: 1, active: false, duration: 10000 },
      slowMotion: { count: 2, active: false, duration: 8000 },
    };

    // Game timers
    this.gameTimer = null;
    this.moleTimer = null;
    this.powerUpTimers = {};

    // Active moles
    this.activeMoles = new Set();
    this.moleTimeouts = new Map();

    this.achievements = [];
    this.leaderboard = this.loadLeaderboard();
    this.soundEnabled = true;

    this.initializeElements();
    this.attachEventListeners();
    this.createSounds();
    this.updateDisplay();
  }

  initializeElements() {
    this.elements = {
      // Stats
      scoreEl: document.getElementById('score'),
      timeLeftEl: document.getElementById('time-left'),
      comboEl: document.getElementById('combo'),
      livesEl: document.getElementById('lives'),

      // Controls
      startBtn: document.getElementById('start-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      resetBtn: document.getElementById('reset-btn'),
      soundBtn: document.getElementById('sound-btn'),
      leaderboardBtn: document.getElementById('leaderboard-btn'),

      // Game board
      grid: document.getElementById('grid'),
      squares: document.querySelectorAll('.square'),
      moles: document.querySelectorAll('.mole'),

      // Modals
      gameOverModal: document.getElementById('game-over-modal'),
      pauseModal: document.getElementById('pause-modal'),
      leaderboardModal: document.getElementById('leaderboard-modal'),

      // Modal content
      finalScore: document.getElementById('final-score'),
      finalCombo: document.getElementById('final-combo'),
      finalAccuracy: document.getElementById('final-accuracy'),

      // Achievements
      achievementsList: document.getElementById('achievements-list'),

      // Other
      floatingScore: document.getElementById('floating-score'),
      confettiCanvas: document.getElementById('confetti-canvas'),
    };
  }

  attachEventListeners() {
    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeDifficulty(btn.dataset.level));
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
    });

    // Control buttons
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    this.elements.soundBtn.addEventListener('click', () => this.toggleSound());
    this.elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());

    // Power-ups
    document.getElementById('freeze-power').addEventListener('click', () => this.usePowerUp('freeze'));
    document.getElementById('multi-hit-power').addEventListener('click', () => this.usePowerUp('multiHit'));
    document.getElementById('slow-motion-power').addEventListener('click', () => this.usePowerUp('slowMotion'));

    // Mole clicks
    this.elements.squares.forEach((square, index) => {
      square.addEventListener('click', () => this.hitMole(index));
    });

    // Modal buttons
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.startGame();
    });

    document.getElementById('next-difficulty-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.nextDifficulty();
    });

    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

    // Leaderboard
    document.querySelector('.close-modal').addEventListener('click', () => {
      this.hideModal('leaderboard-modal');
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.showLeaderboardTab(btn.dataset.tab));
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
      hit: () => {
        if (this.soundEnabled) {
          createTone(800, 0.1);
          setTimeout(() => createTone(1000, 0.1), 50);
        }
      },
      miss: () => {
        if (this.soundEnabled) createTone(200, 0.3, 'sawtooth');
      },
      golden: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.15), i * 100);
          });
        }
      },
      bomb: () => {
        if (this.soundEnabled) {
          createTone(100, 0.5, 'sawtooth');
        }
      },
      powerUp: () => {
        if (this.soundEnabled) {
          createTone(1200, 0.1);
          setTimeout(() => createTone(1400, 0.1), 100);
          setTimeout(() => createTone(1600, 0.2), 200);
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
    this.resetGameVariables();
    this.updateDisplay();
    this.updateButtons();

    this.startGameTimer();
    this.startMoleSpawning();
  }

  resetGameVariables() {
    const settings = this.difficulties[this.currentDifficulty];
    const modeSettings = this.gameModes[this.currentMode];

    this.score = 0;
    this.timeLeft = settings.gameTime;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = modeSettings.lives === Infinity ? 3 : modeSettings.lives;
    this.hitCount = 0;
    this.missCount = 0;

    // Reset power-ups
    this.powerUps = {
      freeze: { count: 2, active: false, duration: 5000 },
      multiHit: { count: 1, active: false, duration: 10000 },
      slowMotion: { count: 2, active: false, duration: 8000 },
    };

    this.clearAllMoles();
    this.updatePowerUpDisplay();
  }

  startGameTimer() {
    if (this.gameModes[this.currentMode].timeLimit) {
      this.gameTimer = setInterval(() => {
        if (this.gameState === 'playing') {
          this.timeLeft--;
          this.elements.timeLeftEl.textContent = this.timeLeft;

          if (this.timeLeft <= 0) {
            this.endGame();
          }
        }
      }, 1000);
    }
  }

  startMoleSpawning() {
    const spawnMole = () => {
      if (this.gameState === 'playing') {
        this.spawnRandomMole();

        const settings = this.difficulties[this.currentDifficulty];
        let nextSpawnTime = settings.moleSpeed;

        if (this.powerUps.slowMotion.active) {
          nextSpawnTime *= 1.5;
        }

        this.moleTimer = setTimeout(spawnMole, nextSpawnTime);
      }
    };

    spawnMole();
  }

  spawnRandomMole() {
    const availableSquares = Array.from(this.elements.squares)
      .map((square, index) => index)
      .filter((index) => !this.activeMoles.has(index));

    if (availableSquares.length === 0) return;

    const randomIndex = availableSquares[Math.floor(Math.random() * availableSquares.length)];
    const moleType = this.determineMoleType();

    this.showMole(randomIndex, moleType);
  }

  determineMoleType() {
    const settings = this.difficulties[this.currentDifficulty];
    const rand = Math.random();

    if (rand < settings.specialChance * 0.3) return 'golden';
    if (rand < settings.specialChance * 0.5) return 'bomb';
    if (rand < settings.specialChance) return 'speed';
    return 'normal';
  }

  showMole(index, type) {
    const square = this.elements.squares[index];
    const mole = square.querySelector('.mole');

    mole.textContent = this.moleTypes[type].emoji;
    mole.dataset.type = type;

    square.classList.add('active');
    this.activeMoles.add(index);

    const settings = this.difficulties[this.currentDifficulty];
    let stayTime = type === 'speed' ? settings.moleStayTime * 0.5 : settings.moleStayTime;

    if (this.powerUps.freeze.active) {
      stayTime *= 2;
    }

    const timeout = setTimeout(() => {
      this.hideMole(index);
      if (this.currentMode === 'survival' && type !== 'bomb') {
        this.missedMole();
      }
    }, stayTime);

    this.moleTimeouts.set(index, timeout);
  }

  hideMole(index) {
    const square = this.elements.squares[index];
    square.classList.remove('active');
    this.activeMoles.delete(index);

    if (this.moleTimeouts.has(index)) {
      clearTimeout(this.moleTimeouts.get(index));
      this.moleTimeouts.delete(index);
    }
  }

  hitMole(index) {
    if (!this.activeMoles.has(index) || this.gameState !== 'playing') return;

    const square = this.elements.squares[index];
    const mole = square.querySelector('.mole');
    const moleType = mole.dataset.type;

    this.hideMole(index);
    square.classList.add('hit');

    setTimeout(() => square.classList.remove('hit'), 500);

    const moleData = this.moleTypes[moleType];
    let points = moleData.points;

    if (moleType === 'bomb') {
      this.sounds.bomb();
      this.handleBombHit();
      return;
    }

    // Apply combo multiplier
    this.combo++;
    if (this.combo > 1) {
      points *= Math.min(this.combo, 10);
    }

    this.score += points;
    this.hitCount++;

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Play sound
    if (moleType === 'golden') {
      this.sounds.golden();
    } else {
      this.sounds.hit();
    }

    // Show floating score
    this.showFloatingScore(points, index);

    this.updateDisplay();
    this.checkAchievements();
  }

  handleBombHit() {
    this.combo = 0;
    this.score = Math.max(0, this.score - 20);

    if (this.currentMode === 'survival') {
      this.lives--;
      if (this.lives <= 0) {
        this.endGame();
      }
    }

    this.updateDisplay();
  }

  missedMole() {
    this.combo = 0;
    this.missCount++;

    if (this.currentMode === 'survival') {
      this.lives--;
      if (this.lives <= 0) {
        this.endGame();
      }
    }

    this.sounds.miss();
    this.updateDisplay();
  }

  usePowerUp(type) {
    if (this.powerUps[type].count <= 0 || this.powerUps[type].active || this.gameState !== 'playing') {
      return;
    }

    this.powerUps[type].count--;
    this.powerUps[type].active = true;

    const powerUpElement = document.getElementById(type.replace(/([A-Z])/g, '-$1').toLowerCase() + '-power');
    powerUpElement.classList.add('active');

    this.sounds.powerUp();

    // Apply power-up effects
    switch (type) {
      case 'freeze':
        this.elements.grid.classList.add('game-frozen');
        break;
      case 'multiHit':
        this.elements.grid.classList.add('multi-hit-mode');
        break;
      case 'slowMotion':
        this.elements.grid.classList.add('slow-motion');
        break;
    }

    // Set timeout to deactivate
    this.powerUpTimers[type] = setTimeout(() => {
      this.deactivatePowerUp(type);
    }, this.powerUps[type].duration);

    this.updatePowerUpDisplay();
  }

  deactivatePowerUp(type) {
    this.powerUps[type].active = false;

    const powerUpElement = document.getElementById(type.replace(/([A-Z])/g, '-$1').toLowerCase() + '-power');
    powerUpElement.classList.remove('active');

    // Remove effects
    switch (type) {
      case 'freeze':
        this.elements.grid.classList.remove('game-frozen');
        break;
      case 'multiHit':
        this.elements.grid.classList.remove('multi-hit-mode');
        break;
      case 'slowMotion':
        this.elements.grid.classList.remove('slow-motion');
        break;
    }

    this.updatePowerUpDisplay();
  }

  showFloatingScore(points, moleIndex) {
    const square = this.elements.squares[moleIndex];
    const rect = square.getBoundingClientRect();

    this.elements.floatingScore.textContent = `+${points}`;
    this.elements.floatingScore.style.left = rect.left + rect.width / 2 + 'px';
    this.elements.floatingScore.style.top = rect.top + 'px';
    this.elements.floatingScore.classList.remove('hidden');

    setTimeout(() => {
      this.elements.floatingScore.classList.add('hidden');
    }, 1000);
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.elements.pauseModal.classList.remove('hidden');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.elements.pauseModal.classList.add('hidden');
    }
    this.updateButtons();
  }

  resetGame() {
    this.gameState = 'stopped';
    this.clearAllTimers();
    this.clearAllMoles();

    // Reset power-ups
    Object.keys(this.powerUps).forEach((type) => {
      if (this.powerUps[type].active) {
        this.deactivatePowerUp(type);
      }
    });

    this.resetGameVariables();
    this.updateDisplay();
    this.updateButtons();
    this.hideAllModals();
  }

  endGame() {
    this.gameState = 'stopped';
    this.clearAllTimers();
    this.clearAllMoles();

    this.sounds.gameOver();
    this.updateLeaderboard();
    this.showGameOverModal();
    this.launchConfetti();
    this.updateButtons();
  }

  clearAllTimers() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    if (this.moleTimer) {
      clearTimeout(this.moleTimer);
      this.moleTimer = null;
    }

    Object.values(this.powerUpTimers).forEach((timer) => clearTimeout(timer));
    this.powerUpTimers = {};
  }

  clearAllMoles() {
    this.activeMoles.forEach((index) => {
      this.hideMole(index);
    });
    this.activeMoles.clear();

    this.moleTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.moleTimeouts.clear();
  }

  checkAchievements() {
    if (this.score >= 100 && !this.hasAchievement('century')) {
      this.unlockAchievement('century', '💯', 'Century Club');
    }

    if (this.combo >= 10 && !this.hasAchievement('combo_master')) {
      this.unlockAchievement('combo_master', '🔥', 'Combo Master');
    }

    if (this.score >= 500 && !this.hasAchievement('high_scorer')) {
      this.unlockAchievement('high_scorer', '🏆', 'High Scorer');
    }

    if (this.hitCount >= 50 && !this.hasAchievement('sharpshooter')) {
      this.unlockAchievement('sharpshooter', '🎯', 'Sharpshooter');
    }

    const accuracy = this.hitCount / (this.hitCount + this.missCount);
    if (accuracy >= 0.9 && this.hitCount >= 20 && !this.hasAchievement('perfectionist')) {
      this.unlockAchievement('perfectionist', '✨', 'Perfectionist');
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

  updateDisplay() {
    this.elements.scoreEl.textContent = this.score;
    this.elements.timeLeftEl.textContent = this.timeLeft;
    this.elements.comboEl.textContent = this.combo;
    this.elements.livesEl.textContent = this.lives;
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
    Object.keys(this.powerUps).forEach((type) => {
      const elementId = type.replace(/([A-Z])/g, '-$1').toLowerCase() + '-power';
      const element = document.getElementById(elementId);
      const countEl = element.querySelector('.power-count');

      countEl.textContent = this.powerUps[type].count;
      element.classList.toggle('disabled', this.powerUps[type].count <= 0);
    });
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.elements.soundBtn.innerHTML = this.soundEnabled ? '<span>🔊</span> Sound On' : '<span>🔇</span> Sound Off';
  }

  showGameOverModal() {
    const accuracy = this.hitCount / (this.hitCount + this.missCount) || 0;

    this.elements.finalScore.textContent = this.score;
    this.elements.finalCombo.textContent = this.maxCombo;
    this.elements.finalAccuracy.textContent = Math.round(accuracy * 100) + '%';

    this.elements.gameOverModal.classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.add('hidden');
    });
  }

  nextDifficulty() {
    const difficulties = ['easy', 'medium', 'hard', 'insane'];
    const currentIndex = difficulties.indexOf(this.currentDifficulty);

    if (currentIndex < difficulties.length - 1) {
      this.changeDifficulty(difficulties[currentIndex + 1]);
    }

    this.startGame();
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('whacAMoleLeaderboard');
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
      combo: this.maxCombo,
      accuracy: Math.round((this.hitCount / (this.hitCount + this.missCount) || 0) * 100),
      date: new Date().toISOString(),
    };

    if (!this.leaderboard[this.currentDifficulty]) {
      this.leaderboard[this.currentDifficulty] = [];
    }

    this.leaderboard[this.currentDifficulty].push(entry);
    this.leaderboard[this.currentDifficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.currentDifficulty] = this.leaderboard[this.currentDifficulty].slice(0, 10);

    localStorage.setItem('whacAMoleLeaderboard', JSON.stringify(this.leaderboard));
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
                        <span>Combo: ${entry.combo} | Accuracy: ${entry.accuracy}%</span>
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
    const colors = ['#4facfe', '#00f2fe', '#667eea', '#764ba2', '#f093fb', '#f5576c'];

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
  new WhacAMoleGame();
});
