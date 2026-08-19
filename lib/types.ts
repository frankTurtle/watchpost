export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  interval_minutes: number;
  active: boolean;
  created_at: string;
}

export interface Check {
  id: number;
  monitor_id: string;
  checked_at: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
}

export type NewMonitor = Pick<Monitor, "name" | "url" | "method" | "interval_minutes">;

export interface CheckResult {
  monitor_id: string;
  checked_at: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
}

export interface MonitorWithChecks extends Monitor {
  checks: Check[];
}
