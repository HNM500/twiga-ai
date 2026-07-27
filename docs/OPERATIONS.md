# Twiga Web Operations

## Uptime

- Railway checks `/api/health` during each deployment. The endpoint verifies PostgreSQL and returns the configured source revision.
- `.github/workflows/production-smoke.yml` checks the production domain every 15 minutes.
- The smoke suite covers health, home, About, Terms, Privacy and anonymous auth-session lookup.
- A failed scheduled workflow is the initial uptime alert. Configure GitHub Actions notification routing for the operating team before external launch.

## Error reporting

Twiga writes JSON operational events to standard output/error. Railway captures these centrally. Server-render and route failures are recorded by the Next.js instrumentation hook; client global-render failures are sent to the narrow `/api/telemetry/client-error` endpoint.

Events intentionally omit prompt bodies, response bodies, email addresses, user identifiers and IP addresses. Search Railway logs by the `event` field:

- `unhandled_request_error`
- `client_render_error`
- `search_stream_failed`
- `ai_generation_failed`
- `health_check_failed`

## AI usage and cost

OpenRouter usage accounting is enabled for every configured Twiga model alias. A successful or aborted generation emits:

- model and provider model
- chat or web mode
- duration
- input, output and total tokens
- OpenRouter-reported USD cost
- tool-call count
- finish reason

Search Railway logs for `ai_generation_completed` and `ai_generation_aborted`. Costs are provider-reported operational figures, not customer billing records.

The current routing policy is:

- `OPENROUTER_SEARCH_MODEL`: normal chat and cited-search synthesis; defaults to DeepSeek V4 Flash with routine reasoning disabled so web mode reliably emits its required search tool call
- `OPENROUTER_DEFAULT_MODEL`: titles, follow-ups and prompt enhancement; defaults to GPT-OSS 20B
- `OPENROUTER_REASONING_MODEL`: explicit deep analysis, comparative decisions and complex planning; defaults to GLM 5.2
- `OPENROUTER_ROUTER_MODEL`: retained compatibility slot for Scira's dormant LLM router; the active chat/web router is deterministic

Monitor model-tier decisions in the search request log and confirm the final upstream model in `ai_generation_completed`. OpenRouter provider availability, price and latency vary, so compare p50/p95 latency and cost by provider model rather than relying only on the configured alias.

## Release verification

Each deployment sets:

- `SOURCE_REVISION` to the Git commit SHA
- `NEXT_PUBLIC_SOURCE_URL` to `https://github.com/HNM500/twiga-ai/tree/<commit>`

After deployment:

```bash
bun run smoke:production
```

Then inspect recent Railway errors and the latest `ai_generation_completed` event after exercising one chat and one cited-search request.
