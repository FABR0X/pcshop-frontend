import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Reveal } from "../components/Reveal";
import { ArrowRight, Key, Lock, ShieldCheck, SpinnerGap, User } from "../components/icons";

/*
 * The four steps of the flow, in order. Specific to this system rather than
 * generic security copy, and static so it is not rebuilt on every render.
 */
const FLOW = [
    {
        icon: User,
        title: "Credentials are posted to the API",
        body: "The browser never talks to OpenLDAP. The handle and password go to POST /api/auth/login and nowhere else.",
    },
    {
        icon: Key,
        title: "The API binds against the directory",
        body: "A service account searches for your entry, then attempts a bind with your password. Wrong password, no entry, either way it is rejected.",
    },
    {
        icon: ShieldCheck,
        title: "A signed token comes back",
        body: "On a successful bind the API issues an HS256 JWT carrying your handle, and nothing else.",
    },
    {
        icon: Lock,
        title: "Every later call carries it",
        body: "The token is attached as an Authorization: Bearer header and re-verified on the server for each request.",
    },
];

/*
 * Why the user landed here, when it was not their choice.
 *
 * `null` means they simply opened the app, which is not the same as having
 * been signed out from under them, so it gets no banner at all.
 */
const ENDED_SESSION_COPY = {
    expired: {
        title: "Your session expired",
        body: "The token ran out while you were signed in. Sign in again to get a new one — nothing you saved is affected.",
    },
    invalid: {
        title: "Your session was refused",
        body: "The API rejected the token that was stored in this browser. Sign in again to continue.",
    },
    signedout: {
        title: "Signed out",
        body: "Your session was closed and the token was deleted from this browser.",
    },
};

export function Login() {
    const login = useAuthStore((state) => state.login);
    const endedReason = useAuthStore((state) => state.sessionEndedReason);
    const clearEndedReason = useAuthStore((state) => state.clearSessionEndReason);
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const destination = location.state?.from ?? "/";
    const ended = endedReason ? ENDED_SESSION_COPY[endedReason] : null;

    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);

        // The reason explains why the user was sent here, so it stays on screen
        // until they act on it. Clearing it on mount instead would drop the
        // banner after a single frame, and clearing it only on submit is what
        // keeps it from lingering above a wrong-password error.
        if (endedReason) clearEndedReason();

        const result = await login(username.trim(), password);
        setSubmitting(false);

        if (result.ok) {
            navigate(destination, { replace: true });
            return;
        }

        setError(result.message);
        setPassword("");
    }

    return (
        <div className="auth">
            <div className="auth__panel">
                <Reveal className="auth__intro">
                    <span className="brand__mark brand__mark--lg" aria-hidden="true">
                        <Key size={20} weight="bold" />
                    </span>
                    <h1 className="auth__title">Sign in to PCShop</h1>
                    <p className="auth__sub">
                        Use your directory account. Access is granted by the API after a bind
                        against OpenLDAP, not by this form.
                    </p>
                </Reveal>

                <Reveal delay={80}>
                    <form className="form" onSubmit={handleSubmit} noValidate>
                        {ended ? (
                            <div className="alert alert--notice" role="status">
                                <strong>{ended.title}</strong>
                                <span>{ended.body}</span>
                            </div>
                        ) : null}

                        {error ? (
                            <p className="alert" role="alert">
                                {error}
                            </p>
                        ) : null}

                        <Field label="Username" hint="Your directory handle, for example juan.">
                            {(props) => (
                                <input
                                    {...props}
                                    className="input"
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck="false"
                                    autoFocus
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            )}
                        </Field>

                        <Field label="Password">
                            {(props) => (
                                <input
                                    {...props}
                                    className="input"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            )}
                        </Field>

                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <SpinnerGap className="spin" size={16} weight="bold" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight size={16} weight="bold" />
                                </>
                            )}
                        </Button>
                    </form>
                </Reveal>

                <Reveal delay={160} className="auth__demo">
                    <p className="auth__demo-label">Seeded directory accounts</p>
                    <ul className="auth__demo-list mono">
                        <li>
                            <span>juan</span>
                            <span>LabPass-@juan</span>
                        </li>
                        <li>
                            <span>maria</span>
                            <span>LabPass-@maria</span>
                        </li>
                    </ul>
                </Reveal>
            </div>

            <Reveal className="auth__flow" delay={120}>
                <h2 className="auth__flow-title">What happens when you press sign in</h2>
                <ol className="flow">
                    {FLOW.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <li className="flow__step" key={step.title}>
                                <span className="flow__icon" aria-hidden="true">
                                    <Icon size={18} weight="bold" />
                                </span>
                                <div>
                                    <h3 className="flow__title">
                                        <span className="flow__index mono">{i + 1}</span>
                                        {step.title}
                                    </h3>
                                    <p className="flow__body">{step.body}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </Reveal>
        </div>
    );
}
