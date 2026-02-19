#!/usr/bin/env bash
# setup-tenant.sh — Idempotent end-to-end bootstrap for the Fromage & Co demo tenant.
#
# Scope:
# - Assumes tenant already exists (manual creation preferred)
# - Seeds settings + currency
# - Imports fixture CSVs
# - Applies post-import relations (locations, suites, app links, instances, interfaces, connections,
#   contract/app links, spend/app links, project phases/milestones/team)
#
# Usage:
#   ./setup-tenant.sh <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>
#
# Examples:
#   ./setup-tenant.sh http://localhost:5173 thomas.berger@fromage-co.com MyPass123
#   ./setup-tenant.sh https://fromage.qa.kanap.net thomas.berger@fromage-co.com '...'

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
log_ok()    { printf "${GREEN}[OK]${NC}   %s\n" "$1"; }
log_warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
log_err()   { printf "${RED}[ERR]${NC}  %s\n" "$1"; }

if [ $# -ne 3 ]; then
  echo "Usage: $0 <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>"
  exit 1
fi

BASE_URL="${1%/}"
EMAIL="$2"
PASSWORD="$3"
TOKEN=""

for cmd in curl jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_err "Missing required command: $cmd"
    exit 1
  fi
done

api_json() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local url="${BASE_URL}${path}"
  local resp

  if [ -n "$body" ]; then
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body")
  else
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  fi

  local code
  code=$(echo "$resp" | tail -1)
  local payload
  payload=$(echo "$resp" | sed '$d')

  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    log_err "$method $path failed (HTTP $code)"
    if [ -n "$payload" ]; then
      echo "$payload" | jq . 2>/dev/null || echo "$payload"
    fi
    return 1
  fi

  echo "$payload"
}

