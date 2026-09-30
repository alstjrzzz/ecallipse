#!/bin/sh
set -eu

sed -i "s@data=\"external_rtp_ip=[^\"]*\"@data=\"external_rtp_ip=${MEDIA_IP}\"@" /etc/freeswitch/vars.xml
exec /docker-entrypoint.sh "$@"
