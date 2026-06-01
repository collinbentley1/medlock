#!/usr/bin/env bash
set -euo pipefail

if [ "${PLATFORM_DEPLOY_ENVIRONMENT}" = "preview" ]; then
  echo "flags=--set-env-vars=WAITLIST_BACKEND=memory,MEDLOCK_VERSION=preview-pr-${PLATFORM_PREVIEW_NUMBER}" >> "$GITHUB_OUTPUT"
else
  echo "flags=" >> "$GITHUB_OUTPUT"
fi
