#!/usr/bin/env bash
# Trigger the "Deploy test-app to GitHub Pages" workflow and tail it to completion.
#
# Prerequisites (one-time):
#   1. Push this repo to GitHub as a public repository.
#   2. In the repo settings, go to: Settings -> Pages -> Build and deployment.
#      Set "Source" to "GitHub Actions".
#   3. Install + auth the GitHub CLI: https://cli.github.com/  ->  `gh auth login`
#
# Usage:
#   ./deploy.sh           # deploy from the current branch
#   ./deploy.sh main      # deploy from a specific branch

set -euo pipefail

WORKFLOW="deploy-test-app.yml"
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: GitHub CLI ('gh') is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: not logged in to gh. Run: gh auth login" >&2
  exit 1
fi

echo "Triggering ${WORKFLOW} on branch ${BRANCH}..."
gh workflow run "$WORKFLOW" --ref "$BRANCH"

# Give GitHub a moment to register the run, then find its ID.
sleep 3
RUN_ID=""
for _ in 1 2 3 4 5; do
  RUN_ID="$(gh run list \
    --workflow="$WORKFLOW" \
    --branch="$BRANCH" \
    --limit=1 \
    --json databaseId \
    --jq '.[0].databaseId' || true)"
  if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
    break
  fi
  sleep 2
done

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "Workflow dispatched, but no run ID was found yet. Check: gh run list --workflow=$WORKFLOW"
  exit 0
fi

echo "Watching run #${RUN_ID}..."
gh run watch "$RUN_ID" --exit-status
