FROM safarov/freeswitch:1.10.12

COPY scripts/prepare-config.sh /usr/local/bin/ecallipse-prepare-config
COPY conf/00-ecallipse.xml /tmp/00-ecallipse.xml

RUN /bin/sh /usr/local/bin/ecallipse-prepare-config \
    && cp /tmp/00-ecallipse.xml /etc/freeswitch/dialplan/default/00-ecallipse.xml \
    && rm /tmp/00-ecallipse.xml
