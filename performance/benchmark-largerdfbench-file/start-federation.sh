#!/usr/bin/env bash
# Starts a Comunica SPARQL endpoint per LargeRDFBench dataset, one by one, and then a Comunica SPARQL endpoint on
# port 3001 that federates over them. It only exits when stopped, and then stops all endpoints.
# This replaces the source hooks of the jbr LargeRDFBench experiment until that experiment is published.
# Usage: start-federation.sh [count|ask|void]
# - count (default): the federation estimates cardinalities with COUNT queries.
# - ask: the federation sends no COUNT queries, and prunes sources without results with ASK queries.
# - void: the endpoints describe their data with VoID, from which the federation estimates cardinalities.
set -u
mode=${1:-count}
case "$mode" in
  count) member_args=(); federator_config= ;;
  ask) member_args=(); federator_config=config/federator-ask.json ;;
  void) member_args=(--emitVoid); federator_config=config/federator-void.json ;;
  *) echo "Unknown mode $mode, expected count, ask or void" >&2; exit 1 ;;
esac
trap 'trap - TERM INT EXIT; kill $(jobs -p) 2>/dev/null; wait' TERM INT EXIT
fail() {
  echo "$1" >&2
  # jbr waits for the federation endpoint without a time limit, so it is stopped as well.
  if ps -o args= -p "$PPID" | grep -q jbr; then
    kill "$PPID"
  fi
  exit 1
}
mkdir -p output/logs
sources=()
port=4000
for dataset in ChEBI DBPedia-Subset DrugBank GeoNames Jamendo KEGG LMDB NYT SWDFood; do
  port=$((port + 1))
  start=$SECONDS
  # The endpoint only accepts requests after warming up, which also loads its dataset.
  # Its availability is checked with a query rather than its service description, so that if computing the
  # VoID statistics of the service description fails, the queries fail instead of the start of the benchmark.
  node --max-old-space-size=1536 ../../engines/query-sparql-file/bin/http.js "file@generated/datasets/$dataset.nt" \
    -p "$port" -t 300 --warmup 2000 "${member_args[@]}" > "output/logs/member-$dataset.txt" 2>&1 &
  member=$!
  until curl -sf -o /dev/null --data-urlencode 'query=ASK { ?s ?p ?o }' "http://localhost:$port/sparql"; do
    if ! kill -0 "$member" 2>/dev/null; then
      fail "The endpoint of $dataset stopped, see output/logs/member-$dataset.txt"
    fi
    # A crashing worker is replaced, so the endpoint itself keeps running.
    if [ $((SECONDS - start)) -gt 600 ]; then
      fail "The endpoint of $dataset is not available after 600 s, see output/logs/member-$dataset.txt"
    fi
    sleep 0.5
  done
  echo "$dataset is available on port $port after $((SECONDS - start)) s" >&2
  sources+=("sparql@http://localhost:$port/sparql")
done
COMUNICA_CONFIG="${federator_config:+$PWD/$federator_config}" \
  node --max-old-space-size=4096 ../../engines/query-sparql/bin/http.js "${sources[@]}" -p 3001 -t 120 -i &
wait
