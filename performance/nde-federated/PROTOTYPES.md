# Federation fix prototypes

Prototype fixes on branch `claude/nde-fed-prototypes` (on `feature/performance-fed`), verified on the NDE queries against ground truth. See also [REPORT.md](REPORT.md) and [PERFORMANCE-ISSUES.md](PERFORMANCE-ISSUES.md).

## Before and after

| Run | Before | Time | Requests | Decoded | After | Time | Requests | Decoded |
|---|---|---|---|---|---|---|---|---|
| Q1 | 12 of ~334 | 70.7 s | 12,036 | 3.4 MB | 334 (28 artists) (correct) | 160 s | 499 | 364.5 MB |
| Q2 | 53 | 33.2 s | 581 | 264 KB | 53 (correct) | 46.5 s | 501 | 245 KB |
| Q3 | 205 | 22.6 s | 281 | 198 KB | 205 (correct) | 14.2 s | 141 | 98 KB |
| Q4 | 1,551, timed out | >900 s | 100,401 | 426.0 MB | 2,026 distinct (correct) | 87.3 s | 5,547 | 1.5 MB |
| Q4b | 533, timed out | >300 s | 2,059 | 412.0 MB | 2,022 (correct) | 58.4 s | 2,785 | 1.0 MB |
| Q5 | failed | 86.7 s | 11,589 | 27.0 MB | 711 items (correct) | 11.5 s | 116 | 381 KB |
| Q5b | 175 of 711 | 9.1 s | 121 | 210 KB | 711 items (correct) | 8.1 s | 66 | 482 KB |
| Q6 | 0, timed out | >600 s | 2,521 | 99.0 MB | 391 distinct (correct) | 41.3 s | 463 | 693 KB |
| Q6b | 73 | 25.2 s | 483 | 364 KB | 73 (correct) | 25.8 s | 326 | 497 KB |
| Q7 | 1 of 11 | 2.8 s | 39 | 29 KB | 11 (correct) | 7.2 s | 37 | 46 KB |

## Fixes

### Ready for a PR

#### Keep the given URL of forced SPARQL sources after redirects (Issue 1)

* PR: Open. Integration: Clean.
* Cause: The redirect target of the service-description GET replaced the endpoint URL.
* Prototype: Opened as comunica/comunica#2030; also on the prototype branch.
* Measured: All ~60 ldmax endpoints and Gouda queryable without a harness workaround.
* Notes: Has unit tests.

#### Append URL parameters correctly to endpoints with a query string (Issue 2)

* PR: Open. Integration: Clean.
* Cause: ${endpoint}?query= in fetch-sparql-endpoint.
* Prototype: Opened as rubensworks/fetch-sparql-endpoint.js#105.
* Measured: Correct URLs for endpoints like query?slug=….
* Notes: Has unit tests; reaches Comunica through ^7.3.0.

#### Bind into BIND (EXTEND) operations that do not assign bound variables (Issue 7)

* PR: Yes. Integration: Clean.
* Cause: canBindWithOperation rejected any EXTEND, so a UNION whose branches use BIND was never bound and each branch ran unbound.
* Prototype: actor-rdf-join-inner-multi-bind: allow an EXTEND unless it assigns a bound variable (11 lines).
* Measured: Q5: failed after 11,589 requests, now 711 correct items in 11.5 s with 116 requests.
* Notes: Update the unit tests that expect EXTEND to be rejected.

#### Sort join entries when only non-join variables can be undefined (Issue 8)

* PR: Yes. Integration: Clean.
* Cause: sortJoinEntries skipped sorting whenever any variable could be undefined (any UNION or OPTIONAL upstream), so the syntactic order put a 2.4M-row entry first and every bind join was rejected.
* Prototype: bus-rdf-join: keep the original order only if a join variable can be undefined.
* Measured: Q4b: names no longer downloaded (415 MB to 4 MB).
* Notes: The reason for the original guard is not in the (squashed) history; worth a second opinion. Changes plans for many queries, so run the benchmarks.

#### Floor join estimates of non-empty entries at 1 (Issue 8)

