# Pebble Index → Notion

This repository is a ready-to-deploy Notion Worker. It receives transcription
webhooks from a Pebble Index 01 and creates one Notion database page per
transcript.

## Goal

Set the project up end to end for the user. Do not stop after editing code.
Install dependencies, run the checks, deploy the Worker, send a test webhook,
and verify that the page was created in Notion.

## Safety

- Never print, log, commit, or paste secrets into chat.
- Put local secrets in `.env`; it is ignored by Git.
- Do not log transcript content.
- Treat the Worker webhook URL as a secret.
- Ask the user only for authorization or information you cannot retrieve.

## Required configuration

- `NOTION_API_TOKEN`: an internal Notion integration token.
- `NOTION_DATABASE_ID`: the destination database ID.
- `PEBBLE_WEBHOOK_SECRET`: optional. When set, Pebble must send it as
  `Authorization: Bearer <secret>`.

The integration must have access to the destination database.

## Setup

1. Confirm Node.js 22+ and npm 10.9.2+ are installed.
2. If `ntn` is unavailable, install it with
   `curl -fsSL https://ntn.dev | bash`.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and populate the required values without
   exposing them in chat or logs.
5. Run `npm test` and `npm run check`.
6. Run `NOTION_KEYRING=0 ntn login` if the user is not already logged in.
7. Run `NOTION_KEYRING=0 ntn workers deploy`.
8. Push configuration with `NOTION_KEYRING=0 ntn workers env push`.
9. Run `NOTION_KEYRING=0 ntn workers webhooks list --plain` and capture the
   `createNotionPage` URL without publishing it.
10. Send `fixtures/transcription-only.txt` as a multipart webhook test. Include
   the optional bearer secret if configured.
11. Inspect the latest run with `ntn workers runs list` and
    `ntn workers runs logs <run-id>`.
12. Verify that the test page exists in the destination database.
13. Tell the user exactly where to paste the webhook URL in Pebble and remind
    them to choose **Transcription** rather than audio-only delivery.

## Development

- `npm test`: run behavior tests.
- `npm run check`: type-check without emitting files.
- `npm run build`: compile to `dist/`.

The Pebble request is multipart form data with:

- `recordedAt`: Unix time in milliseconds.
- `client`: `ring`.
- `transcription`: transcript text.
- `audio`: optional MP4 audio. This Worker intentionally ignores audio.

Keep the database requirement minimal: every Notion database already has one
title property, and the Worker addresses it by property ID `title`.
