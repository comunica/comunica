# Engine config

The config files in this directory are **internal** to `@comunica/query-sparql`, and define its default engine.

**Do not import these files from your own config files.**
They import the newest versioned config file of [`@comunica/config-query-sparql`](https://github.com/comunica/comunica/tree/master/engines/config-query-sparql#usage),
and are changed in minor releases whenever this engine gets new actors.
So a config that imports them changes after an in-range update, which can break it.

Instead, import the versioned config file that `config-default.json` imports directly from `@comunica/config-query-sparql`.

[Read more about config versioning](https://comunica.dev/docs/modify/advanced/config_versioning/).
