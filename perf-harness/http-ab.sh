#!/bin/bash
# Start an instrumented endpoint (master and worker on core 2), run an interleaved HTTP A/B from core 3, stop it.
# Usage: http-ab.sh <label> <reps> <variants-json> <query-file>...
D=/tmp/claude-0/-home-user/7bf21b86-8f89-5e90-9537-3a82abe18f0f/scratchpad
H=/home/user/comunica/perf-harness
label=$1; reps=$2; variants=$3; shift 3
cd ${ENGINE:-/home/user/comunica/engines/query-sparql-file}
NODE_ENV=production REPORT_EVERY=${REPORT_EVERY:-400} taskset -c 2 node -r $H/endpoint-instrument.js --max-old-space-size=8192 --max-semi-space-size=256 ./bin/http.js -c $D/prof/ctx.json -p 3002 -t 300 -l info > /dev/null 2> $D/prof/httpab-$label.err &
until curl -s -o /dev/null http://localhost:3002/sparql; do sleep 1; done
curl -s -o /dev/null -G -H 'Accept: application/sparql-results+json' --data-urlencode 'query=ASK{?s ?p ?o}' http://localhost:3002/sparql
taskset -c 3 node $H/http-ab.js http://localhost:3002/sparql $reps "$variants" "$@"
grep ENDPOINT-STAGES $D/prof/httpab-$label.err | tail -${STAGE_LINES:-4}
for pid in $(pgrep -f "bin/http.js -c $D/prof/ctx.json -p 300[2]"); do kill $pid; done
while pgrep -f "bin/http.js -c $D/prof/ctx.json -p 300[2]" > /dev/null; do sleep 1; done
