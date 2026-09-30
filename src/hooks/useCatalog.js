import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "../api/client";
import { FALLBACK_CATEGORIES } from "../constants/categories";

/**
 * Fetches the product listing and the category vocabulary.
 *
 * Module level rather than inside the hook: it is a pure network read with no
 * React dependency, and keeping it out means the mount effect below stays a
 * one-liner. Products and categories are independent, so they go out together
 * rather than in sequence.
 */
async function fetchCatalog() {
    const [productsResult, categoriesResult] = await Promise.allSettled([
        api.get("/products"),
        api.get("/categories"),
    ]);

    if (productsResult.status === "rejected") {
        throw new Error(describeError(productsResult.reason).message);
    }

    const categories =
        categoriesResult.status === "fulfilled" &&
        Array.isArray(categoriesResult.value.data.categories) &&
        categoriesResult.value.data.categories.length > 0
            ? categoriesResult.value.data.categories
            : // A failed category fetch is deliberately not an error state: the
              // fallback list is identical to the server's, so the UI is still
              // correct without it.
              FALLBACK_CATEGORIES;

    return { products: productsResult.value.data.products ?? [], categories };
}

/**
 * Loads and owns the catalogue.
 *
 * `status` covers the first load only. Later refreshes set `refreshing` instead,
 * so a delete or a save does not blank the grid back to skeletons.
 */
export function useCatalog() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Guards against writing state after the page has gone away. `cancelled`
        // is the local flag; nothing is set synchronously here, so the effect
        // never starts a cascading render.
        let cancelled = false;

        fetchCatalog().then(
            (data) => {
                if (cancelled) return;
                setProducts(data.products);
                setCategories(data.categories);
                setStatus("ready");
            },
            (failure) => {
                if (cancelled) return;
                setError(failure.message);
                setStatus("error");
            }
        );

        return () => {
            cancelled = true;
        };
    }, []);

    /** Re-reads the list without dropping back to the loading skeleton. */
    const reload = useCallback(async () => {
        setRefreshing(true);
        setError(null);

        try {
            const data = await fetchCatalog();
            setProducts(data.products);
            setCategories(data.categories);
            setStatus("ready");
        } catch (failure) {
            // Keep whatever is on screen and report the failure alongside it.
            setError(failure.message);
        } finally {
            setRefreshing(false);
        }
    }, []);

    return { products, categories, status, refreshing, error, reload };
}
