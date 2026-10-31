# Benchmark LDBC SNB BI File

This internal package benchmarks Comunica File using the [LDBC Social Network Benchmark (Business Intelligence)](https://ldbcouncil.org/benchmarks/snb/), on the same scale 0.1 dataset as `benchmark-ldbc-snb-file`.

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.
As the BI queries take much longer than the Interactive ones, `npm run performance:ci` runs a single instance of each query, without warmup or replication, with a timeout of 60 seconds, and skips BI5, BI9 and BI19, which time out.

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
