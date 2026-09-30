/**
 * Display formatting, kept out of the component files so a component module
 * only ever exports components (which is what keeps React Fast Refresh working).
 */

/** "1299.00" -> "$1,299.00". Falls back to an em dash for anything unusable. */
export function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(amount);
}
