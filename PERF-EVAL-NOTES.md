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
