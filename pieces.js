// =========================================================
// ChessReps Speed Trainer - Vector Chess Pieces Engine
// Multi-Set SVG Rendering with Real Carved Wood, Clarity Pro,
// Staunton Classic, Neo Modern, Dubrovnik & Alpha
// =========================================================

const PIECE_PALETTES = {
  standard: {
    whiteFill: '#ffffff',
    whiteStroke: '#0f172a',
    whiteDetail: '#334155',
    blackFill: '#1e293b',
    blackStroke: '#cbd5e1',
    blackDetail: '#f8fafc'
  },
  contrast: {
    whiteFill: '#ffffff',
    whiteStroke: '#000000',
    whiteDetail: '#000000',
    blackFill: '#000000',
    blackStroke: '#ffffff',
    blackDetail: '#38bdf8'
  },
  wood: {
    whiteFill: '#faebd7',
    whiteStroke: '#65330e',
    whiteDetail: '#8c4b18',
    blackFill: '#4a2511',
    blackStroke: '#e2ba84',
    blackDetail: '#f5d6a8'
  },
  cyber: {
    whiteFill: '#38bdf8',
    whiteStroke: '#0284c7',
    whiteDetail: '#e0f2fe',
    blackFill: '#090d16',
    blackStroke: '#10b981',
    blackDetail: '#34d399'
  }
};

function getPieceSvg(piece, pieceSet = 'woodcraft', colorTheme = 'standard') {
  if (!piece) return '';
  const isWhite = piece.color === 'w';
  const type = piece.type.toLowerCase();

  let activeSet = pieceSet || 'woodcraft';
  let activeTheme = colorTheme || 'standard';

  // Handle color theme fallback
  if (['standard', 'contrast', 'wood', 'cyber'].includes(pieceSet)) {
    activeTheme = pieceSet;
    activeSet = 'woodcraft';
  }

  const palette = PIECE_PALETTES[activeTheme] || PIECE_PALETTES.standard;
  const fill = isWhite ? palette.whiteFill : palette.blackFill;
  const stroke = isWhite ? palette.whiteStroke : palette.blackStroke;
  const detail = isWhite ? palette.whiteDetail : palette.blackDetail;

  if (activeSet === 'woodcraft') {
    return getWoodcraftSvg(type, isWhite);
  } else if (activeSet === 'clarity') {
    return getClaritySvg(type, fill, stroke, detail, isWhite);
  } else if (activeSet === 'dubrovnik') {
    return getDubrovnikSvg(type, fill, stroke, detail, isWhite);
  } else if (activeSet === 'neo') {
    return getNeoSvg(type, fill, stroke, detail);
  } else if (activeSet === 'alpha') {
    return getAlphaSvg(type, fill, stroke, detail);
  } else if (activeSet === 'geometric') {
    return getGeometricSvg(type, fill, stroke, detail);
  } else if (activeSet === 'fantasy') {
    return getFantasySvg(type, fill, stroke, detail);
  }

  // Default: Staunton Classic
  return getStauntonSvg(type, fill, stroke, detail);
}

