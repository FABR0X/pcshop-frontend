import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { SpinnerGap } from "../components/icons";

/**
 * Gate for everything behind a login.
 *
 * Three states, not two. While the boot check runs, render a splash instead of
 * redirecting: bouncing a user with a valid token to the login screen on every
 * refresh is the classic symptom of a missing "loading" branch.
 */
export function RequireAuth() {
    const status = useAuthStore((state) => state.status);
    const location = useLocation();

    if (status === "loading") return <BootSplash />;

    if (status !== "authenticated") {
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
