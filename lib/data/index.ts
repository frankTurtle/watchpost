import { DataProvider } from "./provider";
import { createSupabaseProvider } from "./supabase";
import { createDemoProvider } from "./demo";

let demoModeLogged = false;
let cachedProvider: DataProvider | null = null;
let isDemo: boolean | null = null;

export function getDataProvider(): DataProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (hasSupabaseUrl && hasServiceRoleKey) {
    isDemo = false;
    cachedProvider = createSupabaseProvider();
  } else {
    isDemo = true;
    if (!demoModeLogged) {
      console.log(
        "watchpost: no supabase credentials found, running in demo mode with in-memory data"
      );
      demoModeLogged = true;
    }
    cachedProvider = createDemoProvider();
  }

  return cachedProvider;
}

export function isDemoMode(): boolean {
  if (isDemo === null) {
    getDataProvider(); // Ensure provider is initialized
  }
  return isDemo ?? false;
}
