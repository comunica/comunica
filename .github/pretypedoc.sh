#!/bin/bash
for package in packages/* engines/*; do
  if [ -f "$package/lib/index.ts" ]; then
    echo "
  {
    \"extends\": [\"../../typedoc.base.json\"],
    \"entryPoints\": [\"lib/index.ts\"]
  }
  " > $package/typedoc.json
  fi
done
