import { createRng, formatNumber, gcd, simplifyFraction, nearlyEqual } from './rng.mjs'

/**
 * Problem generators by topic id.
 * Every generator returns:
 * { id, topicId, prompt, answer, answerType, steps[], methods[], difficulty, hints[] }
 * Steps are the canonical worked solution verified by the Accuracy Agent.
 */

function base(topicId, difficulty, rng) {
  return {
    id: `p_${topicId}_${rng.seed}_${Date.now().toString(36)}_${rng.int(1000, 9999)}`,
    topicId,
    difficulty,
    createdAt: Date.now(),
  }
}

function step(title, detail, result = null, why = null) {
  return { title, detail, result, why }
}

// ── Elementary ──────────────────────────────────────────────

export function genAddition(rng, difficulty = 1) {
  const digits = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3
  const max = 10 ** digits - 1
  const min = digits === 1 ? 1 : 10 ** (digits - 1)
  const a = rng.int(min, max)
  const b = rng.int(min, max)
  const answer = a + b
  const steps = [
    step('Write the numbers', `Align place values:\n  ${a}\n+ ${b}`, null, 'Place-value alignment is universal — used in every base-10 culture.'),
    step('Add ones', `Ones: ${(a % 10)} + ${(b % 10)} = ${(a % 10) + (b % 10)}${(a % 10) + (b % 10) >= 10 ? ' (regroup 1 ten)' : ''}`),
    step('Add remaining places', `Continue left through tens, hundreds…`),
    step('Sum', `${a} + ${b} = ${answer}`, answer, 'Addition is commutative: a+b = b+a, so order never changes the sum.'),
  ]
  return {
    ...base('addition', difficulty, rng),
    prompt: `What is ${a} + ${b}?`,
    answer,
    answerType: 'number',
    steps,
    methods: ['standard', 'left-to-right', 'compensation'],
    hints: [`Start from the ones place.`, `Estimate: about ${Math.round(a / 10) * 10} + ${Math.round(b / 10) * 10}.`],
    operands: [a, b],
  }
}

export function genSubtraction(rng, difficulty = 1) {
  const digits = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3
  const max = 10 ** digits - 1
  const min = digits === 1 ? 2 : 10 ** (digits - 1)
  let a = rng.int(min, max)
  let b = rng.int(1, a)
  const answer = a - b
  return {
    ...base('subtraction', difficulty, rng),
    prompt: `What is ${a} − ${b}?`,
    answer,
    answerType: 'number',
    steps: [
      step('Align places', `  ${a}\n− ${b}`),
      step('Subtract ones upward if needed', 'If ones of top < ones of bottom, borrow 1 ten (US) / regroup (Singapore).'),
      step('Difference', `${a} − ${b} = ${answer}`, answer, 'Subtraction undoes addition: answer + b must equal a. Always check this.'),
    ],
    methods: ['standard', 'counting-up', 'Austrian'],
    hints: [`Check: does ${answer} + ${b} = ${a}?`, 'Try counting up from the smaller number.'],
    operands: [a, b],
  }
}

export function genMultiplication(rng, difficulty = 1) {
  let a, b
  if (difficulty === 1) {
    a = rng.int(2, 12)
    b = rng.int(2, 12)
  } else if (difficulty === 2) {
    a = rng.int(10, 99)
    b = rng.int(2, 12)
  } else {
    a = rng.int(12, 99)
    b = rng.int(12, 99)
  }
  const answer = a * b
  const steps = longMultiplicationSteps(a, b)
  return {
    ...base('multiplication', difficulty, rng),
    prompt: `What is ${a} × ${b}?`,
    answer,
    answerType: 'number',
    steps,
    methods: ['standard', 'lattice', 'Japanese-lines', 'Vedic-vertically-crosswise'],
    hints: [
      'Break it up: distribute over place values.',
      difficulty >= 2 ? `Try (${Math.floor(a / 10) * 10} + ${a % 10}) × ${b}` : 'Use your times table.',
    ],
    operands: [a, b],
    scratchSuggested: true,
  }
}

