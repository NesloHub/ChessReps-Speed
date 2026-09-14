// Spaced Repetition & Progress Tracker for ChessReps Speed Trainer
class SrsManager {
  constructor() {
    this.storageKey = 'chessreps_speed_trainer_v1';
    this.state = this.load();
    this.recentRepsTimestamps = [];
  }

  getDefaultState() {
    return {
      stats: {
        totalReps: 0,
        correctMoves: 0,
        totalAttempts: 0,
        streak: 0,
        bestStreak: 0,
        xp: 0,
        level: 1
      },
      lines: {}, // [openingId]: { reps, mistakes, stage, lastPracticed, nextDue }
      mistakes: [], // list of openingId's with mistakes needing review
      customOpenings: [] // user-imported PGNs
    };
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          stats: { ...this.getDefaultState().stats, ...(parsed.stats || {}) },
          lines: parsed.lines || {},
          mistakes: parsed.mistakes || [],
          customOpenings: parsed.customOpenings || []
        };
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return this.getDefaultState();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  recordMoveAttempt(isCorrect, openingId, moveIndex, expectedMove, playedMove) {
    this.state.stats.totalAttempts++;
    const now = Date.now();
    this.recentRepsTimestamps.push(now);
    // Keep timestamps from last 60 seconds for pace calculation
    this.recentRepsTimestamps = this.recentRepsTimestamps.filter(t => now - t <= 60000);

    if (isCorrect) {
      this.state.stats.correctMoves++;
      this.state.stats.totalReps++;
      this.state.stats.streak++;
      if (this.state.stats.streak > this.state.stats.bestStreak) {
        this.state.stats.bestStreak = this.state.stats.streak;
      }
      
      // XP reward: 10 base XP + streak bonus (up to +20)
      const bonus = Math.min(Math.floor(this.state.stats.streak / 3) * 5, 25);
      this.addXp(10 + bonus);
    } else {
      this.state.stats.streak = 0;
      this.recordMistake(openingId, moveIndex, expectedMove, playedMove);
    }

    this.updateLineStats(openingId, isCorrect);
    this.save();

    return {
      isCorrect,
      streak: this.state.stats.streak,
      bestStreak: this.state.stats.bestStreak,
      xp: this.state.stats.xp,
      level: this.state.stats.level,
      accuracy: this.getAccuracy(),
      movesPerMinute: this.getMovesPerMinute()
    };
  }

  recordMistake(openingId, moveIndex, expectedMove, playedMove) {
    const existing = this.state.mistakes.find(m => m.openingId === openingId);
    if (!existing) {
      this.state.mistakes.unshift({
        openingId,
        moveIndex,
        expectedMove,
        playedMove,
        timestamp: Date.now()
      });
    } else {
      existing.moveIndex = moveIndex;
      existing.expectedMove = expectedMove;
      existing.playedMove = playedMove;
      existing.timestamp = Date.now();
    }
    // Cap mistakes list to 50
    if (this.state.mistakes.length > 50) {
      this.state.mistakes.pop();
    }
  }

  resolveMistake(openingId) {
    this.state.mistakes = this.state.mistakes.filter(m => m.openingId !== openingId);
    this.save();
  }

  updateLineStats(openingId, isCorrect) {
    if (!this.state.lines[openingId]) {
      this.state.lines[openingId] = {
        reps: 0,
        mistakes: 0,
        stage: 'New',
        lastPracticed: null,
        nextDue: Date.now()
      };
    }

    const line = this.state.lines[openingId];
    line.lastPracticed = Date.now();

    if (isCorrect) {
      line.reps++;
      if (line.reps >= 15 && line.mistakes === 0) {
        line.stage = 'Mastered';
        line.nextDue = Date.now() + 3 * 86400000; // 3 days
      } else if (line.reps >= 6) {
        line.stage = 'Practiced';
        line.nextDue = Date.now() + 86400000; // 1 day
      } else if (line.reps >= 2) {
        line.stage = 'Learning';
        line.nextDue = Date.now() + 600000; // 10 min
      } else {
        line.stage = 'New';
        line.nextDue = Date.now();
      }
    } else {
      line.mistakes++;
      // Demote stage on error
      if (line.stage === 'Mastered' || line.stage === 'Mestret') line.stage = 'Practiced';
      else if (line.stage === 'Practiced' || line.stage === 'Øvet') line.stage = 'Learning';
      line.nextDue = Date.now(); // Due immediately
    }
  }

  addXp(amount) {
    this.state.stats.xp += amount;
    // Level formula: 1 level per 250 XP
    this.state.stats.level = 1 + Math.floor(this.state.stats.xp / 250);
  }

  getAccuracy() {
    if (this.state.stats.totalAttempts === 0) return 100;
    return Math.round((this.state.stats.correctMoves / this.state.stats.totalAttempts) * 100);
  }

  getMovesPerMinute() {
    const now = Date.now();
    this.recentRepsTimestamps = this.recentRepsTimestamps.filter(t => now - t <= 60000);
    return this.recentRepsTimestamps.length;
  }

  getLineInfo(openingId) {
    return this.state.lines[openingId] || {
      reps: 0,
      mistakes: 0,
      stage: 'New',
      lastPracticed: null,
      nextDue: Date.now()
    };
  }

  getMistakeCount() {
    return this.state.mistakes.length;
  }

  getMistakeOpeningIds() {
    return this.state.mistakes.map(m => m.openingId);
  }

  addCustomOpening(opening) {
    this.state.customOpenings.push(opening);
    this.save();
  }

  getCustomOpenings() {
    return this.state.customOpenings;
  }

  resetAllStats() {
    this.state = this.getDefaultState();
    this.save();
  }
}

if (typeof window !== 'undefined') {
  window.srsManager = new SrsManager();
}
