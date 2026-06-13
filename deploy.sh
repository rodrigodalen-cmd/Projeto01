#!/bin/bash
# deploy.sh — publica as mudanças no site ao vivo (gh-pages)
# Uso: ./deploy.sh            → commit automático + deploy
#      ./deploy.sh "mensagem"  → commit com mensagem personalizada

set -e

DEV="claude/charming-hypatia-TQuEJ"
LIVE="gh-pages"
NOW=$(date '+%d/%m/%Y %H:%M')

echo "🔍 Verificando branch atual..."
CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT" != "$DEV" ]; then
  echo "❌ Você está em '$CURRENT'. Mude para '$DEV' antes de fazer deploy."
  exit 1
fi

# Se há mudanças não commitadas, commita antes de fazer o deploy
if ! git diff --quiet || ! git diff --cached --quiet; then
  MSG="${1:-deploy $NOW}"
  echo "📝 Commitando: $MSG"
  git add index.html sw.js supabase/ 2>/dev/null || git add -A
  git commit -m "$MSG"
fi

echo "📤 Enviando branch de desenvolvimento..."
git push -u origin "$DEV"

echo "🚀 Publicando no site ao vivo..."
git checkout "$LIVE"
git merge "$DEV" --no-edit
git push -u origin "$LIVE"
git checkout "$DEV"

echo ""
echo "✅ Deploy concluído! Site ao vivo em bolaofc.net.br"
