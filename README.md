# Twiga AI

[Twiga AI](https://twiga.ai) is an AI chat companion built for Tanzania. The current MVP provides direct chat and Exa-backed cited web search, with model requests routed through OpenRouter.

This public web application is derived from [Scira](https://github.com/zaidmukaddam/scira) at commit `7215d53023030e247dfc30ffc2ffe44257094f69`. Twiga AI and Scira are licensed under the [GNU Affero General Public License v3.0](LICENSE). See [UPSTREAM.md](UPSTREAM.md) for provenance.

## Current product surface

- Guest AI chat
- Cited web search through Exa
- Saved chats, temporary chats, public sharing and PDF/DOCX export
- OpenRouter model routing and usage-cost accounting
- Better Auth with PostgreSQL-backed accounts, sessions, account export and deletion
- Railway Redis-backed anonymous rate limits, resumable streams and Twiga Apps confirmation handoffs
- Feature-gated Twiga Apps (MCP) beta with encrypted credentials and outbound-network safeguards
- Feature-gated YouTube search retained for later validation
- Railway deployment with database migrations and health checks
- Structured operational events for request errors, AI latency, token usage and model cost

Google sign-in, Twiga Apps and YouTube search are disabled by default until their readiness checks and credentials are complete. The Tanzanian business directory, business claims, verification and payments are intentionally deferred.

## Required environment variables

```dotenv
OPENROUTER_API_KEY=
EXA_API_KEY=
DATABASE_URL=
REDIS_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOURCE_URL=https://github.com/HNM500/twiga-ai
SOURCE_REVISION=local
```

Google OAuth variables are optional until sign-in is enabled:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

Twiga Apps and YouTube are retained behind disabled flags:

```dotenv
NEXT_PUBLIC_MCP_ENABLED=false
MCP_CREDENTIALS_ENCRYPTION_KEY=
MCP_OAUTH_CALLBACK_ORIGIN=http://localhost:3000
NEXT_PUBLIC_YOUTUBE_ENABLED=false
SUPADATA_API_KEY=
```

Do not enable Twiga Apps without Railway Redis, a stable encryption key of at least 32 characters and a correct public HTTPS OAuth callback origin. The server rejects private, local and link-local MCP destinations in production. See `SCIRA_FEATURE_AUDIT.md` for the launch gate.

## Local development

From the workspace root, run PostgreSQL and Redis, apply migrations, and start the application:

```bash
docker compose up -d postgres redis
docker compose run --rm migrate
cd scira
bun install
bun run dev
```

The application is available at `http://localhost:3000`.

## Validation

```bash
bun run lint
bun run typecheck
bun run build
bun run smoke:production
```

ESLint uses the flat configuration in `eslint.config.mjs`. Existing inherited React Compiler and cleanup findings remain visible as warnings while correctness-critical lint rules remain merge-blocking errors.

`smoke:production` targets `https://twiga.ai` by default. Set `APP_URL` to test another deployment.

## Deployment

`railway.json` configures the Docker build, pre-deploy migration, health check and restart policy. Production secrets belong in Railway service variables and must not be committed.

The application exposes the exact deployed source revision through `NEXT_PUBLIC_SOURCE_URL`. Set it to the public commit URL used for a release, and set `SOURCE_REVISION` to the same commit SHA.

## Architecture boundary

This repository is the public AGPL Twiga Web application. Future directory, business-claim, verification, billing and entitlement services remain separate and communicate through narrow versioned APIs.

## License

GNU Affero General Public License v3.0. Anyone interacting with a modified network deployment must be offered the corresponding source code for that deployed version.
