# Federation issues found while querying the NDE register endpoints

Hand-off notes from running the queries in [REPORT.md](REPORT.md) on `feature/performance-fed` (`e78b259`), default config unless noted.
Nothing here has been fixed. Each issue lists the evidence (run files in `runs/`, request logs regenerable with `run-query.js`), the code involved, and a direction to look in.
They are ordered by impact on these queries. "Correctness" issues silently return incomplete results, which is worse than slow.

## Correctness

### 1. The redirect target of the service-description GET becomes the SPARQL endpoint URL

* Evidence: all ~60 `https://sparql.ldmax.nl/<id>` endpoints answer a GET without `query` with `302 Location: https://www.ldmax.nl/query?slug=<id>` (an HTML/RDF web page). `https://sparql.goudatijdmachine.nl/` redirects to `/matgui/`.
  Comunica then sends every query to the redirect target. For ldmax this 404s; for Gouda it fails with "Unknown SPARQL results content type: text/html" (`runs/q6-sd-redirect-followed.*`).
  This happens even with `{ type: 'sparql' }`.
* Code: `ActorQuerySourceDereferenceLinkHypermedia.run` sets `url = dereferenceRdfOutput.url` (`packages/actor-query-source-dereference-link-hypermedia/lib/ActorQuerySourceDereferenceLinkHypermedia.ts:82`) and passes it to identification.
  `ActorQuerySourceIdentifyHypermediaSparql.run` uses `action.url` as the endpoint when the type is forced (`packages/actor-query-source-identify-hypermedia-sparql/lib/ActorQuerySourceIdentifyHypermediaSparql.ts:98`).
* Whose bug: Comunica's. These endpoints publish no service description at all, so no wrong `sd:endpoint` is involved. They answer a GET without `query` with a redirect to a landing page or web UI, which ignores the SPARQL 1.1 Service Description "should" but is not invalid.
  A redirect of the description document says where the document lives, not where the endpoint lives.
* Why the existing workaround does not fire: `QuerySourceSparql.fetch` retries with `urlBackup` on a 404 (`packages/actor-query-source-identify-hypermedia-sparql/lib/QuerySourceSparql.ts:174`).
  It fails here for two reasons. First, the backup is `action.url`, which is already the redirected URL, so `this.url === this.urlBackup` and the check is skipped. Second, it only reacts to 404; the Gouda UI answers 200 with HTML.
  With issue 2, ldmax does answer 404, so passing the user's original URL as backup alone would already recover ldmax, but not Gouda.
* Without the type (auto-detect), `node engines/query-sparql/bin/query.js https://sparql.ldmax.nl/Q1820897` silently queries the RDF of the web page instead of the endpoint.
* Direction: for forced `sparql` sources keep `action.link.url` as the endpoint, and only use the dereferenced URL or `sd:endpoint` as hints. Pass the original link URL (not the dereferenced one) as `urlBackup`. Fall back on non-SPARQL response content types too, not only on 404.
* The harness works around this by not following redirects for GETs without a `query` parameter.

### 2. `fetch-sparql-endpoint` appends `?query=` to endpoints that already have a query string

* Evidence: with issue 1, requests went to `https://www.ldmax.nl/query?slug=Q1820897?query=SELECT...`.
* Code: `node_modules/fetch-sparql-endpoint/lib/SparqlEndpointFetcher.js:166` (`${endpoint}?query=...`), upstream in fetch-sparql-endpoint 5.1.0.
* Direction: use `&` when the endpoint URL already contains `?`, or build the URL with `URL`/`URLSearchParams`.

### 3. Silently truncated endpoint results are taken as complete

* Evidence (Q1, `runs/q1-final.*`): `SELECT ?artist ?name WHERE { ?artist crm:P2_has_type aat:300189557 ; rdfs:label ?name }` returns exactly 10,000 rows from the RKD TriplyDB endpoint, while the true count is 87,383. There is no header or other signal.
  Q1 returns 12 of ~334 results. Muziekweb (also TriplyDB) returned exactly 10,000 rows for an unbound `mw:album` scan in Q5.
* Verified behaviour: on TriplyDB, an explicit `LIMIT 15000` still returns 10,000 rows, while `LIMIT 10000 OFFSET 10000` returns the next 10,000. So paging in pages of the cap works.
  Muziekschatten (Virtuoso) returned all rows for `LIMIT 12000`, so it does not have a 10k cap. Other Virtuoso installations may have a `ResultSetMaxRows` cap; this was not tested.
