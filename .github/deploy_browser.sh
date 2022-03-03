#!/usr/bin/env bash
# Script to deploy all built comunica-browser.js scripts to https://github.com/rdfjs/comunica-browser

REPO_NAME="comunica/comunica"
TARGET_REPO_NAME="rdfjs/comunica-browser.git"
if [ "$GITHUB_REPOSITORY" != "$REPO_NAME" ] || ([ "$GITHUB_REF" != "refs/heads/master" ] && [[ ! "$GITHUB_REF" =~ refs/tags/* ]]); then exit; fi

# Set the target version
if [[ "$GITHUB_REF" =~ refs/tags/* ]]; then
    VERSION=${GITHUB_REF:10}
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
find engines -name 'comunica-browser.js*'

# Update browser scripts
rm -r engines/* 2> /dev/null
pushd ../../..
cp --parents $(find engines -name 'comunica-browser.js*') $targetDir

# If we're a release, update the major version folder
if [[ "$GITHUB_REF" =~ refs/tags/* ]]; then
    MAJORVERSION=$(echo $VERSION | sed "s/^\([^\.]*\)\..*$/\1/")

    targetDir="rdfjs-comunica-browser/versions/${MAJORVERSION}"
    mkdir -p $targetDir
    cd $targetDir

    # Update browser scripts
    rm -r engines/* 2> /dev/null
    pushd ../../..
    cp --parents $(find engines -name 'comunica-browser.js*') $targetDir
    popd
fi

popd

# Commit and push latest version
git add --all
git config user.name  "GitHub"
git config user.email "GitHub@github.org"
if [[ "$GITHUB_REF" =~ refs/tags/* ]]; then
    git commit -m "Update to comunica/comunica#$VERSION."
else
    git commit -m "Update to comunica/comunica#$GITHUB_SHA."
fi
git push -fq origin master 2>&1 > /dev/null
