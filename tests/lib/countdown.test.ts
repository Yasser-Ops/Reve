import { describe, expect, it } from 'vitest';
import { timeUntil } from '@/lib/countdown';

const target = new Date('2027-06-12T17:00:00.000Z');

describe('timeUntil', () => {
  it('breaks the remaining span into days, hours, minutes, and seconds', () => {
    const now = new Date('2027-06-10T15:30:30.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 29,
      seconds: 30,
      hasPassed: false,
    });
  });

  it('reports all zeroes and hasPassed once the target is reached', () => {
    expect(timeUntil(target, target)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      hasPassed: true,
    });
  });

  it('never returns negative values after the target has passed', () => {
    const now = new Date('2027-06-14T17:00:00.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      hasPassed: true,
    });
  });

  it('handles a span of less than one minute', () => {
    const now = new Date('2027-06-12T16:59:15.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 45,
      hasPassed: false,
    });
  });
});
