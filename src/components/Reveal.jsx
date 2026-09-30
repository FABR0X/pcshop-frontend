import { useEffect, useRef, useState } from "react";

/**
 * Fades content in the first time it scrolls into view.
 *
 * Uses IntersectionObserver, never a scroll listener: a scroll handler runs on
 * every frame of the scroll and is the usual cause of jank on long pages. The
 * observer stops observing after the first reveal, so the cost is paid once per
 * element, and the effect itself has no dependencies so it never re-arms.
 *
 * Elements already in view on mount reveal immediately, so the first paint is
 * never a blank page waiting for a scroll that may not come.
 */
/**
 * Whether this browser can animate the reveal at all.
 *
 * Decided during render rather than inside the effect, so the effect never has
 * to set state synchronously to reach the "just show it" case.
 */
function canAnimate() {
    if (typeof window === "undefined") return false;
    if (typeof window.IntersectionObserver === "undefined") return false;
    return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(!canAnimate);

    useEffect(() => {
        if (shown) return;

        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setShown(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [shown]);

    return (
        <Tag
            ref={ref}
            className={`reveal ${shown ? "is-visible" : ""} ${className}`.trim()}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
            {...rest}
        >
            {children}
        </Tag>
    );
}