function longMultiplicationSteps(a, b) {
  const steps = [
    step('Set up', `Write ${a} × ${b} with place values aligned.`, null, 'Long multiplication is the standard algorithm worldwide; lattice & Japanese line methods compute the same products by place.'),
  ]
  const bStr = String(b)
  let total = 0
  for (let i = bStr.length - 1; i >= 0; i--) {
    const digit = Number(bStr[i])
    const place = bStr.length - 1 - i
    const partial = a * digit * 10 ** place
    total += partial
    steps.push(
      step(
        `Multiply by ${digit} (place 10^${place})`,
        `${a} × ${digit} = ${a * digit}${place ? `, then × 10^${place} → ${partial}` : ''}`,
        partial,
        place === 0
          ? 'Ones digit of the multiplier.'
          : 'Each shift left multiplies by 10 — that is why we add a zero (or shift) for tens, hundreds…',
      ),
    )
  }
  steps.push(step('Add partial products', `Sum = ${total}`, total, 'Distributive property: a×(c+d) = a×c + a×d.'))
  return steps
}

export function genDivision(rng, difficulty = 1) {
  let divisor, quotient, dividend
  if (difficulty === 1) {
    divisor = rng.int(2, 12)
    quotient = rng.int(2, 12)
  } else if (difficulty === 2) {
    divisor = rng.int(2, 12)
    quotient = rng.int(10, 99)
  } else {
    divisor = rng.int(11, 25)
    quotient = rng.int(10, 50)
  }
  dividend = divisor * quotient
  // occasionally with remainder for higher difficulty
  let remainder = 0
  if (difficulty >= 2 && rng.next() > 0.55) {
    remainder = rng.int(1, divisor - 1)
    dividend += remainder
  }
  const answer = remainder === 0 ? quotient : `${quotient} R${remainder}`
  const numericAnswer = remainder === 0 ? quotient : quotient + remainder / divisor
  return {
    ...base('division', difficulty, rng),
    prompt: remainder
      ? `Divide ${dividend} ÷ ${divisor}. Give quotient and remainder (e.g. 7 R3).`
      : `What is ${dividend} ÷ ${divisor}?`,
    answer,
    numericAnswer,
    answerType: remainder ? 'division-remainder' : 'number',
    steps: longDivisionSteps(dividend, divisor, quotient, remainder),
    methods: ['long-division', 'chunking', 'Japanese', 'Egyptian'],
    hints: [`How many times does ${divisor} fit into ${dividend}?`, 'Estimate first.'],
    operands: [dividend, divisor],
    scratchSuggested: true,
  }
}

function longDivisionSteps(dividend, divisor, quotient, remainder) {
  return [
    step('Set up long division', `${dividend} ÷ ${divisor}`, null, 'Long division is the inverse of long multiplication.'),
    step('How many times?', `${divisor} goes into parts of ${dividend}…`),
    step('Quotient', `Quotient = ${quotient}`, quotient),
    step('Check', `${divisor} × ${quotient} = ${divisor * quotient}${remainder ? `, remainder ${remainder}` : ''}`, remainder ? `${quotient} R${remainder}` : quotient,
      'Always multiply back: divisor × quotient + remainder = dividend. This check is required by the Accuracy Agent.'),
  ]
}

