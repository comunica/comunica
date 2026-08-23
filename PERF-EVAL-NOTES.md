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
