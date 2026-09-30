import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { useAuthStore } from "./store/authStore";

import "./styles/tokens.css";
import "./styles/index.css";
import "./styles/app.css";

/*
 * One boot check per app load.
 *
 * Refreshing the page with a valid token must not bounce the user to the login
 * screen, so the persisted token is verified against the API before any route
 * decides what to render. This runs at module scope rather than inside an
 * effect because the answer is needed before the first paint.
 */
useAuthStore.getState().bootstrap();

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
