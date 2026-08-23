# Comunica performance evaluation — environment & benchmark notes

Child session `comunica-perf` (container `fed6ae`). Reporting to parent session
`session_01YXCec73hPDvTLomEdPt8Pr` / `comunica-57` via this branch.

Scope: get the jbr benchmarks (`performance/benchmark-watdiv-file`,
`benchmark-watdiv-tpf`, `benchmark-bsbm-tpf`) running so the join cost-model
question from PR #1754 can be evaluated against remote (TPF) sources, not just
local ones.

`feature/query-engine-performance` is **not** touched by any of this work.

---

## 2026-08-23 — Milestone 1: Docker is working

**Result: SUCCESS.** Both image pulls and container execution work.

Started the daemon exactly as suggested, with no changes to any cgroup mount:

```
setsid nohup dockerd --exec-opt native.cgroupdriver=cgroupfs --storage-driver overlay2 \
  </dev/null > /tmp/dockerd.log 2>&1 &
```

Daemon reports:

```
Server 29.3.1  driver=overlay2  cgroup=1  cgroup driver=cgroupfs
Backing Filesystem: extfs, Native Overlay Diff: true
buildkit initialised, API listen on /var/run/docker.sock
```

It logs `WARNING: Support for cgroup v1 is deprecated ...` — harmless.

Verified end-to-end rather than just "daemon up":

| check | result |
|---|---|
| `docker pull hello-world` | OK |
| `docker run --rm hello-world` | OK, container executed and produced output |

Notes:
- **Proxy needed no configuration.** `dockerd` inherits `HTTPS_PROXY=http://127.0.0.1:46371`
  from the environment, so registry pulls work with no `/etc/docker/daemon.json` change.
- **Use `setsid`.** A plain `nohup ... &` daemon was killed when that turn was
  interrupted. `setsid nohup ... </dev/null &` + `disown` survives turn boundaries.
- No `mount`/`umount` under `/sys/fs/cgroup` was ever run.

## 2026-08-23 — Environment differences from the previous container

- **The repo was NOT pre-checked-out.** `/home/user` was empty; cloned fresh from
  `https://github.com/comunica/comunica.git` into `/home/user/comunica`.
  Base commit `77a549162c` on `master`.
- Toolchain: node **v22.22.2**, yarn **1.22.22**, OpenJDK **21.0.10**, ~30 GB free on `/`.
- `yarn install` (incl. its postinstall build): **169 s**, 1189 packages. No errors.
- `gh` CLI: not available.

## Benchmark layout (read before running)

Both watdiv benchmarks are full-factorial over one factor, `hookSparqlEndpoint`:

- `combination_0` = `HookCli` — runs comunica **directly via node**
  (`engines/query-sparql-file/bin/http.js`), **no Docker for the engine itself**.
- `combination_1` = `HookSparqlEndpointComunica` — runs the engine **in Docker**.

`performance:ci` for watdiv-file is `jbr prepare -c 0 && jbr run -c 0`, i.e. the
non-Docker combination only. Docker is still needed by `jbr prepare` for dataset
generation unless `yarn fetch-assets` has supplied a pre-generated dataset.

watdiv-file experiment parameters (`jbr-experiment.json.template`):
`datasetScale: 10`, `queryCount: 5`, `queryRecurrence: 1`,
`queryRunnerReplication: 3`, `queryRunnerWarmupRounds: 1`, timeout 500 s.

Status: `yarn fetch-assets` running; `jbr prepare`/`jbr run` next.

---

## 2026-08-23 — Milestone 2: `benchmark-watdiv-file` completes end-to-end

**Result: SUCCESS.** Full `prepare` + `run` cycle for combination 0, zero query errors.

### Two blockers hit first (both were session GitHub scope, not the benchmark)

1. **`git push` denied.**
   ```
   remote: access denied by the git proxy: comunica/comunica is not in this session's
   authorized repository set, so the proxy will not inject a credential for it.
   fatal: ... The requested URL returned error: 403
   ```
   Fix: `add_repo(owner=comunica, repo=comunica, access="push")`. The repo has to be
   attached to the session even though it was cloned successfully — cloning a public
   repo works through the proxy, pushing does not.

2. **`yarn fetch-assets` silently produced a corrupt zip.**
   ```
   unzip: cannot find zipfile directory in one of watdiv-10.zip or watdiv-10.zip.zip
   error Command failed with exit code 9.
   ```
   The "zip" was 378 bytes of JSON: an HTTP 403 body from the proxy, because
   `comunica/comunica-performance-assets` is a *separate* repo and was also not in the
   session's authorized set. `curl -L` without `-f` happily wrote the error body to the
   output file, so the failure only surfaced at `unzip`.
   Fix: `add_repo(owner=comunica, repo=comunica-performance-assets, access="read")`,
   then re-run the download — 15,098,195 bytes, HTTP 200.

   *Anyone repeating this: check the downloaded file is actually a zip
   (`file watdiv-10.zip`) before trusting `fetch-assets`.*

### Working procedure for `benchmark-watdiv-file`

```
cd performance/benchmark-watdiv-file
curl -sSL -o watdiv-10.zip "https://github.com/comunica/comunica-performance-assets/raw/master/watdiv-10.zip?download="
unzip -o -q watdiv-10.zip -d generated/ && rm watdiv-10.zip
yarn jbr prepare -c 0          # ~17 s; dataset generation is "Skipped" (assets pre-generated)
yarn jbr run -c 0              # ~201 s
```

The unpacked assets are `dataset.nt` (152 MB), `dataset.hdt`, `dataset.hdt.index.v1-1`,
20 query files, and a `.prepared` marker — that marker is why `prepare` skips generation
and therefore why **no Docker is needed for watdiv-file combination 0 at all**.

### Run 1 baseline (commit 77a549162c, master)

Warmup 100 queries (1 min), then 20 query sets x 5 instantiations x replication 3 = 300
executions (2 min). Wall clock 201 s. **0 errors, 52/100 queries return results,
244,585 results total, sum of per-query mean times 38,901 ms.**

| set | avg results | avg time (ms) | | set | avg results | avg time (ms) |
|---|---|---|---|---|---|---|
| C1 | 0.0 | 489.5 | | L1 | 3.4 | 21.9 |
| C2 | 0.0 | 3526.4 | | L2 | 10.4 | 7.5 |
| C3 | 48802.0 | 3171.3 | | L3 | 39.0 | 11.9 |
| F1 | 0.0 | 22.9 | | L4 | 6.2 | 4.9 |
| F2 | 0.6 | 51.1 | | L5 | 6.4 | 8.3 |
| F3 | 0.8 | 85.7 | | S1 | 3.0 | 73.7 |
| F4 | 7.2 | 52.1 | | S2 | 1.4 | 13.2 |
| F5 | 36.4 | 144.3 | | S3 | 0.0 | 40.0 |
| | | | | S4 | 0.0 | 41.0 |
| | | | | S5 | 0.0 | 5.0 |
| | | | | S6 | 0.2 | 6.4 |
| | | | | S7 | 0.0 | 3.2 |

Query sets with 0 results are expected at WatDiv scale 10 — those templates instantiate
to selective patterns with no matches. They are still useful as timing probes but carry
no join-plan signal, so **the cost-model comparison should be driven by C2, C3, F5, S1
and C1**, which are the sets with meaningful work.

