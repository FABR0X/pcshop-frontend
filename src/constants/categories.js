/**
 * The category vocabulary, mirrored from the backend's `CATEGORIES`.
 *
 * The API exposes it at GET /api/categories and the dashboard fetches it, so
 * this list is only the fallback for first paint and for the form before the
 * request lands. The backend is the source of truth; if the two ever disagree,
 * the server wins.
 */
export const FALLBACK_CATEGORIES = [
    "case",
    "motherboard",
    "cpu",
    "ram",
    "gpu",
    "storage",
    "psu",
    "cooling",
    "peripheral",
];

/**
 * Muted pastel per category, per the palette contract: colour carries meaning,
 * never decoration. `fg` is the text colour on `bg` and both pass WCAG AA.
 */
const CATEGORY_TONE = {
    case: { bg: "var(--pastel-blue-bg)", fg: "var(--pastel-blue-fg)" },
    motherboard: { bg: "var(--pastel-green-bg)", fg: "var(--pastel-green-fg)" },
    cpu: { bg: "var(--pastel-yellow-bg)", fg: "var(--pastel-yellow-fg)" },
    ram: { bg: "var(--pastel-blue-bg)", fg: "var(--pastel-blue-fg)" },
    gpu: { bg: "var(--pastel-red-bg)", fg: "var(--pastel-red-fg)" },
    storage: { bg: "var(--pastel-green-bg)", fg: "var(--pastel-green-fg)" },
    psu: { bg: "var(--pastel-yellow-bg)", fg: "var(--pastel-yellow-fg)" },
    cooling: { bg: "var(--pastel-blue-bg)", fg: "var(--pastel-blue-fg)" },
    peripheral: { bg: "var(--pastel-green-bg)", fg: "var(--pastel-green-fg)" },
};

const FALLBACK_TONE = { bg: "var(--surface-sunken)", fg: "var(--text-muted)" };

export function categoryTone(category) {
    return CATEGORY_TONE[category] ?? FALLBACK_TONE;
}

/** "motherboard" -> "Motherboard" for display. */
export function categoryLabel(category) {
    if (!category) return "Uncategorised";
    return category.charAt(0).toUpperCase() + category.slice(1);
}
