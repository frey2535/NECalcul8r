export const CALCULATOR_TIER_PLAN_ORDER = [
  "free",
  "individual_6_15",
  "individual_16_25",
  "individual_26_35",
  "individual_36_plus",
];

export const DEFAULT_CALCULATOR_TIER_GROUPS = [
  {
    planKey: "free",
    label: "Free calculators",
    description: "Included before purchase. Edit these IDs to choose the free five.",
    maxCumulativeCount: 5,
    calculatorIds: [
      "voltage_drop",
      "conductor_ampacity",
      "box_fill",
      "dwelling_standard",
      "dwelling_optional",
    ],
  },
  {
    planKey: "individual_6_15",
    label: "Individual 6-15",
    description: "Unlocked by the 6-15 calculator package.",
    maxCumulativeCount: 15,
    calculatorIds: [
      "commercial_load",
      "motor_full_load",
      "motor_feeder",
      "conduit_fill",
      "transformer_sizing",
      "overcurrent_protection",
      "service_sizing",
      "generator_sizing",
      "egc_sizing",
      "grounding_electrode",
    ],
  },
  {
    planKey: "individual_16_25",
    label: "Individual 16-25",
    description: "Unlocked by the 16-25 calculator package.",
    maxCumulativeCount: 25,
    calculatorIds: [
      "main_bonding_jumper",
      "system_bonding_jumper",
      "gec_for_sds",
      "bonding_jumper_parallel",
      "supplemental_grounding_electrode",
      "multifamily_standard",
      "multifamily_load",
      "farm_load",
      "fixed_electric_heat",
      "kitchen_equipment_demand",
    ],
  },
  {
    planKey: "individual_26_35",
    label: "Individual 26-35",
    description: "Unlocked by the 26-35 calculator package.",
    maxCumulativeCount: 35,
    calculatorIds: [
      "demand_factor",
      "continuous_load",
      "hvac_load",
      "welding_receptacle",
      "lighting_load",
      "multiwire_branch",
      "receptacle_load",
      "short_circuit",
      "power_factor",
      "three_phase_power",
    ],
  },
  {
    planKey: "individual_36_plus",
    label: "Individual 36+",
    description: "Full access, including new calculators as they are developed.",
    maxCumulativeCount: null,
    calculatorIds: [
      "single_phase_power",
      "pool_spa",
      "solar_pv",
      "ev_charging",
      "data_center",
      "rv_park_load",
      "marina_shore_power",
      "pull_box_sizing",
      "neutral_load",
    ],
  },
];

export const CALCULATOR_TIER_SETTINGS_ENTITY = "CalculatorTierSettings";
export const CALCULATOR_TIER_SETTINGS_KEY = "global";

function parseConfiguredTierGroups() {
  const raw = import.meta.env?.VITE_CALCULATOR_TIER_GROUPS_JSON;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("VITE_CALCULATOR_TIER_GROUPS_JSON is not valid JSON.");
    return {};
  }
}

function normalizeCalculatorIds(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && Array.isArray(value.calculatorIds)) return value.calculatorIds.map(String).filter(Boolean);
  if (value && Array.isArray(value.calculators)) return value.calculators.map(String).filter(Boolean);
  return null;
}

function configuredGroupValue(config, planKey) {
  if (Array.isArray(config)) {
    return config.find((group) => group?.planKey === planKey || group?.id === planKey);
  }
  return config[planKey] || config.plans?.[planKey] || config.groups?.[planKey];
}

export function compactCalculatorTierGroups(groups = []) {
  return groups.map((group) => ({
    planKey: group.planKey,
    calculatorIds: Array.isArray(group.calculatorIds) ? group.calculatorIds.map(String).filter(Boolean) : [],
  }));
}

export function getCalculatorTierGroupConfig(customGroups) {
  const configured = customGroups || parseConfiguredTierGroups();
  return DEFAULT_CALCULATOR_TIER_GROUPS.map((group) => {
    const configuredValue = configuredGroupValue(configured, group.planKey);
    const configuredIds = normalizeCalculatorIds(configuredValue);
    return {
      ...group,
      calculatorIds: configuredIds?.length ? configuredIds : group.calculatorIds,
    };
  });
}

export function getCalculatorTierGroupIndex(planKey) {
  const index = CALCULATOR_TIER_PLAN_ORDER.indexOf(planKey);
  return index === -1 ? 0 : index;
}

export function hasConfiguredCalculatorTierMatches(categories = [], customGroups) {
  const configuredIds = new Set(getCalculatorTierGroupConfig(customGroups).flatMap((group) => group.calculatorIds));
  return categories.some((category) => configuredIds.has(category.id));
}

export function buildCalculatorTierSections(categories = [], customGroups) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const assignedIds = new Set();
  let assignedCount = 0;

  const sections = getCalculatorTierGroupConfig(customGroups).map((group, index) => {
    const sectionCategories = [];
    const sectionIds = [];
    const availableSlots = group.maxCumulativeCount == null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, group.maxCumulativeCount - assignedCount);

    for (const id of group.calculatorIds) {
      if (sectionCategories.length >= availableSlots) break;
      const category = categoryById.get(id);
      if (!category || assignedIds.has(id)) continue;
      assignedIds.add(id);
      sectionIds.push(id);
      sectionCategories.push(category);
    }
    assignedCount += sectionCategories.length;

    return {
      ...group,
      index,
      calculatorIds: sectionIds,
      categories: sectionCategories,
      count: sectionCategories.length,
    };
  });

  const unassignedCategories = categories.filter((category) => !assignedIds.has(category.id));
  const fullAccessSection = sections[sections.length - 1];
  if (fullAccessSection && unassignedCategories.length) {
    fullAccessSection.categories = [...fullAccessSection.categories, ...unassignedCategories];
    fullAccessSection.calculatorIds = [
      ...fullAccessSection.calculatorIds,
      ...unassignedCategories.map((category) => category.id),
    ];
    fullAccessSection.count = fullAccessSection.categories.length;
  }

  return sections;
}

export function getIncludedCalculatorIdsForPlan(categories = [], planKey, customGroups) {
  const maxIndex = getCalculatorTierGroupIndex(planKey);
  const includedIds = new Set();

  for (const section of buildCalculatorTierSections(categories, customGroups)) {
    if (section.index > maxIndex) continue;
    for (const category of section.categories) {
      includedIds.add(category.id);
    }
  }

  return includedIds;
}
