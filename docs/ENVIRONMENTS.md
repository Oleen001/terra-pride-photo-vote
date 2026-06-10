# Running And Deploying

## Local

Use `.env.local` or `.env.development.local` for secrets. These files are ignored by git.

```bash
cp .env.example .env.local
npm run dev
```

The dev server binds to `0.0.0.0`, so another device on the same Wi-Fi can open:

```txt
http://YOUR_MAC_IP:3000
```

Find the Mac IP with `ipconfig getifaddr en0`.

## Production

Production remains `render.yaml`:

- service: `terra-pride-photo-vote`
- branch: `main`
- build: `npm ci && npm run build`
- start: `npm start`

Deploy by pushing to the branch connected to the Render production service.

## Temporary External Preview

For a quick one-off preview from the local machine, use a tunnel such as Cloudflare Tunnel or ngrok against `localhost:3000`.
