# Comunica Web Clients

This directory builds [Comunica web clients](https://github.com/comunica/jQuery-Widget.js) from the packages in this repository.
They are built on every commit to `master` and `next/*` branches, and for every release,
and are deployed to **https://comunica.github.io/comunica-web-clients/**,
from the `gh-pages` branch of [comunica/comunica-web-clients](https://github.com/comunica/comunica-web-clients).

The web client of the latest release remains available at https://query.comunica.dev/.

## Adding a web client

Add an entry to [`web-clients.json`](web-clients.json):

| Field | Description |
| --- | --- |
| `id` | Unique id, which is the directory of the web client, such as `master/default/`. |
| `label` | Name of the config, as shown in the web client and in the index. |
| `description` | Description of the config, as shown in the index. |
| `config` | Path of the Comunica config, relative to the root of this repository. |
| `release` | Optional, `true` if the web client must also be built for releases. Defaults to `false`, as release builds are kept forever, and a GitHub Pages site can be at most 1 GB. |
| `settings` | Optional settings, which are merged into the [default settings](https://github.com/comunica/jQuery-Widget.js/blob/master/settings.json) of the generator, such as `datasources` or `context`. |
| `queries` | Optional path of a directory with queries, relative to the root of this repository, which replaces the [default queries](https://github.com/comunica/jQuery-Widget.js/tree/master/queries) of the generator. |

## Building locally

After installing this repository with `yarn install`, run the following from its root:

```bash
yarn --cwd web-clients install --ignore-scripts
```

```bash
GITHUB_REF=refs/heads/master GITHUB_SHA=$(git rev-parse HEAD) node packages/utils-monorepo/bin/web-clients.js build . web-clients/build
```

The web clients are then built in `web-clients/build/master/`, which can be served by any static web server.
Only logging in with Solid requires the web client to run at its deployed URL.

## How it works

* [`package.json`](package.json) pins the version of [`@comunica/web-client-generator`](https://www.npmjs.com/package/@comunica/web-client-generator).
  It is installed here, and not as a dependency of the monorepo, as it depends on released versions of Comunica packages.
  If a breaking change requires changes to the generator, such as on `next/major`, it can point to a branch of the generator instead.
* [`webpack.config.js`](webpack.config.js) adapts the webpack config of the generator,
  so that the web clients bundle the packages of this repository, instead of the released packages that the generator depends on.
* The [`web-clients` tool](../packages/utils-monorepo/lib/webClients.ts) builds the web clients of a branch in a directory named after it,
  such as `master/` or `next-major/`.
  Releases are built in a directory of their major and minor version, such as `v5.4/`,
  so that a patch release such as v5.4.2 replaces v5.4.1.
  Releases are built without source maps, which make up most of the size of a web client.
* [`deploy.sh`](deploy.sh) replaces that directory on the `gh-pages` branch, and regenerates the index of all directories.
  A release directory is kept if it contains a newer release already, such as when the build of an older tag is re-run.
  The branch is replaced with a single commit, so that it does not grow with every build.
  If the site exceeds 900 MB, the deploy fails, and old releases must be removed from the `gh-pages` branch first.
