/**
 * Anti-Procrastination Tab Executioner
 * math-engine.js - Exponential Cognitive Inflation & Complex Mental Arithmetic Engine (v3.2.0)
 */

// =============================================================================
// 1. Math Utility Helpers
// =============================================================================

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =============================================================================
// 2. Exponential Decay & Dynamic Penalty Formulas
// =============================================================================

/**
 * Calculates decayed base timer: BaseTime(streak) = max(6, round(22 * e^(-0.065 * streak)))
 * @param {number} streak
 * @returns {number}
 */
function calculateDecayedBaseTime(streak) {
  const safeStreak = Math.max(0, streak);
  const decayed = Math.round(22 * Math.exp(-0.065 * safeStreak));
  return Math.max(6, decayed);
}

/**
 * Calculates dynamic penalty: Penalty(streak) = min(5 + floor(streak * 0.5), 10)
 * @param {number} streak
 * @returns {number}
 */
function calculatePenaltySeconds(streak) {
  const safeStreak = Math.max(0, streak);
  return Math.min(5 + Math.floor(safeStreak * 0.5), 10);
}

// =============================================================================
// 3. Algorithmic Problem Generators for Tiers 1 through 5
// =============================================================================

/**
 * Tier 1: Linear Warmup (Streak 0 – 2)
 * Operations: Double-digit addition/subtraction or standard multiplication table.
 */
function generateTier1Problem() {
  const mode = Math.random();
  let a, b, solution, displayString, sublabel;

  if (mode < 0.4) {
    // Addition: A in [12, 50], B in [7, 35]
    a = getRandomInt(12, 50);
    b = getRandomInt(7, 35);
    solution = a + b;
    displayString = `${a} + ${b}`;
    sublabel = 'CALCULATE SUM';
  } else if (mode < 0.75) {
    // Subtraction: A in [18, 60], B in [7, 35], A >= B
    a = getRandomInt(18, 60);
    b = getRandomInt(7, 35);
    if (a < b) [a, b] = [b, a];
    solution = a - b;
    displayString = `${a} - ${b}`;
    sublabel = 'CALCULATE DIFFERENCE';
  } else {
    // Multiplication: A in [12, 18], B in [3, 9]
    a = getRandomInt(12, 18);
    b = getRandomInt(3, 9);
    solution = a * b;
    displayString = `${a} × ${b}`;
    sublabel = 'CALCULATE PRODUCT';
  }

  return { displayString, solution, sublabel };
}

/**
 * Tier 2: Nested Precedence & Compound Products (Streak 3 – 5)
 * Formats: (A × B) ± (C × D) OR (A + B) × C - D
 */
function generateTier2Problem() {
  const mode = Math.random();
  let solution, displayString, sublabel;

  if (mode < 0.55) {
    // (A × B) ± (C × D) where A, B in [6, 14], C in [3, 9], D in [4, 9]
    const a = getRandomInt(6, 14);
    const b = getRandomInt(6, 14);
    const prod1 = a * b;

    const c = getRandomInt(3, 9);
    const d = getRandomInt(4, 9);
    const prod2 = c * d;

    const isAdd = Math.random() > 0.5;
    if (isAdd) {
      solution = prod1 + prod2;
      displayString = `(${a} × ${b}) + (${c} × ${d})`;
    } else {
      if (prod1 < prod2) {
        solution = prod2 - prod1;
        displayString = `(${c} × ${d}) - (${a} × ${b})`;
      } else {
        solution = prod1 - prod2;
        displayString = `(${a} × ${b}) - (${c} × ${d})`;
      }
    }
    sublabel = 'EVALUATE COMPOUND PRODUCT';
  } else {
    // (A + B) × C - D where A, B in [6, 15], C in [3, 8], D in [10, 45]
    const a = getRandomInt(6, 15);
    const b = getRandomInt(6, 15);
    const c = getRandomInt(3, 8);
    const sumTimesC = (a + b) * c;
    const d = getRandomInt(10, Math.min(45, sumTimesC - 1));

    solution = sumTimesC - d;
    displayString = `(${a} + ${b}) × ${c} - ${d}`;
    sublabel = 'NESTED PRECEDENCE';
  }

  return { displayString, solution, sublabel };
}

/**
 * Tier 3: Modular Arithmetic & Integer Exponentiation (Streak 6 – 8)
 * Sub-type A: A^2 - B^2 OR sqrt(C) + D^2
 * Sub-type B: (A × B) mod M
 */
