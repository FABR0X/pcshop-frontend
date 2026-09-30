/**
 * The single localStorage read/write boundary for the app.
 *
 * Two rules keep this from becoming a mess:
 *  1. One versioned key. A schema change bumps STORAGE_VERSION and old payloads
 *     are discarded rather than migrated, because a stale session is worth
 *     nothing to the user.
 *  2. One place that touches localStorage. Nothing else in the app calls
 *     localStorage directly, so quota errors and private-mode failures have a
 *     single place to be handled.
 */

const STORAGE_KEY = "pcshop.session";
const STORAGE_VERSION = 1;

const EMPTY = Object.freeze({ v: STORAGE_VERSION, token: null, user: null });

/**
 * Reads the persisted session. Returns EMPTY for missing, unparseable or
 * version-mismatched data — and cleans up the mismatched copy on the way out.
 */
export function readSession() {
    let raw;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        // Private browsing or a blocked storage partition. Run without a
        // persisted session rather than crashing on boot.
        return EMPTY;
    }

    if (!raw) return EMPTY;

    try {
        const parsed = JSON.parse(raw);
        if (parsed?.v !== STORAGE_VERSION || typeof parsed.token !== "string") {
            window.localStorage.removeItem(STORAGE_KEY);
            return EMPTY;
        }
        return { v: STORAGE_VERSION, token: parsed.token, user: parsed.user ?? null };
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return EMPTY;
    }
}

/** Persists the token plus the minimum user detail the UI needs to render. */
export function writeSession(token, user) {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                v: STORAGE_VERSION,
                token,
                user: user ? { handle: user.handle, displayName: user.displayName } : null,
            })
        );
    } catch {
        // Out of quota or storage disabled: the session still works for this
        // tab, it just will not survive a reload.
    }
}

export function clearSession() {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to do; the in-memory store is cleared by the caller anyway.
    }
}
