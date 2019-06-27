find . -name package.json -maxdepth 3 | grep "^./packages" | sed "s/\.\///g" | while read p; do
    if ! grep -q "$p" greenkeeper.json; then
        echo "Could not find an entry for '$p' in greenkeeper.json."
        echo "You can use .travis/mkgreenkeeper.sh to help you auto-generate the entries."
        exit 1
    fi
done
