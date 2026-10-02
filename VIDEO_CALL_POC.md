# LiveKit Video Calling POC (frontend-only)

## Setup

```bash
npm install
cp .env.example .env.local
# fill LiveKit values from LiveKit Cloud
npm run dev
```

Open: [http://localhost:3000/video-call](http://localhost:3000/video-call)

---

## Environment variables

| Variable | Client? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_LIVEKIT_URL` | Yes | LiveKit WebSocket URL, e.g. `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | **No** | API key from LiveKit Cloud (server-only) |
| `LIVEKIT_API_SECRET` | **No** | API secret from LiveKit Cloud (server-only) |

Secrets are used only inside `src/app/api/livekit-token/route.ts` to mint short-lived JWTs. They are never exposed as `NEXT_PUBLIC_*`.

---

## LiveKit Cloud setup

1. Create a project at [https://cloud.livekit.io](https://cloud.livekit.io).
2. Open **Settings → Keys**.
3. Copy **WebSocket URL**, **API Key**, and **API Secret** into `.env.local`.
4. Restart `npm run dev`.

---

## Running the POC

1. Start Next.js: `npm run dev`
2. Open `/video-call`
3. Enter a participant name and room (e.g. `demo-room`)
4. Click **Join Call**
5. Allow camera/microphone when the browser prompts

---

## Two-user testing (same machine)

| Browser | Name | Room |
|---|---|---|
| Chrome | Alice | `demo-room` |
| Chrome Incognito / Firefox | Bob | `demo-room` |

Both users should see and hear each other.

---

## Testing from another computer

Camera/mic on a remote device require **HTTPS**.

### Quick tunnel (local dev)

```bash
cloudflared tunnel --url http://localhost:3000
```

Open the printed `https://….trycloudflare.com/video-call`.

### Deploy to Netlify (share a stable HTTPS link)

**GitHub Pages will not work** — this POC needs a server route (`/api/livekit-token`).

1. Push this repo to **public GitHub** (do not commit `.env.local`).
2. [Netlify](https://app.netlify.com) → **Add site** → **Import from Git**.
3. Add environment variables in Netlify:
   - `NEXT_PUBLIC_LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
4. Deploy → share `https://your-site.netlify.app/video-call`.

`netlify.toml` is included for Next.js.

```text
Phone A ──HTTPS──► Netlify (Next.js + token API)
Phone B ──HTTPS──► Netlify
           │
           ▼
      LiveKit Cloud
```

`localhost` is fine for local-only tests.

---

## Known limitations (intentional)

* Frontend-only POC — no NestJS / PostgreSQL / Redis / AWS for calls
* Token minting uses a thin Next.js route (not production auth)
* No persistent call history or recordings
* No transcription / AI summary
* No production RBAC / tenant checks on tokens
* Rooms are open to anyone who knows the room name while the Next.js app is running

---

## Production architecture (target)

```text
Next.js
   │
   ▼
NestJS
   │
   ├── Authentication
   ├── Authorization / RBAC
   ├── Generate short-lived LiveKit token
   ├── Call / room management
   └── Webhooks (participant events)
          │
          ▼
     LiveKit Cloud
          │
       WebRTC media
```

Do **not** put `LIVEKIT_API_SECRET` in client bundles or `NEXT_PUBLIC_*` variables.

---

## Packages

* `@livekit/components-react`
* `livekit-client`
* `livekit-server-sdk` (server route only)
