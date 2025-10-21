#!/bin/bash
if [[ $(docker run -i --rm comunica/query-sparql:dev https://fragments.dbpedia.org/2015-10/en "SELECT * WHERE { ?s ?p ?o } LIMIT 200" | wc -l) -lt 202 ]]; then
  echo "Unexpected Docker container output"
  exit 1
fi