* Detection: the engine often has an exact COUNT for single patterns (the Q1 pattern alone has 87,341). Results that end at exactly a typical cap (10,000) while the estimate is larger are a strong signal.
  A cheap confirmation is `SELECT ... OFFSET <rows> LIMIT 1`: one extra request, and it returns a row only if the result was cut. The cap can be remembered per endpoint, like the COUNT fallback in `84c4031`.
* Direction: detect the cap once per endpoint, then page any request whose expected cardinality reaches it, using LIMIT/OFFSET pages of the cap size.
  Without ORDER BY, SPARQL does not guarantee a stable order between pages. In practice stores are deterministic for the same query on unchanged data; ORDER BY makes it guaranteed but costs server time. At minimum, warn.

### 4. Bind joins drop bindings whose join variable is a blank node

* Evidence: Q7 returns 1 of 11 datasets. 18,048 of the register's 18,524 `dcat:distribution` values are blank nodes, and `?distribution dct:conformsTo ...` is bind-joined.
  Q5b returns 0 of 536 Beeld en Geluid items: all 550 `schema:creator` role nodes are blank nodes, and `?item schema:creator ?role` is bind-joined.
* Code: `ActorRdfJoinMultiBindSource.queryTarget` explicitly skips bindings with a blank node for a variable of the target operation (`packages/actor-rdf-join-inner-multi-bind-source/lib/ActorRdfJoinMultiBindSource.ts:119-124`).
* Not a fundamental RDF limit: blank nodes are scoped to their source, so a blank node from source S can only ever join with triples in S. Every lost result here is such a within-source join.
  Both `?dataset dcat:distribution ?d` and `?d dct:conformsTo ... ; dcat:accessURL ?e` are triples of the register, and the register answers the joined patterns correctly in one query (that is how the ground truth was computed).
  What fails is the mechanism. A bind join ships the value of `?d` back in a second request, and SPARQL cannot refer to a blank node from an earlier result (in a query, `_:x` is a variable). So per request, skipping is right, but at plan level the join is dropped.
* Direction: when a join variable can bind to blank nodes, evaluate the patterns connected through it as one group, in one request to the source that produced the blank node. Bind that group on IRI-valued variables instead (here `?dataset`).
  This is complete, because a solution with a blank node for `?d` needs all triples mentioning `?d` from the same source. IRI values of `?d` still go through the normal cross-source join.
  Comunica already knows each blank node's source (skolemization tags it), so it can tell when a join is source-local. Only joins of a blank node from A with triples in B are impossible, and correct semantics says those never match anyway.
  Some stores return stable skolem IRIs instead of blank nodes (TriplyDB `/.well-known/genid/...`); those already join fine.
  Blank-node-heavy data is common in this ecosystem (register distributions, B&G roles, RKD and RCE time spans and identifiers).

### 5. Overlapping sources multiply results and requests

* Evidence: WO2Net contains a copy of the NIOD WO2 thesaurus, and the Dataset Knowledge Graph contains copies of the register's dataset descriptions.
  Q2 without DISTINCT returns 212 rows for 53 answers (4x), and Q7 returns 128 rows for 2.
  The duplicates also flow into bind joins: in Q3, 107 of 251 query requests were byte-identical repeats to the same endpoint, and in Q4, 713 `?object schema:artform <term>` requests were 23 distinct queries.
* This is standard bag semantics over a union of sources, but users expect a merged graph. The repeated requests are pure waste in any case.
* Direction: deduplicate identical in-flight and recent requests per source (a request-level cache keyed on endpoint + query). Consider distinct-on-merge for identical triples from different sources when the query only needs set semantics (DISTINCT, ASK, joins feeding DISTINCT).

## Plans that explode across many sources

### 6. OPTIONAL over multiple sources is evaluated one binding at a time, with a COUNT per binding

* Evidence (Q4, `runs/q4-final.*`): `OPTIONAL { ?object schema:dateCreated ?date }` over 35 sources produced 47,516 COUNT and 50,919 SELECT requests of the form `SELECT ?date WHERE { <obj> schema:dateCreated ?date }`, without VALUES.
  That is one pair per object per source. The run used 100k requests and timed out at 900 s.
