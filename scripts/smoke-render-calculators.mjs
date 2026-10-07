/**
 * Render-smoke every calculator for each NEC year.
 * Catches ReferenceErrors / runtime crashes that prevent a calculator from opening.
 *
 * Usage: node scripts/smoke-render-calculators.mjs
 */
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";

const YEARS = ["2017", "2020", "2023", "2026"];

const CALC_IMPORTS = {
  electrical_fundamentals: "/src/components/calculator/calcs/ElectricalFundamentals.jsx",
  voltage_drop: "/src/components/calculator/calcs/VoltageDrop.jsx",
  conductor_ampacity: "/src/components/calculator/calcs/ConductorAmpacity.jsx",
  box_fill: "/src/components/calculator/calcs/BoxFill.jsx",
  dwelling_standard: "/src/components/calculator/calcs/DwellingStandard.jsx",
  dwelling_optional: "/src/components/calculator/calcs/DwellingOptional.jsx",
  commercial_load: "/src/components/calculator/calcs/CommercialLoad.jsx",
  motor_full_load: "/src/components/calculator/calcs/MotorBranchCircuit.jsx",
  motor_feeder: "/src/components/calculator/calcs/MotorFeeder.jsx",
  conduit_fill: "/src/components/calculator/calcs/ConduitFill.jsx",
  transformer_sizing: "/src/components/calculator/calcs/TransformerSizing.jsx",
  overcurrent_protection: "/src/components/calculator/calcs/OvercurrentProtection.jsx",
  service_sizing: "/src/components/calculator/calcs/ServiceSizing.jsx",
  generator_sizing: "/src/components/calculator/calcs/GeneratorSizing.jsx",
  egc_sizing: "/src/components/calculator/calcs/EGCSizing.jsx",
  grounding_electrode: "/src/components/calculator/calcs/GECSizing.jsx",
  main_bonding_jumper: "/src/components/calculator/calcs/MainBondingJumper.jsx",
  system_bonding_jumper: "/src/components/calculator/calcs/SystemBondingJumper.jsx",
  gec_for_sds: "/src/components/calculator/calcs/GECforSDS.jsx",
  bonding_jumper_parallel: "/src/components/calculator/calcs/BondingJumperParallel.jsx",
  supplemental_grounding_electrode: "/src/components/calculator/calcs/SupplementalGroundingElectrode.jsx",
  multifamily_load: "/src/components/calculator/calcs/MultifamilyLoad.jsx",
  multifamily_standard: "/src/components/calculator/calcs/MultifamilyStandard.jsx",
  farm_load: "/src/components/calculator/calcs/FarmLoad.jsx",
  fixed_electric_heat: "/src/components/calculator/calcs/FixedElectricHeat.jsx",
  kitchen_equipment_demand: "/src/components/calculator/calcs/KitchenEquipmentDemand.jsx",
  demand_factor: "/src/components/calculator/calcs/DemandFactor.jsx",
  continuous_load: "/src/components/calculator/calcs/ContinuousLoad.jsx",
  hvac_load: "/src/components/calculator/calcs/HVACLoad.jsx",
  welding_receptacle: "/src/components/calculator/calcs/WelderLoad.jsx",
  lighting_load: "/src/components/calculator/calcs/LightingLoad.jsx",
  multiwire_branch: "/src/components/calculator/calcs/MultiWire.jsx",
  receptacle_load: "/src/components/calculator/calcs/ReceptacleLoad.jsx",
  short_circuit: "/src/components/calculator/calcs/ShortCircuit.jsx",
  power_factor: "/src/components/calculator/calcs/PowerFactor.jsx",
  three_phase_power: "/src/components/calculator/calcs/ThreePhasePower.jsx",
  single_phase_power: "/src/components/calculator/calcs/SinglePhasePower.jsx",
  pool_spa: "/src/components/calculator/calcs/PoolSpa.jsx",
  solar_pv: "/src/components/calculator/calcs/SolarPV.jsx",
  ev_charging: "/src/components/calculator/calcs/EVCharging.jsx",
  data_center: "/src/components/calculator/calcs/DataCenter.jsx",
  rv_park_load: "/src/components/calculator/calcs/RVParkLoad.jsx",
  marina_shore_power: "/src/components/calculator/calcs/MarinaShorePower.jsx",
  pull_box_sizing: "/src/components/calculator/calcs/PullBoxSizing.jsx",
  neutral_load: "/src/components/calculator/calcs/NeutralLoad.jsx",
};

