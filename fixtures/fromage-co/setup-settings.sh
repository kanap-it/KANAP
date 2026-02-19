#!/usr/bin/env bash
# setup-settings.sh — Idempotent seed script for Fromage & Co demo tenant settings.
# Creates currency + IT Ops settings, portfolio classification, and analytics categories.
#
# Usage:
#   ./setup-settings.sh <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>
#
# BASE_URL is the tenant root URL without /api (the script adds it).
#   Local:  http://localhost:5173
#   QA:     https://fromage.qa.kanap.net
#   Prod:   https://fromage.kanap.net
#
# The user must be a tenant administrator of the Fromage & Co tenant
# (requires settings:admin and portfolio_settings:admin permissions).
#
# Example:
#   ./setup-settings.sh https://fromage.qa.kanap.net thomas.berger@fromage-co.com MyPass123

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Counters ────────────────────────────────────────────────────────────────────
CREATED=0
SKIPPED=0
ERRORS=0

log_info()  { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
log_ok()    { printf "${GREEN}[OK]${NC}   %s\n" "$1"; }
log_skip()  { printf "${YELLOW}[SKIP]${NC} %s\n" "$1"; }
log_error() { printf "${RED}[ERR]${NC}  %s\n" "$1"; ERRORS=$((ERRORS + 1)); }

# ── Usage ───────────────────────────────────────────────────────────────────────
if [ $# -ne 3 ]; then
  echo "Usage: $0 <BASE_URL> <TENANT_ADMIN_EMAIL> <TENANT_ADMIN_PASSWORD>"
  echo ""
  echo "BASE_URL is the tenant root URL without /api (the script adds it)."
  echo "  Local:  http://localhost:5173"
  echo "  QA:     https://fromage.qa.kanap.net"
  echo "  Prod:   https://fromage.kanap.net"
  echo ""
  echo "The user must be a tenant administrator of the Fromage & Co tenant."
  exit 1
fi

API_URL="${1%/}"
EMAIL="$2"
PASSWORD="$3"

# ── Prerequisites ───────────────────────────────────────────────────────────────
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed."
    exit 1
  fi
done

# ── Helpers ─────────────────────────────────────────────────────────────────────
api_get() {
  curl -sf -X GET "$API_URL$1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
}

api_post_code() {
  curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL$1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$2"
}

api_patch_code() {
  curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL$1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$2"
}

# Create entity if not already present by name.
# Args: label_type endpoint name json_body existing_json_array
create_if_missing() {
  local label_type="$1" endpoint="$2" name="$3" body="$4" existing="$5"

  if echo "$existing" | jq -e --arg n "$name" \
    'any(.[]; .name | ascii_downcase == ($n | ascii_downcase))' >/dev/null 2>&1; then
    log_skip "$label_type '$name' already exists"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  local http_code
  http_code=$(api_post_code "$endpoint" "$body") || http_code="000"

  if [ "$http_code" = "201" ]; then
    log_ok "Created $label_type '$name'"
    CREATED=$((CREATED + 1))
  else
    log_error "Failed to create $label_type '$name' (HTTP $http_code)"
  fi
}

# ════════════════════════════════════════════════════════════════════════════════
# Authentication
# ════════════════════════════════════════════════════════════════════════════════
log_info "Authenticating as $EMAIL..."

LOGIN_BODY=$(jq -n --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e,password:$p}')
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" -d "$LOGIN_BODY")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  log_error "Authentication failed (HTTP $HTTP_CODE)"
  exit 1
fi

TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.access_token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  log_error "No access_token in response"
  exit 1
fi
log_ok "Authenticated"

# ════════════════════════════════════════════════════════════════════════════════
# Section 1 — Currency Settings
# ════════════════════════════════════════════════════════════════════════════════
log_info "Configuring currency settings (EUR + USD)..."

CURRENCY_PATCH='{"reportingCurrency":"EUR","defaultSpendCurrency":"EUR","defaultCapexCurrency":"EUR","allowedCurrencies":["EUR","USD"]}'
CURRENCY_CODE=$(api_patch_code "/api/currency/settings" "$CURRENCY_PATCH") || CURRENCY_CODE="000"

if [ "$CURRENCY_CODE" = "200" ]; then
  log_ok "Currency settings updated (reporting/default: EUR, allowed: EUR+USD)"
else
  log_error "Failed to update currency settings (HTTP $CURRENCY_CODE)"
fi

# ════════════════════════════════════════════════════════════════════════════════
# Section 2 — IT Ops Settings (GET → merge → PATCH)
# ════════════════════════════════════════════════════════════════════════════════
log_info "Configuring IT Ops settings..."

CURRENT=$(api_get "/api/it-ops/settings")

NEW_KINDS='[
  {"code":"storage","label":"Storage","is_physical":true},
  {"code":"network_switch","label":"Network Switch","is_physical":true},
  {"code":"iot_gateway","label":"IoT Gateway","is_physical":true},
  {"code":"edge_node","label":"Edge Node","is_physical":false},
  {"code":"cloud_instance","label":"Cloud Instance","is_physical":false},
  {"code":"cloud_database","label":"Cloud Database","is_physical":false}
]'

NEW_OS='[
  {"code":"vmware_esxi_8_0","label":"VMware ESXi 8.0"},
  {"code":"suse_linux_enterprise_15","label":"SUSE Linux Enterprise 15"},
  {"code":"fortios_7_4","label":"FortiOS 7.4"},
  {"code":"cisco_meraki","label":"Cisco Meraki"},
  {"code":"schneider_ecostruxure","label":"Schneider EcoStruxure"},
  {"code":"amazon_linux_2023","label":"Amazon Linux 2023"},
  {"code":"amazon_rds","label":"Amazon RDS"}
]'

