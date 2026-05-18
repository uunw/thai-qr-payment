---
title: For LLMs
description: Plain-text dumps of every documentation page in formats designed for LLM ingestion.
---

`thai-qr-payment` ships three plain-text mirrors of this documentation site for use by large language models. They follow the [llms.txt](https://llmstxt.org) proposal and are emitted on every docs build by [`starlight-llms-txt`](https://delucis.github.io/starlight-llms-txt/).

| Endpoint                             | Purpose                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [`/llms.txt`](/llms.txt)             | Short index file. Links to the two longer dumps. Drop into an LLM's context to give it an entry-point to the rest. |
| [`/llms-full.txt`](/llms-full.txt)   | Full plain-text dump of every doc page. ~4.6k lines. Good when the model has a large context window.               |
| [`/llms-small.txt`](/llms-small.txt) | Abridged variant. Notes, tips, and the live demo page are stripped so the file fits in smaller context windows.    |

## How to use

Paste the URL into ChatGPT, Claude, or Gemini as a source. Or fetch programmatically:

```bash
curl https://thai-qr-payment.js.org/llms.txt
curl https://thai-qr-payment.js.org/llms-full.txt
```

The three files regenerate on every push to `main`, so they stay in sync with the published docs site.