// 1. MASTER WOODCRAFT (Real Carved Wooden Pieces)
function getWoodcraftSvg(type, isWhite) {
  const idPrefix = isWhite ? 'w_wood_' : 'b_wood_';
  const woodDef = isWhite ? `
    <defs>
      <linearGradient id="${idPrefix}grad" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#fff8eb"/>
        <stop offset="35%" stop-color="#f5dfb8"/>
        <stop offset="75%" stop-color="#ddb67b"/>
        <stop offset="100%" stop-color="#bf9152"/>
      </linearGradient>
      <radialGradient id="${idPrefix}head" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#f5e1bf"/>
        <stop offset="100%" stop-color="#cca062"/>
      </radialGradient>
      <filter id="${idPrefix}shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#3d220f" flood-opacity="0.45"/>
      </filter>
    </defs>` : `
    <defs>
      <linearGradient id="${idPrefix}grad" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#5a2f17"/>
        <stop offset="35%" stop-color="#421f0d"/>
        <stop offset="70%" stop-color="#2d1407"/>
        <stop offset="100%" stop-color="#190a03"/>
      </linearGradient>
      <radialGradient id="${idPrefix}head" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#693a1f"/>
        <stop offset="60%" stop-color="#3b1c0b"/>
        <stop offset="100%" stop-color="#1f0c03"/>
      </radialGradient>
      <filter id="${idPrefix}shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>`;

  const fill = `url(#${idPrefix}grad)`;
  const headFill = `url(#${idPrefix}head)`;
  const stroke = isWhite ? '#5c3312' : '#140602';
  const detail = isWhite ? '#874917' : '#d89f68';
  const sw = isWhite ? '1.7' : '1.8';

  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><circle cx="22.5" cy="13.5" r="5" style="fill:${headFill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 18.5,18.5 C 16.5,23 15,27 13.5,35 L 31.5,35 C 30,27 28.5,23 26.5,18.5 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><path d="M 10.5,35 L 34.5,35 C 34.5,38.5 32,39.5 22.5,39.5 C 13,39.5 10.5,38.5 10.5,35 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 14,35 L 31,35" style="stroke:${detail}; stroke-width:1.2;"/><ellipse cx="20.5" cy="11.5" rx="1.8" ry="1.2" style="fill:#ffffff; opacity:${isWhite ? '0.5' : '0.2'};"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><path d="M 22,8 C 28,9 36,15 36,36 L 12,36 C 12,31 14.5,28 15,23 C 12,25.5 8,23 7,20 C 6,18 8,13 11,13 C 10.5,10 13,6.5 16.5,6.5 C 18,6.5 20,5.5 22,8 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><circle cx="14" cy="14" r="1.3" style="fill:${detail}; stroke:${stroke}; stroke-width:0.8;"/><path d="M 18,10 C 21,12 22,17 22,20" style="fill:none; stroke:${detail}; stroke-width:1.5; stroke-linecap:round;"/><path d="M 24,13 C 27,15 28,19 28,23" style="fill:none; stroke:${detail}; stroke-width:1.5; stroke-linecap:round;"/><path d="M 10,36 L 35,36 C 35,39.5 32,40 22.5,40 C 13,40 10,39.5 10,36 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 13,36 L 32,36" style="stroke:${detail}; stroke-width:1.2;"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><circle cx="22.5" cy="6" r="2.2" style="fill:${headFill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 22.5,8 C 16,8 13.5,15 15,25 C 13.5,29 12.5,32 11.5,36 L 33.5,36 C 32.5,32 31.5,29 30,25 C 31.5,15 29,8 22.5,8 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><path d="M 18,18 L 27,18 M 22.5,13.5 L 22.5,22.5" style="stroke:${detail}; stroke-width:1.8; stroke-linecap:round;"/><path d="M 17,27 L 28,27" style="stroke:${detail}; stroke-width:1.3;"/><path d="M 9.5,36 L 35.5,36 C 35.5,39.5 33,40 22.5,40 C 12,40 9.5,39.5 9.5,36 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 13,36 L 32,36" style="stroke:${detail}; stroke-width:1.2;"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><path d="M 12,11 L 12,16 L 15,18 L 15,32 L 12,35 L 12,36 L 33,36 L 33,35 L 30,32 L 30,18 L 33,16 L 33,11 L 28.5,11 L 28.5,14 L 25,14 L 25,11 L 20,11 L 20,14 L 16.5,14 L 16.5,11 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><path d="M 15,21 L 30,21 M 15,29 L 30,29" style="stroke:${detail}; stroke-width:1.4;"/><path d="M 9.5,36 L 35.5,36 C 35.5,39.5 33,40 22.5,40 C 12,40 9.5,39.5 9.5,36 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 12,36 L 33,36" style="stroke:${detail}; stroke-width:1.2;"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><circle cx="8" cy="11.5" r="1.8" style="fill:${headFill}; stroke:${stroke}; stroke-width:1.2;"/><circle cx="15" cy="9" r="1.8" style="fill:${headFill}; stroke:${stroke}; stroke-width:1.2;"/><circle cx="22.5" cy="8" r="2.2" style="fill:${headFill}; stroke:${stroke}; stroke-width:1.3;"/><circle cx="30" cy="9" r="1.8" style="fill:${headFill}; stroke:${stroke}; stroke-width:1.2;"/><circle cx="37" cy="11.5" r="1.8" style="fill:${headFill}; stroke:${stroke}; stroke-width:1.2;"/><path d="M 8.5,13.5 L 13.5,26 L 16,11.5 L 22.5,24 L 29,11.5 L 31.5,26 L 36.5,13.5 C 37,23 34,31 33,36 L 12,36 C 11,31 8,23 8.5,13.5 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><path d="M 12.5,29 C 17,27 28,27 32.5,29" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 12,33 C 17,31.5 28,31.5 33,33" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 9.5,36 L 35.5,36 C 35.5,39.5 33,40 22.5,40 C 12,40 9.5,39.5 9.5,36 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 12,36 L 33,36" style="stroke:${detail}; stroke-width:1.2;"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45">${woodDef}<g filter="url(#${idPrefix}shadow)"><path d="M 22.5,5 L 22.5,11 M 19.5,8 L 25.5,8" style="stroke:${detail}; stroke-width:2.2; stroke-linecap:round;"/><circle cx="22.5" cy="8" r="1" style="fill:${isWhite ? '#ffffff' : '#fcd34d'};"/><path d="M 13.5,14 C 18,11.5 27,11.5 31.5,14 C 35,21 34,30 33,36 L 12,36 C 11,30 10,21 13.5,14 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linejoin:round;"/><path d="M 13.5,20 C 18,18 27,18 31.5,20" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 12.5,26 C 17,24 28,24 32.5,26" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 12,32 C 17,30.5 28,30.5 33,32" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 9.5,36 L 35.5,36 C 35.5,39.5 33,40 22.5,40 C 12,40 9.5,39.5 9.5,36 Z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw};"/><path d="M 12,36 L 33,36" style="stroke:${detail}; stroke-width:1.2;"/></g></svg>`;
  }
  return '';
}

