"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunChecksButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    up: number;
    down: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunChecks = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch("/api/checks/run", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.ok) {
        setSummary({
          total: data.total,
          up: data.up,
          down: data.down,
        });
        router.refresh();
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleRunChecks}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading && <span className="loading loading-spinner"></span>}
        Run checks now
      </button>

      {summary && (
        <div className="text-sm">
          {summary.total} checked — {summary.up} up, {summary.down} down
        </div>
      )}

      {error && (
        <div className="text-sm text-error">
          Error: {error}
        </div>
      )}
    </div>
  );
}