export function genFractions(rng, difficulty = 1) {
  const type = rng.pick(['add', 'subtract', 'multiply', difficulty >= 2 ? 'divide' : 'add'])
  let n1 = rng.int(1, 8)
  let d1 = rng.int(2, 9)
  let n2 = rng.int(1, 8)
  let d2 = rng.int(2, 9)
  ;({ num: n1, den: d1 } = simplifyFraction(n1, d1))
  ;({ num: n2, den: d2 } = simplifyFraction(n2, d2))
  if (d1 === 1) d1 = rng.int(2, 8)
  if (d2 === 1) d2 = rng.int(2, 8)

  let answerNum, answerDen, prompt, steps
  if (type === 'add' || type === 'subtract') {
    const common = (d1 * d2) / gcd(d1, d2)
    const a = n1 * (common / d1)
    const b = n2 * (common / d2)
    answerNum = type === 'add' ? a + b : a - b
    answerDen = common
    const s = simplifyFraction(answerNum, answerDen)
    answerNum = s.num
    answerDen = s.den
    prompt = `Compute ${n1}/${d1} ${type === 'add' ? '+' : '−'} ${n2}/${d2}. Simplify.`
    steps = [
      step('Common denominator', `LCM(${d1},${d2}) = ${common}`, null, 'Singapore bar models & Japanese area models show WHY denominators must match — equal-sized pieces.'),
      step('Rewrite', `${n1}/${d1} = ${a}/${common}, ${n2}/${d2} = ${b}/${common}`),
      step(type === 'add' ? 'Add numerators' : 'Subtract numerators', `${a} ${type === 'add' ? '+' : '−'} ${b} = ${type === 'add' ? a + b : a - b} over ${common}`),
      step('Simplify', `${answerNum}/${answerDen}`, `${answerNum}/${answerDen}`, 'Divide numerator and denominator by their GCD.'),
    ]
  } else if (type === 'multiply') {
    const raw = simplifyFraction(n1 * n2, d1 * d2)
    answerNum = raw.num
    answerDen = raw.den
    prompt = `Compute ${n1}/${d1} × ${n2}/${d2}. Simplify.`
    steps = [
      step('Multiply across', `Numerators: ${n1}×${n2}=${n1 * n2}; Denominators: ${d1}×${d2}=${d1 * d2}`, null, 'Or cancel (cross-simplify) first — a Vedic/mental shortcut that works because multiplication is commutative.'),
      step('Simplify', `${answerNum}/${answerDen}`, `${answerNum}/${answerDen}`),
    ]
  } else {
    // divide = multiply by reciprocal
    const raw = simplifyFraction(n1 * d2, d1 * n2)
    answerNum = raw.num
    answerDen = raw.den
    prompt = `Compute ${n1}/${d1} ÷ ${n2}/${d2}. Simplify.`
    steps = [
      step('Keep–Change–Flip', `${n1}/${d1} × ${d2}/${n2}`, null, 'Dividing by a fraction = multiplying by its reciprocal. Why: a÷(b/c) = a × (c/b) because (b/c)×(c/b)=1.'),
      step('Multiply & simplify', `${answerNum}/${answerDen}`, `${answerNum}/${answerDen}`),
    ]
  }

  const answer = answerDen === 1 ? String(answerNum) : `${answerNum}/${answerDen}`
  return {
    ...base('fractions', difficulty, rng),
    prompt,
    answer,
    answerType: 'fraction',
    numericAnswer: answerNum / answerDen,
    steps,
    methods: ['standard', 'bar-model', 'area-model'],
    hints: ['Find a common denominator for +/−.', 'For ÷, multiply by the reciprocal.'],
  }
}

export function genDecimals(rng, difficulty = 1) {
  const a = Number((rng.int(1, 99) / (difficulty === 1 ? 10 : 100)).toFixed(difficulty === 1 ? 1 : 2))
  const b = Number((rng.int(1, 99) / (difficulty === 1 ? 10 : 100)).toFixed(difficulty === 1 ? 1 : 2))
  const op = rng.pick(['+', '−', '×'])
  let answer
  if (op === '+') answer = Number((a + b).toFixed(4))
  else if (op === '−') answer = Number((Math.max(a, b) - Math.min(a, b)).toFixed(4))
  else answer = Number((a * b).toFixed(6))
  const left = op === '−' ? Math.max(a, b) : a
  const right = op === '−' ? Math.min(a, b) : b
  return {
    ...base('decimals', difficulty, rng),
    prompt: `What is ${left} ${op} ${right}?`,
    answer,
    answerType: 'number',
    steps: [
      step('Align decimal points', op === '×' ? 'Count total decimal places in factors.' : 'Line up the dots.', null,
        'Decimals are fractions with denominators 10, 100, 1000… — place value again.'),
      step('Compute', `${left} ${op} ${right} = ${answer}`, answer),
    ],
    methods: ['standard', 'fraction-conversion'],
    hints: ['Convert to fractions if stuck.', 'Estimate first.'],
  }
}

export function genPercentages(rng, difficulty = 1) {
  const pct = rng.pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 75])
  const whole = difficulty === 1 ? rng.int(2, 20) * 10 : rng.int(5, 40) * 10
  const answer = Number(((pct / 100) * whole).toFixed(4))
  return {
    ...base('percentages', difficulty, rng),
    prompt: `What is ${pct}% of ${whole}?`,
    answer,
    answerType: 'number',
    steps: [
      step('Percent → decimal/fraction', `${pct}% = ${pct}/100 = ${pct / 100}`, null, 'Percent means “per hundred.” Japanese & European curricula often stay in fractions longer — same idea.'),
      step('Multiply', `${pct / 100} × ${whole} = ${answer}`, answer,
        'Shortcut: 10% = whole/10, then scale. 5% = half of 10%. 15% = 10%+5%. These mental shortcuts work because of distributivity.'),
    ],
    methods: ['decimal', 'fraction', 'mental-benchmarks'],
    hints: [`10% of ${whole} is ${whole / 10}.`, 'Build from 10% and 1%.'],
  }
}

