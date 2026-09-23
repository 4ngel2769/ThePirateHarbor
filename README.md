# ThePirateHarbor

A compact, invite-only torrent metadata index built with SvelteKit, Svelte 5, Bun, and SQLite.

## Features

- Dense torrent browsing with search, categories, tags, sorting, and pagination
- `.torrent` metadata and magnet submissions with configurable upload limits
- Single-use, expiring invitation links
- Argon2id password hashing, hashed session tokens, secure cookies, and role-based access
- User profiles with deterministic blobatar.dev avatars
- Comments, reports, moderation queue, audit logs, and DMCA intake
- Admin configuration panel with checked-in JSON defaults and SQLite overrides
- Opt-in browser WebTorrent peer discovery with explicit stop and privacy warning
- Light and dark themes with a compact, readable table-first interface

## Development

```sh
bun install
bun run dev
```

Open the local URL and complete the first-run setup wizard. The SQLite database is created at `data/thepirateharbor.sqlite` and is ignored by Git.

## Verification

```sh
bun test
bun run check
bun run lint
bun run build
```

## Production

Set `BODY_SIZE_LIMIT` above the largest configured `.torrent` upload, and set `ORIGIN` to the public HTTPS origin. `bun run start` supplies a 12 MiB default body limit for the built Bun server.

```sh
bun run build
bun run start
```

When deploying behind a trusted reverse proxy, configure the adapter's `ADDRESS_HEADER` and `XFF_DEPTH` only for headers set by that proxy. Do not trust forwarded host or client-IP headers directly from the public internet.

The current database layer is deliberately SQLite-first. PostgreSQL migration should happen when concurrent writers, horizontal scaling, or managed database availability becomes a requirement; do not run both databases as a speculative dual-write system.
