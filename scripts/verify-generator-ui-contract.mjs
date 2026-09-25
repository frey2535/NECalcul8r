/**
 * Smoke-test generator UI contract: every field the GeneratorSizing UI reads
 * must exist on the calc result (prevents ReferenceError crashes like the
 * stale serviceKW_withStarting / totalWithStarting references).
 */
import fs from "fs";

const calcSrc = fs.readFileSync("src/components/calculator/calcs/logic/generatorSizingCalc.jsx", "utf8");
const uiSrc = fs.readFileSync("src/components/calculator/calcs/GeneratorSizing.jsx", "utf8");

const dest = uiSrc.match(/const\s*\{([^}]+)\}\s*=\s*gr/);
if (!dest) {
  console.error("FAIL: could not find gr destructure in GeneratorSizing.jsx");
  process.exit(1);
}
const declared = dest[1].split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);

let failed = 0;
for (const id of ["serviceKW_withStarting", "totalWithStarting"]) {
  const referenced = new RegExp(`\\b${id}\\b`).test(uiSrc);
  if (referenced && !declared.includes(id)) {
    console.error(`FAIL: UI still references removed field '${id}' without declaring it`);
    failed++;
  } else {
    console.log(`PASS | UI safe for removed field '${id}'`);
  }
}

for (const id of declared) {
  if (!new RegExp(`\\b${id}\\b`).test(calcSrc)) {
    console.error(`FAIL: UI destructures '${id}' but calc never mentions it`);
    failed++;
  } else {
    console.log(`PASS | calc provides '${id}'`);
  }
}

if (failed) process.exit(1);
console.log(`PASS: generator UI/calc contract (${declared.length} fields)`);
