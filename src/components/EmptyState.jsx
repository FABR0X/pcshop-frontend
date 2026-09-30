import { Button } from "./Button";
import { Package, Warning, ArrowClockwise } from "./icons";

/**
 * The two "there is nothing here" states.
 *
 * An empty result is a normal outcome of filtering, not an error, so it offers
 * the action that fixes it. A failed request is different: it says what failed
 * and offers a retry.
 */
export function EmptyState({ title, message, action }) {
    return (
        <div className="empty">
            <span className="empty__icon">
                <Package size={24} weight="bold" />
            </span>
            <h3 className="empty__title">{title}</h3>
            <p className="empty__message">{message}</p>
            {action}
        </div>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <div className="empty empty--error" role="alert">
            <span className="empty__icon empty__icon--error">
                <Warning size={24} weight="bold" />
            </span>
            <h3 className="empty__title">Could not load products</h3>
            <p className="empty__message">{message}</p>
            {onRetry ? (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                    <ArrowClockwise size={16} weight="bold" />
                    Try again
                </Button>
            ) : null}
        </div>
    );
}