// 2. CLARITY PRO (High Visibility Speed Set)
function getClaritySvg(type, fill, stroke, detail, isWhite) {
  const sw = '2.2';
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="13" r="5.5"/><path d="M 18,19 C 16,24 14,29 13,36 L 32,36 C 31,29 29,24 27,19 Z"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22,8 C 30,9 37,16 36,36 L 12,36 C 12,30 15,26 15,20 C 11,22.5 7,20 6.5,17 C 6,14.5 9,12 12,12 C 11.5,9.5 13.5,6.5 17,6.5 C 19,6.5 20.5,6 22,8 Z"/><circle cx="14" cy="14" r="1.5" style="fill:${detail}; stroke:${stroke}; stroke-width:1;"/><path d="M 19,10 C 23,13 25,18 25,23" style="fill:none; stroke:${detail}; stroke-width:2;"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="6.5" r="2.2"/><path d="M 22.5,9 C 16.5,9 13.5,16 15,25 C 13.5,29 12.5,33 11.5,36 L 33.5,36 C 32.5,33 31.5,29 30,25 C 31.5,16 28.5,9 22.5,9 Z"/><path d="M 18,17 L 27,17 M 22.5,12.5 L 22.5,21.5" style="stroke:${detail}; stroke-width:2.2;"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><path d="M 12,12 L 12,17 L 15,19 L 15,32 L 12,34 L 12,36 L 33,36 L 33,34 L 30,32 L 30,19 L 33,17 L 33,12 L 28.5,12 L 28.5,15 L 25,15 L 25,12 L 20,12 L 20,15 L 16.5,15 L 16.5,12 Z"/><line x1="15" y1="23" x2="30" y2="23" style="stroke:${detail}; stroke-width:2;"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><circle cx="7.5" cy="11.5" r="2"/><circle cx="15" cy="8.5" r="2"/><circle cx="22.5" cy="7.5" r="2.4"/><circle cx="30" cy="8.5" r="2"/><circle cx="37.5" cy="11.5" r="2"/><path d="M 8,14 L 13.5,26 L 16,11 L 22.5,24 L 29,11 L 31.5,26 L 37,14 C 37,24 34,31 33,36 L 12,36 C 11,31 8,24 8,14 Z"/><line x1="12" y1="31" x2="33" y2="31" style="stroke:${detail}; stroke-width:2.2;"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><line x1="22.5" y1="4.5" x2="22.5" y2="11.5" style="stroke-width:2.5;"/><line x1="19" y1="8" x2="26" y2="8" style="stroke-width:2.5;"/><path d="M 13.5,14.5 C 18,12 27,12 31.5,14.5 C 35,22 34,30 33,36 L 12,36 C 11,30 10,22 13.5,14.5 Z"/><line x1="12.5" y1="24" x2="32.5" y2="24" style="stroke:${detail}; stroke-width:2.2;"/><line x1="12" y1="31" x2="33" y2="31" style="stroke:${detail}; stroke-width:2.2;"/><rect x="10" y="36" width="25" height="4" rx="1.5"/></g></svg>`;
  }
  return '';
}

