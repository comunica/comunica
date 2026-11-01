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

## Phase comparison with Oxigraph (LDBC SNB 0.1, warm, one core)

Oxigraph 0.5.13, in-memory store (`perf-harness/oxbench`), medians of 200 reps, ms:

| Query | Parse | Optimize | Execute (parse + optimize + evaluate) | + JSON serialization |
|---|---|---|---|---|
| IS1 | 0.04 | 0.13 | 0.29-0.31 | 0.30-0.33 |
| IS4 | 0.009 | 0.011 | 0.035-0.040 | 0.035 |
| IS5 | 0.017 | 0.04 | 0.10-0.15 | 0.11-0.16 |
| IS7 | 0.07-0.11 | 0.19-0.28 | 0.39-0.53 | 0.38-0.54 |

HTTP floor in Node (trivial server, same fetch client): 0.5-0.8 ms median. Oxigraph server round trip: 1.1-1.5 ms.

JS floor (`perf-harness/js-floor.js`, hand-coded lookups on rdf-stores + JSON): IS1 0.015-0.019 ms, IS4 0.008-0.009 ms, IS5 0.007-0.009 ms.
So plain JS is as fast as Oxigraph for the data access; the gap is engine architecture, not the language.

## Prototypes on branch claude/lucid-meitner-jg4dy5-perf-all (one commit each, toggled with globalThis.__proto flags)

Interleaved HTTP measurements (client medians, sum over LDBC SNB 0.1 IS1/IS4/IS5/IS7, 2 instances each, server on 1 core, Oxigraph 0.5.13 interleaved at the same time):

| Step | Effect |
|---|---|
| Endpoint: noLog, noIpc, negCache, fastJson | -14% |
| Engine: cow, joinConnectedFast, joinPlan, lazyLog, noSkolem | -6.5% (in-process -20%) |
| skipNoop, groupFast, traqulaFast | -2 to -3% |
| bgpFast (+ cardinalitySynchronous ordering, selective start) | -10% (in-process evaluate -71%) |
| fastParse (hand-written parser, falls back to traqula) | -14% (in-process parse -79%) |
| lazyRight, sharedTypeCache | -15% (mostly IS7) |
| pruneFast | no measurable effect over HTTP |

Final run: base 53.8 ms, all prototypes 19.1 ms, Oxigraph 14.2 ms (all 1.34x Oxigraph; base 3.8x).
Per query: IS4/IS5 1.1-1.15x, IS1 1.3x, IS7 1.7x.
No regressions on IS2, IS3, IS6, IC2, IC6, IC11, IC12 (all 0.86x of base in total).

Caveats: noIpc disables the master's timeouts (needs another timeout design); noSkolem assumes no blank nodes;
fastJson omits the httpRequests metadata; bgpFast and lazyRight are eager-evaluation heuristics with budgets.
