import { useEffect, useState, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // distance to pull before refresh triggers (px)
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollElement = document.documentElement;
      isAtTop = scrollElement.scrollTop === 0;
      if (isAtTop) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      pullDistance.current = Math.max(0, currentY - touchStartY.current);

      // Cap the pull distance at threshold * 1.5 for visual feedback
      const cappedDistance = Math.min(pullDistance.current, threshold * 1.5);

      // Update visual feedback
      if (container.style) {
        container.style.transform = `translateY(${cappedDistance * 0.5}px)`;
        container.style.transition = 'none';
      }
    };

    const handleTouchEnd = async () => {
      if (!isAtTop || isRefreshing) return;

      if (pullDistance.current >= threshold) {
        setIsRefreshing(true);
        if (container.style) {
          container.style.transform = `translateY(${threshold * 0.5}px)`;
          container.style.transition = 'transform 0.3s ease';
        }

        try {
          await onRefresh();
        } finally {
          if (container.style) {
            container.style.transform = 'translateY(0)';
            container.style.transition = 'transform 0.3s ease';
          }
          setIsRefreshing(false);
          pullDistance.current = 0;
        }
      } else {
        // Reset animation
        if (container.style) {
          container.style.transform = 'translateY(0)';
          container.style.transition = 'transform 0.3s ease';
        }
        pullDistance.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, false);
    container.addEventListener('touchmove', handleTouchMove, { passive: true } as any);
    container.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, threshold]);

  return {
    containerRef,
    isRefreshing,
    pullDistance: pullDistance.current,
  };
};
