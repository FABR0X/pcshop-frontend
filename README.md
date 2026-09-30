# pcshop-frontend

React SPA for the PC component catalogue. This is the **first repo** of the
deliverable: the only surface the user touches, and the one that puts the
`Authorization: Bearer <jwt>` header on every request.

| | |
|---|---|
| Stack | React 19, Vite 8, React Router 7, Axios, Zustand, Phosphor icons |
| Local URL | <http://localhost:8081> (via nginx) or <http://localhost:5173> (dev server) |
| Talks to | `/api` — same origin, reverse-proxied to `pcshop-backend` |
| Sibling repos | [`pcshop-backend`](../pcshop-backend) · [`pcshop-ldap`](../pcshop-ldap) |

## Run it

The compose file lives in `pcshop-backend/` because it has to reference the other
two repos. From there:

```powershell
docker compose up -d --build
```

Then open <http://localhost:8081>.

Seeded accounts: `juan` / `LabPass-@juan` and `maria` / `LabPass-@maria`.

For HMR development, with the API running separately in Docker:

```powershell
npm install
npm run dev        # http://localhost:5173, /api proxied to :4000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR and a `/api` proxy → `http://localhost:4000` |
| `npm run build` | Production build into `dist/` (target ES2022) |
| `npm run preview` | Serves `dist/` locally, without the nginx proxy |
| `npm run lint` | Oxlint over `src/` |

## How authentication works

The browser never talks to OpenLDAP. It posts credentials to
`POST /api/auth/login`, the API binds against the directory, and on success a
signed JWT comes back. The SPA's job is to hold that token and re-present it.

```
POST /api/auth/login { username, password }
  → 200 { token, user: { handle, displayName } }
  → every later call:  Authorization: Bearer <jwt>
  → the jwt carries an exp five minutes out, shown as a live countdown
```

The login page spells this flow out in four steps, because for this assignment
the flow is the point, not the catalogue.

## Session storage

The token lives in `localStorage` under the key **`pcshop.session`**, and
`src/lib/storage.js` is the only module that touches it:

```json
{ "v": 1, "token": "<jwt>", "user": { "handle": "juan", "displayName": "Juan Perez" } }
```

`v` is a schema version. If the shape ever changes, bumping it discards old
sessions instead of hydrating an object the app no longer understands.

Nothing else in the app reads or writes `localStorage`, and nothing else reads
or writes the token — `authStore` is the single owner. That is what stops two
components from disagreeing about whether a session exists.

### Refreshing is the real test

A JWT in `localStorage` survives a refresh, and that is exactly the problem: an
expired or revoked token can still be sitting there. `main.jsx` calls
`bootstrap()` before rendering anything, and `bootstrap()` revalidates the
stored token against `GET /api/auth/me`. Only then does the router decide what
to paint.

That is also why the route guards have an explicit loading branch. Without it, a
hard refresh on `/products` would bounce the user to the login screen for the
duration of the request, then back to `/products` when it resolved — a visible
flash of the login page on every refresh.

## One central 401 handler, with one exception

`src/api/client.js` owns session expiry: on a `401` it clears the token and
redirects to login. The exception is `BAD_PASSWORD` and `USER_NOT_FOUND` — those
are a `401` about *this* login attempt, not a dead session. Without the
exception, typing a wrong password would log out the person who was already
signed in.

## When the five minutes run out

Tokens last five minutes, so a session ending is a normal event rather than an
error. Expiry can be noticed in three places, and no single one of them covers
the whole surface:

| What the user did | What notices it | Where |
|---|---|---|
| Pressed a button that calls the API | The `401 TOKEN_EXPIRED` answer | `src/api/client.js` response interceptor |
| Clicked a nav link | Nothing — no request is made | `RequireAuth` reading the `exp` claim |
| Searched, filtered, sorted or opened a dialog | Nothing at all | `useSessionExpiry` on local state |