// ── Pre-algebra / Algebra ───────────────────────────────────

export function genOrderOfOperations(rng, difficulty = 1) {
  const a = rng.int(2, 9)
  const b = rng.int(2, 9)
  const c = rng.int(2, 9)
  const d = rng.int(1, 6)
  let prompt, answer, steps
  if (difficulty === 1) {
    prompt = `${a} + ${b} × ${c}`
    answer = a + b * c
    steps = [
      step('PEMDAS / BODMAS / GEMA', 'Multiplication before addition.', null, 'US: PEMDAS. UK/India: BODMAS. Some modern curricula: GEMA (Grouping, Exponents, Multiplication/Division, Addition/Subtraction). Same hierarchy.'),
      step('Multiply', `${b} × ${c} = ${b * c}`),
      step('Add', `${a} + ${b * c} = ${answer}`, answer),
    ]
  } else {
    prompt = `(${a} + ${b}) × ${c} − ${d}`
    answer = (a + b) * c - d
    steps = [
      step('Parentheses first', `${a} + ${b} = ${a + b}`),
      step('Multiply', `${a + b} × ${c} = ${(a + b) * c}`),
      step('Subtract', `${(a + b) * c} − ${d} = ${answer}`, answer),
    ]
  }
  return {
    ...base('order-of-operations', difficulty, rng),
    prompt: `Evaluate: ${prompt}`,
    answer,
    answerType: 'number',
    steps,
    methods: ['PEMDAS', 'BODMAS', 'GEMA'],
    hints: ['Grouping symbols first.', '× and ÷ left-to-right, then + and −.'],
  }
}

export function genLinearEquation(rng, difficulty = 1) {
  const x = rng.int(-8, 12) || 3
  const a = rng.int(2, 9)
  const b = rng.int(-12, 12)
  const c = a * x + b
  return {
    ...base('linear-equations', difficulty, rng),
    prompt: `Solve for x: ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${c}`,
    answer: x,
    answerType: 'number',
    steps: [
      step('Isolate the variable term', `${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${c} → subtract ${b} from both sides`, null, 'Balance method (used worldwide): whatever you do to one side, do to the other.'),
      step('Simplify', `${a}x = ${c - b}`),
      step('Divide', `x = ${(c - b)}/${a} = ${x}`, x, 'Check: plug x back into the original equation.'),
    ],
    methods: ['balance', 'Singapore-bar', 'inverse-operations'],
    hints: ['Undo addition/subtraction first.', 'Then divide by the coefficient.'],
  }
}

export function genSystems(rng, difficulty = 2) {
  const x = rng.int(1, 8)
  const y = rng.int(1, 8)
  let a1 = rng.int(1, 4)
  let b1 = rng.int(1, 4)
  let a2 = rng.int(1, 4)
  let b2 = rng.int(1, 4)
  // ensure determinant ≠ 0 (independent system)
  let guard = 0
  while (a1 * b2 - a2 * b1 === 0 && guard++ < 20) {
    a2 = rng.int(1, 5)
    b2 = rng.int(1, 5)
  }
  if (a1 * b2 - a2 * b1 === 0) {
    a1 = 1
    b1 = 2
    a2 = 3
    b2 = 4
  }
  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y
  return {
    ...base('systems', difficulty, rng),
    prompt: `Solve the system:\n${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}\nEnter as x,y`,
    answer: `${x},${y}`,
    answerType: 'pair',
    steps: [
      step('Choose a method', 'Elimination or substitution.', null, 'Japanese curricula emphasize elimination; many EU texts introduce matrices early. Same linear algebra.'),
      step('Solve', `x = ${x}, y = ${y}`, `${x},${y}`),
      step('Verify', `${a1}(${x})+${b1}(${y})=${c1}; ${a2}(${x})+${b2}(${y})=${c2}`),
    ],
    methods: ['elimination', 'substitution', 'graphing'],
    hints: ['Eliminate one variable.', 'Substitute back.'],
  }
}

