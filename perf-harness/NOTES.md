# Ideas for selective query performance (Comunica), for later

TODO (agreed with the user, to do later): idea 1 below.

Deferred by the user, to consider after the prototypes of ideas 2, 3 and 5:

1. Evaluate whole star BGPs inside a source with synchronous lookups (one nested loop over the indexes, one bindings stream), skipping per-pattern operations, metadata/counts, iterator chains and join mediation. Largest estimated potential (store + wrappers + iterators ~25% of CPU).
4. Synchronous result path for small results: produce an array when all operators can run synchronously, serialize in one write instead of asynciterator chains and streamed JSON (iterators ~10%).
6. Lower dispatch and allocation overhead: lazy failTest messages, no promise per trivially synchronous test, fewer Immutable.js context/bindings copies, fewer objects in rdf-stores (shorter full GCs of 1-1.6 s).
7. Reliable measurement setup first: CPU-time benchmark in the repo, many runs on a quiet machine (process-level noise was about +-30%).

Rejected by the user: parse cache (unrealistic repetition), not killing the worker on timeout.

## Measured prototypes (in-process, per-phase interleaved medians, LDBC SNB 0.1 IS1/4/5/6/7, 1 core)

- Idea 5 (copy-on-write mapOperation + join-connected fast path): optimize phase -24%, total -0.30 ms per query (-8%). Traqula clones per query 332 -> 56.
- Idea 3 (skip skolemize wrapper for single source without blank nodes): total -0.19 ms (-5%). Hypermedia unwrap did not take effect (directSourceState not used), untested.
- Idea 2 (join actors filtered by logical type, no debug-log object with LoggerVoid): total -0.13 ms (-3%). Join tests per query 40 -> 23.
- Process-level A/B could not resolve these (noise about +-12%); per-phase interleaving in one process could.
