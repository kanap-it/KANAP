#!/usr/bin/env bash
# Screenshot runner — captures Astro preview URLs as PNGs.
# Usage:  ./shoot.sh <route-name> <url> [viewport]
#   e.g.  ./shoot.sh home "http://localhost:4321/" 1440x900
# Produces two files in /tmp/kanap-shots:
#   <route-name>--light.png
#   <route-name>--dark.png
#
# The `?theme=` query param is honoured by the no-flash script in
# BaseLayout, which writes the chosen theme to localStorage before paint.

set -euo pipefail

name="$1"
url="$2"
viewport="${3:-1440x900}"
width="${viewport%x*}"
height="${viewport#*x}"

mkdir -p /tmp/kanap-shots

for mode in light dark; do
  out="/tmp/kanap-shots/${name}--${mode}.png"
  full_url="${url}?theme=${mode}"

  # --hide-scrollbars keeps screenshots uncluttered
  # --virtual-time-budget gives fonts + JS time to settle
  chromium --headless=new \
    --disable-gpu \
    --no-sandbox \
    --hide-scrollbars \
    --window-size="${width},${height}" \
    --virtual-time-budget=3000 \
    --screenshot="${out}" \
    "${full_url}" 2>/dev/null

  echo "  ${out}"
done
