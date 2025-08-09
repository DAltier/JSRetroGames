class RockPaperScissors {
  constructor() {
    this.choices = {
      classic: ['rock', 'paper', 'scissors'],
      special: ['rock', 'paper', 'scissors', 'lizard', 'spock'],
    };

    this.emojis = {
      rock: '✊',
      paper: '✋',
      scissors: '✌️',
      lizard: '🦎',
      spock: '🖖',
      unknown: '❓',
    };

    this.rules = {
      classic: {
        rock: ['scissors'],
        paper: ['rock'],
        scissors: ['paper'],
      },
      special: {
        rock: ['scissors', 'lizard'],
        paper: ['rock', 'spock'],
        scissors: ['paper', 'lizard'],
        lizard: ['spock', 'paper'],
        spock: ['scissors', 'rock'],
      },
    };

    this.currentMode = 'classic';
    this.playerScore = 0;
    this.computerScore = 0;
    this.round = 1;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.tournamentRound = 1;
    this.tournamentWins = 0;
    this.tournamentLosses = 0;
    this.soundEnabled = true;

    this.stats = this.loadStats();
    this.achievements = [];

    this.initializeElements();
    this.attachEventListeners();
    this.createSoundEffects();
    this.updateDisplay();
    this.checkAchievements();
  }

  initializeElements() {
    this.elements = {
      playerScoreEl: document.getElementById('player-score'),
      computerScoreEl: document.getElementById('computer-score'),
      playerStreakEl: document.getElementById('player-streak'),
      computerStreakEl: document.getElementById('computer-streak'),
      roundEl: document.getElementById('round'),
      currentModeEl: document.getElementById('current-mode'),
      playerChoiceEmoji: document.getElementById('player-choice-emoji'),
      computerChoiceEmoji: document.getElementById('computer-choice-emoji'),
      playerChoiceContainer: document.getElementById('player-choice-container'),
      computerChoiceContainer: document.getElementById('computer-choice-container'),
      resultMessage: document.getElementById('result-message'),
      specialChoices: document.getElementById('special-choices'),
      tournamentBracket: document.getElementById('tournament-bracket'),
      tournamentRoundEl: document.getElementById('tournament-round'),
      tournamentProgress: document.getElementById('tournament-progress'),
      achievementList: document.getElementById('achievement-list'),
      statsModal: document.getElementById('stats-modal'),
      soundToggle: document.getElementById('sound-toggle'),
      modeBtns: document.querySelectorAll('.mode-btn'),
      choiceBtns: document.querySelectorAll('.choice-btn'),
      resetBtn: document.getElementById('reset-btn'),
      statsBtn: document.getElementById('stats-btn'),
      closeModal: document.querySelector('.close-modal'),
      winSound: document.getElementById('win-sound'),
      loseSound: document.getElementById('lose-sound'),
      drawSound: document.getElementById('draw-sound'),
      clickSound: document.getElementById('click-sound'),
    };
  }

  attachEventListeners() {
    this.elements.modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
    });

    this.elements.choiceBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.playRound(btn.dataset.choice));
    });

    this.elements.resetBtn.addEventListener('click', () => this.resetGame());
    this.elements.statsBtn.addEventListener('click', () => this.showStats());
    this.elements.closeModal.addEventListener('click', () => this.hideStats());
    this.elements.soundToggle.addEventListener('click', () => this.toggleSound());

    window.addEventListener('click', (e) => {
      if (e.target === this.elements.statsModal) {
        this.hideStats();
      }
    });
  }

  createSoundEffects() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const createTone = (frequency, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    this.sounds = {
      win: () => {
        if (this.soundEnabled) {
          createTone(523.25, 0.1);
          setTimeout(() => createTone(659.25, 0.1), 100);
          setTimeout(() => createTone(783.99, 0.2), 200);
        }
      },
      lose: () => {
        if (this.soundEnabled) {
          createTone(392, 0.2);
          setTimeout(() => createTone(349.23, 0.3), 200);
        }
      },
      draw: () => {
        if (this.soundEnabled) {
          createTone(440, 0.15);
          setTimeout(() => createTone(440, 0.15), 150);
        }
      },
      click: () => {
        if (this.soundEnabled) {
          createTone(880, 0.05);
        }
      },
    };
  }

  changeMode(mode) {
    this.sounds.click();
    this.currentMode = mode;

    this.elements.modeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'special') {
      this.elements.specialChoices.classList.remove('hidden');
      this.elements.currentModeEl.textContent = 'Special Mode (Lizard-Spock)';
    } else {
      this.elements.specialChoices.classList.add('hidden');
      this.elements.currentModeEl.textContent = mode === 'tournament' ? 'Tournament Mode' : 'Classic Mode';
    }

    if (mode === 'tournament') {
      this.elements.tournamentBracket.classList.remove('hidden');
      this.resetTournament();
    } else {
      this.elements.tournamentBracket.classList.add('hidden');
    }

    this.resetGame();
  }

  playRound(playerChoice) {
    this.sounds.click();

    const choices = this.currentMode === 'special' ? this.choices.special : this.choices.classic;
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];

    this.animateChoices(playerChoice, computerChoice);

    setTimeout(() => {
      const result = this.determineWinner(playerChoice, computerChoice);
      this.updateScore(result);
      this.displayResult(result, playerChoice, computerChoice);

      if (this.currentMode === 'tournament') {
        this.updateTournament(result);
      }

      this.checkAchievements();
      this.saveStats();
    }, 1000);
  }

  animateChoices(playerChoice, computerChoice) {
    this.elements.playerChoiceContainer.classList.add('shake');
    this.elements.computerChoiceContainer.classList.add('shake');

    setTimeout(() => {
      this.elements.playerChoiceEmoji.textContent = this.emojis[playerChoice];
      this.elements.computerChoiceEmoji.textContent = this.emojis[computerChoice];

      this.elements.playerChoiceContainer.classList.remove('shake');
      this.elements.computerChoiceContainer.classList.remove('shake');
    }, 500);
  }

  determineWinner(playerChoice, computerChoice) {
    if (playerChoice === computerChoice) {
      return 'draw';
    }

    const rules = this.currentMode === 'special' ? this.rules.special : this.rules.classic;

    if (rules[playerChoice].includes(computerChoice)) {
      return 'win';
    } else {
      return 'lose';
    }
  }

  updateScore(result) {
    if (result === 'win') {
      this.playerScore++;
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }
      this.stats.totalWins++;
      this.sounds.win();
    } else if (result === 'lose') {
      this.computerScore++;
      this.currentStreak = 0;
      this.stats.totalLosses++;
      this.sounds.lose();
    } else {
      this.stats.totalDraws++;
      this.sounds.draw();
    }

    this.stats.totalGames++;
    this.round++;

    this.elements.playerScoreEl.textContent = this.playerScore;
    this.elements.computerScoreEl.textContent = this.computerScore;
    this.elements.roundEl.textContent = this.round;

    if (this.currentStreak > 0) {
      this.elements.playerStreakEl.textContent = `🔥 ${this.currentStreak} win streak!`;
    } else {
      this.elements.playerStreakEl.textContent = '';
    }
  }

  displayResult(result, playerChoice, computerChoice) {
    const messages = {
      win: ['You Win! 🎉', 'Victory! 🏆', 'Awesome! 🌟', 'Great job! 👏'],
      lose: ['You Lose 😔', 'Try again! 💪', 'Better luck next time! 🍀'],
      draw: ["It's a Draw! 🤝", 'Tie game! ⚖️', 'Even match! 🎯'],
    };

    const randomMessage = messages[result][Math.floor(Math.random() * messages[result].length)];

    this.elements.resultMessage.textContent = randomMessage;
    this.elements.resultMessage.className = `result-message ${result}`;
  }

  updateTournament(result) {
    if (result === 'win') {
      this.tournamentWins++;
    } else if (result === 'lose') {
      this.tournamentLosses++;
    }

    const totalRounds = this.tournamentWins + this.tournamentLosses;
    const progress = (totalRounds / 5) * 100;

    this.elements.tournamentProgress.style.width = `${progress}%`;
    this.elements.tournamentRoundEl.textContent = `Round ${totalRounds + 1} of 5`;

    if (this.tournamentWins >= 3) {
      setTimeout(() => {
        alert('🏆 You won the tournament! Congratulations!');
        this.unlockAchievement('tournament_champion', '🏆', 'Tournament Champion');
        this.resetTournament();
      }, 500);
    } else if (this.tournamentLosses >= 3) {
      setTimeout(() => {
        alert('😔 You lost the tournament. Try again!');
        this.resetTournament();
      }, 500);
    }
  }

  resetTournament() {
    this.tournamentWins = 0;
    this.tournamentLosses = 0;
    this.elements.tournamentProgress.style.width = '0%';
    this.elements.tournamentRoundEl.textContent = 'Round 1 of 5';
  }

  checkAchievements() {
    if (this.playerScore === 5 && !this.hasAchievement('first_five')) {
      this.unlockAchievement('first_five', '⭐', 'First 5 Wins');
    }

    if (this.playerScore === 10 && !this.hasAchievement('ten_wins')) {
      this.unlockAchievement('ten_wins', '🌟', 'Perfect 10');
    }

    if (this.currentStreak === 3 && !this.hasAchievement('streak_3')) {
      this.unlockAchievement('streak_3', '🔥', '3 Win Streak');
    }

    if (this.currentStreak === 5 && !this.hasAchievement('streak_5')) {
      this.unlockAchievement('streak_5', '💥', '5 Win Streak');
    }

    if (this.stats.totalGames === 50 && !this.hasAchievement('veteran')) {
      this.unlockAchievement('veteran', '🎮', 'Veteran Player');
    }

    if (this.currentMode === 'special' && this.playerScore === 5 && !this.hasAchievement('spock_master')) {
      this.unlockAchievement('spock_master', '🖖', 'Spock Master');
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

      this.elements.achievementList.appendChild(achievementEl);

      this.sounds.win();
    }
  }

  resetGame() {
    this.playerScore = 0;
    this.computerScore = 0;
    this.round = 1;
    this.currentStreak = 0;

    this.elements.playerScoreEl.textContent = '0';
    this.elements.computerScoreEl.textContent = '0';
    this.elements.roundEl.textContent = '1';
    this.elements.playerStreakEl.textContent = '';
    this.elements.computerStreakEl.textContent = '';
    this.elements.playerChoiceEmoji.textContent = '❓';
    this.elements.computerChoiceEmoji.textContent = '❓';
    this.elements.resultMessage.textContent = '';

    if (this.currentMode === 'tournament') {
      this.resetTournament();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.elements.soundToggle.textContent = this.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    this.sounds.click();
  }

  showStats() {
    this.updateStatsDisplay();
    this.elements.statsModal.classList.remove('hidden');
  }

  hideStats() {
    this.elements.statsModal.classList.add('hidden');
  }

  updateStatsDisplay() {
    document.getElementById('total-games').textContent = this.stats.totalGames;
    document.getElementById('total-wins').textContent = this.stats.totalWins;
    document.getElementById('total-losses').textContent = this.stats.totalLosses;
    document.getElementById('total-draws').textContent = this.stats.totalDraws;

    const winRate = this.stats.totalGames > 0 ? Math.round((this.stats.totalWins / this.stats.totalGames) * 100) : 0;
    document.getElementById('win-rate').textContent = `${winRate}%`;
    document.getElementById('best-streak').textContent = this.bestStreak;
  }

  loadStats() {
    const saved = localStorage.getItem('rpsStats');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
    };
  }

  saveStats() {
    localStorage.setItem('rpsStats', JSON.stringify(this.stats));
  }

  updateDisplay() {
    this.elements.currentModeEl.textContent = 'Classic Mode';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RockPaperScissors();
});
