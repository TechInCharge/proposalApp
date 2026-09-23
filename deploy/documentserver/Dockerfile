# ONLYOFFICE's published Docker Hub images ship supervisor config files
# (/etc/supervisor/conf.d/ds-*.conf) with a literal, unsubstituted
# "COMPANY_NAME" template placeholder in every path (command/directory/
# NODE_CONFIG_DIR/log file paths) instead of the real value ("onlyoffice").
# Their own build pipeline is supposed to sed-substitute this at image build
# time (see config/supervisor/ds/*.conf and the ARG COMPANY_NAME=onlyoffice
# in github.com/ONLYOFFICE/Docker-DocumentServer's Dockerfile) — evidently
# didn't happen for these published tags. Without this fix, supervisord
# refuses to start at all (it validates every conf.d file before starting
# anything), so docservice/converter/adminpanel never come up and the whole
# editor 502s.
#
# Confirmed reproducing identically across three separate image digests
# (:latest / 9.4.0.1, 9.4.0, 9.3.1.2) — this is an upstream packaging bug,
# not something specific to one bad push. Bump the base tag below if a
# future ONLYOFFICE release fixes it upstream (drop this file and
# run-document-server.sh entirely, and go back to deploying
# onlyoffice/documentserver:<tag> directly).
#
# A build-time `sed` fix alone (patching the conf files in a RUN layer) is
# NOT enough: /etc/supervisor/conf.d/ds-adminpanel.conf's mtime predates our
# build entirely (confirmed via `ls -la` in a running container — every
# other ds-*.conf shows today's date, this one shows the upstream image's
# original build date), meaning it isn't present/finalized in the layer our
# build-time sed can see. run-document-server.sh (the image's own
# ENTRYPOINT) is patched below instead, to re-apply the same substitution
# immediately before `service supervisor start` — after everything else the
# entrypoint does to prepare conf.d, whatever that turns out to be.
FROM onlyoffice/documentserver:9.3.1.2

COPY run-document-server.sh /app/ds/run-document-server.sh
RUN chmod 755 /app/ds/run-document-server.sh
