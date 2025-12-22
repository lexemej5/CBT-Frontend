export function formatMinutesToMinSec(minutesFloat) {
  const totalSeconds = Math.round(Number(minutesFloat) * 60) || 0;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins} min ${secs} sec${secs !== 1 ? 's' : ''}`;
}
