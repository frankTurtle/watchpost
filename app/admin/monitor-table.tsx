"use client";

import { Monitor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MonitorTableProps {
  initialMonitors: Monitor[];
}

export function MonitorTable({ initialMonitors }: MonitorTableProps) {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string, active: boolean) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      if (!res.ok) {
        alert("Failed to update monitor");
        return;
      }

      setMonitors((prev) =>
        prev.map((m) => (m.id === id ? { ...m, active: !active } : m))
      );
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete monitor "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: "DELETE" });

      if (!res.ok) {
        alert("Failed to delete monitor");
        return;
      }

      setMonitors((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Monitors</h2>
        {monitors.length === 0 ? (
          <p className="text-base-content/60">No monitors yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Method</th>
                  <th>Interval</th>
                  <th>Active</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((monitor) => (
                  <tr key={monitor.id}>
                    <td>
                      <div>
                        <div className="font-semibold">{monitor.name}</div>
                        <div className="text-sm text-base-content/60 truncate max-w-xs">
                          {monitor.url}
                        </div>
                      </div>
                    </td>
                    <td>{monitor.method}</td>
                    <td>{monitor.interval_minutes} min</td>
                    <td>
                      <input
                        type="checkbox"
                        className="toggle toggle-sm"
                        checked={monitor.active}
                        onChange={() =>
                          handleToggleActive(monitor.id, monitor.active)
                        }
                        disabled={loading === monitor.id}
                      />
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          handleDelete(monitor.id, monitor.name)
                        }
                        disabled={loading === monitor.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
