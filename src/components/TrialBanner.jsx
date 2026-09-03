import React from "react";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function TrialBanner({ daysLeft }) {
  if (daysLeft === Infinity || daysLeft < 0) return null;

  const urgent = daysLeft <= 5;
  const warning = daysLeft <= 14;

  return (
    <div className={cn(
      "w-full py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 flex-wrap",
      urgent
        ? "bg-red-600 text-white"
        : warning
        ? "bg-amber-500 text-white"
        : "bg-blue-600 text-white"
    )}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      {daysLeft === 0
        ? "Your trial expires today!"
        : `Free trial: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
      <Link
        to="/purchase"
        className="rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-0.5 font-bold transition-colors"
      >
        Purchase now
      </Link>
    </div>
  );
}