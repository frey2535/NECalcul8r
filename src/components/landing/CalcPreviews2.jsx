import React from "react";
import { MockHeader, MockField, MockResultRow, MockResultSection, MockFormulaBox } from "./MockPrimitives";

// ─── Commercial Load ───
export function CommercialLoadPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 220.12 / 220.42" label="Commercial Load" emoji="🏢" color="red" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Floor Area" unit="sq ft" value="10,000" />
        <MockField label="Occupancy" value="Retail" />
        <MockField label="Receptacles" unit="VA" value="18,000" />
        <MockField label="Continuous" value="Yes" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Load Calculation">
          <MockResultRow label="Lighting Load (Table 220.12)" value="30,000" unit="VA" sub="Retail @ 3 VA/sq ft" />
          <MockResultRow label="Receptacle Demand (220.44)" value="14,400" unit="VA" sub="First 10k @ 100% + 50%" />
          <MockResultRow label="Total Connected Load" value="44,400" unit="VA" highlight />
          <MockResultRow label="Service Current" value="167" unit="A" highlight sub="208V/3Ø" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Lighting Load", expression: "10,000 sq ft × 3 VA", result: "30,000", unit: "VA" },
          { label: "Receptacle Demand", expression: "10,000 + (8,000 × 0.50)", result: "14,400", unit: "VA" },
          { label: "Service Current", expression: "44,400 ÷ (208 × 1.732)", result: "123", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── Service Sizing ───
export function ServiceSizingPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 230.42" label="Service Entrance" emoji="🏗️" color="slate" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Total Load" unit="VA" value="85,000" />
        <MockField label="Voltage" unit="V" value="240/120" />
        <MockField label="Phase" value="Single" />
        <MockField label="Continuous" value="Yes" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Service Sizing">
          <MockResultRow label="Calculated Current" value="354" unit="A" highlight />
          <MockResultRow label="Continuous (125%)" value="443" unit="A" highlight sub="NEC 230.42(A)" />
          <MockResultRow label="Min. Service Size" value="500" unit="A" highlight sub="Next standard ≥ 443A" />
          <MockResultRow label="Service Conductor" value="500 kcmil" sub="Cu · 75°C · 380A ampacity" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Service Current", expression: "85,000 ÷ 240", result: "354", unit: "A" },
          { label: "Continuous Load", expression: "354 × 1.25", result: "443", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── Transformer Sizing ───
export function TransformerSizingPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 450.3" label="Transformer Sizing" emoji="🔋" color="yellow" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Primary V" unit="V" value="480" />
        <MockField label="Secondary V" unit="V" value="208/120" />
        <MockField label="Load" unit="kVA" value="75" />
        <MockField label="OCPD Type" value="Breaker" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Transformer & Protection">
          <MockResultRow label="Transformer Size" value="75" unit="kVA" highlight sub="Standard size" />
          <MockResultRow label="Primary Current" value="90" unit="A" sub="75kVA ÷ 480V × 1.732" />
          <MockResultRow label="Primary OCPD" value="125" unit="A" highlight sub="Table 450.3(B) — 250% FLC" />
          <MockResultRow label="Secondary OCPD" value="300" unit="A" sub="Table 450.3(B) — 125%" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Primary FLC", expression: "75,000 ÷ (480 × 1.732)", result: "90", unit: "A" },
          { label: "Primary OCPD", expression: "90 × 2.50", result: "225", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── Conduit Fill ───
export function ConduitFillPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC Ch.9 Table 1" label="Conduit Fill" emoji="🔵" color="indigo" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Conduit Type" value="RMC" />
        <MockField label="Trade Size" value="1¼ in" />
        <MockField label="Conductors" value="6 × #10 AWG" />
        <MockField label="Insulation" value="THHN" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Fill Calculation">
          <MockResultRow label="Conductor Area" value="0.7878" unit="in²" sub="6 × 0.1313 in²" />
          <MockResultRow label="Conduit Area" value="1.532" unit="in²" sub="RMC 1¼ in" />
          <MockResultRow label="Fill Percentage" value="51.4" unit="%" failed sub="Exceeds 53% limit" />
          <MockResultRow label="Status" value="✓ PASS" sub="Under 53% for 6+ conductors" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Total Conductor Area", expression: "6 × 0.1313", result: "0.7878", unit: "in²" },
          { label: "Fill %", expression: "(0.7878 ÷ 1.532) × 100", result: "51.4", unit: "%" },
        ]} />
      </div>
    </div>
  );
}

