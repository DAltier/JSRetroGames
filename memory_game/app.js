class MemoryGame {
  constructor() {
    this.themes = {
      food: [
        { name: 'pizza', emoji: '🍕', img: null },
        { name: 'burger', emoji: '🍔', img: null },
        { name: 'fries', emoji: '🍟', img: null },
        { name: 'hotdog', emoji: '🌭', img: null },
        { name: 'ice-cream', emoji: '🍦', img: null },
        { name: 'milkshake', emoji: '🥤', img: null },
        { name: 'donut', emoji: '🍩', img: null },
        { name: 'cookie', emoji: '🍪', img: null },
        { name: 'cake', emoji: '🍰', img: null },
        { name: 'sushi', emoji: '🍱', img: null },
        { name: 'taco', emoji: '🌮', img: null },
        { name: 'popcorn', emoji: '🍿', img: null },
        { name: 'chocolate', emoji: '🍫', img: null },
        { name: 'candy', emoji: '🍬', img: null },
        { name: 'apple', emoji: '🍎', img: null },
        { name: 'banana', emoji: '🍌', img: null },
        { name: 'grapes', emoji: '🍇', img: null },
        { name: 'watermelon', emoji: '🍉', img: null },
      ],
      animals: [
        { name: 'lion', emoji: '🦁' },
        { name: 'tiger', emoji: '🐯' },
        { name: 'elephant', emoji: '🐘' },
        { name: 'monkey', emoji: '🐵' },
        { name: 'panda', emoji: '🐼' },
        { name: 'koala', emoji: '🐨' },
        { name: 'penguin', emoji: '🐧' },
        { name: 'dolphin', emoji: '🐬' },
        { name: 'whale', emoji: '🐋' },
        { name: 'octopus', emoji: '🐙' },
        { name: 'butterfly', emoji: '🦋' },
        { name: 'bee', emoji: '🐝' },
        { name: 'ladybug', emoji: '🐞' },
        { name: 'spider', emoji: '🕷️' },
        { name: 'cat', emoji: '🐱' },
        { name: 'dog', emoji: '🐶' },
        { name: 'rabbit', emoji: '🐰' },
        { name: 'hamster', emoji: '🐹' },
      ],
      emoji: [
        { name: 'happy', emoji: '😀' },
        { name: 'love', emoji: '😍' },
        { name: 'cool', emoji: '😎' },
        { name: 'wink', emoji: '😉' },
        { name: 'laugh', emoji: '😂' },
        { name: 'think', emoji: '🤔' },
        { name: 'sleep', emoji: '😴' },
        { name: 'star', emoji: '🤩' },
        { name: 'heart', emoji: '❤️' },
        { name: 'fire', emoji: '🔥' },
        { name: 'rainbow', emoji: '🌈' },
        { name: 'sun', emoji: '☀️' },
        { name: 'moon', emoji: '🌙' },
        { name: 'cloud', emoji: '☁️' },
        { name: 'lightning', emoji: '⚡' },
        { name: 'snowflake', emoji: '❄️' },
        { name: 'party', emoji: '🎉' },
        { name: 'gift', emoji: '🎁' },
      ],
      space: [
        { name: 'rocket', emoji: '🚀' },
        { name: 'astronaut', emoji: '👨‍🚀' },
        { name: 'alien', emoji: '👽' },
        { name: 'ufo', emoji: '🛸' },
        { name: 'satellite', emoji: '🛰️' },
        { name: 'earth', emoji: '🌍' },
        { name: 'moon', emoji: '🌕' },
        { name: 'sun', emoji: '☀️' },
        { name: 'star', emoji: '⭐' },
        { name: 'comet', emoji: '☄️' },
        { name: 'galaxy', emoji: '🌌' },
        { name: 'saturn', emoji: '🪐' },
        { name: 'telescope', emoji: '🔭' },
        { name: 'meteor', emoji: '💫' },
        { name: 'mars', emoji: '🔴' },
        { name: 'venus', emoji: '🟡' },
        { name: 'jupiter', emoji: '🟤' },
        { name: 'neptune', emoji: '🔵' },
      ],
    };

    this.difficulties = {
      easy: { cols: 4, rows: 3, pairs: 6 },
      medium: { cols: 4, rows: 4, pairs: 8 },
      hard: { cols: 6, rows: 4, pairs: 12 },
      expert: { cols: 6, rows: 6, pairs: 18 },
    };

    this.currentDifficulty = 'easy';
    this.currentTheme = 'food';
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.combo = 0;
    this.timer = 0;
    this.timerInterval = null;
    this.isPaused = false;
    this.soundEnabled = true;

    this.powerUps = {
      peek: 3,
      hint: 2,
      shuffle: 1,
    };

    this.achievements = [];
    this.leaderboard = this.loadLeaderboard();

    this.initializeElements();
    this.attachEventListeners();
    this.createSounds();
    this.startNewGame();
  }

  initializeElements() {
    this.elements = {
      grid: document.getElementById('grid'),
      timerEl: document.getElementById('timer'),
      movesEl: document.getElementById('moves'),
      scoreEl: document.getElementById('score'),
      bestScoreEl: document.getElementById('best-score'),
      comboIndicator: document.getElementById('combo-indicator'),
      comboCount: document.getElementById('combo-count'),
      peekCount: document.getElementById('peek-count'),
      hintCount: document.getElementById('hint-count'),
      shuffleCount: document.getElementById('shuffle-count'),
      achievementsList: document.getElementById('achievements-list'),
      gameOverModal: document.getElementById('game-over-modal'),
      pauseModal: document.getElementById('pause-modal'),
      leaderboardModal: document.getElementById('leaderboard-modal'),
      leaderboardList: document.getElementById('leaderboard-list'),
      finalTime: document.getElementById('final-time'),
      finalMoves: document.getElementById('final-moves'),
      finalScore: document.getElementById('final-score'),
      starRating: document.getElementById('star-rating'),
      soundBtn: document.getElementById('sound-btn'),
      confettiCanvas: document.getElementById('confetti-canvas'),
    };

    this.updateBestScore();
  }

  attachEventListeners() {
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeDifficulty(btn.dataset.level));
    });

    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeTheme(btn.dataset.theme));
    });

    document.getElementById('peek-btn').addEventListener('click', () => this.usePowerUp('peek'));
    document.getElementById('hint-btn').addEventListener('click', () => this.usePowerUp('hint'));
    document.getElementById('shuffle-btn').addEventListener('click', () => this.usePowerUp('shuffle'));

    document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
    document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('sound-btn').addEventListener('click', () => this.toggleSound());
    document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.startNewGame();
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.nextLevel();
    });

    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

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
      flip: () => {
        if (this.soundEnabled) createTone(600, 0.1);
      },
      match: () => {
        if (this.soundEnabled) {
          createTone(523.25, 0.1);
          setTimeout(() => createTone(659.25, 0.1), 100);
          setTimeout(() => createTone(783.99, 0.2), 200);
        }
      },
      mismatch: () => {
        if (this.soundEnabled) createTone(200, 0.3, 'sawtooth');
      },
      powerUp: () => {
        if (this.soundEnabled) {
          createTone(800, 0.05);
          setTimeout(() => createTone(1000, 0.05), 50);
          setTimeout(() => createTone(1200, 0.1), 100);
        }
      },
      win: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 587.33, 659.25, 783.99, 880, 987.77];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.2), i * 100);
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
    this.startNewGame();
  }

  changeTheme(theme) {
    this.currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    this.startNewGame();
  }

  startNewGame() {
    this.stopTimer();
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.combo = 0;
    this.timer = 0;
    this.flippedCards = [];

    this.powerUps = {
      peek: 3,
      hint: 2,
      shuffle: 1,
    };

    this.updatePowerUpDisplay();
    this.updateDisplay();
    this.createBoard();
    this.startTimer();
  }

  createBoard() {
    const difficulty = this.difficulties[this.currentDifficulty];
    const theme = this.themes[this.currentTheme];

    this.elements.grid.innerHTML = '';
    this.elements.grid.className = `grid ${this.currentDifficulty}`;

    const pairs = [];
    for (let i = 0; i < difficulty.pairs; i++) {
      const item = theme[i % theme.length];
      pairs.push(item, item);
    }

    this.cards = this.shuffle(pairs);

    this.cards.forEach((card, index) => {
      const cardElement = this.createCard(card, index);
      this.elements.grid.appendChild(cardElement);
    });
  }

  createCard(cardData, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;

    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';

    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';

    if (cardData.img && this.currentTheme === 'food') {
      const img = document.createElement('img');
      img.src = cardData.img;
      img.style.width = '80%';
      img.style.height = '80%';
      img.style.objectFit = 'contain';
      cardBack.appendChild(img);
    } else {
      cardBack.textContent = cardData.emoji;
    }

    card.appendChild(cardFront);
    card.appendChild(cardBack);

    card.addEventListener('click', () => this.flipCard(card, index));

    return card;
  }

  flipCard(cardElement, index) {
    if (this.isPaused) return;
    if (cardElement.classList.contains('flipped')) return;
    if (cardElement.classList.contains('matched')) return;
    if (this.flippedCards.length >= 2) return;

    this.sounds.flip();
    cardElement.classList.add('flipped');
    this.flippedCards.push({ element: cardElement, index });

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateDisplay();
      setTimeout(() => this.checkMatch(), 800);
    }
  }

  checkMatch() {
    const [card1, card2] = this.flippedCards;
    const isMatch = this.cards[card1.index].name === this.cards[card2.index].name;

    if (isMatch) {
      this.handleMatch(card1, card2);
    } else {
      this.handleMismatch(card1, card2);
    }

    this.flippedCards = [];
  }

  handleMatch(card1, card2) {
    this.sounds.match();
    card1.element.classList.add('matched');
    card2.element.classList.add('matched');

    this.matchedPairs++;
    this.combo++;

    const comboBonus = Math.min(this.combo, 5) * 10;
    const timeBonus = Math.max(0, 100 - this.timer);
    this.score += 100 + comboBonus + timeBonus;

    if (this.combo > 1) {
      this.showCombo();
    }

    this.updateDisplay();
    this.checkAchievements();

    if (this.matchedPairs === this.difficulties[this.currentDifficulty].pairs) {
      this.gameOver();
    }
  }

  handleMismatch(card1, card2) {
    this.sounds.mismatch();
    this.combo = 0;

    setTimeout(() => {
      card1.element.classList.remove('flipped');
      card2.element.classList.remove('flipped');
    }, 200);
  }

  showCombo() {
    this.elements.comboCount.textContent = this.combo;
    this.elements.comboIndicator.classList.add('show');

    setTimeout(() => {
      this.elements.comboIndicator.classList.remove('show');
    }, 1500);
  }

  usePowerUp(type) {
    if (this.isPaused) return;
    if (this.powerUps[type] <= 0) return;

    this.sounds.powerUp();
    this.powerUps[type]--;
    this.updatePowerUpDisplay();

    switch (type) {
      case 'peek':
        this.peekAllCards();
        break;
      case 'hint':
        this.showHint();
        break;
      case 'shuffle':
        this.shuffleUnmatched();
        break;
    }
  }

  peekAllCards() {
    const unmatched = document.querySelectorAll('.card:not(.matched):not(.flipped)');
    unmatched.forEach((card) => {
      card.classList.add('flipped');
    });

    setTimeout(() => {
      unmatched.forEach((card) => {
        if (!card.classList.contains('matched')) {
          card.classList.remove('flipped');
        }
      });
    }, 2000);
  }

  showHint() {
    const unmatched = Array.from(document.querySelectorAll('.card:not(.matched)'));
    if (unmatched.length < 2) return;

    const pairs = {};
    unmatched.forEach((card) => {
      const index = parseInt(card.dataset.index);
      const name = this.cards[index].name;
      if (!pairs[name]) pairs[name] = [];
      pairs[name].push(card);
    });

    for (const name in pairs) {
      if (pairs[name].length >= 2) {
        pairs[name][0].classList.add('hint');
        pairs[name][1].classList.add('hint');

        setTimeout(() => {
          pairs[name][0].classList.remove('hint');
          pairs[name][1].classList.remove('hint');
        }, 1000);
        break;
      }
    }
  }

  shuffleUnmatched() {
    const unmatched = Array.from(document.querySelectorAll('.card:not(.matched)'));
    const unmatchedIndexes = unmatched.map((card) => parseInt(card.dataset.index));
    const unmatchedCards = unmatchedIndexes.map((i) => this.cards[i]);

    const shuffled = this.shuffle(unmatchedCards);

    unmatchedIndexes.forEach((originalIndex, i) => {
      this.cards[originalIndex] = shuffled[i];
    });

    unmatched.forEach((card) => {
      card.classList.remove('flipped');
    });

    setTimeout(() => {
      this.createBoard();

      document.querySelectorAll('.card').forEach((card, index) => {
        if (this.cards[index].matched) {
          card.classList.add('matched', 'flipped');
        }
      });
    }, 300);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.timer++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.elements.pauseModal.classList.remove('hidden');
    } else {
      this.elements.pauseModal.classList.add('hidden');
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.elements.soundBtn.innerHTML = this.soundEnabled ? '<span>🔊</span> Sound On' : '<span>🔇</span> Sound Off';
  }

  gameOver() {
    this.stopTimer();
    this.sounds.win();

    const stars = this.calculateStars();
    this.updateLeaderboard();
    this.showGameOverModal(stars);
    this.launchConfetti();
  }

  calculateStars() {
    const efficiency = this.matchedPairs / this.moves;
    const timeScore = Math.max(0, 300 - this.timer) / 300;
    const totalScore = (efficiency + timeScore) / 2;

    if (totalScore > 0.8) return 3;
    if (totalScore > 0.5) return 2;
    return 1;
  }

  showGameOverModal(stars) {
    this.elements.finalTime.textContent = this.formatTime(this.timer);
    this.elements.finalMoves.textContent = this.moves;
    this.elements.finalScore.textContent = this.score;

    const starElements = this.elements.starRating.querySelectorAll('.star');
    starElements.forEach((star, index) => {
      setTimeout(() => {
        star.classList.toggle('empty', index >= stars);
      }, index * 200);
    });

    this.elements.gameOverModal.classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  nextLevel() {
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    const currentIndex = difficulties.indexOf(this.currentDifficulty);

    if (currentIndex < difficulties.length - 1) {
      this.changeDifficulty(difficulties[currentIndex + 1]);
    } else {
      this.startNewGame();
    }
  }

  checkAchievements() {
    if (this.combo === 3 && !this.hasAchievement('combo_3')) {
      this.unlockAchievement('combo_3', '🔥', 'Combo x3');
    }

    if (this.combo === 5 && !this.hasAchievement('combo_5')) {
      this.unlockAchievement('combo_5', '💥', 'Combo Master');
    }

    if (this.matchedPairs === 10 && this.moves <= 15 && !this.hasAchievement('efficient')) {
      this.unlockAchievement('efficient', '🎯', 'Efficient');
    }

    if (this.timer <= 30 && this.matchedPairs === this.difficulties[this.currentDifficulty].pairs && !this.hasAchievement('speedster')) {
      this.unlockAchievement('speedster', '⚡', 'Speedster');
    }

    if (this.score >= 1000 && !this.hasAchievement('high_scorer')) {
      this.unlockAchievement('high_scorer', '🏆', 'High Scorer');
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
    this.elements.movesEl.textContent = this.moves;
    this.elements.scoreEl.textContent = this.score;
  }

  updateTimerDisplay() {
    this.elements.timerEl.textContent = this.formatTime(this.timer);
  }

  updatePowerUpDisplay() {
    this.elements.peekCount.textContent = this.powerUps.peek;
    this.elements.hintCount.textContent = this.powerUps.hint;
    this.elements.shuffleCount.textContent = this.powerUps.shuffle;

    document.getElementById('peek-btn').classList.toggle('disabled', this.powerUps.peek <= 0);
    document.getElementById('hint-btn').classList.toggle('disabled', this.powerUps.hint <= 0);
    document.getElementById('shuffle-btn').classList.toggle('disabled', this.powerUps.shuffle <= 0);
  }

  updateBestScore() {
    const best = this.leaderboard[this.currentDifficulty]?.[0]?.score || 0;
    this.elements.bestScoreEl.textContent = best;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('memoryGameLeaderboard');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      easy: [],
      medium: [],
      hard: [],
      expert: [],
    };
  }

  updateLeaderboard() {
    const entry = {
      score: this.score,
      moves: this.moves,
      time: this.timer,
      date: new Date().toISOString(),
    };

    if (!this.leaderboard[this.currentDifficulty]) {
      this.leaderboard[this.currentDifficulty] = [];
    }

    this.leaderboard[this.currentDifficulty].push(entry);
    this.leaderboard[this.currentDifficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.currentDifficulty] = this.leaderboard[this.currentDifficulty].slice(0, 10);

    localStorage.setItem('memoryGameLeaderboard', JSON.stringify(this.leaderboard));
    this.updateBestScore();
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

    if (entries.length === 0) {
      this.elements.leaderboardList.innerHTML = '<li>No scores yet!</li>';
    } else {
      this.elements.leaderboardList.innerHTML = entries
        .map(
          (entry, index) => `
                    <li>
                        <span>#${index + 1} - Score: ${entry.score}</span>
                        <span>${this.formatTime(entry.time)} - ${entry.moves} moves</span>
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
  new MemoryGame();
});
