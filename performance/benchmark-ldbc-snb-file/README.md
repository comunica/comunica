# Benchmark LDBC SNB File

This internal package benchmarks Comunica File using the [LDBC Social Network Benchmark (Interactive)](https://ldbcouncil.org/benchmarks/snb/).

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.
To keep the CI run short, `npm run performance:ci` skips IC3 (always empty at scale 0.1), IC9 (times out) and IC14 (not an LDBC-defined query).

The CI also measures how long Comunica takes to ingest the dataset, and its total memory usage afterwards.
Once `npm run performance:ci` has generated the dataset, you can measure this from the repository root with:

```bash
node --max-old-space-size=8192 packages/utils-monorepo/bin/performance-ingestion.js \
  engines/query-sparql-file performance/benchmark-ldbc-snb-file/generated/dataset.nt LDBC-SNB-File \
  performance/benchmark-ldbc-snb-file/output/ingestion.json
```

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
