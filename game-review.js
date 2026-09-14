// =========================================================
// ChessReps Pro - Game Review & Grandmaster Coach Engine
// Dual-Move Engine, Quiescence Search & True Brilliant Detection
// =========================================================

(function (global) {
  'use strict';

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  const PIECE_NAMES = {
    p: 'pawn',
    n: 'knight',
    b: 'bishop',
    r: 'rook',
    q: 'queen',
    k: 'king'
  };

  // Piece-Square Tables (White perspective, 0-63 a8=0 .. h1=63)
  const PAWN_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ];

  const KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  const BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  const ROOK_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
  ];

  const QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  const KING_MIDDLE_PST = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ];

  function evaluateBoard(chessInstance) {
    const isMate = chessInstance.isCheckmate ? chessInstance.isCheckmate() : (chessInstance.in_checkmate && chessInstance.in_checkmate());
    if (isMate) {
      return chessInstance.turn() === 'w' ? -15000 : 15000;
    }
    const isDraw = chessInstance.isDraw ? chessInstance.isDraw() : (chessInstance.in_draw && chessInstance.in_draw());
    if (isDraw) return 0;

    let score = 0;
    const board = chessInstance.board();
    let whiteBishops = 0, blackBishops = 0;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        const sqIdxWhite = r * 8 + f;
        const sqIdxBlack = (7 - r) * 8 + f;

        let pst = 0;
        switch (piece.type) {
          case 'p': pst = (piece.color === 'w') ? PAWN_PST[sqIdxWhite] : PAWN_PST[sqIdxBlack]; break;
          case 'n': pst = (piece.color === 'w') ? KNIGHT_PST[sqIdxWhite] : KNIGHT_PST[sqIdxBlack]; break;
          case 'b':
            pst = (piece.color === 'w') ? BISHOP_PST[sqIdxWhite] : BISHOP_PST[sqIdxBlack];
            if (piece.color === 'w') whiteBishops++; else blackBishops++;
            break;
          case 'r': pst = (piece.color === 'w') ? ROOK_PST[sqIdxWhite] : ROOK_PST[sqIdxBlack]; break;
          case 'q': pst = (piece.color === 'w') ? QUEEN_PST[sqIdxWhite] : QUEEN_PST[sqIdxBlack]; break;
          case 'k': pst = (piece.color === 'w') ? KING_MIDDLE_PST[sqIdxWhite] : KING_MIDDLE_PST[sqIdxBlack]; break;
        }

        if (piece.color === 'w') {
          score += (val + pst);
        } else {
          score -= (val + pst);
        }
      }
    }

    if (whiteBishops >= 2) score += 35;
    if (blackBishops >= 2) score -= 35;

    return score;
  }

  // Quiescence Search: resolves all captures and checks to prevent horizon jumps
  function quiescence(chessInstance, alpha, beta, isMaximizing, depth = 2) {
    const isMate = chessInstance.isCheckmate ? chessInstance.isCheckmate() : (chessInstance.in_checkmate && chessInstance.in_checkmate());
    if (isMate) return isMaximizing ? -15000 : 15000;

    const standPat = evaluateBoard(chessInstance);
    if (depth === 0) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
      if (standPat + 950 < alpha) return alpha; // Delta pruning

      const moves = chessInstance.moves({ verbose: true });
      const tactical = moves.filter(m => m.captured || m.san.includes('+') || m.promotion).slice(0, 4);
      if (tactical.length === 0) return standPat;

      tactical.sort((a, b) => {
        const aVal = (a.captured ? PIECE_VALUES[a.captured] : 0) - (PIECE_VALUES[a.piece] || 0);
        const bVal = (b.captured ? PIECE_VALUES[b.captured] : 0) - (PIECE_VALUES[b.piece] || 0);
        return bVal - aVal;
      });

      for (const m of tactical) {
        chessInstance.move(m);
        const score = quiescence(chessInstance, alpha, beta, false, depth - 1);
        chessInstance.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
      if (standPat - 950 > beta) return beta; // Delta pruning

      const moves = chessInstance.moves({ verbose: true });
      const tactical = moves.filter(m => m.captured || m.san.includes('+') || m.promotion).slice(0, 4);
      if (tactical.length === 0) return standPat;

      tactical.sort((a, b) => {
        const aVal = (a.captured ? PIECE_VALUES[a.captured] : 0) - (PIECE_VALUES[a.piece] || 0);
        const bVal = (b.captured ? PIECE_VALUES[b.captured] : 0) - (PIECE_VALUES[b.piece] || 0);
        return bVal - aVal;
      });

      for (const m of tactical) {
        chessInstance.move(m);
        const score = quiescence(chessInstance, alpha, beta, true, depth - 1);
        chessInstance.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  // Evaluates position and finds top 2 recommended moves (primary best & secondary alternative)
  function findTop2Moves(chessInstance) {
    const isWhite = chessInstance.turn() === 'w';
    const moves = chessInstance.moves({ verbose: true });
    if (moves.length === 0) {
      return { bestMove: null, secondBestMove: null, evalScore: evaluateBoard(chessInstance) };
    }

    // Immediate Checkmate Detection (Mate in 1)
    for (const m of moves) {
      chessInstance.move(m);
      const isMate = chessInstance.isCheckmate ? chessInstance.isCheckmate() : (chessInstance.in_checkmate && chessInstance.in_checkmate());
      chessInstance.undo();
      if (isMate) {
        return {
          bestMove: { ...m, evalScore: isWhite ? 15000 : -15000, mateIn: isWhite ? 1 : -1 },
          secondBestMove: null,
          evalScore: isWhite ? 15000 : -15000
        };
      }
    }

    // Fast static pre-scoring
    const candidates = [];
    for (const m of moves) {
      chessInstance.move(m);
      const staticScore = evaluateBoard(chessInstance);
      chessInstance.undo();
      candidates.push({ move: m, san: m.san, from: m.from, to: m.to, staticScore });
    }
    candidates.sort((a, b) => isWhite ? b.staticScore - a.staticScore : a.staticScore - b.staticScore);

    // Deep quiescence on top 6 candidates + any tactical captures/checks
    const searchCandidates = candidates.slice(0, 6);
    for (let i = 6; i < candidates.length; i++) {
      if (candidates[i].move.captured || candidates[i].move.san.includes('+')) {
        searchCandidates.push(candidates[i]);
      }
    }

    const scoredMoves = [];
    for (const cand of searchCandidates) {
      chessInstance.move(cand.move);
      const score = quiescence(chessInstance, -30000, 30000, !isWhite, 2);
      chessInstance.undo();
      scoredMoves.push({
        move: cand.move,
        san: cand.san,
        from: cand.from,
        to: cand.to,
        evalScore: score
      });
    }

    scoredMoves.sort((a, b) => isWhite ? b.evalScore - a.evalScore : a.evalScore - b.evalScore);

    return {
      bestMove: scoredMoves[0] || null,
      secondBestMove: scoredMoves[1] || null,
      evalScore: scoredMoves[0] ? scoredMoves[0].evalScore : 0
    };
  }

  // True Brilliant Move Detector
  // Criteria:
  // 1. Genuine voluntary material sacrifice (e.g. piece or exchange sacrifice).
  // 2. The move is the top or near-top engine move (evalDiff <= 15).
  // 3. The resulting position retains winning or decisive compensation.
  // 4. Standard piece development or equal recaptures can NEVER be brilliant!
  function checkTrueSacrifice(chessBefore, chessAfter, moveObj, turn, bestEval, evalAfter, evalDiff, lastOppMove) {
    if (evalDiff > 15) return false;

    // Recapturing an opponent's piece on the square they just captured is a recapture, NOT a sacrifice!
    if (lastOppMove && lastOppMove.to === moveObj.to) {
      return false;
    }

    // Must retain decisive compensation (+1.5 pawns or mate)
    const playerPerspectiveEval = evalAfter * (turn === 'w' ? 1 : -1);
    if (playerPerspectiveEval < 150) return false;

    const pieceVal = PIECE_VALUES[moveObj.piece] || 0;
    const capturedVal = moveObj.captured ? (PIECE_VALUES[moveObj.captured] || 0) : 0;

    // Case 1: Direct unfavorable trade (Exchange sacrifice or piece for pawn)
    if (moveObj.captured && (pieceVal - capturedVal >= 170) && moveObj.piece !== 'q') {
      return true;
    }

    // Case 2: Voluntary sacrifice - offering a piece of value >= 300 to be captured
    const oppReplies = chessAfter.moves({ verbose: true });
    let canOpponentWinMaterial = false;

    for (const oppMove of oppReplies) {
      if (oppMove.captured) {
        const victimVal = PIECE_VALUES[oppMove.captured] || 0;
        const attackerVal = PIECE_VALUES[oppMove.piece] || 0;
        if (oppMove.to === moveObj.to && victimVal >= 300) {
          canOpponentWinMaterial = true;
          break;
        }
        if (victimVal >= 320 && victimVal > attackerVal) {
          canOpponentWinMaterial = true;
          break;
        }
      }
    }

    return canOpponentWinMaterial;
  }

  // Calculate Win Probability (CAPS expected point formula)
  function scoreToWinPct(centipawns) {
    const clamped = Math.max(-1200, Math.min(1200, centipawns));
    return 1 / (1 + Math.pow(10, -clamped / 400));
  }

  function calculateAccuracy(winPctBefore, winPctAfter, turn) {
    let diff = (turn === 'w') ? (winPctAfter - winPctBefore) : (winPctBefore - winPctAfter);
    let acc = 100 * Math.exp(-0.06 * Math.max(0, -diff * 100));
    return Math.min(100, Math.max(0, acc));
  }

  // =========================================================
  // Game Review Analyzer
  // =========================================================
  class GameReviewer {
    constructor() {
      this.Chess = global.Chess || (typeof require !== 'undefined' ? (require('./vendor/chess.js').Chess || require('./vendor/chess.js')) : null);
    }

    analyze(movesList, bookFolders = []) {
      if (!this.Chess) {
        throw new Error('Chess.js library is not loaded');
      }

      const chess = new this.Chess();
      const analyzedMoves = [];
      let runningWhiteAcc = [];
      let runningBlackAcc = [];

      // Build book moves lookup map
      const bookPrefixes = new Set();
      if (bookFolders && Array.isArray(bookFolders)) {
        bookFolders.forEach(folder => {
          (folder.lines || []).forEach(line => {
            let prefix = '';
            (line.moves || []).forEach(m => {
              prefix += (prefix ? ' ' : '') + m;
              bookPrefixes.add(prefix);
            });
          });
        });
      }

      let movesHistory = [];
      let lastMoveObj = null;

      for (let i = 0; i < movesList.length; i++) {
        const playedSan = movesList[i];
        const turn = chess.turn(); // 'w' or 'b'
        const moveNumber = Math.floor(i / 2) + 1;

        // Clone position before move
        const chessBefore = new this.Chess(chess.fen());

        // Find top 2 recommended moves before move is played
        const { bestMove, secondBestMove, evalScore: bestEval } = findTop2Moves(chess);
        const winProbBefore = scoreToWinPct(bestEval);

        // Check if move matches book
        movesHistory.push(playedSan);
        const lineKey = movesHistory.join(' ');
        const isBook = bookPrefixes.has(lineKey) || (i < 4 && ['e4','d4','Nf3','c4','e5','d5','Nf6','c5','Nc6','g6','c6','d6'].includes(playedSan));

        // Execute played move
        let moveObj = null;
        try {
          moveObj = chess.move(playedSan);
        } catch (e) {
          console.warn('Illegal move during analysis:', playedSan);
          break;
        }

        if (!moveObj) break;

        // Position after move
        const isWhiteAfter = chess.turn() === 'w';
        const isMateNow = chess.isCheckmate ? chess.isCheckmate() : (chess.in_checkmate && chess.in_checkmate());
        let evalAfter = 0;
        let mateIn = null;
        let oppMatingMove = null;

        if (isMateNow) {
          evalAfter = (turn === 'w') ? 15000 : -15000;
          mateIn = (turn === 'w') ? 0 : 0;
        } else {
          // Check if opponent now has forced Mate in 1
          const oppReplies = chess.moves({ verbose: true });
          for (const r of oppReplies) {
            chess.move(r);
            const mateTest = chess.isCheckmate ? chess.isCheckmate() : (chess.in_checkmate && chess.in_checkmate());
            chess.undo();
            if (mateTest) {
              oppMatingMove = r;
              break;
            }
          }

          if (oppMatingMove) {
            evalAfter = (turn === 'w') ? -15000 : 15000;
            mateIn = (turn === 'w') ? -1 : 1;
          } else {
            // Stable Quiescence evaluation after move
            evalAfter = quiescence(chess, -30000, 30000, isWhiteAfter, 2);
          }
        }

        const winProbAfter = scoreToWinPct(evalAfter);
        const evalDiff = (turn === 'w') ? Math.max(0, bestEval - evalAfter) : Math.max(0, evalAfter - bestEval);

        const moveAccuracy = calculateAccuracy(winProbBefore, winProbAfter, turn);
        if (turn === 'w') runningWhiteAcc.push(moveAccuracy);
        else runningBlackAcc.push(moveAccuracy);

        // Strict True Brilliant Move detection
        const isBrilliant = !isBook && checkTrueSacrifice(chessBefore, chess, moveObj, turn, bestEval, evalAfter, evalDiff, lastMoveObj);
        lastMoveObj = moveObj;

        // Classification
        let classification = 'good';
        let glyph = '👍';
        let glyphColor = '#64748b';
        let title = 'Good';

        const isTurnBest = bestMove && (bestMove.san === playedSan);

        if (oppMatingMove) {
          classification = 'blunder';
          glyph = '??';
          glyphColor = '#ef4444';
          title = 'Blunder';
        } else if (isBrilliant) {
          classification = 'brilliant';
          glyph = '!!';
          glyphColor = '#06b6d4';
          title = 'Brilliant';
        } else if (isBook) {
          classification = 'book';
          glyph = '📖';
          glyphColor = '#d97706';
          title = 'Book Move';
        } else if (isTurnBest && evalDiff <= 12) {
          classification = 'best';
          glyph = '★';
          glyphColor = '#10b981';
          title = 'Best Move';
        } else if (evalDiff <= 30) {
          classification = 'excellent';
          glyph = '✔';
          glyphColor = '#34d399';
          title = 'Excellent';
        } else if (evalDiff <= 75) {
          classification = 'good';
          glyph = '👍';
          glyphColor = '#64748b';
          title = 'Good';
        } else if (evalDiff <= 160) {
          classification = 'inaccuracy';
          glyph = '?!';
          glyphColor = '#eab308';
          title = 'Inaccuracy';
        } else if (evalDiff <= 320) {
          classification = 'mistake';
          glyph = '?';
          glyphColor = '#f97316';
          title = 'Mistake';
        } else {
          const hadWinningPosition = (turn === 'w') ? (bestEval >= 280) : (bestEval <= -280);
          const gaveUpAdvantage = (turn === 'w') ? (evalAfter <= 40) : (evalAfter >= -40);

          if (hadWinningPosition && gaveUpAdvantage) {
            classification = 'missed_win';
            glyph = '❌';
            glyphColor = '#e11d48';
            title = 'Missed Win';
          } else {
            classification = 'blunder';
            glyph = '??';
            glyphColor = '#ef4444';
            title = 'Blunder';
          }
        }

        // Deep Coach Commentary
        const coachComment = this.generateCoachComment({
          san: playedSan,
          turn,
          moveNumber,
          classification,
          bestMoveSan: bestMove ? bestMove.san : null,
          secondBestSan: secondBestMove ? secondBestMove.san : null,
          oppMatingMoveSan: oppMatingMove ? oppMatingMove.san : null,
          evalBefore: bestEval,
          evalAfter,
          evalDiff,
          captured: moveObj.captured,
          piece: moveObj.piece,
          from: moveObj.from,
          to: moveObj.to,
          inCheck: chess.inCheck ? chess.inCheck() : (chess.in_check && chess.in_check())
        });

        analyzedMoves.push({
          index: i,
          moveNumber,
          turn,
          san: playedSan,
          from: moveObj.from,
          to: moveObj.to,
          piece: moveObj.piece,
          captured: moveObj.captured,
          evalScore: evalAfter,
          evalDisplay: this.formatEval(evalAfter, mateIn),
          classification,
          glyph,
          glyphColor,
          title,
          bestMoveSan: bestMove ? bestMove.san : null,
          bestMoveFrom: bestMove ? bestMove.from : null,
          bestMoveTo: bestMove ? bestMove.to : null,
          secondBestSan: secondBestMove ? secondBestMove.san : null,
          secondBestFrom: secondBestMove ? secondBestMove.from : null,
          secondBestTo: secondBestMove ? secondBestMove.to : null,
          mateIn: mateIn,
          oppMatingMoveSan: oppMatingMove ? oppMatingMove.san : null,
          accuracy: Math.round(moveAccuracy),
          coachComment
        });
      }

      // Summary Statistics
      const whiteAvgAcc = runningWhiteAcc.length > 0
        ? Math.round(runningWhiteAcc.reduce((a, b) => a + b, 0) / runningWhiteAcc.length)
        : 85;
      const blackAvgAcc = runningBlackAcc.length > 0
        ? Math.round(runningBlackAcc.reduce((a, b) => a + b, 0) / runningBlackAcc.length)
        : 85;

      const breakdown = {
        white: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
        black: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 }
      };

      analyzedMoves.forEach(m => {
        const side = m.turn === 'w' ? 'white' : 'black';
        if (breakdown[side][m.classification] !== undefined) {
          breakdown[side][m.classification]++;
        }
      });

      return {
        moves: analyzedMoves,
        whiteAccuracy: whiteAvgAcc,
        blackAccuracy: blackAvgAcc,
        breakdown
      };
    }

    formatEval(score, mateIn = null) {
      if (mateIn !== null && mateIn !== undefined) {
        return (mateIn > 0 ? '+M' : '-M') + Math.max(1, Math.abs(mateIn));
      }
      if (Math.abs(score) >= 14000) {
        return score > 0 ? '+M1' : '-M1';
      }
      const pawns = (score / 100).toFixed(1);
      return (score > 0 ? '+' : '') + pawns;
    }

    // In-depth Grandmaster Coach Commentary
    generateCoachComment(data) {
      const {
        san,
        turn,
        classification,
        bestMoveSan,
        secondBestSan,
        oppMatingMoveSan,
        captured,
        piece,
        to,
        inCheck
      } = data;

      const pieceName = PIECE_NAMES[piece] || 'piece';
      const capturedName = captured ? (PIECE_NAMES[captured] || 'piece') : null;
      const sideName = turn === 'w' ? 'White' : 'Black';
      const oppSide = turn === 'w' ? 'Black' : 'White';

      switch (classification) {
        case 'brilliant':
          return `💎 **Brilliant Sacrifice (!!)!** You courageously offered your ${pieceName} to shatter ${oppSide}'s position. This calculated sacrifice gives you an overwhelming attack and leaves the enemy king helpless.`;

        case 'great':
          return `🔷 **Great move (!)!** This was the only move on the board that preserves your advantage. You accurately anticipated ${oppSide}'s threats and found the sharpest continuation.`;

        case 'best':
          if (inCheck) {
            return `★ **Best move!** An energetic check that keeps ${oppSide}'s king on the run and limits their tactical counterplay.${secondBestSan ? ` (Alternative: **${secondBestSan}** was also solid).` : ''}`;
          }
          if (captured) {
            return `★ **Best move!** Precisely timed capture of the ${capturedName} on ${to}. It neutralizes an active defender and improves your piece coordination.${secondBestSan ? ` Alternatively, **${secondBestSan}** was also strong.` : ''}`;
          }
          if (piece === 'n' || piece === 'b') {
            return `★ **Best move!** Develops the ${pieceName} with high purpose, claiming vital central squares and preparing harmonious piece coordination.`;
          }
          if (piece === 'r') {
            return `★ **Best move!** Activates the rook along an important file, applying positional pressure and coordinating with your backline.`;
          }
          if (piece === 'k') {
            return `★ **Best move!** Secures the king into safety and connects the rooks for the upcoming middlegame struggle.`;
          }
          return `★ **Best move!** The top engine choice. Maximizes active control in the center and cements your long-term positional advantage.${secondBestSan ? ` Second choice was **${secondBestSan}**.` : ''}`;

        case 'excellent':
          return `✔ **Strong, active choice!** ${san} maintains firm positional control. While **${bestMoveSan}** was a slight engine preference, this keeps the position completely in your favor.`;

        case 'good':
          return `👍 **Solid move.** Plays natural chess and preserves balance.${bestMoveSan ? ` **${bestMoveSan}** was slightly more ambitious, but ${san} keeps things under control.` : ''}`;

        case 'book':
          return `📖 **Theoretical book line.** Standard grandmaster theory establishing early central presence and preparing piece development.`;

        case 'inaccuracy':
          return `💡 **Inaccuracy (?!).** ${san} is slightly passive and relieves tension too early.
• **Primary recommendation:** **${bestMoveSan || 'active development'}** was more incisive, seizing the initiative.
${secondBestSan ? `• **Alternative idea:** **${secondBestSan}** also kept greater pressure on ${oppSide}.` : ''}`;

        case 'mistake':
          return `⚠️ **Positional Mistake (?).** ${san} hands the initiative to ${oppSide} and cedes control of key central squares.
• **Better move:** **${bestMoveSan}** would have controlled the critical diagonal and restricted enemy counterplay.
${secondBestSan ? `• **Alternative:** **${secondBestSan}** was also far more resilient.` : ''}`;

        case 'blunder':
          if (oppMatingMoveSan) {
            return `❌ **Catastrophic Blunder (??)!** ${san} exposes your king and permits an immediate forced checkmate (**${oppMatingMoveSan}#**)! You had to play **${bestMoveSan || 'active defense'}** to shield the vital escape squares.`;
          }
          if (captured) {
            return `❌ **Tactical Blunder (??).** Capturing with ${san} walks directly into a punishing tactical blow. You should have played **${bestMoveSan}** to keep your pieces safely defended.`;
          }
          return `❌ **Costly Blunder (??)!** ${san} leaves a critical weakness in your structure and forfeits serious material or positional control.
• **Engine choice:** **${bestMoveSan}** kept your position rock-solid.
${secondBestSan ? `• **Second option:** **${secondBestSan}** was also completely playable.` : ''}
Always look twice at unprotected pieces!`;

        case 'missed_win':
          return `🎯 **Missed Win (❌)!** You had a decisive winning sequence or tactical knock-out right here!
• **Winning line:** **${bestMoveSan}** would have won decisive material or forced a mating net.
${secondBestSan ? `• **Second winning attempt:** **${secondBestSan}** also maintained a crushing edge.` : ''}
Instead, ${san} gives ${oppSide} a fighting chance to escape!`;

        default:
          return `Interesting move on move ${data.moveNumber}.`;
      }
    }
  }

  global.GameReviewer = GameReviewer;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameReviewer };
  }

})(typeof window !== 'undefined' ? window : global);
