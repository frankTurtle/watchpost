const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchMonitors() {
  const url = `${SUPABASE_URL}/rest/v1/monitors?active=eq.true&select=id,url,method`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch monitors: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function checkMonitor(monitor) {
  const startTime = performance.now();
  const checked_at = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(monitor.url, {
      method: monitor.method || "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "watchpost-checker/1.0",
      },
    });

    clearTimeout(timeoutId);

    const latency_ms = Math.round(performance.now() - startTime);

    return {
      monitor_id: monitor.id,
      checked_at,
      ok: response.ok,
      status_code: response.status,
      latency_ms,
      error: null,
    };
  } catch (error) {
    const latency_ms = Math.round(performance.now() - startTime);
    const errorMessage = String(error.message || error).slice(0, 500);

    return {
      monitor_id: monitor.id,
      checked_at,
      ok: false,
      status_code: null,
      latency_ms,
      error: errorMessage,
    };
  }
}

async function writeChecks(checks) {
  if (checks.length === 0) {
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/checks`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(checks),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to write checks: ${response.status} ${response.statusText}`
    );
  }
}

export const handler = async () => {
  const monitors = await fetchMonitors();

  if (monitors.length === 0) {
    console.log("0 monitors found");
    return { statusCode: 200, body: "0 monitors found" };
  }

  const results = await Promise.allSettled(
    monitors.map((monitor) => checkMonitor(monitor))
  );

  const checks = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const up = checks.filter((c) => c.ok).length;
  const down = checks.length - up;

  await writeChecks(checks);

  const summary = `${monitors.length} monitors, ${up} up, ${down} down`;
  console.log(summary);

  return { statusCode: 200, body: summary };
};
