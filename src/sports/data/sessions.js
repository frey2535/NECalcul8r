export const VECTR_SESSIONS = [
  {
    id: "nh-cas-01",
    title: "North Harbor vs Cascadia — Build-up Press",
    competition: "Pacific Premier",
    date: "2026-09-21",
    venue: "Harbor Lights Stadium",
    duration: "12:40",
    cameras: 4,
    trackingMode: "Multi-cam optical + pose",
    sport: "Soccer",
    thumbnailTone: "emerald",
  },
  {
    id: "nh-cas-02",
    title: "Set-piece package — Far-post runs",
    competition: "Training Capture",
    date: "2026-09-18",
    venue: "VECTR Capture Cage",
    duration: "08:15",
    cameras: 6,
    trackingMode: "Markerless multi-athlete",
    sport: "Soccer",
    thumbnailTone: "amber",
  },
  {
    id: "bball-01",
    title: "Half-court scramble — defensive rotations",
    competition: "Scrimmage",
    date: "2026-09-12",
    venue: "Court A",
    duration: "06:02",
    cameras: 3,
    trackingMode: "Floor + rim fusion",
    sport: "Basketball",
    thumbnailTone: "sky",
  },
];

export const VECTR_CAPABILITIES = [
  {
    title: "Multi-object optical tracking",
    body: "Frame-by-frame identity lock with Kalman smoothing, jersey re-ID, and coast-through occlusion.",
  },
  {
    title: "Kinematic pose overlays",
    body: "Heading-aware stick figures estimated from velocity — sprint mechanics without wearable clutter.",
  },
  {
    title: "Live heat & formation intel",
    body: "Occupancy heatmaps and automatic shape detection so coaches see structure, not just dots.",
  },
  {
    title: "Broadcast-ready film room",
    body: "Scrub, isolate athletes, draw tactics, and export clips with tracking burned in.",
  },
];
