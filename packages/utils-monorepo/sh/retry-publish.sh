#!/bin/bash
# In rare cases, lerna publish may fail to publish some packages
# This script will iterate over all packages (in proper order), and attempt to republish for the current version them one-by-one.
# This script can be safely called multiple times.
npx lerna list --toposort 2> /dev/null | while read package; do
  name=$(echo "$package" | sed "s/@comunica\///")
  if [[ $name == config-* ]] || [[ $name == query-* ]]; then
    pushd engines/$name
  else
    pushd packages/$name
  fi
  npm publish
  popd
done
