#!/bin/bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

DEFAULT_NOS_MAP_ROOT="/home/user/m20-fastlio/maps"
if [[ -z "${MAP_ROOT:-}" && -d "$DEFAULT_NOS_MAP_ROOT" ]]; then
  MAP_ROOT="$DEFAULT_NOS_MAP_ROOT"
else
  MAP_ROOT="${MAP_ROOT:-$DIR/data}"
fi

exec python3 backend_py/server.py \
  --http-port "${HTTP_PORT:-8000}" \
  --ws-port "${WS_PORT:-8080}" \
  --m20-host "${M20_HOST:-10.21.31.103}" \
  --m20-port "${M20_PORT:-30001}" \
  --nav-host "${NAV_HOST:-127.0.0.1}" \
  --nav-port "${NAV_PORT:-30011}" \
  --nav-route-mode "${NAV_ROUTE_MODE:-custom}" \
  --nav-viz-host "${NAV_VIZ_HOST:-127.0.0.1}" \
  --nav-viz-port "${NAV_VIZ_PORT:-30013}" \
  --nav-viz-register-port "${NAV_VIZ_REGISTER_PORT:-30012}" \
  --map-root "$MAP_ROOT"
