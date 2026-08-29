import React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 72 }) {
  const progress = Math.min(pullDistance / threshold, 1);
  const visible = pullDistance > 4 || isRefreshing;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none"
      style={{ height: isRefreshing ? threshold : pullDistance, opacity: visible ? 1 : 0 }}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full bg-white shadow-md border border-border/60 flex items-center justify-center",
          isRefreshing && "animate-spin"
        )}
        style={{ transform: `rotate(${progress * 360}deg)`, transition: isRefreshing ? "none" : "transform 0.05s linear" }}
      >
        <RefreshCw className="w-4 h-4 text-blue-600" />
      </div>
    </div>
  );
}