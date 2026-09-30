import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { isExpired } from "../lib/jwt";

/**
 * Ends the session when the token has lapsed, in response to an interaction
 * that never reaches the API.
 *
 * Expiry has three observers, and none of them covers the whole surface on its
 * own:
 *
 *   - the response interceptor, for a request that comes back 401
 *   - `RequireAuth`, for a click that changes the route
 *   - this hook, for a click that changes nothing but local state
 *
 * The third case is the easy one to miss. Filtering, searching and sorting the
 * catalogue all run in a `useMemo` over the products already in memory, so they
 * issue no request for the interceptor to reject and stay on the same route for
 * the guard to notice. Without this, a user whose token died five minutes ago
 * keeps filtering happily on a dead session, and the lapse only surfaces later
 * as an unexplained 401 on an unrelated page.
 *
 * `signal` is any primitive that changes when the user acts — usually a string
 * built from the local state involved:
 *
 *   useSessionExpiry(`${query}|${category}|${sort}`);
 *
 * It is a single value rather than a rest parameter so the dependency array
 * stays a fixed length, which is what `rules-of-hooks` needs to be able to
 * check the call.
 *
 * This reads the `exp` claim and nothing more. It decides when to *stop* using a
 * token the server has already stopped honouring; it never grants access.
 */
export function useSessionExpiry(signal) {
    const token = useAuthStore((state) => state.token);
    const expire = useAuthStore((state) => state.expire);

    useEffect(() => {
        if (token && isExpired(token)) expire();
    }, [token, expire, signal]);
}
