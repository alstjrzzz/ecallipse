#!/bin/sh
set -eu

mkdir -p /etc/freeswitch
cp -a /usr/share/freeswitch/conf/vanilla/. /etc/freeswitch/

sed -i 's/default_password=1234/default_password=ecallipse/' /etc/freeswitch/vars.xml
sed -i 's/domain=\$\${local_ip_v4}/domain=localhost/' /etc/freeswitch/vars.xml
sed -i 's@cmd="stun-set" data="external_rtp_ip=stun:stun.freeswitch.org"@cmd="set" data="external_rtp_ip=127.0.0.1"@' /etc/freeswitch/vars.xml
sed -i 's@external_sip_ip=stun:stun.freeswitch.org@external_sip_ip=127.0.0.1@' /etc/freeswitch/vars.xml
sed -i 's@<param name="listen-ip" value="::"/>@<param name="listen-ip" value="127.0.0.1"/>@' /etc/freeswitch/autoload_configs/event_socket.conf.xml

sed -i 's@^[[:space:]]*<!--[[:space:]]*<param name="rtp-start-port" value="16384"/>[[:space:]]*-->@    <param name="rtp-start-port" value="16384"/>@' /etc/freeswitch/autoload_configs/switch.conf.xml
sed -i 's@^[[:space:]]*<!--[[:space:]]*<param name="rtp-end-port" value="32768"/>[[:space:]]*-->@    <param name="rtp-end-port" value="16484"/>@' /etc/freeswitch/autoload_configs/switch.conf.xml

# Browsers reach the container through Docker NAT, so treat every peer as remote and advertise external_rtp_ip.
sed -i 's@<network-lists>@<network-lists>\n    <list name="ecallipse-none" default="deny"/>@' /etc/freeswitch/autoload_configs/acl.conf.xml
sed -i 's@<param name="local-network-acl" value="localnet.auto"/>@<param name="local-network-acl" value="ecallipse-none"/>@' /etc/freeswitch/sip_profiles/internal.xml