// ─── Box Fill ───
export function BoxFillPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 314.16" label="Box Fill" emoji="📦" color="purple" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Box Type" value="4×4×1.5" />
        <MockField label="Box Volume" unit="in³" value="21" />
        <MockField label="Conductors" value="4 × #12" />
        <MockField label="Devices" value="1 receptacle" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Fill Calculation">
          <MockResultRow label="Conductor Fill" value="8.0" unit="in³" sub="4 × 2.25 in³ (#12)" />
          <MockResultRow label="Device Fill" value="4.5" unit="in³" sub="1 device × 2.25" />
          <MockResultRow label="Total Required" value="12.5" unit="in³" highlight />
          <MockResultRow label="Status" value="✓ PASS" sub="12.5 ≤ 21 in³" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Conductor Fill", expression: "4 × 2.25", result: "9.0", unit: "in³" },
          { label: "Total Required", expression: "9.0 + 4.5 + 0", result: "13.5", unit: "in³" },
        ]} />
      </div>
    </div>
  );
}

// ─── Solar PV ───
export function SolarPVPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 690 / 705" label="Solar PV System" emoji="☀️" color="yellow" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Inverter Rating" unit="kW" value="10" />
        <MockField label="PV String Current" unit="A" value="12.5" />
        <MockField label="System Voltage" unit="V" value="600" />
        <MockField label="OCPD Rating" unit="A" value="20" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="PV Circuit Sizing">
          <MockResultRow label="Inverter OCPD" value="50" unit="A" highlight sub="125% of 40A continuous" />
          <MockResultRow label="PV Conductor" value="#8 AWG" sub="Cu · 90°C · 55A ampacity" highlight />
          <MockResultRow label="Busbar Rating" value="100" unit="A" sub="120% rule applied" />
          <MockResultRow label="Backfeed Breaker" value="40" unit="A" sub="NEC 705.12(B)(2)" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Inverter OCPD", expression: "40 × 1.25", result: "50", unit: "A" },
          { label: "Busbar 120%", expression: "100 + (40 × 1.25)", result: "150", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── Generator ───
export function GeneratorPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 702 / 445" label="Generator Sizing" emoji="🔦" color="green" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Total Load" unit="kW" value="18" />
        <MockField label="Largest Motor" unit="HP" value="5" />
        <MockField label="Voltage" unit="V" value="240/120" />
        <MockField label="Standby Type" value="Optional" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Generator Sizing">
          <MockResultRow label="Calculated Load" value="18,000" unit="VA" />
          <MockResultRow label="Largest Motor (125%)" value="4,656" unit="VA" sub="5HP × 1.25" />
          <MockResultRow label="Required Size" value="22.7" unit="kVA" highlight />
          <MockResultRow label="Recommended Gen" value="25" unit="kVA" highlight sub="Next standard size" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Motor Starting", expression: "5HP × 746W × 1.25", result: "4,663", unit: "VA" },
          { label: "Total Required", expression: "18,000 + 4,663", result: "22,663", unit: "VA" },
        ]} />
      </div>
    </div>
  );
}

// ─── Motor Circuit ───
export function MotorCircuitPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 430.6 / 430.22" label="Motor Branch Circuit" emoji="⚙️" color="teal" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Motor HP" unit="HP" value="10" />
        <MockField label="Voltage" unit="V" value="460" />
        <MockField label="Phase" value="3-Phase" />
        <MockField label="FLC Source" value="Table 430.250" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Motor Sizing">
          <MockResultRow label="FLC (Table 430.250)" value="14" unit="A" highlight />
          <MockResultRow label="Conductor (125%)" value="17.5" unit="A" sub="14 × 1.25" />
          <MockResultRow label="Min. Conductor" value="#10 AWG" sub="Cu · 75°C" highlight />
          <MockResultRow label="OCPD (250% FLC)" value="35" unit="A" sub="Inverse time breaker" />
          <MockResultRow label="Overload (115%)" value="16.1" unit="A" sub="14 × 1.15" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Conductor Size", expression: "14 × 1.25", result: "17.5", unit: "A" },
          { label: "OCPD", expression: "14 × 2.50", result: "35", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── GEC Sizing (Grounding) ───
export function GECPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 250.66" label="Grounding Electrode" emoji="⛏️" color="amber" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Service Conductor" value="500 kcmil" />
        <MockField label="Material" value="Copper" />
        <MockField label="Electrode Type" value="Ground Rod" />
        <MockField label="System" value="Single-Phase" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="GEC Sizing">
          <MockResultRow label="GEC Size (Table 250.66)" value="#1/0 AWG" sub="Cu — 500 kcmil service" highlight />
          <MockResultRow label="Aluminum Equivalent" value="#4/0 AWG" sub="If Al GEC used" />
          <MockResultRow label="Ground Rod Max" value="#6 AWG" sub="NEC 250.66(A) exception" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Table 250.66 Lookup", expression: "500 kcmil → #1/0 Cu", result: "#1/0", unit: "AWG" },
        ]} />
      </div>
    </div>
  );
}