export function genQuadratic(rng, difficulty = 2) {
  const r1 = rng.int(-6, 6) || 2
  const r2 = rng.int(-6, 6) || -1
  // (x - r1)(x - r2) = x² - (r1+r2)x + r1 r2
  const sum = r1 + r2
  const prod = r1 * r2
  const b = -sum
  const c = prod
  const prompt = `Solve: x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)} = 0. Enter roots separated by comma (smaller first).`
  const roots = [r1, r2].sort((a, b) => a - b)
  return {
    ...base('quadratics', difficulty, rng),
    prompt,
    answer: `${roots[0]},${roots[1]}`,
    answerType: 'pair',
    steps: [
      step('Factor or formula', `Looking for two numbers that multiply to ${c} and add to ${b}.`, null, 'Quadratic formula x = (−b±√(b²−4ac))/2a always works. Factoring is faster when roots are integers. Completing the square (used heavily in Islamic Golden Age mathematics) reveals the vertex form.'),
      step('Roots', `x = ${roots[0]} or x = ${roots[1]}`, `${roots[0]},${roots[1]}`),
      step('Check', `(x−${r1})(x−${r2})=0`),
    ],
    methods: ['factoring', 'quadratic-formula', 'completing-square'],
    hints: ['Try factoring first.', 'Formula if factoring fails.'],
  }
}

export function genExponents(rng, difficulty = 1) {
  const baseN = rng.int(2, 5)
  const exp = rng.int(2, difficulty === 1 ? 4 : 5)
  const answer = baseN ** exp
  return {
    ...base('exponents', difficulty, rng),
    prompt: `Evaluate ${baseN}^${exp}`,
    answer,
    answerType: 'number',
    steps: [
      step('Meaning', `${baseN}^${exp} means ${baseN} multiplied ${exp} times.`, null, 'a^m × a^n = a^(m+n). Why: you concatenate the factors. This law is identical in every country’s curriculum.'),
      step('Compute', String(answer), answer),
    ],
    methods: ['repeated-multiplication', 'laws-of-exponents'],
    hints: [`${baseN}×${baseN}=${baseN * baseN}, keep going.`],
  }
}

export function genRadicals(rng, difficulty = 2) {
  const root = rng.int(2, 12)
  const n = root * root
  return {
    ...base('radicals', difficulty, rng),
    prompt: `Simplify √${n}`,
    answer: root,
    answerType: 'number',
    steps: [
      step('Perfect square?', `${root}² = ${n}`, root, '√(a²) = |a|. For positive a, √(a²)=a.'),
    ],
    methods: ['perfect-squares', 'prime-factorization'],
    hints: ['What number times itself is this?'],
  }
}

// ── Geometry ────────────────────────────────────────────────

export function genAreaPerimeter(rng, difficulty = 1) {
  const kind = rng.pick(['rectangle', 'triangle', 'circle'])
  if (kind === 'rectangle') {
    const l = rng.int(3, 20)
    const w = rng.int(2, 15)
    const ask = rng.pick(['area', 'perimeter'])
    const answer = ask === 'area' ? l * w : 2 * (l + w)
    return {
      ...base('area-perimeter', difficulty, rng),
      prompt: `A rectangle is ${l} by ${w}. What is its ${ask}?`,
      answer,
      answerType: 'number',
      steps: [
        step(ask === 'area' ? 'Area = length × width' : 'Perimeter = 2(l+w)',
          ask === 'area' ? `${l}×${w}=${answer}` : `2(${l}+${w})=${answer}`, answer,
          'Area formulas come from counting unit squares; circle area πr² is proved via limits/exhaustion (Archimedes).'),
      ],
      methods: ['formula', 'unit-squares'],
      hints: [ask === 'area' ? 'Multiply the sides.' : 'Add all four sides.'],
    }
  }
  if (kind === 'triangle') {
    const b = rng.int(4, 18)
    const h = rng.int(3, 14)
    const answer = Number(((b * h) / 2).toFixed(4))
    return {
      ...base('area-perimeter', difficulty, rng),
      prompt: `Triangle base ${b}, height ${h}. Area?`,
      answer,
      answerType: 'number',
      steps: [step('Area = ½·base·height', `½×${b}×${h}=${answer}`, answer, 'A triangle is half a parallelogram with the same base and height.')],
      methods: ['formula'],
      hints: ['Half of base times height.'],
    }
  }
  const r = rng.int(2, 10)
  const ask = rng.pick(['area', 'circumference'])
  const answer = ask === 'area'
    ? Number((Math.PI * r * r).toFixed(2))
    : Number((2 * Math.PI * r).toFixed(2))
  return {
    ...base('area-perimeter', difficulty, rng),
    prompt: `Circle radius ${r}. ${ask === 'area' ? 'Area' : 'Circumference'}? Use π≈3.14159, round to 2 decimals.`,
    answer,
    answerType: 'number',
    tolerance: 0.02,
    steps: [
      step(ask === 'area' ? 'A = πr²' : 'C = 2πr',
        ask === 'area' ? `π×${r}² ≈ ${answer}` : `2×π×${r} ≈ ${answer}`, answer),
    ],
    methods: ['formula'],
    hints: ['Use π ≈ 3.14 if needed.'],
  }
}

