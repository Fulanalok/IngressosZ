import { auth } from "../firebaseConfig";
export async function postClientError(details) {
    try {
        const headers = {
            "Content-Type": "application/json",
        };
        const u = auth.currentUser;
        if (u && typeof u.getIdToken === "function") {
            const token = await u.getIdToken();
            if (token)
                headers.Authorization = `Bearer ${token}`;
        }
        const idem = typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        headers["X-Idempotency-Key"] = idem;
        const payload = {
            ...details,
            route: typeof window !== "undefined" && window.location
                ? window.location.pathname
                : details.route,
            ua: typeof navigator !== "undefined" ? navigator.userAgent : details.ua,
            ts: typeof details.ts === "number" ? details.ts : Date.now(),
        };
        const attempt = async () => {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 2000);
            try {
                const resp = await fetch("/functions/logClientError", {
                    method: "POST",
                    headers,
                    referrerPolicy: "no-referrer",
                    credentials: "omit",
                    cache: "no-store",
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                clearTimeout(t);
                if (resp.status >= 500 || resp.status === 429)
                    throw new Error(String(resp.status));
            }
            catch {
                clearTimeout(t);
                throw new Error("log-failed");
            }
        };
        try {
            await attempt();
        }
        catch {
            await attempt();
        }
    }
    catch {
        // Falha silenciosa se não conseguir logar
    }
}
