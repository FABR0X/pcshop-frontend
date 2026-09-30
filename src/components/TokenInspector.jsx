import { useEffect, useId, useState } from "react";
import { formatRemaining, formatTimestamp, readClaims } from "../lib/jwt";
import { Check, Copy, Lock, ShieldCheck } from "./icons";

/**
 * Shows the live session token: the exact Authorization header going out, and
 * the claims inside it.
 *
 * This exists to make the Bearer flow visible. Decode here is presentation
 * only — the backend's jwt.verify is what actually authorises the request, so
 * nothing on this panel is a security decision.
 */

/**
 * The ticking countdown, isolated into its own component.
 *
 * The clock lives in state so nothing impure runs during render, and a timer
 * that re-renders every 30s must not re-render the whole panel, so nothing else
 * subscribes to it.
 */
function SessionClock({ expiresAt }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        // Tick every second for the last two minutes so the countdown actually
        // reaches zero on screen, and every 30s before that, where the display
        // has minute granularity and a per-second re-render buys nothing.
        function intervalFor() {
            const remaining = (expiresAt ?? 0) - Date.now();
            return remaining < 120_000 ? 1_000 : 30_000;
        }

        let id = setInterval(() => setNow(Date.now()), intervalFor());

        // Re-evaluate when the threshold is crossed, so a long-lived session
        // speeds up on its own instead of needing a component remount.
        const id2 = setInterval(() => {
            const next = intervalFor();
            clearInterval(id);
            id = setInterval(() => setNow(Date.now()), next);
        }, 30_000);

        return () => {
            clearInterval(id);
            clearInterval(id2);
        };
    }, [expiresAt]);

    const expired = !expiresAt || expiresAt <= now;

    return (
        <span className={expired ? "clock clock--expired" : "clock"}>
            {expired ? "Session expired" : `Expires in ${formatRemaining(expiresAt, now)}`}
        </span>
    );
}

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);
    const statusId = useId();

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2_000);
        } catch {
            // Clipboard blocked (insecure origin, denied permission). The token
            // is on screen anyway, so there is nothing useful to say.
        }
    }

    return (
        <>
            <button type="button" className="icon-btn" onClick={copy} aria-label="Copy token">
                {copied ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
            </button>
            <span className="visually-hidden" id={statusId} role="status">
                {copied ? "Token copied to clipboard" : ""}
            </span>
        </>
    );
}

export function TokenInspector({ token }) {
    const claims = readClaims(token);

    if (!token || !claims) return null;

    return (
        <section className="token" aria-labelledby="token-heading">
            <header className="token__head">
                <h2 className="token__title" id="token-heading">
                    <Lock size={16} weight="bold" />
                    Active session
                </h2>
                <SessionClock expiresAt={claims.expiresAt} />
            </header>

            <p className="token__lead">
                Every request below carries this header. Open the browser console or the Network
                tab to watch it attach to each call.
            </p>

            <div className="token__block">
                <span className="token__block-label mono">Authorization</span>
                <code className="token__value mono">
                    Bearer <span className="token__value-rest">{token}</span>
                </code>
                <CopyButton value={token} />
            </div>

            <dl className="claims">
                <div className="claims__row">
                    <dt>Subject</dt>
                    <dd className="mono">{claims.subject ?? "—"}</dd>
                </div>
                <div className="claims__row">
                    <dt>Name</dt>
                    <dd>{claims.displayName ?? "—"}</dd>
                </div>
                <div className="claims__row">
                    <dt>Issuer</dt>
                    <dd className="mono">{claims.issuer ?? "—"}</dd>
                </div>
                <div className="claims__row">
                    <dt>Audience</dt>
                    <dd className="mono">{claims.audience ?? "—"}</dd>
                </div>
                <div className="claims__row">
                    <dt>Issued</dt>
                    <dd>{formatTimestamp(claims.issuedAt)}</dd>
                </div>
                <div className="claims__row">
                    <dt>Expires</dt>
                    <dd>{formatTimestamp(claims.expiresAt)}</dd>
                </div>
            </dl>

            <p className="token__note">
                <ShieldCheck size={15} weight="bold" />
                <span>
                    Signed with HS256 and verified on the server. The decode above is for display;
                    only the server&rsquo;s signature check grants access.
                </span>
            </p>
        </section>
    );
}