export function genPythagorean(rng, difficulty = 2) {
  const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15]]
  const [a, b, c] = rng.pick(triples)
  const ask = rng.pick(['hyp', 'leg'])
  if (ask === 'hyp') {
    return {
      ...base('pythagorean', difficulty, rng),
      prompt: `Right triangle legs ${a} and ${b}. Find the hypotenuse.`,
      answer: c,
      answerType: 'number',
      steps: [
        step('a² + b² = c²', `${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}`, null, 'Pythagorean theorem — known in Babylonian tablets (Plimpton 322) long before Pythagoras. Indian Baudhayana Sulba Sutra also records it.'),
        step('√', `c = √${a * a + b * b} = ${c}`, c),
      ],
      methods: ['theorem', 'triple-recognition'],
      hints: ['Square both legs, add, take square root.'],
    }
  }
  return {
    ...base('pythagorean', difficulty, rng),
    prompt: `Right triangle hypotenuse ${c}, one leg ${a}. Find the other leg.`,
    answer: b,
    answerType: 'number',
    steps: [
      step('b² = c² − a²', `${c}² − ${a}² = ${c * c - a * a}`),
      step('√', `b = ${b}`, b),
    ],
    methods: ['theorem'],
    hints: ['Isolate the missing leg.'],
  }
}

// ── Trig / Precalc / Calc ───────────────────────────────────

export function genTrig(rng, difficulty = 2) {
  const angles = [
    { deg: 30, sin: 0.5, cos: Math.sqrt(3) / 2, tan: 1 / Math.sqrt(3) },
    { deg: 45, sin: Math.SQRT1_2, cos: Math.SQRT1_2, tan: 1 },
    { deg: 60, sin: Math.sqrt(3) / 2, cos: 0.5, tan: Math.sqrt(3) },
  ]
  const a = rng.pick(angles)
  const fn = rng.pick(['sin', 'cos', 'tan'])
  const exact = {
    sin: { 30: '1/2', 45: '√2/2', 60: '√3/2' },
    cos: { 30: '√3/2', 45: '√2/2', 60: '1/2' },
    tan: { 30: '1/√3', 45: '1', 60: '√3' },
  }
  const numeric = a[fn]
  return {
    ...base('trigonometry', difficulty, rng),
    prompt: `What is ${fn}(${a.deg}°)? Enter the exact value (e.g. 1/2 or √2/2) or a decimal.`,
    answer: exact[fn][a.deg],
    numericAnswer: numeric,
    answerType: 'trig',
    tolerance: 0.01,
    steps: [
      step('Unit circle / special triangles', `Memorize 30-60-90 and 45-45-90 ratios.`, null, 'Special triangles are taught everywhere; Chinese & Islamic mathematicians tabulated chords centuries earlier — same values.'),
      step('Value', `${fn}(${a.deg}°) = ${exact[fn][a.deg]}`, exact[fn][a.deg]),
    ],
    methods: ['unit-circle', 'special-triangles'],
    hints: ['30-60-90: sides 1 : √3 : 2', '45-45-90: sides 1 : 1 : √2'],
  }
}

