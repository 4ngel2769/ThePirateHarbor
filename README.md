<div align="center">
	<img src="./static/github-banner.svg" alt="ThePirateHarbor — a quiet place to find the signal" width="100%" />
</div>

# ThePirateHarbor

A compact, invite-only torrent metadata index built with SvelteKit, Svelte 5, Bun, and SQLite.

[Browse the repository](https://github.com/4ngel2769/ThePirateHarbor) · [Report an issue](https://github.com/4ngel2769/ThePirateHarbor/issues)

## What it is

ThePirateHarbor is a fast, table-first index for discovering torrent metadata. It stores magnet links and `.torrent` metadata; it does not host torrent payloads or act as a public BitTorrent tracker.

## Highlights

- Dense browse view with search, categories, tags, sorting, and pagination
- Invite-only registration with single-use, expiring links
- User, moderator, and administrator roles
- Comments, reports, moderation queue, audit history, and DMCA intake
- Configurable upload limits and site settings
- Deterministic blobatar.dev profile avatars
- Light and dark themes with compact, readable typography
- Opt-in browser WebTorrent discovery with an explicit stop control

## Stack

- SvelteKit 2 and Svelte 5
- Bun runtime, package manager, test runner, and build server
- SQLite through `bun:sqlite`
- `parse-torrent` for metadata parsing
- WebTorrent for opt-in browser peer discovery
- Blobatar.dev for generated avatars

## Quick start

Requires Bun.

```sh
bun install
bun run dev
```

Open the local URL and complete the first-run setup wizard. The database is created at `data/thepirateharbor.sqlite` and is ignored by Git.

## Commands

```sh
bun test          # focused server and validation tests
bun run check     # Svelte and TypeScript diagnostics
bun run lint      # Prettier and ESLint
bun run build     # production Bun build
bun run start     # serve the production build
```

## Configuration

Non-secret defaults live in [`config/admin.json`](./config/admin.json). Administrators can store validated overrides in SQLite from the admin panel.

Copy [`.env.example`](./.env.example) to `.env` for local configuration. For public deployment, use a private persistent volume for `DATABASE_PATH`, terminate TLS at a trusted reverse proxy, set a canonical HTTPS `ORIGIN`, and configure forwarded client-address headers only behind that proxy.

```sh
bun run build
bun run start
```

## Project map

```text
config/                 checked-in defaults
scripts/                production start wrapper
src/lib/server/         database, auth, config, catalog, moderation
src/lib/components/     shared UI and WebTorrent panel
src/routes/             pages and server actions
static/                 logos, banner, and robots policy
```

## Security notes

- Registration is invite-only by default.
- Passwords use Argon2id; session and invite tokens are stored hashed.
- User content is rendered as text; no raw HTML rendering is used.
- `.torrent` payloads are metadata only and are served only to authenticated users.
- WebTorrent participation is opt-in and can expose a browser IP address to peers and trackers.
- The first-run setup route must be completed privately before exposing a new instance publicly.

## License

MIT — see [`LICENSE`](./LICENSE) for the full terms.