C2 (3526 ms, 0 results) and C3 (3171 ms, 48802 results) dominate total runtime and are
the most likely to be join-plan sensitive.

Run 2 (identical commit, to establish the noise floor) is in progress — **no A/B
comparison will be made until that noise floor is known.**

---

## 2026-08-23 — Milestone 3: noise floor of `benchmark-watdiv-file`

Two **identical** runs of the same commit (`77a549162c`), back to back, nothing else
running on the box. Wall clock 201.10 s and 194.64 s.

### Correctness: perfectly deterministic

**0 / 100 queries differed** in either result count or result hash between the two runs.
So the harness gives a clean equivalence check — any future plan change can be validated
for semantics by diffing the `results` and `hash` columns, independently of timing.

### Timing: per-query noise is large, aggregate noise is small

Per-query `|run2 - run1| / run1` over 100 queries:

| median | mean | p90 | max |
|---|---|---|---|
| 10.5% | 14.5% | 33.3% | 75.0% |

But the **total** (sum of per-query mean times) moved only
**38,901 ms -> 38,680 ms = -0.57%**.

The reason is that the per-query noise is concentrated entirely in the *short* queries,
where the numbers are single-digit milliseconds and quantisation dominates:

```
S5 #4    4.0 ->  7.0 ms   +75.0%      <- 3 ms of jitter
S1 #1  114.7 -> 31.7 ms   -72.4%
L4 #3    6.0 ->  4.0 ms   -33.3%      <- 2 ms of jitter
```

The two queries that actually dominate runtime are stable:

| set | avg time | drift run1->run2 | spread across its 5 instances |
|---|---|---|---|
| **C3** | 3171 ms | **+2.0%** | 3.7 pp |
| **C2** | 3526 ms | **-0.8%** | 7.7 pp |

C2 + C3 are ~86% of total runtime (33.5 s of 38.9 s), which is why the total is so stable.

### Resolution limits — what this benchmark can and cannot prove

- **Trustworthy signal: C2, C3, and the total.** Effects of **>= ~5%** on these are
  resolvable. The observed run-to-run drift is 0.6-2%.
- **Not trustworthy: any individual L\*/S\*/F\* query.** These need a >75% change before
  it can be distinguished from jitter at replication 3. Do not report a "2x speedup on
  S1" from this harness.
- This *refines* the earlier "cannot resolve below ~30%" finding: that is about right for
  individual short queries, but the aggregate and the two heavy queries are far better
  than 30%.
- `queryRunnerReplication` is **3** for watdiv-file but only **1** for watdiv-tpf, so
  the TPF benchmarks should be expected to be noisier and will need repeated runs.

**Rule adopted for the rest of this work: no A/B claim below 5% on C2/C3/total, and no
claim at all on individual short queries.**

---

## 2026-08-23 — Milestone 4: `benchmark-watdiv-tpf` — setup and the Docker Hub blocker

### Blocker: Docker Hub unauthenticated pull rate limit

`jbr prepare` for the TPF benchmarks needs three images. Two pulled fine, the third hit:

```
Error response from daemon: toomanyrequests: You have reached your unauthenticated
pull rate limit. https://www.docker.com/increase-rate-limit
```

Retrying did not help — the limit is per source IP and the sandbox egress IP is shared.

**Workaround that worked: pull through Google's Docker Hub mirror and retag.**

```
docker pull mirror.gcr.io/library/nginx:1.31.4
docker tag  mirror.gcr.io/library/nginx:1.31.4 nginx:1.31.4
```

`mirror.gcr.io` is reachable through the egress proxy and is not rate-limited. After
retagging, `FROM nginx:1.31.4` in `input/dockerfiles/Dockerfile-ldf-server-cache`
resolves against the local image and the build succeeds without touching the repo.

*If a future session hits this on the other images too, the general fix is to add
`{"registry-mirrors": ["https://mirror.gcr.io"]}` to `/etc/docker/daemon.json` and
restart dockerd — that fixes all Docker Hub pulls transparently.*

Images required:

| image | size | source used |
|---|---|---|
| `comunica/query-sparql:latest` | 1.3 GB | Docker Hub (ok) |
| `linkeddatafragments/server:v3.3.0` | 234 MB | Docker Hub (ok) |
| `nginx:1.31.4` | 162 MB | **mirror.gcr.io** (Hub rate-limited) |

### Dataset reuse

`benchmark-watdiv-tpf` needs the same watdiv-10 assets, including `dataset.hdt`
(`generateHdt: true`). Rather than downloading again:

```
cp -a performance/benchmark-watdiv-file/generated/. performance/benchmark-watdiv-tpf/generated/
```

The `.prepared` marker copies across too, so `prepare` reports both
`Generating WatDiv dataset and queries: Skipped` and
`Converting WatDiv dataset to HDT: Skipped`. `jbr prepare -c 0` then takes **8.8 s** and
its real work is just building the two Docker images.

### Working procedure for `benchmark-watdiv-tpf`

```
docker pull mirror.gcr.io/library/nginx:1.31.4 && docker tag mirror.gcr.io/library/nginx:1.31.4 nginx:1.31.4
docker pull linkeddatafragments/server:v3.3.0
docker pull comunica/query-sparql:latest
cp -a ../benchmark-watdiv-file/generated/. generated/
yarn jbr prepare -c 0
yarn jbr run -c 0
```

### Topology (why Docker is unavoidable here, unlike watdiv-file)

- `HookSparqlEndpointLdf` runs the **LDF server** (`linkeddatafragments/server:v3.3.0`)
  in Docker on port 2999, behind an **nginx cache** container on port 3000.
- Combination 0's client is `HookCli` — comunica itself runs **outside** Docker via
  `node engines/query-sparql/bin/http.js http://localhost:3000/dataset -p 3001 -t 500 -i`.
- So the engine under test is the local build (good — changes are picked up by rebuilding),
  but the *source* it queries is a real TPF server over HTTP.

Confirmed running: containers `jbr-experiment-benchmark-watdiv-tpf-combination_0-sparql-endpoint-ldf-server`
and `-cache` both `Up`, queries executing.

**Caution:** `queryRunnerReplication` is **1** here (vs 3 for watdiv-file) and the
per-query timeout is 500 s, so a single run is both noisier and potentially much longer.

---

## 2026-08-23 — Cost-model analysis (code reading, independent of benchmarks)

Confirmed all four suspected causes in the source, and found a discriminator that makes a
**low-risk targeted fix** possible.

### Confirmed: the cost function

`MediatorJoinCoefficientsFixed.mediateWith`, weights from
`engines/config-query-sparql/config/rdf-join/mediators.json`:

```
cost = iterations*10 + persistedItems*1 + blockingItems*2 + requestTime*10
       (cpuWeight)     (memoryWeight)     (timeWeight)      (ioWeight)
```

`iterations` is an item count (often 1e6..1e17); `requestTime` is in **seconds**
(single digits). With equal weights of 10, **`requestTime` is numerically irrelevant** —
cause #4 confirmed. Network time cannot influence plan choice in any realistic case.

### Confirmed: `iterations` is wildly inconsistent between actors