export function genLogs(rng, difficulty = 2) {
  const baseN = rng.pick([2, 3, 5, 10])
  const exp = rng.int(1, 4)
  const arg = baseN ** exp
  return {
    ...base('logarithms', difficulty, rng),
    prompt: `Evaluate log_${baseN}(${arg})`,
    answer: exp,
    answerType: 'number',
    steps: [
      step('Definition', `log_b(a) = c means b^c = a`, null, 'Logs were invented by Napier (Scotland) to turn multiplication into addition — the original “shortcut,” and the reason slide rules worked.'),
      step('Find exponent', `${baseN}^${exp} = ${arg}, so log = ${exp}`, exp),
    ],
    methods: ['definition', 'change-of-base'],
    hints: [`${baseN} to what power is ${arg}?`],
  }
}

export function genDerivatives(rng, difficulty = 3) {
  const n = rng.int(2, 6)
  const coef = rng.int(1, 5)
  // d/dx [coef x^n] = coef*n x^(n-1)
  const newCoef = coef * n
  const newExp = n - 1
  const answer = newExp === 0 ? String(newCoef) : newExp === 1 ? `${newCoef}x` : `${newCoef}x^${newExp}`
  return {
    ...base('derivatives', difficulty, rng),
    prompt: `Differentiate: ${coef === 1 ? '' : coef}x^${n}. Enter like ${answer}`,
    answer,
    answerType: 'expression',
    steps: [
      step('Power rule', `d/dx [x^n] = n·x^(n−1)`, null, 'Power rule follows from the binomial limit definition of the derivative. Same rule in every calculus curriculum (US AP, A-level, IB, French bac, etc.).'),
      step('Apply', `d/dx [${coef}x^${n}] = ${coef}·${n}·x^${newExp} = ${answer}`, answer),
    ],
    methods: ['power-rule', 'limit-definition'],
    hints: ['Bring the exponent down, reduce exponent by 1.'],
  }
}

export function genIntegrals(rng, difficulty = 3) {
  const n = rng.int(1, 5)
  const coef = rng.int(1, 4)
  // ∫ coef x^n dx = coef/(n+1) x^(n+1) + C
  const newExp = n + 1
  const num = coef
  const den = newExp
  const s = simplifyFraction(num, den)
  const coeffStr = s.den === 1 ? String(s.num) : `${s.num}/${s.den}`
  const answer = newExp === 1 ? `${coeffStr}x + C` : `${coeffStr}x^${newExp} + C`
  return {
    ...base('integrals', difficulty, rng),
    prompt: `Integrate: ∫ ${coef === 1 ? '' : coef}x^${n} dx. Include + C.`,
    answer,
    answerType: 'expression',
    steps: [
      step('Power rule for integrals', `∫ x^n dx = x^(n+1)/(n+1) + C (n≠−1)`, null, 'Integration undoes differentiation. The +C exists because the derivative of a constant is zero.'),
      step('Apply', `∫ ${coef}x^${n} dx = ${answer}`, answer),
    ],
    methods: ['power-rule', 'check-by-differentiating'],
    hints: ['Raise exponent by 1, divide by new exponent, add C.'],
  }
}

export function genLimits(rng, difficulty = 3) {
  const a = rng.int(1, 5)
  // lim x→a (x² - a²)/(x - a) = 2a
  const answer = 2 * a
  return {
    ...base('limits', difficulty, rng),
    prompt: `Evaluate lim (x→${a}) (x² − ${a * a})/(x − ${a})`,
    answer,
    answerType: 'number',
    steps: [
      step('Direct sub fails', `Numerator and denominator both 0 → indeterminate 0/0.`, null, 'Factor or use L’Hôpital (France) / algebraic cancellation. Same limit concept in every calc course.'),
      step('Factor', `(x−${a})(x+${a})/(x−${a}) = x+${a} for x≠${a}`),
      step('Limit', `lim x→${a} of (x+${a}) = ${answer}`, answer),
    ],
    methods: ['factoring', 'LHopital'],
    hints: ['Factor the difference of squares.'],
  }
}

