import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * The mirror of RequireAuth: keeps a signed-in user off the login screen.
 *
 * Renders nothing while the boot check runs, so the redirect does not flicker
 * a logged-in user back to the form on refresh.
 */
export function RedirectIfAuthed() {
    const status = useAuthStore((state) => state.status);

    if (status === "loading") return null;
    if (status === "authenticated") return <Navigate to="/" replace />;

    return <Outlet />;
}
