#!/bin/bash
for package in packages/* engines/*; do
  if [ -f "$package/lib/index.ts" ]; then
    rm $package/typedoc.json
  fi
done
