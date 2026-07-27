# Twiga companion evaluation suite

The corpus covers English and Kiswahili conversation, Tanzania-aware answers, current-information routing, local discovery, government guidance, citations, and high-stakes safety.

Run the deterministic router suite on every change:

```bash
bun run test
bun run eval:companion
```

Run live evaluations against a local or deployed Twiga instance only when a small amount of OpenRouter and search-provider usage is acceptable:

```bash
APP_URL=http://localhost:3000 bun run eval:companion:live --limit=5
APP_URL=http://localhost:3000 bun run eval:companion:live --id=web-forex
```

The live runner records route accuracy, required-content checks, citations, a basic unsafe-claim guard, first-token and total latency, token counts, and estimated cost. Set `EVAL_INPUT_USD_PER_MILLION` and `EVAL_OUTPUT_USD_PER_MILLION` to the selected OpenRouter model's current rates when cost estimates are required. Add `--output=evals/results/local.json` to save a report; do not commit reports containing answer text without reviewing them first.

Automated scores are regression signals, not a substitute for Tanzanian reviewer judgement. Review failures in Kiswahili naturalness, Mainland/Zanzibar distinctions, government-source authority, and medical or financial caution before release.
