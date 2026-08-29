/**
 * Shared frozen-baseline comparison used by 2017 calculator gates.
 */

export function fieldsMatch(actual, expected, tolerance = 0.05) {
  const fieldResults = {};
  let pass = true;
  for (const key of Object.keys(expected)) {
    const exp = expected[key];
    const act = actual?.[key];
    let match;
    if (typeof exp === "boolean" || typeof exp === "string" || exp === null) {
      match = act === exp;
    } else if (typeof exp === "number") {
      match = typeof act === "number" && Math.abs(act - exp) <= tolerance;
    } else {
      match = Object.is(act, exp);
    }
    fieldResults[key] = { actual: act, expected: exp, match };
    if (!match) pass = false;
  }
  return { pass, fieldResults };
}

export function runCalcTests({ tests, calcFn, nec, tolerance = 0.05 }) {
  const rows = tests.map((t) => {
    const actual = calcFn(t.inputs, nec);
    const { pass, fieldResults } = fieldsMatch(actual, t.expected, t.tolerance ?? tolerance);
    return { id: t.id, description: t.description, pass, fieldResults };
  });
  const passed = rows.filter((t) => t.pass).length;
  const failed = rows.filter((t) => !t.pass).length;
  return {
    allPass: failed === 0,
    total: rows.length,
    passed,
    failed,
    tests: rows,
    failures: rows.filter((t) => !t.pass),
  };
}