// 3. DUBROVNIK (Bobby Fischer 1950 Style)
function getDubrovnikSvg(type, fill, stroke, detail, isWhite) {
  const finialColor = isWhite ? '#1e293b' : '#f8fafc';
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="13" r="5"/><path d="M 18,18.5 C 16,23 14,28 13.5,35.5 L 31.5,35.5 C 31,28 29,23 27,18.5 Z"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 21,7 C 28,8 35,14 35,36 L 12,36 C 12,30 15,25 15,19 C 11,21 7.5,18.5 7,16 C 6.5,13.5 10,11.5 12,11.5 C 11,9 13.5,6 17,6 C 18.5,6 20,5.5 21,7 Z"/><circle cx="14" cy="14" r="1.3" style="fill:${detail}; stroke:${stroke}; stroke-width:0.8;"/><path d="M 18,10 C 22,12.5 23.5,17 23.5,21" style="fill:none; stroke:${detail}; stroke-width:1.6;"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="7" r="2.5" style="fill:${finialColor}; stroke:${stroke}; stroke-width:1.5;"/><path d="M 22.5,9.5 C 17,9.5 14,16 15,25 C 13.5,29 12.5,32.5 12,36 L 33,36 C 32.5,32.5 31.5,29 30,25 C 31,16 28,9.5 22.5,9.5 Z"/><line x1="22.5" y1="13" x2="22.5" y2="23" style="stroke:${detail}; stroke-width:1.8;"/><line x1="18.5" y1="18" x2="26.5" y2="18" style="stroke:${detail}; stroke-width:1.8;"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 12.5,12 L 12.5,17 L 15,19 L 15,33 L 12.5,35 L 12.5,36 L 32.5,36 L 32.5,35 L 30,33 L 30,19 L 32.5,17 L 32.5,12 L 28,12 L 28,14.5 L 25,14.5 L 25,12 L 20,12 L 20,14.5 L 17,14.5 L 17,12 Z"/><line x1="15" y1="22" x2="30" y2="22" style="stroke:${detail}; stroke-width:1.5;"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="7.5" r="2.5" style="fill:${finialColor}; stroke:${stroke}; stroke-width:1.5;"/><circle cx="8" cy="11.5" r="1.8"/><circle cx="15" cy="9" r="1.8"/><circle cx="30" cy="9" r="1.8"/><circle cx="37" cy="11.5" r="1.8"/><path d="M 8.5,13.5 L 13.5,25.5 L 16,11.5 L 22.5,23.5 L 29,11.5 L 31.5,25.5 L 36.5,13.5 C 37,23 34,31 33,36 L 12,36 C 11,31 8,23 8.5,13.5 Z"/><line x1="12" y1="30" x2="33" y2="30" style="stroke:${detail}; stroke-width:1.8;"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="7" r="3" style="fill:${finialColor}; stroke:${stroke}; stroke-width:1.5;"/><path d="M 13.5,14.5 C 18,12 27,12 31.5,14.5 C 35,22 34,30 33,36 L 12,36 C 11,30 10,22 13.5,14.5 Z"/><line x1="13" y1="24" x2="32" y2="24" style="stroke:${detail}; stroke-width:1.8;"/><line x1="12" y1="31" x2="33" y2="31" style="stroke:${detail}; stroke-width:1.8;"/><path d="M 11,36 L 34,36 L 34,39.5 L 11,39.5 Z"/></g></svg>`;
  }
  return '';
}

// 4. STAUNTON CLASSIC
function getStauntonSvg(type, fill, stroke, detail) {
  const sw = '1.8';
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"/></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:none; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" style="fill:${fill}; stroke:${stroke};"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.05,1.47 22.5,5 C 20,8 19,11 20.5,12 C 21.6,12.7 23,12 24,13.5 C 24.5,14.2 24,15.5 24,18 z" style="fill:${fill}; stroke:${stroke};"/><circle cx="9.5" cy="25.5" r="0.8" style="fill:${detail}; stroke:${detail};"/><circle cx="14" cy="15" r="1.1" style="fill:${detail}; stroke:${detail};"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:none; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><g style="fill:${fill}; stroke:${stroke}; stroke-linecap:butt;"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z"/><path d="M 12,36 C 11.27,33.5 12.06,29.93 14.5,28 C 17,25.5 19,25.5 20,23 C 21.08,20.27 18.91,16.5 20,13 C 20.89,10.14 23.5,8.5 22.5,5.5 C 21.5,8.5 24.11,10.14 25,13 C 26.09,16.5 23.92,20.27 25,23 C 26,25.5 28,25.5 30.5,28 C 32.94,29.93 33.73,33.5 33,36"/><path d="M 17.5 26 L 27.5 26 M 15 30 L 30 30 M 22.5 10 L 22.5 13 M 20 11.5 L 25 11.5" style="stroke:${detail}; stroke-width:1.6;"/></g></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"/><path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"/><path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"/><path d="M 34,14 L 31,17 L 14,17 L 11,14"/><path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"/><path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><circle cx="6" cy="12" r="2"/><circle cx="39" cy="12" r="2"/><circle cx="14" cy="8.5" r="2"/><circle cx="31" cy="8.5" r="2"/><circle cx="22.5" cy="7.5" r="2.2"/><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38,14 L 31,25 L 31,11 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14,11 L 14,25 L 7,14 L 9,26 z"/><path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 L 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 Z"/><line x1="11.5" y1="30" x2="33.5" y2="30" style="stroke:${detail}; stroke-width:1.5;"/><line x1="12" y1="33.5" x2="33.5" y2="33.5" style="stroke:${detail}; stroke-width:1.5;"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:none; stroke:${stroke}; stroke-width:${sw}; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" style="stroke:${stroke}; stroke-width:2;"/><path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" style="fill:${fill}; stroke:${stroke};"/><path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,30 36.5,28.5 36.5,24 C 36.5,19.5 22.5,15 22.5,15 C 22.5,15 8.5,19.5 8.5,24 C 8.5,28.5 8.5,30 11.5,37 z" style="fill:${fill}; stroke:${stroke};"/><line x1="11.5" y1="30" x2="33.5" y2="30" style="stroke:${detail}; stroke-width:1.6;"/><line x1="11.5" y1="33.5" x2="33.5" y2="33.5" style="stroke:${detail}; stroke-width:1.6;"/></g></svg>`;
  }
  return '';
}

