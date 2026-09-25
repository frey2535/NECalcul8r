import fs from "node:fs";

const scenarios = [
  ["Generac report reproduction",4000,49.1,11.3,44.6,48],
  ["Small gas-appliance home",1500,14.2,3.5,17.7,18],
  ["Typical 2,000 ft2",2000,17.5,4.5,22.0,22],
  ["2,500 ft2 electric range",2500,21.0,5.0,26.0,26],
  ["3,000 ft2 + well",3000,24.0,5.5,29.5,30],
  ["3,500 ft2 two HVAC",3500,27.5,7.0,34.5,36],
  ["4,000 ft2 electric home",4000,33.4,11.3,44.7,48],
  ["4,500 ft2 large home",4500,36.0,12.0,48.0,48],
  ["5,000 ft2 high appliance",5000,40.0,14.0,54.0,60],
  ["6,000 ft2 estate",6000,47.0,16.0,63.0,75],
  ["Large home with managed loads",5000,30.0,10.0,40.0,40],
];
const sizes=[7.5,10,14,15,18,20,22,24,26,28,30,32,36,38,40,45,48,50,60,75,100,125,150,175,200,250,300,400,500,750,1000];
let failures=0;
for (const [name,sqft,base,hvac,expected,gen] of scenarios) {
  const calc=Math.round((base+hvac)*10)/10;
  const picked=sizes.find(x=>x>=calc);
  const ok=Math.abs(calc-expected)<=0.2 && picked===gen;
  console.log(`${ok?"PASS":"FAIL"} | ${name} | ${sqft} ft2 | required ${calc} kW | generator ${picked} kW`);
  if(!ok) failures++;
}
if(failures) process.exit(1);
console.log(`PASS: ${scenarios.length}/${scenarios.length} benchmark scenarios`);