NEW_DOMAINS='[
  {"code":"fromage-co-local","label":"fromage-co.local","dns_suffix":"fromage-co.local"},
  {"code":"kaasmeester-local","label":"kaasmeester.local","dns_suffix":"kaasmeester.local"},
  {"code":"formaggio-supremo-local","label":"formaggio-supremo.local","dns_suffix":"formaggio-supremo.local"}
]'

# Merge: existing items + new items whose code is not already present
PATCH_BODY=$(echo "$CURRENT" | jq \
  --argjson nk "$NEW_KINDS" \
  --argjson nos "$NEW_OS" \
  --argjson nd "$NEW_DOMAINS" \
  '{
    serverKinds:
      ((.serverKinds // []) as $e |
       $e + [$nk[]  | select(.code as $c | [$e[].code] | index($c) == null)]),
    operatingSystems:
      ((.operatingSystems // []) as $e |
       $e + [$nos[] | select(.code as $c | [$e[].code] | index($c) == null)]),
    domains:
      ((.domains // []) as $e |
       $e + [$nd[]  | select(.code as $c | [$e[].code] | index($c) == null)])
  }')

# Count additions
ADDED_KINDS=$(echo "$CURRENT" | jq --argjson nk "$NEW_KINDS" \
  '(.serverKinds // []) as $e | [$nk[] | select(.code as $c | [$e[].code] | index($c) == null)] | length')
ADDED_OS=$(echo "$CURRENT" | jq --argjson nos "$NEW_OS" \
  '(.operatingSystems // []) as $e | [$nos[] | select(.code as $c | [$e[].code] | index($c) == null)] | length')
ADDED_DOMAINS=$(echo "$CURRENT" | jq --argjson nd "$NEW_DOMAINS" \
  '(.domains // []) as $e | [$nd[] | select(.code as $c | [$e[].code] | index($c) == null)] | length')

PATCH_CODE=$(api_patch_code "/api/it-ops/settings" "$PATCH_BODY") || PATCH_CODE="000"

if [ "$PATCH_CODE" = "200" ]; then
  log_ok "IT Ops settings updated (+${ADDED_KINDS} server kinds, +${ADDED_OS} operating systems, +${ADDED_DOMAINS} domains)"
  CREATED=$((CREATED + ADDED_KINDS + ADDED_OS + ADDED_DOMAINS))
  SKIPPED=$((SKIPPED + (6 - ADDED_KINDS) + (7 - ADDED_OS) + (3 - ADDED_DOMAINS)))
else
  log_error "Failed to update IT Ops settings (HTTP $PATCH_CODE)"
fi

# ════════════════════════════════════════════════════════════════════════════════
# Section 3 — Portfolio Classification (GET → POST missing)
# ════════════════════════════════════════════════════════════════════════════════

# ── 3a: Sources ─────────────────────────────────────────────────────────────────
log_info "Creating portfolio sources..."
EXISTING=$(api_get "/api/portfolio/classification/sources")

create_if_missing "source" "/api/portfolio/classification/sources" \
  "Strategic Plan" \
  '{"name":"Strategic Plan","description":"Multi-year strategic roadmap initiatives"}' \
  "$EXISTING"
create_if_missing "source" "/api/portfolio/classification/sources" \
  "IT Modernization" \
  '{"name":"IT Modernization","description":"Technical debt reduction and platform upgrades"}' \
  "$EXISTING"
create_if_missing "source" "/api/portfolio/classification/sources" \
  "Business Request" \
  '{"name":"Business Request","description":"Ad-hoc requests from business stakeholders"}' \
  "$EXISTING"
create_if_missing "source" "/api/portfolio/classification/sources" \
  "Regulatory Compliance" \
  '{"name":"Regulatory Compliance","description":"Regulatory and legal requirements"}' \
  "$EXISTING"

# ── 3b: Categories ──────────────────────────────────────────────────────────────
log_info "Creating portfolio categories..."
EXISTING=$(api_get "/api/portfolio/classification/categories")

create_if_missing "category" "/api/portfolio/classification/categories" \
  "Digital Transformation" \
  '{"name":"Digital Transformation","description":"Innovation and digital business capabilities"}' \
  "$EXISTING"
create_if_missing "category" "/api/portfolio/classification/categories" \
  "Business Applications" \
  '{"name":"Business Applications","description":"ERP, CRM, HR and core business systems"}' \
  "$EXISTING"
create_if_missing "category" "/api/portfolio/classification/categories" \
  "Infrastructure" \
  '{"name":"Infrastructure","description":"Servers, networks, cloud and datacenter"}' \
  "$EXISTING"
create_if_missing "category" "/api/portfolio/classification/categories" \
  "Security & Compliance" \
  '{"name":"Security & Compliance","description":"Cybersecurity, identity and compliance"}' \
  "$EXISTING"
create_if_missing "category" "/api/portfolio/classification/categories" \
  "Data & Analytics" \
  '{"name":"Data & Analytics","description":"BI, data platforms and advanced analytics"}' \
  "$EXISTING"

# ── 3c: Streams (linked to categories by ID) ────────────────────────────────────
log_info "Creating portfolio streams..."
CATEGORIES=$(api_get "/api/portfolio/classification/categories")
EXISTING_STREAMS=$(api_get "/api/portfolio/classification/streams")

create_stream() {
  local stream_name="$1" stream_desc="$2" category_name="$3"

  if echo "$EXISTING_STREAMS" | jq -e --arg n "$stream_name" \
    'any(.[]; .name | ascii_downcase == ($n | ascii_downcase))' >/dev/null 2>&1; then
    log_skip "stream '$stream_name' already exists"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  local cat_id
  cat_id=$(echo "$CATEGORIES" | jq -r --arg n "$category_name" \
    '.[] | select(.name | ascii_downcase == ($n | ascii_downcase)) | .id')

  if [ -z "$cat_id" ] || [ "$cat_id" = "null" ]; then
    log_error "Category '$category_name' not found — cannot create stream '$stream_name'"
    return 0
  fi

  local body
  body=$(jq -n --arg name "$stream_name" --arg desc "$stream_desc" --arg cid "$cat_id" \
    '{name:$name, description:$desc, category_id:$cid}')

  local http_code
  http_code=$(api_post_code "/api/portfolio/classification/streams" "$body") || http_code="000"

  if [ "$http_code" = "201" ]; then
    log_ok "Created stream '$stream_name' → $category_name"
    CREATED=$((CREATED + 1))
  else
    log_error "Failed to create stream '$stream_name' (HTTP $http_code)"
  fi
}

create_stream "Cheese Production Excellence" "Optimize production, aging and quality" "Digital Transformation"
create_stream "Customer Experience" "Improve B2B and B2C customer interactions" "Business Applications"
create_stream "IT Foundation" "Core IT infrastructure and shared services" "Infrastructure"

# ════════════════════════════════════════════════════════════════════════════════
# Section 4 — Analytics Categories (paginated GET → POST missing)
# ════════════════════════════════════════════════════════════════════════════════
log_info "Creating analytics categories..."
EXISTING=$(api_get "/api/analytics-categories?limit=200" | jq '.items')

create_if_missing "analytics category" "/api/analytics-categories" \
  "Productivity" '{"name":"Productivity","description":"Email, collaboration, office suites"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "ERP" '{"name":"ERP","description":"Enterprise resource planning"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "CRM" '{"name":"CRM","description":"Customer relationship management"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "ITSM" '{"name":"ITSM","description":"IT service management"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "HR" '{"name":"HR","description":"Human capital management"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Security" '{"name":"Security","description":"Cybersecurity and identity"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Infrastructure" '{"name":"Infrastructure","description":"Hosting, cloud and virtualization"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Monitoring" '{"name":"Monitoring","description":"Observability and alerting"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "IoT" '{"name":"IoT","description":"Internet of Things platforms"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Traceability" '{"name":"Traceability","description":"Supply chain and cold chain"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Analytics" '{"name":"Analytics","description":"BI, data platforms and reporting"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Managed Services" '{"name":"Managed Services","description":"Outsourced IT services"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Professional Services" '{"name":"Professional Services","description":"Consulting and staff augmentation"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "Training" '{"name":"Training","description":"Learning and certifications"}' "$EXISTING"
create_if_missing "analytics category" "/api/analytics-categories" \
  "General" '{"name":"General","description":"Miscellaneous IT expenses"}' "$EXISTING"

# ════════════════════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════════════════════
echo ""
log_info "Done!  Created: $CREATED  Skipped: $SKIPPED  Errors: $ERRORS"

if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi
