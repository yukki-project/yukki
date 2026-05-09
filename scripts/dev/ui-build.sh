#!/usr/bin/env bash
# scripts/dev/ui-build.sh — build the yukki desktop binary (Wails) with all
# build artefacts kept inside the repo (.gocache/, .gotmp/, build/bin/) so
# a single Defender exclusion on the repo root covers everything.
#
# Workarounds layered in by default for the corporate-AV environment that
# blocked CORE-001 + UI-001a local execution:
#
#   -tags mock        injects MockProvider — no need for `claude` on PATH
#   -skipbindings     uses the hand-written wailsjs/ stubs instead of letting
#                     Wails regenerate them (its helper Go binary in %TEMP%
#                     gets quarantined by Defender). Once the AV exclusion
#                     is in place, drop this flag to let Wails regenerate.
#
# See DEVELOPMENT.md "Si l'AV bloque malgré tout" + TICKET IT in TODO.md.
#
# Usage:
#     scripts/dev/ui-build.sh                   # build, no launch
#     scripts/dev/ui-build.sh -- <wails args>   # forward any extra wails flag

set -euo pipefail

# Use BASH_SOURCE[0] over $0 — $0 can resolve to "." when the script
# is invoked by name only (e.g. `bash ui-build.sh` from inside
# scripts/dev/), causing dirname/../.. to land at "/" and break the
# in-repo .gocache/.gotmp AV-workaround with 'cannot create //.gocache'.
script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_path/../.." && pwd)"
export GOCACHE="${GOCACHE:-$repo_root/.gocache}"
export GOTMPDIR="${GOTMPDIR:-$repo_root/.gotmp}"
export TMP="${TMP:-$repo_root/.gotmp}"
export TEMP="${TEMP:-$repo_root/.gotmp}"

mkdir -p "$GOCACHE" "$GOTMPDIR"

echo ">> GOCACHE=$GOCACHE"
echo ">> GOTMPDIR=$GOTMPDIR"
echo ">> TMP=$TMP"

# Detect host platform for `wails build -platform`
case "$(uname -s)" in
    Linux*)   platform="linux/amd64" ;;
    Darwin*)  platform="darwin/universal" ;;
    MINGW*|MSYS*|CYGWIN*) platform="windows/amd64" ;;
    *)        platform="" ;;
esac

extra_args=()
if [ "$#" -gt 0 ] && [ "$1" = "--" ]; then
    shift
    extra_args=("$@")
fi

# UI-021 O3 — Injection ldflags pour version / commit / date.
# YUKKI_VERSION peut être surchargée par variable d'environnement
# (utilisée par la CI release pour passer le tag git). En local, on
# laisse "dev" par défaut. CommitSHA et BuildDate sont calculés à la
# volée, avec fallback "" si git ou date ne sont pas disponibles
# (par exemple shallow clone CI).
yukki_version="${YUKKI_VERSION:-dev}"
yukki_commit="$(git rev-parse --short HEAD 2>/dev/null || echo '')"
yukki_date="$(date -u +%FT%TZ 2>/dev/null || echo '')"
ldflags="-X main.version=${yukki_version} -X main.commitSHA=${yukki_commit} -X main.buildDate=${yukki_date}"

echo ">> ldflags: ${ldflags}"
echo ">> wails build -tags mock,devbuild -skipbindings -platform ${platform:-auto} ${extra_args[*]}"

if [ -n "$platform" ]; then
    wails build -tags mock,devbuild -skipbindings -ldflags "${ldflags}" -platform "$platform" "${extra_args[@]}"
else
    wails build -tags mock,devbuild -skipbindings -ldflags "${ldflags}" "${extra_args[@]}"
fi

echo ""
echo ">> Built. Binary at: $repo_root/build/bin/yukki*"
ls -la "$repo_root/build/bin/" 2>/dev/null || true
