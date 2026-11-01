#!/bin/bash
# Run each variant in its own process (fixed flags), alternating variants over several runs.
# Usage: ab-driver.sh <runs> <rounds> <reps> <out-prefix> <name=json-flags[|node-flags]>...
P=/tmp/claude-0/-home-user/7bf21b86-8f89-5e90-9537-3a82abe18f0f/scratchpad/prof
Q=$P/../sanity5/experiments/ldbc-snb/generated/queries
runs=$1; rounds=$2; reps=$3; out=$4; shift 4
ENGINE=${ENGINE:-/home/user/comunica/engines/query-sparql-file}
QUERIES=${QUERIES:-"$Q/interactive-short-1.sparql $Q/interactive-short-4.sparql $Q/interactive-short-5.sparql $Q/interactive-short-6.sparql $Q/interactive-short-7.sparql"}
variants=("$@")
n=${#variants[@]}
for r in $(seq 1 $runs); do
  for i in $(seq 0 $((n - 1))); do
    v=${variants[$(( (i + r) % n ))]}
    name=${v%%=*}; rest=${v#*=}; flags=${rest%%|*}; nodeflags=""
    [[ "$rest" == *"|"* ]] && nodeflags=${rest#*|}
    PER_QUERY=1 taskset -c 1 node --max-old-space-size=8192 ${nodeflags:---max-semi-space-size=256} $P/ab.js $ENGINE $P/../sanity5/experiments/ldbc-snb/generated/dataset.nt $rounds $reps "{\"$name\":$flags}" $QUERIES > $P/$out-$name-$r.txt 2>&1
    echo "run $r $name: $(sed -n 2p $P/$out-$name-$r.txt)"
  done
done
