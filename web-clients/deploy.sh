#!/usr/bin/env bash
# Deploys the web clients built in the given directory to the gh-pages branch of comunica/comunica-web-clients.
# Only the directory of this build (such as master or v5.4) is replaced. The branch is replaced by a single
# commit, so that it does not grow with every build. If another deploy changed the branch in the meantime,
# this deploy is retried on top of it.
set -euo pipefail

build=$(realpath "$1")
monorepo=$(realpath "$(dirname "$0")/..")
repository=${WEB_CLIENTS_REPOSITORY:-https://github.com/comunica/comunica-web-clients.git}
branch=gh-pages
# GitHub Pages sites can be at most 1 GB.
max_size=${WEB_CLIENTS_MAX_SIZE:-900000000}

site=$(mktemp -d)
trap 'rm -rf "$site"' EXIT

for attempt in 1 2 3 4 5; do
  rm -rf "$site"
  mkdir "$site"
  cd "$site"
  git init -q -b deploy
  git remote add origin "$repository"
  if [ -n "${GH_TOKEN:-}" ]; then
    git config http.https://github.com/.extraheader \
      "AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)"
  fi

  status=0
  git ls-remote --exit-code --heads origin "$branch" > /dev/null || status=$?
  if [ "$status" -eq 0 ]; then
    git fetch -q --depth 1 origin "$branch"
    lease=$(git rev-parse FETCH_HEAD)
    git checkout -q FETCH_HEAD -- .
  elif [ "$status" -eq 2 ]; then
    # The branch does not exist yet, and must still not exist when pushing.
    lease=
  else
    exit "$status"
  fi

  node "$monorepo/packages/utils-monorepo/bin/web-clients.js" update "$monorepo" "$build" .
  touch .nojekyll
  git add --all
  if [ -n "$lease" ] && git diff --cached --quiet "$lease"; then
    echo "Nothing to deploy"
    exit 0
  fi

  size=$(du -sb --exclude=.git . | cut -f1)
  echo "The site is $((size / 1000000)) MB"
  if [ "$size" -gt "$max_size" ]; then
    echo "The site exceeds $((max_size / 1000000)) MB, so old releases must be removed first" >&2
    exit 1
  fi

  git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit -q -m "Deploy comunica/comunica@${GITHUB_SHA:-unknown}"
  if git push -q --force-with-lease="$branch:$lease" origin "HEAD:$branch"; then
    echo "Deployed"
    exit 0
  fi
  echo "The $branch branch changed during this deploy, retrying" >&2
  sleep $((attempt * 5))
done

echo "Deploying failed" >&2
exit 1
