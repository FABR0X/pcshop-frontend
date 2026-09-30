import { Link } from "react-router-dom";

/*
 * Explicit variants instead of boolean props.
 *
 * The alternative is `<Button primary subtle onDark>`, which grows a new flag
 * for every combination and ends up with invalid states nobody can reason
 * about. A `variant` + `size` pair keeps the whole surface enumerable.
 *
 * `ref` arrives as an ordinary prop: React 19 passes it straight through to
 * function components, so no forwardRef wrapper is needed.
 */
const VARIANTS = {
    primary: "btn--primary",
    secondary: "btn--secondary",
    ghost: "btn--ghost",
    danger: "btn--danger",
};

const SIZES = {
    sm: "btn--sm",
    md: "btn--md",
};

export function Button({
    variant = "primary",
    size = "md",
    as,
    to,
    className = "",
    type = "button",
    ref,
    children,
    ...rest
}) {
    const classes = ["btn", VARIANTS[variant] ?? VARIANTS.primary, SIZES[size] ?? SIZES.md, className]
        .filter(Boolean)
        .join(" ");

    // `to` renders a router link (navigating, not submitting); `as` lets a
    // caller swap the element while keeping the button styling.
    if (to) {
        return (
            <Link ref={ref} to={to} className={classes} {...rest}>
                {children}
            </Link>
        );
    }

    if (as) {
        const Tag = as;
        return (
            <Tag ref={ref} className={classes} {...rest}>
                {children}
            </Tag>
        );
    }

    return (
        <button ref={ref} type={type} className={classes} {...rest}>
            {children}
        </button>
    );
}
