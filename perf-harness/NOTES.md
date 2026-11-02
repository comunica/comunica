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

## WatDiv and BSBM with all prototypes (fourth round)

Setup like the experiments: Comunica cluster endpoint on one core, Oxigraph 0.5.13 with --timeout-s 300 on one core
(host network), client on a third core. Comunica base is the same build with all flags off.

WatDiv (scale 10, 5 queries per template, runner with replication 3 and warmup 1, 2 rounds, mean ms per template):
prototypes are faster than base on 19 of 20 templates (not C2: 33 vs 23 ms), and faster than Oxigraph on 16
(not L1, S2, S5, S7, by 0.3-2 ms). Sum of query means: base 2.9 s, prototypes 2.1 s, Oxigraph 36.3 s (C3: 7 s per query).
Result counts are equal for all engines; 100 WatDiv instances give the same results with and without the prototypes.

The lean evaluator was 3-5x slower than base on L2 and L5 until the fan-out and star heuristics (commit 648773f).

BSBM (1000 products, test driver with 5 warmup and 10 runs, 2 rounds): QMpH base 10.0-12.1k, prototypes 15.5-17.5k,
Oxigraph 37.7-37.9k. Oxigraph is 1.4-4x faster per query type. BSBM queries use FILTER, DESCRIBE, and CONSTRUCT,
which the lean evaluator does not support, so they only gain from the other prototypes.

## WatDiv parity (fifth round)

New prototype flags:

- sdCache: reuse the serialized service description. The runner checks availability with a GET before every query,
  which made Comunica build its service description each time (0.85 ms CPU right before each measured query, 0.17 ms
  with the cache). Small WatDiv queries: server time mean 2.00 -> 1.80 ms.
- leanScan: direct lookups in the sorted blocks indexes (binary search of the key range, then a plain loop), instead of
  readQuads with generators, pattern arrays, and iterators. rdf-stores allocated 147 of 216 KB per WatDiv L1 query.
  In-process 0.66x (geometric mean, 95 WatDiv instances); over HTTP the small-query server median went 1.53 -> 1.10 ms.
- leanPredicateCounts: count patterns whose only constant is the predicate, so C1-C3 (no other constants) can start
  from their least frequent predicate. leanStartLimit (a number, 10000) raises the maximum start cardinality.
  All 100 WatDiv instances now run on the lean path (was 90).
- leanNoStars: no whole-subject reads. With direct scans a point lookup is a binary search, and reading whole subjects
  read 358,850 quads for C3 where 9,176 point lookups suffice.
- leanFastRows: unassign variables by setting undefined instead of deleting them, which turned rows into dictionary
  objects that were slow to copy (C3 lean: 109 -> 25 ms in-process).

Diagnosis tools: inproc-server.js REQ_LOG (per-request stages and GC pauses), TOGGLE_FLAG (A/B rounds on one server),
and a client-side trace preload (send, headers, end, client GCs) joined on absolute time.
Findings: with all flags only 2-3 server GCs happen per runner round and none overlap slow executions; slow executions
are mostly in client-side time ("pre"/"post"), at the same positions every round (the runner is deterministic),
and Oxigraph shows them at a similar rate (39 vs 42 of 612 executions more than 2 ms above the instance median).

Experiment-like rounds (cluster endpoint on one core, fresh Oxigraph 0.5.13 with --timeout-s 300 per round, runner with
replication 3 and warmup 1), 61 WatDiv instances with results:

| Build | Rounds | Instances where Comunica's mean is slower | Per-round comparisons Comunica at least as fast | Sum of means Comunica / Oxigraph |
|---|---|---|---|---|
| Fourth round flags | 4 | 10 | 199 / 244 | 2083 / 37600 ms |
| + sdCache, leanScan | 4 | 8 | 216 / 244 | 1932 / 35166 ms |
| + predicate counts, start limit, no stars, fast rows | 4 | 5 | 222 / 244 | 1161 / 34841 ms |

With all flags (4 rounds): Comunica's median is at most Oxigraph's on 61 of 61 instances, Comunica is significantly
faster on 44 (one-sided permutation test, p < 0.05), and none of the 5 instances with a higher mean differs
significantly (p = 0.20-0.50). For scale, Oxigraph against itself (rounds 1-2 vs 3-4) is slower by mean on 54 of 61.
Over 10 rounds, only L1#0 and L1#1 remain slower by mean (4.03 vs 3.13 and 3.57 vs 2.93 ms; 567 of 610 per-round wins).

