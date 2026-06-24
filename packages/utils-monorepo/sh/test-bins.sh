#!/usr/bin/env bash

# Set up a temporary npm registry on http://localhost:4873 in which we publish all current lerna packages
echo "Initializing temporary npm registry..."
mkdir -p /tmp/verdaccio/storage
tool_dir="$(dirname "${BASH_SOURCE[0]}")/.."
node node_modules/.bin/verdaccio --config $tool_dir/config/verdaccio-config.yaml &
sleep 1
REGISTRY_PID=$!
npx npm-cli-adduser --registry http://localhost:4873 --username lerna --password lerna --email lerna@example.org
npx npm-cli-login -r http://localhost:4873 -u lerna -p lerna -e lerna@example.org

# Deploy packages
echo "Deploy all packages to temporary npm registry..."
npx lerna exec --concurrency 50 -- npm publish --silent --registry http://localhost:4873 > /dev/null

# Restart the temporary npm registry, but now add an uplink to npm
echo "Restart npm registry..."
kill -9 $REGISTRY_PID
node node_modules/.bin/verdaccio --config $tool_dir/config/verdaccio-config-uplink.yaml &
sleep 1
REGISTRY_PID=$!
echo $REGISTRY_PID
function finish {
    # Stop and clean npm registry
    echo "Stopping npm registry..."
    kill -9 $REGISTRY_PID
    rm -r /tmp/verdaccio/storage
}
trap finish EXIT INT TERM

# Test all engines
for engine in engines/*; do
  if [ -f $engine/test/test-bin.sh ]; then
    absenginepath=$(realpath $engine)

    # Get package name
    pushd $engine > /dev/null
    name=$(npm pkg get name | node -e 'process.stdin.once("data", d => console.log(Object.values(JSON.parse(d))[0]))')
    popd > /dev/null

    # Install package
    echo "Installing $name..."
    rm -rf /tmp/comunica-test-bin/
    mkdir -p /tmp/comunica-test-bin/
    pushd /tmp/comunica-test-bin/ > /dev/null
    npm install $name --registry=http://localhost:4873

    # Test package
    echo "Testing $name..."
    cd node_modules/.bin/
    set -e # Hard crash on an error
    $absenginepath/test/test-bin.sh
    set +e
    popd > /dev/null
  fi
done

# TODO: when done, also test older configs
