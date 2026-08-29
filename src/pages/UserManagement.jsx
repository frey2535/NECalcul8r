import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Users, Shield, Clock, CheckCircle, XCircle, Ban, RefreshCw, CreditCard, Building2, Smartphone, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:   { label: "Active",    color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",  icon: CheckCircle },
  trial:    { label: "Trial",     color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",      icon: Clock },
  expired:  { label: "Expired",   color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",          icon: XCircle },
  disabled: { label: "Disabled",  color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",         icon: Ban },
};

const TYPE_CFG = {
  permanent:          { label: "Permanent",         color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  trial:              { label: "Trial",             color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  paid:               { label: "Paid",              color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  buildrpro_included: { label: "BuildrPro",         color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  app_store:          { label: "App Store",         color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
};

const ACCESS_STATUS_OPTIONS = ["active", "trial", "expired", "disabled"];
const ACCESS_TYPE_OPTIONS    = ["permanent", "trial", "paid", "buildrpro_included", "app_store"];
const PURCHASE_SOURCE_OPTIONS = ["admin", "manual", "stripe", "base44_payments", "app_store", "buildrpro"];
const SUB_STATUS_OPTIONS     = ["active", "trialing", "cancelled", "past_due", "unpaid"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEffectiveStatus(user) {
  if (user.role === 'admin') return 'active';
  const s = user.access_status || 'trial';
  if (s === 'disabled') return 'disabled';
  if (user.access_type === 'permanent') return 'active';
  if (s === 'active') return 'active';
  if (user.trial_end_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(user.trial_end_date); end.setHours(0, 0, 0, 0);
    if (end < today) return 'expired';
  }
  return s;
}

function getDaysLeft(user) {
  if (!user.trial_end_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(user.trial_end_date); end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value || undefined)}
        className="w-full h-8 rounded-lg border border-input bg-muted/50 px-2.5 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
      >
        <option value="">— none —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </div>
  );
}

function UserCard({ user, onQuickAction, onSaveEdits, extendDays }) {
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState({});
  const set = k => v => setEdits(p => ({ ...p, [k]: v }));

  const effectiveStatus = getEffectiveStatus(user);
  const statusCfg = STATUS_CFG[effectiveStatus] || STATUS_CFG.trial;
  const StatusIcon = statusCfg.icon;
  const typeCfg = TYPE_CFG[user.access_type || 'trial'] || TYPE_CFG.trial;
  const daysLeft = getDaysLeft(user);
  const isAdmin = user.role === 'admin';
  const isDirty = Object.keys(edits).length > 0;

  const handleSave = () => { onSaveEdits(user.id, edits); setEdits({}); };

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isAdmin && <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", statusCfg.color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusCfg.label}
            </span>
            <span className={cn("inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full", typeCfg.color)}>
              {typeCfg.label}
            </span>
          </div>
        </div>

        {/* Date strip */}
        {!isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">Start: </span>
              <span className="font-semibold text-foreground">{fmt(user.trial_start_date)}</span>
            </div>
            <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">End: </span>
              <span className="font-semibold text-foreground">{fmt(user.trial_end_date)}</span>
            </div>
            {daysLeft !== null && (
              <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
                <span className="text-muted-foreground">Days left: </span>
                <span className={cn("font-bold", daysLeft < 0 ? "text-red-600" : daysLeft <= 5 ? "text-amber-600" : "text-foreground")}>
                  {daysLeft < 0 ? "Expired" : `${daysLeft}d`}
                </span>
              </div>
            )}
            {user.purchase_source && (
              <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
                <span className="text-muted-foreground">Source: </span>
                <span className="font-semibold text-foreground">{user.purchase_source}</span>
              </div>
            )}
            {user.subscription_status && (
              <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
                <span className="text-muted-foreground">Sub: </span>
                <span className="font-semibold text-foreground">{user.subscription_status}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick action buttons */}
        {!isAdmin && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
              onClick={() => onQuickAction(user, 'permanent')}>
              <CheckCircle className="w-3 h-3" /> Permanent
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => onQuickAction(user, 'start_trial')}>
              <Clock className="w-3 h-3" /> Start Trial
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => onQuickAction(user, 'extend')}>
              <RefreshCw className="w-3 h-3" /> +{extendDays}d
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-sky-700 border-sky-200 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950/30"
              onClick={() => onQuickAction(user, 'paid')}>
              <CreditCard className="w-3 h-3" /> Mark Paid
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30"
              onClick={() => onQuickAction(user, 'buildrpro')}>
              <Building2 className="w-3 h-3" /> BuildrPro
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30"
              onClick={() => onQuickAction(user, 'app_store')}>
              <Smartphone className="w-3 h-3" /> App Store
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onQuickAction(user, 'disable')}>
              <Ban className="w-3 h-3" /> Disable
            </Button>
          </div>
        )}

        {/* Expand toggle */}
        {!isAdmin && (
          <button onClick={() => setExpanded(p => !p)} className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide details" : "Edit details"}
          </button>
        )}
      </div>

      {/* Expanded edit panel */}
      {expanded && !isAdmin && (
        <div className="border-t border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Access Status" value={edits.access_status ?? user.access_status} onChange={set('access_status')} options={ACCESS_STATUS_OPTIONS} />
            <SelectField label="Access Type" value={edits.access_type ?? user.access_type} onChange={set('access_type')} options={ACCESS_TYPE_OPTIONS} />
            <TextField label="Trial Start" value={edits.trial_start_date ?? user.trial_start_date} onChange={set('trial_start_date')} type="date" />
            <TextField label="Trial End" value={edits.trial_end_date ?? user.trial_end_date} onChange={set('trial_end_date')} type="date" />
            <SelectField label="Purchase Source" value={edits.purchase_source ?? user.purchase_source} onChange={set('purchase_source')} options={PURCHASE_SOURCE_OPTIONS} />
            <SelectField label="Subscription Status" value={edits.subscription_status ?? user.subscription_status} onChange={set('subscription_status')} options={SUB_STATUS_OPTIONS} />
          </div>
          <TextField label="BuildrPro Company ID" value={edits.buildrpro_company_id ?? user.buildrpro_company_id} onChange={set('buildrpro_company_id')} placeholder="e.g. bpro_abc123" />
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Admin Notes</label>
            <textarea
              value={edits.notes ?? user.notes ?? ""}
              onChange={e => set('notes')(e.target.value)}
              placeholder="Internal notes about this user's access..."
              rows={2}
              className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          {isDirty && (
            <Button size="sm" className="gap-1.5 h-8" onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [extendDays, setExtendDays] = useState(30);
  const [pendingAction, setPendingAction] = useState(null);

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });

  const mutation = useMutation({
    mutationFn: ({ userId, updates }) => base44.entities.User.update(userId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-users"] }),
  });

  if (currentUser?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Access denied — admins only.</p></div>;
  }

  const handleQuickAction = (user, type) => setPendingAction({ user, type });
  const handleSaveEdits = (userId, updates) => mutation.mutate({ userId, updates });

  const confirmAction = () => {
    if (!pendingAction) return;
    const { user, type } = pendingAction;

    const updates = (() => {
      switch (type) {
        case 'permanent':
          return { access_status: 'active', access_type: 'permanent', purchase_source: 'admin' };
        case 'start_trial':
          return { access_status: 'trial', access_type: 'trial', trial_start_date: todayStr(), trial_end_date: daysFromNow(30) };
        case 'extend': {
          const base = user.trial_end_date && new Date(user.trial_end_date) > new Date()
            ? new Date(user.trial_end_date) : new Date();
          base.setDate(base.getDate() + extendDays);
          return { access_status: 'trial', access_type: 'trial', trial_end_date: base.toISOString().split('T')[0] };
        }
        case 'paid':
          return { access_status: 'active', access_type: 'paid', subscription_status: 'active', purchase_source: 'admin' };
        case 'buildrpro':
          return { access_status: 'active', access_type: 'buildrpro_included', purchase_source: 'buildrpro' };
        case 'app_store':
          return { access_status: 'active', access_type: 'app_store', purchase_source: 'app_store' };
        case 'disable':
          return { access_status: 'disabled' };
        default: return {};
      }
    })();

    mutation.mutate({ userId: user.id, updates });
    setPendingAction(null);
  };

  const actionLabels = {
    permanent:   'Grant permanent access',
    start_trial: 'Start a fresh 30-day trial',
    extend:      `Extend trial by ${extendDays} days`,
    paid:        'Mark as paid / subscription active',
    buildrpro:   'Mark as BuildrPro Included',
    app_store:   'Mark as App Store user',
    disable:     'Disable access',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">User Management</h1>
            <p className="text-sm text-slate-300">
              {currentUser?.org_name || "Your team"} · {users.length} user{users.length !== 1 ? "s" : ""}
            </p>
            {currentUser?.invite_code && (
              <p className="text-xs text-slate-200 mt-1 font-mono">
                Invite code: <span className="font-bold tracking-widest">{currentUser.invite_code}</span>
                <span className="text-slate-400 font-sans ml-2">Crew register with this — they only see their own calculations</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Extend days config */}
      <div className="rounded-xl bg-card border border-border/60 p-3 flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">Extend trial by:</span>
        <Input type="number" min={1} max={365} value={extendDays}
          onChange={e => setExtendDays(Math.max(1, parseInt(e.target.value) || 30))}
          className="w-20 h-8 text-sm" />
        <span className="text-xs text-muted-foreground">days per click</span>
      </div>

      {/* User list */}
      {isLoading
        ? <div className="text-center py-12 text-muted-foreground text-sm">Loading users…</div>
        : <div className="space-y-2">
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                extendDays={extendDays}
                onQuickAction={handleQuickAction}
                onSaveEdits={handleSaveEdits}
              />
            ))}
          </div>
      }

      {/* Confirm dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={open => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{actionLabels[pendingAction?.type]}</strong> for <strong>{pendingAction?.user?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}