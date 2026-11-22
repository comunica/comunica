#!/bin/bash
# Runs the given queries with the current engine build, one after another.
# Usage: ./run-some.sh <out-dir> <id>... (ids as in run-all.sh, e.g. q1 q4b)
out=$1; shift
declare -A Q=( [q1]=q1-women-artists:q1 [q2]=q2-vught-victims:wo2 [q3]=q3-camp-objects:wo2 [q4]=q4-portraits:q4 [q4b]=q4b-portraits-noopt:q4 [q5]=q5-andriessen:q5 [q5b]=q5b-andriessen-anchored:q5 [q6]=q6-gouda-monuments:q6 [q6b]=q6b-gouda-monuments-noopt:q6 [q7]=q7-discovery:q7 )
mkdir -p $out
for id in "$@"; do
  f=${Q[$id]%%:*}; s=${Q[$id]##*:}
  env FOLLOW_SD_REDIRECTS=1 $RUN_ENV node run-query.js queries/$f.rq sources/$s.txt $out/$id ${TIMEOUT:-600} $CONFIG 2>/dev/null | grep -o '{"status[^}]*' | cut -c1-150 | sed "s/^/$id /"
done
