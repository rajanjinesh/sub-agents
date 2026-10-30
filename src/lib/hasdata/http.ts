const BASE_URL = "https://api.hasdata.com";
const TIMEOUT_MS = 15_000;

/** GET a HasData endpoint with x-api-key. Server-side only. Throws clear errors. */
export async function hasdataGet(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.HASDATA_API_KEY;
  if (!key) throw new Error("HASDATA_API_KEY is not set");

  const url = `${BASE_URL}${path}?${new URLSearchParams(params).toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(`HasData request timed out after ${TIMEOUT_MS / 1000}s (${path})`);
    }
    throw new Error(`HasData request failed (${path}): ${err instanceof Error ? err.message : String(err)}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(`HasData rejected the API key (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`HasData returned HTTP ${res.status} (${path}): ${body}`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error(`HasData returned invalid JSON (${path})`);
  }
}
