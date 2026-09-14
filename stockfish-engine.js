// =========================================================
// ChessReps - Stockfish Engine Web Worker Controller
// Dual-Move MultiPV Engine (Accurate Centipawns & Top 2 Moves)
// =========================================================

(function (global) {
  'use strict';

  function uciToSan(fen, uci) {
    if (!uci) return null;
    const ChessCtor = global.Chess || (typeof require !== 'undefined' ? (require('./vendor/chess.js').Chess || require('./vendor/chess.js')) : null);
    if (!ChessCtor) return uci;
    try {
      const tempChess = new ChessCtor(fen);
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const m = tempChess.move({ from, to, promotion });
      return m ? m.san : uci;
    } catch (e) {
      return uci;
    }
  }

  class StockfishService {
    constructor() {
      this.worker = null;
      this.isReady = false;
      this.currentCallback = null;
      this.currentFen = null;
      this.currentTurn = 'w';
      this.currentLines = [];
      this.init();
    }

    init() {
      if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported in this environment');
        return;
      }

      try {
        // Try stockfish.js in root or vendor/
        try {
          this.worker = new Worker('stockfish.js');
        } catch (e) {
          this.worker = new Worker('vendor/stockfish.js');
        }
        this.worker.onmessage = (e) => this.handleMessage(e.data);
        this.worker.onerror = (err) => {
          if (!this.retriedWithVendor) {
            this.retriedWithVendor = true;
            try {
              this.worker = new Worker('vendor/stockfish.js');
              this.worker.onmessage = (e) => this.handleMessage(e.data);
              this.worker.postMessage('uci');
              this.worker.postMessage('setoption name MultiPV value 2');
              this.worker.postMessage('isready');
              return;
            } catch (e) {}
          }
          console.warn('Stockfish Worker error:', err);
          this.isReady = false;
        };

        this.worker.postMessage('uci');
        this.worker.postMessage('setoption name MultiPV value 2');
        this.worker.postMessage('isready');
      } catch (err) {
        console.warn('Failed to initialize Stockfish worker:', err);
      }
    }

    handleMessage(line) {
      if (typeof line !== 'string') return;

      if (line === 'readyok' || line.includes('uciok')) {
        this.isReady = true;
      }

      // Parse UCI info lines with MultiPV evaluation
      if (line.startsWith('info') && (line.includes('score cp') || line.includes('score mate')) && line.includes(' pv ')) {
        const mpvMatch = line.match(/multipv (\d+)/);
        const lineIndex = mpvMatch ? Math.max(0, parseInt(mpvMatch[1], 10) - 1) : 0;

        let cp = null;
        let mate = null;

        const cpMatch = line.match(/score cp (-?\d+)/);
        if (cpMatch) cp = parseInt(cpMatch[1], 10);

        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) mate = parseInt(mateMatch[1], 10);

        const pvMatch = line.match(/ pv (.+)$/);
        const pvStr = pvMatch ? pvMatch[1].trim() : '';
        const pvMoves = pvStr ? pvStr.split(/\s+/) : [];
        const bestUci = pvMoves[0] || null;

        if (bestUci) {
          const from = bestUci.substring(0, 2);
          const to = bestUci.substring(2, 4);
          const promotion = bestUci.length > 4 ? bestUci[4] : undefined;

          // Convert to White's perspective (+ for White, - for Black)
          const whiteCp = cp !== null ? (this.currentTurn === 'w' ? cp : -cp) : null;
          const whiteMate = mate !== null ? (this.currentTurn === 'w' ? mate : -mate) : null;
          const san = uciToSan(this.currentFen, bestUci);

          this.currentLines[lineIndex] = {
            multipv: lineIndex + 1,
            uci: bestUci,
            from,
            to,
            promotion,
            san,
            cp,
            whiteCp,
            mate,
            whiteMate,
            pv: pvStr
          };

          if (this.currentCallback) {
            this.currentCallback({
              type: 'info',
              bestMove: this.currentLines[0] || null,
              secondBestMove: this.currentLines[1] || null,
              lines: this.currentLines.slice(0, 2)
            });
          }
        }
      }

      // Parse bestmove
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestUci = parts[1];

        if (bestUci && bestUci !== '(none)' && (!this.currentLines[0] || !this.currentLines[0].uci)) {
          const from = bestUci.substring(0, 2);
          const to = bestUci.substring(2, 4);
          const promotion = bestUci.length > 4 ? bestUci[4] : undefined;
          this.currentLines[0] = {
            multipv: 1,
            uci: bestUci,
            from,
            to,
            promotion,
            san: uciToSan(this.currentFen, bestUci)
          };
        }

        if (this.currentCallback) {
          this.currentCallback({
            type: 'bestmove',
            bestMove: this.currentLines[0] || null,
            secondBestMove: this.currentLines[1] || null,
            lines: this.currentLines.slice(0, 2)
          });
        }
      }
    }

    evaluate(fen, callback, depth = 12) {
      if (!this.worker || !this.isReady) {
        return false;
      }

      this.currentCallback = callback;
      this.currentFen = fen;
      this.currentTurn = (fen && fen.split(' ')[1]) ? fen.split(' ')[1] : 'w';
      this.currentLines = [];

      this.worker.postMessage('stop');
      this.worker.postMessage('setoption name MultiPV value 2');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
      return true;
    }

    stop() {
      if (this.worker) {
        this.worker.postMessage('stop');
      }
      this.currentCallback = null;
    }
  }

  global.stockfishService = new StockfishService();

})(typeof window !== 'undefined' ? window : global);
