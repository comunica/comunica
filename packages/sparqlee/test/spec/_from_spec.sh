#!/usr/bin/env bash
# Bash3 Boilerplate. Copyright (c) 2014, kvz.io

set -o errexit
set -o pipefail
set -o nounset
# set -o xtrace

# Set magic variables for current file & dir
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__base="$(basename ${__file} .sh)"
__root="$(cd "$(dirname "${__dir}")" && pwd)" # <-- change this as it depends on your app

source="$__dir/_rdf-tests/sparql11/data-sparql11/functions"

ls $source | grep .*\.rq | while read file ; do
  filename="${file%.*}"
  echo $filename

  # Create file if it doesn't exists
  touch $__dir/$filename.spec.ts

  # Format the SPARQL request to fit in a JSDOC comment
  request_comment=$(sed 's/^/ \* /g' $source/$file | sed 's/\t/  /g')

  # Filename of outputfile, handle renames
  output_file="$(echo $source/$filename.srx | sed 's/plus-1-corrected/plus-1/' | sed 's/plus-2-corrected/plus-2/')"

  # Format expected output to fit in a JSDOC comment
  expected_output=$(sed 's/^/ \* /g' $output_file | sed 's/\t/  /g' | sed 's/^ \* $/ \*/g')

  # Get the manifest entry for the corresponding file
  # some have different names, god help us
  manifest_name=$(echo "$filename" | sed -r 's/(.*)-01/\1/' | sed 's/strbefore01/strbefore01a/' | sed 's/strafter01/strafter01a/' | sed 's/strdt03/strdt03-rdf11/' | sed 's/strlang03/strlang03-rdf11/') 
  manifest_reg=":$manifest_name (.*\n){6,12}.*\s\."
  manifest_entry=$(rg "$manifest_reg" --multiline $source/manifest.ttl)
  manifest_entry=$(echo "$manifest_entry" | sed 's/^/ \* /g' | sed 's/\t/  /g') #Format
  # echo "$manifest_entry"

  # Template
  content="import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: $file
 *
$request_comment
 */

/**
 * Manifest Entry
$manifest_entry
 */

describe('We should respect the $filename spec', () => {
  const {} = Data.data();
  testAll([

  ]);
});

/**
 * RESULTS: $filename.srx
 *
$expected_output
 */
"
  echo "$content" > $__dir/$filename.spec.ts
done
