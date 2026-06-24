#!/bin/bash
if [[ $(./comunica-sparql-file https://www.rubensworks.net/ "SELECT * WHERE { ?s ?p ?o } LIMIT 200" | wc -l) -lt 202 ]]; then
  echo "Unexpected npm bin output"
  exit 1
fi
