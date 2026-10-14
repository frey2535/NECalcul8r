import React from "react";
import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/api/supabaseClient";

async function fetchMetrics() {
  const { data, error } = await requireSupabase().from("pwa_analytics_events")
    .select("profile_id,event_type,platform,created_at").order("created_at", { ascending: false }).limit(10000);
  if (error) throw error;
  return data || [];
}
export default function PwaAnalytics() {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["pwa-analytics"], queryFn: fetchMetrics });
  const count = (type) => data.filter(e => e.event_type === type).length;
  const unique = (type) => new Set(data.filter(e => e.event_type === type).map(e => e.profile_id)).size;
  const platforms = ["ios", "android", "desktop", "other"];
  return <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">PWA Analytics</h1><button type="button" className="rounded-lg border px-3 py-2" onClick={() => refetch()}>Refresh</button></div>
    <p className="text-sm text-muted-foreground">Tracking begins after the database migration and app deployment. Counts include authenticated users only. iOS manual home-screen installs cannot be confirmed by the browser. This is not a historical or total-download count. Displayed events are limited to the newest 10,000.</p>
    {isLoading && <p>Loading metrics…</p>}{error && <p role="alert" className="text-red-600">Unable to load PWA analytics: {error.message}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
      ["Install prompts shown", count("install_prompt_shown")],
      ["Accepted prompts", count("install_prompt_accepted")],
      ["Confirmed browser installs", count("installed")],
      ["Unique standalone users", unique("standalone_launch")]
    ].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold mt-2">{value}</div></div>)}</div>
    <h2 className="font-semibold">By platform</h2>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Platform</th><th className="p-2">Confirmed installs</th><th className="p-2">Unique standalone users</th><th className="p-2">Launch events</th></tr></thead><tbody>{platforms.map(p => <tr key={p} className="border-t"><td className="p-2 capitalize">{p}</td><td className="p-2">{data.filter(e => e.platform === p && e.event_type === "installed").length}</td><td className="p-2">{new Set(data.filter(e => e.platform === p && e.event_type === "standalone_launch").map(e => e.profile_id)).size}</td><td className="p-2">{data.filter(e => e.platform === p && e.event_type === "standalone_launch").length}</td></tr>)}</tbody></table></div>
  </main>;
}
