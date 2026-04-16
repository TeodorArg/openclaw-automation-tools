#!/bin/sh
set -eu

REPO_PATH=${OPENCLAW_GIT_WORKFLOW_REPO:-/home/node/repos/openclaw-git-workflow}
BRANCH_NAME=${1:-}
BASE_REF=${2:-}

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

if [ -n "$BASE_REF" ]; then
  git rev-parse --verify "$BASE_REF^{commit}" >/dev/null 2>&1 || {
    echo "base ref is missing or not a commit: $BASE_REF" >&2
    exit 1
  }
fi

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  git checkout "$BRANCH_NAME"
  echo "checked out existing branch: $BRANCH_NAME"
  exit 0
fi

if [ -n "$BASE_REF" ]; then
  git checkout -b "$BRANCH_NAME" "$BASE_REF"
else
  git checkout -b "$BRANCH_NAME"
fi

echo "created branch: $BRANCH_NAME"
