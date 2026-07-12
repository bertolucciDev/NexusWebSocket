# nexus-ws

WebSocket-only notification server for **Nexus Launcher**.

This is **not** the full backend API — it's a separate process that only handles real-time notifications (friend requests, room invites, room updates) via Socket.IO.

The REST API (auth, rooms, friends CRUD) lives at a different host (Vercel) and shares the same JWT secret with this service.
---

## Deploy on Render

1. Go to https://dashboard.render.com/blueprints
2. Connect this repo (`bertolucciDev/NexusWebSocket`)
3. Render autodetects `render.yaml` and creates a `Web Service` named `nexus-ws`
4. Set environment variables in the new service's dashboard:
   - `JWT_SECRET` = same one used by the REST backend on Vercel

After deploy, the URL will be something like `https://nexus-ws.onrender.com`.

This URL must be configured as `WsUrl` in `NexusApiService.cs` on the launcher.

---

## Local development

```bash
npm install
JWT_SECRET=dev-secret npm run dev
```

Server listens on `PORT` (default `3001`) and serves:
- `GET /health` — healthcheck (used by Render)
- WS (Socket.IO) on the same port

---

## Notifications emitted

- `friend_request_received` — when someone sends you a friend invite
- `friend_request_accepted` / `friend_request_rejected` — friend response
- `friend_removed` — when a friend removes you
- `room_invite_received` — invited to a room
- `room_invite_accepted` / `room_invite_declined` — invite response
- `room_updated` — member joined/left or settings changed
- `room_closed` — host closed the room
