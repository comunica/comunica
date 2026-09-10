# Benchmark BSBM File 10k

This internal package benchmarks Comunica File using the [BSBM](http://wbsg.informatik.uni-mannheim.de/bizer/berlinsparqlbenchmark/) benchmark,
at 10 000 products instead of the 1 000 used by [`benchmark-bsbm-file`](../benchmark-bsbm-file),
which is 3 564 773 triples instead of 374 911.

The smaller variant stays as it is. It gives fast feedback and a long history, and the two answer
different questions: at 1 000 products the whole query set runs in a fifth of a second, so what it
measures is dominated by per-query overhead, while at 10 000 products the joins and the scans they
read are what takes the time.

Compare your current version of Comunica locally with the latest published release by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance differences.

If you only want to check the performance of your current version of Comunica,
you can run `npm run performance:ci` instead,
which is what the CI will run as well for continuous performance measurements.

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
