import { BucketStatus } from "@/lib/status";

interface UptimeBarProps {
  buckets: BucketStatus[];
}

export function UptimeBar({ buckets }: UptimeBarProps) {
  // Get start time (48 buckets of 30 minutes = 24 hours ago)
  const now = new Date();
  const startTime = new Date(now.getTime() - 48 * 30 * 60 * 1000);

  const getBgColor = (status: BucketStatus): string => {
    switch (status) {
      case "up":
        return "bg-success";
      case "down":
        return "bg-error";
      case "degraded":
        return "bg-warning";
      case "empty":
        return "bg-base-300";
    }
  };

  const getTooltip = (status: BucketStatus, index: number): string => {
    const bucketTime = new Date(
      startTime.getTime() + index * 30 * 60 * 1000
    );
    const hh = String(bucketTime.getHours()).padStart(2, "0");
    const mm = String(bucketTime.getMinutes()).padStart(2, "0");

    if (status === "empty") {
      return `${hh}:${mm} — no data`;
    }
    return `${hh}:${mm} — ${status}`;
  };

  return (
    <div className="flex gap-1 h-8">
      {buckets.map((bucket, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${getBgColor(bucket)} cursor-help`}
          title={getTooltip(bucket, i)}
        />
      ))}
    </div>
  );
}
