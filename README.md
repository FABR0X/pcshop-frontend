# pcshop-frontend

SPA de React para el catálogo de componentes de PC. Es el **primer repo** del
entregable: es la única superficie que el usuario toca, y la que emite el header
`Authorization: Bearer <jwt>` en cada request.

## Arrancar

El compose vive en `pcshop-backend/` porque tiene que referenciar los otros dos
repos. Desde ahí:

```powershell
docker compose up -d --build
```

Y abrir <http://localhost:8081>.

Para desarrollo con HMR, con la API corriendo aparte:

```powershell
npm install
npm run dev        # http://localhost:5173, /api proxied to :4000
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Vite dev server con HMR y proxy `/api` → `http://localhost:4000` |
| `npm run build` | Build de producción en `dist/` (target ES2022) |
| `npm run preview` | Sirve `dist/` localmente, sin el proxy de nginx |
| `npm run lint` | Oxlint sobre `src/` |

## Sesión

El token vive en `localStorage` bajo la clave **`pcshop.session`** y el único
módulo que lo toca es `src/lib/storage.js`:

```json
{ "v": 1, "token": "<jwt>", "user": { "handle": "juan", "displayName": "Juan Perez" } }
```

`v` es un versión de esquema: si algún día el shape cambia, subirlo descarta las
sesiones viejas en vez de hidratar un objeto que la app ya no entiende.

Nada más en la app lee o escribe `localStorage`, y nada más en la app lee o
escribe el token — `authStore` es el único dueño. Eso evita que dos componentes
se desincronicen sobre si hay sesión.

### El refresh es el momento de la verdad

Un JWT en `localStorage` sobrevive al refresh, y ese es justamente el problema:
puede seguir ahí un token expirado o revocado. `main.jsx` lanza `bootstrap()`
antes de renderizar nada, y `bootstrap()` valida el token guardado contra
`GET /api/auth/me`. Recién después se decide qué ruta pintar.

Por eso los guards tienen una rama de carga explícita: sin ella, un F5 en
`/products` expulsaría al usuario al login durante el vuelo del request, y
volvería a `/products` al completarse. El usuario vería un parpadeo de login en
cada refresh.

## Un 401 central, con una excepción

`src/api/client.js` centraliza la expiración de sesión: ante un `401` borra el
token y manda al login. La excepción son `BAD_PASSWORD` y `USER_NOT_FOUND`, que
son un `401` de *ese* intento de login y no una sesión muerta — sin esta
excepción, escribir una contraseña incorrecta cerraría la sesión de la persona
que ya estaba conectada.

## Evidencia de demo

- `TokenInspector` muestra el token vivo, sus claims y la cuenta regresiva de
  expiración.
- El interceptor de Axios loguea el `Authorization` exacto de cada request
  saliente, y el request logger del backend responde con el `sub` que extrajo de
  ese token. Juntos son la prueba de que el mismo JWT viaja en ambas puntas y de
  que el servidor lo leyó — sin necesidad de loguear el token en el servidor.
- `src/components/ProductCard.jsx` y el panel de sesión son las piezas que
  aparecen en el video.

## Docker

`Dockerfile` es multi-stage: build con Node, runtime con nginx. `nginx.conf`
hace tres cosas — servir `index.html` con `no-cache` (para que un deploy nuevo
se vea sin hard refresh), cachear los assets con hash de nombre en
`immutable`, y reverse-proxear `/api` a `http://backend:3000` de modo que el
frontend no necesita saber la URL del backend ni CORS.

## Estructura

```
src/
├── main.jsx              bootstrap de sesión antes del render
├── App.jsx               rutas (AddProduct lazy)
├── api/client.js         Axios + Bearer + 401 central
├── store/authStore.js    dueño único del token
├── lib/storage.js        la única frontera con localStorage
├── lib/jwt.js            decode de claims, expiración, formato
├── auth/                 RequireAuth / RedirectIfAuthed
├── pages/                Login, Dashboard, AddProduct
├── components/           UI + ProductCard + TokenInspector
├── hooks/useCatalog.js   carga products y categories en paralelo
├── styles/               tokens, base, componentes
└── constants/categories.js   fallback si /categories no responde
```

`useCatalog` usa `Promise.allSettled`: si `/categories` cae, el catálogo sigue
siendo usable con el vocabulario de respaldo en vez de dejar la pantalla en
error.
