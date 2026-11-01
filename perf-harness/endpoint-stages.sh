#!/bin/bash
# Start an instrumented Comunica endpoint, run the HTTP benchmark, and print server-side stage medians.
# Usage: endpoint-stages.sh <label> <split|shared> [ENV=value...]
#   shared: master and worker on core 2 (like a 1-CPU container); split: worker moved to core 1.
D=/tmp/claude-0/-home-user/7bf21b86-8f89-5e90-9537-3a82abe18f0f/scratchpad
H=/home/user/comunica/perf-harness
Q=$D/sanity5/experiments/ldbc-snb/generated/queries
label=$1; mode=$2; shift 2
cd ${ENGINE:-/home/user/comunica/engines/query-sparql-file}
env NODE_ENV=production REPORT_EVERY=200 "$@" taskset -c 2 node -r $H/endpoint-instrument.js --max-old-space-size=8192 --max-semi-space-size=256 ./bin/http.js -c $D/prof/ctx.json -p 3002 -t 300 -l info > /dev/null 2> $D/prof/stages-$label.err &
until curl -s -o /dev/null http://localhost:3002/sparql; do sleep 1; done
if [ "$mode" = split ]; then
  for pid in $(pgrep -f "bin/http.js -c $D/prof/ctx.json -p 300[2]" | tail -n +2); do taskset -p -c 1 $pid > /dev/null; done
fi
curl -s -o /dev/null -G -H 'Accept: application/sparql-results+json' --data-urlencode 'query=ASK{?s ?p ?o}' http://localhost:3002/sparql
cd $D/prof
for q in 4 1; do
  echo "== $label IS$q"
  WARMUP=10 taskset -c 3 node http-bench.js http://localhost:3002/sparql 200 $Q/interactive-short-$q.sparql | tail -1
  grep ENDPOINT-STAGES $D/prof/stages-$label.err | tail -1
done
for pid in $(pgrep -f "bin/http.js -c $D/prof/ctx.json -p 300[2]"); do kill $pid; done
while pgrep -f "bin/http.js -c $D/prof/ctx.json -p 300[2]" > /dev/null; do sleep 1; done