// 5. NEO MODERN
function getNeoSvg(type, fill, stroke, detail) {
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="13" r="5"/><path d="M 17,21 C 17,26 13,32 12,38 L 33,38 C 32,32 28,26 28,21 Z"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 21,7 C 27,9 35,16 35,38 L 13,38 C 13,32 17,28 17,23 C 17,23 11,26 8,24 C 6,22 8,16 11,15 C 10,13 11,9 15,8 C 17,8 19,6 21,7 Z"/><circle cx="14" cy="16" r="1.2" style="fill:${detail}; stroke:${detail};"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="8" r="2.5"/><path d="M 22.5,11 C 16,11 14,19 16,27 C 14,31 12,34 11,38 L 34,38 C 33,34 31,31 29,27 C 31,19 29,11 22.5,11 Z"/><line x1="22.5" y1="16" x2="22.5" y2="24" style="stroke:${detail}; stroke-width:1.8;"/><line x1="19" y1="19" x2="26" y2="19" style="stroke:${detail}; stroke-width:1.8;"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 12,12 L 12,18 L 14,21 L 14,33 L 12,35 L 12,38 L 33,38 L 33,35 L 31,33 L 31,21 L 33,18 L 33,12 L 28,12 L 28,15 L 24.5,15 L 24.5,12 L 20.5,12 L 20.5,15 L 17,15 L 17,12 Z"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="9" cy="11" r="2"/><circle cx="16" cy="9" r="2"/><circle cx="22.5" cy="8" r="2.2"/><circle cx="29" cy="9" r="2"/><circle cx="36" cy="11" r="2"/><path d="M 10,14 L 14,26 L 18,13 L 22.5,25 L 27,13 L 31,26 L 35,14 C 36,25 33,34 32,38 L 13,38 C 12,34 9,25 10,14 Z"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><line x1="22.5" y1="6" x2="22.5" y2="12" style="stroke-width:2;"/><line x1="19.5" y1="9" x2="25.5" y2="9" style="stroke-width:2;"/><path d="M 13,15 C 18,12 27,12 32,15 C 34,22 33,34 32,38 L 13,38 C 12,34 11,22 13,15 Z"/><line x1="10" y1="39" x2="35" y2="39" style="stroke-width:2.2;"/></g></svg>`;
  }
  return '';
}

// 6. ALPHA BOOK
function getAlphaSvg(type, fill, stroke, detail) {
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="11.5" r="4.5"/><path d="M 19,16 C 17,21 15,27 13.5,35 L 31.5,35 C 30,27 28,21 26,16 Z"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 20,8 C 28,9 34,16 35,36 L 12,36 C 12,30 15,25 15,20 C 11,22 8,20 8,17 C 8,14 11,12 13,12 C 12,10 14,7 17,7 Z"/><circle cx="15" cy="14" r="1.3" style="fill:${detail}; stroke:${detail};"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22.5,7 C 17,7 14,14 15,24 C 14,28 13,31 12,36 L 33,36 C 32,31 31,28 30,24 C 31,14 28,7 22.5,7 Z"/><line x1="22.5" y1="11" x2="22.5" y2="19" style="stroke:${detail}; stroke-width:1.6;"/><line x1="19" y1="15" x2="26" y2="15" style="stroke:${detail}; stroke-width:1.6;"/><circle cx="22.5" cy="5.5" r="1.8"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 13,11 L 13,16 L 16,18 L 16,33 L 13,36 L 32,36 L 29,33 L 29,18 L 32,16 L 32,11 L 28,11 L 28,13.5 L 24.5,13.5 L 24.5,11 L 20.5,11 L 20.5,13.5 L 17,13.5 L 17,11 Z"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="8" cy="11" r="1.8"/><circle cx="15" cy="9" r="1.8"/><circle cx="22.5" cy="8" r="1.8"/><circle cx="30" cy="9" r="1.8"/><circle cx="37" cy="11" r="1.8"/><path d="M 8.5,13.5 L 14,26 L 16,12 L 22.5,24 L 29,12 L 31,26 L 36.5,13.5 C 37,23 34,32 33,36 L 12,36 C 11,32 8,23 8.5,13.5 Z"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><line x1="22.5" y1="5" x2="22.5" y2="11" style="stroke-width:2;"/><line x1="19.5" y1="8" x2="25.5" y2="8" style="stroke-width:2;"/><path d="M 14,14 C 18,12 27,12 31,14 C 35,22 34,31 33,36 L 12,36 C 11,31 10,22 14,14 Z"/><path d="M 11,36 L 34,36 L 34,39 L 11,39 Z"/></g></svg>`;
  }
  return '';
}

