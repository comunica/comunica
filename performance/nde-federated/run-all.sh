#!/bin/bash
# Runs all queries with the current engine build, one after another.
# Usage: ./run-all.sh <out-dir> [extra env assignments...]
out=$1; shift
for q in q1-women-artists:q1:600 q2-vught-victims:wo2:600 q3-camp-objects:wo2:600 q4-portraits:q4:600 q4b-portraits-noopt:q4:600 q5-andriessen:q5:600 q5b-andriessen-anchored:q5:600 q6-gouda-monuments:q6:600 q6b-gouda-monuments-noopt:q6:600 q7-discovery:q7:600; do
  f=${q%%:*}; r=${q#*:}; s=${r%%:*}; t=${r##*:}; id=${f%%-*}
  env FOLLOW_SD_REDIRECTS=1 "$@" node run-query.js queries/$f.rq sources/$s.txt $out/$id $t 2>/dev/null | grep -o '{"status[^}]*' | cut -c1-150 | sed "s/^/$id /"
done
