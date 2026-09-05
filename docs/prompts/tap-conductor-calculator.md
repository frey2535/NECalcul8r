# Tap Conductor Calculator implementation prompt

Status: stored for future implementation. Do not implement until explicitly requested.

Add a new calculator to NECalcul8r named **Tap Conductor Calculator**.

Scope this calculator to NEC 240.21(B) Feeder Taps only for:

- 2017 NEC
- 2020 NEC

Do not add 2023 or 2026 tap-conductor logic. If another NEC year is selected, show that this calculator is only available for 2017 and 2020.

Do not modify unrelated calculators, authentication, pricing, subscription logic, Supabase structure, or unrelated NEC tables. Minimal changes are permitted only for calculator registration, navigation, year data, audit integration, and tests.

Use the existing NECalcul8r year-selection architecture. All NEC-specific rules must be year-aware and stored in centralized NEC data/config where practical.

## Purpose

The calculator must determine whether a proposed feeder tap installation complies with the selected NEC 240.21(B) feeder tap rule.

The result must show:

- applicable NEC tap rule
- entered values
- calculated minimum ampacity
- selected conductor base ampacity
- correction factor, if any
- adjustment factor, if any
- final allowable ampacity
- length limitation
- terminating OCPD/load-limiting requirement
- physical protection/raceway requirements
- every pass/fail condition
- overall COMPLIES or DOES NOT COMPLY
- NEC section references

## General rules

Feeder tap conductors are an exception to the normal rule that overcurrent protection is located where a conductor receives its supply.

Clearly state:

- NEC 240.4(B) next-size-up allowance is not permitted for tap conductors.
- The selected rule must be evaluated directly.
- Do not silently choose the most favorable rule.
- A failed mandatory condition means DOES NOT COMPLY.

For 2020 NEC, include the clarification that the feeder tap connection is permitted on the load side of the feeder overcurrent protective device. Do not present that wording as a new 2017 calculation requirement.

## Tap types

Add a selector for:

1. 10-ft Feeder Tap — 240.21(B)(1)
2. 25-ft Feeder Tap — 240.21(B)(2)
3. Transformer Tap — Primary + Secondary <=25 ft — 240.21(B)(3)
4. High-Bay Manufacturing Tap — 240.21(B)(4)
5. Outside Feeder Tap — Unlimited Length — 240.21(B)(5)

Emphasize 10-ft and 25-ft taps in the main UI. Put Transformer, High-Bay, and Outside taps under Advanced / Special Applications.

## Conductor ampacity

Reuse NECalcul8r's existing conductor ampacity engine and year-aware ampacity data.

Do not create a second ampacity database.

Use adjusted/corrected allowable ampacity, not just raw table ampacity.

Show:

- conductor size
- material
- insulation/temperature rating
- base table ampacity
- ambient correction factor
- current-carrying conductor adjustment factor
- final allowable ampacity
- minimum required tap ampacity
- PASS/FAIL comparison

## 10-ft feeder tap — NEC 240.21(B)(1)

Required inputs:

- upstream feeder OCPD rating
- calculated load supplied by tap
- rating of equipment containing OCPD supplied by tap, if applicable
- terminating tap OCPD rating, if applicable
- tap conductor length
- selected conductor size/material
- temperature/ampacity basis
- ambient temperature
- number of current-carrying conductors
- whether this is a field installation
- whether tap conductors leave the enclosure or vault where the tap is made
- whether tap conductors are enclosed in the required raceway except at feeder connection
- whether the raceway extends to the supplied equipment
- whether tap conductors extend beyond equipment supplied

Required checks:

- length <=10 ft
- tap conductors do not extend beyond equipment supplied
- except at the point of connection to the feeder, tap conductors are enclosed in the required raceway extending to the supplied equipment
- ampacity >= calculated load
- ampacity >= rating of equipment containing OCPD supplied by tap OR terminating OCPD rating, as applicable
- for field installations, if tap conductors leave the enclosure or vault where the tap is made, ampacity >= 10% of upstream feeder OCPD
- final adjusted conductor ampacity >= governing required minimum

Calculate:

```text
minimumTapAmpacity = max(
  calculatedLoad,
  applicable downstream equipment/OCPD rating,
  upstreamFeederOCPD * 0.10 only when the field-installation 10% condition applies
)
```

Do not blindly apply only the 10% rule.