function generateTier3Problem() {
  const mode = Math.random();
  let solution, displayString, sublabel;

  if (mode < 0.35) {
    // Powers: A^2 - B^2 (A in [12, 22], B in [8, 16], A > B)
    let a = getRandomInt(13, 22);
    let b = getRandomInt(8, 16);
    if (a <= b) a = b + getRandomInt(2, 6);
    solution = (a * a) - (b * b);
    displayString = `${a}² - ${b}²`;
    sublabel = 'DIFFERENCE OF SQUARES';
  } else if (mode < 0.65) {
    // Roots: sqrt(C) + D^2 where C in perfect squares {144, 169, 196, 225, 256, 289, 324, 400}
    const perfectSquares = [
      { sq: 144, root: 12 },
      { sq: 169, root: 13 },
      { sq: 196, root: 14 },
      { sq: 225, root: 15 },
      { sq: 256, root: 16 },
      { sq: 289, root: 17 },
      { sq: 324, root: 18 },
      { sq: 400, root: 20 }
    ];
    const item = getRandomChoice(perfectSquares);
    const d = getRandomInt(5, 15);
    solution = item.root + (d * d);
    displayString = `√${item.sq} + ${d}²`;
    sublabel = 'RADICAL & EXPONENT SUM';
  } else {
    // Clock / Modular Arithmetic: (A × B) mod M where A in [15, 45], B in [3, 12], M in [5, 13]
    const a = getRandomInt(15, 45);
    const b = getRandomInt(3, 12);
    const m = getRandomInt(5, 13);
    const product = a * b;
    solution = product % m;
    displayString = `(${a} × ${b}) mod ${m}`;
    sublabel = `MODULAR ARITHMETIC (MOD ${m})`;
  }

  return { displayString, solution, sublabel };
}

/**
 * Tier 4: Single-Variable Algebraic Inversion (Streak 9 – 11)
 * Structure: (A * x ± B) / C = D -> Target solution is integer x
 */
function generateTier4Problem() {
  const x = getRandomInt(3, 15);      // Target integer solution
  const c = getRandomInt(2, 6);       // Denominator
  const d = getRandomInt(4, 16);      // Equality RHS
  const totalNum = c * d;             // Numerator value

  const a = getRandomInt(2, 8);
  const ax = a * x;
  let displayString = '';
  let sublabel = 'SOLVE FOR X (INTEGER)';

  if (totalNum > ax) {
    // (Ax + B) / C = D => B = totalNum - Ax
    const b = totalNum - ax;
    displayString = `(${a}x + ${b}) / ${c} = ${d}`;
  } else if (totalNum < ax) {
    // (Ax - B) / C = D => B = Ax - totalNum
    const b = ax - totalNum;
    displayString = `(${a}x - ${b}) / ${c} = ${d}`;
  } else {
    // Ax / C = D
    displayString = `(${a}x) / ${c} = ${d}`;
  }

  return { displayString: `Solve x: ${displayString}`, solution: x, sublabel };
}

/**
 * Tier 5: Exponential Apex / Matrix & System Determinants (Streak 12+)
 * Sub-type A: 2x2 Matrix Determinant: det | a b | / | c d | = ad - bc
 * Sub-type B: Base Conversion (Hex/Binary to Decimal)
 */
function generateTier5Problem() {
  const mode = Math.random();
  let solution, displayString, sublabel;

  if (mode < 0.6) {
    // 2x2 Matrix Determinant: a, d in [6, 15]; b, c in [3, 12]
    const a = getRandomInt(6, 15);
    const d = getRandomInt(6, 15);
    const b = getRandomInt(3, 12);
    const c = getRandomInt(3, 12);

    solution = (a * d) - (b * c);
    displayString = `det | ${a}  ${b} |\n    | ${c}  ${d} |`;
    sublabel = 'EVALUATE 2×2 DETERMINANT (ad - bc)';
  } else if (mode < 0.85) {
    // Hexadecimal to Decimal (16 to 255)
    const val = getRandomInt(16, 255);
    const hexStr = val.toString(16).toUpperCase();
    solution = val;
    displayString = `0x${hexStr} to Base 10`;
    sublabel = 'HEXADECIMAL TO DECIMAL';
  } else {
    // 5-bit Binary to Decimal (17 to 63)
    const val = getRandomInt(17, 63);
    const binStr = val.toString(2);
    solution = val;
    displayString = `${binStr}₂ to Base 10`;
    sublabel = 'BINARY TO DECIMAL CONVERSION';
  }

  return { displayString, solution, sublabel };
}

// =============================================================================
// 4. Master Exponential Inflation Engine Generator
// =============================================================================

/**
 * Master Problem Generator: Dynamically scales difficulty and time allocation by streak.
 * @param {number} streak
 * @returns {{ displayString: string, solution: number, tierLevel: number, allocatedTime: number, sublabel: string, penaltySeconds: number }}
 */
function generateExponentialProblem(streak) {
  let problemData;
  let tierLevel = 1;

  if (streak <= 2) {
    tierLevel = 1;
    problemData = generateTier1Problem();
  } else if (streak <= 5) {
    tierLevel = 2;
    problemData = generateTier2Problem();
  } else if (streak <= 8) {
    tierLevel = 3;
    problemData = generateTier3Problem();
  } else if (streak <= 11) {
    tierLevel = 4;
    problemData = generateTier4Problem();
  } else {
    tierLevel = 5;
    problemData = generateTier5Problem();
  }

  const allocatedTime = calculateDecayedBaseTime(streak);
  const penaltySeconds = calculatePenaltySeconds(streak);

  return {
    displayString: problemData.displayString,
    solution: problemData.solution,
    sublabel: problemData.sublabel,
    tierLevel,
    allocatedTime,
    penaltySeconds
  };
}

// Expose globals for extension popup
if (typeof window !== 'undefined') {
  window.MathEngine = {
    generateExponentialProblem,
    calculateDecayedBaseTime,
    calculatePenaltySeconds
  };
}
