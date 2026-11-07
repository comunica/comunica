# Benchmark WatDiv File

This internal package benchmarks Comunica File using the [WatDiv](https://dsg.uwaterloo.ca/watdiv/) benchmark.

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.

The CI also measures how long Comunica takes to ingest the dataset, and its total memory usage afterwards.
Once `npm run performance:ci` has generated the dataset, you can measure this from the repository root with:

```bash
node --max-old-space-size=8192 packages/utils-monorepo/bin/performance-ingestion.js \
  engines/query-sparql-file performance/benchmark-watdiv-file/generated/dataset.nt watdiv-file \
  performance/benchmark-watdiv-file/output/ingestion.json
```

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
