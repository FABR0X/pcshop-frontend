import { categoryTone, categoryLabel } from "../constants/categories";
import { formatPrice } from "../lib/format";
import { Tag } from "./Tag";
import {
    Circle,
    Cpu,
    Cube,
    Fan,
    HardDrive,
    Keyboard,
    Lightning,
    Monitor,
    Trash,
} from "./icons";

/*
 * A decorative glyph per category. The category is already spelled out in text
 * right beside it, so this is aria-hidden: announcing "cube" before "Case Power
 * Supply" is noise for a screen reader.
 */
const CATEGORY_ICON = {
    case: Cube,
    motherboard: Circle,
    cpu: Cpu,
    ram: Cpu,
    gpu: Monitor,
    storage: HardDrive,
    psu: Lightning,
    cooling: Fan,
    peripheral: Keyboard,
};

/* Never show more than this many spec rows on a card. */
const SPEC_PREVIEW = 2;

/**
 * Pulls the first few spec pairs out of the JSONB column.
 *
 * The API returns `specs` as an object, but it can legitimately be null, and a
 * row written before the column existed may hold a string. Both are handled
 * here rather than at every call site.
 */
function specPairs(specs) {
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];

    return Object.entries(specs)
        .filter(([key, value]) => key && value != null && value !== "")
        .slice(0, SPEC_PREVIEW);
}

/** "capacity_gb" -> "Capacity gb". Only affects presentation. */
function humaniseKey(key) {
    const spaced = key.replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * One product, as a card.
 *
 * The card body is deliberately not a button. There is no detail view in this
 * deliverable, so a button here would be a control that announces "View
 * GeForce RTX 4070 Super", takes focus, and then does nothing on activation.
 * Delete is the only action, and it is a real `<button>` with its own label, so
 * the tab order is one stop per card instead of two stops where one is inert.
 *
 * A plain container is also what keeps the hover treatment honest: the card
 * lifts slightly on hover, and a lift implies "you can interact with this".
 */
export function ProductCard({ product, onDelete }) {
    const Icon = CATEGORY_ICON[product.category] ?? Cube;
    const tone = categoryTone(product.category);
    const specs = specPairs(product.specs);

    return (
        <article className="product">
            <div className="product__main">
                <span className="product__icon" style={{ background: tone.bg, color: tone.fg }}>
                    <Icon size={22} weight="bold" />
                </span>

                <span className="product__body">
                    <span className="product__top">
                        <Tag tone={tone}>{categoryLabel(product.category)}</Tag>
                        <span className="product__price mono">{formatPrice(product.price)}</span>
                    </span>

                    <span className="product__name">{product.name}</span>

                    {product.brand ? (
                        <span className="product__brand">{product.brand}</span>
                    ) : null}

                    {specs.length > 0 ? (
                        <span className="product__specs">
                            {specs.map(([key, value]) => (
                                <span className="product__spec" key={key}>
                                    <span className="product__spec-key">{humaniseKey(key)}</span>
                                    <span className="product__spec-value mono">{String(value)}</span>
                                </span>
                            ))}
                        </span>
                    ) : null}

                    <span className="product__meta mono">
                        <span className={product.stock === 0 ? "stock stock--out" : "stock"}>
                            {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                        </span>
                        {product.created_by && product.created_by !== "seed" ? (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>by {product.created_by}</span>
                            </>
                        ) : null}
                    </span>
                </span>
            </div>

            {onDelete ? (
                <div className="product__actions">
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onDelete(product)}
                        aria-label={`Delete ${product.name}`}
                        title="Delete"
                    >
                        <Trash size={16} weight="bold" />
                    </button>
                </div>
            ) : null}
        </article>
    );
}