The last two rows are the ones that are easy to miss, for the same reason: the
interaction issues no request, so the HTTP layer has nothing to react to, and
the user is still on the same route, so the guard does not re-run. Left
unhandled they are both confusing in the same way — the user keeps working a
session that died five minutes ago, and the lapse only surfaces later as a `401`
on some unrelated page.

So the rule is deliberately not "when the clock runs out" but **"when the user
touches something"**. A background timer would catch more cases, and it would
also eject someone in the middle of typing, so expiry is checked on interaction
instead. `RequireAuth` covers the route change; `useSessionExpiry` covers
interactions that only move local state:

```js
useSessionExpiry(`${query}|${category}|${sort}|${pendingDelete?.id ?? ""}`);
```

One call covers the catalogue's four local controls, because all of them move the
same state — a `useMemo` over products already in memory
(`Dashboard.jsx`). The argument is a single primitive rather than a rest
parameter, so the dependency array keeps a fixed length and `rules-of-hooks` can
check the call.

All three routes converge on the same store action, so the outcome is identical:
token is removed from `localStorage` and the login screen appears saying *why*.
`TOKEN_EXPIRED` and `TOKEN_INVALID` produce different wording, because one means
"this session ran out" and the other "this token is not one we can trust".

Two details that are easy to get wrong:

- **The reason is not cleared on mount.** It is held until the user acts, so the
  banner is actually readable. Clearing it in a `useEffect` on mount drops it
  after a single frame, and clearing it only after a failed submit leaves a stale
  "your session expired" sitting above the wrong-password error.
- **The banner is styled as information, not as an error.** Someone who left the
  tab open for five minutes has done nothing wrong, so it uses the blue
  informational treatment rather than the red one reserved for a failed sign-in.

A hard refresh on the login screen loses the reason, since it is kept in memory
rather than persisted. That is deliberate: the alternative is writing "your
session expired" to `localStorage` and clearing it later, which outlives the
moment it describes.

## API surface used

| Endpoint | Used for |
|---|---|
| `POST /api/auth/login` | Sign in, returns the token |
| `GET /api/auth/me` | Revalidate the stored token on boot |
| `GET /api/products` | Catalogue; supports `?q=` and `?category=` |
| `GET /api/categories` | Category vocabulary for the form and filters |
| `POST /api/products` | Create a component |
| `DELETE /api/products/:id` | Delete a component |

Every call except login carries the Bearer header. `created_by` is never sent
from the browser — the API reads it from the verified token, so a client cannot
attribute a row to somebody else.

## Demo evidence

- `TokenInspector` shows the live token, its claims, and a countdown to expiry.
- The Axios interceptor logs the exact `Authorization` header of every outgoing
  request, and the backend request logger answers with the `sub` it extracted
  from that token. Together they show the same JWT travelling in both directions
  and the server reading it — without the server ever logging the token itself.
- `src/components/ProductCard.jsx` and the session panel are the pieces that
  appear in the video.

## Docker

`Dockerfile` is multi-stage: build with Node, runtime with nginx. `nginx.conf`
does three things — serves `index.html` with `no-cache` (so a new deploy shows up
without a hard refresh), caches content-hashed assets as `immutable`, and
reverse-proxies `/api` to `http://backend:3000` so the frontend never needs to
know the backend's URL and never needs CORS.

## Structure

```
src/
├── main.jsx                  session bootstrap before the first render
├── App.jsx                   routes (AddProduct lazy-loaded)
├── api/client.js             Axios + Bearer + the central 401
├── store/authStore.js        the single owner of the token
├── lib/storage.js            the only boundary with localStorage
├── lib/jwt.js                claim decoding, expiry, formatting
├── auth/                     RequireAuth / RedirectIfAuthed
├── pages/                    Login, Dashboard, AddProduct
├── components/               UI + ProductCard + TokenInspector
├── hooks/useCatalog.js       loads products and categories in parallel
├── styles/                   tokens, base, components
└── constants/categories.js   fallback if /categories is unavailable
```

`useCatalog` uses `Promise.allSettled`: if `/categories` fails, the catalogue
stays usable with the fallback vocabulary instead of dropping the whole screen
into an error state.
