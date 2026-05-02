---
name: AI Gateway Configuration
description: Cloudflare AI Gateway for Gemma, Llama, Mistral models
type: project
---

**AI Gateway URL:** `https://gateway.ai.cloudflare.com/v1/{account_id}/aethera-gateway`

**Configured Models:**
- `AI_GEMMA_MODEL=@cf/google/gemma-7b-it`
- `AI_LLAMA_MODEL=@cf/meta/llama-3.1-70b-instruct`
- `AI_MISTRAL_MODEL=@cf/mistral/mistral-7b-instruct-v0.1`
- `AI_EMBEDDING_MODEL=@cf/huggingface/nomic-embed-text-v1.5`

**AI Features (Phase 6):**
- Lead scoring model training
- Sentiment analysis on emails/calls
- Email drafting assistant
- Smart search with embeddings
- Call transcription and summaries

**Why:** Cloudflare AI Gateway provides serverless AI inference with global distribution.

**How to apply:** AI features use the gateway with configured model names from `.env`.
