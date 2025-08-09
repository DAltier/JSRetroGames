class ConnectFourGame {
  constructor() {
    this.board = [];
    this.rows = 6;
    this.cols = 7;
    this.currentPlayer = 1;
    this.gameState = 'stopped';
    this.gameMode = 'vs-ai';
    this.difficulty = 'easy';

    this.stats = {
      score: 0,
      wins: 0,
      games: 0,
    };

    this.powerUps = {
      bomb: 2,
      wild: 1,
      clear: 1,
      block: 1,
    };

    this.activePowerUp = null;
    this.gameStartTime = null;
    this.gameTimer = null;
    this.moveHistory = [];

    this.achievements = [];
    this.leaderboard = this.loadLeaderboard();
    this.soundEnabled = true;

    this.tournament = {
      active: false,
      round: 0,
      maxRounds: 5,
      playerWins: 0,
      aiWins: 0,
    };

    this.playerNames = {
      1: 'Red Player',
      2: 'AI',
    };

    this.difficulties = {
      easy: { depth: 2, randomness: 0.3 },
      medium: { depth: 3, randomness: 0.2 },
      hard: { depth: 4, randomness: 0.1 },
      insane: { depth: 5, randomness: 0.05 },
    };

    this.initializeElements();
    this.attachEventListeners();
    this.createSounds();
    this.initializeBoard();
    this.updateDisplay();
  }

  initializeElements() {
    this.elements = {
      grid: document.getElementById('game-grid'),
      currentPlayer: document.getElementById('current-player'),
      score: document.getElementById('score'),
      wins: document.getElementById('wins'),
      games: document.getElementById('games'),
      time: document.getElementById('time'),
      redName: document.getElementById('red-name'),
      yellowName: document.getElementById('yellow-name'),

      startBtn: document.getElementById('start-btn'),
      resetBtn: document.getElementById('reset-btn'),
      hintBtn: document.getElementById('hint-btn'),
      soundBtn: document.getElementById('sound-btn'),
      leaderboardBtn: document.getElementById('leaderboard-btn'),

      gameOverModal: document.getElementById('game-over-modal'),
      tournamentModal: document.getElementById('tournament-modal'),
      leaderboardModal: document.getElementById('leaderboard-modal'),
      settingsModal: document.getElementById('settings-modal'),

      achievementsList: document.getElementById('achievements-list'),
      confettiCanvas: document.getElementById('confetti-canvas'),
    };
  }

  attachEventListeners() {
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeDifficulty(btn.dataset.level));
    });

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
    });

    this.elements.startBtn.addEventListener('click', () => this.startNewGame());
    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    this.elements.hintBtn.addEventListener('click', () => this.showHint());
    this.elements.soundBtn.addEventListener('click', () => this.toggleSound());
    this.elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());

    document.querySelectorAll('.power-up').forEach((powerUp) => {
      powerUp.addEventListener('click', () => {
        const type = powerUp.id.replace('-power', '').replace('-', '');
        this.selectPowerUp(type);
      });
    });

    document.querySelectorAll('.column-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => this.makeMove(index));
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('game-over-modal');
      this.startNewGame();
    });

    document.getElementById('tournament-next-btn').addEventListener('click', () => {
      this.nextTournamentRound();
    });

    document.querySelectorAll('.close-modal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        this.hideModal(modal.id);
      });
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.showLeaderboardTab(btn.dataset.tab));
    });

    document.addEventListener('keydown', (e) => {
      if (this.gameState !== 'playing') return;

      if (e.key >= '1' && e.key <= '7') {
        this.makeMove(parseInt(e.key) - 1);
      }

      if (e.key === 'h' || e.key === 'H') {
        this.showHint();
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
      drop: () => {
        if (this.soundEnabled) createTone(400, 0.2);
      },
      win: () => {
        if (this.soundEnabled) {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.3), i * 150);
          });
        }
      },
      powerUp: () => {
        if (this.soundEnabled) {
          createTone(800, 0.1);
          setTimeout(() => createTone(1000, 0.1), 100);
          setTimeout(() => createTone(1200, 0.2), 200);
        }
      },
      bomb: () => {
        if (this.soundEnabled) {
          createTone(200, 0.3, 'sawtooth');
        }
      },
      achievement: () => {
        if (this.soundEnabled) {
          const notes = [659.25, 783.99, 1046.5];
          notes.forEach((note, i) => {
            setTimeout(() => createTone(note, 0.2), i * 100);
          });
        }
      },
    };
  }

  initializeBoard() {
    this.board = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill(0));
    this.renderBoard();
  }

  renderBoard() {
    this.elements.grid.innerHTML = '';

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const value = this.board[row][col];
        if (value === 1) cell.classList.add('red');
        else if (value === 2) cell.classList.add('yellow');
        else if (value === 'bomb') cell.classList.add('bomb');
        else if (value === 'wild') cell.classList.add('wild');
        else if (value === 'block') cell.classList.add('block');

        cell.addEventListener('click', () => this.makeMove(col));

        this.elements.grid.appendChild(cell);
      }
    }
  }

  changeDifficulty(level) {
    this.difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
  }

  changeMode(mode) {
    this.gameMode = mode;
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update player names based on mode
    if (mode === 'vs-ai') {
      this.playerNames[2] = 'AI';
    } else {
      this.playerNames[2] = 'Yellow Player';
    }

    if (mode === 'tournament') {
      this.startTournament();
    }

    this.updateDisplay();
  }

  startNewGame() {
    this.initializeBoard();
    this.currentPlayer = 1;
    this.gameState = 'playing';
    this.gameStartTime = Date.now();
    this.moveHistory = [];
    this.activePowerUp = null;

    this.startTimer();
    this.updateDisplay();
    this.updatePowerUpDisplay();

    if (this.gameMode === 'tournament') {
      this.tournament.active = true;
    }
  }

  startTimer() {
    this.gameTimer = setInterval(() => {
      if (this.gameState === 'playing') {
        this.updateTimeDisplay();
      }
    }, 1000);
  }

  updateTimeDisplay() {
    if (!this.gameStartTime) return;

    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    this.elements.time.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  makeMove(col, isAIMove = false) {
    if (this.gameState !== 'playing' || !this.isValidMove(col)) return;

    if (this.gameMode === 'vs-ai' && this.currentPlayer === 2 && !isAIMove) return;

    const row = this.getLowestEmptyRow(col);
    if (row === -1) return;

    let cellValue = this.currentPlayer;

    if (this.activePowerUp && !isAIMove) {
      cellValue = this.activePowerUp;
      this.usePowerUp(this.activePowerUp, row, col);
      this.activePowerUp = null;
    }

    this.board[row][col] = cellValue;
    this.moveHistory.push({ row, col, player: this.currentPlayer, value: cellValue });

    this.sounds.drop();
    this.animateMove(row, col);

    setTimeout(() => {
      if (this.checkWin(row, col)) {
        this.gameWin();
      } else if (this.isBoardFull()) {
        this.gameDraw();
      } else {
        this.switchPlayer();

        if (this.gameMode === 'vs-ai' && this.currentPlayer === 2) {
          setTimeout(() => this.makeAIMove(), 1000);
        }
      }
    }, 500);
  }

  isValidMove(col) {
    return col >= 0 && col < this.cols && this.board[0][col] === 0;
  }

  getLowestEmptyRow(col) {
    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.board[row][col] === 0) {
        return row;
      }
    }
    return -1;
  }

  animateMove(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      this.renderBoard();
    }
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.updateDisplay();
  }

  makeAIMove() {
    if (this.gameState !== 'playing') return;

    const bestMove = this.getBestMove();
    if (bestMove !== -1) {
      this.makeMove(bestMove, true);
    }
  }

  getBestMove() {
    const settings = this.difficulties[this.difficulty];

    if (Math.random() < settings.randomness) {
      const validMoves = [];
      for (let col = 0; col < this.cols; col++) {
        if (this.isValidMove(col)) {
          validMoves.push(col);
        }
      }
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let col = 0; col < this.cols; col++) {
      if (this.isValidMove(col)) {
        const row = this.getLowestEmptyRow(col);
        this.board[row][col] = 2;

        const score = this.minimax(settings.depth, false, -Infinity, Infinity);

        this.board[row][col] = 0;

        if (score > bestScore) {
          bestScore = score;
          bestMove = col;
        }
      }
    }

    return bestMove;
  }

  minimax(depth, isMaximizing, alpha, beta) {
    const winner = this.checkBoardWinner();

    if (winner === 2) return 100 + depth;
    if (winner === 1) return -100 - depth;
    if (depth === 0 || this.isBoardFull()) return this.evaluateBoard();

    if (isMaximizing) {
      let maxScore = -Infinity;

      for (let col = 0; col < this.cols; col++) {
        if (this.isValidMove(col)) {
          const row = this.getLowestEmptyRow(col);
          this.board[row][col] = 2;

          const score = this.minimax(depth - 1, false, alpha, beta);
          this.board[row][col] = 0;

          maxScore = Math.max(score, maxScore);
          alpha = Math.max(alpha, score);

          if (beta <= alpha) break;
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;

      for (let col = 0; col < this.cols; col++) {
        if (this.isValidMove(col)) {
          const row = this.getLowestEmptyRow(col);
          this.board[row][col] = 1;

          const score = this.minimax(depth - 1, true, alpha, beta);
          this.board[row][col] = 0;

          minScore = Math.min(score, minScore);
          beta = Math.min(beta, score);

          if (beta <= alpha) break;
        }
      }
      return minScore;
    }
  }

  evaluateBoard() {
    let score = 0;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols - 3; col++) {
        score += this.evaluateWindow([this.board[row][col], this.board[row][col + 1], this.board[row][col + 2], this.board[row][col + 3]]);
      }
    }

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows - 3; row++) {
        score += this.evaluateWindow([this.board[row][col], this.board[row + 1][col], this.board[row + 2][col], this.board[row + 3][col]]);
      }
    }

    for (let row = 0; row < this.rows - 3; row++) {
      for (let col = 0; col < this.cols - 3; col++) {
        score += this.evaluateWindow([this.board[row][col], this.board[row + 1][col + 1], this.board[row + 2][col + 2], this.board[row + 3][col + 3]]);

        score += this.evaluateWindow([this.board[row + 3][col], this.board[row + 2][col + 1], this.board[row + 1][col + 2], this.board[row][col + 3]]);
      }
    }

    return score;
  }

  evaluateWindow(window) {
    let score = 0;

    const ai = window.filter((cell) => cell === 2).length;
    const player = window.filter((cell) => cell === 1).length;
    const empty = window.filter((cell) => cell === 0).length;

    if (ai === 4) score += 100;
    else if (ai === 3 && empty === 1) score += 10;
    else if (ai === 2 && empty === 2) score += 2;

    if (player === 4) score -= 100;
    else if (player === 3 && empty === 1) score -= 80;
    else if (player === 2 && empty === 2) score -= 2;

    return score;
  }

  checkWin(row, col) {
    const player = this.board[row][col];
    if (player === 0 || typeof player !== 'number') return false;

    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      for (let i = 1; i < 4; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;

        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols && (this.board[newRow][newCol] === player || this.board[newRow][newCol] === 'wild')) {
          count++;
        } else break;
      }

      for (let i = 1; i < 4; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;

        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols && (this.board[newRow][newCol] === player || this.board[newRow][newCol] === 'wild')) {
          count++;
        } else break;
      }

      if (count >= 4) {
        this.highlightWinningCells(row, col, dx, dy, player);
        return true;
      }
    }

    return false;
  }

  checkBoardWinner() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] === 1 || this.board[row][col] === 2) {
          if (this.checkWin(row, col)) {
            return this.board[row][col];
          }
        }
      }
    }
    return null;
  }

  highlightWinningCells(row, col, dx, dy, player) {
    const winningCells = [[row, col]];

    for (let i = 1; i < 4; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;

      if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols && (this.board[newRow][newCol] === player || this.board[newRow][newCol] === 'wild')) {
        winningCells.push([newRow, newCol]);
      } else break;
    }

    for (let i = 1; i < 4; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;

      if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols && (this.board[newRow][newCol] === player || this.board[newRow][newCol] === 'wild')) {
        winningCells.push([newRow, newCol]);
      } else break;
    }

    winningCells.slice(0, 4).forEach(([r, c]) => {
      const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (cell) cell.classList.add('winning');
    });
  }

  isBoardFull() {
    return this.board[0].every((cell) => cell !== 0);
  }

  gameWin() {
    this.gameState = 'finished';
    clearInterval(this.gameTimer);

    this.sounds.win();

    if (this.currentPlayer === 1) {
      this.stats.wins++;
      this.stats.score += 100;
    }

    this.stats.games++;
    this.updateStats();
    this.checkAchievements();

    if (this.tournament.active) {
      this.updateTournamentScore();
    } else {
      this.updateLeaderboard();
    }

    setTimeout(() => this.showGameOverModal(), 1000);
  }

  gameDraw() {
    this.gameState = 'finished';
    clearInterval(this.gameTimer);

    this.stats.games++;
    this.stats.score += 25;
    this.updateStats();

    setTimeout(() => this.showGameOverModal(true), 1000);
  }

  showGameOverModal(draw = false) {
    const modal = this.elements.gameOverModal;
    const title = document.getElementById('game-over-title');
    const winner = document.getElementById('final-winner');
    const moves = document.getElementById('final-moves');
    const time = document.getElementById('final-time');

    if (draw) {
      title.textContent = "🤝 It's a Draw!";
      winner.textContent = 'Draw';
    } else {
      title.textContent = this.currentPlayer === 1 ? '🎉 You Win!' : '🤖 AI Wins!';
      winner.textContent = this.currentPlayer === 1 ? this.playerNames[1] : this.playerNames[2];
    }

    moves.textContent = this.moveHistory.length;
    time.textContent = this.elements.time.textContent;

    modal.classList.remove('hidden');

    if (this.currentPlayer === 1 && !draw) {
      this.launchConfetti();
    }
  }

  selectPowerUp(type) {
    if (this.powerUps[type] <= 0 || this.gameState !== 'playing') return;

    this.activePowerUp = type;
    this.updatePowerUpDisplay();
  }

  usePowerUp(type, row, col) {
    this.powerUps[type]--;
    this.sounds.powerUp();

    switch (type) {
      case 'bomb':
        this.bombPowerUp(row, col);
        break;
      case 'wild':
        break;
      case 'clear':
        this.clearRowPowerUp(row);
        break;
      case 'block':
        break;
    }

    this.updatePowerUpDisplay();
  }

  bombPowerUp(row, col) {
    this.sounds.bomb();

    const radius = 1;
    for (let r = Math.max(0, row - radius); r <= Math.min(this.rows - 1, row + radius); r++) {
      for (let c = Math.max(0, col - radius); c <= Math.min(this.cols - 1, col + radius); c++) {
        if (r !== row || c !== col) {
          this.board[r][c] = 0;
        }
      }
    }

    this.dropPieces();
  }

  clearRowPowerUp(row) {
    for (let col = 0; col < this.cols; col++) {
      this.board[row][col] = 0;
    }

    this.dropPieces();
  }

  dropPieces() {
    for (let col = 0; col < this.cols; col++) {
      const pieces = [];

      for (let row = this.rows - 1; row >= 0; row--) {
        if (this.board[row][col] !== 0) {
          pieces.push(this.board[row][col]);
          this.board[row][col] = 0;
        }
      }

      for (let i = 0; i < pieces.length; i++) {
        this.board[this.rows - 1 - i][col] = pieces[i];
      }
    }

    this.renderBoard();
  }

  showHint() {
    if (this.gameState !== 'playing' || this.gameMode === 'vs-human') return;

    const bestMove = this.getBestMove();
    if (bestMove !== -1) {
      const columnBtn = document.querySelector(`[data-col="${bestMove}"]`);
      if (columnBtn) {
        columnBtn.classList.add('active');
        setTimeout(() => columnBtn.classList.remove('active'), 2000);
      }
    }
  }

  startTournament() {
    this.tournament = {
      active: true,
      round: 0,
      maxRounds: 5,
      playerWins: 0,
      aiWins: 0,
    };

    this.startNewGame();
  }

  nextTournamentRound() {
    this.hideModal('game-over-modal');

    if (this.tournament.round < this.tournament.maxRounds) {
      this.startNewGame();
    } else {
      this.showTournamentResults();
    }
  }

  updateTournamentScore() {
    if (this.currentPlayer === 1) {
      this.tournament.playerWins++;
    } else {
      this.tournament.aiWins++;
    }

    this.tournament.round++;
  }

  showTournamentResults() {
    const modal = this.elements.tournamentModal;
    const standings = document.getElementById('tournament-standings');

    const playerScore = this.tournament.playerWins;
    const aiScore = this.tournament.aiWins;

    standings.innerHTML = `
      <div class="tournament-round">
        <h4>Final Results</h4>
        <p>${this.playerNames[1]}: ${playerScore} wins</p>
        <p>${this.playerNames[2]}: ${aiScore} wins</p>
        <p><strong>Winner: ${playerScore > aiScore ? this.playerNames[1] : aiScore > playerScore ? this.playerNames[2] : 'Tie'}</strong></p>
      </div>
    `;

    modal.classList.remove('hidden');
    this.tournament.active = false;
  }

  checkAchievements() {
    if (this.stats.wins >= 5 && !this.hasAchievement('first_wins')) {
      this.unlockAchievement('first_wins', '🏆', 'First Wins');
    }

    if (this.stats.games >= 10 && !this.hasAchievement('dedicated_player')) {
      this.unlockAchievement('dedicated_player', '🎮', 'Dedicated Player');
    }

    if (this.moveHistory.length <= 10 && this.currentPlayer === 1 && !this.hasAchievement('quick_win')) {
      this.unlockAchievement('quick_win', '⚡', 'Quick Win');
    }

    if (this.stats.score >= 1000 && !this.hasAchievement('high_scorer')) {
      this.unlockAchievement('high_scorer', '🌟', 'High Scorer');
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
      this.sounds.achievement();
    }
  }

  resetGame() {
    this.gameState = 'stopped';
    clearInterval(this.gameTimer);

    this.initializeBoard();
    this.currentPlayer = 1;
    this.gameStartTime = null;
    this.moveHistory = [];
    this.activePowerUp = null;

    this.powerUps = {
      bomb: 2,
      wild: 1,
      clear: 1,
      block: 1,
    };

    this.updateDisplay();
    this.updatePowerUpDisplay();
    this.hideAllModals();
  }

  updateDisplay() {
    this.elements.currentPlayer.textContent = `${this.playerNames[this.currentPlayer]}'s Turn`;
    this.elements.score.textContent = this.stats.score;
    this.elements.wins.textContent = this.stats.wins;
    this.elements.games.textContent = this.stats.games;

    this.elements.redName.textContent = this.playerNames[1];
    this.elements.yellowName.textContent = this.playerNames[2];
  }

  updatePowerUpDisplay() {
    Object.keys(this.powerUps).forEach((type) => {
      const element = document.getElementById(`${type}-power`);
      if (element) {
        const countEl = element.querySelector('.power-count');
        countEl.textContent = this.powerUps[type];

        element.classList.toggle('disabled', this.powerUps[type] <= 0);
        element.classList.toggle('active', this.activePowerUp === type);
      }
    });
  }

  updateStats() {
    const stats = {
      score: this.stats.score,
      wins: this.stats.wins,
      games: this.stats.games,
    };

    localStorage.setItem('connectFourStats', JSON.stringify(stats));
  }

  loadLeaderboard() {
    const saved = localStorage.getItem('connectFourLeaderboard');
    return saved
      ? JSON.parse(saved)
      : {
          easy: [],
          medium: [],
          hard: [],
          insane: [],
        };
  }

  updateLeaderboard() {
    const entry = {
      score: this.stats.score,
      wins: this.stats.wins,
      games: this.stats.games,
      date: new Date().toISOString(),
    };

    if (!this.leaderboard[this.difficulty]) {
      this.leaderboard[this.difficulty] = [];
    }

    this.leaderboard[this.difficulty].push(entry);
    this.leaderboard[this.difficulty].sort((a, b) => b.score - a.score);
    this.leaderboard[this.difficulty] = this.leaderboard[this.difficulty].slice(0, 10);

    localStorage.setItem('connectFourLeaderboard', JSON.stringify(this.leaderboard));
  }

  showLeaderboard() {
    this.showLeaderboardTab(this.difficulty);
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
            <span>Wins: ${entry.wins}/${entry.games}</span>
          </li>
        `
        )
        .join('');
    }
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
  new ConnectFourGame();
});
