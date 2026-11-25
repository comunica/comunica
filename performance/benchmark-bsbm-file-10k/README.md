# Benchmark BSBM File 10k

This internal package benchmarks Comunica File using the [BSBM](http://wbsg.informatik.uni-mannheim.de/bizer/berlinsparqlbenchmark/) benchmark,
at 10 000 products instead of the 1 000 used by [`benchmark-bsbm-file`](../benchmark-bsbm-file),
which is 3 564 773 triples instead of 374 911.

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.

The CI also measures how long Comunica takes to ingest the dataset, and its total memory usage afterwards.
Once `npm run performance:ci` has generated the dataset, you can measure this from the repository root with:

```bash
node --max-old-space-size=8192 packages/utils-monorepo/bin/performance-ingestion.js \
  engines/query-sparql-file performance/benchmark-bsbm-file-10k/generated/dataset.nt bsbm-file-10k \
  performance/benchmark-bsbm-file-10k/output/ingestion.json
```

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
