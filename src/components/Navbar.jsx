import { Button } from "./Button";
import { Plus, SignOut, Stack } from "./icons";

/**
 * The top bar: identity, the one primary action, and the way out.
 *
 * Signed-in state comes from props rather than from the store, so the navbar
 * stays a dumb component that any page can reuse.
 */
export function Navbar({ user, onLogout }) {
    const initials = (user?.displayName ?? user?.handle ?? "?")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return (
        <header className="nav">
            <div className="nav__inner">
                <a className="brand" href="/">
                    <span className="brand__mark" aria-hidden="true">
                        <Stack size={18} weight="bold" />
                    </span>
                    <span className="brand__name">PCShop</span>
                </a>

                <div className="nav__right">
                    <Button to="/products/new" size="sm">
                        <Plus size={16} weight="bold" />
                        New product
                    </Button>

                    <div className="nav__user">
                        <span className="avatar" aria-hidden="true">
                            {initials}
                        </span>
                        <span className="nav__user-text">
                            <span className="nav__user-name">{user?.displayName ?? "—"}</span>
                            <span className="nav__user-handle mono">{user?.handle ?? ""}</span>
                        </span>
                    </div>

                    <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Sign out">
                        <SignOut size={16} weight="bold" />
                        <span className="nav__signout-label">Sign out</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
