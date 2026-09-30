import { jwtDecode } from "jwt-decode";

/**
 * Client-side JWT helpers built on jwt-decode.
 *
 * IMPORTANT: decoding is presentation only. It reads a token to show the user
 * who they are and when the session lapses. It is not verification — only the
 * backend's jwt.verify call authorises anything, and it is the only check that
 * matters. A tampered token still gets rejected server-side.
 */

/** Milliseconds since the epoch, or null when there is no usable token. */
function expiryOf(token) {
    if (!token) return null;
    try {
        const { exp } = jwtDecode(token);
        return typeof exp === "number" ? exp * 1000 : null;
    } catch {
        return null;
    }
}

/** True when the token is absent, unparseable, or past its `exp`. */
export function isExpired(token) {
    const exp = expiryOf(token);
    return exp === null || exp <= Date.now();
}

/** The claims worth showing in the UI, or null if the token cannot be read. */
export function readClaims(token) {
    if (!token) return null;
    try {
        const claims = jwtDecode(token);
        return {
            subject: claims.sub ?? null,
            displayName: claims.displayName ?? null,
            issuer: claims.iss ?? null,
            audience: claims.aud ?? null,
            issuedAt: typeof claims.iat === "number" ? claims.iat * 1000 : null,
            expiresAt: typeof claims.exp === "number" ? claims.exp * 1000 : null,
        };
    } catch {
        return null;
    }
}

/**
 * "1 h 04 min" style countdown, for the session panel.
 *
 * `now` is passed in rather than read from the clock, so the caller controls
 * when the value changes and this stays a pure function of its arguments.
 */
export function formatRemaining(expiresAt, now = Date.now()) {
    if (!expiresAt) return "unknown";
    const ms = expiresAt - now;
    if (ms <= 0) return "expired";

    const totalMinutes = Math.floor(ms / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")} min` : `${minutes} min`;
}

export function formatTimestamp(ms) {
    if (!ms) return "—";
    return new Date(ms).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
