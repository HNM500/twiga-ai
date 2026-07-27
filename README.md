# Twiga AI

[Twiga AI](https://twiga.ai) is an AI chat companion built for Tanzania. The current MVP provides direct chat and Exa-backed cited web search, with model requests routed through OpenRouter.

This public web application is derived from [Scira](https://github.com/zaidmukaddam/scira) at commit `7215d53023030e247dfc30ffc2ffe44257094f69`. Twiga AI and Scira are licensed under the [GNU Affero General Public License v3.0](LICENSE). See [UPSTREAM.md](UPSTREAM.md) for provenance.

The approved logo, palette, typography, language, and usage rules are recorded in [docs/BRAND.md](docs/BRAND.md).

## Current product surface

- Guest AI chat
- Cited web search through Exa
- Reviewed Tanzanian bank discovery through the private Twiga Core directory
- Saved chats, temporary chats, public sharing and PDF/DOCX export
- OpenRouter model routing and usage-cost accounting
- Better Auth with PostgreSQL-backed accounts, sessions, account export and deletion
- Railway Redis-backed anonymous rate limits, resumable streams and Twiga Apps confirmation handoffs
- Feature-gated Twiga Apps (MCP) beta with encrypted credentials and outbound-network safeguards
- Feature-gated YouTube search retained for later validation
- Railway deployment with database migrations and health checks
- Structured operational events for request errors, AI latency, token usage and model cost

## Model portfolio

Twiga keeps model selection server-side and exposes one product identity to users:

- DeepSeek V4 Flash handles everyday chat and cited-search synthesis
- GPT-OSS 20B handles low-cost utility work such as titles, follow-ups and prompt enhancement
- GLM 5.2 handles requests that explicitly require deep analysis, complex comparisons or business/decision planning
- The chat-versus-web decision remains deterministic and incurs no model call

OpenRouter provider routing uses fallbacks. User-facing and hard-reasoning calls prefer lower latency, while utility calls prefer lower price. Routine companion reasoning is disabled so tool calls and visible answers are not displaced by hidden reasoning; the dedicated hard-reasoning tier retains a bounded budget.

Google sign-in, Twiga Apps and YouTube search are disabled by default until their readiness checks and credentials are complete. The directory MVP currently covers reviewed Bank of Tanzania-listed institutions; IT companies, business claims, paid verification and payments remain later phases.

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
TWIGA_CORE_URL=http://twiga-core:4000
TWIGA_CORE_ASSERTION_SECRET=use-the-same-32-character-or-longer-secret-as-twiga-core
```

The model portfolio has production-safe defaults and can be overridden without a code change:

```dotenv
OPENROUTER_SEARCH_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_DEFAULT_MODEL=openai/gpt-oss-20b
OPENROUTER_ROUTER_MODEL=openai/gpt-oss-20b
OPENROUTER_REASONING_MODEL=z-ai/glm-5.2
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

This repository is the public AGPL Twiga Web application. Its server-only directory tool calls a narrow signed Twiga Core API. Canonical matching, evidence, review, publication, business claims, verification, billing and entitlement logic remain in the separate private service.

## License

GNU Affero General Public License v3.0. Anyone interacting with a modified network deployment must be offered the corresponding source code for that deployed version.
