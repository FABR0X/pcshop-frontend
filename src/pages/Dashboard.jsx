import { useDeferredValue, useMemo, useState } from "react";
import { useCatalog } from "../hooks/useCatalog";
import { useSessionExpiry } from "../hooks/useSessionExpiry";
import { AppShell } from "../components/AppShell";
import { ProductCard } from "../components/ProductCard";
import { TokenInspector } from "../components/TokenInspector";
import { SkeletonGrid } from "../components/SkeletonGrid";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/Button";
import { categoryLabel } from "../constants/categories";
import { formatPrice } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import { api, describeError } from "../api/client";
import { ArrowClockwise, Check, MagnifyingGlass, X } from "../components/icons";

const SORTS = {
    newest: { label: "Newest first", compare: (a, b) => b.id - a.id },
    "name-asc": { label: "Name A–Z", compare: (a, b) => a.name.localeCompare(b.name) },
    "price-desc": { label: "Price high–low", compare: (a, b) => b.price - a.price },
    "price-asc": { label: "Price low–high", compare: (a, b) => a.price - b.price },
};

export function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const logout = useAuthStore((state) => state.logout);

    const { products, categories, status, refreshing, error, reload } = useCatalog();

    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("newest");
    const [pendingDelete, setPendingDelete] = useState(null);
    const [actionError, setActionError] = useState(null);

    // Typing stays responsive: the input updates on every keystroke while the
    // (more expensive) filter runs against a deferred copy of the value.
    const deferredQuery = useDeferredValue(query);

    // Searching, filtering and sorting are all local — `visible` below is a
    // useMemo over products already in memory — so none of them issues a request
    // for the 401 interceptor to catch, and none of them leaves the route for
    // the guard to catch either. One hook covers all three because all three
    // move the same local state.
    //
    // `pendingDelete` is here too: opening the delete dialog is also only local
    // state. Confirming it does call the API, but that is a click later, and
    // the whole point is not to let someone keep working a dead session.
    useSessionExpiry(`${query}|${category}|${sort}|${pendingDelete?.id ?? ""}`);

    const visible = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();

        const filtered = products.filter((product) => {
            if (category !== "all" && product.category !== category) return false;
            if (!needle) return true;
            return (
                product.name.toLowerCase().includes(needle) ||
                (product.brand ?? "").toLowerCase().includes(needle)
            );
        });

        return filtered.sort(SORTS[sort].compare);
    }, [products, deferredQuery, category, sort]);

    const totalValue = useMemo(
        () => visible.reduce((sum, product) => sum + (product.price ?? 0), 0),
        [visible]
    );

    const filtering = query !== deferredQuery;
    const hasFilters = query.trim() !== "" || category !== "all";

    async function confirmDelete() {
        const target = pendingDelete;
        setPendingDelete(null);
        if (!target) return;

        setActionError(null);

        try {
            await api.delete(`/products/${target.id}`);
        } catch (error) {
            // A 404 means someone else already removed it: still re-read the
            // list, but say so rather than failing silently.
            const { message } = describeError(error);
            setActionError(message);
        }

            await reload();
    }

    function clearFilters() {
        setQuery("");
        setCategory("all");
    }

    return (
        <AppShell user={user} onLogout={logout}>
            <div className="dash">
                <section className="dash__main">
                    <Reveal className="dash__head">
                        <div>
                            <h1 className="dash__title">Component catalogue</h1>
                            <p className="dash__sub">
                                Every card below came from a request that carried your session
                                token.
                            </p>
                        </div>

                        <div className="dash__head-actions">
                            {refreshing ? (
                                <span className="dash__refreshing" role="status">
                                    <ArrowClockwise className="spin" size={15} weight="bold" />
                                    Syncing
                                </span>
                            ) : null}
                            <Button to="/products/new" size="sm" variant="secondary">
                                New product
                            </Button>
                        </div>
                    </Reveal>

                    <Reveal delay={60}>
                        <div className="filters">
                            <div className="search">
                                <MagnifyingGlass
                                    className="search__icon"
                                    size={17}
                                    weight="bold"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    className="input input--search"
                                    placeholder="Search name or brand"
                                    aria-label="Search products by name or brand"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        className="search__clear"
                                        onClick={() => setQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <X size={14} weight="bold" />
                                    </button>
                                ) : null}
                            </div>

                            <label className="select">
                                <span className="visually-hidden">Sort products</span>
                                <select
                                    className="input"
                                    value={sort}
                                    onChange={(event) => setSort(event.target.value)}
                                >
                                    {Object.entries(SORTS).map(([value, { label }]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="chips" role="group" aria-label="Filter by category">
                            <button
                                type="button"
                                className={category === "all" ? "chip chip--on" : "chip"}
                                onClick={() => setCategory("all")}
                                aria-pressed={category === "all"}
                            >
                                All
                                <span className="chip__count mono">{products.length}</span>
                            </button>

                            {categories.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    className={category === name ? "chip chip--on" : "chip"}
                                    onClick={() => setCategory(name)}
                                    aria-pressed={category === name}
                                >
                                    {categoryLabel(name)}
                                </button>
                            ))}
                        </div>
                    </Reveal>

                    <div className="dash__status">
                        {status === "ready" ? (
                            <p className="dash__count" role="status">
                                {filtering ? "Filtering…" : `${visible.length} of ${products.length}`}
                                {visible.length > 0 ? ` · ${formatPrice(totalValue)} total` : ""}
                            </p>
                        ) : null}

                        {hasFilters && status === "ready" ? (
                            <button type="button" className="link" onClick={clearFilters}>
                                Clear filters
                            </button>
                        ) : null}
                    </div>

                    {actionError ? (
                        <p className="alert" role="alert">
                            {actionError}
                        </p>
                    ) : null}

                    {status === "loading" ? <SkeletonGrid /> : null}

                    {status === "error" ? (
                        <ErrorState message={error} onRetry={() => reload()} />
                    ) : null}

                    {status === "ready" && visible.length === 0 ? (
                        <EmptyState
                            title={hasFilters ? "Nothing matches those filters" : "No products yet"}
                            message={
                                hasFilters
                                    ? "Try a different search term, or clear the filters to see the whole catalogue."
                                    : "Add the first component to the catalogue and it will appear here."
                            }
                            action={
                                hasFilters ? (
                                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                                        Clear filters
                                    </Button>
                                ) : (
                                    <Button to="/products/new" size="sm">
                                        New product
                                    </Button>
                                )
                            }
                        />
                    ) : null}

                    {status === "ready" && visible.length > 0 ? (
                        <div className="grid">
                            {visible.map((product, index) => (
                                <Reveal
                                    key={product.id}
                                    delay={Math.min(index, 8) * 60}
                                    className="grid__item"
                                >
                                    {pendingDelete?.id === product.id ? (
                                        <ConfirmDelete
                                            product={product}
                                            onConfirm={confirmDelete}
                                            onCancel={() => setPendingDelete(null)}
                                        />
                                    ) : (
                                        <ProductCard
                                            product={product}
                                            onDelete={setPendingDelete}
                                        />
                                    )}
                                </Reveal>
                            ))}
                        </div>
                    ) : null}
                </section>

                <aside className="dash__rail">
                    <Reveal delay={120}>
                        <TokenInspector token={token} />
                    </Reveal>
                </aside>
            </div>
        </AppShell>
    );
}

/**
 * Inline delete confirmation.
 *
 * Deliberately not a modal: an inline swap needs no focus trap, no scroll lock
 * and no focus restoration, which is most of the bugs a hand-rolled dialog
 * brings along. The action stays where the user just clicked.
 */
function ConfirmDelete({ product, onConfirm, onCancel }) {
    return (
        <div className="product product--confirm">
            <p className="product__confirm-text">
                Delete <strong>{product.name}</strong>?
            </p>
            <div className="product__confirm-actions">
                <Button size="sm" variant="danger" onClick={onConfirm}>
                    <Check size={15} weight="bold" />
                    Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                    Keep
                </Button>
            </div>
        </div>
    );
}
