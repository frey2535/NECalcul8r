import React, { useState, useRef, useCallback, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Calculator, BookOpen, UserCircle, Users, Calendar, ShieldCheck, FileCheck, Sun, Moon, FolderOpen, Flag, Lock, RefreshCw, SlidersHorizontal, Bot, DollarSign, X } from "lucide-react";
import TrialBanner from "@/components/TrialBanner";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import AppLogo from "@/components/branding/AppLogo";
import { refreshApp } from "@/lib/pwa";
import { countUnreadPlatformNotifications } from "@/api/platformNotifications";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Profile from "@/pages/Profile";
import NecAccuracyChat from "@/components/NecAccuracyChat";
import { useNECYear } from "@/context/NECYearContext";
import { useTheme } from "@/context/ThemeContext";
import { getResolvedEntitlement, canUseNecAccuracyAssistant } from "@/lib/pricing";
import { isGooglePlayBillingPluginMissing, openPlayStoreListing } from "@/lib/googlePlayBilling";
import { OPEN_ASSISTANT_EVENT } from "@/lib/assistantPanel";
import { useIsMobile } from "@/hooks/use-mobile";

// Each tab remembers its last visited path independently
const TABS = [
  { key: "calculators", path: "/", label: "Calculators", icon: Calculator },
  { key: "projects", path: "/projects", label: "Projects", icon: FolderOpen },
  { key: "tables", path: "/nec-tables", label: "NEC Tables", icon: BookOpen },
];