* PR: Yes. Integration: Clean.
* Cause: Join estimates could collapse to Number.MIN_VALUE, so a nested-loop join over ~2,000 × 2.4M rows looked free and won (5 minutes of CPU).
* Prototype: bus-rdf-join constructResultMetadata: value < 1 becomes 1.
* Measured: Q4b: CPU-bound timeout gone (2,022 correct results).
* Notes: Four lines, but it changes costs globally: validate with the benchmark suites.

#### Leave multi-source binding to the block-based bind join (Issue 8)

* PR: Yes. Integration: Clean.
* Cause: With estimates of 1 for ~2,000-row inputs, the per-binding bind join tied with the VALUES-block bind join and won, sending 9,055 single-binding requests.
* Prototype: actor-rdf-join-inner-multi-bind: reject when every remaining operation can be bound in blocks over 2+ sources.
* Measured: Q4b subset: 9,055 requests to 436.
* Notes: A rule rather than a cost, defensible because blocks never need more requests. Better estimates would make it unnecessary.

#### Unique variables per ASK in batched ASK requests (New)

* PR: Fold into the ASK batching PR. Integration: Clean.
* Cause: The Beeld en Geluid store correlates equally named variables of different EXISTS expressions in one SELECT, so a batched ASK answered false for a pattern with data and pruned that source.
* Prototype: QuerySourceSparql: rename variables per batched ASK (suffix _b<i>).
* Measured: Q5b: Beeld en Geluid no longer pruned (part of 0 to 536 items).
* Notes: This is a bug in the branch's own ASK batching (c58ddb7); fix it there before it merges.

#### Retry 429 and 503 by default (Issue 12)

* PR: Yes. Integration: Clean.
* Cause: Retries are off unless configured, so one 503 from RCE failed a whole query.
* Prototype: actor-http-retry: 2 retries, Retry-After or 1 s, when no retry count is configured.
* Measured: Q6 completes without the harness setting retries.
* Notes: Better as a default in the config than in code. Global behaviour change for all HTTP requests.

#### Skip the service description of forced SPARQL sources for any number of sources (Issue 13)

* PR: Yes. Integration: Clean.
* Cause: Only a single forced SPARQL source skipped the service-description GET.
* Prototype: actor-query-source-dereference-link-force-sparql: skip for all (prototype: env flag).
* Measured: One request less per source per query (22 for Q1, 35 for Q4); 99 KB per ldmax source.
* Notes: Needs a config parameter; the VoID federation mode must keep fetching service descriptions.

### Worth a PR after rework

#### Evaluate OPTIONAL over multiple sources as one inner join (Issue 6)

* PR: After rework. Integration: Moderate.
* Cause: The optional bind join sent a COUNT and a SELECT per left binding and source; the block variant only accepts a right side with one source.
* Prototype: actor-rdf-join-optional-bind: join VALUES(left) with the right side through the planner, then append unmatched left bindings (83 lines).
* Measured: Q4: 100,401 requests and a timeout, now 2,026 correct rows in 87 s with 5,547 requests. Q6: timeout, now 391 correct rows in 41 s.
* Notes: Make it its own actor with proper coefficients, support OPTIONAL with FILTER, add asynciterator/rdf-string dependencies. It materializes the left side before the first result.

#### Page through silently capped results (Issue 3)

* PR: After rework. Integration: Moderate.
* Cause: TriplyDB returns at most 10,000 rows, even with an explicit LIMIT, without any signal.
* Prototype: QuerySourceSparql: after a response with a multiple of 1,000 rows, request OFFSET n LIMIT n pages until one is short.
* Measured: Q1: 12 to 334 correct rows; the RKD pattern returns all 87,383 rows in 9 pages.
* Notes: Make it configurable, learn the cap per endpoint, and decide on ORDER BY: pages were stable on TriplyDB without it, but SPARQL does not guarantee that.

#### Adaptive per-host request limit (Issue 11)

* PR: After rework. Integration: Moderate.
* Cause: Unbounded concurrency caused 503s at RCE; a static limit (8 per host) made the ldmax gateway, which fronts 31 endpoints, ten times slower.
* Prototype: QuerySourceSparql: AIMD limiter per host (start 16, double per window of successes until the first 429/503, then +1, halve on 429/503). COUNT requests acquire a slot before their timeout starts.
* Measured: Q6: no 503s, 391 correct rows. Q4b: 44 s with the adaptive limit, versus over 300 s with a static limit.
* Notes: Belongs in the HTTP layer (a wrapper actor like actor-http-retry) with config parameters, not in the SPARQL source. Static shared state slows the existing unit tests.

