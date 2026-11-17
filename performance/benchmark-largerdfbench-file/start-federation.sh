#!/usr/bin/env bash
# Starts a Comunica SPARQL endpoint per LargeRDFBench dataset, one by one, and then a Comunica SPARQL endpoint on
# port 3001 that federates over them. It only exits when stopped, and then stops all endpoints.
# This replaces the source hooks of the jbr LargeRDFBench experiment until that experiment is published.
set -u
trap 'trap - TERM INT EXIT; kill $(jobs -p) 2>/dev/null; wait' TERM INT EXIT
mkdir -p output/logs
sources=()
port=4000
for dataset in ChEBI DBPedia-Subset DrugBank GeoNames Jamendo KEGG LMDB NYT SWDFood; do
  port=$((port + 1))
  start=$SECONDS
  # The endpoint only accepts requests after warming up, which also loads its dataset.
  node --max-old-space-size=1536 ../../engines/query-sparql-file/bin/http.js "file@generated/datasets/$dataset.nt" \
    -p "$port" -t 300 --warmup 2000 > "output/logs/member-$dataset.txt" 2>&1 &
  member=$!
  until curl -sf -o /dev/null "http://localhost:$port/sparql"; do
    if ! kill -0 "$member" 2>/dev/null; then
      echo "The endpoint of $dataset stopped, see output/logs/member-$dataset.txt" >&2
      exit 1
    fi
    sleep 0.5
  done
  echo "$dataset is available on port $port after $((SECONDS - start)) s" >&2
  sources+=("sparql@http://localhost:$port/sparql")
done
node --max-old-space-size=4096 ../../engines/query-sparql/bin/http.js "${sources[@]}" -p 3001 -t 120 -i &
wait
