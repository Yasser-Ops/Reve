export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  hasPassed: boolean;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Time remaining until `target`, as a pure function of both instants.
 *
 * Kept separate from the component so the arithmetic is testable without
 * fake timers or a DOM.
 */
export function timeUntil(target: Date, now: Date): CountdownParts {
  const remaining = target.getTime() - now.getTime();

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, hasPassed: true };
  }

  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    hasPassed: false,
  };
}
