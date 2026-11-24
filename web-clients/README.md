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
| `release` | Optional, `true` if the web client must also be built for releases. Defaults to `false`. |
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
