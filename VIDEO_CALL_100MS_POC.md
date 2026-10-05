# 100ms Video Calling POC (frontend-only)

Side-by-side with the LiveKit POC at `/video-call`. Same Netlify deploy; separate token API.

## Setup

```bash
npm install
cp .env.example .env.local
# add 100ms credentials from https://dashboard.100ms.live → Developer
npm run dev
```

Open: [http://localhost:3000/video-call-100ms](http://localhost:3000/video-call-100ms)

---

## Environment variables

| Variable | Client? | Purpose |
|---|---|---|
| `HMS_ACCESS_KEY` | **No** | App Access Key (100ms Dashboard → Developer) |
| `HMS_SECRET` | **No** | App Secret (server-only) |
| `HMS_DEFAULT_ROLE` | **No** | Optional default role when join form omits role (default `host`) |

LiveKit variables are unchanged; both POCs can run on one deployment.

---

## 100ms Dashboard setup

1. Create an app/template at [100ms Dashboard](https://dashboard.100ms.live).
2. Ensure a role such as **`host`** can publish audio and video (Template → Roles).
3. Copy **App Access Key** and **App Secret** into `.env.local` as `HMS_ACCESS_KEY` and `HMS_SECRET`.
4. Restart `npm run dev`.

The token route creates or reuses a room by **name** (same idea as LiveKit room names).

---

## Deploy with LiveKit (Netlify)

Add to **Site configuration → Environment variables** (same site as LiveKit):

- `HMS_ACCESS_KEY`
- `HMS_SECRET`
- `HMS_DEFAULT_ROLE` (optional, e.g. `host`)

URLs after deploy:

- LiveKit: `https://<site>.netlify.app/video-call`
- 100ms: `https://<site>.netlify.app/video-call-100ms`

GitHub Actions workflow (`.github/workflows/deploy-netlify.yml`) deploys both routes in one build.

---

## Packages

- `@100mslive/react-sdk` (requires `legacy-peer-deps` with React 19 — see `.npmrc`)
- `@100mslive/server-sdk` (token + room create on `/api/hms-token`)

---

## Production target (same as LiveKit)

```text
Next.js → NestJS (auth, RBAC) → mint 100ms auth token + room policy → 100ms Cloud
```

Do not expose `HMS_SECRET` in the client.
