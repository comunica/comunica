# Plan: making physical query plans complete and reliable

Status: implemented. Every phase below has landed; where the implementation deviates from what
was planned, [§5](#5-what-was-done-differently) records what changed and why.
Scope: `explain physical` and `explain physical-json`.

This document records the problems that were found in the current physical explain
implementation (each one reproduced against the engine, see
[Appendix A](#appendix-a--reproductions)), the root causes behind them, and a phased plan to fix them.

## 1. How it works today

There is no single component that builds the physical plan. Instead, three unrelated
base classes each call into a logger as a side effect of running:

| Location | What it logs |
| --- | --- |
| `bus-query-operation/lib/ActorQueryOperationTyped.ts:46-60` | every typed query operation (`project`, `filter`, `join`, `path`, …) |
| `actor-query-operation-source/lib/ActorQueryOperationSource.ts:38-52` | operations delegated to a source |
| `bus-rdf-join/lib/ActorRdfJoin.ts:405-465` | the selected physical join actor, plus its metadata |

They communicate through two context entries, `KeysInitQuery.physicalQueryPlanLogger`
and `KeysInitQuery.physicalQueryPlanNode`, and through
`MemoryPhysicalQueryPlanLogger`, which keeps a `Map<any, IPlanNode>`
(`MemoryPhysicalQueryPlanLogger.ts:10`) **keyed on the algebra operation object or on the
join action object itself**.

Three properties of that design cause essentially every problem below:

1. **Node identity is borrowed from objects the engine also uses for other purposes.**
   Any actor that re-dispatches the *same* object loses its node
   (`this.planNodes.set(node, planNode)` at `MemoryPhysicalQueryPlanLogger.ts:33`
   silently overwrites), and any actor that constructs a *new* object for an
   already-executed subtree cannot refer back to it.
2. **The tree is patched up after the fact** with `stashChildren` / `unstashChild`.
   `unstashChild` is a no-op when the child is unknown, so a broken link is invisible.
3. **Only join actors report runtime statistics**, and they do so through a
   floating `instrumentIterator(...).then(...)` whose result may or may not arrive.

## 2. Confirmed defects

### 2.1 Crashes — `explain physical` fails on queries that execute fine

`ActorRdfJoin.run` reads `sideData.metadatas` (`ActorRdfJoin.ts:449`) **only when a plan
logger is present**. `ActorRdfJoinNone.test` passes `undefined!` as side data
(`actor-rdf-join-inner-none/lib/ActorRdfJoinNone.ts:41`), so every query containing a
zero-entry join throws `Cannot read properties of undefined (reading 'metadatas')` in
explain mode while working normally:

```
SELECT * WHERE { }                     -> normal: 1 result | explain: TypeError
SELECT * WHERE { BIND(1 AS ?x) }       -> normal: 1 result | explain: TypeError
```

This is the sharpest symptom of the general problem: the logging path is a second,
untested code path through the join bus.

### 2.2 Whole subtrees disappear

**(a) Object identity collision.** `ActorRdfJoinWrapStream.getOutput`
(`actor-rdf-join-wrap-stream/lib/ActorRdfJoinWrapStream.ts:51`) re-dispatches the *same*
`IActionRdfJoin` object to `mediatorJoin`. Because that object is the plan-node key, the
inner join overwrites the wrapper's entry in `planNodes` and then appends itself as its
own child. The node the parent still points at ends up empty, so the entire join subtree
vanishes. With `ccqs:config/rdf-join/actors-wrap-stream.json` enabled (a config shipped in
this repo), a two-pattern BGP explains as:

```
project (age,name,s)
  join
    join-inner(wrap-stream)          <- hash-def join and both patterns are gone
```

**(b) Newly built entries can never be re-attached.** `ActorRdfJoinMultiSmallest`
joins two entries and wraps the result in a *fresh* `createJoin(...)` algebra object
(`actor-rdf-join-inner-multi-smallest/lib/ActorRdfJoinMultiSmallest.ts:99-105`). That
object was never logged, so `unstashChild` silently drops it. A three-pattern BGP
therefore reports two sibling joins, where the second one shows one input instead of two
— even though its own `cardinalities` array in the JSON output lists two:

```
join-inner(multi-smallest)
  join-inner(hash-def) cardReal:5 ...
    pattern (?s foaf:name ?name) cardEst:5 src:0
    pattern (?s foaf:age ?age)   cardEst:5 src:0
  join-inner(hash-def) cardReal:5 ...
    pattern (?s foaf:knows ?f)   cardEst:5 src:0     <- second input missing
```

**(c) The bind side of a bind join is never a node.** In `ActorRdfJoinMultiBind` /
`ActorRdfJoinOptionalBind`, `entries[0]` is the stream that drives the binding. Its plan
node is stashed by `ActorRdfJoin.run` and, because bind joins are not leaves, never
unstashed. `ActorRdfJoinMultiBind` at least reports the operation as a
`bindOperation` *string* in metadata; `ActorRdfJoinOptionalBind` and
`ActorRdfJoinMultiBindSource` report nothing at all. So for
`?s foaf:name ?name OPTIONAL { ?s foaf:knows ?f }` the left-hand pattern is absent
from the plan entirely:

```
project (f,name,s)
  leftjoin
    join-optional(bind) cardReal:6 ...
      pattern (ex:alice foaf:knows ?f) src:0 compacted-occurrences:5
```

### 2.3 Everything a source does is a black box

`ActorQueryOperationSource` logs one node with the operation type and the source's
`toString()`, and nothing else. When a source accepts a large operation — the common case
for SPARQL endpoints — the plan collapses to a single line. Against a real SPARQL
endpoint source:

```
SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a } ORDER BY ?n LIMIT 3

slice src:0
sources:
  0: QuerySourceHypermedia(http://localhost:3456/sparql)(SkolemID:0)
```

No sub-operation tree, no indication of what was actually sent to the endpoint, no
cardinality, no timing, no request count. For federated querying — the main reason to
look at a physical plan — this is the single biggest gap.

### 2.4 Runtime statistics are join-only, and often wrong when present

* Only join nodes get `cardinalityReal` / `timeSelf` / `timeLife`. `project`, `filter`,
  `union`, `orderby`, `group`, `distinct`, `slice`, `path` and source nodes get none, so
  there is no way to see where time actually goes.
* `instrumentIterator` marks each iterator with `_profileInstrumented`
  (`utils-iterator/lib/instrumentIterator.ts:41-43`) and refuses to patch it twice. When
  an outer join returns a stream that an inner join already instrumented, the outer join
  silently reports **zeros** rather than "unknown":

  ```
  { "logical": "join-inner", "physical": "multi-smallest",
    "cardinalityReal": 0, "timeSelf": 0, "timeLife": 0 }
  ```

  The compact renderer then hides those fields (they are falsy), so the same node prints
  differently depending on whether the number happened to be measured.
* The same guard means an outer join's `timeSelf` stops accumulating as soon as the
  `_source` walk meets an already-instrumented iterator, so times of nested joins are not
  comparable.
* `appendMetadata` is called from a floating `.then()` on the `instrumentIterator`
  promise. That promise resolves on the iterator's `end` event; a stream that is
  *destroyed* rather than ended (bind joins destroy their non-smallest inputs,
  `ActorRdfJoinMultiBind.getOutput`) never resolves it, and nothing awaits it before
  `toJson()` is called in `ActorQueryProcessExplainPhysical.run`.

### 2.5 Information that is collected and then dropped

`IPlanNode.actor` is recorded on every node but never serialized — `planNodeToJson`
(`MemoryPhysicalQueryPlanLogger.ts:92`) emits `logical`, `physical` and metadata only.
Since non-join actors never set a `physicalOperator`, the plan cannot say *which actor*
ran an operation. Both of these explain as an identical, uninformative `path` chain:

```
SELECT * WHERE { ?s foaf:knows+ ?o }     SELECT * WHERE { ex:alice foaf:knows? ?o }
project (o,s)                            project (o)
  path                                     path
    distinct                                 distinct
      path                                     path
        ...                                      path
```

`distinct-hash` vs `distinct-identity`, the ALP algorithm used, the order-by
implementation — none of it is visible.

### 2.6 Structure that does not reflect execution

* **`FILTER EXISTS` flattens.** Each per-binding EXISTS evaluation becomes another child
  of the `filter` node, as a sibling of the real input. Five bindings give six children;
  a real dataset gives thousands:

  ```
  filter
    pattern (?s foaf:name ?n) src:0
    pattern (ex:alice foaf:knows ?f) src:0
    pattern (ex:bob foaf:knows ?f) src:0
    ... one per binding ...
  ```

* **Property paths nest by recursion depth**, not by plan structure, and the
  per-subject evaluations of an ALP appear as siblings of the seed operation.
* **Compaction is hard-coded to bind joins** (`data.physical === 'bind'`,
  `MemoryPhysicalQueryPlanLogger.ts:104`), so the two cases above are never compacted;
  and where it does apply it keeps only `firstOccurrence` — differing sources or
  cardinalities across occurrences are discarded rather than aggregated.
* **Short-circuited joins look like un-executed ones.** When `ActorQueryOperationJoin`
  returns early on a zero-cardinality entry, no physical join is logged and the plan shows
  a bare `join` with children — indistinguishable from a join whose physical actor was
  simply not recorded.
* **`includeInLogs = false` on `ActorRdfJoinSingle`** leaves a bare `join` node with one
  child and no physical operator, which reads as missing information rather than as
  "there was nothing to join".

### 2.7 Explain-mode detection

`ActorQueryProcessExplainPhysical.test` and `.run` both read the mode as
`context.get(KeysInitQuery.explain) ?? context.get(new ActionContextKey('explain'))`
(the same in `ActorQueryProcessSequential.test` and the other explain actors). The
fallback exists because context-shortcut expansion happens inside
`queryProcessor.parse()`, i.e. *after* the query-process bus has already selected an
actor, so at `test()` time only the raw `explain` shortcut is set. It works, but it means
every actor on the bus has to know about the un-expanded key.

## 3. Plan

The phases are ordered so that each one is independently shippable and testable. Phases 1
and 2 are the structural fix; 3–5 are the "missing information" fixes that phase 2 makes
possible.

### Phase 0 — Regression harness (prerequisite)

Before changing anything, lock down current behaviour and make the failures visible.

* Add an integration test suite in `engines/query-sparql/test/` that explains a fixed
  corpus of queries (BGP of 1/2/3 patterns, OPTIONAL, nested OPTIONAL, UNION, MINUS,
  FILTER, FILTER EXISTS, property paths, subqueries, VALUES, ASK, CONSTRUCT, DESCRIBE,
  GRAPH, updates, `SELECT * WHERE {}`, `BIND`-only, multi-source federation) against an
  in-memory `N3.Store`, and snapshot the compact output with timings normalised away.
* Add cases against a stub SPARQL-endpoint source so pushdown plans are covered.
* Add a config permutation that enables `ccqs:config/rdf-join/actors-wrap-stream.json`.
* Mark the currently-failing cases from §2.1 as expected failures so phase 1 flips them.

### Phase 1 — Fix the crash and the silent drops (small, backportable)

Independent of the redesign, and worth landing first:

1. `ActorRdfJoin.run`: stop assuming `sideData.metadatas` exists. Guard the
   `cardinalities` / `joinCoefficients` block, or fix `ActorRdfJoinNone.test` to pass
   `{ metadatas: [] }` instead of `undefined!` — preferably both, since the logger path
   must never be able to break execution.
2. `MemoryPhysicalQueryPlanLogger.logOperation`: throw (or warn loudly) when a node key
   is logged twice, instead of overwriting. Make `unstashChild` on an unknown node an
   explicit error rather than a no-op. These turn today's silent data loss into a
   failing test, which is what makes phase 2 verifiable.
3. Add the missing `physicalPlanMetadata` (`bindIndex`, `bindOperation`,
   `bindOperationCardinality`, `bindOrder`) to `ActorRdfJoinOptionalBind` and
   `ActorRdfJoinMultiBindSource` so bind joins are at least described consistently until
   phase 2 makes the bind side a real node.

### Phase 2 — Give plan nodes their own identity

This is the core change and removes the root cause of §2.2.

**2a. Opaque node handles.** Change `IPhysicalQueryPlanLogger` so that logging an
operation *returns a handle*:

```
interface IPhysicalQueryPlanLogger {
  logOperation(args: ILogOperationArgs): IPhysicalQueryPlanNode;
}

interface IPhysicalQueryPlanNode {
  appendMetadata(metadata: any): void;
  reparent(newParent: IPhysicalQueryPlanNode): void;
  detach(): void;
}
```

The handle, not the algebra operation, goes into
`KeysInitQuery.physicalQueryPlanNode`. `MemoryPhysicalQueryPlanLogger` no longer needs
`planNodes: Map<any, IPlanNode>` at all, and it becomes impossible for two runs to
collide (fixes §2.2a: `ActorRdfJoinWrapStream` re-dispatching the same action now
produces two properly nested nodes) or for a caller to reference a node that does not
exist.

Because the handle is created per *run*, the resulting tree mirrors actual execution
nesting rather than algebra shape.

**2b. Carry the node on join entries.** Add `physicalPlanNode?: IPhysicalQueryPlanNode`
to `IJoinEntry` in `@comunica/types`. Whoever produces an entry sets it:
`ActorQueryOperationJoin` / `-leftjoin` / `-minus` / `-union` from the sub-operation run,
and `ActorRdfJoinMultiSmallest` from the sub-join it just created. `ActorRdfJoin.run`
then re-parents `entry.physicalPlanNode` under its own node **for every join, not only
leaves**, which retires `stashChildren` / `unstashChild` entirely and fixes §2.2b and
§2.2c in one move: the intermediate join entry and the bind-driving entry both become
ordinary children.

**2c. Drop `isLeaf` / `includeInLogs` as plan-shaping switches.** With 2b, the tree is
correct by construction. `ActorRdfJoinSingle` should log a node like everyone else
(§2.6) rather than hide itself; `wrap-stream` joins likewise. If the output is too
verbose, filter at render time, not at collection time.

**2d. Record the short-circuit.** When `ActorQueryOperationJoin` returns early on a
zero-cardinality entry, log an explicit node (e.g. `physical: 'empty'`) so the plan says
why no physical join ran.

### Phase 3 — Uniform, honest runtime statistics

**3a. Rewrite `instrumentIterator` to support several concurrent observers.** Replace the
single `_profileInstrumented` boolean with a list of counters attached to the iterator, so
that nesting no longer silently produces zeros (§2.4). Distinguish "not measured" from
"measured as 0" — an unmeasured node must omit the field in JSON, not emit `0`.

**3b. Measure every node, not only joins.** Move instrumentation from `ActorRdfJoin.run`
into a shared helper invoked by all three logging sites, so `project`, `filter`, `union`,
`orderby`, `group`, `distinct`, `slice`, `path` and source nodes all carry
`cardinalityEstimated` (from `metadata()`), `cardinalityReal`, `timeSelf` and `timeLife`.
Report `timeSelf` exclusive of children so the numbers are additive and a reader can find
the expensive operator.

**3c. Make finalisation deterministic.** Give the logger an
`await logger.finalize()` that resolves once every pending measurement has settled, and
call it in `ActorQueryProcessExplainPhysical.run` before serializing. Resolve counters on
`end` *or* `destroy`/`error` so destroyed streams (bind joins) still report, and mark
nodes whose stream was destroyed early as such rather than leaving them blank.

### Phase 4 — Make sources explain themselves

Address §2.3 by extending the query-source contract rather than guessing from outside:

* Add an optional `IQuerySource` capability along the lines of
  `explainQuery?(operation, context): Promise<unknown>` (or reuse a new
  `KeysInitQuery.physicalQueryPlanLogger` read inside sources) so a source can attach its
  own subtree.
* Minimum viable version, no source changes needed: `ActorQueryOperationSource` logs the
  *full operation tree it delegated* (serialized via the existing logical-explain
  renderer) as a `delegatedOperation` node property, plus the source id, the real
  cardinality, and timings from 3b.
* `QuerySourceSparql` / `QuerySourceHypermedia` additionally report the SPARQL query
  string actually sent and the number of HTTP requests made, so a federated plan shows
  what went over the wire.

### Phase 5 — Rendering and repetition

* **Generalise compaction.** Replace the `physical === 'bind'` special case with a
  structural rule: any node whose children contain repeated identical subtrees collapses
  them, regardless of operator. This covers ALP path iterations and `FILTER EXISTS`
  (§2.6) as well as bind joins.
* **Aggregate rather than sample.** A compacted group should report
  `occurrences` plus aggregated statistics (total/min/max/mean `cardinalityReal` and
  time, the set of sources involved), not just `firstOccurrence`.
* **Serialize `actor`** in both outputs (§2.5), and let non-join actors declare a
  `physicalName` so `distinct-hash`, `distinct-identity`, the ALP path algorithms and the
  order-by implementation are identifiable. Actor names are long, so intern them in a
  trailing `actors:` legend like the existing `sources:` legend.
* **Give `EXISTS` and path sub-evaluations their own grouping node** so they are not
  siblings of the operator's real input.

### Phase 6 — Cleanups

* Expand context shortcuts *before* mediating on the query-process bus (in
  `QueryEngineBase.queryOrExplain` or a dedicated pre-step) so that
  `KeysInitQuery.explain` is the only key any actor has to read, and drop the
  `?? context.get(new ActionContextKey('explain'))` fallbacks from all four explain
  actors and `ActorQueryProcessSequential` (§2.7).
* Document that `explain physical` executes the query to completion, including the side
  effects of update queries, and that it therefore ignores lazy consumption (a `LIMIT`
  query is measured as if fully drained).
* Update `documentation`/website explain page with the new fields.

## 4. Compatibility

* `IPhysicalQueryPlanLogger` and `IPhysicalQueryPlanNode` are exported from `@comunica/types`
  and are part of the public API; phase 2a is a breaking change to them. It should land in a
  major release, together with the removal of `isLeaf` from `ActorRdfJoin`.
* `IJoinEntry` is unchanged.
* The `physical-json` output gains fields (`actor`, per-node statistics, aggregated
  compaction) and changes the shape of compacted children. It is a debugging format, but
  the change is visible; worth calling out in the changelog.
* Phase 1 is behaviour-preserving except that it fixes crashes, and can be backported.

## 5. What was done differently

* **Join entries are found by their output, not by a field on `IJoinEntry`** (2b). Adding a
  `physicalPlanNode` field would have changed a public interface for the sake of the plan
  logger; the logger instead remembers which node produced which query operation output, and
  a join looks its entries up by the output it was handed. This works for entries a join
  builds itself, such as the intermediate join of `ActorRdfJoinMultiSmallest`.
* **`includeInLogs` was kept, `isLeaf` was removed** (2c). `isLeaf` only ever shaped the plan
  and is gone; `includeInLogs` still decides whether a join actor appears in the *debug*
  logger, which is a separate concern, and no longer hides an actor from the plan.
* **`unstashChild` was not made to fail loudly in phase 1.** It could not be, since
  `ActorRdfJoinMultiSmallest` legitimately passed it an unknown node until phase 2 removed the
  mechanism. Phase 1 reports the duplicate node keys instead, which is what actually caused the
  silent data loss.
* **`timeSelf` is not exclusive of descendants in the strict sense** (3b). It is the time spent
  in an operator's own output iterator; the iterators it reads from are measured separately, by
  whichever operator produced them. Subtracting nested read times would need a call-stack-aware
  profiler on the hot read path, for a number that is already comparable between operators.
* **Repetition is grouped rather than detected** (5). Compacting every repeated sibling would
  merge things that are not repetitions: the two operands of a union, or a filter's input and
  the per-binding evaluations of its `EXISTS`. Operations that evaluate a sub-operation once per
  binding now say so by grouping those evaluations under a node of their own, and only within
  such a group are repetitions summarized.
* **Non-join actors do not declare a `physicalName`** (5). Serializing the actor name identifies
  the implementation that ran an operation without having to name every actor twice.
* **The explain shortcut is expanded in `QueryEngineBase.queryOrExplain`** (6), rather than by
  running the whole context preprocessing before the query-process bus. The latter would require
  a context-preprocess mediator on the init actor, which is a config-visible change that would
  break existing engine configurations.

## Appendix A — reproductions

All observations above were reproduced against this working tree with an in-memory
`N3.Store` holding five `foaf:Person` subjects, plus a stub SPARQL endpoint for §2.3.
The scripts are not committed; each finding lists the query that triggers it.

| § | Query | Symptom |
| --- | --- | --- |
| 2.1 | `SELECT * WHERE { }`, `SELECT * WHERE { BIND(1 AS ?x) }` | `TypeError: Cannot read properties of undefined (reading 'metadatas')`, normal execution fine |
| 2.2a | 2-pattern BGP with `actors-wrap-stream.json` enabled | join subtree missing |
| 2.2b | 3-pattern BGP | second `hash-def` join shows 1 of 2 inputs |
| 2.2c | `?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f }` | left pattern absent |
| 2.3 | any query over a `type: 'sparql'` source | plan is one line |
| 2.4 | 3-pattern BGP | `multi-smallest` reports `cardinalityReal/timeSelf/timeLife = 0` |
| 2.5 | `?s foaf:knows+ ?o`, `ex:alice foaf:knows? ?o` | indistinguishable `path` chains |
| 2.6 | `?s foaf:name ?n FILTER EXISTS { ?s foaf:knows ?f }` | one child per binding, flattened |
