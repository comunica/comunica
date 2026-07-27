# Fix: Comunica OPTIONAL bind-join produces a cross join instead of a correlated left join

What follows is a detailed description of the problem. you are tasked with creating a bugfix for this problem.
Add a minimally contained unit test that shows this behaviour, see to it that the test fails and then implement the solution to the test.

## Summary

Comunica's `join-optional-bind` physical join actor (package
`@comunica/actor-rdf-join-optional-bind`) can silently return **wrong query
results** — a full cross join instead of a correctly correlated `OPTIONAL`
(SPARQL `LEFT JOIN`) — when the shared join variable on the right-hand side of
the `OPTIONAL` is not a variable used directly inside a leaf triple pattern,
but is instead produced by a rename (`BIND`/`AS`) that sits underneath a
sub-`SELECT` (`Project`) boundary.

This was discovered while working around it in a downstream project
(`2025-query-rewriting-1-2`, this repo), where the query rewriter always
wraps rewritten triple patterns in a `Project` that exposes renamed
variables via an inner `Extend`. That shape is common and not unreasonable
to generate, so this is very likely to bite other Comunica users too.

Confirmed with `comunica` (all `@comunica/*` packages) version **5.1.3**,
via `@comunica/query-sparql-file`.

## Minimal reproduction

Data (`/tmp/data.ttl`):

```turtle
<ex://t1> <ex://p1> <ex://alice> .
<ex://t2> <ex://p1> <ex://bob> .
<ex://t1> <ex://statedBy> <ex://wiki> .
<ex://t2> <ex://statedBy> <ex://survey> .
```

Query A — **correct** (no rename on the `OPTIONAL` side):

```sparql
SELECT * WHERE {
  { SELECT ?t ?s WHERE { ?t <ex://p1> ?s } }
  OPTIONAL {
    SELECT ?t ?agent WHERE { ?t <ex://statedBy> ?agent }
  }
}
```

Result (2 rows, correctly correlated):

```
t=ex://t1, agent=ex://wiki, s=ex://alice
t=ex://t2, agent=ex://survey, s=ex://bob
```

Query B — **wrong** (the `OPTIONAL` side exposes `?t` via a rename instead of
using it directly in its own triple pattern):

```sparql
SELECT * WHERE {
  { SELECT ?t ?s WHERE { ?t <ex://p1> ?s } }
  OPTIONAL {
    SELECT ( ?tOrig AS ?t ) ?agent WHERE { ?tOrig <ex://statedBy> ?agent }
  }
}
```

Expected result: the same 2 correctly-correlated rows as Query A (only the
variable naming path differs — semantically `?tOrig` is `?t`).

Actual result (4 rows — every `?t` from the left is joined with every
`?agent` on the right, i.e. a cross join):

```
t=ex://t1, agent=ex://wiki, s=ex://alice
t=ex://t1, agent=ex://survey, s=ex://alice
t=ex://t2, agent=ex://wiki, s=ex://bob
t=ex://t2, agent=ex://survey, s=ex://bob
```

The same thing reproduces with `BIND` instead of a `SELECT ... AS ...`
rename, and with an extra layer of subquery nesting around the `BIND`/`AS` —
what matters is that the variable shared with the *outer* query is not
literally present in the innermost triple pattern of the `OPTIONAL` branch,
but is produced by an `Extend` operation that is wrapped inside a `Project`.

You can confirm which physical join actor gets chosen with:

```ts
const result = await engine.explain(query, { sources: [...] }, 'physical');
console.log(result.data);
```

Both Query A and Query B select `join-optional(bind)` — the *only*
difference is whether the pushed-down substitution has something to bind to.

## Root cause

`packages/actor-rdf-join-optional-bind/lib/ActorRdfJoinOptionalBind.ts`
already contains a safety check meant to prevent exactly this class of bug,
in `getJoinCoefficients`:

```ts
// Reject binding on some operation types
if (action.entries[1].operation.type === Algebra.Types.EXTEND ||
    action.entries[1].operation.type === Algebra.Types.GROUP) {
  return failTest(`Actor ${this.name} can not bind on Extend and Group operations`);
}
```

