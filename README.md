# Pebble Index → Notion

Create a new Notion database page for every transcript recorded with a Pebble
Index 01.

This is a Notion Worker, so there is no server or hosting account to maintain.
The Worker runs in Notion and writes the full transcript into your chosen
database.

## Set it up with a coding agent

Open any coding agent and paste:

> Set up Pebble Index 01 so every transcript creates a new page in a Notion
> database. Use
> https://github.com/colebemis/pebble-index-notion as the template. Fetch the
> repository yourself, read and follow its `AGENTS.md`, and complete the entire
> setup, including dependencies, Notion configuration, deployment, a test
> webhook, and verification that the test page was created. Ask me only when
> you need authorization or information you cannot retrieve. Never ask me to
> paste a secret into chat. When you finish, give me the webhook URL to paste
> into Pebble and the exact remaining steps in the Pebble app.

You do not need to clone or open this repository first. The agent should create
its own local working copy and finish by giving you the webhook URL to paste
into Pebble.

## What it creates

- Page title: the first non-empty line of the transcript, limited to 80
  characters.
- Page body: the complete transcript.

The destination database needs no custom properties. Its normal title property
is enough.

## Manual setup

Requirements:

- Node.js 22 or newer.
- npm 10.9.2 or newer.
- The `ntn` CLI.
- A Notion database.
- An internal Notion integration with access to that database.

```sh
curl -fsSL https://ntn.dev | bash
npm install
cp .env.example .env
```

Set `NOTION_API_TOKEN` and `NOTION_DATABASE_ID` in `.env`. You may also set
`PEBBLE_WEBHOOK_SECRET`.

```sh
npm test
npm run check
NOTION_KEYRING=0 ntn login
NOTION_KEYRING=0 ntn workers deploy
NOTION_KEYRING=0 ntn workers env push
NOTION_KEYRING=0 ntn workers webhooks list --plain
```

Treat the generated webhook URL like a password.

In the Pebble app, set your Index Agent destination to the generated webhook
URL and choose **Transcription**. If you configured `PEBBLE_WEBHOOK_SECRET`,
add:

```text
Authorization: Bearer <your secret>
```

## Test

Replace `WEBHOOK_URL` and, if configured, `PEBBLE_WEBHOOK_SECRET`:

```sh
curl --fail-with-body --request POST "$WEBHOOK_URL" \
  --header "Authorization: Bearer $PEBBLE_WEBHOOK_SECRET" \
  --form "recordedAt=$(date +%s000)" \
  --form "client=ring" \
  --form "transcription=<fixtures/transcription-only.txt"
```

Then inspect the latest run:

```sh
NOTION_KEYRING=0 ntn workers runs list
```

## Privacy and security

- Transcript text is sent only to your Notion Worker and Notion workspace.
- Transcript text is not written to Worker logs.
- The Worker ignores audio.
- The Worker webhook URL contains a secret.
- An optional bearer secret adds another check before processing a request.
