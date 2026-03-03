import { auth } from "../firebaseConfig";

export async function postClientError(
  details: Record<string, unknown>
): Promise<{ ok: boolean; status: number }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const u = auth.currentUser;
    if (u && typeof u.getIdToken === "function") {
      const token = await u.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const idem =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    headers["X-Idempotency-Key"] = idem;
    const payload = {
      ...details,
      route:
        typeof window !== "undefined" && window.location
          ? window.location.pathname
          : details.route,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : details.ua,
      ts: typeof details.ts === "number" ? details.ts : Date.now(),
    };
    const baseUrl = (() => {
      const explicit = String(import.meta.env.VITE_FUNCTIONS_URL || "").trim();
      if (explicit) return explicit.replace(/\/+$/, "");
      const useEmulators =
        import.meta.env.DEV &&
        String(import.meta.env.VITE_USE_EMULATORS ?? "false").toLowerCase() ===
          "true";
      if (useEmulators) {
        const projectId = String(
          import.meta.env.VITE_FIREBASE_PROJECT_ID || ""
        );
        const region = String(import.meta.env.VITE_FUNCTIONS_REGION || "us-central1");
        const fnPort = String(
          import.meta.env.VITE_FUNCTIONS_PORT ??
            import.meta.env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT ??
            "5001"
        );
        if (projectId) {
          return `http://127.0.0.1:${fnPort}/${projectId}/${region}`;
        }
      }
      return "/functions";
    })();

    let lastStatus = 0;
    let lastOk = false;
    const attempt = async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      try {
        const resp = await fetch(`${baseUrl}/logClientError`, {
          method: "POST",
          headers,
          referrerPolicy: "no-referrer",
          credentials: "omit",
          cache: "no-store",
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(t);
        lastStatus = resp.status;
        lastOk = resp.ok;
        if (resp.status >= 500 || resp.status === 429)
          throw new Error(String(resp.status));
      } catch {
        clearTimeout(t);
        throw new Error("log-failed");
      }
    };
    try {
      await attempt();
    } catch {
      await attempt();
    }
    return { ok: lastOk, status: lastStatus };
  } catch {
    // Falha silenciosa se não conseguir logar
    return { ok: false, status: 0 };
  }
}
