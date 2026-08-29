import { useEffect, useRef, useState } from "react";

/**
 * Native-style pull-to-refresh hook.
 * @param {() => Promise<void>} onRefresh - async callback to run on refresh
 * @param {{ threshold?: number, resistance?: number }} options
 * @returns {{ pullDistance: number, isRefreshing: boolean, containerRef: React.RefObject }}
 */
export function usePullToRefresh(onRefresh, { threshold = 72, resistance = 2.5 } = {}) {
  const containerRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current || window;

    const getScrollTop = () =>
      containerRef.current ? containerRef.current.scrollTop : window.scrollY;

    const onTouchStart = (e) => {
      if (getScrollTop() !== 0) return;
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    };

    const onTouchMove = (e) => {
      if (!isDragging.current || startY.current === null || isRefreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPullDistance(0); return; }
      // Prevent native scroll while pulling
      if (getScrollTop() === 0 && dy > 0) e.preventDefault();
      setPullDistance(Math.min(dy / resistance, threshold * 1.5));
    };

    const onTouchEnd = async () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        try { await onRefresh(); } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      startY.current = null;
    };

    const target = containerRef.current || window;
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, isRefreshing, threshold, resistance]);

  return { pullDistance, isRefreshing, containerRef };
}