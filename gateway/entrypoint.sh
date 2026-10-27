#!/bin/sh
set -eu
umask 077
mkdir -p "${DATA_DIR:-/data}"
chmod 700 "${DATA_DIR:-/data}"
chown -R node:node "${DATA_DIR:-/data}"
exec gosu node:node "$@"
