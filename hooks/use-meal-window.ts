import { useState, useEffect } from 'react';
import { useScheduleStore } from '@/stores/schedule.store';
import type { MealWindow } from '@/types/domain';

interface MealWindowResult {
  activeMealWindow: MealWindow | null;
  nextMealWindow: MealWindow | null;
  minutesUntilNext: number;
}

/** Returns "HH:mm" for a given Date */
function toHHmm(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Converts "HH:mm" to total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function computeMealWindowResult(mealWindows: MealWindow[], now: Date): MealWindowResult {
  const currentDay = now.getDay(); // 0 = Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find active window: current day + current time falls within [startTime, endTime]
  const activeMealWindow =
    mealWindows.find((w) => {
      if (w.dayOfWeek !== currentDay) return false;
      const start = toMinutes(w.startTime);
      const end = toMinutes(w.endTime);
      return currentMinutes >= start && currentMinutes < end;
    }) ?? null;

  // Find next window: upcoming windows today (after current time), then first window tomorrow
  const todayUpcoming = mealWindows
    .filter((w) => w.dayOfWeek === currentDay && toMinutes(w.startTime) > currentMinutes)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const tomorrowDay = (currentDay + 1) % 7;
  const tomorrowWindows = mealWindows
    .filter((w) => w.dayOfWeek === tomorrowDay)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const nextMealWindow = todayUpcoming[0] ?? tomorrowWindows[0] ?? null;

  let minutesUntilNext = 0;
  if (nextMealWindow) {
    const nextStart = toMinutes(nextMealWindow.startTime);
    if (nextMealWindow.dayOfWeek === currentDay) {
      minutesUntilNext = nextStart - currentMinutes;
    } else {
      // Tomorrow: minutes remaining today + minutes into tomorrow
      const minutesLeftToday = 24 * 60 - currentMinutes;
      minutesUntilNext = minutesLeftToday + nextStart;
    }
  }

  return { activeMealWindow, nextMealWindow, minutesUntilNext };
}

export function useMealWindow(): MealWindowResult {
  const mealWindows = useScheduleStore((s) => s.mealWindows);

  const [result, setResult] = useState<MealWindowResult>(() =>
    computeMealWindowResult(mealWindows, new Date())
  );

  useEffect(() => {
    // Recompute immediately when mealWindows change
    setResult(computeMealWindowResult(mealWindows, new Date()));

    // Update every minute
    const interval = setInterval(() => {
      setResult(computeMealWindowResult(mealWindows, new Date()));
    }, 60_000);

    return () => clearInterval(interval);
  }, [mealWindows]);

  return result;
}
