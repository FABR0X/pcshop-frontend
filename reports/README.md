# Scan report — Frontend (PCShop dashboard)

Result of the security analysis with ProjectDiscovery **Nuclei** against the
dashboard frontend. This document renders
[`frontend-nuclei.jsonl`](./frontend-nuclei.jsonl) in readable form.

## Summary

| | |
|---|---|
| Target | `http://host.docker.internal:8081` (nginx serving the SPA) |
| Scope | unauthenticated, `http/` templates |
| Date | 2026-10-18, 23:54–23:55 UTC |
| Findings | **15**, all severity **`info`** |
| Real vulnerabilities (low/medium/high/critical) | **0** |

The scan returns hardening and fingerprinting observations. **Zero** directly
exploitable vulnerabilities, but there is a non-obvious header
misconfiguration (see point 1).

## Distribution

| Category | # | Severity |
|---|---:|---|
| Missing HTTP security headers | 10 | info |
| Version / technology disclosure | 3 | info |
| False WAF detection | 2 | info |
| **Total** | **15** | |

## Detailed findings

### 1. Missing HTTP security headers (10) — *`http-missing-security-headers`*

The frontend `200 OK` includes **none** of these headers:

| Missing header | What it does | Recommended value |
|---|---|---|
| `Content-Security-Policy` (CSP) | Mitigates XSS / content injection | `default-src 'self'; object-src 'none'; base-uri 'self'` |
| `X-Frame-Options` | Prevents clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevents MIME sniffing | `nosniff` |
| `Referrer-Policy` | Limits origin-URL leakage | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restricts browser APIs | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` (HSTS) | Enforces HTTPS | Only applies over **HTTPS** (this is HTTP) |
| `Cross-Origin-Opener-Policy` | Isolates the browsing context | `same-origin` |
| `Cross-Origin-Resource-Policy` | Blocks cross-origin resource loads | `same-origin` |
| `Cross-Origin-Embedder-Policy` | Requires CORP-compliant resources | `require-corp` |
| `X-Permitted-Cross-Domain-Policies` | Restricts cross-domain policies | `none` |

**CWE-693** (Protection Mechanism Failure).

#### Root cause (important)

The repo's `nginx.conf` **does define** three of these headers at the `server`
level:

```nginx
add_header X-Content-Type-Options "nosniff" always;   # nginx.conf:18
add_header X-Frame-Options "DENY" always;             # nginx.conf:19
add_header Referrer-Policy "same-origin" always;      # nginx.conf:20
```

But they **never reach the client** on the main page. The reason is an nginx
rule: *`add_header` is not inherited when the child block defines its own
`add_header`*. And `location = /index.html` defines one:

```nginx
location = /index.html {
    add_header Cache-Control "no-cache, must-revalidate";   # nginx.conf:62
}
```

Because `location /` runs `try_files $uri $uri/ /index.html`, the request ends
up internally redirected to `= /index.html`, and that block **drops** the three
headers inherited from `server`. That is why the scan sees them as missing even
though they appear to be declared.

**Recommendation:** repeat the security `add_header`s inside
`location = /index.html` (and in `/assets/`, which also defines its own), or move
them into a shared `include`, or use `add_header` with `always` in every block
that needs them.

### 2. Version and technology disclosure (3)

| Template | Result | Reading |
|---|---|---|
| `nginx-version` | `nginx/1.27.5` | The `Server:` header reveals the exact version |
| `tech-detect` | `nginx` | Confirms the web server |
| `nginx-eol` | `1.27.5` | Flags the version as *End-of-Life* |

`Server: nginx/1.27.5` exposes the version number. **Recommendation:**
`server_tokens off;` in nginx to hide it.

> The `nginx-eol` template may flag *mainline* nginx branches as EOL; treat it as
> a prompt to check <https://endoflife.date/nginx>, not as a fact.

### 3. False WAF detection (2) — *`waf-detect` / `waf-fuzz`*

Nuclei sent `POST /` with SQLi/XSS payloads; nginx answered `405 Not Allowed`
with its default error page. The generic `nginxgeneric` signature made the
template read that as a present WAF. **There is no WAF**: it is nginx itself
rejecting the POST method on a static resource. **False positive.**

## Relation to the code

- `nginx.conf` — lines 18–20 (headers) and 61–63 (`location = /index.html`) are
  the origin of finding 1.
- `Dockerfile` — defines the nginx base whose banner appears in finding 2.

## Recommendations

1. Fix the `add_header` inheritance so CSP/X-Frame-Options/etc. reach
   `/index.html` and `/assets/`.
2. Add CSP, `X-Permitted-Cross-Domain-Policies`, `Permissions-Policy`, and the
   missing COOP/COEP/CORP headers.
3. `server_tokens off;` to hide the nginx version.
4. HSTS only if the site is ever served over HTTPS.

## Notice

Run active scans only against systems you own or are authorized to test. This
analysis was limited to a local lab environment.
