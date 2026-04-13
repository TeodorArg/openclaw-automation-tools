#!/bin/sh
set -eu

REPO_PATH=${OPENCLAW_GIT_WORKFLOW_REPO:-/home/node/repos/openclaw-git-workflow}
EXPECTED_BRANCH=${1:-}
FILES_JSON=${2:-}
COMMIT_TITLE=${3:-}
COMMIT_BODY=${4:-}

if [ -z "$EXPECTED_BRANCH" ] || [ -z "$FILES_JSON" ] || [ -z "$COMMIT_TITLE" ] || [ -z "$COMMIT_BODY" ]; then
  echo "expected branch, files json, commit title, and commit body are required" >&2
  exit 1
fi

cd "$REPO_PATH"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "current branch '$CURRENT_BRANCH' does not match expected '$EXPECTED_BRANCH'" >&2
  exit 1
fi

printf '%s' "$FILES_JSON" | node -e '
const fs = require("node:fs");
const path = require("node:path");
const input = fs.readFileSync(0, "utf8");
const repo = process.cwd();
const files = JSON.parse(input);
if (!Array.isArray(files) || files.length < 1) {
  throw new Error("files json must be a non-empty array");
}
for (const file of files) {
  if (typeof file !== "string" || file.trim() === "") {
    throw new Error("file entries must be non-empty strings");
  }
  if (path.isAbsolute(file)) {
    throw new Error(`absolute paths are not allowed: ${file}`);
  }
  const normalized = path.posix.normalize(file);
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error(`repo escape is not allowed: ${file}`);
  }
  const resolved = path.resolve(repo, normalized);
  const relative = path.relative(repo, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`repo escape is not allowed: ${file}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`file does not exist: ${file}`);
  }
  process.stdout.write(normalized + "\n");
}
' | while IFS= read -r file; do
  git add -- "$file"
done

if git diff --cached --quiet; then
  echo "no staged changes for commit" >&2
  exit 1
fi

git commit -m "$COMMIT_TITLE" -m "$COMMIT_BODY"
echo "created commit on branch: $EXPECTED_BRANCH"