export default function AppLayout({ trialStatus }) {
  const { user } = useAuth();
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const canManageUsers = isPlatformAdmin || user?.org_role === 'owner';
  const entitlement = getResolvedEntitlement(user);
  const canUseAssistant = canUseNecAccuracyAssistant(user);
  const { year, setYear, years } = useNECYear();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profileOpen, setProfileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [unreadScanCount, setUnreadScanCount] = useState(0);
  const [refreshingApp, setRefreshingApp] = useState(false);
  // Store saved scroll positions per tab key
  const scrollPositions = useRef({ calculators: 0, tables: 0, projects: 0 });

  const openAssistant = useCallback(() => {
    setProfileOpen(false);
    setAssistantOpen(true);
  }, []);

  const toggleAssistant = useCallback(() => {
    setAssistantOpen((open) => {
      if (!open) setProfileOpen(false);
      return !open;
    });
  }, []);

  const getActiveTabKey = useCallback(() => {
    if (location.pathname === "/" || location.pathname.startsWith("/calculator")) return "calculators";
    if (location.pathname === "/nec-tables") return "tables";
    if (location.pathname.startsWith("/projects")) return "projects";
    return null;
  }, [location.pathname]);

  const handleTabPress = (tab) => {
    // Save current scroll before switching
    const currentKey = getActiveTabKey();
    if (currentKey) scrollPositions.current[currentKey] = window.scrollY;
    navigate(tab.path);
    // Restore scroll position after navigation paint
    const saved = scrollPositions.current[tab.key] || 0;
    requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "instant" }));
  };

  const isTabActive = (tab) => getActiveTabKey() === tab.key;

  const handleRefreshApp = async () => {
    if (refreshingApp) return;
    setRefreshingApp(true);
    try {
      await refreshApp(window.__necalcul8rPendingUpdate?.targetSha);
    } catch {
      setRefreshingApp(false);
    }
  };

  const refreshOpenReportCount = useCallback(async () => {
    if (!isPlatformAdmin) {
      setOpenReportCount(0);
      return;
    }
    try {
      const reports = await base44.entities.DiscrepancyReport.list("-created_date", 500);
      setOpenReportCount(reports.filter((report) => (report.status || "open") === "open").length);
    } catch {
      setOpenReportCount(0);
    }
  }, [isPlatformAdmin]);

  const refreshUnreadScanCount = useCallback(async () => {
    if (!isPlatformAdmin) {
      setUnreadScanCount(0);
      return;
    }
    try {
      setUnreadScanCount(await countUnreadPlatformNotifications());
    } catch {
      setUnreadScanCount(0);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    refreshOpenReportCount();
    refreshUnreadScanCount();
  }, [location.pathname, refreshOpenReportCount, refreshUnreadScanCount]);

  useEffect(() => {
    if (!isPlatformAdmin) return undefined;
    window.addEventListener("focus", refreshOpenReportCount);
    window.addEventListener("necalcul8r-reports-updated", refreshOpenReportCount);
    window.addEventListener("focus", refreshUnreadScanCount);
    const interval = window.setInterval(() => {
      refreshOpenReportCount();
      refreshUnreadScanCount();
    }, 60 * 1000);
    return () => {
      window.removeEventListener("focus", refreshOpenReportCount);
      window.removeEventListener("necalcul8r-reports-updated", refreshOpenReportCount);
      window.removeEventListener("focus", refreshUnreadScanCount);
      window.clearInterval(interval);
    };
  }, [isPlatformAdmin, refreshOpenReportCount, refreshUnreadScanCount]);

  useEffect(() => {
    const onOpenAssistant = () => openAssistant();
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpenAssistant);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpenAssistant);
  }, [openAssistant]);

  const reportBadge = openReportCount > 0
    ? (
      <span className="min-w-4 h-4 rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white font-extrabold text-center shadow-sm">
        {openReportCount > 99 ? "99+" : openReportCount}
      </span>
    )
    : null;

  const scanBadge = unreadScanCount > 0
    ? (
      <span className="min-w-4 h-4 rounded-full bg-amber-500 px-1 text-[9px] leading-4 text-white font-extrabold text-center shadow-sm">
        {unreadScanCount > 99 ? "99+" : unreadScanCount}
      </span>
    )
    : null;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Trial banner */}
      {trialStatus?.status === 'trial' && <TrialBanner daysLeft={trialStatus.daysLeft} />}
      {isGooglePlayBillingPluginMissing() && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-semibold flex items-center justify-between gap-3">
          <span>A Play Store update is required before purchases work. Do not uninstall.</span>
          <button
            type="button"
            onClick={openPlayStoreListing}
            className="shrink-0 rounded-lg bg-amber-950 text-amber-50 px-3 py-1.5 text-xs font-extrabold"
          >
            Update
          </button>
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2.5">
              <AppLogo className="w-8 h-8 rounded-xl" />
              <div>
                <h1 className="text-sm font-bold tracking-tight leading-none text-foreground">NECalcul8r</h1>
                <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">Electrical Tools</p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* Desktop Nav */}
              <nav className="hidden sm:flex items-center gap-1">
                {TABS.map((tab) => {
                  const active = isTabActive(tab);
                  const Icon = tab.icon;
                  const locked = tab.key === "tables" && !entitlement.hasNecTables;
                  return (
                    <Link key={tab.key} to={tab.path}>
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {locked && <Lock className="w-3 h-3 text-amber-500" />}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Accuracy assistant — opens as a side panel so current screen stays visible */}
              {(canUseAssistant || isPlatformAdmin) && (
                <button
                  type="button"
                  onClick={toggleAssistant}
                  aria-pressed={assistantOpen}
                  aria-label={assistantOpen ? "Close assistant panel" : "Open assistant panel"}
                >
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    assistantOpen
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>
                    <Bot className="w-3.5 h-3.5" />
                    Assistant
                    {isPlatformAdmin ? scanBadge : null}
                  </div>
                </button>
              )}

              {/* Admin links — desktop only */}
              {(canManageUsers || isPlatformAdmin) && (
                <>
                  {canManageUsers && (
                  <Link to="/admin/users">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      <Users className="w-3.5 h-3.5" />
                      Users
                    </div>
                  </Link>
                  )}
                  {isPlatformAdmin && (
                    <>
                  <Link to="/admin/calculator-tiers">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      location.pathname === "/admin/calculator-tiers"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Tiers
                    </div>
                  </Link>
                  <Link to="/admin/revenue">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      location.pathname === "/admin/revenue"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                      <DollarSign className="w-3.5 h-3.5" />
                      Revenue
                    </div>
                  </Link>
                  <Link to="/admin/codebook">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      location.pathname === "/admin/codebook"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Codebook
                    </div>
                  </Link>
                  <Link to="/admin/verification">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      location.pathname === "/admin/verification"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                      <FileCheck className="w-3.5 h-3.5" />
                      Verify
                    </div>
                  </Link>
                  <Link to="/admin/reports">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      location.pathname === "/admin/reports"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                      <Flag className="w-3.5 h-3.5" />
                      Reports
                      {reportBadge}
                    </div>
                  </Link>
                    </>
                  )}
                </>
              )}

              {/* NEC Year Selector — visible on all screen sizes so the active
                  code year can always be changed and confirmed, mobile included */}
              <div className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-2 mr-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="bg-card text-xs font-semibold text-muted-foreground border border-input rounded-md outline-none cursor-pointer appearance-none py-1 px-2"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  {years.map(y => (
                    <option key={y} value={y} style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>NEC {y}</option>
                  ))}
                </select>
              </div>

              {/* Refresh / install updates */}
              <button
                type="button"
                onClick={handleRefreshApp}
                disabled={refreshingApp}
                className="ml-1 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 active:bg-muted/60 disabled:opacity-60 flex items-center justify-center transition-colors"
                aria-label="Refresh app and install updates"
                title="Refresh app, clear errors, and install pending updates"
              >
                <RefreshCw className={cn("w-4 h-4 text-foreground", refreshingApp && "animate-spin")} />
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="ml-1 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 active:bg-muted/60 flex items-center justify-center transition-colors"
                aria-label="Toggle dark mode"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
              </button>

              {/* Profile button — always visible */}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="ml-1 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 active:bg-muted/60 flex items-center justify-center transition-colors"
                aria-label="Profile"
              >
                <UserCircle className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content + optional docked assistant panel (desktop/tablet) */}
      <div className="flex flex-1 min-h-0 w-full">
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 pb-24 sm:pb-8 min-w-0">
          <Outlet />
        </main>

        {assistantOpen && !isMobile && (
          <aside
            className="hidden md:flex w-[min(28rem,42vw)] shrink-0 flex-col border-l border-border/60 bg-background"
            style={{
              height: "calc(100dvh - 3.5rem - env(safe-area-inset-top, 0px))",
              position: "sticky",
              top: "calc(3.5rem + env(safe-area-inset-top, 0px))",
            }}
            aria-label="Assistant side panel"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 shrink-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">In-app chat</p>
                <h2 className="text-sm font-bold text-foreground">Assistant</h2>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close assistant panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden px-3 py-3">
              <NecAccuracyChat
                compact
                allowed={canUseAssistant || isPlatformAdmin}
                disabledReason="Discuss product and NEC accuracy in chat inside the app — included with paid upgrades."
              />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around py-1.5 px-2">
          {(canManageUsers || isPlatformAdmin) && (
            <>
              {canManageUsers && (
                <Link to="/admin/users" className="flex-1">
                  <div className={cn(
                    "flex flex-col items-center gap-1 py-1.5 rounded-xl mx-1 transition-all",
                    location.pathname === "/admin/users" ? "text-blue-600" : "text-muted-foreground"
                  )}>
                    <div className={cn("w-10 h-6 rounded-full flex items-center justify-center transition-all", location.pathname === "/admin/users" ? "bg-blue-100" : "")}>
                      <Users className="w-5 h-5" />
                    </div>
                    <span className={cn("text-[10px] font-semibold", location.pathname === "/admin/users" ? "text-blue-600" : "text-muted-foreground")}>Users</span>
                  </div>
                </Link>
              )}
              {isPlatformAdmin && (
                <Link to="/admin/reports" className="flex-1">
                  <div className={cn(
                    "flex flex-col items-center gap-1 py-1.5 rounded-xl mx-1 transition-all",
                    location.pathname === "/admin/reports" ? "text-blue-600" : "text-muted-foreground"
                  )}>
                    <div className={cn("relative w-10 h-6 rounded-full flex items-center justify-center transition-all", location.pathname === "/admin/reports" ? "bg-blue-100" : "")}>
                      <Flag className="w-5 h-5" />
                      {openReportCount > 0 && (
                        <span className="absolute -top-1 -right-0.5 min-w-4 h-4 rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white font-extrabold text-center shadow-sm">
                          {openReportCount > 99 ? "99+" : openReportCount}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-semibold", location.pathname === "/admin/reports" ? "text-blue-600" : "text-muted-foreground")}>Reports</span>
                  </div>
                </Link>
              )}
            </>
          )}
          {TABS.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            const locked = tab.key === "tables" && !entitlement.hasNecTables;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabPress(tab)}
                className="flex-1"
              >
                <div className={cn(
                  "flex flex-col items-center gap-1 py-1.5 rounded-xl mx-1 transition-all",
                  active ? "text-blue-600" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "relative w-10 h-6 rounded-full flex items-center justify-center transition-all",
                    active ? "bg-blue-100" : ""
                  )}>
                    <Icon className={cn("w-5 h-5 transition-all", active && "scale-110")} />
                    {locked && <Lock className="absolute mt-3 ml-5 w-3 h-3 text-amber-500" />}
                  </div>
                  <span className={cn("text-[10px] font-semibold", active ? "text-blue-600" : "text-muted-foreground")}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile Drawer */}
      <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
        <DrawerContent>
          <DrawerHeader className="relative pr-12">
            <DrawerTitle className="text-base font-bold">My Profile</DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close profile"
                onClick={(event) => event.stopPropagation()}
              >
                <X className="h-4 w-4" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto max-h-[80vh]">
            <Profile />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile assistant sheet — keeps the current route mounted underneath */}
      {isMobile && (
        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetContent
            side="right"
            className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-md"
          >
            <SheetHeader className="shrink-0 border-b border-border/60 px-4 py-3 pr-14 text-left">
              <SheetTitle className="text-base font-bold">Assistant</SheetTitle>
              <SheetDescription className="text-xs">
                Chat without leaving this screen.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
              <NecAccuracyChat
                compact
                allowed={canUseAssistant || isPlatformAdmin}
                disabledReason="Discuss product and NEC accuracy in chat inside the app — included with paid upgrades."
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}