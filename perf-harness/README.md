# Selective query performance harness (prototype work, not for merging)

Scripts used to profile Comunica against Oxigraph on LDBC SNB 0.1 short reads.
Paths to the dataset and queries point to the session scratchpad; adjust when rerunning.

- `bench.js`: in-process latency with phase timings (PHASES=1), serialization (SERIALIZE=1), CPU profile (PROFILE=file), per-actor timings (ACTORS=1).
- `phase-ab.js`: per-phase A/B of prototype flags (`globalThis.__proto`), alternating per execution in one process. The most precise method.
- `ab.js`, `ab-driver.sh`, `ab-summary.py`: per-process A/B (noisy, about +-12%).
- `http-bench.js`, `run-config.sh`: HTTP latency against an endpoint.
- `analyze.js`, `categorize.js`, `callers.js`, `traqula-split.js`: CPU profile analysis.
- `transpile.js`: transpile changed TS files without a full build.
- `NOTES.md`: ideas and measured results.

Prototype branches are named `claude/lucid-meitner-jg4dy5-perf-*` and are based on this branch.
