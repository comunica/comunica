#!/usr/bin/env bash
# Script to deploy all built comunica-browser.js scripts to https://github.com/rdfjs/comunica-browser

REPO_NAME="comunica/comunica"
TARGET_REPO_NAME="rdfjs/comunica-browser.git"
if [ "$TRAVIS_REPO_SLUG" != "$REPO_NAME" ] || ([ "$TRAVIS_BRANCH" != "master" ] && [ -z "$TRAVIS_TAG" ]); then exit; fi

# Set the target version
if [ ! -z "$TRAVIS_TAG" ]; then
    VERSION=${TRAVIS_TAG:1}
else
    VERSION="latest"
fi

echo -e "Uploading browser scripts for version $VERSION...\n"

# Checkout the target repo
git clone https://${GH_TOKEN}@github.com/$TARGET_REPO_NAME rdfjs-comunica-browser
targetDir="rdfjs-comunica-browser/versions/${VERSION}"
mkdir -p $targetDir
cd $targetDir

echo "Discovered browser scripts:"
find packages -name 'comunica-browser.js*'

# Update browser scripts
rm -r packages/* 2> /dev/null
pushd ../../..
cp --parents $(find packages -name 'comunica-browser.js*') $targetDir

# If we're a release, update the major version folder
if [ ! -z "$TRAVIS_TAG" ]; then
    MAJORVERSION=$(echo $VERSION | sed "s/^\([^\.]*\)\..*$/\1/")

    targetDir="rdfjs-comunica-browser/versions/${MAJORVERSION}"
    mkdir -p $targetDir
    cd $targetDir

    # Update browser scripts
    rm -r packages/* 2> /dev/null
    pushd ../../..
    cp --parents $(find packages -name 'comunica-browser.js*') $targetDir
    popd
fi

popd

# Commit and push latest version
git add --all
git config user.name  "Travis"
git config user.email "travis@travis-ci.org"
if [ ! -z "$TRAVIS_TAG" ]; then
    git commit -m "Update to comunica/comunica#$TRAVIS_TAG."
else
    git commit -m "Update to comunica/comunica#$TRAVIS_COMMIT."
fi
git push -fq origin master 2>&1 > /dev/null
