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
