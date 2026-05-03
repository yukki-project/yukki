#!/usr/bin/env bash
# scripts/dev/test-local.sh — run the Go test suite with all build artifacts
# kept inside the repo (.gocache/, .gotmp/, bin/) instead of the system %TEMP%.
#
# Rationale: corporate Windows endpoints often block exec from %TEMP% via
# Microsoft Defender, ESET, etc. Keeping artifacts in-repo lets the dev
# add a *single* exclusion (the repo root) instead of having to pre-approve
# %TEMP% globally.
#
# This script does NOT bypass the AV by itself — see DEVELOPMENT.md for
# the actual workarounds.
#
# Usage:
#     scripts/dev/test-local.sh                # run everything
#     scripts/dev/test-local.sh ./internal/... # restrict to a package set

set -euo pipefail

# Use BASH_SOURCE[0] over $0 to handle the case where the script is
# invoked by name only (e.g. `bash test-local.sh` from inside the
# scripts/dev/ dir, or via aliases) — $0 can resolve to ".", causing
# `dirname "$0"/../..` to land at "/" instead of the repo root and
# trigger 'mkdir: cannot create //.gocache: Read-only file system'.
script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_path/../.." && pwd)"
export GOCACHE="${GOCACHE:-$repo_root/.gocache}"
export GOTMPDIR="${GOTMPDIR:-$repo_root/.gotmp}"

mkdir -p "$GOCACHE" "$GOTMPDIR"

echo ">> GOCACHE=$GOCACHE"
echo ">> GOTMPDIR=$GOTMPDIR"

if [ "$#" -eq 0 ]; then
    set -- "./..."
fi

go test -count=1 "$@"
