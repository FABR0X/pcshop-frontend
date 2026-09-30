import axios from "axios";

/**
 * Supplies the current token to the request interceptor.
 *
 * Registered from the auth store so this module never imports the store, which
 * would create a cycle (store -> api -> store). The alternative — importing the
 * store here directly — is exactly the coupling that makes interceptors
 * untestable.
 */
let tokenSource = () => null;

/** Called once by the auth store. */
export function bindTokenSource(source) {
    tokenSource = source;
}

/** Called by the auth store when the server rejects the token. */
let onUnauthorized = () => {};
export function bindUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

export const api = axios.create({
    // Relative on purpose: in production nginx reverse-proxies /api to the
    // backend, so the browser only ever talks to one origin.
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 10_000,
    headers: { "Content-Type": "application/json" },
});

/**
 * Attaches the Bearer token to every outbound request and logs what is being
 * sent. This is the half of the demo that lives in the browser: open the
 * console and each call prints the exact header it received.
 */
api.interceptors.request.use((config) => {
    const token = tokenSource();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const verb = (config.method ?? "get").toUpperCase();
    console.log(
        `[api] ${verb} ${config.url}\n` +
            `      Authorization: ${config.headers.Authorization ?? "(none)"}`
    );

    return config;
});

api.interceptors.response.use(
    (response) => {
        console.log(`[api] ${response.status} ${response.config.url} ✓`);
        return response;
    },
    (error) => {
        const { response, config } = error;

        if (!response) {
            console.error(`[api] ${config?.url} could not reach the server:`, error.message);
            return Promise.reject(error);
        }

        console.warn(`[api] ${response.status} ${config?.url} (${response.data?.code ?? "no code"})`);

        // An expired or invalid token means the session is over. Clear it once,
        // centrally, instead of at every call site.
        if (response.status === 401 && response.data?.code !== "BAD_PASSWORD" &&
            response.data?.code !== "USER_NOT_FOUND") {
            onUnauthorized();
        }

        return Promise.reject(error);
    }
);

/** Normalises an axios failure into a message plus per-field errors. */
export function describeError(error) {
    const data = error?.response?.data;
    return {
        message: data?.error ?? "Something went wrong. Check your connection and try again.",
        code: data?.code ?? "NETWORK_ERROR",
        fields: Array.isArray(data?.errors) ? data.errors : [],
    };
}
