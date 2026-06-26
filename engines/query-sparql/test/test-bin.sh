#!/bin/bash
if [[ $(./comunica-sparql https://fragments.dbpedia.org/2015-10/en "SELECT * WHERE { ?s ?p ?o } LIMIT 200" | wc -l) -lt 202 ]]; then
  echo "Unexpected npm bin output"
  exit 1
fi
