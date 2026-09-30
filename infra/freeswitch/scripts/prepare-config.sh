#!/bin/sh
set -eu

mkdir -p /etc/freeswitch
cp -a /usr/share/freeswitch/conf/vanilla/. /etc/freeswitch/

sed -i 's/default_password=1234/default_password=ecallipse/' /etc/freeswitch/vars.xml
sed -i 's/domain=\$\${local_ip_v4}/domain=localhost/' /etc/freeswitch/vars.xml
sed -i 's@external_rtp_ip=stun:stun.freeswitch.org@external_rtp_ip=host.docker.internal@' /etc/freeswitch/vars.xml
sed -i 's@external_sip_ip=stun:stun.freeswitch.org@external_sip_ip=host.docker.internal@' /etc/freeswitch/vars.xml
sed -i 's@<param name="listen-ip" value="::"/>@<param name="listen-ip" value="127.0.0.1"/>@' /etc/freeswitch/autoload_configs/event_socket.conf.xml

sed -i 's@^[[:space:]]*<!--[[:space:]]*<param name="rtp-start-port" value="16384"/>[[:space:]]*-->@    <param name="rtp-start-port" value="16384"/>@' /etc/freeswitch/autoload_configs/switch.conf.xml
sed -i 's@^[[:space:]]*<!--[[:space:]]*<param name="rtp-end-port" value="32768"/>[[:space:]]*-->@    <param name="rtp-end-port" value="16484"/>@' /etc/freeswitch/autoload_configs/switch.conf.xml
