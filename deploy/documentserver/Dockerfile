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
# future ONLYOFFICE release fixes it upstream (drop this file entirely and
# go back to deploying onlyoffice/documentserver:<tag> directly).
FROM onlyoffice/documentserver:9.3.1.2

RUN sed -i 's/COMPANY_NAME/onlyoffice/g' /etc/supervisor/conf.d/*.conf