function installDomStubs() {
  if (!globalThis.window) globalThis.window = globalThis;
  if (!globalThis.self) globalThis.self = globalThis;
  if (!globalThis.top) globalThis.top = globalThis;
  if (!globalThis.document) {
    globalThis.document = {
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, removeChild() {} }),
      createElementNS: () => ({ style: {}, setAttribute() {} }),
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      body: { appendChild() {}, removeChild() {}, style: {} },
      documentElement: { style: {} },
      head: { appendChild() {} },
    };
  }
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "node-smoke", language: "en-US" },
      configurable: true,
    });
  } catch {
    /* already defined */
  }
  globalThis.HTMLElement = globalThis.HTMLElement || class HTMLElement {};
  globalThis.localStorage = globalThis.localStorage || {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  };
  globalThis.sessionStorage = globalThis.sessionStorage || globalThis.localStorage;
  globalThis.matchMedia = globalThis.matchMedia || (() => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  globalThis.getComputedStyle = globalThis.getComputedStyle || (() => ({ getPropertyValue: () => "" }));
  globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || ((id) => clearTimeout(id));
  globalThis.CSS = globalThis.CSS || { supports: () => false };
  globalThis.ResizeObserver = globalThis.ResizeObserver || class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function MockAuthProvider({ children }) {
  // Minimal shape matching useAuth consumers in CalcLayout.
  const value = {
    user: {
      id: "smoke-user",
      email: "smoke@test.local",
      access_status: "active",
      access_type: "owner_full_access",
      is_platform_admin: true,
      plan_key: "individual_36_plus",
    },
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: { id: "necalcul8r", public_settings: { auth_required: false } },
    login: async () => {},
    logout: async () => {},
    navigateToLogin: () => {},
    checkAppState: async () => {},
  };
  // Lazy-require AuthContext module after vite loads it.
  const { AuthContext } = MockAuthProvider;
  return React.createElement(AuthContext.Provider, { value }, children);
}

async function main() {
  installDomStubs();

  const server = await createServer({
    server: { middlewareMode: true },
    logLevel: "error",
    appType: "custom",
    optimizeDeps: { disabled: true },
  });

  const failures = [];
  try {
    // Load react-query through Vite SSR so provider identity matches app modules.
    const { QueryClient, QueryClientProvider } = await server.ssrLoadModule("@tanstack/react-query");
    const authMod = await server.ssrLoadModule("/src/lib/AuthContext.jsx");
    const AuthProvider = authMod.AuthProvider;
    const { CalcRestoreContext } = await server.ssrLoadModule("/src/context/CalcRestoreContext.jsx");
    const { NEC_CATEGORIES } = await server.ssrLoadModule("/src/data/calculatorCatalog.js");
    const { NECYearProvider } = await server.ssrLoadModule("/src/context/NECYearContext.jsx").catch(() => ({ NECYearProvider: null }));

    // Patch auth.me so AuthProvider can finish loading without network.
    const { base44 } = await server.ssrLoadModule("/src/api/base44Client.js");
    const originalMe = base44.auth?.me;
    if (base44.auth) {
      base44.auth.me = async () => ({
        id: "smoke-user",
        email: "smoke@test.local",
        access_status: "active",
        access_type: "owner_full_access",
        is_platform_admin: true,
        plan_key: "individual_36_plus",
      });
    }

    console.log(`Smoke-rendering ${NEC_CATEGORIES.length} calculators × ${YEARS.length} years...\n`);

    for (const cat of NEC_CATEGORIES) {
      const importPath = CALC_IMPORTS[cat.id];
      if (!importPath) {
        failures.push({ id: cat.id, year: "-", error: "No import path mapped in smoke test" });
        console.log(`✗ ${cat.id} — missing smoke import map`);
        continue;
      }

      let Comp;
      try {
        const mod = await server.ssrLoadModule(importPath);
        Comp = mod.default;
        if (!Comp) throw new Error("No default export");
      } catch (error) {
        failures.push({ id: cat.id, year: "-", error: `Import failed: ${error.message}` });
        console.log(`✗ ${cat.id} — import failed: ${error.message}`);
        continue;
      }

      for (const year of YEARS) {
        try {
          const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          });
          let element = React.createElement(Comp, { category: cat, necYear: year });
          element = React.createElement(CalcRestoreContext.Provider, { value: null }, element);
          if (AuthProvider) {
            element = React.createElement(AuthProvider, null, element);
          }
          if (NECYearProvider) {
            element = React.createElement(NECYearProvider, null, element);
          }
          element = React.createElement(QueryClientProvider, { client: queryClient }, element);
          const html = renderToString(element);
          if (!html || html.length < 20) {
            throw new Error(`Empty/short render (${html?.length || 0} chars)`);
          }
          // Catch React error-boundary style empty shells that still "succeed"
          if (/This calculator hit a loading error/i.test(html)) {
            throw new Error("Rendered calculator error boundary");
          }
          console.log(`✓ ${cat.id} @ ${year} (${html.length} chars)`);
        } catch (error) {
          const msg = error?.message || String(error);
          failures.push({ id: cat.id, year, error: msg });
          console.log(`✗ ${cat.id} @ ${year} — ${msg}`);
        }
      }
    }

    if (base44.auth && originalMe) base44.auth.me = originalMe;
  } finally {
    await server.close();
  }

  console.log("\n══════════════════════════════════════");
  if (failures.length) {
    console.log(`FAILED: ${failures.length} render(s)`);
    for (const f of failures) {
      console.log(`  - ${f.id} [${f.year}]: ${f.error}`);
    }
    process.exit(1);
  }
  console.log("ALL CALCULATORS RENDERED OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
