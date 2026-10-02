# MESSE·V Dual POC (Next.js)

Next.js App Router port of `virtual-trade-show-interactive-demo.html` — both POC paths in standard React/TypeScript structure.

## POCs

| Route | Description |
|-------|-------------|
| `/` | Lobby — choose POC 1 or POC 2 |
| `/hall/flat` | **POC 1** — 2D Nexus floor, WASD, socket avatars, proximity booth entry |
| `/hall/threejs` | **POC 2** — same hall with copper theme |
| `/booth/flat/[stallId]` | Illustrated SVG booth (click zones, viewBox zoom) |
| `/booth/threejs/[stallId]` | Three.js FPP booth with raycast hotspots |

## Stack

- **Next.js 16** (App Router, `src/` directory)
- **React 19** + **TypeScript**
- **Three.js** + **GSAP** (booth animations)
- Simulated WebSocket presence (`src/lib/socket/dummy-socket.ts`)

## Project structure

```
src/
  app/                    # Routes (lobby, hall, booth)
  components/
    hall/                 # Hall map UI + CSS module
    booth/                # FlatBooth, ThreeBooth, BoothScreen
    lobby/                # Lobby entry cards
    layout/               # Topbar
    providers/            # Toast
  data/                   # Stalls, aisles, booth assets
  hooks/                  # useHallEngine (movement, socket, map)
  lib/
    hall/                 # Geometry + map fit math
    booth/                # Three.js booth engine
    socket/               # Dummy socket
  types/                  # Shared TypeScript types
```

## Run locally

```bash
cd messe-v-dual-poc
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy (Netlify)

**GitHub Pages cannot host this app** — LiveKit tokens are minted on `/api/livekit-token` (server route). Use **Netlify** with the included `netlify.toml` and `@netlify/plugin-nextjs`.

1. Push this folder to a **public GitHub** repo (never commit `.env.local`; copy names from `.env.example`).
2. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project** → pick the repo.
3. **Site configuration → Environment variables** — add:
   - `NEXT_PUBLIC_LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET` (full secret from LiveKit Cloud, not masked)
4. Deploy, then test: `https://<your-site>.netlify.app/video-call`

See `VIDEO_CALL_POC.md` for LiveKit setup and two-device testing.

## Notes

- The original HTML demo at `:4173` is unchanged — this is a separate Next.js app.
- Replace `DummySocket` internals with a real WebSocket when the backend is ready.
- `messe-v-poc/` is a different, older Next.js experiment in the same repo.