Those L1 stalls came from the runner, not the endpoint: the response headers arrived on time, but the end of the
response came 5-7 ms later, with no GC pause on either side. The runner was pinned to one core, so its concurrent GC
threads (90 GCs per round, mostly from hashing C3's 33k rows) competed with its main thread. Oxigraph takes ~7 s per C3,
which gives the runner idle time to finish that work; Comunica answers C3 in ~25 ms, so the work spills into the next
measured queries. The experiments do not pin the runner (endpoints get a 1-CPU quota), so this was an artifact of the
setup here. With the runner on two cores (endpoints still pinned to one core each), 4 rounds: Comunica slower by mean on
1 of 61 (L1#1, 2.33 vs 2.25 ms, one 1-ms tick over 12 executions, 3 of 4 rounds won), at least as fast in 237 of 244
per-round comparisons, sum of means 1128 vs 35606 ms.
With 8 such rounds: Comunica's mean and median are at most Oxigraph's on all 61 instances, it is significantly faster on
58 (one-sided permutation test, p < 0.05) and significantly slower on none; 463 of 488 per-round comparisons.
A single round (what one experiment run reports) still shows 0-7 instances slower, mostly L1/L3 where both take ~2 ms.
Mean ms per template (Comunica / Oxigraph): C1 4.8 / 11.5, C3 199 / 6941, F1 2.0 / 5.5, F2 1.9 / 3.3, F4 1.5 / 2.6,
F5 2.5 / 6.2, L1 1.8 / 2.3, L2 3.2 / 6.4, L3 1.8 / 2.6, L4 1.4 / 2.2, L5 2.4 / 6.9, S1 2.5 / 8.8, S2 2.3 / 4.4, S6 1.2 / 2.1.
--single-threaded-gc or --single-threaded on the endpoint did not reduce its slow executions (p90 got slightly worse).

## Ablation with all flags

In-process (ablation.js, interleaved variants in rotating order, medians per query; LDBC SNB 0.1 short reads 2 per
template and 9 reps, WatDiv 5 per template and 5 reps, BSBM 5 per query and 5 reps). Geometric mean speedup over no
prototypes, cumulative in the order built:

| Step | LDBC | WatDiv | BSBM |
|---|---|---|---|
| none | 1.00x | 1.00x | 1.00x |
| + cow, joinConnectedFast, joinPlan, lazyLog | 1.15x | 1.17x | 0.95x |
| + noSkolem | 1.35x | 1.41x | 1.04x |
| + skipNoop, groupFast, traqulaFast | 1.49x | 1.61x | 1.14x |
| + bgpFast | 1.79x | 1.83x | 1.55x |
| + fastParse | 2.53x | 2.41x | 1.93x |
| + sharedTypeCache, lazyRight, pruneFast, leanOptimize | 2.67x | 2.86x | 2.22x |
| + leanAlgebra | 8.24x | 3.21x | 2.38x |
| + leanIdentify, leanMediators, leanMaterialize | 13.77x | 4.23x | 2.57x |
| + leanScan | 16.24x | 6.06x | 2.53x |
| + leanPredicateCounts, leanStartLimit | 17.05x | 8.29x | 2.58x |
| + leanNoStars, leanFastRows | 23.60x | 11.12x | 2.67x |

Leave-one-out (geometric mean slowdown per query when only that flag is off; noise is a few percent;
noSkolem and fastParse are prerequisites of the lean path, so their numbers include losing it):

| Flag | LDBC | WatDiv | BSBM |
|---|---|---|---|
| fastParse | +1234% | +540% | +76% |
| noSkolem | +860% | +426% | +25% |
| leanAlgebra | +745% | +303% | +20% |
| cow | +101% | +44% | +16% |
| leanIdentify | +86% | +35% | +5% |
| sharedTypeCache | +71% | +29% | +10% |
| skipNoop | +66% | +28% | +8% |
| leanScan | +50% | +79% | +2% |
| leanMediators | +49% | +22% | +5% |
| joinConnectedFast | +35% | +11% | +10% |
| leanNoStars | +33% | +16% | +1% |
| lazyRight | +29% | +4% | +4% |
| groupFast | +22% | +5% | +1% |
| joinPlan | +20% | 0% | +6% |
| leanFastRows | +20% | +15% | +3% |
| traqulaFast | +17% | -2% | +5% |
| pruneFast | +16% | -4% | +2% |
| bgpFast | +13% | -5% | +69% |
| leanMaterialize | +13% | -6% | +2% |
| lazyLog | +11% | -4% | +4% |
| leanOptimize | +10% | -6% | +9% |
| leanStartLimit | +9% | +9% | +1% |
| leanPredicateCounts | +6% | +50% | 0% |

Endpoint flags over HTTP (http-ab.sh, per-request interleaved, LDBC IS1/4/5/7, sum of client medians, 150 reps),
slowdown when only that flag is off: fastJson +41%, noIpc +13%, negCache +5%, noLog none measurable; all four off +70%.
sdCache is measured above with the runner, as only the runner's availability checks hit it.

Runner client (client-bench.js, block-interleaved, 1000 reps, medians): the Node http client instead of fetch saves
0.35-0.42 ms per request on Comunica and 0.44-0.70 ms on Oxigraph, so it helps both engines.