| actor | `iterations` formula |
|---|---|
| `hash` (2-way) | `(c0 + c1) * 0.8` — a **sum** |
| `multi-smallest` | `c0 * c1 * ... * cn` — a **full cartesian product**, no selectivity at all |
| `multi-bind` | `c0 * SUM(ci * selectivity_i * selectivityModifier)` |

`multi-smallest` costs itself as a cartesian product (cause #2 confirmed,
`ActorRdfJoinMultiSmallest.ts:127`) even though it does not actually perform one — it
joins the two smallest entries and recursively delegates the rest.

### Confirmed: the `selectivityModifier` is bind-only

Present **only** on the bind family, and absent from `hash` and `multi-smallest`:

| actor | default `selectivityModifier` |
|---|---|
| `ActorRdfJoinMultiBind` | **1e-4** |
| `ActorRdfJoinMultiBindSource` | **1e-4** |
| `ActorRdfJoinMultiSmallestFilterBindings` | **1e-4** |
| `ActorRdfJoinOptionalBind` | **1e-6** |
| `ActorRdfJoinHash`, `ActorRdfJoinMultiSmallest` | *(none)* |

Cause #3 confirmed. This is a flat 10,000x discount applied to one family of actors only.

### Confirmed: selectivity has almost no dynamic range

`ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost` starts from
`MAX_PAIRWISE_COST = 82` and subtracts single-digit amounts, then divides by 82. A shared
subject (`unboundSS`) subtracts only 2, giving **80/82 = 0.976** versus **82/82 = 1.000**
for no shared variable. Cause #1 confirmed: the pairwise term cannot separate a star join
from a cartesian product.

### Worked example — a 4-pattern star, each pattern ~20,000 rows, true output 20,000

| actor | iterations | cost |
|---|---|---|
| `multi-smallest` | 20000^4 = **1.6e17** | 1.6e18 |
| `multi-bind` | 20000 * (3 * 20000 * 0.55 * 1e-4) ~= **6.6e4** | 6.6e5 |

Bind wins by **~12 orders of magnitude**. This is why the planner picks bind joins.

Note what this implies: **fixing cause #2 alone is not enough.** Applying the existing
selectivity to `multi-smallest` gives `1.6e17 * 0.55 = 8.8e16` — still ~11 orders of
magnitude worse than bind. The 1e-4 modifier is the dominant term, so a fix that does not
address it will not change plan choice. (For the estimate to be *correct*, selectivity
would have to be 1.25e-13, which the variable-counting heuristic cannot express.)

### The discriminator that makes a safe fix possible

`ActorRdfJoinMultiBind.getJoinCoefficients` **already** distinguishes local from remote:

```js
const isRemoteAccess = requestItemTimes.some(time => time > 0);
```

and `ActorRdfJoin.getRequestItemTimes` is:

```js
metadatas.map(m => m.pageSize ? (m.requestTime ?? 0) / m.pageSize : 0)
```

So `requestItemTimes > 0` **iff the source is paged** — which is exactly TPF and other
LDF sources. Local file/store sources have no `pageSize`, so they get 0.

**This means the `selectivityModifier` can be gated on `isRemoteAccess` and TPF plan
choice is provably unchanged**, because for paged sources every input to the formula
stays identical. That directly resolves the concern that blocked the previous session:
the risk of altering remote-source plans can be eliminated by construction, not just
measured.

Planned experiment (on its own branch, **not** `feature/query-engine-performance`):
apply the `selectivityModifier` only when `isRemoteAccess` is true, then
1. verify via `explain: 'physical'` that TPF plans are **byte-identical**;
2. verify local plans switch from bind to hash/smallest;
3. measure both the TPF benchmark and the local harness;
4. verify result counts/hashes are unchanged.

Step 1 is the cheap high-value check and does not need a full benchmark run.

---

## 2026-08-23 — Milestone 5: `benchmark-watdiv-tpf` completes end-to-end

**Result: SUCCESS.** `jbr run -c 0` finished in **436.63 s** (warmup 4 min, measured 3 min),
**0 errors** across all 100 queries.

### Correctness cross-check against the file benchmark

**TPF total results = 244,585. File total results = 244,585. Identical.**

Per-set result counts also match the file run exactly (C3 = 48,802; F5 = 36.4 avg; etc.).
Two completely different source implementations — a local N-Triples file vs a real TPF
server over HTTP behind an nginx cache — agree exactly. That is a strong signal that both
harnesses are sane and gives a second, independent correctness oracle for plan changes.

### Run 1 baseline (commit 77a549162c, master)