This guard rejects the bind-join strategy when the **top-level** operation of
the right-hand `OPTIONAL` branch is `EXTEND` (or `GROUP`) — presumably
because bind-join materializes/substitutes the outer bound value for a
variable by looking for that variable *syntactically inside the pushed-down
operation's leaf patterns*, and an `Extend` node introduces a variable name
that does not exist in any leaf pattern, so the substitution silently does
nothing and the two sides end up joined without any correlation at all.

The problem: this check only looks at `action.entries[1].operation.type`
**directly**. It does not look through a `Project` node. Since
`Project(Extend(...))` is an extremely common shape (any sub-`SELECT` that
renames a variable via `AS` compiles to exactly this), the guard fails to
trigger whenever the renaming `Extend` is wrapped in a `Project`, and the
buggy bind-join path is taken anyway — silently returning wrong results
instead of correctly falling back to a hash/nested-loop-based `OPTIONAL`
join (which was confirmed correct in Query A and in a plain `JOIN` version of
Query B).

## What to fix

1. Generalize the `getJoinCoefficients` guard in
   `ActorRdfJoinOptionalBind` (and check whether the analogous guard in
   `@comunica/actor-rdf-join-inner-multi-bind` /
   `ActorRdfJoinMultiBind`, which this actor delegates to via
   `ActorRdfJoinMultiBind.createBindStream`, has the same gap) so it detects
   an `Extend`/`Group` operation **reachable through any chain of `Project`
   nodes**, not just when it is the immediate top-level operation. A `Project`
   is a pure pass-through/renaming-restriction wrapper for this purpose, so
   the check should effectively "see through" `Project` nodes (and probably
   through `Filter` too, since a `Filter` on top of such an `Extend` has the
   same problem) down to the first operation that actually changes what can
   be bound.
2. Alternatively/additionally, consider whether the bind-join
   *materialization* mechanism itself (in
   `@comunica/actor-rdf-join-inner-multi-bind`, likely
   `ActorRdfJoinMultiBind.createBindStream` /
   the code that constructs the per-binding materialized operation) can be
   made to correctly push bindings through `Project`/`Extend` boundaries
   (e.g. by substituting through renames) rather than only rejecting them.
   That would be the more general fix, but the guard-generalization in (1)
   is the minimal safe fix and is likely sufficient.
3. Add a regression test (integration-level, executing an actual query
   against an in-memory/file store, not just a unit test on the actor logic)
   reproducing Query B above (and ideally a few structural variants: `BIND`
   instead of `AS`, an extra level of subquery nesting, and the
   already-passing Query A as a non-regression control) asserting the
   correct 2-row correlated result, not the 4-row cross join.
4. Run the full Comunica test suite to make sure tightening/generalizing the
   guard doesn't cause correct bind-join optimizations to be needlessly
   rejected elsewhere (it's fine if it now falls back to hash/nested-loop
   more often in these cases — that's the safe/correct behavior — but check
   for a perf-focused test that pins the "bind" actor being chosen in a case
   that should now no longer choose it, and update/relax that expectation as
   appropriate).

## Where to work

This is a fix to the **Comunica** engine itself (`https://github.com/comunica/comunica`),
not to this repository. This repo (`2025-query-rewriting-1-2`) is only where
the bug was *discovered*; it currently works around it by always removing
`Project` nodes from its generated algebra before it's given to Comunica
(see `lib/transformations/removeProjections.ts` and its use in
`test/integration.test.ts`), so no further changes are needed here for the
workaround itself. Please:

- Clone/open the Comunica monorepo at the version matching
  `@comunica/actor-rdf-join-optional-bind@5.1.3` (or current `master`/`next`
  if the packages have since moved) to locate the exact source files (the
  compiled versions referenced above can be found for context under this
  repo's `node_modules/@comunica/actor-rdf-join-optional-bind/lib/` and
  `node_modules/@comunica/bus-rdf-join/lib/ActorRdfJoin.js`, but you should
  edit the real TypeScript sources in the Comunica repo, not `node_modules`).
- Implement the fix, add the regression test described above, and open a PR
  upstream (or, if instructed to work locally-only, produce a patch/diff and
  a clear write-up of the change for review).
