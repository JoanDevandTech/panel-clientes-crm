#!/usr/bin/env bash
set -euo pipefail

CLIENTE="${1:-}"
CLIENTES_VALIDOS=("krom" "noval" "mycapstore")

if [[ -z "$CLIENTE" ]]; then
  echo "Uso: $0 <cliente>  (krom | noval | mycapstore)"
  exit 1
fi

if [[ ! " ${CLIENTES_VALIDOS[*]} " =~ " ${CLIENTE} " ]]; then
  echo "Cliente desconocido: $CLIENTE. Válidos: ${CLIENTES_VALIDOS[*]}"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

DEPLOY_BRANCH="deploy/$CLIENTE"
FECHA=$(date +%Y-%m-%d)

echo "→ [1/7] Preparando rama $DEPLOY_BRANCH"
git fetch origin main
if ! git show-ref --verify --quiet "refs/heads/$DEPLOY_BRANCH"; then
  git checkout -b "$DEPLOY_BRANCH" origin/main
else
  git checkout "$DEPLOY_BRANCH"
fi

echo "→ [2/7] Merge origin/main (main gana conflictos)"
git merge -X theirs origin/main --no-edit

echo "→ [3/7] Copia .env de $CLIENTE"
cp "envs/$CLIENTE.env" .env

echo "→ [4/7] Copia assets de $CLIENTE → public/"
cp "assets/$CLIENTE/"* public/

echo "→ [5/7] Copia .cpanel.yml de $CLIENTE"
cp "cpanel-yml/$CLIENTE.yml" .cpanel.yml

echo "→ [6/7] Build"
npm ci
npm run build

echo "→ [7/7] Commit + push"
git add -A
git commit -m "build($CLIENTE): $FECHA"
git push origin "$DEPLOY_BRANCH"

echo "✓ Deploy $CLIENTE listo en rama $DEPLOY_BRANCH"