Sum of per-query times **190,452 ms** (~5x the file benchmark's 38,901 ms), and
**128,609 HTTP requests** total.

| set | avg results | avg time (ms) | avg HTTP reqs |
|---|---|---|---|
| C1 | 0.0 | 1496.8 | 940.0 |
| C2 | 0.0 | 4549.8 | 2191.0 |
| **C3** | **48802.0** | **28694.6** | **20454.0** |
| F1 | 0.0 | 93.0 | 43.0 |
| F2 | 0.6 | 475.2 | 334.2 |
| F3 | 0.8 | 330.0 | 197.2 |
| F4 | 7.2 | 436.2 | 299.6 |
| F5 | 36.4 | 638.2 | 371.8 |
| L1 | 3.4 | 108.6 | 47.6 |
| L2 | 10.4 | 46.0 | 11.0 |
| L3 | 39.0 | 80.6 | 40.0 |
| L4 | 6.2 | 24.0 | 5.0 |
| L5 | 6.4 | 46.8 | 11.0 |
| S1 | 3.0 | 689.6 | 592.6 |
| S2 | 1.4 | 150.2 | 110.0 |
| S3 | 0.0 | 26.0 | 7.0 |
| S4 | 0.0 | 94.0 | 27.0 |
| S5 | 0.0 | 24.6 | 7.0 |
| S6 | 0.2 | 69.8 | 27.6 |
| S7 | 0.0 | 16.4 | 5.2 |

C3 alone is 143 s of the 190 s total and 102k of the 129k HTTP requests.

### Important: `httpRequests` is a much better metric than wall-clock here

The TPF CSV records `httpRequests` per query. **The number of HTTP requests is a direct,
essentially deterministic function of the query plan** — it does not depend on machine
load, GC timing, or scheduler jitter the way wall-clock does.

This matters a lot given `queryRunnerReplication: 1` for TPF (vs 3 for the file
benchmark), which makes TPF wall-clock inherently noisier. So:

> **For evaluating a join cost-model change against TPF, `httpRequests` is the primary
> metric and wall-clock is secondary.** A plan change that is genuinely better for remote
> sources must reduce HTTP requests; a change that leaves plans alone must leave
> `httpRequests` bit-identical.

Run 2 of the identical commit is in progress to confirm that `httpRequests` really is
reproducible and to establish the TPF wall-clock noise floor.

---

## 2026-08-23 — Milestone 6: noise floor of `benchmark-watdiv-tpf`

Two identical runs of commit `77a549162c`. Wall clock **436.63 s** and **408.58 s**.

### `httpRequests` is exactly reproducible — this is the key measurement tool

```
queries with differing httpRequests:  0 / 100
total httpRequests:  run1 128609   run2 128609   drift +0.000%
```

**Zero drift, bit-identical, on every single query.** Combined with 0/100 result/hash
mismatches, this gives two noise-free oracles for TPF:

| oracle | what it proves | noise |
|---|---|---|
| `results` + `hash` | semantics unchanged | **0%** |
| `httpRequests` | **query plan unchanged** | **0%** |
| wall-clock | actual speed | ~3% aggregate, ~7% median per-query |

This is a much stronger position than expected. A cost-model change can be validated
against TPF *without* fighting timing noise at all: if `httpRequests` is unchanged on all
100 queries, the plans are unchanged; if it moves, the plans moved and by exactly how much.

### Wall-clock noise (secondary metric)

| median | mean | p90 | max |
|---|---|---|---|
| 7.3% | 9.6% | 21.4% | 50.5% |

Aggregate drift: **TOTAL 190,452 -> 184,618 ms = -3.06%**; **C3 alone -2.80%**.

As with the file benchmark, per-query noise lives in the short queries (S2 #2:
105 -> 158 ms = +50.5%, i.e. 53 ms of jitter). TPF wall-clock is ~5x noisier in aggregate
than the file benchmark (3.06% vs 0.57%), which is expected at `queryRunnerReplication: 1`.

### Resolution limits for TPF

- `httpRequests`: **any** change is real. Use this to detect plan changes.
- wall-clock TOTAL / C3: trust changes **>= ~8%** (about 2.5x the observed 3% drift).
- individual short queries: do not trust anything under ~50%.

### Summary of both benchmarks

| | watdiv-file | watdiv-tpf |
|---|---|---|
| runtime per run | ~200 s | ~420 s |
| replication | 3 | 1 |
| errors | 0 | 0 |
| total results | 244,585 | **244,585** (identical) |
| sum of query times | 38,901 ms | 190,452 ms |
| result/hash reproducibility | exact | exact |
| `httpRequests` reproducibility | n/a | **exact** |
| wall-clock aggregate noise | 0.57% | 3.06% |

**Both benchmarks are runnable, repeatable, and cheap enough to use as an A/B harness.**
That answers the question this session was spawned to settle.

---

## 2026-08-23 — Milestone 7: local micro-harness + first cost-model experiment

Branch: **`claude/perf-cost-model-experiment`** (off `origin/master`).
`feature/query-engine-performance` untouched.

### Micro-harness (untracked, in `.git/info/exclude`)

`perf-harness/` — 140,319-quad synthetic dataset (20k people with
name/age/email/city/knows/nick/score, 100 cities, 10 countries), deterministic seeded LCG,
loaded into `RdfStore.createDefault()`. 29 queries covering scans, star joins (2-5
patterns), chains, property paths, filters, BIND, DISTINCT, ORDER BY, GROUP BY, OPTIONAL,
UNION, MINUS, FILTER EXISTS, CONSTRUCT.

- `perf-harness/run.js <rounds> <label>` — per-query medians + result counts.
- `perf-harness/plans.js <label>` — physical plans via `engine.explain(q, ctx, 'physical')`.

**Note for reuse:** `engine.query(q, {explain:'physical'})` does **not** work — it fails
with `Tried to explain a query when in query-only mode`. You must call
`engine.explain(query, context, 'physical')`. Also, `r.data` from explain is a
**formatted string**, not a tree, so plan comparison means normalising away
`timeSelf:`/`timeLife:`/`cardReal:`/`compacted-occurrences:` and diffing the text.

The harness reproduces the reported pathology on master:

| query | master |
|---|---|
| `star4` (4-pattern star) | 8650 ms |
| `star5` (5-pattern star) | 12280 ms |
| `optional-join` | 8767 ms |
| `chain4` | 2551 ms |
| `optional` | 2125 ms |

### Experiment v1: gate `selectivityModifier` on `isRemoteAccess`

```diff
-      })).selectivity * this.selectivityModifier));
+      })).selectivity * (isRemoteAccess ? this.selectivityModifier : 1)));
```
(plus the equivalent one-liner in `ActorRdfJoinOptionalBind`, using
`requestItemTimes.some(time => time > 0)`.)

### Plan changes on local sources: only 4 of 29 queries moved

| query | before | after |
|---|---|---|
| `chain2` | `bind` | `hash-def` |
| `chain4` | `bind bind bind` | `bind bind hash-def` |
| `optional-join` | `bind bind` | `hash-def hash-def` |
| `optional` | (optional-bind) | (changed) |

**`star4` and `star5` did NOT change — they still use `bind`.** This is the most important
finding of the experiment so far, and it refines the analysis:

For a >=3-entry join the competitor to `bind` is `multi-smallest`, whose `iterations` is
still the product of all cardinalities. Removing bind's 1e-4 discount raises bind's
estimate from ~4.4e4 to ~4.4e8, but `multi-smallest` sits at ~8e12, so **bind still wins**.
The plan only flips where the competitor is a *2-way* `hash` join, because hash costs
itself as a **sum** rather than a product.

> **Conclusion: causes #2 and #3 must be fixed together.** Neither is sufficient alone.
> Fixing only the `selectivityModifier` (#3) leaves every star join on bind, because
> `multi-smallest` (#2) still self-costs as a cartesian product. Fixing only #2 leaves
> bind with a 10,000x discount. This is a genuine compounding interaction, exactly as
> suspected in the PR description.

### Caution on the first measurement — it was biased

A first comparison (1-round base vs 3-round patched) showed `optional-join` -95%,
`optional` -60%, `chain2` -44%, but *also* showed +5% to +24% on queries with **no joins
at all** (`scan-name`, `scan-age`, `path-star`, `union`, `construct`). The patch cannot
affect a single-pattern scan, so that spread is measurement drift, not signal.

Re-running properly **interleaved** (alternating base/patched with an incremental `tsc`
between sides, per-query medians across rounds) — results in the next section. No number
from the biased run is reported as a result.

One apparent regression to check carefully in the interleaved run: **`chain4` 2551 -> 5642 ms
(+121%)**.

### Interleaved A/B result for v1 (local micro-harness)

Method: 3 rounds, alternating `git checkout origin/master -- <files>` and
`git checkout HEAD -- <files>` with an incremental `tsc` between sides, per-query median
of the 3 rounds. Sanity check that the bias is gone: the join-free queries
(`scan-name` -7.3%, `scan-age` -7.9%, `union` -1.8%, `construct` -2.4%, `path-star` -3.9%)
now sit within their own within-side spread, as they must.

**Result counts identical on all 29 queries (0 mismatches).**

Significance rule used: `|delta| > max(20%, 2x within-side spread)`.

| query | base | v1 | delta | verdict |
|---|---|---|---|---|
| `optional-join` | 8063.4 ms | **357.8 ms** | **-95.6%** | 22.5x faster |
| `optional` | 1844.4 ms | **832.7 ms** | **-54.9%** | 2.2x faster |
| `chain2` | 145.3 ms | **74.1 ms** | **-49.0%** | 2.0x faster |
| `chain4` | 2643.0 ms | **5566.2 ms** | **+110.6%** | **2.1x SLOWER — regression** |

Everything else was within noise. `star4` +8.0% and `star5` +1.4% are **unchanged**, as the
plan diff predicted.

**TOTAL across all 29 queries: 40,878 -> 35,764 ms = -12.5%.**

### The `chain4` regression is real and instructive

`chain4` is `?s foaf:name ?n . ?s ex:city ?c . ?c ex:inCountry ?co . ?co ex:name ?con`
— a chain whose later patterns are tiny (100 cities, 10 countries). Its plan changed
`bind bind bind` -> `bind bind hash-def`, and that one flip cost 2.1x.

This is the counter-example to a blanket removal of the discount: **for a chain join with
a small driving side, the bind join really is the better operator, and the 1e-4 modifier
was accidentally encoding that.** Removing it for all local joins is too blunt — it
happens to be right for OPTIONAL and 2-pattern chains and wrong for deeper chains.

### Honest assessment of v1

- Big, real wins on OPTIONAL (`optional-join` 22.5x, `optional` 2.2x).
- A real 2.1x regression on `chain4`.
- **No effect at all on the headline problem — 4- and 5-pattern star joins.**
- Net -12.5% on this query mix, but that number is dominated by one query
  (`optional-join` alone accounts for ~7.7 s of the 5.1 s net gain, i.e. the other
  queries are net *negative*).

So v1 is **not** a shippable fix. It is useful as evidence about *where* the cost model is
wrong, and it makes the compounding between causes #2 and #3 concrete and measured.

---

## 2026-08-23 — Milestone 8: TPF verification — **the `isRemoteAccess` gate FAILS**

This is the most important result of the session, and it **falsifies the claim I made in
the cost-model analysis section above**. Recording it prominently so nobody builds on the
wrong assumption.

I claimed that gating `selectivityModifier` on `isRemoteAccess` would leave TPF plan
choice "provably unchanged". **That is wrong.** Measured:

```
=== PLAN ORACLE: httpRequests, v1 vs baseline ===
queries differing vs baseline:  14 / 100
totals:  base_run1=128609   base_run2=128609   v1=129318   (+0.55%)
  S3#0..4:   7 ->  67 requests   (9.6x more)
  S4#0,1,3,4: 14 ->  90 requests   (6.4x more)
  S5#0:       7 ->  28 requests
```

Recall the baseline was *bit-identical* across two runs (128,609 twice, 0/100 differing),
so these 14 differences are real plan changes, not noise.

Correctness held: **0/100 result or hash mismatches, total results 244,585 unchanged.**
Wall clock 192,439 ms vs base mean 187,535 ms = **+2.61%**, which is *inside* the 3.06%
noise floor and therefore not a significant timing result either way.

### Why the gate fails — root cause

`ActorRdfJoin.constructResultMetadata` builds a join's output metadata as:

```js
return {
  state: this.constructState(metadatas),
  ...partialMetadata,
  cardinality: { type: ..., value: ... },
  variables: ActorRdfJoin.joinVariables(...),
};
```

It carries **no `pageSize` and no `requestTime`**. And:

```js
getRequestItemTimes = metadatas.map(m => m.pageSize ? (m.requestTime ?? 0) / m.pageSize : 0)
```

So `requestItemTimes` is 0 for any entry that is itself a join result. Since
`isRemoteAccess = requestItemTimes.some(t => t > 0)`, a join whose inputs are all
intermediate results reads as **local even in a pure TPF query**.

`ActorRdfJoinMultiSmallest.getOutput` explicitly does this — it joins two entries and
pushes the *result* back in as a new entry before re-mediating — so nested joins are the
normal case, not an edge case. The leaves (raw TPF patterns, which do carry Hydra
`pageSize`) see `isRemoteAccess === true`; everything above them sees `false`.

> **`isRemoteAccess` is a property of one join's immediate inputs, not of the query's data
> source.** It is only reliable at the leaves of the plan tree.

### This is a pre-existing inconsistency in master, independent of my patch

`ActorRdfJoinMultiBind.getJoinCoefficients` **already** uses `isRemoteAccess` on master,
for its min/max cardinality gate:

```js
if (metadatas[0].cardinality.value * this.minMaxCardinalityRatio / (isRemoteAccess ? 1 : 3) > ...)
```

By the same mechanism, that gate is **already misclassifying nested joins over remote
sources as local today**, applying the `/3` local relaxation to TPF queries. That looks
like a genuine latent bug in master worth reporting on its own, separate from any
cost-model change.

### Consequences for the cost-model work

Any fix that needs to treat local and remote sources differently **cannot use
`isRemoteAccess` as it stands**. Options, in increasing order of invasiveness:

1. **Propagate `pageSize`/`requestTime` through `constructResultMetadata`** (e.g. carry the
   max or sum from the inputs) so remoteness survives up the plan tree. This would also
   fix the pre-existing `minMaxCardinalityRatio` misclassification above. Small change,
   but it alters existing behaviour for remote sources and so needs its own TPF run.
2. **Derive remoteness from the query sources in the context** rather than from per-join
   metadata — robust, but a larger change and arguably the wrong layer.
3. **Do not branch on locality at all**; instead make the *estimates themselves* right, so
   the operators compete fairly (fix `multi-smallest`'s cartesian self-cost and give the
   selectivity heuristic real dynamic range). Most principled, most work.

### Status of v1

**v1 is rejected.** It does not do what it was designed to do:
- it changes TPF plans (14/100 queries, S3 9.6x more HTTP requests) rather than leaving
  them alone;
- it does not fix star joins at all;
- it regresses `chain4` by 2.1x locally.

Its value is diagnostic: it proved the compounding of causes #2/#3, and it exposed the
`isRemoteAccess` propagation bug.

---

## 2026-08-23 — Milestone 9: v1 on `benchmark-watdiv-file` — also a regression

Correctness fine (**0/100 mismatches, 244,585 results**), but timing is a net loss:

**TOTAL 38,790 ms (base mean of 2 runs) -> 39,758 ms = +2.50%**, against an aggregate
noise floor of 0.57%. So this is a real regression, ~4x the noise.

| set | base | v1 | delta |
|---|---|---|---|
| C1 | 477.1 | 386.1 | **-19.1%** |
| L3 | 11.6 | 67.7 | **+483.9%** |
| S5 | 5.2 | 17.6 | **+240.6%** |
| S2 | 14.2 | 31.5 | **+121.5%** |
| F2 | 51.3 | 66.7 | +29.9% |
| F1 | 22.4 | 27.5 | +22.9% |
| F4 | 49.9 | 59.9 | +20.2% |
| F5 | 134.4 | 159.0 | +18.3% |
| F3 | 85.6 | 98.8 | +15.5% |
| C2 / C3 | 3509 / 3202 | 3600 / 3230 | +2.6% / +0.9% |

L3, S2 and S5 are short queries where the per-query noise floor is high (median 10.5%,
max 75%), but +484% and +241% are far outside that, and each figure is the mean of 5
instantiations at replication 3. Treat them as real.

**v1 verdict across all three harnesses: rejected.**

| harness | v1 result |
|---|---|
| local micro-harness | -12.5% total, but `chain4` +110.6%, stars unchanged |
| `benchmark-watdiv-file` | **+2.50%** (regression, 4x noise floor) |
| `benchmark-watdiv-tpf` | 14/100 plans changed, S3 9.6x more HTTP requests |

---

## 2026-08-23 — Milestone 10: fixing cause #2 alone provably does nothing

Tested the change that was suggested as "the smallest defensible change first" —
`ActorRdfJoinMultiSmallest`'s product-of-cardinalities — **in isolation**, on a branch off
`origin/master` with no other modification:

```diff
-      iterations: metadatas.reduce((acc, metadata) => acc * metadata.cardinality.value, 1),
+      iterations: metadatas.reduce((acc, metadata) => acc + metadata.cardinality.value, 0),
```

This is the most aggressive form of the fix — replacing the product with a **sum**, which
for a 4-way star drops the estimate from 1.6e17 to 8e4, i.e. ~12 orders of magnitude.

**Result: 0 / 29 query plans changed.** Not one.

This empirically confirms the prediction made from the cost model: bind's flat 1e-4
`selectivityModifier` dominates so completely that `multi-smallest` cannot win no matter
how cheap it claims to be. **Anyone starting this work by fixing `multi-smallest` alone
will measure exactly nothing and may wrongly conclude the cost model is fine.**

## 2026-08-23 — Milestone 11: both fixes together (v3) — stars finally move

Branch `claude/perf-cost-model-experiment-v2`, combining the two:

**7 / 29 plans changed, including the headline cases:**

| query | master | v3 |
|---|---|---|
| `star4` | `multi-smallest hash bind nested-loop x3` | `multi-smallest hash multi-smallest hash hash` |
| `star5` | `multi-smallest hash bind nested-loop multi-smallest nested-loop x3` | all `multi-smallest` / `hash` |
| `chain3` | `bind nested-loop` | `multi-smallest hash hash` |
| `chain4` | `bind bind bind` | `multi-smallest hash multi-smallest hash hash` |
| `chain2` | `bind` | `hash-def` |
| `optional-join` | `bind bind` | `hash hash` |

Every `bind` and `nested-loop` is gone from the star and chain plans. Interleaved A/B
measurement in progress.

### v3 interleaved A/B on the local micro-harness — large, clean wins

3 interleaved rounds, per-query medians, **0/29 result mismatches**.

| query | master | v3 | delta |
|---|---|---|---|
| `optional-join` | 7713.9 ms | **375.0 ms** | **-95.1%** (20.6x) |
| `star4` | 8975.2 ms | **462.3 ms** | **-94.8%** (19.4x) |
| `star5` | 12679.4 ms | **664.3 ms** | **-94.8%** (19.1x) |
| `chain4` | 2503.0 ms | **205.2 ms** | **-91.8%** (12.2x) |
| `chain3` | 311.9 ms | **71.8 ms** | **-77.0%** |
| `chain2` | 167.5 ms | **66.8 ms** | **-60.1%** |
| `optional` | 1775.9 ms | **873.4 ms** | **-50.8%** |

**TOTAL 40,837 -> 9,747 ms = -76.1%.**

No significant regressions. The largest adverse move is `exists` +18.8%, which is below
the 20% significance threshold against a ~9% within-side spread — flagged as "watch",
not "regression". The join-free control queries (`scan-name` +7.3%, `construct` +6.7%,
`path-star` +2.1%) sit within their spreads, so the measurement is not biased.

**The `chain4` regression from v1 is gone — it flipped from +110.6% to -91.8%.** That is
direct evidence for the compounding hypothesis: with `multi-smallest` no longer
self-costing as a cartesian product, the planner finally has a *good* alternative to bind,
so removing bind's discount stops pushing it onto a bad choice. Neither change is safe or
effective alone; together they are both.

These numbers are in the same range as the "bind-join actors disabled" measurements
quoted in the PR description (4-pattern star 16x, 3-pattern chain 11x, OPTIONAL 3.4x),
which is the expected outcome if the cost model — rather than the bind implementation —
was the problem.

**Caveat before anyone gets excited: this is the local micro-harness only.** v3 still
contains the `isRemoteAccess` gate that Milestone 8 proved is broken, *and* the
`multi-smallest` change is not gated at all, so it applies to remote sources too. TPF
results are the deciding evidence and are pending.

---

## 2026-08-23 — Milestone 12: v3 on TPF — damage isolated to the broken gate

| check | baseline | v3 |
|---|---|---|
| result/hash mismatches | — | **0 / 100** |
| total results | 244,585 | **244,585** |
| `httpRequests` total | 128,609 (x2, identical) | **129,318 (+0.55%)**, 14/100 queries differ |
| wall clock | 187,535 ms | 187,277 ms (**-0.14%**, within 3.06% noise) |

Per-set HTTP request damage:

| set | base | v3 | delta |
|---|---|---|---|
| S3 | 35 | 335 | **+857%** |
| S4 | 135 | 439 | **+225%** |
| S5 | 35 | 140 | **+300%** |

and the matching wall clock: S3 25.3 -> 276.6 ms (+993%), S4 90.9 -> 377.6 ms (+315%),
S5 23.9 -> 127.0 ms (+431%).

### The decisive observation

**v3's TPF `httpRequests` total is 129,318 — byte-for-byte the same as v1's, on the same
14 queries.** v1 contained only the bind gate; v3 contains the gate *plus* the
`multi-smallest` change. Since the two produce identical TPF request counts:

> **The `multi-smallest` fix is completely TPF-neutral. 100% of the TPF regression comes
> from the broken `isRemoteAccess` gate.**

That is a clean decomposition: the change that delivers the local wins together with the
gate is harmless remotely on its own, and the harmful part is precisely the piece already
identified as buggy in Milestone 8.

Note also the overall TPF wall clock is **-0.14%**, i.e. neutral — the S3/S4/S5 blowups
are real but those queries are tiny in absolute terms, and C3 dominates the total. Judging
this change on total TPF runtime alone would have missed the regression entirely. This is
exactly why `httpRequests` was worth establishing as the primary oracle.

## 2026-08-23 — Milestone 13: v4 — fix the remoteness propagation itself

If all TPF damage flows from `isRemoteAccess` misreading nested joins as local, then
fixing the propagation should restore TPF plans *and* keep the local wins. v4 adds to v3:

```diff
+    // Propagate paging information from the inputs, so that operations higher up the plan
+    // tree can still tell that this result originates from a paged (remote) source.
+    const pageSizes = metadatas.map(metadata => metadata.pageSize).filter(Boolean);
+    const pageSize = pageSizes.length > 0 ? Math.max(...<number[]> pageSizes) : undefined;
+    const requestTimes = metadatas.map(metadata => metadata.requestTime).filter(Boolean);
+    const requestTime = requestTimes.length > 0 ? Math.max(...<number[]> requestTimes) : undefined;
```

in `ActorRdfJoin.constructResultMetadata`. This also addresses the pre-existing
`minMaxCardinalityRatio` misclassification noted in Milestone 8.

**Local plans: v4 vs v3 = 0/29 differences; v4 vs master = 7/29.** All local wins retained.

Prediction under test: TPF `httpRequests` should return to exactly **128,609**.
TPF run in progress.

### v4 TPF result — prediction confirmed exactly

```
baseline total : 128609   (bit-identical across 2 runs)
v3 total       : 129318   (14/100 queries differed)
v4 total       : 128609   -> queries differing from baseline: 0 / 100
                            *** ZERO PLAN CHANGES vs baseline ***
```

| check | result |
|---|---|
| result/hash mismatches | **0 / 100** |
| total results | **244,585** (unchanged) |
| `httpRequests` | **128,609 — exactly the baseline, every query** |
| wall clock | 189,631 ms vs 187,535 base = **+1.12%** (inside 3.06% noise) |

**TPF plan choice is provably unchanged under v4**, on the oracle that reproduced
bit-identically twice. The remoteness-propagation fix does exactly what it was predicted
to do, and the S3/S4/S5 blowups from v1 and v3 are completely gone.

A useful illustration of why the oracle matters: v4's per-set wall clock still shows
F2 +16.7%, F5 +15.4%, S3 +46.2%, S6 -22.2%. Since `httpRequests` is *identical* on every
query, the plans are identical, so **every one of those swings is pure noise** — an
artifact of `queryRunnerReplication: 1`. Anyone reading only the wall clock would report
regressions that do not exist.

### Where v4 stands

| harness | v4 |
|---|---|
| local micro-harness (plans) | 7/29 improved, identical to v3 |
| local micro-harness (timing) | expected ~-76%; confirmatory A/B pending |
| `benchmark-watdiv-tpf` | **plans bit-identical to master; results identical; +1.12% wall clock (noise)** |
| `benchmark-watdiv-file` | pending |

v4 = three changes:
1. `ActorRdfJoinMultiSmallest`: `iterations` product-of-cardinalities -> sum (cause #2).
2. `ActorRdfJoinMultiBind` / `ActorRdfJoinOptionalBind`: apply `selectivityModifier` only
   for remote (paged) access (cause #3).
3. `ActorRdfJoin.constructResultMetadata`: propagate `pageSize`/`requestTime` so
   remoteness survives up the plan tree (the enabling bug fix, and a fix for the
   pre-existing `minMaxCardinalityRatio` misclassification).

---

## 2026-08-23 — Milestone 14: v4 on `benchmark-watdiv-file` — net win, but 18/20 sets regress

Correctness fine (**0/100 mismatches, 244,585 results**).

```
base mean = 38,790 ms
v1        = 39,758 ms  (+2.50%)
v4        = 34,447 ms  (-11.20%)
```

-11.2% against a 0.57% noise floor looks like a clear win. **It is not.** The absolute
accounting shows it is one query set carrying the entire result:

| set | base | v4 | delta |
|---|---|---|---|
| **C2** | 17,546 ms | 2,097 ms | **-15,449 ms** |
| C1 | 2,385 ms | 1,625 ms | -760 ms |
| **C3** | 16,011 ms | 21,305 ms | **+5,294 ms** |
| **S1** | 314 ms | 2,465 ms | **+2,152 ms** |
| F5 | 672 ms | 1,740 ms | +1,068 ms |
| F3 | 428 ms | 1,299 ms | +872 ms |
| F4 | 249 ms | 996 ms | +747 ms |
| F1 | 112 ms | 515 ms | +403 ms |
| F2 | 257 ms | 622 ms | +365 ms |
| S2 | 71 ms | 346 ms | +274 ms |
| L3 | 58 ms | 315 ms | +257 ms |
| L1 | 100 ms | 269 ms | +169 ms |
| S6 | 31 ms | 198 ms | +168 ms |
| (others) | | | +115 ms |
| **TOTAL** | | | **-4,344 ms** |

**C2 alone contributes -15,449 ms. Everything else nets +11,105 ms. 18 of 20 query sets
get slower**, several by large relative margins (S1 +686%, S6 +547%, L3 +443%,
S2 +386%, F1 +360%, F4 +300%, S5 +255%, F3 +204%).

These are not noise: the per-set baseline drift between the two identical runs was at most
~24% for the small sets and 2.0% for C3, so C3 +33.1% and S1 +686% are far outside it.

### What this means — the micro-harness overstated the benefit

The local micro-harness reported **-76.1%**. The real WatDiv workload reports **-11.2%,
concentrated in one query and accompanied by widespread regressions.** The synthetic
queries were biased toward exactly the pathological shape (uniform ~20k cardinalities,
star and chain joins where bind is clearly wrong). Real WatDiv queries have varied and
often highly selective patterns, and there **bind joins are frequently the right choice** —
which is what the 1e-4 `selectivityModifier` was crudely encoding.

> **Lesson: a hand-built micro-harness is good for finding and diagnosing a pathology, but
> it cannot be used to size the benefit of a planner change. The standard benchmarks
> disagreed with it by a factor of ~7, and disagreed in kind (broad regressions vs none).**

### Verdict on v4

**Not shippable.** It is the best of the four variants and it solved the remote-safety
problem completely, but on the real local workload it trades one big win for 18 regressions.

| | v1 | v3 | v4 |
|---|---|---|---|
| TPF plans | 14/100 changed | 14/100 changed | **0/100 — identical** |
| TPF results | identical | identical | identical |
| file benchmark total | +2.50% | (not run) | **-11.20%** |
| file benchmark sets regressed | many | — | **18 / 20** |
| micro-harness total | -12.5% | -76.1% | -76.1% (plans identical to v3) |
| micro-harness `chain4` | +110.6% | -91.8% | -91.8% |

---

# 2026-08-23 — FOLLOW-UP TASK: change 3 (remoteness propagation) measured in isolation

Branch: **`claude/perf-remoteness-propagation`**, off `origin/master`, 2 commits, pushed.
No PR opened (not requested). No GitHub issue filed (declined).

## The change

Only `ActorRdfJoin.constructResultMetadata`. Exact diff of commit 1 (`523d134eca`):

```diff
@@ -272,8 +272,18 @@
       }
     }

+    // Propagate paging information from the inputs, so that operations higher up the plan
+    // tree can still tell that this result originates from a paged (remote) source.
+    // Without this, any join over join results is indistinguishable from a local source.
+    const pageSizes = metadatas.map(metadata => metadata.pageSize).filter(Boolean);
+    const pageSize = pageSizes.length > 0 ? Math.max(...<number[]> pageSizes) : undefined;
+    const requestTimes = metadatas.map(metadata => metadata.requestTime).filter(Boolean);
+    const requestTime = requestTimes.length > 0 ? Math.max(...<number[]> requestTimes) : undefined;
+
     return {
       state: this.constructState(metadatas),
+      ...pageSize === undefined ? {} : { pageSize },
+      ...requestTime === undefined ? {} : { requestTime },
       ...partialMetadata,
       cardinality: {
         type: cardinalityJoined.type,
```

Commit 2 (`4cc930dca0`) narrows it so `requestTime` only propagates alongside `pageSize`:

```diff
-    const requestTimes = metadatas.map(metadata => metadata.requestTime).filter(Boolean);
-    const requestTime = requestTimes.length > 0 ? Math.max(...<number[]> requestTimes) : undefined;
+    // Only propagate requestTime together with pageSize. For non-paged (local) sources
+    // requestTime is a one-off dereference cost, and re-applying it at every level of the
+    // plan tree would inflate the estimated cost of every nested join over a local source.
+    const requestTime = pageSize === undefined ?
+      undefined :
+      Math.max(...metadatas.map(metadata => metadata.requestTime ?? 0));
```

Note the spreads are placed *before* `...partialMetadata`, so an explicit caller-supplied
value still wins.

## !!! First: a methodology error that affects earlier numbers in this file !!!

While measuring this change I found the local file benchmark reporting **+4.28%**, and
after a "fix" **+5.40%** — worse. That contradiction prompted a drift check: **master
re-measured on the same machine, hours after the original baseline.**

```
master EARLY  run1 38,901  run2 38,680  mean 38,790 ms   (back-to-back spread -0.57%)
master NOW                             40,203 ms
DRIFT = +3.64%
```

**The machine got 3.64% slower over the session.** Every jbr comparison in this file was
made against a baseline captured hours earlier and is therefore inflated by up to ~3.6%.
I interleaved the *micro-harness* A/B runs but did not interleave the *jbr* runs — that
was an error.

Re-scored against a same-session master baseline:

| variant | vs EARLY base | **vs NOW base** |
|---|---|---|
| cost-model v1 | +2.50% | **-1.11%** |
| cost-model v4 | -11.20% | **-14.32%** |
| propagation commit 1 | +4.28% | **+0.61%** |
| propagation commit 2 | +5.40% | **+1.69%** |

**Retraction:** the earlier claim that "v1 regresses `benchmark-watdiv-file` by +2.50%" is
**wrong**; re-scored it is -1.11%, i.e. indistinguishable from no change.

**What is unaffected:** all TPF `httpRequests` conclusions (a counter — immune to machine
speed), all correctness results, and v4's large per-set effects (C2 -15,449 ms / -88%,
C3 +5,294 ms / +33%) which are an order of magnitude above drift and were corroborated by
plan changes. **What is unreliable:** any file-benchmark claim in the +/-1-3% band, and the
small-set percentages in the v4 table.

**Rule for future work: interleave the jbr runs too, or re-baseline immediately before
each comparison. Do not reuse a baseline across hours.**

## Results for change 3 in isolation

### Prediction 1 — "local sources: nothing changes" — HOLDS

- **Micro-harness plans: 0 / 29 changed.**
- **`benchmark-watdiv-file`: +0.61% (commit 1), +1.69% (commit 2)** against a same-session
  master baseline. Both are inside the drift-inflated uncertainty; the 0.57% back-to-back
  noise floor does not apply across runs separated in time. Treated as **no-op**.
- Correctness: **0/100 mismatches, 244,585 results**, every run.

Caveat on why the micro-harness could not have detected a local effect here:
`QuerySourceRdfJs` hard-codes `requestTime: 0` ("free for future calls, as we're fully
indexed"), and `0` is falsy, so `.filter(Boolean)` drops it. By contrast
`ActorDereferenceFile` sets `requestTime = Date.now() - start`, which is non-zero and in
**milliseconds**. So a 0/29 result on the `RdfStore`-backed harness is a true statement
about `RdfStore` sources and **not** evidence about local sources generally. This is the
motivation for commit 2, which is a semantic argument, not a measured one.

### Prediction 2 — "TPF plans probably change" — FALSIFIED

| | `httpRequests` total | differing | wall clock vs base |
|---|---|---|---|
| baseline (x2) | **128,609** | — | — |
| commit 1 | **128,609** | **0 / 100** | +0.64% |
| commit 2 | **128,609** | **0 / 100** | -0.17% |

**Both commits leave TPF plan choice bit-identical.** Correctness identical
(0/100 mismatches, 244,585). Wall clock well inside the 3.06% noise floor.

The reasoning behind the prediction was sound — correct remoteness *does* make the
`minMaxCardinalityRatio` gate stricter (`/1` instead of `/3`) — but no WatDiv TPF query
sits in the narrow band where that flips the gate's outcome.

### Is the change actually doing anything? (yes — "no change" is not "no effect")

"0/100 changed" is ambiguous between *the fix is safe* and *the fix is inert*. The
**v3-vs-v4 pair settles it as a controlled experiment**: those two branches differ by
exactly this hunk and nothing else, and v3 changed 14/100 TPF queries while v4 changed
0/100. The propagation demonstrably takes effect on TPF; it simply has no observable
consequence unless something else also branches on `isRemoteAccess`.

## VERDICT: shippable as a standalone bug fix — **qualified yes**, but not as a perf fix

**Yes, because:**
1. It fixes a real bug. On master, `isRemoteAccess` misclassifies nested joins over paged
   sources as local, so `ActorRdfJoinMultiBind` applies its local `/3` relaxation to the
   `minMaxCardinalityRatio` gate on remote queries. Demonstrated, not theorised.
2. Measured harmless: 0/29 local plan changes, 0/100 TPF plan changes, wall clock within
   noise on both, and byte-identical results on all 200 query executions across both
   benchmarks.
3. It is a prerequisite for any future locality-aware cost-model work — without it, no
   such change can be made safely, as v1 and v3 demonstrated.

**But only with these caveats stated honestly:**
1. **Zero demonstrable benefit on either benchmark.** It must be justified as a
   correctness/consistency fix. Anyone expecting a speedup will be disappointed.
2. It touches shared join infrastructure used by every join actor, so its blast radius is
   wider than the two WatDiv benchmarks that were run. **`benchmark-bsbm-tpf` and
   `benchmark-bsbm-file` were never attempted in this session** (see below).
3. `Math.max` for combining `pageSize`/`requestTime` is a judgement call, not validated.
4. **Needs unit tests.** The repo enforces **100% coverage globally**, and this adds
   branches: `pageSize` present/absent, `requestTime` present/absent, and (commit 2) the
   `pageSize === undefined` short-circuit. `packages/bus-rdf-join/test/ActorRdfJoin-test.ts`
   is the place. **I did not run the test suite on this branch** — it must pass before merge.

**Which commits to keep:** both are TPF-neutral and correctness-neutral. Commit 2 is the
more conservative artifact (a strict no-op for non-paged sources) and is recommended, but
note its original motivation — the "+4.28% regression" — turned out to be machine drift.
Its remaining justification is semantic: for a local file source `requestTime` is a one-off
dereference cost in milliseconds, and `getRequestInitialTimes` returns it directly when
`pageSize` is absent, so propagating it would re-charge that cost at every level of the
plan tree. **The benchmarks cannot separate the two commits** (+0.61% vs +1.69%, both
below resolution). If only one is kept, commit 1 is the one that was measured first and
independently on TPF; commit 2 is measured too and is safer in principle.

## `benchmark-bsbm-tpf`: NOT attempted

Only `benchmark-watdiv-file` and `benchmark-watdiv-tpf` were ever run. Notes for whoever
picks it up:
- It has **no `fetch-assets` script**, unlike the watdiv benchmarks — the BSBM dataset is
  generated by `jbr prepare` rather than downloaded, so expect a longer, Docker-dependent
  prepare step that was never exercised here.
- Its `performance:ci` is `jbr prepare -c 0 && jbr run -c 0 && psbr csv bsbm combinations/combination_0/output`.
- It needs the same LDF server + nginx cache images, which are already built locally and
  working, so the `mirror.gcr.io` workaround for the Docker Hub rate limit should not be
  needed again in this container.
- `benchmark-bsbm-file` was also never attempted.