// ─── Overcurrent Protection ───
export function OvercurrentProtectionPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 240.4 / 240.6" label="Overcurrent Protection" emoji="🛡️" color="red" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Conductor" value="#12 AWG" />
        <MockField label="Ampacity" unit="A" value="25" />
        <MockField label="Load Type" value="Continuous" />
        <MockField label="Load Current" unit="A" value="16" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="OCPD Sizing">
          <MockResultRow label="Continuous (125%)" value="20" unit="A" sub="16 × 1.25" />
          <MockResultRow label="Small Conductor Limit" value="20" unit="A" sub="NEC 240.4(D) — #12 max" failed />
          <MockResultRow label="Standard OCPD" value="20" unit="A" highlight sub="NEC 240.6(A)" />
          <MockResultRow label="Status" value="✓ PASS" sub="20A ≤ 25A ampacity" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Continuous Load", expression: "16 × 1.25", result: "20", unit: "A" },
          { label: "Small Conductor Max", expression: "min(20, 25)", result: "20", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── Short Circuit ───
export function ShortCircuitPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 110.9 / 110.10" label="Short-Circuit Current" emoji="⚠️" color="red" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Transformer" unit="kVA" value="75" />
        <MockField label="Secondary V" unit="V" value="208" />
        <MockField label="Impedance" unit="%" value="5.0" />
        <MockField label="Conductor Length" unit="ft" value="50" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Available Fault Current">
          <MockResultRow label="Transformer Isc" value="4,168" unit="A" sub="75kVA ÷ (1.732 × 208 × 0.05)" />
          <MockResultRow label="Conductor Z" value="0.0042" unit="Ω" sub="50 ft of #1/0 Cu" />
          <MockResultRow label="Available Isc" value="3,892" unit="A" highlight sub="At end of run" />
          <MockResultRow label="Required AIC" value="5,000" unit="A" sub="NEC 110.9" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Transformer Isc", expression: "75,000 ÷ (1.732 × 208 × 0.05)", result: "4,168", unit: "A" },
          { label: "End-of-Line Isc", expression: "208 ÷ (0.0042 + 0.0011)", result: "3,925", unit: "A" },
        ]} />
      </div>
    </div>
  );
}

// ─── EV Charging ───
export function EVChargingPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 625" label="EV Charging / EVSE" emoji="🚗" color="green" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="EVSE Rating" unit="A" value="48" />
        <MockField label="Voltage" unit="V" value="240" />
        <MockField label="Circuit Type" value="Dedicated" />
        <MockField label="Continuous" value="Yes" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Circuit Sizing">
          <MockResultRow label="Continuous (125%)" value="60" unit="A" sub="48 × 1.25" highlight />
          <MockResultRow label="OCPD Rating" value="60" unit="A" highlight sub="NEC 240.6(A)" />
          <MockResultRow label="Min. Conductor" value="#6 AWG" sub="Cu · 75°C · 65A ampacity" />
          <MockResultRow label="GFCI Required" value="✓ Yes" sub="NEC 625.54" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Circuit Current", expression: "48 × 1.25", result: "60", unit: "A" },
          { label: "Conductor Ampacity", expression: "≥ 60A → #6 Cu", result: "#6", unit: "AWG" },
        ]} />
      </div>
    </div>
  );
}

