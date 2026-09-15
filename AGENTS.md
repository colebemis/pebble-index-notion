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
- Have the user enter their token only in the hidden `npm run setup` prompt.
- Do not log transcript content.
- Treat the Worker webhook URL as a secret.
- Ask the user only for authorization or information you cannot retrieve.

## Guided setup

The default path uses one Notion personal access token with both **Notion API**
and **Workers** capabilities. It acts as the user and does not require manually
connecting an integration to the destination database.

Run `npm run setup`. It asks the user:

1. To create and securely enter the personal access token.
2. Whether to create a new **Pebble Notes** database or use an existing one.

Recommend creating a new database, but always present both choices. For an
existing database, ask for its Notion link rather than a raw ID.

The setup script runs checks, creates or verifies the database, deploys the
Worker, stores its environment variables, sends a test transcript, verifies
the resulting page, and prints the Pebble webhook URL. Do not recreate those
steps manually unless the script reports a specific failure.

If the workspace prevents the user from creating a personal access token with
Notion API access, fall back to an internal integration. In that fallback only,
ask the user to connect the integration to the destination database.

`PEBBLE_WEBHOOK_SECRET` remains an optional advanced setting. Do not add it
during the default setup because the generated Worker webhook URL already acts
as a secret.

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