* Q6: `OPTIONAL { ?monument a/b/c ?style }` produced 2,130 per-binding requests and did not return a single result in 600 s.
* The request shapes (one bound subject, no VALUES) match the non-block `ActorRdfJoinOptionalBind` (`packages/actor-rdf-join-optional-bind/lib/ActorRdfJoinOptionalBind.ts`), which `79423e6` prefers without cardinalities when the right side spans multiple sources. `actor-rdf-join-optional-bind-source` (VALUES blocks) does not appear to be used. I did not confirm the chosen actor with debug logging; that is the first thing to check.
  Every bound operation also triggers `QuerySourceSparql` cardinality estimation, i.e. a COUNT request (`packages/actor-query-source-identify-hypermedia-sparql/lib/QuerySourceSparql.ts:447-530`).
* Direction: use the block-based optional bind join over multiple sources (VALUES per source), and do not send COUNT queries for bound operations inside bind joins. Their cardinality is not used for planning at that point, or can be derived from the unbound pattern.

### 7. Bound join variables are not pushed into UNION branches

* Evidence (Q5, `runs/q5-final.*`): the query has `?gtaa skos:prefLabel "Andriessen, Louis"@nl` (1 result) joined with a 3-branch UNION that uses `?gtaa`. Each branch was evaluated unbound:
  `?item schema:composer ?person . ?item schema:name ?title` over all of Muziekschatten, `?mwPerson mw:album ?item` over all of Muziekweb (truncated at 10,000), and `?item sdo:creator ?role` everywhere.
  This was followed by 11.5k bind-join requests over those scans, and the query failed after 86.7 s.
  Repeating the anchor inside each branch (Q5b) takes 9.1 s and 121 requests.
* Q3 has the same shape (a UNION after a 1-result anchor) and did get the binding pushed, so this depends on the plan and cost estimates rather than being unsupported.
* Direction: check why the join over (1-row BGP, UNION) does not pick a bind join into the union for Q5. The union's cardinality is probably estimated from unbound COUNTs of its branches. Alternatively, push equality bindings into union branches when the left side is tiny.

### 8. Full unbound scans are chosen over bind joins when the left side cardinality is unknown or large

* Evidence (Q4b, `runs/q4b-final.*`): after the UNION, `?object schema:name ?title` was fetched unbound from all 34 museums: 411 MB decoded (72 MB wire), ~3M rows, with up to 140 MB from a single endpoint (Theater Instituut Nederland).
  This was for ~2,000 actual answers from 5 museums. The run then stayed CPU/GC-bound (5 min CPU) and timed out.
* Q6 (OPTIONAL path): the last path step `?x skos:prefLabel ?style` was fetched unbound from every source (26 MB from CHT, 72 MB from RCE).
* The same plan over 6 sources finishes in 11 s (`runs/q4b-subset.*`), so the cost model does not account for "one full scan per source x many sources".
* Direction: in the join cost, weight the right side's total transfer across all its sources (COUNT x number of sources, or VoID triples), not only its row count. Prefer bind joins when the left side is bounded, even if its estimate is unknown. Property-path steps should stay bound to the previous step.

### 9. Bind-join blocks are sent to every source that matched the unbound pattern

* Evidence (Q1): 400 blocks of RKD artists x 22 sources = 8,800 requests for `?agent schema:sameAs ?artist`, and 137 x 22 = 3,014 for `?work schema:creator ?agent`.
  The bound IRIs are `https://data.rkd.nl/artists/N` and museum-specific `https://n2t.net/ark:/<NAAN>/...`. Each NAAN only occurs in one source.
  The same happens in Q2: genealogieonline IRIs are sent to 6 museum endpoints that never contain them.
* Direction: per-binding source pruning, e.g. HiBISCuS-style IRI authority/prefix summaries (cheap to collect: one GROUP BY per predicate, or from VoID `void:uriSpace`/linksets, which the NDE DKG already publishes), or an ASK per block for sources whose pattern COUNT is small.

### 10. Join order ignores join selectivity across sources

* Evidence (Q1): Comunica starts from RKD's 87k female artists (COUNT is exact) instead of the museums' ~331 RKD-linked creators. The per-pattern COUNT for `?agent schema:sameAs ?artist` is large in every museum, but the join with `data.rkd.nl` IRIs is tiny.
  Starting from the museums would need ~22 + 331/blockSize requests instead of ~12k, and would avoid the 10k truncation (issue 3).
