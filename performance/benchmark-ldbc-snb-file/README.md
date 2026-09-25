# Benchmark LDBC SNB File

This internal package benchmarks Comunica File using the [LDBC Social Network Benchmark (Interactive)](https://ldbcouncil.org/benchmarks/snb/).

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.
To keep the CI run short, `npm run performance:ci` skips IC3 (always empty at scale 0.1), IC9 (times out) and IC14 (not an LDBC-defined query).

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
