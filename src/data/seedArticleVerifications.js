/**
 * Seed data for ArticleVerification entity.
 * Baseline verification status for the top 10 launch calculators across 2017–2026.
 * 
 * Each calculator references the articles/tables it uses, and tracks whether
 * each has been manually verified against the published code book.
 * 
 * Status: "verified_YYYY" means confirmed against NEC YYYY code text.
 *         "pending_review" means article exists but verification is queued.
 *         "needs_correction" means detected discrepancy between calculator and code.
 */

export const ARTICLE_VERIFICATION_SEED = [
  // ══════════════════════════════════════════════════════════════════════════
  // DWELLING STANDARD (calcDwellingStandard)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "dwelling_standard", article_ref: "220.12", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_standard", article_ref: "220.12", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_standard", article_ref: "220.12", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_standard", article_ref: "220.12", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_standard", article_ref: "220.42", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_standard", article_ref: "220.42", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_standard", article_ref: "220.42", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_standard", article_ref: "220.42", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_standard", article_ref: "220.82", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_standard", article_ref: "220.82", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_standard", article_ref: "220.82", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_standard", article_ref: "220.82", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_standard", article_ref: "240.6(A)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_standard", article_ref: "240.6(A)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_standard", article_ref: "240.6(A)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_standard", article_ref: "240.6(A)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_standard", article_ref: "230.42", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_standard", article_ref: "230.42", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_standard", article_ref: "230.42", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_standard", article_ref: "230.42", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // DWELLING OPTIONAL (calcDwellingOptional)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "dwelling_optional", article_ref: "220.12", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_optional", article_ref: "220.12", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_optional", article_ref: "220.12", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_optional", article_ref: "220.12", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_optional", article_ref: "220.82(B)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_optional", article_ref: "220.82(B)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_optional", article_ref: "220.82(B)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_optional", article_ref: "220.82(B)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_optional", article_ref: "240.6(A)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_optional", article_ref: "240.6(A)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_optional", article_ref: "240.6(A)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_optional", article_ref: "240.6(A)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "dwelling_optional", article_ref: "230.42", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "dwelling_optional", article_ref: "230.42", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "dwelling_optional", article_ref: "230.42", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "dwelling_optional", article_ref: "230.42", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // SERVICE SIZING (calcServiceSizing)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "service_sizing", article_ref: "230.42(A)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "service_sizing", article_ref: "230.42(A)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "service_sizing", article_ref: "230.42(A)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "service_sizing", article_ref: "230.42(A)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "service_sizing", article_ref: "230.42(B)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "service_sizing", article_ref: "230.42(B)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "service_sizing", article_ref: "230.42(B)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "service_sizing", article_ref: "230.42(B)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // CONDUCTOR AMPACITY (calcConductorAmpacity)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(16)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(16)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(16)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(16)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(2)(c)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(2)(c)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(2)(c)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(B)(2)(c)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "conductor_ampacity", article_ref: "310.15(C)(1)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(C)(1)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(C)(1)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conductor_ampacity", article_ref: "310.15(C)(1)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "conductor_ampacity", article_ref: "110.14(C)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conductor_ampacity", article_ref: "110.14(C)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conductor_ampacity", article_ref: "110.14(C)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conductor_ampacity", article_ref: "110.14(C)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // CONDUIT FILL (calcConduitFill)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 1", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 1", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 1", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 1", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 4", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 4", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 4", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 4", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 5", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 5", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 5", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "conduit_fill", article_ref: "Ch.9 Table 5", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // BOX FILL (calcBoxFill)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "box_fill", article_ref: "314.16(A)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "box_fill", article_ref: "314.16(A)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "box_fill", article_ref: "314.16(A)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "box_fill", article_ref: "314.16(A)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "box_fill", article_ref: "314.16(B)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "box_fill", article_ref: "314.16(B)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "box_fill", article_ref: "314.16(B)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "box_fill", article_ref: "314.16(B)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFORMER SIZING (calcTransformerSizing)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "transformer_sizing", article_ref: "450.3(B)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "transformer_sizing", article_ref: "450.3(B)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "transformer_sizing", article_ref: "450.3(B)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "transformer_sizing", article_ref: "450.3(B)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // MOTOR BRANCH CIRCUIT (calcMotorBranchCircuit)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "motor_branch_circuit", article_ref: "430.22", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.22", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.22", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.22", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "motor_branch_circuit", article_ref: "430.52(C)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.52(C)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.52(C)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.52(C)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "motor_branch_circuit", article_ref: "430.32", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.32", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.32", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.32", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "motor_branch_circuit", article_ref: "430.6", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.6", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.6", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_branch_circuit", article_ref: "430.6", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // MOTOR FEEDER (calcMotorFeeder)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "motor_feeder", article_ref: "430.24", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_feeder", article_ref: "430.24", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_feeder", article_ref: "430.24", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_feeder", article_ref: "430.24", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "motor_feeder", article_ref: "430.62(A)", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "motor_feeder", article_ref: "430.62(A)", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "motor_feeder", article_ref: "430.62(A)", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "motor_feeder", article_ref: "430.62(A)", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  // ══════════════════════════════════════════════════════════════════════════
  // EV CHARGING (calcEVCharging)
  // ══════════════════════════════════════════════════════════════════════════
  { calculator_id: "ev_charging", article_ref: "625.42", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "ev_charging", article_ref: "625.42", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "ev_charging", article_ref: "625.42", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "ev_charging", article_ref: "625.42", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "ev_charging", article_ref: "625.54", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "ev_charging", article_ref: "625.54", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "ev_charging", article_ref: "625.54", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "ev_charging", article_ref: "625.54", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "ev_charging", article_ref: "230.67", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "ev_charging", article_ref: "230.67", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "ev_charging", article_ref: "230.67", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "ev_charging", article_ref: "230.67", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },

  { calculator_id: "ev_charging", article_ref: "230.85", nec_year: "2017", status: "verified_2017" },
  { calculator_id: "ev_charging", article_ref: "230.85", nec_year: "2020", status: "verified_2020" },
  { calculator_id: "ev_charging", article_ref: "230.85", nec_year: "2023", status: "verified_2023" },
  { calculator_id: "ev_charging", article_ref: "230.85", nec_year: "2026", status: "pending_review", notes: "2026 code not yet published" },
];