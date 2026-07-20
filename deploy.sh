#!/usr/bin/env bash
# Despliegue productivo del Bootcamp IA en el Supabase de Polibio (reusa su backend).
# Uso:  SUPABASE_ACCESS_TOKEN=sbp_xxx bash deploy.sh
# Genera el token en: https://supabase.com/dashboard/account/tokens
# No imprime el token. Hace: tablas -> 3 edge functions -> secreto BOOTCAMP_APP_KEY.
set -euo pipefail

REF="hyylhendjtwdtflzsjdx"
APP_KEY="KWweNcXohJaSv4hIpCs9qjOhwwQ8SHza"   # igual que CONFIG.APP_KEY en js/config.js
API="https://api.supabase.com/v1/projects/$REF"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Falta SUPABASE_ACCESS_TOKEN. Uso: SUPABASE_ACCESS_TOKEN=sbp_xxx bash deploy.sh"; exit 1
fi
AUTH="Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

echo "==> 1/3 Creando tablas (bootcamp_diagnostico + bootcamp_tareas)"
SQL=$(python3 -c "import json;print(json.dumps(open('$HERE/supabase/migrations/20260720000000_bootcamp_tablas.sql').read()))")
code=$(curl -s -o /tmp/bc_sql.out -w "%{http_code}" -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/database/query" -d "{\"query\": $SQL}")
echo "    HTTP $code"; [ "$code" = "200" ] || [ "$code" = "201" ] || { cat /tmp/bc_sql.out; exit 1; }

echo "==> 2/3 Desplegando Edge Functions"
deploy_fn() {
  local slug=$1
  local body; body=$(python3 -c "import json;print(json.dumps(open('$HERE/supabase/functions/$slug/index.ts').read()))")
  local payload="{\"slug\":\"$slug\",\"name\":\"$slug\",\"body\":$body,\"verify_jwt\":false}"
  local s; s=$(curl -s -o /tmp/bc_fn.out -w "%{http_code}" -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
    "$API/functions/$slug" -d "$payload")
  if [ "$s" = "404" ]; then
    s=$(curl -s -o /tmp/bc_fn.out -w "%{http_code}" -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/functions" -d "$payload")
  fi
  echo "    $slug -> HTTP $s"; [ "$s" = "200" ] || [ "$s" = "201" ] || { cat /tmp/bc_fn.out; exit 1; }
}
deploy_fn bootcamp-plan
deploy_fn bootcamp-email
deploy_fn bootcamp-followup

echo "==> 3/3 Seteando secreto BOOTCAMP_APP_KEY"
code=$(curl -s -o /tmp/bc_sec.out -w "%{http_code}" -X POST -H "$AUTH" -H "Content-Type: application/json" \
  "$API/secrets" -d "[{\"name\":\"BOOTCAMP_APP_KEY\",\"value\":\"$APP_KEY\"}]")
echo "    HTTP $code"; [ "$code" = "200" ] || [ "$code" = "201" ] || { cat /tmp/bc_sec.out; exit 1; }

echo
echo "LISTO. Tablas + funciones + secreto desplegados."
echo "Falta solo: en js/config.js poner MOCK_MODE:false y MOCK_PLAN:false, y hacer commit/push."
echo "(RESEND_API_KEY y OPENAI_API_KEY ya viven como secretos en ese proyecto.)"
