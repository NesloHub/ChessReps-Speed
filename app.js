// =========================================================
// ChessReps Speed Trainer - Advanced Application Controller
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const allOpenings = window.OPENINGS_DATA || [];
  const initialFolders = (window.OPENING_FOLDERS || []).map(f => ({
    ...f,
    lines: (f.lines && f.lines.length > 0) ? f.lines : allOpenings.filter(o => o.folderId === f.id)
  }));

  // Application State
  const ChessCtor = window.Chess || (typeof require !== 'undefined' ? (require('./vendor/chess.js').Chess || require('./vendor/chess.js')) : null);
  const state = {
    chess: ChessCtor ? new ChessCtor() : null,
    folders: initialFolders,
    currentFolder: null,
    currentLine: null,
    moveIndex: 0,
    trainingMode: 'drill', // 'drill' | 'learn' | 'test' | 'mistakes'
    colorFilter: 'all',    // 'all' | 'w' | 'b'
    randomWithinFolder: true,
    boardSize: localStorage.getItem('chessreps_board_size') || 'lg', // 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'max'
    boardTheme: localStorage.getItem('chessreps_board_theme') || 'slate',
    pieceTheme: localStorage.getItem('chessreps_piece_theme') || 'standard',
    pieceSet: localStorage.getItem('chessreps_piece_set') || 'staunton',
    builderMoves: [],
    selectedLineIds: new Set(),
    linkedProfile: null,
    boardFlipped: false,
    selectedSquare: null,
    legalMovesForSelected: [],
    lastMove: null, // { from, to }
    opponentDelay: 200,
    isWaitingOpponent: false,
    hintArrow: null,
    draggedSquare: null,
    pendingAlternativeLine: null,
    pendingAlternativeMove: null,
    promptOnBranch: localStorage.getItem('chessreps_prompt_branch') === 'true',
    freeLineSwitch: localStorage.getItem('chessreps_free_switch') !== 'false',
    progressiveDepthEnabled: localStorage.getItem('chessreps_progressive_depth') !== 'false',
    lineProgress: JSON.parse(localStorage.getItem('chessreps_line_progress') || '{}'),
    opponentTimeoutId: null,
    searchQuery: '',
    allFoldersExpanded: false,
    examStats: { totalMoves: 0, correctMoves: 0, linesCompleted: 0 },
    reviewData: null,
    reviewMoveIndex: 0,
    reviewAutoplayTimer: null,
    showCoachArrow: true,
    showDualArrows: true,
    reviewSoundEnabled: localStorage.getItem('chessreps_review_sound') !== '0',
    reviewGameMeta: {
      whiteName: 'White',
      blackName: 'Black',
      whiteElo: '',
      blackElo: '',
      event: '',
      date: ''
    }
  };

  // Initialize selectedLineIds from localStorage or popular starting repertoire
  const savedSelectedLines = localStorage.getItem('chessreps_selected_lines');
  const hasEverSaved = localStorage.getItem('chessreps_has_saved_selection') === 'true';
  if (savedSelectedLines) {
    try {
      const parsed = JSON.parse(savedSelectedLines);
      state.selectedLineIds = new Set(parsed);
      state.selectedLineIds.add('caro-advance-botvinnik-carls-c5');
    } catch (e) {}
  }
  if (!hasEverSaved && state.selectedLineIds.size === 0) {
    // By default on first launch, activate Italian, London, and Caro-Kann
    const initialFolderIds = ['folder-italian', 'folder-london', 'folder-caro-kann'];
    state.folders.forEach(f => {
      if (initialFolderIds.includes(f.id)) {
        (f.lines || []).forEach(l => state.selectedLineIds.add(l.id));
      }
    });
    if (state.selectedLineIds.size === 0) {
      state.folders.slice(0, 3).forEach(f => (f.lines || []).forEach(l => state.selectedLineIds.add(l.id)));
    }
    localStorage.setItem('chessreps_has_saved_selection', 'true');
    localStorage.setItem('chessreps_selected_lines', JSON.stringify([...state.selectedLineIds]));
  }

  // Load linked profile if any
  try {
    const savedProfile = localStorage.getItem('chessreps_linked_profile');
    if (savedProfile) {
      state.linkedProfile = JSON.parse(savedProfile);
    }
  } catch (e) {}

  // Merge custom openings into folders
  const customList = window.srsManager.getCustomOpenings();
  if (customList.length > 0) {
    let customFolder = state.folders.find(f => f.id === 'folder-custom');
    if (!customFolder) {
      customFolder = {
        id: 'folder-custom',
        name: 'My PGN Repertoires',
        color: 'w',
        icon: '📁',
        eco: 'PGN',
        description: 'Your own imported PGN opening lines.',
        lines: []
      };
      state.folders.push(customFolder);
    }
    customFolder.lines.push(...customList);
    customList.forEach(l => state.selectedLineIds.add(l.id));
  }

  // DOM Elements
  const el = {
    chessboard: document.getElementById('chessboard'),
    boardWrapper: document.getElementById('board-wrapper'),
    arrowCanvas: document.getElementById('arrow-canvas'),
    dragGhost: document.getElementById('drag-ghost'),
    foldersTree: document.getElementById('folders-tree'),
    inputSearchOpenings: document.getElementById('input-search-openings'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnToggleAllFolders: document.getElementById('btn-toggle-all-folders'),
    toggleRandomFolder: document.getElementById('toggle-random-folder'),
    togglePromptBranch: document.getElementById('toggle-prompt-branch'),
    toggleFreeBranch: document.getElementById('toggle-free-branch'),
    progressiveDepthCard: document.getElementById('progressive-depth-card'),
    progStageBadge: document.getElementById('prog-stage-badge'),
    progDepthText: document.getElementById('prog-depth-text'),
    progTrackFill: document.getElementById('prog-track-fill'),
    toggleProgressiveDepth: document.getElementById('toggle-progressive-depth'),
    branchesBar: document.getElementById('branches-bar'),
    branchesChipsList: document.getElementById('branches-chips-list'),
    playlistCountLabel: document.getElementById('playlist-count-label'),
    btnSelectAllLines: document.getElementById('btn-select-all-lines'),
    btnDeselectAllLines: document.getElementById('btn-deselect-all-lines'),
    
    // Stats & Gamification
    statStreak: document.getElementById('stat-streak'),
    chipStreak: document.getElementById('chip-streak'),
    streakIcon: document.getElementById('streak-icon'),
    statReps: document.getElementById('stat-reps'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statPace: document.getElementById('stat-pace'),
    statLevel: document.getElementById('stat-level'),
    statXp: document.getElementById('stat-xp'),
    badgeMistakesCount: document.getElementById('badge-mistakes-count'),
    headerProfileContainer: document.getElementById('header-profile-container'),

    // Alternative Line Switch Prompt
    altLinePrompt: document.getElementById('alt-line-prompt'),

    // Feedback Banner
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackText: document.getElementById('feedback-text'),
    btnHint: document.getElementById('btn-hint'),

    // Board Size buttons
    btnBoardSizes: document.querySelectorAll('.btn-board-size'),

    // Quick Board Controls
    btnFlipBoard: document.getElementById('btn-flip-board'),
    btnRestartRep: document.getElementById('btn-restart-rep'),
    btnNextRandom: document.getElementById('btn-next-random'),
    btnSoundSettings: document.getElementById('btn-sound-settings'),
    soundIcon: document.getElementById('sound-icon'),
    
    // Right Hero Panel & Learning Box
    heroTitle: document.getElementById('hero-title'),
    heroEco: document.getElementById('hero-eco'),
    heroDesc: document.getElementById('hero-desc'),
    heroThemes: document.getElementById('hero-themes'),
    learningBox: document.getElementById('learning-box'),
    learningMoveNote: document.getElementById('learning-move-note'),
    btnLearnPrev: document.getElementById('btn-learn-prev'),
    btnLearnNext: document.getElementById('btn-learn-next'),
    notationGrid: document.getElementById('notation-grid'),

    // Speed Controls
    speedButtons: document.querySelectorAll('.speed-btn'),
    speedLabelVal: document.getElementById('speed-label-val'),

    // Profile Modal
    modalProfile: document.getElementById('modal-profile'),
    btnCloseProfile: document.getElementById('btn-close-profile'),
    profilePlatformSelect: document.getElementById('profile-platform-select'),
    profileUsernameInput: document.getElementById('profile-username-input'),
    profileLoadingIndicator: document.getElementById('profile-loading-indicator'),
    profileErrorMessage: document.getElementById('profile-error-message'),
    btnFetchProfile: document.getElementById('btn-fetch-profile'),
    btnUnlinkProfile: document.getElementById('btn-unlink-profile'),
    btnFetchUserGames: document.getElementById('btn-fetch-user-games'),
    profileGamesSection: document.getElementById('profile-games-section'),

    // Game Review & Coach Elements
        // Review Sidebar Controls
    standardLeftPanel: document.getElementById('standard-left-panel'),
    reviewSidebarPanel: document.getElementById('review-sidebar-panel'),
    reviewFileInput: document.getElementById('review-file-input'),
    btnTriggerUploadPgn: document.getElementById('btn-trigger-upload-pgn'),
    btnTriggerPastePgn: document.getElementById('btn-trigger-paste-pgn'),
    btnStartFreeAnalysis: document.getElementById('btn-start-free-analysis'),
    btnQuickOpera: document.getElementById('btn-quick-opera'),
    btnQuickImmortal: document.getElementById('btn-quick-immortal'),
    btnQuickLondon: document.getElementById('btn-quick-london'),
    reviewOpeningBanner: document.getElementById('review-opening-banner'),
    reviewOpeningText: document.getElementById('review-opening-text'),
    evalBarWrapper: document.getElementById('eval-bar-wrapper'),
    evalBar: document.getElementById('eval-bar'),
    evalBarFillWhite: document.getElementById('eval-bar-fill-white'),
    evalBarScore: document.getElementById('eval-bar-score'),
    boardControls: document.getElementById('board-controls'),
    btnReviewFlip: document.getElementById('btn-review-flip'),
    btnReviewSound: document.getElementById('btn-review-sound'),
    reviewSoundIcon: document.getElementById('review-sound-icon'),
    btnPlayCoachMove: document.getElementById('btn-play-coach-move'),
    reviewControlsBar: document.getElementById('review-controls-bar'),
    btnReviewFirst: document.getElementById('btn-review-first'),
    btnReviewPrev: document.getElementById('btn-review-prev'),
    btnReviewNext: document.getElementById('btn-review-next'),
    btnReviewLast: document.getElementById('btn-review-last'),
    btnReviewNextMistake: document.getElementById('btn-review-next-mistake'),
    btnReviewAutoplay: document.getElementById('btn-review-autoplay'),
    reviewAutoplayIcon: document.getElementById('review-autoplay-icon'),
    btnReviewShowBest: document.getElementById('btn-review-show-best'),
    standardPanelContent: document.getElementById('standard-panel-content'),
    reviewPanelContent: document.getElementById('review-panel-content'),
    reviewAccWhite: document.getElementById('review-acc-white'),
    reviewAccBlack: document.getElementById('review-acc-black'),
    reviewBarWhite: document.getElementById('review-bar-white'),
    reviewBarBlack: document.getElementById('review-bar-black'),
    reviewGameMeta: document.getElementById('review-game-meta'),
    btnReviewReload: document.getElementById('btn-review-reload'),
    btnReviewPastePgn: document.getElementById('btn-review-paste-pgn'),
    coachContainer: document.getElementById('coach-container'),
    coachVerdictBadge: document.getElementById('coach-verdict-badge'),
    coachEvalPill: document.getElementById('coach-eval-pill'),
    coachSpeechBubble: document.getElementById('coach-speech-bubble'),
    coachSuggestionBox: document.getElementById('coach-suggestion-box'),
    coachSuggestionText: document.getElementById('coach-suggestion-text'),
    btnCoachToggleArrow: document.getElementById('btn-coach-toggle-arrow'),
    reviewCurrentMoveLabel: document.getElementById('review-current-move-label'),
    reviewMovesList: document.getElementById('review-moves-list'),
    playerCardTop: document.getElementById('player-card-top'),
    playerCardBottom: document.getElementById('player-card-bottom'),
    playerAvatarTop: document.getElementById('player-avatar-top'),
    playerAvatarBottom: document.getElementById('player-avatar-bottom'),
    playerNameTop: document.getElementById('player-name-top'),
    playerNameBottom: document.getElementById('player-name-bottom'),
    playerEloTop: document.getElementById('player-elo-top'),
    playerEloBottom: document.getElementById('player-elo-bottom'),
    playerTagTop: document.getElementById('player-tag-top'),
    playerTagBottom: document.getElementById('player-tag-bottom'),
    modalReviewPgn: document.getElementById('modal-review-pgn'),
    btnCloseReviewPgnModal: document.getElementById('btn-close-review-pgn-modal'),
    btnCancelReviewPgn: document.getElementById('btn-cancel-review-pgn'),
    btnSubmitReviewPgn: document.getElementById('btn-submit-review-pgn'),
    reviewPgnInput: document.getElementById('review-pgn-input'),
    btnSampleOperaGame: document.getElementById('btn-sample-opera-game'),
    btnSampleImmortalGame: document.getElementById('btn-sample-immortal-game'),

    // Theme Modal
    modalTheme: document.getElementById('modal-theme'),
    btnOpenThemeModal: document.getElementById('btn-open-theme-modal'),
    btnCloseTheme: document.getElementById('btn-close-theme'),
    btnApplyTheme: document.getElementById('btn-apply-theme'),

    // User Games Modal
    modalGames: document.getElementById('modal-games'),
    btnCloseGames: document.getElementById('btn-close-games'),
    btnCancelGames: document.getElementById('btn-cancel-games'),
    gamesListContainer: document.getElementById('games-list-container'),

    // Exam Modal
    modalExam: document.getElementById('modal-exam'),
    examGradeBadge: document.getElementById('exam-grade-badge'),
    examGradeTitle: document.getElementById('exam-grade-title'),
    examGradeDesc: document.getElementById('exam-grade-desc'),
    examCorrectCount: document.getElementById('exam-correct-count'),
    examXpGained: document.getElementById('exam-xp-gained'),
    btnCloseExam: document.getElementById('btn-close-exam'),
    btnOkExam: document.getElementById('btn-ok-exam'),

    // PGN Modal
    modalPgn: document.getElementById('modal-pgn'),
    btnOpenPgnModal: document.getElementById('btn-import-pgn-modal'),
    btnClosePgnModal: document.getElementById('btn-close-pgn'),
    btnCancelPgn: document.getElementById('btn-cancel-pgn'),
    btnSavePgn: document.getElementById('btn-save-pgn'),
    pgnInputFolder: document.getElementById('pgn-input-folder'),
    pgnInputName: document.getElementById('pgn-input-name'),
    pgnInputColor: document.getElementById('pgn-input-color'),
    pgnInputText: document.getElementById('pgn-input-text'),

    // Help Modal
    modalHelp: document.getElementById('modal-help'),
    btnOpenHelpModal: document.getElementById('btn-help-modal'),
    btnCloseHelpModal: document.getElementById('btn-close-help'),
    btnOkHelp: document.getElementById('btn-ok-help'),

    // Builder Mode Elements
    builderPanel: document.getElementById('builder-panel'),
    builderStatusText: document.getElementById('builder-status-text'),
    builderPgnDisplay: document.getElementById('builder-pgn-display'),
    builderMovesCount: document.getElementById('builder-moves-count'),
    btnBuilderUndo: document.getElementById('btn-builder-undo'),
    btnBuilderReset: document.getElementById('btn-builder-reset'),
    btnBuilderCopy: document.getElementById('btn-builder-copy'),
    btnBuilderSave: document.getElementById('btn-builder-save'),
    builderSaveDrawer: document.getElementById('builder-save-drawer'),
    builderFolderSelect: document.getElementById('builder-folder-select'),
    builderNewFolderInput: document.getElementById('builder-new-folder-input'),
    builderLineName: document.getElementById('builder-line-name'),
    builderLineColor: document.getElementById('builder-line-color'),
    builderLineDesc: document.getElementById('builder-line-desc'),
    btnBuilderCancelSave: document.getElementById('btn-builder-cancel-save'),
    btnBuilderCloseDrawer: document.getElementById('btn-builder-close-drawer'),
    btnBuilderConfirmSave: document.getElementById('btn-builder-confirm-save')
  };

  const ctx = el.arrowCanvas.getContext('2d');

  // =========================================================
  // Initialization
  // =========================================================
  function init() {
    applyBoardSize(state.boardSize);
    applyBoardTheme(state.boardTheme);
    applyPieceSet(state.pieceSet);
    applyPieceTheme(state.pieceTheme);
    initSoundSettings();
    setupCanvas();
    bindEvents();
    updateStatsDisplay();
    renderProfileWidget();

    bindReviewEvents();

    // Render openings folder tree in sidebar
    try {
      renderFoldersTree();
    } catch (err) {
      console.warn('renderFoldersTree error:', err);
    }

    // Select initial folder and its first line safely
    const initialFolder = (state.folders && state.folders.length > 0)
      ? (state.folders.find(f => f.lines && f.lines.length > 0) || state.folders[0])
      : null;
    const initialLine = (initialFolder && initialFolder.lines && initialFolder.lines.length > 0)
      ? initialFolder.lines[0]
      : null;
    if (initialFolder && initialLine) {
      try {
        selectFolderAndLine(initialFolder.id, initialLine.id);
      } catch (err) {
        console.warn('selectFolderAndLine error:', err);
        renderBoard();
      }
    } else {
      renderBoard();
    }

    updatePlaylistCount();
    updateAvailableBranches();

    // Auto-resize canvas whenever board wrapper dimensions change
    if (window.ResizeObserver && el.boardWrapper) {
      const ro = new ResizeObserver(() => {
        setupCanvas();
        if (state.hintArrow) {
          drawArrow(state.hintArrow.from, state.hintArrow.to);
        }
      });
      ro.observe(el.boardWrapper);
    }

    // Periodic Pace Updater (every 3s)
    setInterval(() => {
      el.statPace.textContent = `${window.srsManager.getMovesPerMinute()} moves/min`;
    }, 3000);
  }

  // =========================================================
  // Sound Settings System
  // =========================================================

  // Sound state (persisted)
  state.soundMood = localStorage.getItem('chessreps_sound_mood') || 'hype';
  state.soundToggles = {
    move:     localStorage.getItem('chessreps_sound_move')     !== '0',
    capture:  localStorage.getItem('chessreps_sound_capture')  !== '0',
    correct:  localStorage.getItem('chessreps_sound_correct')  !== '0',
    error:    localStorage.getItem('chessreps_sound_error')    !== '0',
    complete: localStorage.getItem('chessreps_sound_complete') !== '0'
  };

  const MOOD_PRESETS = {
    hype: {
      volume: 85,
      move: true, capture: true, correct: true, error: true, complete: true,
      desc: {
        move: 'Skarpt klik — crisp og responsivt',
        capture: 'Crisp thud + snap — high energy',
        correct: 'Opstigende ping — boost din selvtillid!',
        error:   'Brat alarm — spring videre!',
        complete: 'Triumf-fanfare — fejr din sejr!'
      }
    },
    cozy: {
      volume: 42,
      move: true, capture: true, correct: true, error: false, complete: true,
      desc: {
        move: 'Soft woody pop — calm and focused',
        capture: 'Stille klik — diskret og rolig',
        correct: 'Fin chime — stille opmuntring',
        error:   'Muted — zero distractions',
        complete: 'Dejlig akkord — afslappet fejring'
      }
    },
    silent: {
      volume: 0,
      move: false, capture: false, correct: false, error: false, complete: false,
      desc: {
        move: 'Muted', capture: 'Muted',
        correct: 'Muted', error: 'Muted', complete: 'Muted'
      }
    },
    custom: null // Custom = user-defined, no changes
  };

  function initSoundSettings() {
    // Apply saved mood volume to chessAudio
    const savedVol = parseInt(localStorage.getItem('chessreps_master_vol') || '60');
    window.chessAudio.volume = savedVol / 100;
    if (state.soundMood === 'silent') window.chessAudio.setMuted(true);
  }

  function openSoundModal() {
    const modal = document.getElementById('modal-sound');
    if (!modal) return;

    // Sync volume slider
    const savedVol = Math.round(window.chessAudio.volume * 100);
    const masterVol = document.getElementById('master-volume');
    const masterVolLabel = document.getElementById('master-vol-label');
    if (masterVol) {
      masterVol.value = savedVol;
      masterVol.style.setProperty('--val', `${savedVol}%`);
    }
    if (masterVolLabel) masterVolLabel.textContent = `${savedVol}%`;

    // Sync individual toggles
    ['move','capture','correct','error','complete'].forEach(key => {
      const toggle = document.getElementById(`toggle-sound-${key}`);
      if (toggle) toggle.checked = state.soundToggles[key];
    });

    // Update mood card highlighting
    updateMoodCardUI(state.soundMood);

    // Show/hide custom panel
    const customPanel = document.getElementById('sound-custom-panel');
    if (customPanel) customPanel.style.display = 'block';

    modal.classList.add('open');
  }

  function updateMoodCardUI(mood) {
    document.querySelectorAll('.sound-mood-card').forEach(card => {
      card.classList.toggle('active', card.dataset.mood === mood);
    });
    // Update sound descriptions if preset has them
    const preset = MOOD_PRESETS[mood];
    if (preset && preset.desc) {
      Object.keys(preset.desc).forEach(key => {
        const el = document.getElementById(`sound-desc-${key}`);
        if (el) el.textContent = preset.desc[key];
      });
    }
    // Update status label
    const label = document.getElementById('sound-status-label');
    if (label) {
      const names = { hype: '⚡ Hype audio mode active', cozy: '🕯️ Cozy audio mode active', silent: '🔇 Sound muted', custom: '🎛️ Custom audio settings' };
      label.textContent = names[mood] || '';
    }
  }

  function applySoundMood(mood) {
    state.soundMood = mood;
    localStorage.setItem('chessreps_sound_mood', mood);

    const preset = MOOD_PRESETS[mood];
    if (!preset) { // custom
      updateMoodCardUI('custom');
      return;
    }

    // Apply volume
    window.chessAudio.volume = preset.volume / 100;
    const masterVol = document.getElementById('master-volume');
    const masterVolLabel = document.getElementById('master-vol-label');
    if (masterVol) {
      masterVol.value = preset.volume;
      masterVol.style.setProperty('--val', `${preset.volume}%`);
    }
    if (masterVolLabel) masterVolLabel.textContent = `${preset.volume}%`;
    localStorage.setItem('chessreps_master_vol', preset.volume);

    // Apply mute for silent
    window.chessAudio.setMuted(mood === 'silent');

    // Apply individual toggles
    ['move','capture','correct','error','complete'].forEach(key => {
      const enabled = preset[key];
      state.soundToggles[key] = enabled;
      localStorage.setItem(`chessreps_sound_${key}`, enabled ? '1' : '0');
      const toggle = document.getElementById(`toggle-sound-${key}`);
      if (toggle) toggle.checked = enabled;
    });

    updateMoodCardUI(mood);

    // Brief animation on the icon
    if (el.soundIcon) {
      el.soundIcon.style.transform = 'scale(1.3)';
      setTimeout(() => { el.soundIcon.style.transform = ''; }, 200);
    }
  }

  function applyBoardSize(size) {
    state.boardSize = size;
    localStorage.setItem('chessreps_board_size', size);

    const sizePxMap = {
      md: '640px',
      lg: '760px',
      xl: '880px',
      xxl: '980px',
      xxxl: '1100px',
      max: '1200px'
    };
    const curPx = sizePxMap[size] || '760px';

    if (el.boardWrapper) {
      el.boardWrapper.classList.remove(
        'board-size-md', 'board-size-lg', 'board-size-xl',
        'board-size-xxl', 'board-size-xxxl', 'board-size-max'
      );
      el.boardWrapper.classList.add(`board-size-${size}`);
      el.boardWrapper.style.width = curPx;
    }

    if (el.playerCardTop) el.playerCardTop.style.maxWidth = curPx;
    if (el.playerCardBottom) el.playerCardBottom.style.maxWidth = curPx;

    el.btnBoardSizes.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });

    setTimeout(() => {
      setupCanvas();
      if (state.hintArrow) {
        drawArrow(state.hintArrow.from, state.hintArrow.to);
      }
    }, 150);
  }

  function applyBoardTheme(themeName) {
    state.boardTheme = themeName;
    localStorage.setItem('chessreps_board_theme', themeName);

    document.body.classList.remove('theme-slate', 'theme-wood', 'theme-green', 'theme-ocean', 'theme-cyber');
    if (themeName !== 'slate') {
      document.body.classList.add(`theme-${themeName}`);
    }

    document.querySelectorAll('#theme-board-options .theme-card-option').forEach(card => {
      card.classList.toggle('active', card.dataset.boardTheme === themeName);
    });
  }

  function applyPieceTheme(themeName) {
    state.pieceTheme = themeName;
    localStorage.setItem('chessreps_piece_theme', themeName);

    document.querySelectorAll('#theme-piece-options .theme-card-option').forEach(card => {
      card.classList.toggle('active', card.dataset.pieceTheme === themeName);
    });

    updatePieceSetPreviews();
    renderBoard();
  }

  function applyPieceSet(setName) {
    state.pieceSet = setName;
    localStorage.setItem('chessreps_piece_set', setName);

    document.querySelectorAll('#theme-piece-set-options .theme-card-option').forEach(card => {
      card.classList.toggle('active', card.dataset.pieceSet === setName);
    });

    renderBoard();
  }

  function updatePieceSetPreviews() {
    document.querySelectorAll('#theme-piece-set-options [data-set-preview]').forEach(elPreview => {
      const set = elPreview.dataset.setPreview;
      if (window.getPieceSvg) {
        elPreview.innerHTML = window.getPieceSvg({ type: 'n', color: 'w' }, set, state.pieceTheme);
      }
    });
  }

  function setupCanvas() {
    const rect = el.arrowCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (el.arrowCanvas.width !== targetW || el.arrowCanvas.height !== targetH) {
      el.arrowCanvas.width = targetW;
      el.arrowCanvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getSquareCenter(sq) {
    if (!sq || sq.length < 2) return null;
    const file = sq[0].toLowerCase();
    const rank = parseInt(sq[1], 10);
    const files = state.boardFlipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
    const ranks = state.boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

    const col = files.indexOf(file);
    const row = ranks.indexOf(rank);
    if (col === -1 || row === -1) return null;

    const rect = el.arrowCanvas.getBoundingClientRect();
    const sqW = rect.width / 8;
    const sqH = rect.height / 8;

    return {
      x: (col + 0.5) * sqW,
      y: (row + 0.5) * sqH,
      size: Math.min(sqW, sqH)
    };
  }

  window.addEventListener('resize', () => {
    setupCanvas();
    if (state.hintArrow) {
      drawArrow(state.hintArrow.from, state.hintArrow.to);
    }
  });


  // =========================================================
  // Listudy-Style Progressive Depth Learning System
  // =========================================================
  function getLineTargetDepth(line) {
    if (!line || !line.moves || line.moves.length === 0) return 0;
    if (!state.progressiveDepthEnabled) {
      return line.moves.length;
    }
    const total = line.moves.length;
    const saved = state.lineProgress[line.id];
    if (saved && typeof saved === 'number' && saved >= 4) {
      return Math.min(saved, total);
    }
    const initialDepth = Math.min(4, total);
    state.lineProgress[line.id] = initialDepth;
    return initialDepth;
  }

  function updateProgressiveBar() {
    if (!el.progressiveDepthCard || !state.currentLine) return;

    const total = state.currentLine.moves ? state.currentLine.moves.length : 0;
    if (total === 0) {
      el.progressiveDepthCard.style.display = 'none';
      return;
    }
    el.progressiveDepthCard.style.display = 'flex';

    if (!state.progressiveDepthEnabled) {
      el.progStageBadge.textContent = '⚡ Full Line';
      el.progStageBadge.className = 'progressive-badge';
      el.progStageBadge.style.background = 'rgba(6, 182, 212, 0.2)';
      el.progStageBadge.style.color = 'var(--color-cyan)';
      el.progStageBadge.style.borderColor = 'rgba(6, 182, 212, 0.4)';

      const current = state.moveIndex;
      const pct = Math.round((current / total) * 100);
      el.progDepthText.textContent = `Move ${current} of ${total} (${pct}%) • Full Training`;
      el.progTrackFill.style.width = `${pct}%`;
      el.progTrackFill.style.background = 'linear-gradient(90deg, #06b6d4, #3b82f6)';
      return;
    }

    const targetDepth = getLineTargetDepth(state.currentLine);
    const isMastered = targetDepth >= total;
    const stageNum = Math.ceil(targetDepth / 4);
    const maxStages = Math.ceil(total / 4);

    if (isMastered) {
      el.progStageBadge.textContent = '🏆 Mastered!';
      el.progStageBadge.className = 'progressive-badge mastered';
      el.progStageBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      el.progStageBadge.style.color = '#f59e0b';
      el.progStageBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      el.progDepthText.textContent = `All ${total} Moves Mastered (100%) • Stage ${maxStages}/${maxStages}`;
      el.progTrackFill.style.width = '100%';
      el.progTrackFill.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
    } else {
      el.progStageBadge.textContent = `🌱 Stage ${stageNum}/${maxStages}`;
      el.progStageBadge.className = 'progressive-badge';
      el.progStageBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      el.progStageBadge.style.color = 'var(--color-emerald)';
      el.progStageBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';

      const pct = Math.round((targetDepth / total) * 100);
      el.progDepthText.textContent = `Target: Moves 1–${targetDepth} of ${total} (${pct}%) • Current: ${state.moveIndex}/${targetDepth}`;
      const fillPct = Math.round((state.moveIndex / total) * 100);
      el.progTrackFill.style.width = `${Math.max(pct, fillPct)}%`;
      el.progTrackFill.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
    }
  }

  // =========================================================
  // Folder & Line Selection
  // =========================================================
  function selectFolderAndLine(folderId, lineId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    const line = folder.lines.find(l => l.id === lineId) || folder.lines[0];
    if (!line) return;

    state.currentFolder = folder;
    state.currentLine = line;
    state.boardFlipped = (folder.color === 'b');
    if (line.gameMeta) {
      state.reviewGameMeta = line.gameMeta;
    }

    hideAltLinePrompt();
    resetRep();

    // Update Repertoire Details Panel
    el.heroTitle.textContent = `${folder.name}: ${line.name}`;
    el.heroEco.textContent = line.eco || folder.eco || 'ECO';
    el.heroDesc.textContent = line.explanation || folder.description || '';
    
    const themes = line.keyThemes || ['Classical Opening', folder.name];
    el.heroThemes.innerHTML = themes.map(theme => 
      `<span class="theme-tag">${theme}</span>`
    ).join('');

    updateActiveFolderAndLineInTree();
    renderNotationTimeline();
    updatePlaylistCount();
    updateAvailableBranches();
    updateProgressiveBar();
  }

  function resetRep() {
    if (state.trainingMode === 'builder') {
      resetBuilder();
      return;
    }

    if (state.opponentTimeoutId) {
      clearTimeout(state.opponentTimeoutId);
      state.opponentTimeoutId = null;
    }

    if (!state.chess && typeof window.Chess !== 'undefined') {
      state.chess = new window.Chess();
    }
    if (state.chess && state.chess.reset) {
      state.chess.reset();
    }
    state.moveIndex = 0;
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    state.lastMove = null;
    state.hintArrow = null;
    state.isWaitingOpponent = false;
    clearArrowCanvas();
    hideAltLinePrompt();

    renderBoard();
    renderNotationTimeline();
    updateLearningBox();
    updateAvailableBranches();
    updateProgressiveBar();

    if (!state.currentFolder || !state.currentLine) return;

    // If training as Black, opponent (White) makes the first move!
    if (state.currentFolder.color === 'b') {
      setBanner('state-ready', '⏳', 'White opens the game...');
      makeOpponentMove();
    } else {
      if (state.trainingMode === 'learn') {
        showLearningMove();
      } else {
        setBanner('state-ready', '⚡', `Your turn as White in <strong>${state.currentLine.name}</strong>!`);
      }
    }
  }

  // =========================================================
  // Chessboard Rendering
  // =========================================================
  function renderBoard() {
    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;

    const frag = document.createDocumentFragment();
    const files = state.boardFlipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
    const ranks = state.boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

    ranks.forEach((rank, rIdx) => {
      files.forEach((file, fIdx) => {
        const squareId = file + rank;
        const isLight = (fIdx + rIdx) % 2 === 0;

        const sqDiv = document.createElement('div');
        sqDiv.className = `square ${isLight ? 'light' : 'dark'}`;
        sqDiv.id = `sq-${squareId}`;
        sqDiv.dataset.square = squareId;

        // Coordinates
        if (fIdx === 7) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'coord-rank';
          rankLabel.textContent = rank;
          sqDiv.appendChild(rankLabel);
        }
        if (rIdx === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'coord-file';
          fileLabel.textContent = file;
          sqDiv.appendChild(fileLabel);
        }

        // Highlights
        if (state.selectedSquare === squareId) {
          sqDiv.classList.add('selected');
        }
        if (state.lastMove && (state.lastMove.from === squareId || state.lastMove.to === squareId)) {
          sqDiv.classList.add('last-move');
        }

        // Game Review Classification Badge on destination square
        if (state.trainingMode === 'review' && state.reviewData && state.reviewMoveIndex > 0) {
          const revMove = state.reviewData.moves[state.reviewMoveIndex - 1];
          if (revMove && revMove.to === squareId) {
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'square-badge badge-' + revMove.classification;
            badgeDiv.textContent = revMove.glyph;
            badgeDiv.title = revMove.title + ': ' + revMove.san;
            sqDiv.appendChild(badgeDiv);
          }
        }

        // King in check
        const isKingInCheck = state.chess && (state.chess.inCheck ? state.chess.inCheck() : (state.chess.in_check ? state.chess.in_check() : false));
        if (isKingInCheck) {
          const pieceOnSq = state.chess.get(squareId);
          if (pieceOnSq && pieceOnSq.type === 'k' && pieceOnSq.color === state.chess.turn()) {
            sqDiv.classList.add('in-check');
          }
        }

        // Move dot or capture ring
        if (state.legalMovesForSelected.includes(squareId)) {
          const targetPiece = state.chess ? state.chess.get(squareId) : null;
          const indicator = document.createElement('div');
          indicator.className = targetPiece ? 'capture-ring' : 'move-dot';
          sqDiv.appendChild(indicator);
        }

        // Piece
        const piece = state.chess ? state.chess.get(squareId) : null;
        if (piece) {
          const pieceDiv = document.createElement('div');
          pieceDiv.className = 'piece';
          pieceDiv.innerHTML = window.getPieceSvg(piece, state.pieceSet, state.pieceTheme);
          pieceDiv.dataset.square = squareId;
          sqDiv.appendChild(pieceDiv);
        }

        frag.appendChild(sqDiv);
      });
    });

    el.chessboard.replaceChildren(frag);

    // Keep window scroll 100% steady and unchanged
    if (window.scrollX !== prevScrollX || window.scrollY !== prevScrollY) {
      window.scrollTo(prevScrollX, prevScrollY);
    }
  }

  // =========================================================
  // Interactive User Moves & Transposition Detection
  // =========================================================
  function bindEvents() {
    // Mouse wheel scrolling anywhere in Repertoire Library panel
    const panelLeft = document.getElementById('panel-left') || document.getElementById('standard-left-panel');
    if (panelLeft && el.foldersTree) {
      panelLeft.addEventListener('wheel', (e) => {
        el.foldersTree.scrollTop += e.deltaY;
      }, { passive: true });
    }

    // Board clicks & pointerdown
    el.chessboard.addEventListener('click', handleSquareClick);
    el.chessboard.addEventListener('pointerdown', handlePointerDown);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Board Size buttons
    el.btnBoardSizes.forEach(btn => {
      btn.addEventListener('click', () => {
        applyBoardSize(btn.dataset.size);
      });
    });

    // Alternative Line Switch / Prompt-on-Branch toggle
    if (el.togglePromptBranch) {
      el.togglePromptBranch.checked = state.promptOnBranch;
      el.togglePromptBranch.addEventListener('change', (e) => {
        state.promptOnBranch = e.target.checked;
        localStorage.setItem('chessreps_prompt_branch', e.target.checked);
      });
    }

    // Unified Board Flip
    el.btnFlipBoard.addEventListener('click', toggleBoardFlip);

    el.btnRestartRep.addEventListener('click', () => {
      resetRep();
    });

    el.btnNextRandom.addEventListener('click', () => {
      advanceLineInFolder();
    });

    el.btnHint.addEventListener('click', () => {
      if (state.trainingMode === 'test') {
        setBanner('state-error', '🚫', 'Hints are disabled in Exam mode!');
        return;
      }
      showHint();
    });

    el.btnSoundSettings.addEventListener('click', () => {
      openSoundModal();
    });

    // Sound Modal close buttons
    const closeSoundModal = () => {
      const modal = document.getElementById('modal-sound');
      if (modal) modal.classList.remove('open');
    };
    document.getElementById('btn-close-sound-modal')?.addEventListener('click', closeSoundModal);
    document.getElementById('btn-close-sound-modal-footer')?.addEventListener('click', closeSoundModal);
    document.getElementById('modal-sound')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSoundModal();
    });

    // Mood cards
    document.querySelectorAll('.sound-mood-card').forEach(card => {
      card.addEventListener('click', () => {
        const mood = card.dataset.mood;
        applySoundMood(mood);
      });
    });

    // Master volume
    const masterVol = document.getElementById('master-volume');
    const masterVolLabel = document.getElementById('master-vol-label');
    if (masterVol) {
      masterVol.addEventListener('input', () => {
        const val = parseInt(masterVol.value);
        masterVolLabel.textContent = `${val}%`;
        window.chessAudio.volume = val / 100;
        masterVol.style.setProperty('--val', `${val}%`);
        localStorage.setItem('chessreps_master_vol', val);
        // If we had a mood set, any volume change moves to custom
        if (state.soundMood !== 'custom') {
          state.soundMood = 'custom';
          updateMoodCardUI('custom');
        }
      });
    }

    // Individual sound toggles
    ['move','capture','correct','error','complete'].forEach(key => {
      const toggle = document.getElementById(`toggle-sound-${key}`);
      const previewBtn = document.getElementById(`preview-${key}`);

      toggle?.addEventListener('change', () => {
        state.soundToggles[key] = toggle.checked;
        localStorage.setItem(`chessreps_sound_${key}`, toggle.checked ? '1' : '0');
        if (state.soundMood !== 'custom') {
          state.soundMood = 'custom';
          updateMoodCardUI('custom');
        }
      });

      previewBtn?.addEventListener('click', () => {
        window.chessAudio.init();
        switch (key) {
          case 'move':     window.chessAudio.playMove(); break;
          case 'capture':  window.chessAudio.playCapture(); break;
          case 'correct':  window.chessAudio.playCorrect(3); break;
          case 'error':    window.chessAudio.playError(); break;
          case 'complete': window.chessAudio.playComplete(); break;
        }
      });
    });

    // Random variation toggle in folder
    el.toggleRandomFolder.addEventListener('change', (e) => {
      state.randomWithinFolder = e.target.checked;
    });

    // Playlist Selection Links (Select all / Deselect all)
    el.btnSelectAllLines.addEventListener('click', () => {
      // Select all lines across all folders currently filtered
      const folders = getFilteredFolders();
      folders.forEach(f => (f.lines || []).forEach(l => state.selectedLineIds.add(l.id)));
      saveSelectedLines();
      renderFoldersTree();
      updatePlaylistCount();
    });

    el.btnDeselectAllLines.addEventListener('click', () => {
      // Deselect all lines to allow fresh custom selection
      state.selectedLineIds.clear();
      saveSelectedLines();
      renderFoldersTree();
      updatePlaylistCount();
    });

    // Repertoire Search Filter
    if (el.inputSearchOpenings) {
      el.inputSearchOpenings.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (el.btnClearSearch) {
          el.btnClearSearch.style.display = state.searchQuery ? 'flex' : 'none';
        }
        renderFoldersTree();
      });
    }

    if (el.btnClearSearch) {
      el.btnClearSearch.addEventListener('click', () => {
        state.searchQuery = '';
        if (el.inputSearchOpenings) el.inputSearchOpenings.value = '';
        el.btnClearSearch.style.display = 'none';
        renderFoldersTree();
        if (el.inputSearchOpenings) el.inputSearchOpenings.focus();
      });
    }

    // Toggle All Folders Expand / Collapse
    if (el.btnToggleAllFolders) {
      el.btnToggleAllFolders.addEventListener('click', () => {
        state.allFoldersExpanded = !state.allFoldersExpanded;
        if (state.allFoldersExpanded) {
          state.expandedFolderIds = new Set(state.folders.map(f => f.id));
          el.btnToggleAllFolders.textContent = '📂 Collapse All';
        } else {
          state.expandedFolderIds = new Set();
          el.btnToggleAllFolders.textContent = '📁 Expand All';
        }
        renderFoldersTree();
      });
    }

    // Speed Selector buttons
    el.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        el.speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.opponentDelay = parseInt(btn.dataset.delay, 10);
        el.speedLabelVal.textContent = btn.textContent;
      });
    });

    // 5 Mode Tabs (drill, learn, test, mistakes, builder)
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.trainingMode = tab.dataset.mode;
        
        el.learningBox.classList.toggle('open', state.trainingMode === 'learn');

        if (state.trainingMode === 'builder') {
          exitReviewMode();
          initBuilderMode();
          return;
        } else {
          exitBuilderMode();
        }

        if (state.trainingMode === 'review') {
          initReviewMode();
          return;
        } else {
          exitReviewMode();
        }

        if (state.trainingMode === 'drill') {
          setBanner('state-ready', '⚡', 'Drill Mode: Svar lynhurtigt for at opbygge muskelhukommelse!');
        } else if (state.trainingMode === 'learn') {
          setBanner('state-ready', '📖', 'Learning Mode: Explore moves and strategic ideas at your own pace.');
          showLearningMove();
        } else if (state.trainingMode === 'test') {
          state.examStats = { totalMoves: 0, correctMoves: 0, linesCompleted: 0 };
          setBanner('state-ready', '🎓', 'Exam Mode: No hints! Play all selected lines to earn your grade.');
        } else if (state.trainingMode === 'mistakes') {
          const count = window.srsManager.getMistakeCount();
          if (count === 0) {
            setBanner('state-correct', '✨', 'No mistakes recorded! Keep up the great form in Drill Mode.');
          } else {
            setBanner('state-ready', '🎯', `Mistake Bank: ${count} line(s) need review.`);
          }
        }

        renderFoldersTree();
        resetRep();
      });
    });

    // Color Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.colorFilter = btn.dataset.filter;
        renderFoldersTree();
      });
    });

    // Learning Prev / Next
    el.btnLearnPrev.addEventListener('click', () => {
      if (state.moveIndex > 0) {
        state.moveIndex--;
        state.chess.undo();
        renderBoard();
        renderNotationTimeline();
        updateLearningBox();
        showLearningMove();
      }
    });

    el.btnLearnNext.addEventListener('click', () => {
      if (state.moveIndex < state.currentLine.moves.length) {
        const nextSan = state.currentLine.moves[state.moveIndex];
        state.chess.move(nextSan);
        state.moveIndex++;
        renderBoard();
        renderNotationTimeline();
        updateLearningBox();
        showLearningMove();
      }
    });

    // Profile Modal Events
    el.btnCloseProfile.addEventListener('click', () => el.modalProfile.classList.remove('open'));
    el.btnFetchProfile.addEventListener('click', handleProfileFetch);
    el.btnUnlinkProfile.addEventListener('click', handleProfileUnlink);
    if (el.btnFetchUserGames) {
      el.btnFetchUserGames.addEventListener('click', fetchUserGames);
    }

    // Theme Modal Events
    if (el.btnOpenThemeModal) {
      el.btnOpenThemeModal.addEventListener('click', () => {
        updatePieceSetPreviews();
        el.modalTheme.classList.add('open');
      });
    }
    if (el.btnCloseTheme) {
      el.btnCloseTheme.addEventListener('click', () => el.modalTheme.classList.remove('open'));
    }
    if (el.btnApplyTheme) {
      el.btnApplyTheme.addEventListener('click', () => {
        el.modalTheme.classList.remove('open');
        setBanner('state-correct', '🎨', `New theme activated: <strong>${state.boardTheme}</strong> with <strong>${state.pieceSet}</strong> (${state.pieceTheme}).`);
      });
    }

    document.querySelectorAll('#theme-board-options .theme-card-option').forEach(card => {
      card.addEventListener('click', () => {
        applyBoardTheme(card.dataset.boardTheme);
      });
    });

    document.querySelectorAll('#theme-piece-set-options .theme-card-option').forEach(card => {
      card.addEventListener('click', () => {
        applyPieceSet(card.dataset.pieceSet);
      });
    });

    document.querySelectorAll('#theme-piece-options .theme-card-option').forEach(card => {
      card.addEventListener('click', () => {
        applyPieceTheme(card.dataset.pieceTheme);
      });
    });



    bindReviewEvents();


    // Builder Mode Control Events
    if (el.btnBuilderUndo) el.btnBuilderUndo.addEventListener('click', undoBuilderMove);
    if (el.btnBuilderReset) el.btnBuilderReset.addEventListener('click', resetBuilder);
    if (el.btnBuilderCopy) el.btnBuilderCopy.addEventListener('click', copyBuilderPgn);
    if (el.btnBuilderSave) el.btnBuilderSave.addEventListener('click', toggleBuilderSaveDrawer);
    if (el.btnBuilderCloseDrawer) el.btnBuilderCloseDrawer.addEventListener('click', closeBuilderSaveDrawer);
    if (el.btnBuilderCancelSave) el.btnBuilderCancelSave.addEventListener('click', closeBuilderSaveDrawer);
    if (el.btnBuilderConfirmSave) el.btnBuilderConfirmSave.addEventListener('click', saveBuilderToRepertoire);
    if (el.builderFolderSelect) {
      el.builderFolderSelect.addEventListener('change', (e) => {
        if (el.builderNewFolderInput) {
          el.builderNewFolderInput.style.display = (e.target.value === '__new__') ? 'block' : 'none';
          if (e.target.value === '__new__') el.builderNewFolderInput.focus();
        }
      });
    }

    // Games Modal Events
    if (el.btnCloseGames) {
      el.btnCloseGames.addEventListener('click', () => el.modalGames.classList.remove('open'));
    }
    if (el.btnCancelGames) {
      el.btnCancelGames.addEventListener('click', () => el.modalGames.classList.remove('open'));
    }

    // Modals
    el.btnCloseExam.addEventListener('click', () => el.modalExam.classList.remove('open'));
    el.btnOkExam.addEventListener('click', () => el.modalExam.classList.remove('open'));

    el.btnOpenPgnModal.addEventListener('click', () => el.modalPgn.classList.add('open'));
    el.btnClosePgnModal.addEventListener('click', () => el.modalPgn.classList.remove('open'));
    el.btnCancelPgn.addEventListener('click', () => el.modalPgn.classList.remove('open'));
    el.btnSavePgn.addEventListener('click', handlePgnImport);

    el.btnOpenHelpModal.addEventListener('click', () => el.modalHelp.classList.add('open'));
    el.btnCloseHelpModal.addEventListener('click', () => el.modalHelp.classList.remove('open'));
    el.btnOkHelp.addEventListener('click', () => el.modalHelp.classList.remove('open'));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return;

      if (state.trainingMode === 'review') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepReview(-1);
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepReview(1);
          return;
        } else if (e.key === 'Home') {
          e.preventDefault();
          goToReviewMove(0);
          return;
        } else if (e.key === 'End') {
          e.preventDefault();
          if (state.reviewData) goToReviewMove(state.reviewData.moves.length);
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.trainingMode !== 'builder') advanceLineInFolder();
      } else if (e.key.toLowerCase() === 'r') {
        if (state.trainingMode === 'builder') resetBuilder();
        else resetRep();
      } else if (e.key.toLowerCase() === 'h') {
        if (state.trainingMode !== 'test' && state.trainingMode !== 'builder') showHint();
      } else if (e.key.toLowerCase() === 'f') {
        toggleBoardFlip();
      } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        if (state.trainingMode === 'builder') undoBuilderMove();
      }
    });
  }


  // =========================================================
  // Game Review & Grandmaster Coach Implementation
  // =========================================================
  function initReviewMode(customMoves = null, meta = null) {
    state.trainingMode = 'review';
    exitBuilderMode();

    if (meta) {
      state.reviewGameMeta = meta;
    } else if (!state.reviewGameMeta || !state.reviewGameMeta.whiteName) {
      state.reviewGameMeta = { whiteName: 'White', blackName: 'Black', whiteElo: '', blackElo: '' };
    }
    updatePlayerCards();

    // Update UI panels
    if (el.standardPanelContent) el.standardPanelContent.style.display = 'none';
    if (el.reviewPanelContent) el.reviewPanelContent.style.display = 'flex';
    if (el.standardLeftPanel) el.standardLeftPanel.style.display = 'none';
    if (el.reviewSidebarPanel) el.reviewSidebarPanel.style.display = 'flex';

    if (el.evalBarWrapper) el.evalBarWrapper.style.display = 'flex';
    if (el.reviewControlsBar) el.reviewControlsBar.style.display = 'flex';
    if (el.boardControls) el.boardControls.style.display = 'none';
    if (el.branchesBar) el.branchesBar.style.display = 'none';
    hideAltLinePrompt();

    // Update mode tabs UI
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === 'review');
    });

    setBanner('state-ready', '🔍', 'Game Review: Play moves for both sides, upload PGN, and get instant Coach feedback!');

    // Gather moves to analyze
    let movesToAnalyze = customMoves;
    if (movesToAnalyze === null) {
      if (state.currentLine && state.currentLine.moves && state.currentLine.moves.length > 0) {
        movesToAnalyze = state.currentLine.moves;
      } else if (state.builderMoves && state.builderMoves.length > 0) {
        movesToAnalyze = state.builderMoves.map(m => m.san);
      } else {
        movesToAnalyze = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'];
      }
    }

    if (movesToAnalyze && movesToAnalyze.length > 0) {
      runGameReview(movesToAnalyze);
    } else {
      // Empty fresh board for live review
      state.chess.reset();
      state.lastMove = null;
      state.reviewData = {
        moves: [],
        whiteAccuracy: 100,
        blackAccuracy: 100,
        breakdown: {
          white: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
          black: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 }
        }
      };
      state.reviewMoveIndex = 0;
      updateEvalBar(0);
      updateCoachDisplay(null);
      renderBoard();
      renderReviewMoveList();
      if (el.reviewGameMeta) el.reviewGameMeta.textContent = 'Free Board • Play moves for White and Black';
    }
  }

  function exitReviewMode() {
    if (state.reviewAutoplayTimer) {
      clearInterval(state.reviewAutoplayTimer);
      state.reviewAutoplayTimer = null;
    }
    if (el.reviewAutoplayIcon) el.reviewAutoplayIcon.textContent = '▶ Auto';

    if (el.standardPanelContent) el.standardPanelContent.style.display = 'flex';
    if (el.reviewPanelContent) el.reviewPanelContent.style.display = 'none';
    if (el.standardLeftPanel) el.standardLeftPanel.style.display = 'flex';
    if (el.reviewSidebarPanel) el.reviewSidebarPanel.style.display = 'none';

    if (el.evalBarWrapper) el.evalBarWrapper.style.display = 'none';
    if (el.reviewControlsBar) el.reviewControlsBar.style.display = 'none';
    if (el.boardControls) el.boardControls.style.display = 'flex';
    clearArrowCanvas();
    updatePlayerCards();
  }

  function executeReviewMove(fromSq, toSq) {
    let moveObj = null;
    try {
      moveObj = state.chess.move({ from: fromSq, to: toSq, promotion: 'q' });
    } catch (e) {
      return;
    }
    if (!moveObj) return;

    if (moveObj.captured) {
      if (state.soundToggles.capture) window.chessAudio.playCapture();
    } else if (state.chess.inCheck()) {
      window.chessAudio.playCheck();
    } else {
      if (state.soundToggles.move) window.chessAudio.playMove();
    }

    // Append to current review history
    let currentSans = [];
    if (state.reviewData && state.reviewData.moves) {
      currentSans = state.reviewData.moves.slice(0, state.reviewMoveIndex).map(m => m.san);
    }
    currentSans.push(moveObj.san);

    // Re-run review on updated moves and jump directly to new position
    runGameReview(currentSans, currentSans.length);
  }

  function identifyOpeningFromHistory(historySans) {
    if (!historySans || historySans.length < 1) return null;
    let bestMatch = null;
    let maxMatched = 0;

    for (const folder of state.folders) {
      for (const line of (folder.lines || [])) {
        let matchedCount = 0;
        for (let i = 0; i < historySans.length && i < line.moves.length; i++) {
          if (historySans[i] === line.moves[i]) {
            matchedCount++;
          } else {
            break;
          }
        }
        if (matchedCount > maxMatched && matchedCount >= 1) {
          maxMatched = matchedCount;
          bestMatch = {
            folderName: folder.name,
            lineName: line.name,
            eco: line.eco || folder.eco || 'ECO',
            matchedCount
          };
        }
      }
    }
    return bestMatch;
  }

  function runGameReview(moves, targetMoveIndex = null) {
    if (!window.GameReviewer) {
      console.error('GameReviewer engine not available');
      return;
    }

    const reviewer = new window.GameReviewer();
    const result = reviewer.analyze(moves, state.folders);
    state.reviewData = result;
    state.reviewMoveIndex = 0;
    state.showCoachArrow = false;

    // Update Accuracy Scores
    if (el.reviewAccWhite) el.reviewAccWhite.textContent = result.whiteAccuracy + '%';
    if (el.reviewAccBlack) el.reviewAccBlack.textContent = result.blackAccuracy + '%';
    if (el.reviewBarWhite) el.reviewBarWhite.style.width = result.whiteAccuracy + '%';
    if (el.reviewBarBlack) el.reviewBarBlack.style.width = result.blackAccuracy + '%';

    let metaTitle = (state.currentLine && state.currentLine.name) ? state.currentLine.name : 'Custom Game';
    if (state.reviewGameMeta && state.reviewGameMeta.whiteName && (state.reviewGameMeta.whiteName !== 'White' || state.reviewGameMeta.blackName !== 'Black')) {
      const wPart = state.reviewGameMeta.whiteName + (state.reviewGameMeta.whiteElo ? ` (${state.reviewGameMeta.whiteElo})` : '');
      const bPart = state.reviewGameMeta.blackName + (state.reviewGameMeta.blackElo ? ` (${state.reviewGameMeta.blackElo})` : '');
      metaTitle = `${wPart} vs ${bPart}`;
    }
    if (el.reviewGameMeta) {
      el.reviewGameMeta.textContent = `${metaTitle} • ${result.moves.length} moves analyzed`;
    }

    // Update Breakdown Table Counts
    const classes = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'missed_win'];
    classes.forEach(c => {
      const elW = document.getElementById('count-w-' + c);
      const elB = document.getElementById('count-b-' + c);
      if (elW) elW.textContent = result.breakdown.white[c] || 0;
      if (elB) elB.textContent = result.breakdown.black[c] || 0;
    });

    // Populate Review Move Rows
    renderReviewMoveList();

    // Start at target move index or move 1
    const targetIdx = (targetMoveIndex !== null) ? targetMoveIndex : (result.moves.length > 0 ? 1 : 0);
    goToReviewMove(targetIdx);
  }

  function renderReviewMoveList() {
    if (!el.reviewMovesList || !state.reviewData) return;
    el.reviewMovesList.innerHTML = '';

    const moves = state.reviewData.moves;
    const movePairsCount = Math.ceil(moves.length / 2);

    for (let i = 0; i < movePairsCount; i++) {
      const row = document.createElement('div');
      row.className = 'review-move-row';

      const numCol = document.createElement('span');
      numCol.className = 'review-move-num';
      numCol.textContent = (i + 1) + '.';
      row.appendChild(numCol);

      // White move
      const wIdx = i * 2;
      if (wIdx < moves.length) {
        const wMove = moves[wIdx];
        const btnW = document.createElement('button');
        btnW.className = 'review-move-btn' + (state.reviewMoveIndex === (wIdx + 1) ? ' active' : '');
        btnW.id = 'rev-btn-' + (wIdx + 1);
        btnW.innerHTML = `<span>${wMove.san}</span><span class="badge-mini badge-${wMove.classification}">${wMove.glyph}</span>`;
        btnW.addEventListener('click', () => goToReviewMove(wIdx + 1));
        row.appendChild(btnW);
      } else {
        row.appendChild(document.createElement('span'));
      }

      // Black move
      const bIdx = i * 2 + 1;
      if (bIdx < moves.length) {
        const bMove = moves[bIdx];
        const btnB = document.createElement('button');
        btnB.className = 'review-move-btn' + (state.reviewMoveIndex === (bIdx + 1) ? ' active' : '');
        btnB.id = 'rev-btn-' + (bIdx + 1);
        btnB.innerHTML = `<span>${bMove.san}</span><span class="badge-mini badge-${bMove.classification}">${bMove.glyph}</span>`;
        btnB.addEventListener('click', () => goToReviewMove(bIdx + 1));
        row.appendChild(btnB);
      } else {
        row.appendChild(document.createElement('span'));
      }

      el.reviewMovesList.appendChild(row);
    }
  }

  function goToReviewMove(moveIdx, playSound = true) {
    if (!state.reviewData || !state.reviewData.moves) return;
    const totalMoves = state.reviewData.moves.length;
    moveIdx = Math.max(0, Math.min(totalMoves, moveIdx));
    state.reviewMoveIndex = moveIdx;

    // Reset and advance chess instance
    state.chess.reset();
    for (let i = 0; i < moveIdx; i++) {
      try {
        state.chess.move(state.reviewData.moves[i].san);
      } catch (err) {}
    }

    let curMove = null;
    if (moveIdx === 0) {
      state.lastMove = null;
      updateEvalBar(0);
      updateCoachDisplay(null);
      clearArrowCanvas();
    } else {
      curMove = state.reviewData.moves[moveIdx - 1];
      state.lastMove = { from: curMove.from, to: curMove.to };
      updateEvalBar(curMove.evalScore, curMove.mateIn);
      updateCoachDisplay(curMove);

      if (state.showCoachArrow) {
        renderCoachArrows(curMove);
      } else {
        clearArrowCanvas();
      }

      // Audio feedback on move navigation in review
      if (playSound && state.reviewSoundEnabled) {
        if (curMove.san.includes('#') || (state.chess.inCheck && state.chess.inCheck())) {
          window.chessAudio.playCheck();
        } else if (curMove.captured || curMove.san.includes('x')) {
          if (state.soundToggles.capture) window.chessAudio.playCapture();
        } else {
          if (state.soundToggles.move) window.chessAudio.playMove();
        }
      }

      // Background Stockfish Grandmaster deep analysis (MultiPV 2)
      if (window.stockfishService && window.stockfishService.isReady) {
        const currentFen = state.chess.fen();
        window.stockfishService.evaluate(currentFen, (sfResult) => {
          if (state.chess.fen() !== currentFen) return;

          if (sfResult.bestMove) {
            // Accurate centipawn / mate score from White's perspective
            if (sfResult.bestMove.whiteMate !== null && sfResult.bestMove.whiteMate !== undefined) {
              updateEvalBar(sfResult.bestMove.whiteMate > 0 ? 15000 : -15000, sfResult.bestMove.whiteMate);
              if (el.coachEvalPill) el.coachEvalPill.textContent = (sfResult.bestMove.whiteMate > 0 ? '+M' : '-M') + Math.abs(sfResult.bestMove.whiteMate);
            } else if (sfResult.bestMove.whiteCp !== null && sfResult.bestMove.whiteCp !== undefined) {
              updateEvalBar(sfResult.bestMove.whiteCp, null);
              if (el.coachEvalPill) el.coachEvalPill.textContent = (sfResult.bestMove.whiteCp > 0 ? '+' : '') + (sfResult.bestMove.whiteCp / 100).toFixed(1);
            }

            if (sfResult.bestMove.from && sfResult.bestMove.to) {
              curMove.bestMoveFrom = sfResult.bestMove.from;
              curMove.bestMoveTo = sfResult.bestMove.to;
              if (sfResult.bestMove.san) curMove.bestMoveSan = sfResult.bestMove.san;
            }
          }

          if (sfResult.secondBestMove && sfResult.secondBestMove.from && sfResult.secondBestMove.to) {
            curMove.secondBestFrom = sfResult.secondBestMove.from;
            curMove.secondBestTo = sfResult.secondBestMove.to;
            if (sfResult.secondBestMove.san) curMove.secondBestSan = sfResult.secondBestMove.san;
          }

          updateCoachDisplay(curMove);
          if (state.showCoachArrow) {
            renderCoachArrows(curMove);
          }
        }, 12);
      }
    }

    renderBoard();

    // Update active highlight in move list WITHOUT SCROLLING THE PAGE WINDOW!
    document.querySelectorAll('.review-move-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('rev-btn-' + moveIdx);
    if (activeBtn) {
      activeBtn.classList.add('active');
      if (el.reviewMovesList) {
        const top = (activeBtn.offsetTop - el.reviewMovesList.offsetTop) - (el.reviewMovesList.clientHeight / 2) + (activeBtn.clientHeight / 2);
        el.reviewMovesList.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }

    if (el.reviewCurrentMoveLabel) {
      el.reviewCurrentMoveLabel.textContent = moveIdx === 0 ? 'Start' : `Move ${moveIdx} / ${totalMoves}`;
    }

    // Dynamic Opening Identification
    if (el.reviewOpeningBanner && el.reviewOpeningText) {
      const historySans = state.reviewData.moves.slice(0, moveIdx).map(m => m.san);
      const opening = identifyOpeningFromHistory(historySans);
      if (opening) {
        el.reviewOpeningBanner.style.display = 'flex';
        el.reviewOpeningText.innerHTML = `Opening: <strong>${opening.folderName}</strong> - ${opening.lineName} <small style="opacity:0.85">(${opening.eco})</small>`;
      } else {
        el.reviewOpeningBanner.style.display = 'none';
      }
    }
  }

  function stepReview(delta) {
    goToReviewMove(state.reviewMoveIndex + delta);
  }

  function jumpToNextMistake() {
    if (!state.reviewData || !state.reviewData.moves) return;
    const moves = state.reviewData.moves;
    const mistakeClasses = ['inaccuracy', 'mistake', 'blunder', 'missed_win'];

    // Search forward from current index
    let targetIdx = -1;
    for (let i = state.reviewMoveIndex; i < moves.length; i++) {
      if (mistakeClasses.includes(moves[i].classification)) {
        targetIdx = i + 1;
        break;
      }
    }

    // Wrap around if none found ahead
    if (targetIdx === -1) {
      for (let i = 0; i < state.reviewMoveIndex - 1; i++) {
        if (mistakeClasses.includes(moves[i].classification)) {
          targetIdx = i + 1;
          break;
        }
      }
    }

    if (targetIdx !== -1) {
      goToReviewMove(targetIdx);
    } else {
      setBanner('state-correct', '✨', 'No mistakes found in this game! Flawless play.');
    }
  }

  function toggleReviewAutoplay() {
    if (state.reviewAutoplayTimer) {
      clearInterval(state.reviewAutoplayTimer);
      state.reviewAutoplayTimer = null;
      if (el.reviewAutoplayIcon) el.reviewAutoplayIcon.textContent = '▶ Auto';
    } else {
      if (el.reviewAutoplayIcon) el.reviewAutoplayIcon.textContent = '⏸ Pause';
      state.reviewAutoplayTimer = setInterval(() => {
        if (!state.reviewData || state.reviewMoveIndex >= state.reviewData.moves.length) {
          clearInterval(state.reviewAutoplayTimer);
          state.reviewAutoplayTimer = null;
          if (el.reviewAutoplayIcon) el.reviewAutoplayIcon.textContent = '▶ Auto';
          return;
        }
        stepReview(1);
      }, 1500);
    }
  }

  function extractPgnMetadata(pgnText) {
    if (!pgnText || typeof pgnText !== 'string') return null;
    const getTag = (tag) => {
      const match = pgnText.match(new RegExp(`\\[\\s*${tag}\\s+["']?([^"\\]\\r\\n]+)["']?\\s*\\]`, 'i'));
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
      return null;
    };

    const whiteName = getTag('White') || getTag('WhiteTitle') || getTag('Player1') || 'White';
    const blackName = getTag('Black') || getTag('BlackTitle') || getTag('Player2') || 'Black';
    const whiteElo = getTag('WhiteElo') || getTag('White_Elo') || getTag('WhiteRating') || getTag('White_Rating') || getTag('WhiteEloRating') || '';
    const blackElo = getTag('BlackElo') || getTag('Black_Elo') || getTag('BlackRating') || getTag('Black_Rating') || getTag('BlackEloRating') || '';
    const event = getTag('Event') || '';
    const date = getTag('Date') || '';
    const result = getTag('Result') || '';

    return {
      whiteName,
      blackName,
      whiteElo,
      blackElo,
      event,
      date,
      result
    };
  }

  function updatePlayerCards() {
    if (!el.playerCardTop || !el.playerCardBottom) return;

    if (state.trainingMode !== 'review') {
      el.playerCardTop.style.display = 'none';
      el.playerCardBottom.style.display = 'none';
      return;
    }

    el.playerCardTop.style.display = 'flex';
    el.playerCardBottom.style.display = 'flex';

    const meta = state.reviewGameMeta || { whiteName: 'White', blackName: 'Black', whiteElo: '', blackElo: '' };

    if (!state.boardFlipped) {
      // Normal: Black on top, White on bottom
      if (el.playerAvatarTop) el.playerAvatarTop.textContent = '⚫';
      if (el.playerNameTop) el.playerNameTop.textContent = meta.blackName || 'Black';
      if (el.playerEloTop) {
        el.playerEloTop.textContent = meta.blackElo ? `(${meta.blackElo})` : '';
        el.playerEloTop.style.display = meta.blackElo ? 'inline-block' : 'none';
      }
      if (el.playerTagTop) {
        el.playerTagTop.textContent = 'Black';
        el.playerTagTop.className = 'player-card-tag tag-black';
      }

      if (el.playerAvatarBottom) el.playerAvatarBottom.textContent = '⚪';
      if (el.playerNameBottom) el.playerNameBottom.textContent = meta.whiteName || 'White';
      if (el.playerEloBottom) {
        el.playerEloBottom.textContent = meta.whiteElo ? `(${meta.whiteElo})` : '';
        el.playerEloBottom.style.display = meta.whiteElo ? 'inline-block' : 'none';
      }
      if (el.playerTagBottom) {
        el.playerTagBottom.textContent = 'White';
        el.playerTagBottom.className = 'player-card-tag tag-white';
      }
    } else {
      // Flipped: White on top, Black on bottom
      if (el.playerAvatarTop) el.playerAvatarTop.textContent = '⚪';
      if (el.playerNameTop) el.playerNameTop.textContent = meta.whiteName || 'White';
      if (el.playerEloTop) {
        el.playerEloTop.textContent = meta.whiteElo ? `(${meta.whiteElo})` : '';
        el.playerEloTop.style.display = meta.whiteElo ? 'inline-block' : 'none';
      }
      if (el.playerTagTop) {
        el.playerTagTop.textContent = 'White';
        el.playerTagTop.className = 'player-card-tag tag-white';
      }

      if (el.playerAvatarBottom) el.playerAvatarBottom.textContent = '⚫';
      if (el.playerNameBottom) el.playerNameBottom.textContent = meta.blackName || 'Black';
      if (el.playerEloBottom) {
        el.playerEloBottom.textContent = meta.blackElo ? `(${meta.blackElo})` : '';
        el.playerEloBottom.style.display = meta.blackElo ? 'inline-block' : 'none';
      }
      if (el.playerTagBottom) {
        el.playerTagBottom.textContent = 'Black';
        el.playerTagBottom.className = 'player-card-tag tag-black';
      }
    }
  }

  function updateEvalBar(score, mateIn = null) {
    if (!el.evalBarFillWhite || !el.evalBarScore) return;

    let heightPct = 50;
    let display = '0.0';

    if (mateIn !== null && mateIn !== undefined) {
      heightPct = mateIn > 0 ? 100 : 0;
      display = (mateIn > 0 ? '+M' : '-M') + Math.max(1, Math.abs(mateIn));
    } else if (Math.abs(score) >= 13500) {
      heightPct = score > 0 ? 100 : 0;
      display = score > 0 ? '+M1' : '-M1';
    } else {
      const clamped = Math.max(-1000, Math.min(1000, score));
      heightPct = 50 + (clamped / 1000) * 45;
      heightPct = Math.max(4, Math.min(96, heightPct));
      const pawns = (score / 100).toFixed(1);
      display = (score > 0 ? '+' : '') + pawns;
    }

    if (el.evalBar) {
      el.evalBar.classList.toggle('flipped', !!state.boardFlipped);
    }
    if (el.evalBarWrapper) {
      el.evalBarWrapper.classList.toggle('flipped', !!state.boardFlipped);
    }

    el.evalBarFillWhite.style.height = heightPct + '%';
    el.evalBarScore.textContent = display;

    // Position score label inside the dominant color section
    const isWhiteAdvantage = (score > 0) || (mateIn > 0);
    if (!state.boardFlipped) {
      // Normal: White at bottom, Black at top
      if (isWhiteAdvantage) {
        el.evalBarScore.style.top = 'auto';
        el.evalBarScore.style.bottom = '10px';
        el.evalBarScore.style.color = '#0f172a';
        el.evalBarScore.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.8)';
      } else {
        el.evalBarScore.style.top = '10px';
        el.evalBarScore.style.bottom = 'auto';
        el.evalBarScore.style.color = '#f8fafc';
        el.evalBarScore.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.8)';
      }
    } else {
      // Flipped: White at top, Black at bottom
      if (isWhiteAdvantage) {
        el.evalBarScore.style.top = '10px';
        el.evalBarScore.style.bottom = 'auto';
        el.evalBarScore.style.color = '#0f172a';
        el.evalBarScore.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.8)';
      } else {
        el.evalBarScore.style.top = 'auto';
        el.evalBarScore.style.bottom = '10px';
        el.evalBarScore.style.color = '#f8fafc';
        el.evalBarScore.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.8)';
      }
    }
  }

  function toggleBoardFlip() {
    state.boardFlipped = !state.boardFlipped;
    renderBoard();
    updatePlayerCards();

    if (state.trainingMode === 'review') {
      const curMove = (state.reviewData && state.reviewMoveIndex > 0) ? state.reviewData.moves[state.reviewMoveIndex - 1] : null;
      updateEvalBar(curMove ? curMove.evalScore : 0, curMove ? curMove.mateIn : null);
      if (state.showCoachArrow && curMove) {
        renderCoachArrows(curMove);
      } else {
        clearArrowCanvas();
      }
    } else if (state.hintArrow) {
      drawArrow(state.hintArrow.from, state.hintArrow.to);
    } else {
      clearArrowCanvas();
    }
  }

  function updateCoachDisplay(moveInfo) {
    if (!el.coachVerdictBadge || !el.coachSpeechBubble) return;

    if (!moveInfo) {
      el.coachVerdictBadge.className = 'coach-badge badge-good';
      el.coachVerdictBadge.textContent = 'Starting Position';
      if (el.coachEvalPill) el.coachEvalPill.textContent = '0.0';
      el.coachSpeechBubble.innerHTML = 'Game starting position. Step forward to review each move with grandmaster explanations.';
      if (el.coachSuggestionBox) el.coachSuggestionBox.style.display = 'none';
      return;
    }

    // Verdict Badge
    el.coachVerdictBadge.className = 'coach-badge badge-' + moveInfo.classification;
    el.coachVerdictBadge.textContent = moveInfo.glyph + ' ' + moveInfo.title;

    // Eval Pill
    if (el.coachEvalPill) el.coachEvalPill.textContent = moveInfo.evalDisplay;

    // Speech Bubble
    let commentHtml = moveInfo.coachComment || '';
    commentHtml = commentHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    el.coachSpeechBubble.innerHTML = commentHtml;

    // Coach Alternative & Recommended Moves Box
    if (el.coachSuggestionBox && el.coachSuggestionText) {
      if (moveInfo.bestMoveSan) {
        el.coachSuggestionBox.style.display = 'flex';
        let recHtml = `
          <div class="coach-recs-container">
            <div class="coach-rec-row">
              <div class="coach-rec-label-wrap">
                <span class="rec-dot rec-dot-primary" title="Primary Recommendation (Green Arrow)"></span>
                <span style="font-weight:600; color:#34d399;">#1 Best:</span>
                <strong>${moveInfo.bestMoveSan}</strong>
              </div>
              <button class="btn-pill primary" id="btn-play-coach-move" style="padding:2px 8px; font-size:0.75rem;">⚡ Play</button>
            </div>
            ${moveInfo.secondBestSan ? `
            <div class="coach-rec-row">
              <div class="coach-rec-label-wrap">
                <span class="rec-dot rec-dot-secondary" title="Secondary Alternative (Cyan Arrow)"></span>
                <span style="font-weight:600; color:#38bdf8;">#2 Alternative:</span>
                <strong>${moveInfo.secondBestSan}</strong>
              </div>
              <button class="btn-pill" id="btn-play-second-coach-move" style="padding:2px 8px; font-size:0.75rem;">⚡ Play</button>
            </div>` : ''}
          </div>
        `;
        el.coachSuggestionText.innerHTML = recHtml;

        const pBtn1 = document.getElementById('btn-play-coach-move');
        if (pBtn1) {
          pBtn1.onclick = () => playCoachSan(moveInfo.bestMoveSan);
        }
        const pBtn2 = document.getElementById('btn-play-second-coach-move');
        if (pBtn2) {
          pBtn2.onclick = () => playCoachSan(moveInfo.secondBestSan);
        }
      } else {
        el.coachSuggestionBox.style.display = 'none';
      }
    }
  }

  function toggleCoachArrow() {
    state.showCoachArrow = !state.showCoachArrow;
    if (el.btnReviewShowBest) {
      el.btnReviewShowBest.classList.toggle('active', state.showCoachArrow);
      el.btnReviewShowBest.innerHTML = state.showCoachArrow ? '<span>🎯</span> 2 Arrows: On' : '<span>🎯</span> 2 Arrows: Off';
    }
    if (el.btnCoachToggleArrow) {
      el.btnCoachToggleArrow.classList.toggle('active', state.showCoachArrow);
      el.btnCoachToggleArrow.innerHTML = state.showCoachArrow ? '<span>🎯</span> Hide 2 Arrows' : '<span>🎯</span> Show 2 Arrows';
    }

    if (state.reviewData && state.reviewMoveIndex > 0) {
      const curMove = state.reviewData.moves[state.reviewMoveIndex - 1];
      if (state.showCoachArrow && curMove) {
        renderCoachArrows(curMove);
      } else {
        clearArrowCanvas();
      }
    } else {
      clearArrowCanvas();
    }
  }

  function bindReviewEvents() {
    if (el.btnReviewFirst) el.btnReviewFirst.addEventListener('click', () => goToReviewMove(0));
    if (el.btnReviewPrev) el.btnReviewPrev.addEventListener('click', () => stepReview(-1));
    if (el.btnReviewNext) el.btnReviewNext.addEventListener('click', () => stepReview(1));
    if (el.btnReviewLast) {
      el.btnReviewLast.addEventListener('click', () => {
        if (state.reviewData) goToReviewMove(state.reviewData.moves.length);
      });
    }
    if (el.btnReviewNextMistake) el.btnReviewNextMistake.addEventListener('click', jumpToNextMistake);
    if (el.btnReviewAutoplay) el.btnReviewAutoplay.addEventListener('click', toggleReviewAutoplay);
    if (el.btnReviewShowBest) el.btnReviewShowBest.addEventListener('click', toggleCoachArrow);
    if (el.btnReviewFlip) {
      el.btnReviewFlip.addEventListener('click', toggleBoardFlip);
    }
    if (el.btnCoachToggleArrow) el.btnCoachToggleArrow.addEventListener('click', toggleCoachArrow);

    if (el.btnReviewReload) {
      el.btnReviewReload.addEventListener('click', () => {
        if (state.reviewData) {
          const sans = state.reviewData.moves.map(m => m.san);
          runGameReview(sans);
        }
      });
    }

    // PGN File Upload Trigger
    if (el.btnTriggerUploadPgn && el.reviewFileInput) {
      el.btnTriggerUploadPgn.addEventListener('click', () => {
        el.reviewFileInput.click();
      });
      el.reviewFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          const meta = extractPgnMetadata(content);
          const ChessConstructor = window.Chess || (typeof require !== 'undefined' ? (require('./vendor/chess.js').Chess || require('./vendor/chess.js')) : null);
          const tempC = new ChessConstructor();
          let parsedMoves = [];
          try {
            if (tempC.loadPgn && tempC.loadPgn(content)) {
              parsedMoves = tempC.history();
            }
          } catch (err) {}

          if (parsedMoves.length === 0) {
            const tokens = content.replace(/\{[^}]*\}/g, '')
                                  .replace(/\([^)]*\)/g, '')
                                  .replace(/\d+\.\.\./g, '')
                                  .replace(/\d+\./g, '')
                                  .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
                                  .trim().split(/\s+/);
            tempC.reset();
            for (const tok of tokens) {
              try {
                const res = tempC.move(tok);
                if (res) parsedMoves.push(res.san);
              } catch (err) {}
            }
          }

          if (parsedMoves.length < 2) {
            alert('Could not find enough valid chess moves in uploaded PGN file.');
            return;
          }

          initReviewMode(parsedMoves, meta);
          setBanner('state-correct', '📂', `Uploaded ${file.name} (${parsedMoves.length} moves) loaded for Game Review!`);
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    // Paste PGN Modal Trigger
    if (el.btnTriggerPastePgn) {
      el.btnTriggerPastePgn.addEventListener('click', () => {
        if (el.modalReviewPgn) el.modalReviewPgn.classList.add('open');
      });
    }

    // Free Board Analysis Trigger
    if (el.btnStartFreeAnalysis) {
      el.btnStartFreeAnalysis.addEventListener('click', () => {
        initReviewMode([], { whiteName: 'White', blackName: 'Black', whiteElo: '', blackElo: '' });
        setBanner('state-ready', '♟️', 'Free Analysis: Make moves for both White and Black on the board!');
      });
    }

    // Sample Game Buttons
    if (el.btnQuickOpera) {
      el.btnQuickOpera.addEventListener('click', () => {
        const opera = ['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'];
        initReviewMode(opera, { whiteName: 'Paul Morphy', blackName: 'Duke Karl / Count Isouard', whiteElo: '2600', blackElo: '2100' });
      });
    }

    if (el.btnQuickImmortal) {
      el.btnQuickImmortal.addEventListener('click', () => {
        const immortal = ['e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6','Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6','Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6','Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6','Nxg7+','Kd8','Qf6+','Nxf6','Be7#'];
        initReviewMode(immortal, { whiteName: 'Adolf Anderssen', blackName: 'Lionel Kieseritzky', whiteElo: '2650', blackElo: '2550' });
      });
    }

    if (el.btnQuickLondon) {
      el.btnQuickLondon.addEventListener('click', () => {
        const london = ['d4','d5','Bf4','Nf6','e3','e6','Nf3','Bd6','Bg3','O-O','Nbd2','c5','c3','Nc6','Bd3','b6','Ne5','Bb7','f4','Ne7','Qf3'];
        initReviewMode(london, { whiteName: 'White (London)', blackName: 'Black', whiteElo: '2000', blackElo: '2000' });
      });
    }

    if (el.btnReviewPastePgn) {
      el.btnReviewPastePgn.addEventListener('click', () => {
        if (el.modalReviewPgn) el.modalReviewPgn.classList.add('open');
      });
    }

    if (el.btnCloseReviewPgnModal) {
      el.btnCloseReviewPgnModal.addEventListener('click', () => {
        if (el.modalReviewPgn) el.modalReviewPgn.classList.remove('open');
      });
    }
    if (el.btnCancelReviewPgn) {
      el.btnCancelReviewPgn.addEventListener('click', () => {
        if (el.modalReviewPgn) el.modalReviewPgn.classList.remove('open');
      });
    }

    if (el.btnSampleOperaGame) {
      el.btnSampleOperaGame.addEventListener('click', () => {
        const operaMoves = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[WhiteElo "2600"]
[BlackElo "2100"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#`;
        if (el.reviewPgnInput) el.reviewPgnInput.value = operaMoves;
      });
    }

    if (el.btnSampleImmortalGame) {
      el.btnSampleImmortalGame.addEventListener('click', () => {
        const immortalMoves = `[Event "London"]
[Site "London"]
[Date "1851.06.21"]
[White "Adolf Anderssen"]
[Black "Lionel Kieseritzky"]
[Result "1-0"]
[WhiteElo "2650"]
[BlackElo "2550"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#`;
        if (el.reviewPgnInput) el.reviewPgnInput.value = immortalMoves;
      });
    }

    if (el.btnSubmitReviewPgn) {
      el.btnSubmitReviewPgn.addEventListener('click', () => {
        const raw = (el.reviewPgnInput ? el.reviewPgnInput.value : '').trim();
        if (!raw) {
          alert('Please paste a PGN string or move sequence.');
          return;
        }

        const meta = extractPgnMetadata(raw);
        const ChessConstructor = window.Chess || (typeof require !== 'undefined' ? (require('./vendor/chess.js').Chess || require('./vendor/chess.js')) : null);
        const tempChess = new ChessConstructor();
        let validMoves = [];

        // Try load_pgn or regex parsing
        try {
          if (tempChess.loadPgn && tempChess.loadPgn(raw)) {
            validMoves = tempChess.history();
          }
        } catch (e) {}

        if (validMoves.length === 0) {
          // Tokenize SAN moves
          const tokens = raw.replace(/\{[^}]*\}/g, '')
                            .replace(/\([^)]*\)/g, '')
                            .replace(/\d+\.\.\./g, '')
                            .replace(/\d+\./g, '')
                            .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
                            .trim().split(/\s+/);

          tempChess.reset();
          for (const tok of tokens) {
            try {
              const res = tempChess.move(tok);
              if (res) validMoves.push(res.san);
            } catch (err) {}
          }
        }

        if (validMoves.length < 2) {
          alert('Could not parse at least 2 valid chess moves from the input.');
          return;
        }

        if (el.modalReviewPgn) el.modalReviewPgn.classList.remove('open');
        initReviewMode(validMoves, meta);
      });
    }
  }

  // Pointer & Click Tracking for Drag-and-Drop and Click-to-Move
  let pointerStartPos = null;
  let isPointerDragging = false;

  function handleSquareClick(e) {
    if (state.isWaitingOpponent) return;

    const sq = e.target.closest('.square');
    if (!sq) return;
    const clickedSquare = sq.dataset.square;

    // 1. If we already have a selected piece and clicked square is among its legal moves -> MOVE!
    if (state.selectedSquare && state.legalMovesForSelected.includes(clickedSquare)) {
      const fromSq = state.selectedSquare;
      state.selectedSquare = null;
      state.legalMovesForSelected = [];
      if (state.trainingMode === 'builder') {
        executeBuilderMove(fromSq, clickedSquare);
      } else if (state.trainingMode === 'review') {
        executeReviewMove(fromSq, clickedSquare);
      } else {
        executeUserMove(fromSq, clickedSquare);
      }
      renderBoard();
      return;
    }

    // 2. Check if clicked piece belongs to player who has the turn
    const piece = state.chess.get(clickedSquare);
    let canSelectPiece = false;
    if (piece) {
      if (state.trainingMode === 'builder' || state.trainingMode === 'review') {
        canSelectPiece = (piece.color === state.chess.turn());
      } else {
        const userColor = state.currentFolder ? state.currentFolder.color : 'w';
        canSelectPiece = (piece.color === userColor && piece.color === state.chess.turn());
      }
    }

    if (canSelectPiece) {
      // If clicking the currently selected piece again -> deselect
      if (state.selectedSquare === clickedSquare) {
        state.selectedSquare = null;
        state.legalMovesForSelected = [];
      } else {
        state.selectedSquare = clickedSquare;
        const moves = state.chess.moves({ square: clickedSquare, verbose: true });
        state.legalMovesForSelected = moves.map(m => m.to);
      }
    } else {
      // Clicked on empty space or enemy piece not reachable
      state.selectedSquare = null;
      state.legalMovesForSelected = [];
    }

    renderBoard();
  }

  function handlePointerDown(e) {
    if (state.isWaitingOpponent) return;

    const sq = e.target.closest('.square');
    if (sq) {
      e.preventDefault();
    }
    if (!sq) return;
    const clickedSquare = sq.dataset.square;
    const piece = state.chess.get(clickedSquare);

    let canMovePiece = false;
    if (piece) {
      if (state.trainingMode === 'builder' || state.trainingMode === 'review') {
        canMovePiece = (piece.color === state.chess.turn());
      } else {
        const userColor = state.currentFolder ? state.currentFolder.color : 'w';
        canMovePiece = (piece.color === userColor && piece.color === state.chess.turn());
      }
    }

    if (canMovePiece) {
      state.draggedSquare = clickedSquare;
      pointerStartPos = { x: e.clientX, y: e.clientY };
      isPointerDragging = false;
    } else {
      state.draggedSquare = null;
      pointerStartPos = null;
      isPointerDragging = false;
    }
  }

  function handlePointerMove(e) {
    if (!state.draggedSquare || !pointerStartPos) return;

    const dist = Math.hypot(e.clientX - pointerStartPos.x, e.clientY - pointerStartPos.y);
    if (dist > 6) {
      isPointerDragging = true;
      e.preventDefault();
      state.selectedSquare = state.draggedSquare;
      const moves = state.chess.moves({ square: state.draggedSquare, verbose: true });
      state.legalMovesForSelected = moves.map(m => m.to);

      const piece = state.chess.get(state.draggedSquare);
      if (piece) {
        el.dragGhost.innerHTML = window.getPieceSvg(piece, state.pieceSet, state.pieceTheme);
        el.dragGhost.style.display = 'block';
        el.dragGhost.style.left = `${e.clientX}px`;
        el.dragGhost.style.top = `${e.clientY}px`;
      }

      const sqEl = document.getElementById(`sq-${state.draggedSquare}`);
      const pieceEl = sqEl ? sqEl.querySelector('.piece') : null;
      if (pieceEl) pieceEl.classList.add('dragging');
    }
  }

  function handlePointerUp(e) {
    if (!state.draggedSquare) {
      pointerStartPos = null;
      isPointerDragging = false;
      return;
    }

    if (isPointerDragging) {
      el.dragGhost.style.display = 'none';
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetSquareEl = elements.find(el => el.classList && el.classList.contains('square'));

      if (targetSquareEl) {
        const targetSquare = targetSquareEl.dataset.square;
        if (targetSquare && state.legalMovesForSelected.includes(targetSquare)) {
          if (state.trainingMode === 'builder') {
            executeBuilderMove(state.draggedSquare, targetSquare);
          } else if (state.trainingMode === 'review') {
            executeReviewMove(state.draggedSquare, targetSquare);
          } else {
            executeUserMove(state.draggedSquare, targetSquare);
          }
        }
      }

      state.draggedSquare = null;
      state.selectedSquare = null;
      state.legalMovesForSelected = [];
      isPointerDragging = false;
      pointerStartPos = null;
      renderBoard();
    } else {
      // A pure click without movement: do NOT clear selection!
      // Let handleSquareClick handle the click selection & destination move!
      el.dragGhost.style.display = 'none';
      state.draggedSquare = null;
      pointerStartPos = null;
      isPointerDragging = false;
    }
  }

  // =========================================================
  // Move Execution & Transposition Matching
  // =========================================================
  function executeUserMove(from, to) {
    clearArrowCanvas();
    hideAltLinePrompt();
    const expectedSan = state.currentLine.moves[state.moveIndex];

    let moveObj = null;
    try {
      moveObj = state.chess.move({ from, to, promotion: 'q' });
    } catch (err) {
      return;
    }

    if (!moveObj) return;

    // 1. Check if user move matches current line
    if (moveObj.san === expectedSan) {
      state.lastMove = { from, to };
      state.moveIndex++;

      if (moveObj.captured) { if (state.soundToggles.capture) window.chessAudio.playCapture(); }
      else { if (state.soundToggles.move) window.chessAudio.playMove(); }

      const statsResult = window.srsManager.recordMoveAttempt(
        true,
        state.currentLine.id,
        state.moveIndex,
        expectedSan,
        moveObj.san
      );
      if (state.soundToggles.correct) window.chessAudio.playCorrect(statsResult.streak);
      updateStatsDisplay();

      if (state.trainingMode === 'test') {
        state.examStats.totalMoves++;
        state.examStats.correctMoves++;
      }

      flashSquare(to, 'correct-pulse');
      renderBoard();
      renderNotationTimeline();
      updateLearningBox();
      updateAvailableBranches();

      // Check if progressive stage or line complete
      updateProgressiveBar();
      const currentTargetDepth = getLineTargetDepth(state.currentLine);
      if (state.moveIndex >= currentTargetDepth) {
        handleLineComplete();
        return;
      }

      setBanner('state-correct', '🔥', `Perfect (${moveObj.san})! Opponent replying...`);
      makeOpponentMove();
      return;
    }

    // 2. Played move is DIFFERENT from current line.
    // Check if it matches an alternative known line in the same folder or other folders!
    const matchingAlternatives = findMatchingLinesForMove(moveObj.san);
    
    // When Free Switch is ON: ask every time when breaking out of current line!
    if (matchingAlternatives.length > 0 && state.freeLineSwitch) {
      state.chess.undo();

      state.pendingAlternativeMove = {
        from,
        to,
        san: moveObj.san,
        matches: matchingAlternatives
      };

      if (matchingAlternatives.length === 1) {
        const alt = matchingAlternatives[0];
        el.altLinePrompt.innerHTML = `
          <div class="alt-prompt-header">
            <span style="font-size:1.3rem;">💡</span>
            <div class="alt-prompt-text">
              You played <strong>${moveObj.san}</strong>! That move branches into <strong>${alt.lineName}</strong> in <em>${alt.folderName}</em>.<br>
              Would you like to switch to this variation and continue?
            </div>
          </div>
          <div class="alt-prompt-actions">
            <button class="btn-switch-confirm" id="btn-switch-confirm-single" title="Press Enter to confirm">
              <span>✓</span> Yes, switch to ${alt.lineName} (Enter)
            </button>
            <button class="btn-switch-cancel" id="btn-switch-cancel-single" title="Press Esc to cancel">
              <span>✕</span> No, try again on current line (Esc)
            </button>
          </div>
        `;

        document.getElementById('btn-switch-confirm-single')?.addEventListener('click', () => {
          hideAltLinePrompt();
          const statsResult = window.srsManager.recordMoveAttempt(
            true,
            alt.lineId,
            alt.targetMoveIndex,
            moveObj.san,
            moveObj.san
          );
          if (state.soundToggles.correct) window.chessAudio.playCorrect(statsResult.streak);
          updateStatsDisplay();
          switchToAlternativeLine(alt);
        });

        document.getElementById('btn-switch-cancel-single')?.addEventListener('click', () => {
          hideAltLinePrompt();
          renderBoard();
          setBanner('state-ready', '↺', `Try again with the move for <strong>${state.currentLine.name}</strong> (expected: ${expectedSan})`);
        });
      } else {
        // Multiple matching lines
        el.altLinePrompt.innerHTML = `
          <div class="alt-prompt-header">
            <span style="font-size:1.3rem;">🔀</span>
            <div class="alt-prompt-text">
              You played <strong>${moveObj.san}</strong>! That move branches into <strong>${matchingAlternatives.length} variations</strong> in your repertoire:<br>
              Choose a variation to switch to:
            </div>
          </div>
          <div class="alt-prompt-choices">
            ${matchingAlternatives.map((m, idx) => `
              <button class="btn-pill primary btn-choose-branch" data-branch-idx="${idx}" style="font-size:0.82rem; padding:8px 14px;">
                <span>⚡</span> ${m.lineName} <small style="opacity:0.75">(${m.folderName})</small>
              </button>
            `).join('')}
          </div>
          <div class="alt-prompt-actions">
            <button class="btn-switch-cancel" id="btn-switch-cancel-single" title="Press Esc to cancel">
              <span>✕</span> No, stay on ${state.currentLine.name} (Esc)
            </button>
          </div>
        `;

        el.altLinePrompt.querySelectorAll('.btn-choose-branch').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.branchIdx, 10);
            const chosen = matchingAlternatives[idx];
            if (chosen) {
              hideAltLinePrompt();
              const statsResult = window.srsManager.recordMoveAttempt(
                true,
                chosen.lineId,
                chosen.targetMoveIndex,
                moveObj.san,
                moveObj.san
              );
              if (state.soundToggles.correct) window.chessAudio.playCorrect(statsResult.streak);
              updateStatsDisplay();
              switchToAlternativeLine(chosen);
            }
          });
        });

        document.getElementById('btn-switch-cancel-single')?.addEventListener('click', () => {
          hideAltLinePrompt();
          renderBoard();
          setBanner('state-ready', '↺', `Try again with the move for <strong>${state.currentLine.name}</strong> (expected: ${expectedSan})`);
        });
      }

      el.altLinePrompt.classList.add('open');
      setBanner('state-ready', '🔀', `Branch detected! Would you like to switch variation? [Enter: Yes / Esc: No]`);
      return;
    }

    // 3. Wrong move
    state.chess.undo();
    if (state.soundToggles.error) window.chessAudio.playError();
    
    window.srsManager.recordMoveAttempt(
      false,
      state.currentLine.id,
      state.moveIndex,
      expectedSan,
      moveObj.san
    );
    updateStatsDisplay();

    if (state.trainingMode === 'test') {
      state.examStats.totalMoves++;
    }

    flashSquare(to, 'error-pulse');
    setBanner(
      'state-error',
      '❌',
      `Incorrect move (${moveObj.san})! Expected move: <strong>${expectedSan}</strong>`
    );

    renderBoard();
    renderNotationTimeline();

    if (state.trainingMode !== 'test') {
      showHintForMove(expectedSan);
    }
  }

  function findMatchingLinesForMove(playedSan) {
    const history = state.currentLine.moves.slice(0, state.moveIndex);
    const targetMoveIndex = state.moveIndex + 1;
    const matches = [];

    // Prioritize current folder, then same-color folders
    const foldersToSearch = [
      state.currentFolder,
      ...state.folders.filter(f => f.id !== state.currentFolder.id && f.color === state.currentFolder.color)
    ];

    for (const folder of foldersToSearch) {
      for (const line of folder.lines) {
        if (line.id === state.currentLine.id) continue;
        if (line.moves.length >= targetMoveIndex) {
          const matchesHistory = history.every((m, idx) => m === line.moves[idx]);
          if (matchesHistory && line.moves[state.moveIndex] === playedSan) {
            matches.push({
              folderId: folder.id,
              folderName: folder.name,
              lineId: line.id,
              lineName: line.name,
              line,
              targetMoveIndex,
              isCurrentFolder: (folder.id === state.currentFolder.id)
            });
          }
        }
      }
    }
    return matches;
  }

  function updateAvailableBranches() {
    if (!el.branchesBar || !el.branchesChipsList) return;
    if (!state.currentLine || !state.currentFolder) {
      el.branchesBar.style.display = 'none';
      return;
    }

    const currentHistory = state.currentLine.moves.slice(0, state.moveIndex);
    const expectedCurrentSan = state.currentLine.moves[state.moveIndex];
    const branches = [];

    const foldersToScan = [
      state.currentFolder,
      ...state.folders.filter(f => f.id !== state.currentFolder.id && f.color === state.currentFolder.color)
    ];

    const seenMoves = new Set();
    if (expectedCurrentSan) seenMoves.add(expectedCurrentSan);

    for (const folder of foldersToScan) {
      for (const line of folder.lines) {
        if (line.id === state.currentLine.id) continue;
        if (line.moves.length > state.moveIndex) {
          const matchesHistory = currentHistory.every((m, idx) => m === line.moves[idx]);
          if (matchesHistory) {
            const nextMove = line.moves[state.moveIndex];
            if (nextMove && nextMove !== expectedCurrentSan && !seenMoves.has(nextMove)) {
              seenMoves.add(nextMove);
              branches.push({
                folderId: folder.id,
                folderName: folder.name,
                lineId: line.id,
                lineName: line.name,
                line,
                san: nextMove,
                targetMoveIndex: state.moveIndex + 1
              });
            }
          }
        }
      }
    }

    if (branches.length > 0) {
      el.branchesChipsList.innerHTML = branches.map((b, idx) => `
        <button class="branch-chip" data-branch-idx="${idx}" title="Switch or play ${b.san} (${b.lineName})">
          <span class="branch-san">${b.san}</span>
          <span>${b.lineName}</span>
        </button>
      `).join('');

      el.branchesChipsList.querySelectorAll('.branch-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.branchIdx, 10);
          const b = branches[idx];
          if (b) {
            switchToAlternativeLine(b);
          }
        });
      });

      el.branchesBar.style.display = 'flex';
    } else {
      el.branchesBar.style.display = 'none';
    }
  }

  function switchToAlternativeLine(chosenMatch) {
    if (state.opponentTimeoutId) {
      clearTimeout(state.opponentTimeoutId);
      state.opponentTimeoutId = null;
    }
    state.isWaitingOpponent = false;
    hideAltLinePrompt();

    // Set active folder & line
    const targetFolder = state.folders.find(f => f.id === chosenMatch.folderId) || state.currentFolder;
    state.currentFolder = targetFolder;
    state.currentLine = chosenMatch.line;
    state.boardFlipped = (state.currentFolder.color === 'b');

    // Fast-forward chess engine up to targetMoveIndex
    state.chess.reset();
    state.moveIndex = chosenMatch.targetMoveIndex;
    for (let i = 0; i < state.moveIndex; i++) {
      state.chess.move(chosenMatch.line.moves[i]);
    }

    // Set last move highlight
    const historyVerbose = state.chess.history({ verbose: true });
    if (historyVerbose.length > 0) {
      const last = historyVerbose[historyVerbose.length - 1];
      state.lastMove = { from: last.from, to: last.to };
    } else {
      state.lastMove = null;
    }

    // Update UI panels
    el.heroTitle.textContent = `${state.currentFolder.name}: ${state.currentLine.name}`;
    el.heroEco.textContent = state.currentLine.eco || state.currentFolder.eco || 'ECO';
    el.heroDesc.textContent = state.currentLine.explanation || state.currentFolder.description || '';

    const themes = state.currentLine.keyThemes || ['Classical Opening', state.currentFolder.name];
    el.heroThemes.innerHTML = themes.map(theme => 
      `<span class="theme-tag">${theme}</span>`
    ).join('');

    renderFoldersTree();
    renderNotationTimeline();
    updateLearningBox();
    updateAvailableBranches();
    renderBoard();
    updateProgressiveBar();

    if (state.lastMove && state.lastMove.to) {
      flashSquare(state.lastMove.to, 'correct-pulse');
    }

    if (state.soundToggles.move) window.chessAudio.playMove();
    setBanner('state-correct', '⚡', `Switched to <strong>${chosenMatch.lineName}</strong>! Playing on...`);

    // Check progressive depth or full completion
    const altTargetDepth = getLineTargetDepth(state.currentLine);
    if (state.moveIndex >= altTargetDepth) {
      handleLineComplete();
    } else {
      const isUserTurn = state.chess.turn() === state.currentFolder.color;
      if (isUserTurn) {
        if (state.trainingMode === 'learn') {
          showLearningMove();
        } else {
          const userColorName = state.currentFolder.color === 'w' ? 'White' : 'Black';
          setBanner('state-ready', '⚡', `Your turn as ${userColorName} in <strong>${state.currentLine.name}</strong>!`);
        }
      } else {
        makeOpponentMove();
      }
    }
  }

  function hideAltLinePrompt() {
    state.pendingAlternativeMove = null;
    state.pendingAlternativeLine = null;
    el.altLinePrompt.innerHTML = '';
    el.altLinePrompt.classList.remove('open');
  }

  function makeOpponentMove() {
    if (state.isWaitingOpponent) return;
    state.isWaitingOpponent = true;

    if (state.opponentTimeoutId) {
      clearTimeout(state.opponentTimeoutId);
      state.opponentTimeoutId = null;
    }

    state.opponentTimeoutId = setTimeout(() => {
      state.opponentTimeoutId = null;
      const targetDepthBefore = getLineTargetDepth(state.currentLine);
      if (state.moveIndex >= targetDepthBefore) {
        state.isWaitingOpponent = false;
        handleLineComplete();
        return;
      }

      const opponentSan = state.currentLine.moves[state.moveIndex];
      let opponentMoveObj = null;

      try {
        opponentMoveObj = state.chess.move(opponentSan);
      } catch (err) {
        console.error('Opponent illegal move:', opponentSan, err);
      }

      if (opponentMoveObj) {
        state.lastMove = { from: opponentMoveObj.from, to: opponentMoveObj.to };
        state.moveIndex++;

        if (opponentMoveObj.captured) { if (state.soundToggles.capture) window.chessAudio.playCapture(); }
        else if (state.chess.inCheck()) window.chessAudio.playCheck();
        else { if (state.soundToggles.move) window.chessAudio.playMove(); }

        renderBoard();
        renderNotationTimeline();
        updateLearningBox();
        updateAvailableBranches();

        updateProgressiveBar();
        const targetDepthAfter = getLineTargetDepth(state.currentLine);
        if (state.moveIndex >= targetDepthAfter) {
          handleLineComplete();
        } else {
          const userColorName = state.currentFolder.color === 'w' ? 'White' : 'Black';
          if (state.trainingMode === 'learn') {
            showLearningMove();
          } else {
            setBanner('state-ready', '⚡', `Opponent played ${opponentSan}. Your turn as ${userColorName}!`);
          }
        }
      }

      state.isWaitingOpponent = false;
    }, state.opponentDelay);
  }

  function handleLineComplete() {
    if (state.soundToggles.complete) window.chessAudio.playComplete();
    window.srsManager.resolveMistake(state.currentLine.id);

    const total = state.currentLine.moves ? state.currentLine.moves.length : 0;
    const currentTarget = getLineTargetDepth(state.currentLine);

    // Progressive Depth Learning Mode (Listudy style):
    if (state.progressiveDepthEnabled && currentTarget < total) {
      const nextTarget = Math.min(currentTarget + 4, total);
      state.lineProgress[state.currentLine.id] = nextTarget;
      localStorage.setItem('chessreps_line_progress', JSON.stringify(state.lineProgress));

      window.srsManager.addXp(35);
      updateStatsDisplay();
      updateProgressiveBar();

      const isFull = nextTarget >= total;
      if (isFull) {
        setBanner(
          'state-complete',
          '🏆',
          `<strong>Milestone Mastered!</strong> Reached full depth (${total} moves)! (+35 XP)`
        );
      } else {
        setBanner(
          'state-complete',
          '🌱',
          `<strong>Stage ${Math.ceil(currentTarget / 4)} Complete!</strong> Unlocked next chunk up to move ${nextTarget}! (+35 XP)`
        );
      }

      // Re-drill the line from move 1 up to the new expanded depth
      setTimeout(() => {
        resetRep();
      }, 700);
      return;
    }

    // Full line completed
    window.srsManager.addXp(60);
    updateStatsDisplay();
    updateActiveFolderAndLineInTree();
    updateProgressiveBar();

    if (state.trainingMode === 'test') {
      state.examStats.linesCompleted++;
      const activeLines = getAllActiveSelectedLines();
      if (state.examStats.linesCompleted >= activeLines.length) {
        finishExam();
        return;
      }
    }

    setBanner(
      'state-complete',
      '🎉',
      `<strong>Mastered!</strong> You completed ${state.currentLine.name}! (+60 XP)`
    );

    // Auto-advance to next line in folder
    const delay = state.trainingMode === 'learn' ? 600 : 350;
    setTimeout(() => {
      advanceLineInFolder();
    }, delay);
  }

  function getAllActiveSelectedLines() {
    const list = [];
    state.folders.forEach(folder => {
      if (state.colorFilter === 'w' && folder.color !== 'w') return;
      if (state.colorFilter === 'b' && folder.color !== 'b') return;

      (folder.lines || []).forEach(line => {
        if (state.selectedLineIds.has(line.id)) {
          list.push({ folder, line });
        }
      });
    });
    return list;
  }

  function advanceLine() {
    const activeSelected = getAllActiveSelectedLines();
    if (activeSelected.length === 0) {
      resetRep();
      setBanner('state-ready', '⚠️', 'No variations selected! Check any variation in the library to start training.');
      return;
    }

    if (activeSelected.length === 1) {
      const chosen = activeSelected[0];
      selectFolderAndLine(chosen.folder.id, chosen.line.id);
      return;
    }

    let nextItem = null;
    if (state.randomWithinFolder) {
      // Pick randomly among all active selected lines across all chosen folders!
      const currentLineId = state.currentLine ? state.currentLine.id : null;
      const others = activeSelected.filter(item => item.line.id !== currentLineId);
      const pool = others.length > 0 ? others : activeSelected;
      nextItem = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const currentLineId = state.currentLine ? state.currentLine.id : null;
      const currentIdx = activeSelected.findIndex(item => item.line.id === currentLineId);
      const nextIdx = (currentIdx + 1) % activeSelected.length;
      nextItem = activeSelected[nextIdx];
    }

    if (nextItem) {
      selectFolderAndLine(nextItem.folder.id, nextItem.line.id);
    }
  }

  function advanceLineInFolder() {
    advanceLine();
  }

  // =========================================================
  // Exam Mode Completion
  // =========================================================
  function finishExam() {
    const total = state.examStats.totalMoves || 1;
    const correct = state.examStats.correctMoves || 0;
    const pct = Math.round((correct / total) * 100);

    let grade = 'A+';
    let title = 'Grandmaster Niveau!';
    let xpBonus = 200;

    if (pct < 60) { grade = 'D'; title = 'Need more practice in Learn mode'; xpBonus = 20; }
    else if (pct < 75) { grade = 'C'; title = 'Godkendt indsats!'; xpBonus = 50; }
    else if (pct < 90) { grade = 'B+'; title = 'Well played!'; xpBonus = 100; }
    else if (pct < 98) { grade = 'A'; title = 'Outstanding precision!'; xpBonus = 150; }

    window.srsManager.addXp(xpBonus);
    updateStatsDisplay();

    el.examGradeBadge.textContent = grade;
    el.examGradeTitle.textContent = title;
    el.examGradeDesc.textContent = `You completed ${state.currentFolder.name} with ${pct}% accuracy.`;
    el.examCorrectCount.textContent = `${correct}/${total} moves`;
    el.examXpGained.textContent = `+${xpBonus} XP`;

    el.modalExam.classList.add('open');
  }

  // =========================================================
  // Learning Mode Notes & Hints
  // =========================================================
  function updateLearningBox() {
    if (!state.currentLine) return;
    const moveIdx = state.moveIndex;
    const total = state.currentLine.moves.length;

    if (moveIdx >= total) {
      el.learningMoveNote.textContent = 'Line completed! All key moves executed.';
      return;
    }

    const nextMove = state.currentLine.moves[moveIdx];
    const side = (moveIdx % 2 === 0) ? 'White' : 'Black';
    el.learningMoveNote.innerHTML = `
      Move ${Math.floor(moveIdx / 2) + 1} (${side}): <strong>${nextMove}</strong><br>
      <span style="color:var(--text-muted); font-size:0.8rem;">
        ${state.currentLine.explanation || 'Strategic move adhering to core opening principles.'}
      </span>
    `;
  }

  function showLearningMove() {
    if (state.moveIndex >= state.currentLine.moves.length) return;
    const expectedSan = state.currentLine.moves[state.moveIndex];
    showHintForMove(expectedSan);
  }

  function showHint() {
    if (state.moveIndex >= state.currentLine.moves.length) return;
    const expectedSan = state.currentLine.moves[state.moveIndex];
    showHintForMove(expectedSan);
    setBanner('state-ready', '💡', `Hint: Play <strong>${expectedSan}</strong>`);
  }

  function showHintForMove(expectedSan) {
    const moves = state.chess.moves({ verbose: true });
    const targetMove = moves.find(m => m.san === expectedSan);
    if (targetMove) {
      state.hintArrow = { from: targetMove.from, to: targetMove.to };
      drawArrow(targetMove.from, targetMove.to);
    }
  }

  function drawSingleArrow(fromSq, toSq, options = {}) {
    if (!fromSq || !toSq) return;
    const p1 = getSquareCenter(fromSq);
    const p2 = getSquareCenter(toSq);
    if (!p1 || !p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const color = options.color || '#10b981';
    const shadowColor = options.shadowColor || 'rgba(16, 185, 129, 0.65)';
    const sqSize = p1.size;
    const headLen = Math.max(16, Math.min(32, sqSize * 0.34));
    const lineWidth = options.width || Math.max(6, Math.min(13, sqSize * 0.12));

    const startOffset = Math.min(sqSize * 0.2, dist * 0.25);
    const startX = p1.x + Math.cos(angle) * startOffset;
    const startY = p1.y + Math.sin(angle) * startOffset;

    const tipX = p2.x;
    const tipY = p2.y;

    const shaftEndX = tipX - Math.cos(angle) * (headLen * 0.8);
    const shaftEndY = tipY - Math.sin(angle) * (headLen * 0.8);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 10;

    // Draw shaft
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - headLen * Math.cos(angle - Math.PI / 6),
      tipY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      tipX - (headLen * 0.6) * Math.cos(angle),
      tipY - (headLen * 0.6) * Math.sin(angle)
    );
    ctx.lineTo(
      tipX - headLen * Math.cos(angle + Math.PI / 6),
      tipY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawArrows(arrowsList) {
    setupCanvas();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.arrowCanvas.width, el.arrowCanvas.height);
    ctx.restore();

    if (!Array.isArray(arrowsList) || arrowsList.length === 0) return;

    // Draw secondary arrows first so primary arrow is in front
    for (let i = arrowsList.length - 1; i >= 0; i--) {
      const item = arrowsList[i];
      if (item && item.from && item.to) {
        drawSingleArrow(item.from, item.to, item);
      }
    }
  }

  function drawArrow(fromSq, toSq, color = '#10b981') {
    state.hintArrow = { from: fromSq, to: toSq };
    drawArrows([{ from: fromSq, to: toSq, color }]);
  }

  function renderCoachArrows(curMove) {
    if (!curMove) {
      clearArrowCanvas();
      return;
    }
    const arrows = [];

    // Primary Recommendation (#1 Best Move): Vibrant Emerald Green (#10b981)
    if (curMove.bestMoveFrom && curMove.bestMoveTo) {
      arrows.push({
        from: curMove.bestMoveFrom,
        to: curMove.bestMoveTo,
        color: '#10b981',
        shadowColor: 'rgba(16, 185, 129, 0.85)',
        width: 10
      });
    }

    // Secondary Recommendation (#2 Alternative Move): Vibrant Cyan (#06b6d4)
    if (state.showDualArrows && curMove.secondBestFrom && curMove.secondBestTo) {
      if (curMove.secondBestFrom !== curMove.bestMoveFrom || curMove.secondBestTo !== curMove.bestMoveTo) {
        arrows.push({
          from: curMove.secondBestFrom,
          to: curMove.secondBestTo,
          color: '#06b6d4',
          shadowColor: 'rgba(6, 182, 212, 0.85)',
          width: 8
        });
      }
    }

    drawArrows(arrows);
  }

  function playCoachSan(san) {
    if (!san) return;
    try {
      const m = state.chess.move(san);
      if (m) {
        state.lastMove = { from: m.from, to: m.to };
        renderBoard();
        clearArrowCanvas();
        if (window.chessAudio) {
          if (m.captured) window.chessAudio.playCapture();
          else window.chessAudio.playMove();
        }
      }
    } catch (e) {
      console.warn('Could not execute coach move:', san, e);
    }
  }

  function clearArrowCanvas() {
    state.hintArrow = null;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.arrowCanvas.width, el.arrowCanvas.height);
    ctx.restore();
  }

  function flashSquare(squareId, pulseClass) {
    const sqEl = document.getElementById(`sq-${squareId}`);
    if (sqEl) {
      sqEl.classList.add(pulseClass);
      setTimeout(() => sqEl.classList.remove(pulseClass), 600);
    }
  }

  function setBanner(stateClass, icon, textHtml) {
    el.feedbackBanner.className = `feedback-banner ${stateClass}`;
    el.feedbackIcon.textContent = icon;
    el.feedbackText.innerHTML = textHtml;
  }

  // =========================================================
  // Accordion Folders Tree Rendering with Checkboxes
  // =========================================================
  function getFilteredFolders() {
    let list = state.folders;

    if (state.colorFilter === 'w') list = list.filter(f => f.color === 'w');
    else if (state.colorFilter === 'b') list = list.filter(f => f.color === 'b');

    if (state.trainingMode === 'mistakes') {
      const mistakeIds = window.srsManager.getMistakeOpeningIds();
      list = list.filter(f => f.lines.some(l => mistakeIds.includes(l.id)));
    }

    if (state.searchQuery && state.searchQuery.trim().length > 0) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.map(f => {
        const folderMatches = f.name.toLowerCase().includes(q) || (f.eco && f.eco.toLowerCase().includes(q));
        const matchingLines = f.lines.filter(l => {
          return folderMatches ||
            l.name.toLowerCase().includes(q) ||
            (l.eco && l.eco.toLowerCase().includes(q)) ||
            (l.moves && l.moves.some(m => m.toLowerCase() === q || m.toLowerCase().includes(q))) ||
            (l.explanation && l.explanation.toLowerCase().includes(q)) ||
            (l.difficulty && l.difficulty.toLowerCase().includes(q));
        });
        if (matchingLines.length > 0) {
          return { ...f, lines: matchingLines };
        }
        return null;
      }).filter(Boolean);
    }

    return list;
  }

  function saveSelectedLines() {
    localStorage.setItem('chessreps_has_saved_selection', 'true');
    localStorage.setItem('chessreps_selected_lines', JSON.stringify([...state.selectedLineIds]));
  }

  function updatePlaylistCount() {
    const totalSelected = state.selectedLineIds.size;
    let totalAvailable = 0;
    state.folders.forEach(f => totalAvailable += (f.lines || []).length);
    if (el.playlistCountLabel) {
      el.playlistCountLabel.textContent = `${totalSelected} of ${totalAvailable} Active Variations`;
    }
  }

  // Smoothly update active folder and line in the DOM without rebuilding innerHTML or jumping layout
  function updateActiveFolderAndLineInTree() {
    if (!el.foldersTree) return;
    
    // If tree is not yet built, render it
    if (el.foldersTree.children.length === 0) {
      renderFoldersTree();
      return;
    }

    const currentFolderId = state.currentFolder ? state.currentFolder.id : null;
    const currentLineId = state.currentLine ? state.currentLine.id : null;

    // Update folder cards
    const cards = el.foldersTree.querySelectorAll('.folder-card');
    cards.forEach(card => {
      const isCurrentFolder = card.dataset.folderId === currentFolderId;
      card.classList.toggle('active', isCurrentFolder);
    });

    // Update line items
    const lineEls = el.foldersTree.querySelectorAll('.line-item');
    lineEls.forEach(lineEl => {
      const isCurrentLine = lineEl.dataset.lineId === currentLineId;
      lineEl.classList.toggle('active', isCurrentLine);
    });

    // Gently scroll inside the sidebar ONLY, NEVER scrolling window or shifting board
    scrollActiveLineInSidebar();
  }

  function scrollActiveLineInSidebar() {
    if (!el.foldersTree) return;
    const activeLineEl = el.foldersTree.querySelector('.line-item.active');
    if (!activeLineEl) return;

    const tree = el.foldersTree;
    const lineOffsetTop = activeLineEl.offsetTop;
    const treeScrollTop = tree.scrollTop;
    const treeHeight = tree.clientHeight;

    if (lineOffsetTop < treeScrollTop + 30 || lineOffsetTop > treeScrollTop + treeHeight - 50) {
      const prevX = window.scrollX;
      const prevY = window.scrollY;
      tree.scrollTop = Math.max(0, lineOffsetTop - (treeHeight / 2));
      if (window.scrollX !== prevX || window.scrollY !== prevY) {
        window.scrollTo(prevX, prevY);
      }
    }
  }

  function renderFoldersTree() {
    const folders = getFilteredFolders();
    el.foldersTree.innerHTML = '';

    if (folders.length === 0) {
      el.foldersTree.innerHTML = `
        <div style="padding:24px 16px; text-align:center; color:var(--text-dim); font-size:0.85rem;">
          <div style="font-size:1.5rem; margin-bottom:6px;">🔍</div>
          No openings match your search query.
        </div>`;
      return;
    }

    const isSearching = !!(state.searchQuery && state.searchQuery.trim().length > 0);
    if (!state.expandedFolderIds) {
      state.expandedFolderIds = new Set();
      if (state.currentFolder) state.expandedFolderIds.add(state.currentFolder.id);
    }

    folders.forEach(folder => {
      const isFolderActive = state.currentFolder && state.currentFolder.id === folder.id;
      let isExpanded = false;
      if (isSearching) {
        isExpanded = true;
      } else if (state.allFoldersExpanded) {
        isExpanded = true;
      } else {
        isExpanded = state.expandedFolderIds.has(folder.id);
      }

      const card = document.createElement('div');
      card.className = `folder-card ${isFolderActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`;
      card.dataset.folderId = folder.id;

      const checkedInFolder = folder.lines.filter(l => state.selectedLineIds.has(l.id)).length;
      const isAllChecked = checkedInFolder === folder.lines.length && folder.lines.length > 0;
      const isPartial = checkedInFolder > 0 && checkedInFolder < folder.lines.length;

      // Header
      const header = document.createElement('div');
      header.className = 'folder-header';
      header.innerHTML = `
        <div class="folder-title-left">
          <input type="checkbox" class="folder-checkbox" data-folder-id="${folder.id}" title="Toggle all variations in ${folder.name}" ${isAllChecked ? 'checked' : ''}>
          <span class="folder-icon">${folder.icon || '📁'}</span>
          <span class="folder-name">${folder.name}</span>
        </div>
        <div class="folder-title-right">
          <span class="folder-count-pill" title="${checkedInFolder} of ${folder.lines.length} active">${checkedInFolder}/${folder.lines.length}</span>
          <span class="folder-chevron">▶</span>
        </div>
      `;

      const folderCb = header.querySelector('.folder-checkbox');
      if (folderCb && isPartial) {
        folderCb.indeterminate = true;
      }
      if (folderCb) {
        folderCb.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetState = folderCb.checked;
          folder.lines.forEach(l => {
            if (targetState) state.selectedLineIds.add(l.id);
            else state.selectedLineIds.delete(l.id);
          });
          saveSelectedLines();
          renderFoldersTree();
          updatePlaylistCount();
        });
      }

      header.addEventListener('click', () => {
        const nowExpanded = card.classList.toggle('expanded');
        if (nowExpanded) {
          state.expandedFolderIds.add(folder.id);
        } else {
          state.expandedFolderIds.delete(folder.id);
        }
      });

      // Lines inside folder
      const linesContainer = document.createElement('div');
      linesContainer.className = 'folder-lines';

      folder.lines.forEach(line => {
        const isLineActive = state.currentLine && state.currentLine.id === line.id;
        const isChecked = state.selectedLineIds.has(line.id);
        const lineInfo = window.srsManager.getLineInfo(line.id);

        let stageClass = 'stage-ny';
        if (lineInfo.stage === 'I gang') stageClass = 'stage-igang';
        if (lineInfo.stage === 'Intermediate' || lineInfo.stage === 'Intermediate') stageClass = 'stage-ovet';
        if (lineInfo.stage === 'Mastered' || lineInfo.stage === 'Mestret') stageClass = 'stage-mestret';

        const lineEl = document.createElement('div');
        lineEl.className = `line-item ${isLineActive ? 'active' : ''}`;
        lineEl.dataset.lineId = line.id;
        
        lineEl.innerHTML = `
          <div class="line-left-group">
            <input type="checkbox" class="line-checkbox" data-line-id="${line.id}" ${isChecked ? 'checked' : ''} title="Check to include in active training">
            <span class="line-name">${line.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
            <span class="badge-moves" title="${line.moves.length} moves depth">${line.moves.length}t</span>
            <span class="badge-stage ${stageClass}">${lineInfo.stage}</span>
          </div>
        `;

        // Checkbox click
        const checkbox = lineEl.querySelector('.line-checkbox');
        if (checkbox) {
          checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            if (checkbox.checked) {
              state.selectedLineIds.add(line.id);
            } else {
              state.selectedLineIds.delete(line.id);
            }
            saveSelectedLines();
            updatePlaylistCount();
            
            // Update folder header count and checkbox state
            const updatedCheckedInFolder = folder.lines.filter(l => state.selectedLineIds.has(l.id)).length;
            const updatedAll = updatedCheckedInFolder === folder.lines.length && folder.lines.length > 0;
            const updatedPartial = updatedCheckedInFolder > 0 && updatedCheckedInFolder < folder.lines.length;
            const fCb = card.querySelector('.folder-checkbox');
            const fPill = card.querySelector('.folder-count-pill');
            if (fCb) {
              fCb.checked = updatedAll;
              fCb.indeterminate = updatedPartial;
            }
            if (fPill) {
              fPill.textContent = `${updatedCheckedInFolder}/${folder.lines.length}`;
            }
          });
        }

        // Click line to play
        lineEl.addEventListener('click', (e) => {
          e.stopPropagation();
          state.selectedLineIds.add(line.id);
          saveSelectedLines();
          selectFolderAndLine(folder.id, line.id);
        });

        linesContainer.appendChild(lineEl);
      });

      card.appendChild(header);
      card.appendChild(linesContainer);
      el.foldersTree.appendChild(card);
    });

    // Safely scroll within sidebar only
    setTimeout(() => {
      scrollActiveLineInSidebar();
    }, 40);
  }

  function renderNotationTimeline() {
    if (!state.currentLine) return;
    const frag = document.createDocumentFragment();

    const moves = state.currentLine.moves;
    const movePairsCount = Math.ceil(moves.length / 2);

    for (let i = 0; i < movePairsCount; i++) {
      const moveNum = i + 1;
      const whiteIdx = i * 2;
      const blackIdx = i * 2 + 1;

      const numSpan = document.createElement('span');
      numSpan.className = 'notation-num';
      numSpan.textContent = `${moveNum}.`;
      frag.appendChild(numSpan);

      const whiteSpan = document.createElement('span');
      whiteSpan.className = 'notation-move';
      whiteSpan.textContent = moves[whiteIdx] || '';
      if (whiteIdx < state.moveIndex) whiteSpan.classList.add('active-step');
      if (whiteIdx === state.moveIndex && state.currentFolder.color === 'w') {
        whiteSpan.classList.add('pending-user');
      }
      frag.appendChild(whiteSpan);

      const blackSpan = document.createElement('span');
      blackSpan.className = 'notation-move';
      blackSpan.textContent = moves[blackIdx] || '';
      if (blackIdx < state.moveIndex) blackSpan.classList.add('active-step');
      if (blackIdx === state.moveIndex && state.currentFolder.color === 'b') {
        blackSpan.classList.add('pending-user');
      }
      frag.appendChild(blackSpan);
    }

    el.notationGrid.replaceChildren(frag);
  }

  function updateStatsDisplay() {
    const stats = window.srsManager.state.stats;
    el.statStreak.textContent = stats.streak;
    el.statReps.textContent = stats.totalReps;
    el.statAccuracy.textContent = `${window.srsManager.getAccuracy()}%`;
    el.statPace.textContent = `${window.srsManager.getMovesPerMinute()} moves/min`;
    el.statLevel.textContent = `Lv. ${stats.level}`;
    el.statXp.textContent = `${stats.xp} XP`;
    el.badgeMistakesCount.textContent = window.srsManager.getMistakeCount();

    if (stats.streak >= 10) {
      el.chipStreak.className = 'stat-chip streak-chip on-fire';
      el.streakIcon.textContent = '⚡🔥';
    } else if (stats.streak >= 5) {
      el.chipStreak.className = 'stat-chip streak-chip on-fire';
      el.streakIcon.textContent = '🔥';
    } else {
      el.chipStreak.className = 'stat-chip streak-chip';
      el.streakIcon.textContent = '🔥';
    }
  }

  // =========================================================
  // Lichess & Chess.com Profile Integration
  // =========================================================
  function renderProfileWidget() {
    if (state.linkedProfile) {
      const p = state.linkedProfile;
      const avatarHtml = p.avatar 
        ? `<img class="profile-avatar" src="${p.avatar}" alt="${p.username}">`
        : `<div class="profile-avatar">${p.username.charAt(0).toUpperCase()}</div>`;

      el.headerProfileContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="profile-pill" id="profile-pill-badge" title="Connected to ${p.platform}: ${p.username}">
            ${avatarHtml}
            <strong>${p.title ? p.title + ' ' : ''}${p.username}</strong>
            <span class="profile-platform-badge">${p.platform === 'lichess' ? 'Lichess' : 'Chess.com'}</span>
            <span style="font-size:0.75rem; color:var(--color-amber); font-weight:700;">⚡${p.blitz || p.rapid || 1500}</span>
          </div>
          <button class="btn-pill" id="btn-header-games" title="Fetch recent games from your profile" style="padding: 6px 10px; font-size:0.75rem; background:rgba(6,182,212,0.15); border-color:var(--color-cyan); color:var(--color-cyan);">
            <span>📥</span> Games
          </button>
        </div>
      `;

      document.getElementById('profile-pill-badge')?.addEventListener('click', openProfileModal);
      document.getElementById('btn-header-games')?.addEventListener('click', fetchUserGames);
      el.btnUnlinkProfile.style.display = 'block';
      if (el.profileGamesSection) el.profileGamesSection.style.display = 'block';
    } else {
      el.headerProfileContainer.innerHTML = `
        <button class="btn-pill" id="btn-open-profile-modal" style="padding: 6px 12px; font-size:0.78rem;">
          <span>🔗</span> Connect Profile
        </button>
      `;
      document.getElementById('btn-open-profile-modal')?.addEventListener('click', openProfileModal);
      el.btnUnlinkProfile.style.display = 'none';
      if (el.profileGamesSection) el.profileGamesSection.style.display = 'none';
    }
  }

  function openProfileModal() {
    el.profileErrorMessage.style.display = 'none';
    el.profileLoadingIndicator.style.display = 'none';
    if (state.linkedProfile) {
      el.profilePlatformSelect.value = state.linkedProfile.platform;
      el.profileUsernameInput.value = state.linkedProfile.username;
      if (el.profileGamesSection) el.profileGamesSection.style.display = 'block';
    } else {
      if (el.profileGamesSection) el.profileGamesSection.style.display = 'none';
    }
    el.modalProfile.classList.add('open');
  }

  async function handleProfileFetch() {
    const platform = el.profilePlatformSelect.value;
    const username = el.profileUsernameInput.value.trim();

    if (!username) {
      showProfileError('Please enter a username.');
      return;
    }

    el.profileLoadingIndicator.style.display = 'block';
    el.profileErrorMessage.style.display = 'none';

    try {
      let profileData = null;

      if (platform === 'lichess') {
        const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error(`Lichess user '${username}' not found.`);
        const data = await res.json();

        profileData = {
          platform: 'lichess',
          username: data.username,
          title: data.title || '',
          avatar: data.profile && data.profile.avatarUrl ? data.profile.avatarUrl : null,
          blitz: data.perfs && data.perfs.blitz ? data.perfs.blitz.rating : null,
          rapid: data.perfs && data.perfs.rapid ? data.perfs.rapid.rating : null,
          puzzles: data.perfs && data.perfs.puzzle ? data.perfs.puzzle.rating : null
        };
      } else {
        // Chess.com Public API
        const userRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`);
        if (!userRes.ok) throw new Error(`Chess.com user '${username}' not found.`);
        const uData = await userRes.json();

        let statsData = {};
        try {
          const statsRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`);
          if (statsRes.ok) statsData = await statsRes.json();
        } catch (err) {}

        profileData = {
          platform: 'chesscom',
          username: uData.username,
          title: uData.title || '',
          avatar: uData.avatar || null,
          blitz: statsData.chess_blitz && statsData.chess_blitz.last ? statsData.chess_blitz.last.rating : null,
          rapid: statsData.chess_rapid && statsData.chess_rapid.last ? statsData.chess_rapid.last.rating : null,
          puzzles: statsData.tactics && statsData.tactics.highest ? statsData.tactics.highest.rating : null
        };
      }

      state.linkedProfile = profileData;
      localStorage.setItem('chessreps_linked_profile', JSON.stringify(profileData));
      
      el.profileLoadingIndicator.style.display = 'none';
      el.modalProfile.classList.remove('open');
      renderProfileWidget();

      setBanner(
        'state-correct',
        '✅',
        `Profile for <strong>${profileData.username}</strong> connected! (Blitz: ${profileData.blitz || '-'} | Rapid: ${profileData.rapid || '-'})`
      );

    } catch (err) {
      el.profileLoadingIndicator.style.display = 'none';
      showProfileError(err.message || 'Error fetching profile.');
    }
  }

  function handleProfileUnlink() {
    state.linkedProfile = null;
    localStorage.removeItem('chessreps_linked_profile');
    el.modalProfile.classList.remove('open');
    renderProfileWidget();
    setBanner('state-ready', '🔗', 'Chess profile disconnected.');
  }

  function showProfileError(msg) {
    el.profileErrorMessage.textContent = msg;
    el.profileErrorMessage.style.display = 'block';
  }

  // =========================================================
  // Online Games Fetching & Conversion to Repertoire
  // =========================================================
  async function fetchUserGames() {
    if (!state.linkedProfile) {
      openProfileModal();
      showProfileError('Connect your account first to fetch your personal games.');
      return;
    }

    const p = state.linkedProfile;
    el.modalProfile.classList.remove('open');
    el.modalGames.classList.add('open');

    el.gamesListContainer.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--color-cyan);">
        <div style="font-size:2.2rem; margin-bottom:10px;">⏳</div>
        <div style="font-size:0.95rem; font-weight:700;">Fetching recent games for <strong>${p.username}</strong>...</div>
        <div style="font-size:0.8rem; color:var(--text-dim); margin-top:4px;">Connecting to ${p.platform === 'lichess' ? 'Lichess.org API' : 'Chess.com Public API'}</div>
      </div>
    `;

    try {
      let games = [];

      if (p.platform === 'lichess') {
        const url = `https://lichess.org/api/games/user/${encodeURIComponent(p.username)}?max=15&opening=true&moves=true&perfType=bullet,blitz,rapid,classical`;
        const res = await fetch(url, { headers: { 'Accept': 'application/x-ndjson' } });
        if (!res.ok) throw new Error(`Could not fetch games from Lichess (${res.status}).`);
        
        const text = await res.text();
        const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
        
        lines.forEach(l => {
          try {
            const g = JSON.parse(l);
            if (g && g.moves) {
              const whiteUser = g.players?.white?.user?.name || 'White';
              const whiteRating = g.players?.white?.rating || '?';
              const blackUser = g.players?.black?.user?.name || 'Black';
              const blackRating = g.players?.black?.rating || '?';
              const isUserWhite = (whiteUser.toLowerCase() === p.username.toLowerCase());
              const userColor = isUserWhite ? 'w' : 'b';
              const opponent = isUserWhite ? blackUser : whiteUser;
              const opponentRating = isUserWhite ? blackRating : whiteRating;
              
              let resultStr = 'Draw';
              let resultColor = 'color-amber';
              if (g.winner) {
                if (g.winner === 'white') {
                  resultStr = isUserWhite ? '🏆 Won' : '❌ Lost';
                  resultColor = isUserWhite ? 'color-emerald' : 'color-rose';
                } else {
                  resultStr = isUserWhite ? '❌ Lost' : '🏆 Won';
                  resultColor = isUserWhite ? 'color-rose' : 'color-emerald';
                }
              }

              const moveTokens = g.moves.split(/\s+/).filter(m => m.length > 0);
              games.push({
                id: g.id,
                platform: 'lichess',
                userColor,
                opponent,
                opponentRating,
                resultStr,
                resultColor,
                openingName: g.opening?.name || 'Chess Game',
                eco: g.opening?.eco || 'PGN',
                moves: moveTokens,
                speed: g.speed || 'blitz',
                date: g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-US') : 'Recent'
              });
            }
          } catch (err) {}
        });
      } else {
        // Chess.com
        const archRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(p.username.toLowerCase())}/games/archives`);
        if (!archRes.ok) throw new Error(`Could not fetch archives from Chess.com (${archRes.status}).`);
        const archData = await archRes.json();
        
        if (!archData.archives || archData.archives.length === 0) {
          throw new Error('No archived games found for this profile.');
        }

        const latestArchive = archData.archives[archData.archives.length - 1];
        const gamesRes = await fetch(latestArchive);
        if (!gamesRes.ok) throw new Error('Could not fetch monthly games from Chess.com.');
        const gamesData = await gamesRes.json();

        const rawList = (gamesData.games || []).slice(-15).reverse();
        rawList.forEach((g, idx) => {
          if (!g.pgn) return;

          const whiteUser = g.white?.username || 'White';
          const whiteRating = g.white?.rating || '?';
          const blackUser = g.black?.username || 'Black';
          const blackRating = g.black?.rating || '?';
          const isUserWhite = (whiteUser.toLowerCase() === p.username.toLowerCase());
          const userColor = isUserWhite ? 'w' : 'b';
          const opponent = isUserWhite ? blackUser : whiteUser;
          const opponentRating = isUserWhite ? blackRating : whiteRating;

          // Parse ECO & Opening Name from PGN headers
          let eco = 'PGN';
          let openingName = 'Chess Game';
          const ecoMatch = g.pgn.match(/\[ECO "(.*?)"\]/);
          if (ecoMatch) eco = ecoMatch[1];
          const ecoUrlMatch = g.pgn.match(/\[ECOUrl "(.*?)"\]/);
          if (ecoUrlMatch) {
            const parts = ecoUrlMatch[1].split('/');
            openingName = decodeURIComponent(parts[parts.length - 1]).replace(/-/g, ' ');
          }

          // Result
          let resultStr = 'Draw';
          let resultColor = 'color-amber';
          const userResult = isUserWhite ? g.white?.result : g.black?.result;
          if (userResult === 'win') {
            resultStr = '🏆 Won';
            resultColor = 'color-emerald';
          } else if (['agreed', 'repetition', 'timevsinsufficient', 'stalemate'].includes(userResult)) {
            resultStr = '🤝 Draw';
            resultColor = 'color-amber';
          } else {
            resultStr = '❌ Lost';
            resultColor = 'color-rose';
          }

          // Clean PGN moves
          let cleanPgn = g.pgn.replace(/\[.*?\]/g, '');
          cleanPgn = cleanPgn.replace(/\{.*?\}/g, '');
          cleanPgn = cleanPgn.replace(/\(.*?\)/g, '');
          cleanPgn = cleanPgn.replace(/\d+\./g, ' ');
          cleanPgn = cleanPgn.replace(/1-0|0-1|1\/2-1\/2|\*/g, '');
          const tokens = cleanPgn.split(/\s+/).filter(t => t.length > 0);

          games.push({
            id: 'chesscom-' + idx,
            platform: 'chesscom',
            userColor,
            opponent,
            opponentRating,
            resultStr,
            resultColor,
            openingName,
            eco,
            moves: tokens,
            speed: g.time_class || 'blitz',
            date: 'Archive'
          });
        });
      }

      if (games.length === 0) {
        el.gamesListContainer.innerHTML = `
          <div style="text-align:center; padding:24px; color:var(--text-muted);">
            No games found for this profile. Try playing a game on ${p.platform === 'lichess' ? 'Lichess' : 'Chess.com'} first!
          </div>
        `;
        return;
      }

      // Render games list
      el.gamesListContainer.innerHTML = games.map((game, idx) => {
        const colorBadge = game.userColor === 'w'
          ? `<span class="badge-stage stage-mestret">⚪ White</span>`
          : `<span class="badge-stage stage-ovet">⚫ Black</span>`;

        return `
          <div class="game-item-card">
            <div style="display:flex; flex-direction:column; gap:4px; min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong style="font-size:0.92rem;">${game.openingName}</strong>
                <span class="eco-pill">${game.eco}</span>
                ${colorBadge}
                <span style="font-size:0.75rem; font-weight:700; color:var(--${game.resultColor});">${game.resultStr}</span>
              </div>
              <div class="game-info-meta" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <span>vs <strong>${game.opponent}</strong> (${game.opponentRating})</span>
                <span>•</span>
                <span>${game.speed}</span>
                <span>•</span>
                <span>${game.moves.length} moves</span>
                <span>•</span>
                <span>${game.date}</span>
              </div>
            </div>
            <button class="btn-pill primary btn-import-game" data-game-idx="${idx}" style="font-size:0.8rem; padding:7px 14px; flex-shrink:0;">
              <span>⚡</span> Train as Repertoire
            </button>
          </div>
        `;
      }).join('');

      // Attach click listeners to "Train as Repertoire"
      el.gamesListContainer.querySelectorAll('.btn-import-game').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.gameIdx, 10);
          const selectedGame = games[idx];
          if (selectedGame) {
            importGameAsRepertoire(selectedGame);
          }
        });
      });

    } catch (err) {
      el.gamesListContainer.innerHTML = `
        <div style="padding:16px; border:1px solid var(--color-rose); background:rgba(244,63,94,0.1); border-radius:var(--radius-md);">
          <div style="font-weight:700; color:var(--color-rose); margin-bottom:6px;">⚠️ Error fetching games:</div>
          <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${err.message || 'Could not connect to server.'}</div>
          <div style="margin-top:14px; display:flex; gap:8px;">
            <button class="btn-pill" id="btn-retry-games">🔄 Try Again</button>
            <button class="btn-pill primary" id="btn-load-demo-game">⚡ Load Magnus Carlsen Master Game</button>
          </div>
        </div>
      `;

      document.getElementById('btn-retry-games')?.addEventListener('click', fetchUserGames);
      document.getElementById('btn-load-demo-game')?.addEventListener('click', () => {
        importGameAsRepertoire({
          openingName: 'Sicilian Sveshnikov (Carlsen vs Caruana)',
          eco: 'B33',
          userColor: 'b',
          opponent: 'Fabiano Caruana (2828)',
          moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c3', 'O-O']
        });
      });
    }
  }

  function importGameAsRepertoire(game) {
    // Validate moves with Chess.js
    const testChess = new window.Chess();
    const validMoves = [];
    for (const move of game.moves) {
      try {
        const res = testChess.move(move);
        if (res) validMoves.push(res.san);
        else break;
      } catch (e) {
        break;
      }
    }

    if (validMoves.length < 2) {
      alert('Game does not contain enough valid moves for training.');
      return;
    }

    // Keep opening phase (up to 20 moves / 10 full turns)
    const repertoireMoves = validMoves.slice(0, 20);

    // Target Folder: "My Online Games"
    let targetFolder = state.folders.find(f => f.id === 'folder-online-games');
    if (!targetFolder) {
      targetFolder = {
        id: 'folder-online-games',
        name: 'My Online Games',
        color: game.userColor,
        icon: '🌐',
        eco: game.eco || 'PGN',
        description: 'Your own online games transformed into interactive opening repertoires.',
        lines: []
      };
      state.folders.push(targetFolder);
    }

    const lineId = 'line-game-' + Date.now();
    const newLine = {
      id: lineId,
      name: `${game.openingName} (vs ${game.opponent})`,
      moves: repertoireMoves,
      eco: game.eco || 'PGN',
      difficulty: 'Personal Game',
      explanation: `This repertoire is extracted from a game as ${game.userColor === 'w' ? 'White' : 'Black'} vs ${game.opponent}. Drill it until your opening moves are flawless!`,
      gameMeta: {
        whiteName: game.userColor === 'w' ? (game.username || 'You') : game.opponent,
        blackName: game.userColor === 'b' ? (game.username || 'You') : game.opponent,
        whiteElo: game.userColor === 'w' ? (game.userRating ? String(game.userRating) : '') : (game.opponentRating ? String(game.opponentRating) : ''),
        blackElo: game.userColor === 'b' ? (game.userRating ? String(game.userRating) : '') : (game.opponentRating ? String(game.opponentRating) : '')
      },
      keyThemes: [`Played vs ${game.opponent}`, `${repertoireMoves.length} moves`]
    };

    targetFolder.lines.push(newLine);
    state.selectedLineIds.add(newLine.id);
    saveSelectedLines();

    window.srsManager.addCustomOpening({
      ...newLine,
      folderId: targetFolder.id,
      folderName: targetFolder.name
    });

    el.modalGames.classList.remove('open');
    renderFoldersTree();
    selectFolderAndLine(targetFolder.id, newLine.id);

    setBanner(
      'state-correct',
      '🎉',
      `Game <strong>${newLine.name}</strong> successfully added to your repertoire!`
    );
  }

  // =========================================================
  // PGN Import Handler
  // =========================================================
  function handlePgnImport() {
    const folderName = el.pgnInputFolder.value.trim() || 'My PGN Repertoires';
    const lineName = el.pgnInputName.value.trim() || 'My Variation';
    const color = el.pgnInputColor.value;
    const text = el.pgnInputText.value.trim();

    if (!text) {
      alert('Please paste a PGN string or move list.');
      return;
    }

    let cleanText = text.replace(/\[.*?\]/g, '');
    cleanText = cleanText.replace(/\{.*?\}/g, '');
    cleanText = cleanText.replace(/\(.*?\)/g, '');
    cleanText = cleanText.replace(/\d+\./g, ' ');
    cleanText = cleanText.replace(/1-0|0-1|1\/2-1\/2|\*/g, '');

    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);
    const testChess = new window.Chess();
    const validMoves = [];

    for (const token of tokens) {
      try {
        const res = testChess.move(token);
        if (res) validMoves.push(res.san);
        else break;
      } catch (err) {
        break;
      }
    }

    if (validMoves.length < 2) {
      alert('At least 2 valid chess moves are required.');
      return;
    }

    let targetFolder = state.folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    if (!targetFolder) {
      targetFolder = {
        id: 'folder-custom-' + Date.now(),
        name: folderName,
        color,
        icon: '📁',
        eco: 'PGN',
        description: 'Custom folder with imported training variations.',
        lines: []
      };
      state.folders.push(targetFolder);
    }

    const meta = extractPgnMetadata(text);
    let effectiveLineName = lineName;
    if ((!el.pgnInputName.value.trim() || el.pgnInputName.value.trim() === 'My Variation') && meta && (meta.whiteName !== 'White' || meta.blackName !== 'Black')) {
      effectiveLineName = `${meta.whiteName} vs ${meta.blackName}`;
    }

    const newLine = {
      id: 'line-custom-' + Date.now(),
      name: effectiveLineName,
      moves: validMoves,
      eco: (meta && meta.event) ? meta.event : 'PGN',
      difficulty: 'Brugerdefineret',
      explanation: 'Imported line with ' + validMoves.length + ' moves.' + (meta && (meta.whiteElo || meta.blackElo) ? ` Ratings: White ${meta.whiteElo || '?'} - Black ${meta.blackElo || '?'}` : ''),
      gameMeta: meta,
      keyThemes: ['Custom Repertoire', `${validMoves.length} moves`]
    };

    targetFolder.lines.push(newLine);
    state.selectedLineIds.add(newLine.id);
    saveSelectedLines();

    window.srsManager.addCustomOpening({ ...newLine, folderId: targetFolder.id, folderName: targetFolder.name });

    el.modalPgn.classList.remove('open');
    el.pgnInputText.value = '';
    el.pgnInputName.value = '';

    renderFoldersTree();
    selectFolderAndLine(targetFolder.id, newLine.id);

    setBanner('state-correct', '✅', `Variation <strong>${lineName}</strong> added to <strong>${folderName}</strong>!`);
  }

  // =========================================================
  // PGN Repertoire Builder Functions
  // =========================================================
  function initBuilderMode() {
    state.trainingMode = 'builder';
    if (el.feedbackBanner) el.feedbackBanner.style.display = 'none';
    if (el.branchesBar) el.branchesBar.style.display = 'none';
    if (el.altLinePrompt) el.altLinePrompt.style.display = 'none';
    if (el.learningBox) el.learningBox.classList.remove('open');
    if (el.builderPanel) el.builderPanel.style.display = 'flex';

    resetBuilder();
  }

  function exitBuilderMode() {
    if (el.builderPanel) el.builderPanel.style.display = 'none';
    if (el.feedbackBanner) el.feedbackBanner.style.display = 'flex';
  }

  function resetBuilder() {
    if (state.opponentTimeoutId) {
      clearTimeout(state.opponentTimeoutId);
      state.opponentTimeoutId = null;
    }
    state.chess.reset();
    state.builderMoves = [];
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    state.lastMove = null;
    state.isWaitingOpponent = false;
    clearArrowCanvas();
    closeBuilderSaveDrawer();

    renderBoard();
    updateBuilderPgnUI();
    renderNotationTimelineForMoves(state.builderMoves);
  }

  function executeBuilderMove(from, to) {
    clearArrowCanvas();
    let moveObj = null;
    try {
      moveObj = state.chess.move({ from, to, promotion: 'q' });
    } catch (err) {
      return;
    }

    if (!moveObj) return;

    state.lastMove = { from, to };
    state.builderMoves.push(moveObj.san);

    if (moveObj.captured) {
      if (state.soundToggles.capture) window.chessAudio.playCapture();
    } else if (state.chess.inCheck()) {
      window.chessAudio.playCheck();
    } else {
      if (state.soundToggles.move) window.chessAudio.playMove();
    }

    updateBuilderPgnUI();
    renderNotationTimelineForMoves(state.builderMoves);
    renderBoard();
  }

  function undoBuilderMove() {
    if (state.builderMoves.length === 0) return;
    state.chess.undo();
    state.builderMoves.pop();
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    clearArrowCanvas();

    const history = state.chess.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      state.lastMove = { from: last.from, to: last.to };
    } else {
      state.lastMove = null;
    }

    if (state.soundToggles.move) window.chessAudio.playMove();
    updateBuilderPgnUI();
    renderNotationTimelineForMoves(state.builderMoves);
    renderBoard();
  }

  function updateBuilderPgnUI() {
    const moves = state.builderMoves;
    if (el.builderMovesCount) {
      el.builderMovesCount.textContent = `${moves.length} moves`;
    }

    if (el.builderStatusText) {
      const turnColor = state.chess.turn() === 'w' ? 'White ⚪' : 'Black ⚫';
      const moveRound = Math.floor(moves.length / 2) + 1;
      el.builderStatusText.textContent = `Move ${moveRound} • ${turnColor} to move`;
    }

    if (el.builderPgnDisplay) {
      if (moves.length === 0) {
        el.builderPgnDisplay.innerHTML = `<span class="builder-empty-hint">Move pieces on the board to construct your custom variation for both White and Black...</span>`;
      } else {
        let pgnHtml = '';
        for (let i = 0; i < moves.length; i += 2) {
          const round = (i / 2) + 1;
          const wMove = moves[i];
          const bMove = moves[i + 1];
          pgnHtml += `<span style="color:var(--text-muted); margin-right:4px;">${round}.</span>`;
          pgnHtml += `<strong style="color:#ffffff; margin-right:6px;">${wMove}</strong>`;
          if (bMove) {
            pgnHtml += `<strong style="color:#93c5fd; margin-right:8px;">${bMove}</strong>`;
          }
        }
        el.builderPgnDisplay.innerHTML = pgnHtml;
      }
    }
  }

  function getBuilderPgnString() {
    const moves = state.builderMoves;
    let str = '';
    for (let i = 0; i < moves.length; i += 2) {
      const round = (i / 2) + 1;
      str += `${round}. ${moves[i]} `;
      if (moves[i + 1]) {
        str += `${moves[i + 1]} `;
      }
    }
    return str.trim();
  }

  function copyBuilderPgn() {
    const pgn = getBuilderPgnString();
    if (!pgn) {
      alert('No moves have been played yet to copy.');
      return;
    }
    navigator.clipboard.writeText(pgn).then(() => {
      if (el.btnBuilderCopy) {
        const orig = el.btnBuilderCopy.innerHTML;
        el.btnBuilderCopy.innerHTML = '<span>✅</span> Copied!';
        setTimeout(() => { el.btnBuilderCopy.innerHTML = orig; }, 1800);
      }
    }).catch(() => {
      prompt('Kopier PGN:', pgn);
    });
  }

  function toggleBuilderSaveDrawer() {
    if (!el.builderSaveDrawer) return;
    const isClosed = el.builderSaveDrawer.style.display === 'none';
    if (isClosed) {
      openBuilderSaveDrawer();
    } else {
      closeBuilderSaveDrawer();
    }
  }

  function openBuilderSaveDrawer() {
    if (!el.builderSaveDrawer) return;
    // Populate folders
    if (el.builderFolderSelect) {
      el.builderFolderSelect.innerHTML = state.folders.map(f => 
        `<option value="${f.id}">${f.icon || '📁'} ${f.name}</option>`
      ).join('') + `<option value="__new__">➕ Opret ny mappe...</option>`;

      if (state.currentFolder) {
        el.builderFolderSelect.value = state.currentFolder.id;
      }
    }

    if (el.builderNewFolderInput) {
      el.builderNewFolderInput.style.display = 'none';
      el.builderNewFolderInput.value = '';
    }

    if (el.builderLineName) {
      el.builderLineName.value = `My Variation (${state.builderMoves.length} moves)`;
    }

    if (el.builderLineColor) {
      el.builderLineColor.value = (state.currentFolder && state.currentFolder.color) ? state.currentFolder.color : 'w';
    }

    el.builderSaveDrawer.style.display = 'flex';
  }

  function closeBuilderSaveDrawer() {
    if (el.builderSaveDrawer) {
      el.builderSaveDrawer.style.display = 'none';
    }
  }

  function saveBuilderToRepertoire() {
    if (state.builderMoves.length < 2) {
      alert('Play at least 2 moves (1 for White and 1 for Black) to save a variation.');
      return;
    }

    const folderSelectVal = el.builderFolderSelect.value;
    let targetFolder = null;

    if (folderSelectVal === '__new__') {
      const newFolderName = (el.builderNewFolderInput.value || '').trim() || 'My Custom Repertoire';
      targetFolder = {
        id: 'folder-custom-' + Date.now(),
        name: newFolderName,
        color: el.builderLineColor.value,
        icon: '📁',
        eco: 'PGN',
        description: 'Custom folder with your own created variations.',
        lines: []
      };
      state.folders.push(targetFolder);
    } else {
      targetFolder = state.folders.find(f => f.id === folderSelectVal);
      if (!targetFolder) targetFolder = state.folders[0];
    }

    const lineName = (el.builderLineName.value || '').trim() || `New Variation (${state.builderMoves.length} moves)`;
    const color = el.builderLineColor.value;
    const desc = (el.builderLineDesc.value || '').trim() || `Created in PGN Builder with ${state.builderMoves.length} moves.`;

    const lineId = 'line-built-' + Date.now();
    const newLine = {
      id: lineId,
      name: lineName,
      moves: [...state.builderMoves],
      eco: 'PGN',
      difficulty: 'Eget Repertoire',
      explanation: desc,
      keyThemes: ['Custom Repertoire', `${state.builderMoves.length} moves`]
    };

    targetFolder.lines.push(newLine);
    state.selectedLineIds.add(newLine.id);
    saveSelectedLines();

    window.srsManager.addCustomOpening({
      ...newLine,
      folderId: targetFolder.id,
      folderName: targetFolder.name
    });

    closeBuilderSaveDrawer();
    renderFoldersTree();

    // Switch to drill mode to train the new line!
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('mode-tab-drill')?.classList.add('active');
    state.trainingMode = 'drill';
    exitBuilderMode();
    selectFolderAndLine(targetFolder.id, newLine.id);

    setBanner('state-correct', '🎉', `The variation <strong>${lineName}</strong> has been saved to <strong>${targetFolder.name}</strong> and is ready to drill!`);
    if (state.soundToggles.complete) window.chessAudio.playComplete();
  }

  function renderNotationTimelineForMoves(moves) {
    if (!el.notationGrid) return;
    el.notationGrid.innerHTML = '';
    const movePairsCount = Math.ceil(moves.length / 2);

    for (let i = 0; i < movePairsCount; i++) {
      const moveNum = i + 1;
      const whiteIdx = i * 2;
      const blackIdx = i * 2 + 1;

      const numSpan = document.createElement('span');
      numSpan.className = 'notation-num';
      numSpan.textContent = `${moveNum}.`;
      el.notationGrid.appendChild(numSpan);

      const whiteSpan = document.createElement('span');
      whiteSpan.className = 'notation-move active-step';
      whiteSpan.textContent = moves[whiteIdx] || '';
      el.notationGrid.appendChild(whiteSpan);

      const blackSpan = document.createElement('span');
      blackSpan.className = 'notation-move';
      if (moves[blackIdx]) {
        blackSpan.textContent = moves[blackIdx];
        blackSpan.classList.add('active-step');
      }
      el.notationGrid.appendChild(blackSpan);
    }
  }

  // Start app!
  init();
});