export function genStatistics(rng, difficulty = 1) {
  const n = rng.int(4, 7)
  const data = Array.from({ length: n }, () => rng.int(2, 20))
  const sum = data.reduce((a, b) => a + b, 0)
  const mean = Number((sum / n).toFixed(4))
  const sorted = [...data].sort((a, b) => a - b)
  const median = n % 2 === 1
    ? sorted[(n - 1) / 2]
    : Number(((sorted[n / 2 - 1] + sorted[n / 2]) / 2).toFixed(4))
  const ask = rng.pick(['mean', 'median'])
  const answer = ask === 'mean' ? mean : median
  return {
    ...base('statistics', difficulty, rng),
    prompt: `Data: [${data.join(', ')}]. Find the ${ask}.`,
    answer,
    answerType: 'number',
    tolerance: 0.01,
    steps: [
      ask === 'mean'
        ? step('Mean = sum / count', `${sum}/${n} = ${mean}`, mean, 'Mean is the balance point. Median is the middle — often preferred for skewed data (taught strongly in UK GCSE & IB).')
        : step('Sort, find middle', `Sorted: [${sorted.join(', ')}] → median ${median}`, median),
    ],
    methods: ['definition'],
    hints: [ask === 'mean' ? 'Add all, divide by how many.' : 'Sort first.'],
  }
}

export function genRatios(rng, difficulty = 1) {
  const a = rng.int(2, 9)
  const b = rng.int(2, 9)
  const k = rng.int(2, 8)
  return {
    ...base('ratios', difficulty, rng),
    prompt: `A ratio is ${a}:${b}. If the first quantity is ${a * k}, what is the second?`,
    answer: b * k,
    answerType: 'number',
    steps: [
      step('Scale factor', `${a * k}/${a} = ${k}`, null, 'Unit rates & Singapore bar models make ratio scaling visual.'),
      step('Second quantity', `${b} × ${k} = ${b * k}`, b * k),
    ],
    methods: ['scale-factor', 'bar-model'],
    hints: ['Find how many times the first part grew.'],
  }
}

export function genIntegers(rng, difficulty = 1) {
  const a = rng.int(-15, 15) || -3
  const b = rng.int(-12, 12) || 4
  const op = rng.pick(['+', '−', '×'])
  let answer
  if (op === '+') answer = a + b
  else if (op === '−') answer = a - b
  else answer = a * b
  return {
    ...base('integers', difficulty, rng),
    prompt: `Compute (${a}) ${op} (${b})`,
    answer,
    answerType: 'number',
    steps: [
      step('Integer rules', op === '×'
        ? 'Negative × negative = positive; different signs → negative.'
        : 'Adding a negative is subtracting; subtracting a negative is adding.',
        null, 'Number-line models (common in Netherlands & Singapore) make sign rules visual.'),
      step('Result', String(answer), answer),
    ],
    methods: ['number-line', 'rules'],
    hints: ['Watch the signs carefully.'],
  }
}

/** Registry */
export const GENERATORS = {
  addition: genAddition,
  subtraction: genSubtraction,
  multiplication: genMultiplication,
  division: genDivision,
  fractions: genFractions,
  decimals: genDecimals,
  percentages: genPercentages,
  integers: genIntegers,
  ratios: genRatios,
  'order-of-operations': genOrderOfOperations,
  'linear-equations': genLinearEquation,
  systems: genSystems,
  quadratics: genQuadratic,
  exponents: genExponents,
  radicals: genRadicals,
  'area-perimeter': genAreaPerimeter,
  pythagorean: genPythagorean,
  trigonometry: genTrig,
  logarithms: genLogs,
  derivatives: genDerivatives,
  integrals: genIntegrals,
  limits: genLimits,
  statistics: genStatistics,
}

export function generateProblem(topicId, difficulty = 1, seed) {
  const gen = GENERATORS[topicId]
  if (!gen) throw new Error(`Unknown topic: ${topicId}`)
  const rng = createRng(seed ?? (Date.now() ^ (Math.random() * 0xffffffff) ^ topicId.length * 2654435761))
  const problem = gen(rng, difficulty)
  problem.seed = rng.seed
  return problem
}

export function generateUniqueSet(topicId, difficulty, count, seenAnswers = new Set()) {
  const out = []
  let attempts = 0
  while (out.length < count && attempts < count * 40) {
    attempts++
    const p = generateProblem(topicId, difficulty)
    const key = `${p.prompt}::${p.answer}`
    if (seenAnswers.has(key)) continue
    seenAnswers.add(key)
    out.push(p)
  }
  return out
}

export { nearlyEqual, formatNumber, createRng }
