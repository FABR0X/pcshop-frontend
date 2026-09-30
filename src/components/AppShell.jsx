import { Navbar } from "./Navbar";

/**
 * Signed-in page frame: navbar plus a content column.
 *
 * Takes children rather than rendering a page itself, so the dashboard and the
 * new-product form share the chrome without either owning it.
 */
export function AppShell({ user, onLogout, children }) {
    return (
        <>
            <a className="skip-link" href="#main">
                Skip to content
            </a>

            <Navbar user={user} onLogout={onLogout} />

            <main className="shell" id="main">
                {children}
            </main>

            <footer className="foot">
                <span className="mono">pcshop · ldap auth · jwt sessions</span>
            </footer>
        </>
    );
}
