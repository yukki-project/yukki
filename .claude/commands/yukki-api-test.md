---
name: yukki-api-test
description: "Étape 5b du workflow SPDD : à partir d'un canvas REASONS et du code généré, produit un script bash de validation API (curl + jq) couvrant les Acceptance Criteria de la story et les cas limites des Operations exposant des endpoints REST. Sauvegarde dans scripts/yukki/<id>-<slug>.sh. Utilise après /yukki-generate quand la feature ajoute ou modifie des endpoints REST."
argument-hint: "<id-slug OU chemin vers .yukki/prompts/...>"
user_invocable: true
---

# /yukki-api-test — Génération d'un script de validation API

Étape 5b du workflow [Structured Prompt-Driven Development](../../.yukki/README.md).

Produit un script bash exécutable qui valide le comportement des endpoints REST
décrits dans le canvas, en confrontant les **Acceptance Criteria** (story) et les
**Operations** (canvas) à la réalité du code généré.

## Entrée

`$ARGUMENTS` doit pointer vers un canvas en statut `implemented` (ou `synced`) :
- `EXT-014-trivy-csv-export`
- `.yukki/prompts/EXT-014-trivy-csv-export.md`

Si le canvas est encore en `draft` ou `reviewed` → arrêter, le code n'est pas
encore généré.

## Étape 1 — Inventaire des endpoints

1. Lire le canvas et lister chaque Operation qui expose un endpoint REST :
   - Méthode HTTP (GET/POST/PUT/DELETE/PATCH)
   - Chemin (en s'appuyant sur `@Path` du `*Resource.java` produit)
   - Paramètres (query, path, body)
   - Codes de retour attendus
2. Lire la story et lister les **Acceptance Criteria** qui touchent ces endpoints
   (Given / When / Then traduisibles en requêtes HTTP).
3. Si aucun endpoint REST n'est exposé → la commande ne s'applique pas, signaler
   et arrêter.

## Étape 2 — Construire la matrice de tests

Pour chaque endpoint, prévoir au minimum :

| Type | Quoi tester | Source |
|---|---|---|
| Cas nominal | Une requête valide qui satisfait un AC | story |
| Cas limite | Une valeur en bordure (vide, max, format limite) | analysis (cas limites) + canvas (Tests des Operations) |
| Cas d'erreur | 401 (sans token), 403 (token sans scope), 404 (ressource absente), 400 (payload invalide) | Safeguards du canvas |

Présenter cette matrice à l'utilisateur **avant** de générer le script — il peut ajouter / retirer des cas.

## Étape 3 — Générer le script

Conventions du script `scripts/yukki/<id>-<slug>.sh` :

```bash
#!/usr/bin/env bash
# Généré par /yukki-api-test pour <id>-<slug>
# Canvas : .yukki/prompts/<id>-<slug>.md
# Story  : .yukki/stories/<id>-<slug>.md
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
BEARER_TOKEN="${BEARER_TOKEN:?BEARER_TOKEN env var required (oc whoami -t ou portal dev token)}"

# helpers
red()  { printf '\033[31m%s\033[0m\n' "$*"; }
green(){ printf '\033[32m%s\033[0m\n' "$*"; }

assert_status() {  # $1=label  $2=expected  $3=actual
  if [[ "$2" == "$3" ]]; then green "  PASS [$1] status=$3"
  else red "  FAIL [$1] expected=$2 actual=$3"; exit 1; fi
}

# ---- Test 1 : <description> (AC1) ----
echo "Test 1 — <description>"
status=$(curl -sS -o /tmp/yukki-resp -w "%{http_code}" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  "$BASE_URL/api/...")
assert_status "AC1 nominal" "200" "$status"
jq -e '.field == "expected"' /tmp/yukki-resp >/dev/null \
  && green "  PASS payload" || { red "  FAIL payload"; cat /tmp/yukki-resp; exit 1; }

# ---- Test 2 : ... ----
# ...

green "ALL TESTS PASSED"
```

Règles :
- **Toujours** exiger `BEARER_TOKEN` (les endpoints du portail sont OIDC) — ne jamais générer un test sans authent.
- **Ne pas hard-coder** d'URL prod / staging. Utiliser `BASE_URL` (par défaut `http://localhost:8080`).
- Référencer chaque test à un AC ou à un Safeguard du canvas (commentaire `# AC1`, `# Safeguard SEC-2`).
- Utiliser `jq -e` pour les assertions sur le payload (échec si false).
- `set -euo pipefail` pour qu'un test cassé fasse échouer tout le script.

## Étape 4 — Sauvegarder et rendre exécutable

1. Écrire `scripts/yukki/<id>-<slug>.sh`.
2. Sous Windows / Git Bash : pas de `chmod +x` nécessaire — la mention `bash scripts/yukki/<id>-<slug>.sh` suffit. Sous Linux/macOS, l'utilisateur devra `chmod +x` (le rappeler).
3. Créer un README une seule fois la première fois (`scripts/.yukki/README.md`) qui documente la convention `BASE_URL` / `BEARER_TOKEN` si absent.

## Étape 5 — Restituer

Afficher :
- Lien cliquable vers le script
- Matrice des tests effectivement générés (numéro / type / référence AC ou Safeguard)
- Commande pour l'exécuter : `BEARER_TOKEN=$(oc whoami -t) bash scripts/yukki/<id>-<slug>.sh`
- Rappel : si un test échoue, classer l'écart :
  - **Logique cassée** → `/yukki-prompt-update` puis `/yukki-generate`
  - **Refactor / cosmétique** → modifier le code puis `/yukki-sync`

## Checklist avant de rendre la main

- [ ] Tous les endpoints du canvas sont couverts par au moins un test nominal
- [ ] Chaque AC de la story qui touche un endpoint est référencé dans le script
- [ ] Au moins un test 401 (sans token) et un test 403 / 404 quand pertinent
- [ ] `BEARER_TOKEN` est requis (pas de mode "skip auth")
- [ ] Aucune URL externe / prod hard-codée
- [ ] Le script s'exécute jusqu'au bout sur l'env de dev local (sinon, signaler quels tests échouent et pourquoi)
