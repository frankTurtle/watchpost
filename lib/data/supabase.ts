import { createClient } from "@supabase/supabase-js";
import { DataProvider } from "./provider";
import { Monitor, Check, NewMonitor, CheckResult, MonitorWithChecks } from "@/lib/types";

export function createSupabaseProvider(): DataProvider {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return {
    async listMonitors(): Promise<Monitor[]> {
      const { data, error } = await client
        .from("monitors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Failed to list monitors: ${error.message}`);
      return data || [];
    },

    async listActiveMonitors(): Promise<Monitor[]> {
      const { data, error } = await client
        .from("monitors")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Failed to list active monitors: ${error.message}`);
      return data || [];
    },

    async getMonitor(id: string): Promise<Monitor | null> {
      const { data, error } = await client
        .from("monitors")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Failed to get monitor: ${error.message}`);
      }
      return data || null;
    },

    async createMonitor(input: NewMonitor): Promise<Monitor> {
      const { data, error } = await client
        .from("monitors")
        .insert(input)
        .select()
        .single();

      if (error) throw new Error(`Failed to create monitor: ${error.message}`);
      return data;
    },

    async deleteMonitor(id: string): Promise<void> {
      const { error } = await client.from("monitors").delete().eq("id", id);

      if (error) throw new Error(`Failed to delete monitor: ${error.message}`);
    },

    async setMonitorActive(id: string, active: boolean): Promise<void> {
      const { error } = await client
        .from("monitors")
        .update({ active })
        .eq("id", id);

      if (error) throw new Error(`Failed to update monitor: ${error.message}`);
    },

    async recordChecks(results: CheckResult[]): Promise<void> {
      if (results.length === 0) return;

      const { error } = await client.from("checks").insert(results);

      if (error) throw new Error(`Failed to record checks: ${error.message}`);
    },

    async listMonitorsWithChecks(sinceHours: number): Promise<MonitorWithChecks[]> {
      const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

      const { data: monitors, error: monitorsError } = await client
        .from("monitors")
        .select("*")
        .order("created_at", { ascending: false });

      if (monitorsError) {
        throw new Error(`Failed to fetch monitors: ${monitorsError.message}`);
      }

      const { data: checks, error: checksError } = await client
        .from("checks")
        .select("*")
        .gte("checked_at", sinceIso)
        .order("checked_at", { ascending: true });

      if (checksError) {
        throw new Error(`Failed to fetch checks: ${checksError.message}`);
      }

      // Group checks by monitor_id
      const checksByMonitor = new Map<string, Check[]>();
      (checks || []).forEach((check) => {
        const list = checksByMonitor.get(check.monitor_id) || [];
        list.push(check);
        checksByMonitor.set(check.monitor_id, list);
      });

      // Build result with checks ordered oldest→newest per monitor
      return (monitors || []).map((monitor) => ({
        ...monitor,
        checks: checksByMonitor.get(monitor.id) || [],
      }));
    },
  };
}
