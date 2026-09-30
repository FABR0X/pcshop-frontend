import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { RedirectIfAuthed } from "./auth/RedirectIfAuthed";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { SpinnerGap } from "./components/icons";
import { Button } from "./components/Button";

/*
 * The add-product form is the heaviest route and the one used least, so it
 * ships as its own chunk and is fetched when the user actually goes there.
 * Login and Dashboard stay in the main bundle because they are the first two
 * screens anyone sees.
 */
const AddProduct = lazy(() => import("./pages/AddProduct").then((m) => ({ default: m.AddProduct })));

function RouteFallback() {
    return (
        <div className="splash" role="status">
            <SpinnerGap className="spin" size={22} weight="bold" />
            <span>Loading</span>
        </div>
    );
}

function NotFound() {
    return (
        <div className="splash">
            <p className="splash__code mono">404</p>
            <p>That page does not exist.</p>
            <Button to="/" size="sm" variant="secondary">
                Back to catalogue
            </Button>
        </div>
    );
}

export function App() {
    return (
        <Routes>
            <Route element={<RedirectIfAuthed />}>
                <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<RequireAuth />}>
                <Route index element={<Dashboard />} />
                <Route
                    path="products/new"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <AddProduct />
                        </Suspense>
                    }
                />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
