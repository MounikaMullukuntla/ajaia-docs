"use client";

// "5 minutes ago" style timestamps, formatted in the viewer's browser so the
// time zone is theirs (the server may run in UTC). The full date shows on hover.
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelative(date: Date, now = new Date()) {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export default function RelativeTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={date.toLocaleString()} suppressHydrationWarning>
      {formatRelative(date)}
    </time>
  );
}
