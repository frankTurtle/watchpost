"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddMonitorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "GET",
    interval_minutes: "5",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          method: formData.method,
          interval_minutes: parseInt(formData.interval_minutes, 10),
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || "Failed to create monitor");
        return;
      }

      setFormData({
        name: "",
        url: "",
        method: "GET",
        interval_minutes: "5",
      });
      router.refresh();
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title">Add Monitor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={loading}>
            <div>
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., API Server"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">URL</span>
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://example.com"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Method</span>
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Interval (minutes)</span>
              </label>
              <input
                type="number"
                name="interval_minutes"
                value={formData.interval_minutes}
                onChange={handleChange}
                min="1"
                max="1440"
                className="input input-bordered w-full"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? "Creating..." : "Create Monitor"}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
