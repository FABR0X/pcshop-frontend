# Build the SPA, then ship only the static output on nginx.
#
# The build stage keeps the full toolchain; the runtime stage keeps the built
# files, so neither node_modules nor the dev server ends up in the image that runs.

# ---- stage 1: build -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies are copied and installed before the source, so a change to a
# component does not invalidate the (slow) install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The SPA calls the API on its own origin and nginx proxies /api, so there is no
# API URL to bake into the bundle. Left explicit for clarity.
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ---- stage 2: serve -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine ships an unprivileged `nginx` user; port 80 needs no capabilities
# when nginx drops its master process after binding.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
