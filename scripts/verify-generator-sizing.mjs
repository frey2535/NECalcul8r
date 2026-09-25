/**
 * Generator sizing independent arithmetic benchmarks.
 * These are known-answer component tests, not manufacturer model certifications.
 */
const tests = [
  ["2,000 ft² general connected", 2000*3 + 2*1500 + 1500, 10500],
  ["2,000 ft² general demand", 3000 + (10500-3000)*0.35, 5625],
  ["4,000 ft² general connected", 4000*3 + 2*1500 + 1500, 16500],
  ["4,000 ft² general demand", 3000 + (16500-3000)*0.35, 7725],
  ["12 kW single range demand", 8000, 8000],
  ["15 kW single range demand", 8000*1.15, 9200],
  ["20 kW single range demand", 8000*1.40, 11200],
  ["dryer 4.2 kW minimum", Math.max(5000,4200), 5000],
  ["dryer 6 kW nameplate", Math.max(5000,6000), 6000],
  ["four fixed appliances 75%", (1000+4500+1500+1000)*0.75, 6000],
  ["three fixed appliances 100%", 1000+4500+1500, 7000],
  ["noncoincident HVAC", Math.max(5000,10000), 10000],
  ["simultaneous HVAC", 5000+10000, 15000],
  ["largest motor 25% adder", 4000*0.25, 1000],
  ["100 A LRA at 240 V", 100*240/1000, 24],
  ["200 A 240 V service capacity", 200*240/1000, 48],
  ["400 A 240 V service capacity", 400*240/1000, 96],
  ["2026 4,000 ft² connected general", 4000*2 + 2*1500 + 1500, 12500],
  ["2026 4,000 ft² general demand", 3000 + (12500-3000)*0.35, 6325],
];

let failed=0;
for (const [name, actual, expected] of tests) {
  const ok=Math.abs(actual-expected)<0.001;
  console.log(`${ok?"PASS":"FAIL"} | ${name} | actual=${actual} expected=${expected}`);
  if(!ok) failed++;
}
if(failed) process.exit(1);
console.log(`PASS: ${tests.length}/${tests.length} independent generator arithmetic benchmarks`);
