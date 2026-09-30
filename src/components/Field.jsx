import { useId } from "react";

/**
 * A labelled form control.
 *
 * Label above, optional helper, error below, and the two are wired together
 * with aria-describedby so a screen reader announces the helper and the error
 * with the field. No placeholder-as-label: the placeholder is an example, never
 * the only label.
 */
export function Field({ label, hint, error, children, id: providedId }) {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
        <div className="field">
            <label className="field__label" htmlFor={id}>
                {label}
            </label>

            {children({
                id,
                "aria-describedby": describedBy,
                "aria-invalid": error ? true : undefined,
            })}

            {hint ? (
                <p className="field__hint" id={hintId}>
                    {hint}
                </p>
            ) : null}

            {error ? (
                <p className="field__error" id={errorId} role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
