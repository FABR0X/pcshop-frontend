/**
 * Placeholder cards shown while the first page of products loads.
 *
 * Shaped like the real card so the layout does not jump when data lands, and
 * aria-hidden with a single live-region message beside it: a screen reader
 * should hear "Loading products" once, not forty empty divs.
 */
const SKELETON_COUNT = 6;

export function SkeletonGrid() {
    return (
        <>
            <p className="visually-hidden" role="status">
                Loading products
            </p>

            <div className="grid" aria-hidden="true">
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                    <div className="product product--skeleton" key={i}>
                        <div className="skeleton skeleton--icon" />
                        <div className="product__body">
                            <div className="skeleton skeleton--tag" />
                            <div className="skeleton skeleton--line" style={{ width: "78%" }} />
                            <div className="skeleton skeleton--line" style={{ width: "52%" }} />
                            <div className="skeleton skeleton--line skeleton--short" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
