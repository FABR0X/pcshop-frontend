import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { isExpired } from "../lib/jwt";

/**
 * The mirror of RequireAuth: keeps a signed-in user off the login screen.
 *
 * Renders nothing while the boot check runs, so the redirect does not flicker
 * a logged-in user back to the form on refresh.
 *
 * An expired session is *not* bounced to the catalogue. That is precisely the
 * case where the user belongs on the login form, so the same `exp` check the
 * outer guard runs is applied in reverse here: without it, landing back on
 * /login after an expiry would instantly redirect to / and start the cycle
 * over.
 */
export function RedirectIfAuthed() {
    const status = useAuthStore((state) => state.status);
    const token = useAuthStore((state) => state.token);

    if (status === "loading") return null;
    if (status === "authenticated" && !isExpired(token)) return <Navigate to="/" replace />;

    return <Outlet />;
}
