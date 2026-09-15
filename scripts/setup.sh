#!/usr/bin/env bash
set -euo pipefail

if ! command -v ntn >/dev/null 2>&1; then
	echo "The Notion CLI is required."
	echo "Install it with: curl -fsSL https://ntn.dev | bash"
	exit 1
fi

if [[ -z "${NOTION_SETUP_TOKEN:-}" ]]; then
	echo
	echo "Create a Notion personal access token:"
	echo "https://www.notion.so/profile/integrations"
	echo
	echo "Enable both capabilities:"
	echo "  • Notion API"
	echo "  • Workers"
	echo
	read -r -s -p "Paste the token here (input is hidden): " NOTION_SETUP_TOKEN
	echo
	export NOTION_SETUP_TOKEN
fi

cleanup() {
	unset NOTION_SETUP_TOKEN
}
trap cleanup EXIT

npx tsx scripts/setup.ts