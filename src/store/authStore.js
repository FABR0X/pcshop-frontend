import { create } from "zustand";
import { api, bindTokenSource, bindUnauthorizedHandler, describeError } from "../api/client";
import { readSession, writeSession, clearSession } from "../lib/storage";
import { isExpired } from "../lib/jwt";

/**
 * The single owner of authentication state.
 *
 * Nothing else in the app reads or writes the token, reads localStorage, or
 * decides what a 401 means. The HTTP client asks this module for the token and
 * reports fatal 401s back through `bindUnauthorizedHandler`. That is the whole
 * point of the wiring below: the interceptor has no opinion about sessions.
 */

/**
 * Why a session ended, so the login screen can say something more useful than
 * "please sign in".
 *
 * "expired"  — the token ran out (TOKEN_EXPIRED from the API, or a local
 *              expiry check that caught it before a request went out)
 * "invalid"  — the server refused the token for any other reason
 * "signedout" — the user asked to leave
 */
export const useAuthStore = create((set, get) => ({
    /**
     * "loading"    — boot check in flight, render the splash
     * "authenticated" — a verified token is in hand
     * "anonymous"  — no usable token, show the login screen
     */
    status: "loading",
    token: null,
    user: null,

    /**
     * Set when a session ends, cleared when the user next acts on the login
     * screen. `null` means "the user just arrived here", which is not the same
     * as "they were thrown out", and the two deserve different copy.
     */
    sessionEndedReason: null,

    /**

     * Runs once per app load. If a token was persisted, ask the server whether
     * it is still good: a token that outlived its expiry, or one signed with a
     * rotated secret, must not survive a reload just because it is in storage.
     */
    async bootstrap() {
        const { token, user } = readSession();

        if (!token) {
            set({ status: "anonymous", token: null, user: null });
            return;
        }

        // A token already past its `exp` is a known-dead session, so say so
        // without spending a round trip on a request that can only 401. This is
        // the same check the route guard runs, applied before the first paint.
        if (isExpired(token)) {
            clearSession();
            set({
                status: "anonymous",
                token: null,
                user: null,
                sessionEndedReason: "expired",
            });
            return;
        }

        // Optimistically show the cached user so the first paint is not a blank
        // screen, but keep status "loading" so protected routes stay gated.
        set({ status: "loading", token, user });

        try {
            const { data } = await api.get("/auth/me");
            set({ status: "authenticated", token, user: data.user });
            writeSession(token, data.user);
        } catch (error) {
            // The response interceptor has normally already run `invalidate`
            // with the API code, which is where the reason comes from. Calling
            // it again is a no-op thanks to its status guard, so this is only
            // the safety net for a network failure that never produced a
            // response.
            get().invalidate(error?.response?.data?.code);
        }
    },

    /**
     * Exchanges credentials for a JWT. Resolves to the user on success, or to
     * `{ ok: false, ...detail }` so the form can render the message inline
     * without catching.
     */
    async login(username, password) {
        try {
            const { data } = await api.post("/auth/login", { username, password });
            writeSession(data.token, data.user);
            // Clear the reason as well: a successful sign in is not a
            // continuation of the session that just ended, and the login screen
            // has already been shown by the time this resolves.
            set({
                status: "authenticated",
                token: data.token,
                user: data.user,
                sessionEndedReason: null,
            });
            return { ok: true, user: data.user };
        } catch (error) {
            // Never persisted, so nothing to clear. The detail describes which
            // of the two LDAP failures happened.
            return { ok: false, ...describeError(error) };
        }
    },

    logout() {
        clearSession();
        set({ status: "anonymous", token: null, user: null, sessionEndedReason: "signedout" });
    },

    /**
     * Ends a session the server or the clock rejected, keeping the reason.
     *
     * `code` is the API error code when there was a response. TOKEN_EXPIRED is
     * the one the user needs to be told about, because it is the only outcome
     * that comes back on its own after a few minutes of doing nothing.
     */
    invalidate(code) {
        if (get().status === "anonymous") return;
        clearSession();
        set({
            status: "anonymous",
            token: null,
            user: null,
            sessionEndedReason: code === "TOKEN_EXPIRED" ? "expired" : "invalid",
        });
    },

    /**
     * Ends the session locally because the token's own `exp` has passed.
     *
     * Called by the route guard before any request is made, which is what makes
     * plain navigation expire too: clicking a nav link does not talk to the API,
     * so without this the user would walk into a page that is about to 401.
     * This reads the claim, it does not verify anything — the server is still
     * the one that decides.
     */
    expire() {
        if (get().status !== "authenticated") return;
        clearSession();
        set({ status: "anonymous", token: null, user: null, sessionEndedReason: "expired" });
    },

    /**
     * Called by the login screen when the user starts a new attempt, so the
     * reason for the previous ending does not sit above a fresh error.
     */
    clearSessionEndReason() {
        if (get().sessionEndedReason === null) return;
        set({ sessionEndedReason: null });
    },
}));

// Hand the interceptor its two hooks into this store. Done once at module
// scope: re-binding on every render would let a stale closure resurrect a
// session that was just cleared.
bindTokenSource(() => useAuthStore.getState().token);
bindUnauthorizedHandler((code) => useAuthStore.getState().invalidate(code));