api_upload() {
  local path="$1"
  local file="$2"
  local url="${BASE_URL}${path}"
  local resp

  resp=$(curl -sS -w "\n%{http_code}" -X POST "$url" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@${file};type=text/csv")

  local code
  code=$(echo "$resp" | tail -1)
  local payload
  payload=$(echo "$resp" | sed '$d')

  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    log_err "POST $path failed (HTTP $code)"
    if [ -n "$payload" ]; then
      echo "$payload" | jq . 2>/dev/null || echo "$payload"
    fi
    return 1
  fi

  echo "$payload"
}

login() {
  log_info "Authenticating as $EMAIL"
  local body
  body=$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')
  local resp
  resp=$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$body")

  local code
  code=$(echo "$resp" | tail -1)
  local payload
  payload=$(echo "$resp" | sed '$d')

  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    log_err "Authentication failed (HTTP $code)"
    echo "$payload" | jq . 2>/dev/null || echo "$payload"
    exit 1
  fi

  TOKEN=$(echo "$payload" | jq -r '.access_token')
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    log_err "No access_token in auth response"
    exit 1
  fi
  log_ok "Authenticated"
}

slugify_upper() {
  echo "$1" | tr '[:lower:]' '[:upper:]' | sed -E 's/[^A-Z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

# ---------- Lookups ----------
get_all_items() {
  local path="$1"
  local json
  json=$(api_json GET "$path")
  if echo "$json" | jq -e 'has("items")' >/dev/null 2>&1; then
    echo "$json" | jq '.items'
  else
    echo "$json"
  fi
}

company_id_by_name() {
  local name="$1"
  get_all_items "/api/companies?limit=500" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

department_id_by_name() {
  local name="$1"
  local company_name="${2-}"
  local depts companies cid
  depts=$(get_all_items "/api/departments?limit=1000")
  if [ -n "$company_name" ]; then
    cid=$(company_id_by_name "$company_name")
    if [ -z "$cid" ]; then
      echo ""
      return
    fi
    echo "$depts" | jq -r --arg n "$name" --arg cid "$cid" '.[] | select(.name==$n and .company_id==$cid) | .id' | head -1
  else
    echo "$depts" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
  fi
}

user_id_by_email() {
  local email="$1"
  get_all_items "/api/users?limit=500" | jq -r --arg e "$email" '.[] | select((.email|ascii_downcase)==($e|ascii_downcase)) | .id' | head -1
}

app_id_by_name() {
  local name="$1"
  get_all_items "/api/applications?limit=1000" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

project_id_by_name() {
  local name="$1"
  get_all_items "/api/portfolio/projects?limit=500" | jq -r --arg n "$name" '.[] | select(.name==$n) | (.id // .project_id // empty)' | head -1
}

spend_id_by_name() {
  local name="$1"
  get_all_items "/api/spend-items?limit=1000" | jq -r --arg n "$name" '.[] | select(.product_name==$n) | .id' | head -1
}

capex_id_by_description() {
  local name="$1"
  get_all_items "/api/capex-items?limit=500" | jq -r --arg n "$name" '.[] | select(.description==$n) | .id' | head -1
}

contract_id_by_name() {
  local name="$1"
  get_all_items "/api/contracts?limit=500" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

location_id_by_code() {
  local code="$1"
  get_all_items "/api/locations?limit=500" | jq -r --arg c "$code" '.[] | select(.code==$c) | .id' | head -1
}

interface_id_by_name() {
  local name="$1"
  get_all_items "/api/interfaces?limit=1000" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

interface_id_by_code() {
  local code="$1"
  get_all_items "/api/interfaces?limit=1000" | jq -r --arg c "$code" '.[] | select(.interface_id==$c) | .id' | head -1
}

connection_id_by_name() {
  local name="$1"
  get_all_items "/api/connections?limit=500" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

connection_id_by_code() {
  local code="$1"
  get_all_items "/api/connections?limit=500" | jq -r --arg c "$code" '.[] | select(.connection_id==$c) | .id' | head -1
}

portfolio_team_id_by_name() {
  local name="$1"
  get_all_items "/api/portfolio/teams" | jq -r --arg n "$name" '.[] | select(.name==$n) | .id' | head -1
}

instance_id_by_app_env() {
  local app_name="$1" env="$2"
  local app_id instances
  app_id=$(app_id_by_name "$app_name")
  [ -z "$app_id" ] && return 0
  instances=$(api_json GET "/api/applications/${app_id}/instances")
  echo "$instances" | jq -r --arg e "$env" '.[] | select(.environment==$e) | .id' | head -1
}

bool_json() {
  local value
  value=$(echo "${1:-}" | tr '[:upper:]' '[:lower:]' | xargs)
  case "$value" in
    true|1|yes|y) echo "true" ;;
    *) echo "false" ;;
  esac
}

csv_codes_array() {
  local raw="${1-}"
  jq -n --arg s "$raw" '$s | split(",") | map(gsub("^\\s+|\\s+$";"") | ascii_downcase) | map(select(length>0))'
}

csv_names_to_app_ids() {
  local raw="${1-}"
  local out=()
  local item app_id
  IFS=',' read -ra parts <<< "$raw"
  for item in "${parts[@]}"; do
    item="$(echo "$item" | xargs)"
    [ -z "$item" ] && continue
    app_id=$(app_id_by_name "$item")
    if [ -n "$app_id" ]; then
      out+=("$app_id")
    else
      log_warn "Application '$item' not found while resolving app ID list"
    fi
  done
  if [ ${#out[@]} -eq 0 ]; then
    echo "[]"
  else
    printf '%s\n' "${out[@]}" | jq -R . | jq -s 'unique'
  fi
}

# ---------- Core setup ----------
setup_settings() {
  log_info "Running settings seed script"
  (cd "$ROOT_DIR" && ./setup-settings.sh "$BASE_URL" "$EMAIL" "$PASSWORD")
}

ensure_coa() {
  local name="$1"
  local code="$2"
  local scope="$3"
  local country_iso="${4-}"
  local coas id

  coas=$(api_json GET "/api/chart-of-accounts?limit=500")
  id=$(echo "$coas" | jq -r --arg n "$name" '.items[] | select(.name==$n) | .id' | head -1)
  if [ -n "$id" ]; then
    echo "$id"
    return
  fi

  local body
  if [ "$scope" = "GLOBAL" ]; then
    body=$(jq -n --arg code "$code" --arg name "$name" '{code:$code,name:$name,scope:"GLOBAL"}')
  else
    body=$(jq -n --arg code "$code" --arg name "$name" --arg c "$country_iso" '{code:$code,name:$name,scope:"COUNTRY",country_iso:$c}')
  fi

  api_json POST "/api/chart-of-accounts" "$body" >/dev/null
  coas=$(api_json GET "/api/chart-of-accounts?limit=500")
  id=$(echo "$coas" | jq -r --arg n "$name" '.items[] | select(.name==$n) | .id' | head -1)
  if [ -z "$id" ]; then
    log_err "Failed to create/find CoA '$name'"
    exit 1
  fi
  echo "$id"
}

resolve_ifrs_coa() {
  local coas id
  coas=$(api_json GET "/api/chart-of-accounts?limit=500")
  id=$(echo "$coas" | jq -r '.items[] | select(((.name // "")|ascii_downcase|contains("ifrs")) or ((.code // "")|ascii_downcase|contains("ifrs"))) | .id' | head -1)
  if [ -n "$id" ]; then
    echo "$id"
    return
  fi

  id=$(echo "$coas" | jq -r '.items[] | select(.is_global_default==true) | .id' | head -1)
  if [ -n "$id" ]; then
    echo "$id"
    return
  fi

  id=$(echo "$coas" | jq -r '.items[] | select(.scope=="GLOBAL") | .id' | head -1)
  if [ -n "$id" ]; then
    echo "$id"
    return
  fi

  ensure_coa "IFRS Default" "IFRS" "GLOBAL"
}

import_csv() {
  local endpoint="$1"
  local file="$2"
  log_info "Importing $(basename "$file") -> $endpoint"
  local res
  res=$(api_upload "${endpoint}?dryRun=false" "$file")
  local ok
  ok=$(echo "$res" | jq -r '.ok // "true"')
  if [ "$ok" != "true" ]; then
    log_err "Import returned non-ok for $(basename "$file")"
    echo "$res" | jq .
    exit 1
  fi
  log_ok "Imported $(basename "$file")"
}

import_accounts_for_coa() {
  local coa_id="$1"
  local file="$2"
  log_info "Importing $(basename "$file") into CoA $coa_id"
  local res
  res=$(api_upload "/api/chart-of-accounts/${coa_id}/accounts/import?dryRun=false" "$file")
  local ok
  ok=$(echo "$res" | jq -r '.ok // "true"')
  if [ "$ok" != "true" ]; then
    log_err "Account import failed for $(basename "$file")"
    echo "$res" | jq .
    exit 1
  fi
  log_ok "Imported $(basename "$file")"
}

assign_company_coa() {
  local company_name="$1"
  local coa_id="$2"
  local cid
  cid=$(company_id_by_name "$company_name")
  if [ -z "$cid" ]; then
    log_warn "Company '$company_name' not found; skipping CoA assignment"
    return
  fi
  api_json PATCH "/api/companies/${cid}" "$(jq -n --arg coa "$coa_id" '{coa_id:$coa}')" >/dev/null
  log_ok "Assigned CoA to $company_name"
}

ensure_locations() {
  log_info "Ensuring locations"
  local fr nl it us
  fr=$(company_id_by_name "Fromage & Co SA")
  nl=$(company_id_by_name "Kaasmeester BV")
  it=$(company_id_by_name "Formaggio Supremo SRL")
  us=$(company_id_by_name "Fromage & Co Inc.")

  upsert_location "PAR-DC1" "Paris Data Center" "$(jq -n --arg cid "$fr" '{hosting_type:"on_prem",operating_company_id:$cid,country_iso:"FR",city:"Paris",datacenter:"Main DC"}')"
  upsert_location "GOU-DC1" "Gouda Server Room" "$(jq -n --arg cid "$nl" '{hosting_type:"on_prem",operating_company_id:$cid,country_iso:"NL",city:"Gouda",datacenter:"Single rack"}')"
  upsert_location "PRM-SITE" "Parma Server Room" "$(jq -n --arg cid "$it" '{hosting_type:"on_prem",operating_company_id:$cid,country_iso:"IT",city:"Parma",datacenter:"Single rack"}')"
  upsert_location "PAR-CAVE" "Paris Cheese Caves" "$(jq -n --arg cid "$fr" '{hosting_type:"on_prem",operating_company_id:$cid,country_iso:"FR",city:"Paris",datacenter:"Production site"}')"
  upsert_location "NYC-OFF" "New York Office" "$(jq -n --arg cid "$us" '{hosting_type:"on_prem",operating_company_id:$cid,country_iso:"US",city:"New York",datacenter:"Office"}')"
  upsert_location "AWS-EU" "AWS eu-west-1" '{"hosting_type":"public_cloud","provider":"aws","country_iso":"IE","city":"Dublin","region":"eu-west-1","additional_info":"AWS Ireland region"}'
}

upsert_location() {
  local code="$1"
  local name="$2"
  local extra_json="$3"
  local existing_id body

  existing_id=$(location_id_by_code "$code")
  body=$(jq -n --arg code "$code" --arg name "$name" --argjson extra "$extra_json" '$extra + {code:$code,name:$name}')

  if [ -n "$existing_id" ]; then
    api_json PATCH "/api/locations/${existing_id}" "$body" >/dev/null
    log_ok "Updated location $code"
  else
    api_json POST "/api/locations" "$body" >/dev/null
    log_ok "Created location $code"
  fi
}

ensure_connection_entities() {
  log_info "Ensuring connection entities for location-based links"
  local current patch
  current=$(api_json GET "/api/it-ops/settings")
  patch=$(echo "$current" | jq '
    . as $root |
    ($root.entities // []) as $e |
    {
      entities: ($e + [
        {"code":"par_dc1","label":"PAR-DC1"},
        {"code":"gou_dc1","label":"GOU-DC1"},
        {"code":"prm_site","label":"PRM-SITE"},
        {"code":"nyc_off","label":"NYC-OFF"},
        {"code":"aws_eu","label":"AWS-EU"}
      ] | unique_by(.code))
    }')
  api_json PATCH "/api/it-ops/settings" "$patch" >/dev/null
  log_ok "Connection entities ensured"
}

ensure_interfaces() {
  local file="$ROOT_DIR/21-interfaces.csv"
  if [ ! -f "$file" ]; then
    log_warn "Interfaces CSV not found ($file); skipping interfaces"
    return
  fi

  log_info "Ensuring interfaces from $(basename "$file")"
  while IFS=';' read -r interface_code name src_app dst_app purpose route category lifecycle data_class contains_pii middleware_apps; do
    [ -z "${interface_code// }" ] && continue
    local src_id dst_id iid middleware_ids payload
    src_id=$(app_id_by_name "$src_app")
    dst_id=$(app_id_by_name "$dst_app")

    if [ -z "$src_id" ] || [ -z "$dst_id" ]; then
      log_warn "Skipping interface '$interface_code' (missing apps: '$src_app' or '$dst_app')"
      continue
    fi

    middleware_ids=$(csv_names_to_app_ids "$middleware_apps")
    payload=$(jq -n \
      --arg iid "$interface_code" \
      --arg n "$name" \
      --arg p "$purpose" \
      --arg src "$src_id" \
      --arg dst "$dst_id" \
      --arg cat "$(echo "$category" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg route "$(echo "$route" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg life "$(echo "$lifecycle" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg dc "$(echo "$data_class" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --argjson pii "$(bool_json "$contains_pii")" \
      --argjson mw "$middleware_ids" \
      '{interface_id:$iid,name:$n,business_purpose:$p,source_application_id:$src,target_application_id:$dst,data_category:$cat,integration_route_type:$route,data_class:$dc,contains_pii:$pii,lifecycle:$life,middleware_application_ids:$mw}')

    iid=$(interface_id_by_code "$interface_code")
    if [ -n "$iid" ]; then
      api_json PATCH "/api/interfaces/${iid}" "$payload" >/dev/null
      log_ok "Updated interface '$interface_code'"
    else
      api_json POST "/api/interfaces" "$payload" >/dev/null
      log_ok "Created interface '$interface_code'"
    fi
  done < <(tail -n +2 "$file")
}

ensure_middleware_etl_enabled() {
  local file="$ROOT_DIR/21-interfaces.csv"
  if [ ! -f "$file" ]; then
    log_warn "Interfaces CSV not found ($file); skipping middleware ETL enablement"
    return
  fi

  log_info "Ensuring middleware applications are ETL-enabled"
  local middleware_names
  middleware_names=$(tail -n +2 "$file" \
    | awk -F';' 'tolower($6)=="via_middleware" && $11!="" {print $11}' \
    | tr ',' '\n' \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
    | awk 'NF' \
    | sort -u)

  if [ -z "$middleware_names" ]; then
    log_info "No middleware applications found in interfaces CSV"
    return
  fi

  while IFS= read -r app_name; do
    [ -z "$app_name" ] && continue
    local aid payload
    aid=$(app_id_by_name "$app_name")
    if [ -z "$aid" ]; then
      log_warn "Middleware app '$app_name' not found; cannot set etl_enabled"
      continue
    fi
    payload='{"etl_enabled":true}'
    api_json PATCH "/api/applications/${aid}" "$payload" >/dev/null
    log_ok "ETL enabled for middleware app '$app_name'"
  done <<< "$middleware_names"
}

ensure_connections() {
  local file="$ROOT_DIR/23-connections.csv"
  if [ ! -f "$file" ]; then
    log_warn "Connections CSV not found ($file); skipping connections"
    return
  fi

  log_info "Ensuring connections from $(basename "$file")"
  while IFS=';' read -r connection_code name topology src_entity dst_entity protocol_codes lifecycle criticality data_class contains_pii notes; do
    [ -z "${connection_code// }" ] && continue
    local cid payload protocols
    protocols=$(csv_codes_array "$protocol_codes")
    payload=$(jq -n \
      --arg cid "$connection_code" \
      --arg n "$name" \
      --arg t "$(echo "$topology" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg src "$(echo "$src_entity" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg dst "$(echo "$dst_entity" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg life "$(echo "$lifecycle" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg crit "$(echo "$criticality" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg dc "$(echo "$data_class" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --argjson pii "$(bool_json "$contains_pii")" \
      --arg notes "$notes" \
      --argjson protocols "$protocols" \
      '{connection_id:$cid,name:$n,topology:$t,source_entity_code:$src,destination_entity_code:$dst,protocol_codes:$protocols,lifecycle:$life,criticality:$crit,data_class:$dc,contains_pii:$pii,notes:$notes}')

    cid=$(connection_id_by_code "$connection_code")
    if [ -n "$cid" ]; then
      api_json PATCH "/api/connections/${cid}" "$payload" >/dev/null
      log_ok "Updated connection '$connection_code'"
    else
      api_json POST "/api/connections" "$payload" >/dev/null
      log_ok "Created connection '$connection_code'"
    fi
  done < <(tail -n +2 "$file")
}

ensure_connection_legs() {
  local file="$ROOT_DIR/24-connection-legs.csv"
  if [ ! -f "$file" ]; then
    log_warn "Connection legs CSV not found ($file); skipping connection legs"
    return
  fi

  log_info "Ensuring connection legs from $(basename "$file")"
  local conn_codes conn_code conn_id
  conn_codes=$(tail -n +2 "$file" | cut -d';' -f1 | awk 'NF{print}' | sort -u)
  while IFS= read -r conn_code; do
    [ -z "$conn_code" ] && continue
    conn_id=$(connection_id_by_code "$conn_code")
    if [ -z "$conn_id" ]; then
      log_warn "Connection '$conn_code' not found; skipping legs"
      continue
    fi

    local legs_json
    legs_json="[]"
    while IFS=';' read -r code order_index layer_type src_entity dst_entity protocol_codes port_override notes; do
      [ "$code" = "$conn_code" ] || continue
      local protocols row
      protocols=$(csv_codes_array "$protocol_codes")
      row=$(jq -n \
        --argjson idx "${order_index:-1}" \
        --arg lt "$(echo "$layer_type" | tr '[:upper:]' '[:lower:]' | xargs)" \
        --arg src "$(echo "$src_entity" | tr '[:upper:]' '[:lower:]' | xargs)" \
        --arg dst "$(echo "$dst_entity" | tr '[:upper:]' '[:lower:]' | xargs)" \
        --arg po "$port_override" \
        --arg notes "$notes" \
        --argjson protocols "$protocols" \
        '{order_index:$idx,layer_type:$lt,source_entity_code:$src,destination_entity_code:$dst,protocol_codes:$protocols,port_override:($po|if .=="" then null else . end),notes:($notes|if .=="" then null else . end)}')
      legs_json=$(echo "$legs_json" | jq --argjson row "$row" '. + [$row]')
    done < <(tail -n +2 "$file")

    api_json PUT "/api/connections/${conn_id}/legs" "$legs_json" >/dev/null
    log_ok "Connection legs synced for '$conn_code'"
  done <<< "$conn_codes"
}

ensure_interface_bindings() {
  local file="$ROOT_DIR/22-interface-bindings.csv"
  if [ ! -f "$file" ]; then
    log_warn "Interface bindings CSV not found ($file); skipping interface bindings"
    return
  fi

  log_info "Ensuring interface bindings from $(basename "$file")"
  while IFS=';' read -r interface_code environment leg_order source_app target_app status source_endpoint target_endpoint trigger_details env_job_name authentication_mode monitoring_url env_notes integration_tool_app; do
    [ -z "${interface_code// }" ] && continue
    local iid leg_id source_instance_id target_instance_id tool_id payload bindings existing_id
    iid=$(interface_id_by_code "$interface_code")
    if [ -z "$iid" ]; then
      log_warn "Interface '$interface_code' not found; skipping binding row"
      continue
    fi

    leg_id=$(api_json GET "/api/interfaces/${iid}/legs" | jq -r --argjson o "${leg_order:-1}" '(.items // .)[]? | select(.order_index==$o) | .id' | head -1)
    if [ -z "$leg_id" ]; then
      log_warn "Leg order '$leg_order' not found for interface '$interface_code'"
      continue
    fi

    source_instance_id=$(instance_id_by_app_env "$source_app" "$(echo "$environment" | tr '[:upper:]' '[:lower:]' | xargs)")
    target_instance_id=$(instance_id_by_app_env "$target_app" "$(echo "$environment" | tr '[:upper:]' '[:lower:]' | xargs)")
    if [ -z "$source_instance_id" ] || [ -z "$target_instance_id" ]; then
      log_warn "Missing instances for binding '$interface_code' env '$environment' ($source_app -> $target_app)"
      continue
    fi

    tool_id=""
    if [ -n "${integration_tool_app// }" ]; then
      tool_id=$(app_id_by_name "$integration_tool_app")
      if [ -z "$tool_id" ]; then
        log_warn "Integration tool app '$integration_tool_app' not found for '$interface_code'"
      fi
    fi

    payload=$(jq -n \
      --arg leg "$leg_id" \
      --arg src "$source_instance_id" \
      --arg dst "$target_instance_id" \
      --arg st "$(echo "$status" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg se "$source_endpoint" \
      --arg te "$target_endpoint" \
      --arg td "$trigger_details" \
      --arg ej "$env_job_name" \
      --arg am "$(echo "$authentication_mode" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg mu "$monitoring_url" \
      --arg en "$env_notes" \
      --arg ti "$tool_id" \
      '{interface_leg_id:$leg,source_instance_id:$src,target_instance_id:$dst,status:$st,source_endpoint:($se|if .=="" then null else . end),target_endpoint:($te|if .=="" then null else . end),trigger_details:($td|if .=="" then null else . end),env_job_name:($ej|if .=="" then null else . end),authentication_mode:($am|if .=="" then null else . end),monitoring_url:($mu|if .=="" then null else . end),env_notes:($en|if .=="" then null else . end),integration_tool_application_id:($ti|if .=="" then null else . end)}')

    bindings=$(api_json GET "/api/interfaces/${iid}/bindings")
    existing_id=$(echo "$bindings" | jq -r --arg leg "$leg_id" --arg env "$(echo "$environment" | tr '[:upper:]' '[:lower:]' | xargs)" '(.items // .)[]? | select(.interface_leg_id==$leg and .environment==$env) | .id' | head -1)

    if [ -n "$existing_id" ]; then
      api_json PATCH "/api/interface-bindings/${existing_id}" "$payload" >/dev/null
      log_ok "Updated binding '$interface_code' [$environment] leg ${leg_order}"
    else
      api_json POST "/api/interfaces/${iid}/bindings" "$payload" >/dev/null
      log_ok "Created binding '$interface_code' [$environment] leg ${leg_order}"
    fi
  done < <(tail -n +2 "$file")
}

ensure_interface_connection_links() {
  local file="$ROOT_DIR/25-interface-connection-links.csv"
  if [ ! -f "$file" ]; then
    log_warn "Interface-connection links CSV not found ($file); skipping link creation"
    return
  fi

  log_info "Ensuring interface-connection links from $(basename "$file")"
  while IFS=';' read -r interface_code environment leg_order connection_code notes; do
    [ -z "${interface_code// }" ] && continue
    local iid cid leg_id bid payload
    iid=$(interface_id_by_code "$interface_code")
    cid=$(connection_id_by_code "$connection_code")
    if [ -z "$iid" ] || [ -z "$cid" ]; then
      log_warn "Skipping link '$interface_code' -> '$connection_code' (interface or connection missing)"
      continue
    fi

    leg_id=$(api_json GET "/api/interfaces/${iid}/legs" | jq -r --argjson o "${leg_order:-1}" '(.items // .)[]? | select(.order_index==$o) | .id' | head -1)
    if [ -z "$leg_id" ]; then
      log_warn "Leg order '$leg_order' not found for '$interface_code'"
      continue
    fi

    bid=$(api_json GET "/api/interfaces/${iid}/bindings" | jq -r --arg leg "$leg_id" --arg env "$(echo "$environment" | tr '[:upper:]' '[:lower:]' | xargs)" '(.items // .)[]? | select(.interface_leg_id==$leg and .environment==$env) | .id' | head -1)
    if [ -z "$bid" ]; then
      log_warn "Binding not found for '$interface_code' [$environment] leg ${leg_order}"
      continue
    fi

    payload=$(jq -n --arg cid "$cid" --arg n "$notes" '{connection_id:$cid,notes:($n|if .=="" then null else . end)}')
    api_json POST "/api/interface-bindings/${bid}/connection-links" "$payload" >/dev/null
    log_ok "Linked '$interface_code' [$environment] leg ${leg_order} -> '$connection_code'"
  done < <(tail -n +2 "$file")
}

link_suites() {
  log_info "Linking Microsoft 365 suite members"
  local suite_id
  suite_id=$(app_id_by_name "Microsoft 365")
  if [ -z "$suite_id" ]; then
    log_warn "Microsoft 365 not found; skipping suite links"
    return
  fi

  for app in "Exchange Online" "Microsoft Teams" "SharePoint Online" "OneDrive for Business"; do
    local app_id
    app_id=$(app_id_by_name "$app")
    if [ -z "$app_id" ]; then
      log_warn "Suite member '$app' not found"
      continue
    fi
    api_json POST "/api/applications/${app_id}/suites/bulk-replace" "$(jq -n --arg sid "$suite_id" '{suite_ids:[$sid]}')" >/dev/null
    log_ok "Linked '$app' -> Microsoft 365"
  done
}

link_application_departments() {
  log_info "Linking applications to departments"

  link_app_depts "Microsoft 365" \
    "Fromage & Co SA::Direction Générale" \
    "Fromage & Co SA::Finance & Controlling" \
    "Fromage & Co SA::IT & Digital" \
    "Fromage & Co SA::Human Resources" \
    "Fromage & Co SA::Sales & Marketing" \
    "Fromage & Co SA::Production" \
    "Fromage & Co SA::Procurement" \
    "Fromage & Co SA::Logistics" \
    "Fromage & Co SA::Quality & R&D" \
    "Kaasmeester BV::Management" \
    "Kaasmeester BV::Finance" \
    "Kaasmeester BV::IT" \
    "Kaasmeester BV::Sales" \
    "Kaasmeester BV::Operations" \
    "Formaggio Supremo SRL::Direzione" \
    "Formaggio Supremo SRL::Amministrazione" \
    "Formaggio Supremo SRL::IT" \
    "Formaggio Supremo SRL::Commerciale" \
    "Formaggio Supremo SRL::Produzione" \
    "Fromage & Co Inc.::Management" \
    "Fromage & Co Inc.::Finance" \
    "Fromage & Co Inc.::IT" \
    "Fromage & Co Inc.::Sales" \
    "Fromage & Co Inc.::Operations"

  link_app_depts "SAP S/4HANA" "Fromage & Co SA::Finance & Controlling" "Fromage & Co SA::Production" "Fromage & Co SA::Procurement" "Fromage & Co SA::Logistics"
  link_app_depts "SAP BW/4HANA" "Fromage & Co SA::Finance & Controlling" "Fromage & Co SA::Direction Générale"
  link_app_depts "Salesforce Sales Cloud" "Fromage & Co SA::Sales & Marketing" "Kaasmeester BV::Sales" "Formaggio Supremo SRL::Commerciale" "Fromage & Co Inc.::Sales"
  link_app_depts "Salesforce Service Cloud" "Fromage & Co SA::Sales & Marketing"
  link_app_depts "Workday HCM" "Fromage & Co SA::Human Resources"
  link_app_depts "ServiceNow ITSM" "Fromage & Co SA::IT & Digital"
  link_app_depts "Okta Workforce Identity" "Fromage & Co SA::IT & Digital"
  link_app_depts "QuickBooks Online" "Fromage & Co Inc.::Finance"
  link_app_depts "Sage X3" "Kaasmeester BV::Finance" "Formaggio Supremo SRL::Amministrazione"
  link_app_depts "CheeseTrack" "Fromage & Co SA::Production" "Fromage & Co SA::Quality & R&D" "Formaggio Supremo SRL::Produzione"
  link_app_depts "CaveGuard IoT" "Fromage & Co SA::Production"
  link_app_depts "Power BI" "Fromage & Co SA::Finance & Controlling" "Fromage & Co SA::Direction Générale" "Fromage & Co SA::Sales & Marketing"
  link_app_depts "La Boutique du Fromage" "Fromage & Co SA::Sales & Marketing" "Fromage & Co SA::IT & Digital"
  link_app_depts "Fromage B2B Portal" "Fromage & Co SA::Sales & Marketing" "Fromage & Co SA::Logistics"
}

link_app_depts() {
  local app_name="$1"
  shift
  local app_id
  app_id=$(app_id_by_name "$app_name")
  if [ -z "$app_id" ]; then
    log_warn "Application '$app_name' not found; skipping department links"
    return
  fi

  local ids=()
  for ref in "$@"; do
    local company="${ref%%::*}"
    local dept="${ref##*::}"
    local did
    did=$(department_id_by_name "$dept" "$company")
    if [ -z "$did" ]; then
      log_warn "Department not found for '$app_name': $company::$dept"
      continue
    fi
    ids+=("$did")
  done

  if [ ${#ids[@]} -eq 0 ]; then
    log_warn "No department IDs resolved for '$app_name'"
    return
  fi

  local body
  body=$(printf '%s\n' "${ids[@]}" | jq -R . | jq -s '{department_ids: . | unique}')
  api_json POST "/api/applications/${app_id}/departments/bulk-replace" "$body" >/dev/null
  log_ok "Department links synced for '$app_name'"
}

ensure_app_instances() {
  local file="$ROOT_DIR/20-app-instances.csv"
  if [ ! -f "$file" ]; then
    log_warn "App instances CSV not found ($file); skipping app instances"
    return
  fi

  log_info "Ensuring app instances from $(basename "$file")"
  while IFS=';' read -r app_name env lifecycle status base_url region zone notes; do
    [ -z "${app_name// }" ] && continue
    local app_id instances iid payload
    app_id=$(app_id_by_name "$app_name")
    if [ -z "$app_id" ]; then
      log_warn "Application '$app_name' not found; skipping instance ($env)"
      continue
    fi

    instances=$(api_json GET "/api/applications/${app_id}/instances")
    iid=$(echo "$instances" | jq -r --arg e "$(echo "$env" | tr '[:upper:]' '[:lower:]' | xargs)" '.[] | select(.environment==$e) | .id' | head -1)
    payload=$(jq -n \
      --arg e "$(echo "$env" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg l "$(echo "$lifecycle" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg s "$(echo "$status" | tr '[:upper:]' '[:lower:]' | xargs)" \
      --arg bu "$base_url" \
      --arg r "$region" \
      --arg z "$zone" \
      --arg n "$notes" \
      '{environment:$e,lifecycle:$l,status:$s,base_url:($bu|if .=="" then null else . end),region:($r|if .=="" then null else . end),zone:($z|if .=="" then null else . end),notes:($n|if .=="" then null else . end)}')

    if [ -n "$iid" ]; then
      api_json PATCH "/api/app-instances/${iid}" "$payload" >/dev/null
      log_ok "Updated instance '$app_name' [$env]"
    else
      api_json POST "/api/applications/${app_id}/instances" "$payload" >/dev/null
      log_ok "Created instance '$app_name' [$env]"
    fi
  done < <(tail -n +2 "$file")
}

link_contracts_to_apps() {
  log_info "Linking contracts to applications"
  link_contract_apps "Microsoft Enterprise Agreement" "Microsoft 365" "Exchange Online" "Microsoft Teams" "SharePoint Online" "OneDrive for Business" "GitHub Enterprise"
  link_contract_apps "SAP Maintenance & Support" "SAP S/4HANA" "SAP BW/4HANA" "SAP Concur"
  link_contract_apps "Salesforce Subscription" "Salesforce Sales Cloud" "Salesforce Service Cloud"
  link_contract_apps "ServiceNow Platform" "ServiceNow ITSM"
  link_contract_apps "Workday HCM" "Workday HCM"
  link_contract_apps "OVHcloud Infrastructure" "VMware vSphere"
  link_contract_apps "Okta Workforce Identity" "Okta Workforce Identity"
  link_contract_apps "Sophos Enterprise Agreement" "Sophos Intercept X"
  link_contract_apps "Broadcom VMware ELA" "VMware vSphere"
  link_contract_apps "Schneider IoT Services" "CaveGuard IoT"
  link_contract_apps "CheeseTrack SaaS" "CheeseTrack"
  link_contract_apps "Sage X3 Subscription" "Sage X3"
  link_contract_apps "Fortinet FortiCare" "Fortinet FortiGate"
  link_contract_apps "US Managed IT Services" "QuickBooks Online" "Microsoft 365"
}

link_contract_apps() {
  local contract_name="$1"
  shift
  local contract_id
  contract_id=$(contract_id_by_name "$contract_name")
  if [ -z "$contract_id" ]; then
    log_warn "Contract '$contract_name' not found; skipping app links"
    return
  fi

  local ids=()
  for app_name in "$@"; do
    local aid
    aid=$(app_id_by_name "$app_name")
    if [ -n "$aid" ]; then
      ids+=("$aid")
    else
      log_warn "App '$app_name' not found for contract '$contract_name'"
    fi
  done

  if [ ${#ids[@]} -eq 0 ]; then
    log_warn "No apps resolved for contract '$contract_name'"
    return
  fi

  local body
  body=$(printf '%s\n' "${ids[@]}" | jq -R . | jq -s '{application_ids:(.|unique)}')
  api_json POST "/api/contracts/${contract_id}/applications/bulk-replace" "$body" >/dev/null || \
    api_json POST "/api/applications/$(echo "${ids[0]}")/contracts/bulk-replace" "$(jq -n --arg cid "$contract_id" '{contract_ids:[$cid]}')" >/dev/null
  log_ok "Contract links synced for '$contract_name'"
}

link_spend_to_apps() {
  log_info "Linking spend items to applications"
  link_spend_apps "Microsoft Enterprise (M365 + Azure + GitHub)" "Microsoft 365" "GitHub Enterprise"
  link_spend_apps "SAP S/4HANA Maintenance" "SAP S/4HANA"
  link_spend_apps "SAP BW/4HANA License" "SAP BW/4HANA"
  link_spend_apps "Salesforce (Sales + Service Cloud)" "Salesforce Sales Cloud" "Salesforce Service Cloud"
  link_spend_apps "ServiceNow ITSM Platform" "ServiceNow ITSM"
  link_spend_apps "Workday HCM" "Workday HCM"
  link_spend_apps "OVHcloud Infrastructure" "VMware vSphere"
  link_spend_apps "AWS Cloud Hosting" "La Boutique du Fromage"
  link_spend_apps "Datadog Monitoring" "Datadog"
  link_spend_apps "Okta Workforce Identity" "Okta Workforce Identity"
  link_spend_apps "Sophos Enterprise Security" "Sophos Intercept X"
  link_spend_apps "VMware vSphere Licensing" "VMware vSphere"
  link_spend_apps "CaveGuard IoT Platform" "CaveGuard IoT"
  link_spend_apps "CheeseTrack SaaS" "CheeseTrack"
  link_spend_apps "Various SaaS Bundle" "HubSpot Marketing Hub" "Zoom Workplace" "Figma" "Coupa Procurement" "PagerDuty" "Adobe Acrobat Pro"
  link_spend_apps "Fortinet FortiCare & FortiGuard" "Fortinet FortiGate"
}

link_spend_apps() {
  local spend_name="$1"
  shift
  local sid
  sid=$(spend_id_by_name "$spend_name")
  if [ -z "$sid" ]; then
    log_warn "Spend item '$spend_name' not found; skipping app links"
    return
  fi

  local ids=()
  for app_name in "$@"; do
    local aid
    aid=$(app_id_by_name "$app_name")
    if [ -n "$aid" ]; then
      ids+=("$aid")
    else
      log_warn "App '$app_name' not found for spend '$spend_name'"
    fi
  done

  if [ ${#ids[@]} -eq 0 ]; then
    log_warn "No apps resolved for spend '$spend_name'"
    return
  fi

  local body
  body=$(printf '%s\n' "${ids[@]}" | jq -R . | jq -s '{application_ids:(.|unique)}')
  api_json POST "/api/spend-items/${sid}/applications/bulk-replace" "$body" >/dev/null
  log_ok "Spend links synced for '$spend_name'"
}

set_company_allocations() {
  log_info "Applying company allocations to selected spend/CAPEX versions"
  # Note: allocation API supports driver-based manual_company/manual_department.
  # We select companies, then materialize computed allocations for each version.

  alloc_item "spend" "Microsoft Enterprise (M365 + Azure + GitHub)" "Fromage & Co SA" "Kaasmeester BV" "Formaggio Supremo SRL" "Fromage & Co Inc."
  alloc_item "spend" "Okta Workforce Identity" "Fromage & Co SA" "Kaasmeester BV" "Formaggio Supremo SRL" "Fromage & Co Inc."
  alloc_item "spend" "Sophos Enterprise Security" "Fromage & Co SA" "Kaasmeester BV" "Formaggio Supremo SRL" "Fromage & Co Inc."
  alloc_item "spend" "Network & Telecom Services" "Fromage & Co SA" "Kaasmeester BV" "Formaggio Supremo SRL" "Fromage & Co Inc."

  alloc_item "capex" "SAP Cheddar Migration" "Fromage & Co SA" "Kaasmeester BV" "Formaggio Supremo SRL"
}

alloc_item() {
  local kind="$1" name="$2"
  shift 2

  local item_id versions version_path update_path upsert_path
  if [ "$kind" = "spend" ]; then
    item_id=$(spend_id_by_name "$name")
    version_path="/api/spend-items/${item_id}/versions"
    update_path="/api/spend-items/${item_id}/versions"
    upsert_path_prefix="/api/spend-versions"
  else
    item_id=$(capex_id_by_description "$name")
    version_path="/api/capex-items/${item_id}/versions"
    update_path="/api/capex-items/${item_id}/versions"
    upsert_path_prefix="/api/capex-versions"
  fi

  if [ -z "$item_id" ]; then
    log_warn "Allocation target not found: [$kind] $name"
    return
  fi

  local companies=()
  for cname in "$@"; do
    local cid
    cid=$(company_id_by_name "$cname")
    if [ -n "$cid" ]; then
      companies+=("$cid")
    else
      log_warn "Company '$cname' not found for [$kind] $name"
    fi
  done

  if [ ${#companies[@]} -eq 0 ]; then
    log_warn "No companies resolved for [$kind] $name"
    return
  fi

  versions=$(api_json GET "$version_path")
  local count
  count=$(echo "$versions" | jq 'length')
  if [ "$count" -eq 0 ]; then
    log_warn "No versions found for [$kind] $name"
    return
  fi

  while IFS= read -r vid; do
    [ -z "$vid" ] && continue
    api_json PATCH "$update_path" "$(jq -n --arg id "$vid" '{id:$id,allocation_method:"manual_company",allocation_driver:"headcount"}')" >/dev/null

    local rows payload
    rows=$(printf '%s\n' "${companies[@]}" | jq -R '{company_id:.,department_id:null}')
    payload=$(echo "$rows" | jq -s '{items:.}')
    api_json POST "${upsert_path_prefix}/${vid}/allocations/bulk-upsert" "$payload" >/dev/null
  done < <(echo "$versions" | jq -r '.[].id')

  log_ok "Allocations applied for [$kind] $name"
}

ensure_project_timeline() {
  log_info "Ensuring project phases, milestones, and team members"

  # Fromage-as-a-Service
  upsert_phase "Fromage-as-a-Service" "Discovery & UX Design" "2025-06-01" "2025-09-30" "completed"
  upsert_phase "Fromage-as-a-Service" "MVP Development" "2025-09-01" "2026-03-31" "in_progress"
  upsert_phase "Fromage-as-a-Service" "Beta Testing" "2026-03-01" "2026-06-30" "pending"
  upsert_phase "Fromage-as-a-Service" "Launch & Scale" "2026-06-01" "2026-09-30" "pending"

  # Zero Trust Fromage
  upsert_phase "Zero Trust Fromage" "Assessment & Architecture" "2025-04-01" "2025-08-31" "completed"
  upsert_phase "Zero Trust Fromage" "Network Segmentation" "2025-09-01" "2026-02-28" "in_progress"
  upsert_phase "Zero Trust Fromage" "Identity Hardening" "2026-02-01" "2026-05-31" "pending"
  upsert_phase "Zero Trust Fromage" "Validation & Audit" "2026-05-01" "2026-06-30" "pending"

  # Workday Global Rollout
  upsert_phase "Workday Global Rollout" "France Go-Live" "2025-04-01" "2025-07-31" "completed"
  upsert_phase "Workday Global Rollout" "Netherlands Rollout" "2025-09-01" "2026-03-31" "in_progress"
  upsert_phase "Workday Global Rollout" "Italy Rollout" "2026-03-01" "2026-08-31" "pending"
  upsert_phase "Workday Global Rollout" "US Rollout" "2026-08-01" "2026-12-31" "pending"

  # Team composition
  set_project_teams "Fromage-as-a-Service" \
    "amelie.rousseau@fromage-co.com" "clara.dupont@fromage-co.com" \
    "isabelle.moreau@fromage-co.com" "hugo.mercier@fromage-co.com"

  set_project_teams "Zero Trust Fromage" \
    "lucas.bernard@fromage-co.com" "pierre.martin@fromage-co.com" \
    "thomas.berger@fromage-co.com"

  set_project_teams "Workday Global Rollout" \
    "sophie.laurent@fromage-co.com" "jan.bakker@kaasmeester.nl" "luca.ferrari@formaggio-supremo.it" \
    "marie.fontaine@fromage-co.com"

  set_project_teams "Territory Planning Cockpit" \
    "isabelle.moreau@fromage-co.com" "marie.fontaine@fromage-co.com"

  set_project_teams "Supplier Contract Workspace" \
    "marie.fontaine@fromage-co.com" "isabelle.moreau@fromage-co.com"

  set_project_teams "Pricing Rules API Refactor" \
    "amelie.rousseau@fromage-co.com" "clara.dupont@fromage-co.com" "hugo.mercier@fromage-co.com"

  set_project_teams "Customer 360 Data Contracts" \
    "clara.dupont@fromage-co.com" "jan.bakker@kaasmeester.nl" "luca.ferrari@formaggio-supremo.it"

  set_project_teams "Branch Network Segmentation" \
    "lucas.bernard@fromage-co.com" "pierre.martin@fromage-co.com" "thomas.berger@fromage-co.com"

  set_project_teams "Endpoint Compliance Automation" \
    "sophie.laurent@fromage-co.com" "pierre.martin@fromage-co.com" "lucas.bernard@fromage-co.com"
}

upsert_phase() {
  local project_name="$1" phase_name="$2" start_date="$3" end_date="$4" status="$5"
  local pid phases phid
  pid=$(project_id_by_name "$project_name")
  if [ -z "$pid" ]; then
    log_warn "Project '$project_name' not found; skipping phase '$phase_name'"
    return
  fi

  phases=$(api_json GET "/api/portfolio/projects/${pid}/phases")
  phid=$(echo "$phases" | jq -r --arg n "$phase_name" '.[] | select(.name==$n) | .id' | head -1)

  if [ -n "$phid" ]; then
    api_json PATCH "/api/portfolio/projects/${pid}/phases/${phid}" "$(jq -n --arg n "$phase_name" --arg s "$start_date" --arg e "$end_date" --arg st "$status" '{name:$n,planned_start:$s,planned_end:$e,status:$st}')" >/dev/null
    log_ok "Updated phase '$phase_name' ($project_name)"
  else
    local created
    created=$(api_json POST "/api/portfolio/projects/${pid}/phases" "$(jq -n --arg n "$phase_name" --arg s "$start_date" --arg e "$end_date" '{name:$n,planned_start:$s,planned_end:$e}')")
    phid=$(echo "$created" | jq -r '.id')
    api_json PATCH "/api/portfolio/projects/${pid}/phases/${phid}" "$(jq -n --arg st "$status" '{status:$st}')" >/dev/null
    log_ok "Created phase '$phase_name' ($project_name)"
  fi
}

set_project_teams() {
  local project_name="$1"
  shift
  local pid
  pid=$(project_id_by_name "$project_name")
  if [ -z "$pid" ]; then
    log_warn "Project '$project_name' not found; skipping teams"
    return
  fi

  # Convention: first block (until marker "--") is IT team, remaining is business team.
  # Here we infer by known emails (IT-heavy roles first in our calls).
  local it_ids=()
  local biz_ids=()

  for email in "$@"; do
    local uid
    uid=$(user_id_by_email "$email")
    if [ -z "$uid" ]; then
      log_warn "User '$email' not found for project '$project_name'"
      continue
    fi
    case "$email" in
      *sophie.laurent*|*lucas.bernard*|*pierre.martin*|*thomas.berger*|*amelie.rousseau*|*clara.dupont*|*jan.bakker*|*luca.ferrari*|*hugo.mercier*)
        it_ids+=("$uid")
        ;;
      *)
        biz_ids+=("$uid")
        ;;
    esac
  done

  if [ ${#it_ids[@]} -gt 0 ]; then
    api_json POST "/api/portfolio/projects/${pid}/it-team/bulk-replace" "$(printf '%s\n' "${it_ids[@]}" | jq -R . | jq -s '{user_ids:(.|unique)}')" >/dev/null
  fi
  if [ ${#biz_ids[@]} -gt 0 ]; then
    api_json POST "/api/portfolio/projects/${pid}/business-team/bulk-replace" "$(printf '%s\n' "${biz_ids[@]}" | jq -R . | jq -s '{user_ids:(.|unique)}')" >/dev/null
  fi

  log_ok "Teams synced for '$project_name'"
}

ensure_portfolio_teams_and_capacity() {
  log_info "Ensuring roadmap teams and contributor capacity"

  ensure_portfolio_team "Business Applications" "ERP, CRM, and business software systems" 0
  ensure_portfolio_team "Development" "Custom development and engineering" 1
  ensure_portfolio_team "Infrastructure" "Network, servers, and cloud infrastructure" 2

  # Identified project contributors with 10 days/month capacity for roadmap generation.
  assign_contributor_team "isabelle.moreau@fromage-co.com" "Business Applications" 10
  assign_contributor_team "marie.fontaine@fromage-co.com" "Business Applications" 10

  assign_contributor_team "amelie.rousseau@fromage-co.com" "Development" 10
  assign_contributor_team "clara.dupont@fromage-co.com" "Development" 10
  assign_contributor_team "hugo.mercier@fromage-co.com" "Development" 10
  assign_contributor_team "jan.bakker@kaasmeester.nl" "Development" 10
  assign_contributor_team "luca.ferrari@formaggio-supremo.it" "Development" 10

  assign_contributor_team "lucas.bernard@fromage-co.com" "Infrastructure" 10
  assign_contributor_team "pierre.martin@fromage-co.com" "Infrastructure" 10
  assign_contributor_team "thomas.berger@fromage-co.com" "Infrastructure" 10
  assign_contributor_team "sophie.laurent@fromage-co.com" "Infrastructure" 10
}

ensure_portfolio_team() {
  local team_name="$1" description="$2" order="$3"
  local tid payload
  tid=$(portfolio_team_id_by_name "$team_name")
  payload=$(jq -n --arg n "$team_name" --arg d "$description" --argjson o "$order" '{name:$n,description:$d,is_active:true,display_order:$o}')

  if [ -n "$tid" ]; then
    api_json PATCH "/api/portfolio/teams/${tid}" "$payload" >/dev/null
    log_ok "Updated portfolio team '$team_name'"
  else
    api_json POST "/api/portfolio/teams" "$payload" >/dev/null
    log_ok "Created portfolio team '$team_name'"
  fi
}

assign_contributor_team() {
  local email="$1" team_name="$2" availability="$3"
  local uid tid payload
  uid=$(user_id_by_email "$email")
  if [ -z "$uid" ]; then
    log_warn "Contributor '$email' not found; skipping team assignment"
    return
  fi
  tid=$(portfolio_team_id_by_name "$team_name")
  if [ -z "$tid" ]; then
    log_warn "Portfolio team '$team_name' not found; skipping '$email'"
    return
  fi

  payload=$(jq -n --arg tid "$tid" --argjson a "$availability" '{team_id:$tid,project_availability:$a}')
  api_json POST "/api/portfolio/team-members/by-user/${uid}" "$payload" >/dev/null
  log_ok "Contributor '$email' -> '$team_name' (${availability} days/month)"
}

run_imports_and_relations() {
  local ifrs_id fr_id nl_id it_id us_id

  # Core settings first
  setup_settings

  # Base import order with CoA provisioning/assignment before spend/capex
  import_csv "/api/companies/import" "$ROOT_DIR/01-companies.csv"

  ifrs_id=$(resolve_ifrs_coa)
  fr_id=$(ensure_coa "PCG — France" "PCG_FR" "COUNTRY" "FR")
  nl_id=$(ensure_coa "RGS — Netherlands" "RGS_NL" "COUNTRY" "NL")
  it_id=$(ensure_coa "PdC — Italia" "PDC_IT" "COUNTRY" "IT")
  us_id=$(ensure_coa "US GAAP" "US_GAAP" "COUNTRY" "US")

  import_accounts_for_coa "$ifrs_id" "$ROOT_DIR/02-accounts-ifrs.csv"
  import_accounts_for_coa "$fr_id" "$ROOT_DIR/03-accounts-fr.csv"
  import_accounts_for_coa "$nl_id" "$ROOT_DIR/04-accounts-nl.csv"
  import_accounts_for_coa "$it_id" "$ROOT_DIR/05-accounts-it.csv"
  import_accounts_for_coa "$us_id" "$ROOT_DIR/06-accounts-us.csv"

  assign_company_coa "Fromage & Co SA" "$fr_id"
  assign_company_coa "Kaasmeester BV" "$nl_id"
  assign_company_coa "Formaggio Supremo SRL" "$it_id"
  assign_company_coa "Fromage & Co Inc." "$us_id"

  import_csv "/api/suppliers/import" "$ROOT_DIR/07-suppliers.csv"
  import_csv "/api/departments/import" "$ROOT_DIR/08-departments.csv"
  import_csv "/api/contacts/import" "$ROOT_DIR/09-contacts.csv"
  import_csv "/api/users/import" "$ROOT_DIR/10-users.csv"
  import_csv "/api/business-processes/import" "$ROOT_DIR/11-business-processes.csv"
  import_csv "/api/applications/import" "$ROOT_DIR/12-applications.csv"
  import_csv "/api/contracts/import" "$ROOT_DIR/13-contracts.csv"

  ensure_locations

  import_csv "/api/spend-items/import" "$ROOT_DIR/14-spend-items.csv"
  import_csv "/api/capex-items/import" "$ROOT_DIR/15-capex-items.csv"
  import_csv "/api/portfolio/projects/import" "$ROOT_DIR/16-portfolio-projects.csv"
  import_csv "/api/portfolio/requests/import" "$ROOT_DIR/17-portfolio-requests.csv"
  import_csv "/api/assets/import" "$ROOT_DIR/18-assets.csv"
  import_csv "/api/tasks/import" "$ROOT_DIR/19-tasks.csv"

  # Post-import relations
  link_suites
  link_application_departments
  ensure_app_instances
  ensure_middleware_etl_enabled
  ensure_interfaces
  ensure_interface_bindings
  ensure_connection_entities
  ensure_connections
  ensure_connection_legs
  ensure_interface_connection_links
  link_contracts_to_apps
  link_spend_to_apps
  set_company_allocations
  ensure_project_timeline
  ensure_portfolio_teams_and_capacity
}

main() {
  login
  run_imports_and_relations
  log_ok "Fromage tenant bootstrap completed"
  log_info "Safe to rerun: script is idempotent and uses replace/upsert semantics"
}

main "$@"
