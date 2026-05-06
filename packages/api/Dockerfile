# Container image for the per-user Sandbox Durable Object that backs the
# chat agent's runPython tool. The base image is published by Cloudflare
# and ships Python 3, Node.js, and an HTTP control plane the @cloudflare/
# sandbox SDK speaks to. Pin the version explicitly; bump when upgrading
# the @cloudflare/sandbox npm package so they stay in lockstep.
FROM docker.io/cloudflare/sandbox:0.9.3

# Standard documentation directive — the base image listens on this port.
EXPOSE 8080
