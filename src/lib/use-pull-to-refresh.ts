// ============================================================================
// usePullToRefresh — lightweight, dependency-free pull-to-refresh for the
// window scroll container. Activates only when scrolled to the very top and
// the gesture is a deliberate downward pull. Returns the live pull distance and
// a refreshing flag so callers can render a native-feeling indicator.
// ============================================================================
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72; // px pulled before a refresh fires
const MAX = 110; // clamp for the indicator travel

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        setDistance(0);
        return;
      }
      // Resistance curve so the pull feels elastic.
      const d = Math.min(MAX, dy * 0.5);
      setDistance(d);
    };
    const onEnd = async () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (distance >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        setDistance(THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [distance, onRefresh]);

  return { distance, refreshing, threshold: THRESHOLD };
}