## 25-ft feeder tap — NEC 240.21(B)(2)

Required inputs:

- upstream feeder OCPD rating
- tap conductor length
- terminating OCPD rating
- selected conductor size/material
- temperature/ampacity basis
- ambient temperature
- number of current-carrying conductors
- physical protection/raceway or approved protection status

Required checks:

- length <=25 ft
- tap conductor ampacity >= upstream feeder OCPD / 3
- tap conductors terminate in a single circuit breaker or single set of fuses
- terminating device limits load to the tap conductor ampacity
- numeric implementation must check terminating OCPD <= final allowable tap conductor ampacity unless another verified NEC provision is explicitly implemented
- physical protection requirement is satisfied
- 240.4(B) is not used

Calculate:

```text
minimumTapAmpacity = upstreamFeederOCPD / 3
```

## Transformer tap — NEC 240.21(B)(3)

Advanced option.

Required inputs:

- upstream feeder OCPD
- transformer primary voltage
- transformer secondary voltage
- primary tap conductor length
- secondary conductor length
- primary tap conductor final allowable ampacity
- secondary conductor final allowable ampacity
- secondary terminating OCPD rating
- physical protection status
- whether any primary conductor portion is protected at its ampacity
- calculated primary load, if evaluated
- calculated secondary load, if evaluated
- transformer kVA/nameplate current, if displayed

Do not treat transformer kVA, calculated primary load, and calculated secondary load as interchangeable.

Required checks:

- combined primary + secondary conductor length <=25 ft, excluding any primary conductor portion protected at its ampacity
- primary tap ampacity >= upstream feeder OCPD / 3
- secondary conductor ampacity satisfies voltage-ratio rule
- secondary conductors terminate in single circuit breaker or single set of fuses
- terminating device limits load to conductor ampacity
- physical protection requirement is satisfied
- load/nameplate checks are shown separately from the 240.21(B)(3) tap-ratio checks

Use explicit voltage-ratio formula:

```text
primaryRequired = upstreamFeederOCPD / 3
secondaryRequired = primaryRequired * (primaryVoltage / secondaryVoltage)
```

Equivalent pass condition:

```text
secondaryAmpacity * (secondaryVoltage / primaryVoltage) >= primaryRequired
```

## High-bay manufacturing tap — NEC 240.21(B)(4)

Advanced / Special Application option.

Applicability statement:

This special rule applies to qualifying high-bay feeder taps over 25 ft in total length. If total length is 25 ft or less, instruct the user to evaluate the appropriate shorter tap rule instead. Do not silently switch rules.

Required inputs:

- building qualifies as high-bay manufacturing
- wall height
- tap connection height above floor
- qualified-person maintenance/supervision condition
- horizontal conductor length
- total conductor length
- upstream feeder OCPD
- selected conductor size/material
- final allowable tap conductor ampacity
- terminating OCPD
- physical protection/raceway or approved protection status
- whether conductors contain splices
- whether conductors penetrate walls, floors, or ceilings

Required checks:

- total length >25 ft for this rule to apply
- high-bay manufacturing building condition satisfied
- wall height >35 ft
- tap connection is made not less than 30 ft above the floor
- maintenance/supervision ensures only qualified persons service the system
- horizontal length <=25 ft
- total length <=100 ft
- tap conductor ampacity >= upstream feeder OCPD / 3
- conductor size not smaller than #6 copper or #4 aluminum
- conductors contain no splices
- conductors do not penetrate walls, floors, or ceilings
- conductors are protected from physical damage by raceway or approved means
- conductors terminate in a single circuit breaker or single set of fuses
- terminating device limits load to conductor ampacity

Do not reduce this rule to a simple length calculation.

## Outside feeder tap — NEC 240.21(B)(5)

Advanced / Special Application option.

Required inputs:

- conductors are located outdoors except at point of load termination
- tap conductor final allowable ampacity
- calculated load
- terminating OCPD
- physical protection status
- OCPD/disconnect relationship
- disconnect location
- whether installation uses 230.6 nearest-point-of-entrance treatment

Required checks:

- conductors originate/remain outdoors except at point of load termination
- conductors are protected from physical damage in an approved manner
- conductors terminate in a single circuit breaker or single set of fuses
- terminating device limits load to conductor ampacity
- OCPD is integral to disconnecting means or immediately adjacent
- disconnecting means is readily accessible and located:
  - outside the building/structure, or
  - inside nearest the point of entrance, or
  - nearest point of entrance where installed per 230.6
