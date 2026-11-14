# Benchmark LargeRDFBench File

This internal package benchmarks Comunica as a federation engine using the FedBench part of [LargeRDFBench](https://github.com/dice-group/LargeRDFBench).

Each of the 9 datasets is served by its own Comunica SPARQL endpoint over a file (ports 4001 to 4009),
and the queries are sent to a Comunica SPARQL endpoint that federates over these 9 endpoints (port 3001).
Both use the current version of Comunica in this repository.
`start-federation.sh` starts these endpoints, one by one, and logs their output to `output/logs/`.

The datasets are a sample of 4.1 million triples of the 165 million triples of FedBench, over which all 23 queries produce the same results as over the full data.
It is downloaded from [comunica-performance-assets](https://github.com/comunica/comunica-performance-assets),
and was generated with the [jbr LargeRDFBench experiment](https://github.com/rubensworks/jbr.js/pull/109).
Until that experiment is published, this benchmark runs the queries with the generic `sparql-custom` experiment.

Run the benchmark locally by running `npm run performance` from within this package.

If you only want to run what the CI runs, use `npm run performance:ci` instead.
To fit within the CI time budget, it runs a single instance of each query after a warmup round,
and skips C2, C6, S1 and S9, which time out or make the endpoints run out of memory.

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
