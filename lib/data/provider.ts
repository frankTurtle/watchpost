import { Monitor, NewMonitor, CheckResult, MonitorWithChecks } from "@/lib/types";

export interface DataProvider {
  listMonitors(): Promise<Monitor[]>;
  listActiveMonitors(): Promise<Monitor[]>;
  getMonitor(id: string): Promise<Monitor | null>;
  createMonitor(input: NewMonitor): Promise<Monitor>;
  deleteMonitor(id: string): Promise<void>;
  setMonitorActive(id: string, active: boolean): Promise<void>;
  recordChecks(results: CheckResult[]): Promise<void>;
  listMonitorsWithChecks(sinceHours: number): Promise<MonitorWithChecks[]>;
}
