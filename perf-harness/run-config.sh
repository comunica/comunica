#!/bin/bash
# Start the Comunica endpoint (master and worker on one core) with extra env, benchmark it over HTTP, stop it.
# Usage: run-config.sh <label> <reps> [ENV=value...]
P=/tmp/claude-0/-home-user/7bf21b86-8f89-5e90-9537-3a82abe18f0f/scratchpad/prof
Q=$P/../sanity5/experiments/ldbc-snb/generated/queries
label=$1; reps=$2; shift 2
ENGINE=${ENGINE:-/home/user/comunica/engines/query-sparql-file}
cd $ENGINE
env NODE_ENV=production "$@" taskset -c 0 node --max-old-space-size=8192 --max-semi-space-size=256 ./bin/http.js -c $P/ctx.json -p 3000 -t 300 -l info > $P/server-$label.log 2>&1 &
until curl -s -o /dev/null http://localhost:3000/sparql; do sleep 1; done
curl -s -o /dev/null -G -H 'Accept: application/sparql-results+json' --data-urlencode 'query=ASK{?s ?p ?o}' http://localhost:3000/sparql
cd $P
WARMUP=3 node http-bench.js http://localhost:3000/sparql $reps $Q/interactive-short-{1,4,5,6,7}.sparql > $P/res-$label.tsv
for pid in $(pgrep -f "bin/htt[p].js -c $P/ctx.json"); do kill $pid; done
while pgrep -f "bin/htt[p].js -c $P/ctx.json" >/dev/null; do sleep 1; done
echo "== $label"; cat $P/res-$label.tsv
