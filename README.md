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
> setup. Ask whether I want to create a new “Pebble Notes” database or use an
> existing database. Recommend the new database, but support either choice.
> Have me enter secrets only through a hidden terminal prompt—never ask me to
> paste one into chat. Run the tests, deploy the Worker, send a test webhook,
> and verify that the test page was created. When you finish, help me paste the
> webhook URL into Pebble and complete the exact remaining steps in the app.

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

The guided setup requires one Notion personal access token with both
**Notion API** and **Workers** enabled. The token is entered through a hidden
terminal prompt and stored directly in the deployed Worker.

The setup then asks whether to:

- create a private **Pebble Notes** database automatically, or
- use an existing database by pasting its Notion link.

Requirements:

- Node.js 22 or newer.
- npm 10.9.2 or newer.
- The `ntn` CLI.

```sh
npm install
npm test
npm run check
npm run setup
```

If `ntn` is unavailable, install it first with:

```sh
curl -fsSL https://ntn.dev | bash
```

The setup script deploys the Worker, configures its secrets, sends a test
transcript, verifies the resulting Notion page, and prints the webhook URL.
Treat that URL like a password. In Pebble, use it as the Index Agent destination
and choose **Transcription**.

## Privacy and security

- Transcript text is sent only to your Notion Worker and Notion workspace.
- Transcript text is not written to Worker logs.
- The Worker ignores audio.
- The Worker webhook URL contains a secret.
- An optional bearer secret adds another check before processing a request.