// ─── Marina Shore Power ───
export function MarinaPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 555.12" label="Marina Shore Power" emoji="⚓" color="cyan" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="30A Berths" value="24" />
        <MockField label="50A Berths" value="8" />
        <MockField label="Voltage" unit="V" value="208/120" />
        <MockField label="Phase" value="3-Phase" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Service Calculation">
          <MockResultRow label="Connected Load" value="172,800" unit="VA" />
          <MockResultRow label="Demand Factor (555.12)" value="52" unit="%" sub="32 slips tier" />
          <MockResultRow label="Demand Load" value="89,856" unit="VA" highlight />
          <MockResultRow label="Service Current" value="250" unit="A" highlight sub="208V/3Ø" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Connected Load", expression: "(24×3600) + (8×12000)", result: "172,800", unit: "VA" },
          { label: "Demand Load", expression: "172,800 × 0.52", result: "89,856", unit: "VA" },
        ]} />
      </div>
    </div>
  );
}

// ─── Demand Factor ───
export function DemandFactorPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 220.42 / 220.44" label="Demand Factor" emoji="📊" color="blue" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Connected Load" unit="VA" value="12,000" />
        <MockField label="Load Type" value="Lighting" />
        <MockField label="Dwelling" value="Single-Family" />
        <MockField label="NEC Year" value="2023" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Demand Calculation">
          <MockResultRow label="First 3,000 VA @ 100%" value="3,000" unit="VA" />
          <MockResultRow label="Remaining @ 35%" value="3,150" unit="VA" sub="(12,000-3,000) × 0.35" />
          <MockResultRow label="Demand Load" value="6,150" unit="VA" highlight sub="Table 220.42" />
          <MockResultRow label="Demand Factor" value="51.3" unit="%" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "First Tier", expression: "3,000 × 1.00", result: "3,000", unit: "VA" },
          { label: "Second Tier", expression: "9,000 × 0.35", result: "3,150", unit: "VA" },
          { label: "Total Demand", expression: "3,000 + 3,150", result: "6,150", unit: "VA" },
        ]} />
      </div>
    </div>
  );
}

// ─── Power Factor ───
export function PowerFactorPreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="IEEE / NEC 460" label="Power Factor Correction" emoji="📐" color="green" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Real Power" unit="kW" value="50" />
        <MockField label="Current PF" value="0.75" />
        <MockField label="Target PF" value="0.95" />
        <MockField label="Voltage" unit="V" value="480" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Capacitor Sizing">
          <MockResultRow label="Existing kVAR" value="44.1" unit="kVAR" sub="50 × tan(acos(0.75))" />
          <MockResultRow label="Target kVAR" value="16.4" unit="kVAR" sub="50 × tan(acos(0.95))" />
          <MockResultRow label="Required Cap" value="27.7" unit="kVAR" highlight />
          <MockResultRow label="Capacitor Current" value="33.3" unit="A" sub="27.7kVAR ÷ 480V" />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Existing kVAR", expression: "50 × tan(41.4°)", result: "44.1", unit: "kVAR" },
          { label: "Capacitor Size", expression: "44.1 - 16.4", result: "27.7", unit: "kVAR" },
        ]} />
      </div>
    </div>
  );
}

// ─── Multi-Wire Branch Circuit ───
export function MultiWirePreview() {
  return (
    <div className="space-y-3">
      <MockHeader article="NEC 210.4" label="Multiwire Branch Circuit" emoji="〰️" color="purple" />
      <div className="grid grid-cols-2 gap-3">
        <MockField label="Voltage" unit="V" value="120/240" />
        <MockField label="Phase" value="Single-Phase" />
        <MockField label="Load L1" unit="A" value="12" />
        <MockField label="Load L2" unit="A" value="8" />
      </div>
      <div className="pt-2 space-y-2">
        <MockResultSection title="Neutral Calculation">
          <MockResultRow label="L1 Current" value="12" unit="A" />
          <MockResultRow label="L2 Current" value="8" unit="A" />
          <MockResultRow label="Neutral Current" value="4" unit="A" highlight sub="|L1 - L2|" />
          <MockResultRow label="Imbalance" value="33" unit="%" sub="(12-8) ÷ 12" />
          <MockResultRow label="Common OCPD Required" value="✓ Yes" sub="NEC 210.4(B)" highlight />
        </MockResultSection>
        <MockFormulaBox steps={[
          { label: "Neutral Current", expression: "|12 - 8|", result: "4", unit: "A" },
          { label: "Imbalance %", expression: "(12 - 8) ÷ 12 × 100", result: "33", unit: "%" },
        ]} />
      </div>
    </div>
  );
}