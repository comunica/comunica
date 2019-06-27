# Create entries for the greenkeeper.json file
find . -name package.json -maxdepth 3 | grep "^./packages" | sed "s/\.\///g" | gsed "s/^\(.*\)$/\"\1\",/g"
