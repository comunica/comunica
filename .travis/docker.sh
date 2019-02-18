#!/usr/bin/env bash

if [[ $1 == "push" ]]; then
    # Make sure we are logged in
    echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
fi

if [ ! -z "$TRAVIS_TAG" ]; then
    VERSION=${TRAVIS_TAG:1}
else
    VERSION="dev"
fi
echo "Building images with tag $VERSION"

# Set up a temporary npm registry on http://localhost:4873 in which we publish all current comunica packages
mkdir -p /tmp/verdaccio/storage
verdaccio --config .travis/verdaccio-config.yaml &
sleep 1
REGISTRY_PID=$!
npm-cli-adduser --registry http://localhost:4873 --username comunica --password comunica --email comunica@linkeddatafragments.org
yarn run publish-bare --registry http://localhost:4873 > /dev/null
if [ "$(uname)" == "Darwin" ]; then
    NPM_REGISTRY="http://host.docker.internal:4873/"
else
    NPM_REGISTRY="http://127.0.0.1:4873/"
fi

# Build images for all packages with a Dockerfile, and optionally push them
for package in packages/*; do
    if [ -f $package/Dockerfile ]; then
        imagename="comunica/"$(echo $package | sed "s/packages\///")

        echo "Building Docker image $imagename..."
        if ! docker build --network="host" --build-arg NPM_REGISTRY=$NPM_REGISTRY -t $imagename:$VERSION $package; then
            echo "Failed to build Docker image for $package"
            exit 1;
        fi
        docker tag $imagename:$VERSION $imagename:latest

        if [[ $1 == "push" ]]; then
            echo "Pushing Docker image $imagename..."
            docker push $imagename:$VERSION
            docker push $imagename:latest
        fi
    fi
done

# Stop and clean npm registry
kill -9 $REGISTRY_PID
rm -r /tmp/verdaccio/storage
