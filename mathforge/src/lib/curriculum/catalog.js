/**
 * Curriculum: elementary → calculus.
 * Includes international methods & shortcuts with WHY they work.
 */

export const LEVELS = [
  { id: 'elementary', name: 'Elementary', blurb: 'Number sense, ops, fractions', xpGate: 0, color: '#C8F542' },
  { id: 'middle', name: 'Middle School', blurb: 'Ratios, integers, intro algebra', xpGate: 200, color: '#7DD3C0' },
  { id: 'algebra', name: 'Algebra', blurb: 'Equations, systems, quadratics', xpGate: 600, color: '#F4A261' },
  { id: 'geometry', name: 'Geometry', blurb: 'Area, Pythagoras, shapes', xpGate: 1000, color: '#E76F51' },
  { id: 'precalc', name: 'Precalculus', blurb: 'Trig, logs, radicals', xpGate: 1600, color: '#9B5DE5' },
  { id: 'calculus', name: 'Calculus', blurb: 'Limits, derivatives, integrals', xpGate: 2400, color: '#00BBF9' },
]

export const TOPICS = [
  {
    id: 'addition',
    level: 'elementary',
    name: 'Addition',
    icon: '➕',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Adding with place value',
      intro: 'Addition combines quantities. Every method — US standard, left-to-right (common in mental math cultures), or compensation — relies on place value and the associative/commutative laws.',
      exampleSteps: [
        { title: 'Example: 38 + 47', detail: 'We will show three methods that all give 85.' },
        { title: 'US standard (right-to-left)', detail: 'Ones: 8+7=15 → write 5, carry 1 ten. Tens: 3+4+1=8. Result 85.' },
        { title: 'Left-to-right (mental)', detail: '30+40=70, 8+7=15, 70+15=85. Why it works: a+b = (a tens + b tens) + (a ones + b ones).' },
        { title: 'Compensation shortcut', detail: '38+47 = 40+45 = 85 (add 2 to 38, subtract 2 from 47). Why: you added zero overall (+2−2).' },
      ],
      whyShortcutsWork: 'Compensation works because adding and subtracting the same amount is adding zero — the identity element of addition.',
      international: 'Japanese lessons often linger on multiple strategies before speed. Singapore uses number bonds. Both build deeper fluency than drill-only approaches.',
    },
  },
  {
    id: 'subtraction',
    level: 'elementary',
    name: 'Subtraction',
    icon: '➖',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Subtraction & regrouping',
      intro: 'Subtraction finds difference. Check every answer by adding.',
      exampleSteps: [
        { title: 'Example: 52 − 18', detail: 'Standard: ones 2<8, borrow → 12−8=4, tens 4−1=3 → 34.' },
        { title: 'Counting up (European shop method)', detail: '18 → 20 (+2), 20 → 52 (+32). Total added = 34. Why: distance on the number line is the difference.' },
        { title: 'Austrian method', detail: 'Equal addends: add 2 to both → 54−20=34. Why: a−b = (a+k)−(b+k).' },
      ],
      whyShortcutsWork: 'Equal additions preserve difference because both numbers shift by the same amount on the number line.',
      international: 'The “counting up” method is standard in many Dutch and UK classrooms and often faster for mental change-making.',
    },
  },
  {
    id: 'multiplication',
    level: 'elementary',
    name: 'Multiplication',
    icon: '✖️',
    difficultyDefault: 1,
    scratch: true,
    tutorial: {
      title: 'Multiplication — many paths, one product',
      intro: 'Multiplication is repeated addition and area. Long multiplication, lattice (gelosia), Japanese stick method, and Vedic vertically-crosswise all compute the same place-value products.',
      exampleSteps: [
        { title: 'Example: 23 × 14', detail: 'Target product: 322.' },
        { title: 'Standard long multiplication', detail: '23×4=92. 23×10=230. Sum 322. Why: 14=10+4, distributive property.' },
        { title: 'Lattice (Italian gelosia)', detail: 'Draw a 2×2 grid, multiply digits into diagonal cells, add down diagonals with carry. Same partial products, different layout — historically used across Europe & the Islamic world.' },
        { title: 'Japanese line method', detail: 'Draw 2+3 lines and 1+4 lines; count intersections by place. It works because intersections enumerate digit products.' },
        { title: 'Vedic vertically & crosswise', detail: 'For 2-digit: cross-multiply and add for tens; vertical for ones & hundreds. Algebraically identical to (10a+b)(10c+d)=100ac+10(ad+bc)+bd.' },
      ],
      whyShortcutsWork: 'Every shortcut expands (10a+b)(10c+d) and regroups — they look magical until you expand the algebra.',
      international: 'Lattice multiplication appears in Fibonacci’s Liber Abaci. Vedic math popularized mental forms in India. Japanese line method is a visual of the same arithmetic.',
    },
  },
  {
    id: 'division',
    level: 'elementary',
    name: 'Division',
    icon: '➗',
    difficultyDefault: 1,
    scratch: true,
    tutorial: {
      title: 'Division & long division',
      intro: 'Division asks “how many groups?” Always check: divisor × quotient + remainder = dividend.',
      exampleSteps: [
        { title: 'Example: 156 ÷ 12', detail: '12×13=156, so quotient 13.' },
        { title: 'Long division', detail: '12 into 15 once → 12, remainder 3; bring down 6 → 36; 12×3=36.' },
        { title: 'Chunking (UK)', detail: 'Subtract chunks: 12×10=120, left 36; 12×3=36. Quotient 13. Why: repeated subtraction grouped efficiently.' },
        { title: 'Egyptian doubling', detail: 'Double 12: 1→12, 2→24, 4→48, 8→96. Combine 8+4+1=13 to reach 156. Why: binary decomposition of the quotient.' },
      ],
      whyShortcutsWork: 'Chunking and Egyptian methods use the distributive property — they subtract known multiples until nothing remains.',
      international: 'Chunking is emphasized in UK primary; Egyptian doubling resurfaces in computer science as binary multiplication/division.',
    },
  },
  {
    id: 'fractions',
    level: 'elementary',
    name: 'Fractions',
    icon: '½',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Fractions deeply',
      intro: 'A fraction a/b is a equal parts when a whole is cut into b equal pieces. Bar models make this unforgettable.',
      exampleSteps: [
        { title: 'Adding 1/3 + 1/6', detail: 'Common denominator 6: 2/6 + 1/6 = 3/6 = 1/2.' },
        { title: 'Bar model (Singapore)', detail: 'Draw a bar, split into 6. Shade 2 parts + 1 part = 3/6.' },
        { title: 'Multiplying 2/3 × 3/4', detail: 'Multiply across → 6/12 = 1/2. Cancel first: 2/3×3/4 = 2/4 = 1/2.' },
        { title: 'Dividing by a fraction', detail: '2/3 ÷ 4/5 = 2/3 × 5/4. Why: dividing by k is multiplying by 1/k, and 1/(4/5)=5/4.' },
      ],
      whyShortcutsWork: 'Cross-canceling before multiplying works because you are dividing numerator and denominator by the same factor — value unchanged.',
      international: 'Singapore bar models and Japanese fraction walls are among the most effective visual tools worldwide.',
    },
  },
  {
    id: 'decimals',
    level: 'elementary',
    name: 'Decimals',
    icon: '.5',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Decimals as fractions',
      intro: '0.3 = 3/10, 0.03 = 3/100. Decimal arithmetic is fraction arithmetic in disguise.',
      exampleSteps: [
        { title: '0.6 + 0.75', detail: 'Align points → 1.35. Or 6/10 + 75/100 = 60/100 + 75/100 = 135/100 = 1.35.' },
        { title: '0.4 × 0.2', detail: '4×2=8, total 2 decimal places → 0.08. Why: (4/10)(2/10)=8/100.' },
      ],
      whyShortcutsWork: 'Counting decimal places in multiplication equals adding the powers of 10 in the denominators.',
      international: 'Many European texts keep fraction form longer before decimal notation — stronger conceptual transfer.',
    },
  },
  {
    id: 'percentages',
    level: 'elementary',
    name: 'Percentages',
    icon: '%',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Percent mental math',
      intro: 'Percent = per 100. Build everything from 1% and 10%.',
      exampleSteps: [
        { title: '15% of 80', detail: '10% of 80 = 8. 5% = 4. Sum = 12.' },
        { title: 'Why benchmarks work', detail: '15% = 10% + 5%, and 5% = half of 10%. Distributive property.' },
      ],
      whyShortcutsWork: 'Percent benchmarks are just factoring the percent into friendly summands.',
      international: 'Mental percentage fluency is heavily drilled in UK & Asian exam prep — transfer these habits early.',
    },
  },
  {
    id: 'integers',
    level: 'middle',
    name: 'Integers',
    icon: '±',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Signed numbers',
      intro: 'Negatives extend the number line left of zero. Models beat memorized slogans.',
      exampleSteps: [
        { title: 'Number line', detail: '(−3)+(−5)=−8: walk left 3, then left 5.' },
        { title: 'Subtracting negative', detail: '4−(−2)=4+2=6. Removing a debt increases wealth.' },
        { title: 'Sign rules for ×', detail: 'Same signs → positive; different → negative. Comes from distributive property: 3×(−2)=−6, and (−1)×(−1) must be +1 to keep laws intact.' },
      ],
      whyShortcutsWork: '“Negative times negative is positive” is required for algebra laws to stay consistent — not an arbitrary rule.',
      international: 'Netherlands Realistic Mathematics Education uses rich number-line & debt contexts before symbolic rules.',
    },
  },
  {
    id: 'ratios',
    level: 'middle',
    name: 'Ratios & Proportions',
    icon: ':',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Ratios that scale',
      intro: 'A ratio a:b means for every a of one thing, b of another. Scale by multiplying both parts.',
      exampleSteps: [
        { title: '3:5 and first is 12', detail: 'Scale factor 4 → second is 20.' },
        { title: 'Bar model', detail: '3 units vs 5 units; each unit = 4 when first is 12.' },
      ],
      whyShortcutsWork: 'Scaling multiplies by k/k = 1 in ratio form — equivalent ratios.',
      international: 'Singapore bar models dominate ratio instruction for good reason — they make the unit visible.',
    },
  },
  {
    id: 'order-of-operations',
    level: 'middle',
    name: 'Order of Operations',
    icon: '()',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'PEMDAS / BODMAS / GEMA',
      intro: 'Different acronyms, same hierarchy: grouping → exponents → mul/div (L→R) → add/sub (L→R).',
      exampleSteps: [
        { title: '3 + 4 × 2', detail: '× first → 3+8=11. Not 14.' },
        { title: 'Acronyms', detail: 'US PEMDAS, UK BODMAS/BIDMAS, some texts GEMA. Multiplication does NOT always beat division — they share level.' },
      ],
      whyShortcutsWork: 'The hierarchy matches how algebraic notation is parsed worldwide so expressions stay unambiguous.',
      international: 'Teach the shared hierarchy, not the letters — letters differ by country and confuse kids.',
    },
  },
  {
    id: 'statistics',
    level: 'middle',
    name: 'Statistics Basics',
    icon: '📊',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Mean & median',
      intro: 'Mean is the balance point; median is the middle value. Know when each is better.',
      exampleSteps: [
        { title: 'Mean', detail: 'Sum ÷ count.' },
        { title: 'Median', detail: 'Sort, pick middle (or average of two middles).' },
      ],
      whyShortcutsWork: 'Median resists outliers — preferred in many real datasets (UK GCSE emphasis).',
      international: 'IB and GCSE introduce statistical literacy earlier and more deeply than many US state standards.',
    },
  },
  {
    id: 'linear-equations',
    level: 'algebra',
    name: 'Linear Equations',
    icon: '𝑥',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Solving linear equations',
      intro: 'Keep the balance: same operation on both sides. Inverse operations unwrap the equation.',
      exampleSteps: [
        { title: '3x + 5 = 20', detail: '−5 both sides → 3x=15 → ÷3 → x=5.' },
        { title: 'Check', detail: '3(5)+5=20 ✓ — never skip the check.' },
      ],
      whyShortcutsWork: 'Inverse operations work because each arithmetic operation has an inverse that restores the original value.',
      international: 'Balance scales and bar models appear in East Asian textbooks before pure symbol manipulation.',
    },
  },
  {
    id: 'systems',
    level: 'algebra',
    name: 'Systems of Equations',
    icon: '⦃',
    difficultyDefault: 2,
    scratch: true,
    tutorial: {
      title: 'Two equations, two unknowns',
      intro: 'Elimination, substitution, or graphs — pick the cleanest path.',
      exampleSteps: [
        { title: 'Elimination idea', detail: 'Make coefficients of one variable opposites, add equations.' },
        { title: 'Substitution', detail: 'Solve one equation for a variable, plug into the other.' },
      ],
      whyShortcutsWork: 'Both methods apply equivalent transformations that preserve the solution set.',
      international: 'Matrix methods appear earlier in some European & Chinese curricula — same linear algebra underneath.',
    },
  },
  {
    id: 'quadratics',
    level: 'algebra',
    name: 'Quadratics',
    icon: '𝑥²',
    difficultyDefault: 2,
    scratch: true,
    tutorial: {
      title: 'Quadratic equations',
      intro: 'Factor when easy; otherwise use the quadratic formula or complete the square.',
      exampleSteps: [
        { title: 'Factoring', detail: 'x² − 5x + 6 = (x−2)(x−3)=0 → x=2 or 3.' },
        { title: 'Formula', detail: 'x = (−b ± √(b²−4ac))/2a' },
        { title: 'Completing the square', detail: 'Historical method that also yields vertex form. Used extensively by Al-Khwarizmi.' },
      ],
      whyShortcutsWork: 'The quadratic formula is completing the square done once for general a,b,c — that is why it always works.',
      international: 'Completing the square is often under-taught in US Algebra 1 but central historically and for calculus later.',
    },
  },
  {
    id: 'exponents',
    level: 'algebra',
    name: 'Exponents',
    icon: 'ⁿ',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Exponent laws',
      intro: 'a^m · a^n = a^(m+n). (a^m)^n = a^(mn). a^0 = 1 (a≠0).',
      exampleSteps: [
        { title: 'Why multiply adds exponents', detail: '2³·2² = (2·2·2)·(2·2) = 2⁵.' },
        { title: 'Negative exponents', detail: 'a^(−n) = 1/a^n — definition that keeps the laws working.' },
      ],
      whyShortcutsWork: 'Laws follow from counting factors — not from memorization alone.',
      international: 'Same laws worldwide; fluency separates strong algebra students from struggling ones.',
    },
  },
  {
    id: 'radicals',
    level: 'precalc',
    name: 'Radicals',
    icon: '√',
    difficultyDefault: 2,
    scratch: false,
    tutorial: {
      title: 'Square roots',
      intro: '√n asks for non-negative y with y² = n.',
      exampleSteps: [
        { title: 'Perfect squares', detail: '√81 = 9.' },
        { title: 'Simplify √12', detail: '√(4·3)=2√3.' },
      ],
      whyShortcutsWork: '√(ab)=√a·√b for non-negative a,b — from (√a√b)² = ab.',
      international: 'Prime-factor simplification is emphasized heavily in olympiad-style training globally.',
    },
  },
  {
    id: 'area-perimeter',
    level: 'geometry',
    name: 'Area & Perimeter',
    icon: '▭',
    difficultyDefault: 1,
    scratch: false,
    tutorial: {
      title: 'Measuring shapes',
      intro: 'Perimeter is path length; area is space inside.',
      exampleSteps: [
        { title: 'Rectangle', detail: 'A=lw, P=2(l+w).' },
        { title: 'Triangle', detail: 'A=½bh — half a parallelogram.' },
        { title: 'Circle', detail: 'A=πr², C=2πr (Archimedes).' },
      ],
      whyShortcutsWork: 'Formulas count unit squares or use limits of inscribed polygons for circles.',
      international: 'Hands-on area with grid paper (common in Japan) beats formula memorization alone.',
    },
  },
  {
    id: 'pythagorean',
    level: 'geometry',
    name: 'Pythagorean Theorem',
    icon: '△',
    difficultyDefault: 2,
    scratch: true,
    tutorial: {
      title: 'a² + b² = c²',
      intro: 'In a right triangle, leg squares sum to hypotenuse square. Known across ancient cultures.',
      exampleSteps: [
        { title: '3-4-5', detail: '9+16=25.' },
        { title: 'Find a leg', detail: 'b = √(c² − a²).' },
      ],
      whyShortcutsWork: 'Rearrangement proofs (van Aubel, Perigal) show area equality visually — no algebra required.',
      international: 'Appears in Babylonian tablets, Indian Sulba Sutras, and Chinese Zhoubi Suanjing — learn the triples cold.',
    },
  },
  {
    id: 'trigonometry',
    level: 'precalc',
    name: 'Trigonometry',
    icon: '∠',
    difficultyDefault: 2,
    scratch: false,
    tutorial: {
      title: 'Special angles',
      intro: 'sin, cos, tan from right triangles and the unit circle. Master 0°, 30°, 45°, 60°, 90°.',
      exampleSteps: [
        { title: 'sin 30° = 1/2', detail: 'From 30-60-90 sides 1 : √3 : 2.' },
        { title: 'cos 45° = √2/2', detail: 'From isosceles right triangle.' },
      ],
      whyShortcutsWork: 'Special-angle values are exact ratios from those two triangles — derive once, memorize forever.',
      international: 'Unit-circle approach (common in US precalc) + triangle-first (many EU texts) both matter.',
    },
  },
  {
    id: 'logarithms',
    level: 'precalc',
    name: 'Logarithms',
    icon: '㏒',
    difficultyDefault: 2,
    scratch: false,
    tutorial: {
      title: 'Logs as exponents',
      intro: 'log_b(a)=c means b^c=a. Invented to turn multiplication into addition.',
      exampleSteps: [
        { title: 'log₂ 8 = 3', detail: 'Because 2³=8.' },
        { title: 'Product rule', detail: 'log(mn)=log m + log n — Napier’s original power.' },
      ],
      whyShortcutsWork: 'Log laws are exponent laws rewritten — that is why they feel familiar.',
      international: 'Respect the history: logs were the computational engine of science for centuries before calculators (which this app deliberately does not include).',
    },
  },
  {
    id: 'limits',
    level: 'calculus',
    name: 'Limits',
    icon: '→',
    difficultyDefault: 3,
    scratch: true,
    tutorial: {
      title: 'Approaching a value',
      intro: 'Limits describe the value a function approaches. Foundation of calculus.',
      exampleSteps: [
        { title: '0/0 indeterminate', detail: 'Factor, cancel, then substitute.' },
        { title: 'Example', detail: 'lim x→2 (x²−4)/(x−2) = lim (x+2)=4.' },
      ],
      whyShortcutsWork: 'Canceling the common (x−a) is valid for the limit because we care about values near a, not at a.',
      international: 'ε-δ rigor appears in university everywhere; high-school IB HL & French prépa go deeper earlier.',
    },
  },
  {
    id: 'derivatives',
    level: 'calculus',
    name: 'Derivatives',
    icon: 'd/dx',
    difficultyDefault: 3,
    scratch: true,
    tutorial: {
      title: 'Instantaneous rate of change',
      intro: 'The derivative is the slope of the tangent. Power rule is your first workhorse.',
      exampleSteps: [
        { title: 'Power rule', detail: 'd/dx [x^n] = n x^(n−1).' },
        { title: 'Example', detail: 'd/dx [3x⁴] = 12x³.' },
        { title: 'Check meaning', detail: 'At x=1, slope is 12 — rise per run at that instant.' },
      ],
      whyShortcutsWork: 'Power rule comes from the binomial expansion of (x+h)^n in the limit definition.',
      international: 'Notation differs: Leibniz d/dx, Lagrange f′, Newton ẋ — same object.',
    },
  },
  {
    id: 'integrals',
    level: 'calculus',
    name: 'Integrals',
    icon: '∫',
    difficultyDefault: 3,
    scratch: true,
    tutorial: {
      title: 'Accumulation & area',
      intro: 'Integration undoes differentiation. Always +C for indefinite integrals.',
      exampleSteps: [
        { title: 'Power rule', detail: '∫ x^n dx = x^(n+1)/(n+1) + C.' },
        { title: 'Check', detail: 'Differentiate your answer — you must recover the integrand.' },
      ],
      whyShortcutsWork: '+C exists because constants vanish under differentiation — infinitely many antiderivatives.',
      international: 'Fundamental Theorem of Calculus is the crown jewel — link integral to derivative in both US AP and A-level Maths.',
    },
  },
]

export function getTopic(id) {
  return TOPICS.find((t) => t.id === id)
}

export function topicsForLevel(levelId) {
  return TOPICS.filter((t) => t.level === levelId)
}

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id)
}