* Direction: use VoID `void:distinctObjects` / linksets (the DKG has them for most register datasets) or COUNT over small 2-pattern groups within a source to estimate join selectivity.

## Load and robustness

### 11. No limit on concurrent HTTP requests

* Evidence: Q1 peaked at 4,183 in-flight requests (p50 latency 11.4 s for requests that take ~150 ms alone). Q5 peaked at 1,381, and Q6 at 1,515.
  The ~60 ldmax endpoints share one host (`sparql.ldmax.nl`), as do the RCE endpoints (`api.linkeddata.cultureelerfgoed.nl`).
* Consequences: servers answer with 429 (genealogieonline, ldmax) or 503 (RCE TriplyDB). Latency of every request balloons, so wall time is dominated by queueing, and one network error ended Q5.
* Direction: a per-host concurrency limit (e.g., 8 to 16) in the HTTP layer, or in the bind-join actors when scheduling blocks.

### 12. 429/503 handling: no retries by default, and COUNT failures switch the endpoint to fallback for an hour

* Evidence: Q6 without retries fails on one 503 from RCE (`runs/q6-without-retries.*`). Genealogieonline returned 429 to the initial parallel COUNT burst in Q2 and Q3, which triggered "Not sending COUNT queries ... for 3600000 ms" (`84c4031`).
  RCE endpoints returned 503 on the initial COUNT burst in Q6 and entered the same fallback. So rate limiting, not slowness, decides the planning mode for the next hour.
* Retries exist (`httpRetryCount`, `httpRetryStatusCodes`, `actor-http-retry`) but are off by default. They also retry non-2xx responses like the harness's unfollowed 302, which shows up as 2 to 4 extra SD requests per ldmax source in Q2-Q4.
* Direction: enable a small retry budget for 429/503 with Retry-After by default for SPARQL sources. Do not count 429/503 as "COUNT took too long" for the fallback, or retry those COUNTs first.

### 13. A service-description GET per source, even for forced `sparql` sources

* Evidence: one GET per source per query (22 in Q1, 35 in Q4). `ActorQuerySourceDereferenceLinkForceSparql` only skips it for a single source (`packages/actor-query-source-dereference-link-force-sparql/lib/ActorQuerySourceDereferenceLinkForceSparql.ts:29`).
  For ldmax, the redirect (when followed, i.e. without the harness workaround) returns a ~99 KB N-Quads web page per source (~1.7 MB for Q1's 17 ldmax sources). TriplyDB answers 400 "Expected 'query' or 'update' argument", and QLever answers 404.
* Direction: skip or cache the SD fetch for forced `sparql` sources regardless of the number of sources. Alternatively, fetch it lazily only when VoID estimation is configured.

### 14. COUNT queries are sent per pattern per source before execution

* Evidence: 176 COUNTs for Q1 (8 patterns x 22 sources) and 1,047 for Q4b, on top of the per-binding COUNTs of issue 6. ASK queries are batched into one request per source (`c58ddb7`, works: 1 request per source in ASK mode), but COUNT queries are not.
* Direction: batch COUNTs per source into one SELECT with one subquery per pattern, mirroring the ASK batching.

### 15. CPU: streaming SPARQL JSON parsing dominates once results are large

* Evidence: the CPU profile of Q4b over 6 sources (64 MB decoded) shows `@bergos/jsonparse` (`proto.write`, `proto.onToken`) as the top non-idle frames, followed by GC.
  At 411 MB (35 sources), the process used 5 min of CPU and 1.5 GB RSS. Q1 used 54 s of CPU for 12k small responses.
* Direction: mostly fixed by avoiding issues 6 to 9. Separately, a faster SPARQL JSON results parser would help, e.g. one that parses the `bindings` array row by row with `JSON.parse` on each row's slice.

## Smaller observations

* Q1 ASK mode (`config-ask.json`) gives an identical plan and request count to COUNT mode (11,882 vs 12,036). The pruning does not change anything when every source has every predicate.
* `rdfs:label`/`skos:prefLabel` patterns match the ontology and thesaurus copies loaded into many endpoints (RKD contains the CRM ontology, and WO2Net the thesaurus). This makes many sources "relevant" for generic predicates and feeds issue 9.
* PoolParty (NIOD) returns labels with trailing whitespace variants from several graphs. That is not a Comunica issue, but it inflates join inputs.
