#!/usr/bin/env bash
# Obtain the next alpha version id of Comunica
latest=$(yarn tag list @comunica/core | grep "next:" | sed "s/^.*next: \(.*\)$/\1/")
latest_id=$(echo $latest | sed "s/^.*-alpha\.\(.*\)\.0$/\1/")
next_id=$(($latest_id+1))
echo $next_id
