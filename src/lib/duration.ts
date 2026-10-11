/** "YYYY-MM" start month → elapsed time up to `now`, Jenkins style: "8mo", "1y 10mo", "2y". */
export function durationSince(since: string, now: Date): string | null {
  const [y, m] = since.split("-").map(Number);
  if (!y || !m) return null;
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (months < 1) return "<1mo";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}mo`;
  return rest === 0 ? `${years}y` : `${years}y ${rest}mo`;
}
