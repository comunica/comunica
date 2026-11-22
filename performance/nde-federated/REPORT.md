# Federated queries over the NDE dataset register

Seven federated SPARQL queries over SPARQL endpoints listed in the [NDE dataset register](https://datasetregister.netwerkdigitaalerfgoed.nl/en/datasets), run with Comunica from `feature/performance-fed` (at `e78b259`) using automatic source selection (no `SERVICE` clauses).
Performance problems found along the way are listed separately in [PERFORMANCE-ISSUES.md](PERFORMANCE-ISSUES.md).

## How the queries were chosen

The register has its own SPARQL endpoint (`https://datasetregister.netwerkdigitaalerfgoed.nl/sparql`). In it, 124 distinct URLs are registered as SPARQL distributions (`dct:conformsTo <https://www.w3.org/TR/sparql11-protocol/>`). 112 of them are actual endpoint URLs (the rest are Wikidata short links or file downloads), and 97 of those answered a probe query.
The NDE Dataset Knowledge Graph (`https://sparql.netwerkdigitaalerfgoed.nl/dataset-knowledge-graph`) contains VoID linksets that say which dataset links to which terminology source (AAT, CHT, RKD, WO2 thesaurus, GTAA, ...).
I picked the join axes from those linksets and checked the exact URI forms in each endpoint, because a federated join only works when the URIs match exactly.
For example, museums use three different URI forms for RKD artists, and only `https://data.rkd.nl/artists/N` matches the RKD Knowledge Graph.

Each query gets a source list with the endpoints that the linksets point to, plus related endpoints that turn out to hold no matching data. That second group tests source selection.
All sources are passed as `{ type: 'sparql', value: <url> }`.

## Setup and measurement

* Harness: [`run-query.js`](run-query.js) runs one query in a fresh Node process using the default engine of `engines/query-sparql`, with a `fetch` wrapper that records every request.
  * **HTTP requests**: all requests Comunica issued, including service-description GETs (`SD`).
  * **Decoded bytes**: response bodies after decompression.
  * **Wire bytes**: response bodies as received (compressed), counted with an undici interceptor.
* Default configuration (COUNT-based cardinalities, the branch default). Q1 was also run in the branch's ASK mode (`config-ask.json`), with the same plan.
* **Ground truth**: for each query, I computed the expected answer by querying each endpoint directly, pushing every join that stays inside one endpoint down to that endpoint (`gt_*.py`). The `GT` column compares against that.
* **Harness workaround** (affects all runs): service-description GETs do not follow redirects. Without this, Comunica sends all queries for the ~60 ldmax endpoints and the Gouda endpoint to the HTML pages they redirect to (see issue 1). With retries enabled, this also causes 2 to 4 extra SD requests per redirecting source.
* Retries (`httpRetryCount: 3` on 429/503) were enabled for all final runs except Q1 (run before I added them; it got no 429/503 responses). Without retries, Q6 fails on a 503 from the RCE endpoint.
* Caveats: each number comes from a single run (I kept repeat runs to a minimum because these are public endpoints, and some queries put real load on them). Traffic went through an HTTPS proxy in a cloud container, so absolute times include proxy latency. Timeouts were 600 s (Q4: 900 s, Q4b: 300 s).

## Summary

| # | Query | Sources given | Sources that hold answers | Results (Comunica) | Ground truth | Time (first result) | HTTP requests | Decoded / wire bytes |
|---|---|---|---|---|---|---|---|---|
| Q1 | Works by women artists (RKD) in museums | 22 | 7 (RKD + 6 museums) | 12 | ~334 | 70.7 s (70.7 s) | 12,036 (SD 22, COUNT 176, SELECT 11,838) | 3.4 MB / 1.5 MB |
| Q2 | Kamp Vught victims + birthplaces | 9 | 3 | 53 | 53 ✅ | 33.2 s (23.2 s) | 581 (SD 30, COUNT 63, SELECT 488) | 264 KB / 99 KB |
| Q3 | Objects about Kamp Vught | 9 | 3 | 205 | 205 ✅ | 22.6 s (6.9 s) | 281 (SD 30, COUNT 65, SELECT 186) | 198 KB / 66 KB |
| Q4 | Portraits via CHT/AAT (with OPTIONAL date) | 35 | 6 (CHT + 5 museums) | 1,551 (timeout) | ≥2,022 | >900 s (9.0 s) | 100,401 (COUNT 48,563, SELECT 51,803) | 426 MB / 84 MB |
| Q4b | Same, without the OPTIONAL | 35 | 6 | 533 (timeout) | 2,022 | >300 s (12.8 s) | 2,059 (SD 128, COUNT 1,047, SELECT 884) | 412 MB / 72 MB |
| Q5 | Louis Andriessen across music/AV datasets | 6 | 4 | error | 711 | failed at 86.7 s | 11,589 | 27 MB / 4.7 MB |
| Q5b | Same, anchor repeated in each UNION branch | 6 | 4 | 178 (175 distinct) | 711 | 9.1 s (8.3 s) | 121 (SD 9, COUNT 78, ASK 1, SELECT 33) | 210 KB / 150 KB |
| Q6 | Gouda monuments + RCE style/function (OPTIONAL style) | 6 | 2 | 0 (timeout) | 391 | >600 s | 2,521 | 99 MB / 17 MB |
| Q6b | Same, style required | 6 | 2 | 282 (73 distinct values) | 73 ✅ | 25.2 s (23.0 s) | 483 (SD 9, COUNT 60, SELECT 414) | 364 KB / 88 KB |
| Q7 | Datasets linking to the WO2 thesaurus + endpoints | 2 | 2 | 1 | 11 | 2.8 s (2.8 s) | 39 (SD 2, COUNT 18, SELECT 19) | 29 KB / 9 KB |

How to read this:

* **Correct and reasonably fast**: Q2, Q3 and Q6b. All three match ground truth exactly.
* **Fast but wrong**: Q1 (3.6 % of the answer, because RKD caps results at 10,000 rows), Q5b (the Beeld en Geluid branch loses all 536 items to blank nodes) and Q7 (1 of 11 datasets, for the same blank-node reason). Nothing in Comunica's output says these results are incomplete.
* **Does not finish**: Q4, Q4b, Q5 and Q6. The causes are OPTIONAL and UNION handling across sources, and full scans chosen over bind joins.

Ground-truth notes: for Q4 the ground truth counts distinct (object, title) pairs, i.e. Q4b. For Q5 it is 131 compositions + 44 albums + 536 broadcast items.
"Sources that hold answers" comes from the ground-truth runs, not from what Comunica fetched.

## The queries

All query files are in [`queries/`](queries/) and source lists in [`sources/`](sources/). Raw per-run summaries and results are in [`runs/`](runs/). The full request logs are not committed (137 MB); `run-query.js` regenerates them.

### Q1: Works by women artists in Dutch museum collections ([query](queries/q1-women-artists.rq), [sources](sources/q1.txt))

Use case: list works by female artists held by regional museums, with the RKD birth date. Museums link their creator records to RKDartists with `schema:sameAs`, and RKD records gender (`crm:P2_has_type aat:300189557`).
Sources: RKD Knowledge Graph + 17 ldmax museum endpoints + 4 Kleksi museum endpoints. These are all the endpoints whose linksets point to `data.rkd.nl`.

Sample results: `Toorop, Charley | 1891-03-24 | Zelfportret met Edgar en John`, `Ansingh, Lizzy | 1875-03-13 | Christine Jacoba Tjarda van Starkenborgh Stachouwer - Quintus`.

Result: 12 rows (2 artists). Ground truth is ~334 (work, artist) rows for 28 female artists in 6 museums (Groninger Museum 286, Musiom 22, Jan Menze van Diepen 15, Gerrit van Houten 8, DKOR 2, Kranenburgh 1).
Plan: Comunica starts with `?artist P2_has_type female ; rdfs:label ?name` at RKD (87,383 true rows; RKD's TriplyDB returns only 10,000, without any signal). It then bind-joins those 10,000 artists against `schema:sameAs` in all 22 sources (8,800 requests), and then joins `schema:creator` (3,014 requests).
ASK mode produced the same plan (11,882 requests, 71.4 s). The batched ASK requests do work (1 per source).

### Q2: Victims who died in Kamp Vught, with their birthplace ([query](queries/q2-vught-victims.rq), [sources](sources/wo2.txt))

Use case: remembrance. Genealogy Online's WWII victims link their death place to the NIOD WO2 thesaurus and themselves (`schema:sameAs`) to Oorlogslevens person records in WO2Net. Those records link the birthplace to the thesaurus, which provides the label.
Sources: NIOD WO2 thesaurus, Genealogy Online WWII victims, WO2Net, + 6 WWII-related museum collections (Kamp Vught, Anne Frank House, Bevrijdingsmuseum Zeeland, Hoogeland, Limburgs Museum, GRID).

Sample: `Joseph Wilhelmus Toussaint | 1945-05-21 | Nijmegen`, `Gerrit GOLDENBELD | 1944-12-09 | Deventer`.

Result: 53, matching ground truth. 3 sources contribute: a chain of 3 hops across 3 endpoints.
Without `DISTINCT` the same query returns 212 rows, each row 4 times, because WO2Net contains a copy of the NIOD thesaurus. So both the camp label and the birthplace label match in 2 sources.

### Q3: Collection objects about Kamp Vught ([query](queries/q3-camp-objects.rq), [sources](sources/wo2.txt))

Use case: find everything WWII collections hold about one camp. WO2Net links objects to the thesaurus directly, while museums link a local term with `schema:sameAs`. The query covers both with a UNION.
Sample: `Reçu van pakketje verzonden aan Cees van den Bergh` (Collectie Gelderland via WO2Net), interview segments from Oorlogsbronnen, archive records.

Result: 205, matching ground truth (WO2Net and Nationaal Monument Kamp Vught contribute, plus the thesaurus for the label). 107 of the 251 query requests were identical repeats.

### Q4 / Q4b: Portraits across museums via CHT and AAT ([Q4](queries/q4-portraits.rq), [Q4b](queries/q4b-portraits-noopt.rq), [sources](sources/q4.txt))

Use case: terminology-aware search. Find portraits in any museum, whether it maps its local object types to CHT itself or to the equivalent AAT concept (`skos:exactMatch` in CHT).
Sources: CHT + 31 ldmax museums + 3 Kleksi museums (every museum whose local terms link to AAT or CHT).

Sample: `Portret van Cornelis van Groenendijck (1658-1704) | 1668`, `Derkien Riepma`, `Prent; reproductie; portret (foto) van Geert Reinders`.

Result: neither finishes. Q4 spent 15 minutes on 100k requests: the OPTIONAL creation date was evaluated one object at a time, with a COUNT and a SELECT for every object and every source.
Q4b (without the OPTIONAL) still downloads every `schema:name` triple of all 34 museums (411 MB, ~3M rows) for a hash join, and is then CPU/GC-bound.
On a 6-source subset, Q4b finishes in 11.3 s with 1,957 results (`runs/q4b-subset.*`). So the plan is viable for few sources but does not scale with the number of sources.

### Q5 / Q5b: Louis Andriessen across Dutch music and broadcast heritage ([Q5](queries/q5-andriessen.rq), [Q5b](queries/q5b-andriessen-anchored.rq), [sources](sources/q5.txt))

Use case: a person profile. Starting from the GTAA identifier, it finds compositions (Muziekschatten, via `owl:sameAs` to GTAA), albums (Muziekweb, via Muziekschatten's `owl:sameAs` to Muziekweb), and broadcast items (Beeld en Geluid catalogue, via `schema:creator` roles that point to GTAA).
Sources: GTAA, Beeld en Geluid catalogue, Muziekschatten, Muziekweb, + ONSTAGE and Theater Instituut Nederland as unrelated candidates.

Sample: `album (Muziekweb) | Doctor nero`, `composition (Muziekschatten) | Bassoon blue`.

Q5 failed: the bound GTAA IRI was not pushed into the UNION branches, so each branch ran unbound (full scans, Muziekweb truncated at 10,000 rows). It made 11.6k requests and died on a network error at 86.7 s.
Q5b repeats the anchor in every branch: 9.1 s and 121 requests. The compositions (131) and albums (44) are complete, but the Beeld en Geluid branch returns 0 of 536 items, because every creator role there is a blank node.

### Q6 / Q6b: National monuments in Gouda with RCE style and original function ([Q6](queries/q6-gouda-monuments.rq), [Q6b](queries/q6b-gouda-monuments-noopt.rq), [sources](sources/q6.txt))

Use case: local history. The Gouda Tijdmachine building records link to the RCE monument register (`rdfs:seeAlso`), and RCE provides the structured style and original function.
Sources: Gouda Tijdmachine, RCE CHO, + RCE Rijksmonumenten (schema.org), RCE groenaanleg, CHT and the Gouda civil records (PiCo) as candidates.

Sample: `Rijksmonument 517589 - Kantoorgebouw, Kaaspakhuis, Wachtelstraat 52 | Zakelijk Expressionisme | Kaaspakhuis`.

Q6 (OPTIONAL style) produced 0 results in 600 s. The optional property path was evaluated per binding, and its last step (`?x skos:prefLabel ?style`) was run as an unbound scan over every source (26 MB from CHT, 72 MB from RCE).
Q6b (style required) finishes in 25.2 s with exactly the ground-truth answer.
Two failed attempts are kept as evidence: `q6-sd-redirect-followed` (the endpoint URL was replaced by the web UI it redirects to) and `q6-without-retries` (a 503 from RCE aborts the whole query).

### Q7: Which datasets link to the WO2 thesaurus, and where can they be queried? ([query](queries/q7-discovery.rq), [sources](sources/q7.txt))

Use case: dataset discovery. It joins the Dataset Knowledge Graph linksets with the register's dataset descriptions and SPARQL distributions.
Result: 1 dataset (the DKG itself). Ground truth is 11 (WO2Net collections, persons and thesaurus; Genealogy Online; Kamp Vught; Anne Frank House; Bevrijdingsmuseum Zeeland; Hoogeland; Limburgs Museum; GRID; the DKG).
18,048 of the register's 18,524 distributions are blank nodes, and Comunica drops bind-join bindings whose join variable is a blank node. Without `DISTINCT` it returns 128 rows for those 2 distinct answers, because the DKG contains copies of the register's descriptions.

## Reproducing

```bash
cd performance/nde-federated
```

```bash
RETRY=3 node run-query.js queries/q2-vught-victims.rq sources/wo2.txt runs/q2-final 600
```

```bash
python3 analyze.py runs/q2-final 20
```

```bash
python3 timeline.py runs/q2-final
```

Optional arguments: `[timeoutSec] [configPath]`, e.g. `config-ask.json` for the ASK federation mode. Set `FOLLOW_SD_REDIRECTS=1` to disable the redirect workaround.
