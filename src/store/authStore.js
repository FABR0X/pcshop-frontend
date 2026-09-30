import { create } from "zustand";
import { api, bindTokenSource, bindUnauthorizedHandler, describeError } from "../api/client";
import { readSession, writeSession, clearSession } from "../lib/storage";

/**
 * The single owner of authentication state.
 *
 * Nothing else in the app reads or writes the token, reads localStorage, or
 * decides what a 401 means. The HTTP client asks this module for the token and
 * reports fatal 401s back through `bindUnauthorizedHandler`. That is the whole
 * point of the wiring below: the interceptor has no opinion about sessions.
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

        // Optimistically show the cached user so the first paint is not a blank
        // screen, but keep status "loading" so protected routes stay gated.
        set({ status: "loading", token, user });

        try {
            const { data } = await api.get("/auth/me");
            set({ status: "authenticated", token, user: data.user });
            writeSession(token, data.user);
        } catch {
            clearSession();
            set({ status: "anonymous", token: null, user: null });
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
            set({ status: "authenticated", token: data.token, user: data.user });
            return { ok: true, user: data.user };
        } catch (error) {
            // Never persisted, so nothing to clear. The detail describes which
            // of the two LDAP failures happened.
            return { ok: false, ...describeError(error) };
        }
    },

    logout() {
        clearSession();
        set({ status: "anonymous", token: null, user: null });
    },

    /** Used by the response interceptor when the server rejects the token. */
    invalidate() {
        if (get().status === "anonymous") return;
        clearSession();
        set({ status: "anonymous", token: null, user: null });
    },
}));

// Hand the interceptor its two hooks into this store. Done once at module
// scope: re-binding on every render would let a stale closure resurrect a
// session that was just cleared.
bindTokenSource(() => useAuthStore.getState().token);
bindUnauthorizedHandler(() => useAuthStore.getState().invalidate());
