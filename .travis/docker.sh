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

# Build images for all packages with a Dockerfile, and optionally push them
for package in packages/*; do
    if [ -f $package/Dockerfile ]; then
        imagename="comunica/"$(echo $package | sed "s/packages\///")

        echo "Building Docker image $imagename..."
        docker build -t $imagename:$VERSION $package
        docker tag $imagename:$VERSION $imagename:latest

        if [[ $1 == "push" ]]; then
            echo "Pushing Docker image $imagename..."
            docker push $imagename:$VERSION
            docker push $imagename:latest
        fi
    fi
done
