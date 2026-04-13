#!/bin/sh
set -eu

REPO_PATH=${OPENCLAW_GIT_WORKFLOW_REPO:-/home/node/repos/openclaw-git-workflow}
BRANCH_NAME=${1:-}

if [ -z "$BRANCH_NAME" ]; then
  echo "branch name is required" >&2
  exit 1
fi

case "$BRANCH_NAME" in
  feat/*|fix/*|docs/*|refactor/*|chore/*|test/*|build/*|ci/*) ;;
  *)
    echo "unsafe or malformed branch name: $BRANCH_NAME" >&2
    exit 1
    ;;
esac

cd "$REPO_PATH"

git rev-parse --verify HEAD >/dev/null 2>&1

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "branch already exists: $BRANCH_NAME"
  exit 0
fi

git checkout -b "$BRANCH_NAME"
echo "created branch: $BRANCH_NAME"
