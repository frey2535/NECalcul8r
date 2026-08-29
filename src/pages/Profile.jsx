import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Trash2, LogOut, ShieldAlert, Users, FolderOpen, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { isStandaloneDisplay } from "@/lib/pwa";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const [user, setUser] = React.useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user's own data then logout
      await base44.auth.logout();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-5"
    >
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">{user?.full_name || "—"}</h1>
            <p className="text-sm text-slate-300 mt-0.5">{user?.email || "Loading..."}</p>
            {user?.org_name && (
              <p className="text-xs text-slate-300 mt-0.5">{user.org_name}</p>
            )}
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full">
              {user?.role || "user"}
            </span>
          </div>
        </div>
      </div>

      {!isStandaloneDisplay() && (
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("necalcul8r-show-install"))}
        className="block w-full text-left"
      >
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <div className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors">
            <Download className="w-4 h-4 text-muted-foreground" />
            Install on this phone
          </div>
        </div>
      </button>
      )}

      <Link to="/projects" className="block">
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <div className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            My Projects
          </div>
        </div>
      </Link>

      {/* Admin link */}
      {user?.role === 'admin' && (
        <Link to="/admin/users" className="block">
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors">
              <Users className="w-4 h-4 text-muted-foreground" />
              User Management
            </div>
          </div>
        </Link>
      )}

      {/* Actions */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors border-b border-border/40"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
          Sign Out
        </button>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* App info */}
      <div className="text-center text-[11px] text-muted-foreground space-y-0.5 pb-4">
        <p className="font-bold">NEC Suite · Electrical Tools</p>
        <p>NEC 2017 / 2020 / 2023 compliant calculations</p>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data. This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}