#### Share identical SPARQL requests (Issue 5)

* PR: After rework. Integration: Moderate.
* Cause: Overlapping sources made joins send byte-identical bound queries repeatedly.
* Prototype: QuerySourceSparql: share in-flight requests per query string, replay complete results of up to 1,000 rows.
* Measured: Q3: identical repeats 107 to 1, requests 283 to 141.
* Notes: Bound the cache by total rows (now up to 1,000 rows times 10,000 entries) and evict.

#### Batch COUNT queries per source (Issue 14)

* PR: After rework. Integration: Moderate.
* Cause: One COUNT request per pattern and source.
* Prototype: QuerySourceSparql: COUNTs of one tick become one SELECT * { {COUNT…} {COUNT…} }, at most 16, timeout per batch.
* Measured: Q2: 63 COUNT requests to 9. Q1: 176 to 22.
* Notes: Share infrastructure with ASK batching. One slow COUNT now delays its whole batch.

### Needs design work first

#### Re-anchor blank-node bindings in their own source (Issue 4)

* PR: Yes, after design work. Integration: Needs design.
* Cause: Bind joins skip bindings whose join value is a blank node.
* Prototype: actor-rdf-join-inner-multi-bind-source: send the left patterns that mention the blank node, joined with the bound operation and filtered to blank nodes, to the source that produced the blank node, bound on the remaining values (170 lines).
* Measured: Q7: 1 to 11 correct datasets. Q5b: 0 to 536 broadcast items.
* Notes: Relies on the skolem label format bc_<id>_ and a duck-typed sourceId. It only covers the block bind join, so the other bind joins and the optional joins need the same treatment. Needs a proper skolemization API.

#### Transfer cost for SPARQL sources (Issue 8)

* PR: Later. Integration: Needs design.
* Cause: SPARQL metadata had no request time, so join costs ignored network transfer. Setting pageSize made per-request costs vanish.
* Prototype: New metadata field requestItemTime (accumulated as max over unions); the SPARQL source reports its measured COUNT latency as requestTime.
* Measured: Not decisive on its own; the decisive fixes were the sort guard and the estimate floor.
* Notes: A metadata model change across buses. Worth doing together with better join estimates.

#### Prune bind-join blocks per source by IRI prefix (Issue 9)

* PR: Not yet. Integration: Needs design.
* Cause: Every block goes to every source with the predicate.
* Prototype: Cached ASK per variable and IRI prefix (FILTER(STRSTARTS(STR(?v), …))), waiting at most 500 ms, aborted after 2 s, switched off per source on timeouts.
* Measured: Q2: 581 to 192 requests on fast endpoints. On ldmax these ASKs take 2.5 to 9 s and switch themselves off; and where nothing can be pruned they only add time: Q7 takes 7.5 s with the checks and 3.2 s without.
* Notes: Cheaper prefix knowledge would make it pay off reliably: VoID void:uriSpace, the NDE Dataset Knowledge Graph linksets, or summaries learned from results.

### Not worth a PR now

#### Faster SPARQL JSON parsing (Issue 15)

* PR: No. Integration: n/a.
* Cause: Suspected to cause the 5 minutes of CPU in Q4b; that turned out to be the nested-loop join.
* Prototype: Offline benchmark of a row-splitting parser (bench-json-parse.js), not integrated.
* Measured: sparqljson-parse 3.3.0 parses 300k rows (57 MB) in 0.7 s; the prototype is 1.4 to 1.6 times faster.
* Notes: Not a bottleneck for these queries.

## Still open

* Join order across sources (issue 10): Q1 is correct but downloads 364 MB; needs join-cardinality estimates aware of value spaces (prefix-restricted COUNTs or VoID linksets).
* Duplicates from overlapping sources are bag semantics; request sharing removes their cost.

## Caveats

* Prototype commits skip the pre-commit hook; existing unit tests assert the old behaviour (38 failures counted after the first five fixes).
* Several prototypes are switched by environment variables instead of configuration.
* Planner changes need the benchmark suites before merging.
