import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { isExpired } from "../lib/jwt";
import { SpinnerGap } from "../components/icons";

/**
 * Gate for everything behind a login.
 *
 * Three states, not two. While the boot check runs, render a splash instead of
 * redirecting: bouncing a user with a valid token to the login screen on every
 * refresh is the classic symptom of a missing "loading" branch.
 *
 * It also enforces expiry on *navigation*, which the HTTP layer cannot do.
 * Clicking a nav link issues no request, so without the check below the user
 * would walk happily into a new page whose first fetch is a guaranteed 401 —
 * the failure would surface as a random error on an unrelated page instead of
 * as a clear "your session ended". Expiry is read from the token's own `exp`
 * claim, which is presentation here: the server still verifies every request.
 */
export function RequireAuth() {
    const status = useAuthStore((state) => state.status);
    const token = useAuthStore((state) => state.token);
    const expire = useAuthStore((state) => state.expire);
    const location = useLocation();

    const expired = status === "authenticated" && isExpired(token);

    // The store is updated from an effect, never during render, so the redirect
    // below can happen on the very first render while localStorage is only
    // cleared once React commits.
    useEffect(() => {
        if (expired) expire();
    }, [expired, expire]);

    if (status === "loading") return <BootSplash />;

    if (status !== "authenticated" || expired) {
        // Remember where they were headed so login can return them there.
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}

function BootSplash() {
    return (
        <div className="splash" role="status">
            <SpinnerGap className="spin" size={22} weight="bold" />
            <span>Restoring your session</span>
        </div>
    );
}
