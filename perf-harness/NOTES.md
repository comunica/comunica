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

## Lean evaluation and fair HTTP comparison (third round)

New prototype flags (all on branch claude/lucid-meitner-jg4dy5-perf-all):

- leanAlgebra: compiles fast-parsed SELECT queries into a plan and evaluates them as nested loops over plain rows:
  BGPs, property paths (link, alt, seq, inv, *, +, ?), OPTIONAL without filter, UNION, BIND with terms or COALESCE,
  ORDER BY on variables, DISTINCT, LIMIT/OFFSET. Bind joins are only used when they give the same results as joins.
  Falls back on unsupported shapes or after 200k steps. Reads all quads of a constant/bound subject once for star patterns.
- leanIdentify: source identification on the lean path without the SERVICE analysis.
- Faster fast parser (sticky regexes, no per-token slicing, no prefix copies); comparator cache for ORDER BY.

Validation: 14 short-read instances, 0 result or order differences against the regular pipeline, all on the lean path.
Fast parser: 32 queries equal to traqula's algebra, 0 different (LDBC + perf-harness/queries/parser-edge-cases.sparql).

In-process (warm, engine.query + JSON): IS4 0.05-0.06 ms, IS1 0.13-0.16 ms, IS7 0.14-0.16 ms.
Against leanBgp: IS2 9-10x faster (IS2#1 281 -> 28 ms), IS3 4x, IS6 6x, IS7 2x.

Findings about the comparison itself:

- Oxigraph --timeout-s spawns a sleeping thread per query for the whole timeout. Under load it runs out of threads
  (HTTP 500 "os error 11" after ~16k queries in 300 s, then a crash). The experiments send a few hundred queries per run,
  so they are not affected, but each thread spawn adds ~0.15-0.2 ms per Oxigraph query.
- Oxigraph is very slow on IS2 (56 s), IS3 (7-14 s), and IS6 (1.4 s), where Comunica takes 0.03-0.16 s.
- The runner reports times with 1 ms resolution, so sub-millisecond differences on IS1/4/5/7 are not visible in results.
- Hash-based store (nonOrderedStore): faster point lookups (IS1 -0.15-0.2 ms over HTTP), but complex reads get much slower
  (IC2 0.86 -> 4.3-5.3 s, IC3/IC8 up to 1.9x), so the ordered store should stay.
- Cold regime: after 1 ms without running a query (idle or busy-spinning), the same in-process query takes 1.5-3x longer,
  and 4.4x after 5 ms, also on a 20k-triple dataset. So it is cache state (likely other tenants on the VM host), and it hits
  Comunica's larger per-request code footprint harder than Oxigraph's.
- Node HTTP floor: a trivial Node server costs 125-185 us CPU per request; Oxigraph 233 us (IS4) and 400 us (IS1);
  Comunica 553 us and 860 us (including GC threads).
- GC: young-generation scavenges take 50-90 ms per ~200 MB with the 1.6 GB old generation, ~25-30 us per request.
  --max-semi-space-size 256 is the best of 16/64/256 (512 similar). No leak: heap is flat after full GCs.

Block-interleaved HTTP medians, runner client, against Oxigraph without --timeout-s: IS1 1.28x, IS4 1.37x, IS5 1.24x,
IS7 1.11x slower (base was 3.8x before any prototype). Means are worse due to GC pauses.
