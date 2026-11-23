#!/bin/bash
# Usage: ablate.sh <name> <sd> <batch> <push> <queries...>
SP=$(cd "$(dirname "$0")" && pwd)
name=$1; sd=$2; batch=$3; push=$4; shift 4
cd /home/user/comunica && python3 $SP/toggle.py sd=$sd batch=$batch push=$push && yarn -s build:engines > /tmp/ablate-$name.log 2>&1 || { echo "BUILD FAILED $name"; exit 1; }
cd performance/nde-federated && PLAN=1 TIMEOUT=600 ./run-some.sh runs-remaining/$name "$@" > runs-remaining/$name.log 2>&1
echo "done $name"
