export type HistoricalPhase = 'morning' | 'day' | 'sunset' | 'night';

export function phaseForHour(hour: number): HistoricalPhase {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  return 'night';
}
