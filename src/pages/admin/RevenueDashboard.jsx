import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, RefreshCw, Smartphone, Users, WalletCards } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isSupabaseConfigured, requireSupabase } from "@/api/supabaseClient";
import { getPlanOption, PLAN_CATALOG } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const BILLING_SOURCES = {
  stripe: { label: "Stripe", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  google_play: { label: "Google Play", badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  apple_app_store: { label: "Apple App Store", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  other: { label: "Other", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const ENDING_SUBSCRIPTION_STATUSES = new Set(["canceled", "cancelled", "canceling"]);
const ACTIVE_GOOGLE_PLAY_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

const GOOGLE_PLAY_PLAN_BY_PRODUCT_ID = new Map(
  PLAN_CATALOG
    .filter((plan) => plan.googlePlayProductId)
    .map((plan) => [plan.googlePlayProductId, plan.planKey])
);

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isFutureDate(value) {
  return Boolean(value) && new Date(value).getTime() > Date.now();
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function planKeyFromMetadata(metadata, fallback) {
  return metadata.plan_key || metadata.calculator_tier_id || fallback || "free";
}

function customerLabel(record, users) {
  if (record.profile_id || record.user_id) {
    const user = users.find((item) => item.id === (record.profile_id || record.user_id));
    return user?.email || user?.full_name || "Individual subscription";
  }
  if (record.org_id) {
    const owner = users.find((item) => item.org_id === record.org_id && item.org_role === "owner");
    const orgUser = users.find((item) => item.org_id === record.org_id);
    return owner?.org_name || orgUser?.org_name || "Company subscription";
  }
  return "Subscription";
}

function stripeRows(subscriptions, users) {
  return subscriptions.map((subscription) => {
    const metadata = normalizeMetadata(subscription.metadata);
    const plan = getPlanOption(planKeyFromMetadata(metadata));
    const normalizedStatus = String(subscription.status || "").toLowerCase();
    const inPaidPeriod = ACTIVE_SUBSCRIPTION_STATUSES.has(normalizedStatus)
      || (ENDING_SUBSCRIPTION_STATUSES.has(normalizedStatus) && isFutureDate(subscription.current_period_end));

    return {
      id: subscription.id,
      source: subscription.provider || "stripe",
      customer: customerLabel(subscription, users),
      planKey: plan.planKey,
      planLabel: plan.label,
      status: subscription.status || "unknown",
      seats: Number(subscription.seats) || Number(metadata.seat_limit) || Number(metadata.quantity) || 1,
      monthlyTarget: Number(plan.monthlyTarget) || 0,
      currentPeriodEnd: subscription.current_period_end,
      active: inPaidPeriod,
      recurring: ACTIVE_SUBSCRIPTION_STATUSES.has(normalizedStatus),
      updatedAt: subscription.updated_at || subscription.created_at,
    };
  });
}

function googlePlayRows(purchases, users) {
  return purchases.map((purchase) => {
    const planKey = GOOGLE_PLAY_PLAN_BY_PRODUCT_ID.get(purchase.product_id) || purchase.product_id || "individual_36_plus";
    const plan = getPlanOption(planKey);
    const state = String(purchase.purchase_state || "");
    const active = ACTIVE_GOOGLE_PLAY_STATES.has(state) || isFutureDate(purchase.expires_at);

    return {
      id: purchase.id,
      source: "google_play",
      customer: customerLabel(purchase, users),
      planKey: plan.planKey,
      planLabel: plan.label,
      status: state || "unknown",
      seats: 1,
      monthlyTarget: Number(plan.monthlyTarget) || 0,
      currentPeriodEnd: purchase.expires_at,
      active,
      recurring: ACTIVE_GOOGLE_PLAY_STATES.has(state),
      updatedAt: purchase.updated_at || purchase.last_verified_at || purchase.created_at,
    };
  });
}

function entitlementRows(entitlements, users, existingRevenueKeys) {
  return entitlements
    .filter((entitlement) => entitlement.status === "active")
    .filter((entitlement) => !["stripe", "google_play"].includes(entitlement.source))
    .map((entitlement) => {
      const metadata = normalizeMetadata(entitlement.metadata);
      const plan = getPlanOption(planKeyFromMetadata(metadata));
      const key = `${entitlement.source}:${entitlement.profile_id || ""}:${entitlement.org_id || ""}:${plan.planKey}`;
      if (existingRevenueKeys.has(key)) return null;

      return {
        id: entitlement.id,
        source: entitlement.source || "other",
        customer: customerLabel(entitlement, users),
        planKey: plan.planKey,
        planLabel: plan.label,
        status: entitlement.subscription_status || entitlement.status || "active",
        seats: Number(entitlement.seats) || Number(metadata.seat_limit) || 1,
        monthlyTarget: 0,
        currentPeriodEnd: entitlement.expires_at,
        active: true,
        recurring: false,
        updatedAt: entitlement.updated_at || entitlement.created_at,
        note: "Access grant; revenue not counted",
      };
    })
    .filter(Boolean);
}

async function loadRevenueData() {
  const users = await base44.entities.User.list("-created_date", 1000);
  if (!isSupabaseConfigured) {
    return { users, subscriptions: [], entitlements: [], googlePlayPurchases: [], supabaseReady: false };
  }

  const client = requireSupabase();
  const [subscriptionsResult, entitlementsResult, googlePlayResult] = await Promise.all([
    client.from("subscriptions").select("*").order("updated_at", { ascending: false }),
    client.from("entitlements").select("*").order("updated_at", { ascending: false }),
    client.from("google_play_purchases").select("*").order("updated_at", { ascending: false }),
  ]);

  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (entitlementsResult.error) throw entitlementsResult.error;
  if (googlePlayResult.error) throw googlePlayResult.error;

  return {
    users,
    subscriptions: subscriptionsResult.data || [],
    entitlements: entitlementsResult.data || [],
    googlePlayPurchases: googlePlayResult.data || [],
    supabaseReady: true,
  };
}

function SummaryCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">{value}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export default function RevenueDashboard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["revenue-dashboard"],
    queryFn: loadRevenueData,
  });

  const dashboard = useMemo(() => {
    const users = data?.users || [];
    const subscriptionRows = stripeRows(data?.subscriptions || [], users);
    const playRows = googlePlayRows(data?.googlePlayPurchases || [], users);
    const existingRevenueKeys = new Set(
      [...subscriptionRows, ...playRows].map((row) => `${row.source}:${row.customer}:${row.planKey}`)
    );
    const otherRows = entitlementRows(data?.entitlements || [], users, existingRevenueKeys);
    const rows = [...subscriptionRows, ...playRows, ...otherRows]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    const activeRows = rows.filter((row) => row.active);
    const recurringRows = rows.filter((row) => row.active && row.recurring);
    const revenueRows = activeRows.filter((row) => ["stripe", "google_play", "apple_app_store"].includes(row.source));

    const bySource = Object.keys(BILLING_SOURCES).map((source) => {
      const sourceRows = activeRows.filter((row) => (BILLING_SOURCES[row.source] ? row.source : "other") === source);
      return {
        source,
        ...BILLING_SOURCES[source],
        activeCount: sourceRows.length,
        recurringCount: sourceRows.filter((row) => row.recurring).length,
        monthlyTarget: sourceRows.reduce((total, row) => total + row.monthlyTarget, 0),
      };
    });

    return {
      rows,
      activeRows,
      recurringRows,
      revenueRows,
      bySource,
      grossMonthlyTarget: revenueRows.reduce((total, row) => total + row.monthlyTarget, 0),
      activeUsers: users.filter((user) => user.access_status === "active" && !user.is_platform_admin).length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Revenue Dashboard</h1>
              <p className="text-sm text-slate-300">
                Combined subscription view for Stripe, Google Play, and future app stores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        Revenue is estimated from the configured monthly plan price for active paid-period subscriptions.
        Use Stripe and Google Play for final payout, tax, refund, and fee reconciliation.
      </div>

      {!data?.supabaseReady && !isLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          Live subscription totals require Supabase configuration. Local/demo mode can only show user access records.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error.message || "Unable to load revenue data."}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading revenue dashboard...</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={WalletCards}
              label="Projected MRR"
              value={money(dashboard.grossMonthlyTarget)}
              detail="Stripe + Google Play active paid periods"
            />
            <SummaryCard
              icon={Users}
              label="Active subscriptions"
              value={dashboard.revenueRows.length}
              detail={`${dashboard.recurringRows.length} currently recurring`}
            />
            <SummaryCard
              icon={Smartphone}
              label="Active app users"
              value={dashboard.activeUsers}
              detail="Non-platform-admin users with active access"
            />
            <SummaryCard
              icon={DollarSign}
              label="Access grants"
              value={dashboard.activeRows.filter((row) => row.monthlyTarget === 0).length}
              detail="Manual, license, or included access not counted as revenue"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.bySource.map((source) => (
              <div key={source.source} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", source.badge)}>
                    {source.label}
                  </span>
                  <span className="text-lg font-extrabold text-foreground">{money(source.monthlyTarget)}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {source.activeCount} active paid-period record{source.activeCount === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {source.recurringCount} currently recurring
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-extrabold text-foreground">Subscription records</h2>
              <p className="text-xs text-muted-foreground">
                Current paid-period access by billing source. Cancelled subscriptions remain visible through their paid period.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Customer</th>
                    <th className="px-4 py-3 text-left font-bold">Source</th>
                    <th className="px-4 py-3 text-left font-bold">Plan</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-right font-bold">MRR</th>
                    <th className="px-4 py-3 text-left font-bold">Period end</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dashboard.rows.length ? dashboard.rows.map((row) => {
                    const source = BILLING_SOURCES[row.source] || BILLING_SOURCES.other;
                    return (
                      <tr key={`${row.source}-${row.id}`} className={!row.active ? "opacity-60" : undefined}>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                          {row.customer}
                          {row.note && <p className="text-xs font-normal text-muted-foreground">{row.note}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", source.badge)}>
                            {source.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {row.planLabel}
                          {row.seats > 1 && <span> · {row.seats} seats</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.status}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-foreground">
                          {money(row.monthlyTarget)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {dateLabel(row.currentPeriodEnd)}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No subscription records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
