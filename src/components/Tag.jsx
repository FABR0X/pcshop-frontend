/**
 * Small uppercase status label. Pills are reserved for tags like this one and
 * are never used for cards, containers or primary buttons.
 */
export function Tag({ tone = {}, children, title }) {
    const style = {
        background: tone.bg ?? "var(--surface-sunken)",
        color: tone.fg ?? "var(--text-muted)",
    };

    return (
        <span className="tag" style={style} title={title}>
            {children}
        </span>
    );
}
