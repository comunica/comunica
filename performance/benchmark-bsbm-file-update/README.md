# Benchmark BSBM File Update

This internal package benchmarks SPARQL updates in Comunica File using the [Explore and Update use case](http://wbsg.informatik.uni-mannheim.de/bizer/berlinsparqlbenchmark/spec/ExploreAndUpdateUseCase/index.html) of the [BSBM](http://wbsg.informatik.uni-mannheim.de/bizer/berlinsparqlbenchmark/) benchmark,
through the `exploreAndUpdate` use case of the [jbr BSBM experiment](https://github.com/rubensworks/jbr.js/tree/master/packages/experiment-bsbm).

Each query mix run starts with the update query mix, which inserts a product with its offers and reviews (`U1`, `INSERT DATA`) twice,
and deletes an offer (`U2`, `DELETE WHERE`) three times,
followed by the read queries of the Explore use case (`1` to `12`) that [`benchmark-bsbm-file`](../benchmark-bsbm-file) also runs.
Updates are not executed in warmup runs.

The dataset has 1 000 products, of which the 30 that are inserted during the 15 runs are not part of `generated/dataset.nt`,
but of `generated/dataset_update.nt`.
So the read queries run over a slightly different dataset than in `benchmark-bsbm-file`, which changes during the runs.

As a local file can not be updated, the endpoint loads the dataset into an in-memory store,
which is ordered just like the stores that file sources are loaded into by default,
and which it uses as both the source and the destination of the updates.
This is done by `performance-endpoint-memory` of [`@comunica/utils-monorepo`](../../packages/utils-monorepo),
which starts the SPARQL endpoint of [`@comunica/query-sparql-file`](../../engines/query-sparql-file) over it, with updates enabled.
As restarting its worker after a timeout would revert all updates, the endpoint stops instead, which fails the benchmark.

Run the benchmark locally by running `npm run performance` from within this package.
This will output a file called `plot_queries_data.svg` that visualizes the performance.
Unlike the other benchmarks, it does not compare with the latest published release,
as the endpoint has to be started from the monorepo.

If you only want to run what the CI runs, use `npm run performance:ci` instead.

Continuous performance results are tracked on https://github.com/comunica/comunica-performance-results.