- no fixed maximum length applies only if all outside-tap conditions pass

## Equipment grounding conductor

If NECalcul8r has an existing 250.122 EGC engine/table, reuse it.

For feeder taps, informational EGC sizing should be based on the upstream feeder OCPD because that is the device relied on for fault protection of the tap.

Apply NEC 250.122(G):

Determine the EGC from Table 250.122 using the upstream feeder OCPD, but do not report the required EGC as larger than the associated tap conductors.

Show:

- upstream feeder OCPD
- EGC table reference
- Table 250.122 EGC size
- 250.122(G) limitation, if it changes the shown size
- final informational EGC size

Do not duplicate Table 250.122.

## UI

Top of calculator:

```text
Tap Conductor Calculator
NEC 240.21(B)
NEC Year: 2017 | 2020
Tap Rule:
- 10 ft
- 25 ft
- Transformer 25 ft
- High-Bay Manufacturing
- Outside Unlimited Length
```

Only display inputs relevant to the selected rule.

Results must have four sections:

1. Required Tap Ampacity
2. Selected Conductor
3. Compliance Checklist
4. Result

Large status:

```text
COMPLIES WITH NEC 240.21(B)(x)
```

or

```text
DOES NOT COMPLY
```

If failing, identify every failed condition.

## Critical safety rules

- Do not assume the 10-ft rule only requires 10% of feeder OCPD.
- Do not apply the 25-ft one-third rule to a 10-ft tap.
- Do not use 240.4(B) next-size-up for tap conductors.
- Do not call outside tap "unlimited" unless all required conditions pass.
- Do not mix ordinary transformer secondary rules from 240.21(C) into feeder tap rules except where 240.21(B)(3) specifically requires transformer primary/secondary evaluation.
- Do not silently choose the most favorable rule.
- Do not allow failed mandatory condition to produce COMPLIES.
- Store or document 2017 and 2020 rule data separately.

## Regression tests

Add tests before marking complete.

- TAP-10-1 — PASS
- TAP-10-2 — FAIL AMPACITY
- TAP-10-3 — FAIL LENGTH
- TAP-25-1 — PASS
- TAP-25-2 — FAIL AMPACITY
- TAP-25-3 — FAIL TERMINATING OCPD
- TAP-25-4 — FAIL LOAD LIMITING
- TAP-XFMR-1 — PASS
- TAP-XFMR-2 — FAIL VOLTAGE RATIO
- TAP-XFMR-3 — FAIL LENGTH
- TAP-XFMR-4 — FAIL SECONDARY OCPD
- TAP-HB-1 — PASS
- TAP-HB-2 — FAIL SHORTER RULE SHOULD BE USED
- TAP-HB-3 — FAIL WALL HEIGHT
- TAP-HB-4 — FAIL TAP CONNECTION HEIGHT
- TAP-HB-5 — FAIL HORIZONTAL LENGTH
- TAP-HB-6 — FAIL TOTAL LENGTH
- TAP-HB-7 — FAIL SPLICE
- TAP-HB-8 — FAIL MINIMUM SIZE
- TAP-HB-9 — FAIL ONE-THIRD AMPACITY
- TAP-OUT-1 — PASS/FAIL BY CONDITIONS, NOT LENGTH
- TAP-OUT-2 — FAIL NOT OUTSIDE
- TAP-OUT-3 — FAIL DISCONNECT LOCATION
- EGC-1 — EGC from Table 250.122 using upstream feeder OCPD
- EGC-2 — 250.122(G) prevents reporting EGC larger than tap conductors
- YEAR-1 — 2017 and 2020 resolve through year-aware rule source

## Audit / trace

Add this calculator to NECalcul8r's audit system as Pending Verification.

Trace must show:

- selected NEC year
- selected tap rule
- source section
- upstream OCPD
- percentage/fraction requirement
- calculated minimum ampacity
- selected conductor final ampacity
- terminating OCPD
- length check
- installation condition checks
- EGC informational sizing and 250.122(G) limitation
- final compliance status

Do not mark Verified merely because tests pass. Mark Pending Verification until rule data and test cases are reviewed against licensed NEC 2017 and 2020 source text.

When finished, report:

- files created
- files modified
- 2017 rule data location
- 2020 rule data location
- regression-test results
- assumptions
- any requirement not verified
