import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useNECYear } from "@/context/NECYearContext";
import { CalcRestoreContext } from "@/context/CalcRestoreContext";
import { base44 } from "@/api/base44Client";
import VoltageDrop from "./calcs/VoltageDrop";
import ConductorAmpacity from "./calcs/ConductorAmpacity";
import BoxFill from "./calcs/BoxFill";
import DwellingStandard from "./calcs/DwellingStandard";
import DwellingOptional from "./calcs/DwellingOptional";
import CommercialLoad from "./calcs/CommercialLoad";
import MotorBranchCircuit from "./calcs/MotorBranchCircuit";
import MotorFeeder from "./calcs/MotorFeeder";
import ConduitFill from "./calcs/ConduitFill";
import TransformerSizing from "./calcs/TransformerSizing";
import OveCurrent from "./calcs/OvercurrentProtection";
import ServiceSizing from "./calcs/ServiceSizing";
import GeneratorSizing from "./calcs/GeneratorSizing.jsx";
import EGCSizing from "./calcs/EGCSizing";
import GECSizing from "./calcs/GECSizing";
import MainBondingJumper from "./calcs/MainBondingJumper";
import SystemBondingJumper from "./calcs/SystemBondingJumper";
import GECforSDS from "./calcs/GECforSDS";
import BondingJumperParallel from "./calcs/BondingJumperParallel";
import SupplementalGroundingElectrode from "./calcs/SupplementalGroundingElectrode";
import MultifamilyLoad from "./calcs/MultifamilyLoad";
import MultifamilyStandard from "./calcs/MultifamilyStandard";
import FarmLoad from "./calcs/FarmLoad";
import FixedElectricHeat from "./calcs/FixedElectricHeat";
import KitchenEquipmentDemand from "./calcs/KitchenEquipmentDemand";
import DemandFactor from "./calcs/DemandFactor";
import ContinuousLoad from "./calcs/ContinuousLoad";
import HVACLoad from "./calcs/HVACLoad";
import WelderLoad from "./calcs/WelderLoad";
import LightingLoad from "./calcs/LightingLoad";
import MultiWire from "./calcs/MultiWire";
import ReceptacleLoad from "./calcs/ReceptacleLoad";
import ShortCircuit from "./calcs/ShortCircuit";
import PowerFactor from "./calcs/PowerFactor";
import ThreePhasePower from "./calcs/ThreePhasePower";
import SinglePhasePower from "./calcs/SinglePhasePower";
import PoolSpa from "./calcs/PoolSpa";
import SolarPV from "./calcs/SolarPV";
import EVCharging from "./calcs/EVCharging";
import DataCenter from "./calcs/DataCenter";
import RVParkLoad from "./calcs/RVParkLoad";
import MarinaShorePower from "./calcs/MarinaShorePower";
import PullBoxSizing from "./calcs/PullBoxSizing";
import NeutralLoad from "./calcs/NeutralLoad";

const MAP = {
  voltage_drop: VoltageDrop,
  conductor_ampacity: ConductorAmpacity,
  box_fill: BoxFill,
  dwelling_standard: DwellingStandard,
  dwelling_optional: DwellingOptional,
  commercial_load: CommercialLoad,
  motor_full_load: MotorBranchCircuit,
  motor_feeder: MotorFeeder,
  conduit_fill: ConduitFill,
  transformer_sizing: TransformerSizing,
  overcurrent_protection: OveCurrent,
  service_sizing: ServiceSizing,
  generator_sizing: GeneratorSizing,
  egc_sizing: EGCSizing,
  grounding_electrode: GECSizing,
  main_bonding_jumper: MainBondingJumper,
  system_bonding_jumper: SystemBondingJumper,
  gec_for_sds: GECforSDS,
  bonding_jumper_parallel: BondingJumperParallel,
  supplemental_grounding_electrode: SupplementalGroundingElectrode,
  multifamily_load: MultifamilyLoad,
  multifamily_standard: MultifamilyStandard,
  farm_load: FarmLoad,
  fixed_electric_heat: FixedElectricHeat,
  kitchen_equipment_demand: KitchenEquipmentDemand,
  demand_factor: DemandFactor,
  continuous_load: ContinuousLoad,
  hvac_load: HVACLoad,
  welding_receptacle: WelderLoad,
  lighting_load: LightingLoad,
  multiwire_branch: MultiWire,
  receptacle_load: ReceptacleLoad,
  short_circuit: ShortCircuit,
  power_factor: PowerFactor,
  three_phase_power: ThreePhasePower,
  single_phase_power: SinglePhasePower,
  pool_spa: PoolSpa,
  solar_pv: SolarPV,
  ev_charging: EVCharging,
  data_center: DataCenter,
  rv_park_load: RVParkLoad,
  marina_shore_power: MarinaShorePower,
  pull_box_sizing: PullBoxSizing,
  neutral_load: NeutralLoad,
};

const VALID_YEARS = ["2017", "2020"];

export default function CalculatorPanel({ category }) {
  const { year, setYear, years } = useNECYear();
  const [searchParams] = useSearchParams();
  const savedId = searchParams.get("saved");

  const { data: saved, isLoading: loadingSaved } = useQuery({
    queryKey: ["saved-calculation", savedId],
    queryFn: () => base44.entities.SavedCalculation.get(savedId),
    enabled: !!savedId,
  });

  useEffect(() => {
    if (saved?.nec_year && years.includes(saved.nec_year) && saved.nec_year !== year) {
      setYear(saved.nec_year);
    }
  }, [saved, years, year, setYear]);

  const Comp = MAP[category.id];
  if (!Comp) return <div className="p-8 text-center text-muted-foreground">Calculator coming soon.</div>;
  if (!year || !VALID_YEARS.includes(year)) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Please select a valid NEC year (2017, 2020, 2023, or 2026) to use this calculator.
      </div>
    );
  }
  if (savedId && loadingSaved) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const restore =
    saved && saved.calculator_id === category.id
      ? {
          id: saved.id,
          inputs: saved.inputs,
          title: saved.title,
          projectName: saved.project_name,
        }
      : null;

  return (
    <CalcRestoreContext.Provider value={restore}>
      <Comp key={restore?.id || "fresh"} category={category} necYear={year} />
    </CalcRestoreContext.Provider>
  );
}