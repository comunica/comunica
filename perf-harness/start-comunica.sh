#!/bin/bash
# Start the instrumented Comunica endpoint on port 3002 (master and worker on core 2), with default prototype flags.
# Usage: start-comunica.sh <flags-json>
D=/tmp/claude-0/-home-user/7bf21b86-8f89-5e90-9537-3a82abe18f0f/scratchpad
H=/home/user/comunica/perf-harness
cd ${ENGINE:-/home/user/comunica/engines/query-sparql-file}
NODE_ENV=production DEFAULT_PROTO="$1" REPORT_EVERY=${REPORT_EVERY:-1000000} taskset -c 2 node -r $H/endpoint-instrument.js -r $H/patches/traqula-runtime.js --max-old-space-size=8192 --max-semi-space-size=256 ./bin/http.js -c $D/prof/ctx.json -p 3002 -t 300 -l info > /dev/null 2> $D/prof/comunica-3002.err &
until curl -s -o /dev/null http://localhost:3002/sparql; do sleep 1; done
curl -s -o /dev/null -G -H 'Accept: application/sparql-results+json' --data-urlencode 'query=ASK{?s ?p ?o}' http://localhost:3002/sparql
echo comunica-ready