// 7. BAUHAUS GEOMETRIC
function getGeometricSvg(type, fill, stroke, detail) {
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="14" r="5"/><polygon points="17,21 28,21 31,37 14,37"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><polygon points="15,37 32,37 32,15 22,7 13,16 13,24 19,20 19,26 15,29"/><circle cx="19" cy="13" r="1.5" style="fill:${detail}; stroke:${detail};"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><polygon points="22.5,8 31,23 27,37 18,37 14,23"/><circle cx="22.5" cy="6" r="2"/><line x1="19" y1="18" x2="26" y2="18" style="stroke:${detail}; stroke-width:1.6;"/><line x1="22.5" y1="14" x2="22.5" y2="22" style="stroke:${detail}; stroke-width:1.6;"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><polygon points="14,12 18,12 18,15 21,15 21,12 24,12 24,15 27,15 27,12 31,12 31,37 14,37"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><polygon points="11,14 16,25 22.5,11 29,25 34,14 31,37 14,37"/><circle cx="11" cy="12" r="1.8"/><circle cx="22.5" cy="9" r="2"/><circle cx="34" cy="12" r="1.8"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><line x1="22.5" y1="6" x2="22.5" y2="12" style="stroke-width:2;"/><line x1="19.5" y1="9" x2="25.5" y2="9" style="stroke-width:2;"/><polygon points="14,14 22.5,19 31,14 31,37 14,37"/><line x1="12" y1="39" x2="33" y2="39" style="stroke-width:2.2;"/></g></svg>`;
  }
  return '';
}

// 8. FANTASY GOTHIC
function getFantasySvg(type, fill, stroke, detail) {
  switch (type) {
    case 'p':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="22.5" cy="12" r="4.5"/><path d="M 18,17 C 14,24 13,32 11,37 L 34,37 C 32,32 31,24 27,17 Z"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'n':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22,6 C 30,8 37,16 36,37 L 11,37 C 12,30 16,27 16,21 C 11,24 7,20 6,17 C 8,16 10,17 11,15 C 8,11 14,7 18,6 Z"/><circle cx="14" cy="14" r="1.3" style="fill:${detail}; stroke:${detail};"/><path d="M 24,12 L 28,18 M 27,11 L 31,17" style="stroke:${detail}; stroke-width:1.4;"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'b':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 22.5,5 L 25,9 L 29,14 C 32,20 31,30 33,37 L 12,37 C 14,30 13,20 16,14 L 20,9 Z"/><path d="M 22.5,14 L 22.5,23 M 18,18 L 27,18" style="stroke:${detail}; stroke-width:1.6;"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'r':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><path d="M 11,11 L 15,11 L 15,14 L 19,14 L 19,11 L 26,11 L 26,14 L 30,14 L 30,11 L 34,11 L 32,17 L 31,33 L 33,37 L 12,37 L 14,33 L 13,17 Z"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'q':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><circle cx="7" cy="11" r="1.5"/><circle cx="17" cy="7" r="1.5"/><circle cx="22.5" cy="6" r="1.8"/><circle cx="28" cy="7" r="1.5"/><circle cx="38" cy="11" r="1.5"/><path d="M 7,13 L 12,24 L 17,9 L 22.5,22 L 28,9 L 33,24 L 38,13 C 37,24 35,32 34,37 L 11,37 C 10,32 8,24 7,13 Z"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
    case 'k':
      return `<svg viewBox="0 0 45 45"><g style="fill:${fill}; stroke:${stroke}; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;"><line x1="22.5" y1="4" x2="22.5" y2="11" style="stroke-width:2;"/><line x1="19" y1="7.5" x2="26" y2="7.5" style="stroke-width:2;"/><path d="M 12,13 L 17,16 L 22.5,12 L 28,16 L 33,13 C 36,23 34,32 33,37 L 12,37 C 11,32 9,23 12,13 Z"/><line x1="9" y1="39" x2="36" y2="39" style="stroke-width:2.2;"/></g></svg>`;
  }
  return '';
}

if (typeof window !== 'undefined') {
  window.getPieceSvg = getPieceSvg;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPieceSvg };
}
