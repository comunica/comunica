# EXISTS without a query operation mediator

`@comunica/expressions-sparql` currently imports `ccqs:config/query-operation/mediators.json` purely so
`ActorExpressionEvaluatorFactoryDefault` and `ActorTermComparatorFactoryExpressionEvaluator` can be constructed.
Its only read in the whole evaluator stack is `InternalEvaluator.ts:78`, inside `evalExistence`.

## What Comunica does today

All of it lives in `@comunica/actor-expression-evaluator-factory-default`.

**Build time — `ActorExpressionEvaluatorFactoryDefault.run` (`:27-43`).** It prepares the context, runs the
algebra through `AlgebraTransformer`, and hands the result to `ExpressionEvaluator` along with the two mediators
and a `BindingsFactory` built from `mediatorMergeBindingsContext` (`:37-41`). `ExpressionEvaluator` immediately
constructs an `InternalEvaluator` (`ExpressionEvaluator.ts:18`) holding all four.

`AlgebraTransformer.transformAlgebra` (`:36-37`) dispatches an `EXISTENCE` sub-type to `transformExistence`
(`:79-80`), which does nothing but wrap the node:

```typescript
export class Existence implements ExistenceExpression {
  public expressionType: ExpressionType.Existence = ExpressionType.Existence;
  public constructor(public expression: Alg.ExistenceExpression) {}
}
```

So the sub-operation is **not** transformed, optimised or prepared at build time — it stays raw algebra, and
everything happens per evaluated binding.

**Evaluation time — `InternalEvaluator.evalExistence` (`:67-97`).** Reached through the `subEvaluators` dispatch
table (`:25`), it is the only place `mediatorQueryOperation` and `bindingsFactory` are used. This is the default
path, reached only when the context carries no resolver (see [Decision](#decision)):

```typescript
private async evalExistence(expr: Eval.Existence, mapping: RDF.Bindings): Promise<Eval.Term> {
  const dataFactory: ComunicaDataFactory = this.context.getSafe(KeysInitQuery.dataFactory);
  const algebraFactory = new AlgebraFactory(dataFactory);                              // per call
  const operation = materializeOperation(expr.expression.input, mapping, algebraFactory, this.bindingsFactory);

  const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context: this.context });
  const output = getSafeBindings(outputRaw);

  return await new Promise<boolean>((resolve, reject) => {
    output.bindingsStream.on('end', () => resolve(false));
    output.bindingsStream.on('error', reject);
    output.bindingsStream.on('data', () => {
      output.bindingsStream.close();       // short-circuit on the first solution
      resolve(true);
    });
  })
    .then(exists => expr.expression.not ? !exists : exists)
    .then(exists => new Eval.BooleanLiteral(exists));
}
```

`materializeOperation` comes from `@comunica/utils-query-operation`
(`lib/MaterializeBindings.ts:53`) and substitutes the current bindings into the sub-operation, recursing through
joins, extends and nested expressions. It is shared with `ActorQueryProcessSequential` (`:94`, initial bindings)
and `ActorRdfJoinMultiBind` (`:84`, bind join) — this is not evaluator-specific machinery.

Three consequences worth keeping in mind for either option below:

* Cost is **per binding**: one `AlgebraFactory`, one materialization and one full query-operation mediation for
  every binding the expression is evaluated against. The stream is closed on the first solution, so it is not a
  full evaluation of the sub-query, but the planning is redone each time.
* The `not` inversion (`:95`) is the evaluator's job on this path, not the query operation's — `EXISTS` and
  `NOT EXISTS` reach the mediator as the same operation.
* `bindingsFactory` exists on `InternalEvaluator` *solely* to feed `materializeOperation`, which means it is
  EXISTS-only too, exactly like `mediatorQueryOperation`.

## What sparqlee did

The hook sat on the evaluator context, and the evaluator owned none of the logic:

```typescript
// ICompleteAsyncEvaluatorContext
exists?: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;

// AsyncRecursiveEvaluator
private async evalExistence(expr: E.Existence, mapping: RDF.Bindings): Promise<E.Term> {
  if (!this.context.exists) {
    throw new Err.NoExistenceHook();
  }
  return new E.BooleanLiteral(await this.context.exists(expr.expression, mapping));
}
```

Comunica supplied it from `ActorQueryOperation.createExistenceResolver(context, mediatorQueryOperation)`
(see `3824d4536~1`), whose body is character-for-character today's `evalExistence`: `materializeOperation` →
`mediate` → resolve `true` on the first binding → apply `expr.not`. So the hook owned both materialization
and the `not` inversion.

Two leftovers of that era are still in the tree: the unused `IBaseExpressionContext` / `ISyncExpressionContext` /
`IAsyncExpressionContext` types (now marked `TODO (next major): remove`), and `NoAggregator`, whose message
still reads *"but no aggregate hook provided"*.

## The mechanic that makes an actor possible

`BusQueryOperation` is a `BusIndexed` keyed on `operationName`, but its `publish` is:

```typescript
const actors = [ ...this.actorsIndex[actionId] || [], ...this.actorsIndex._undefined_ || [] ];
```

`operationName` is set by `ActorQueryOperationTyped`, not by `ActorQueryOperation`. A plain `ActorQueryOperation`
subclass therefore lands in `_undefined_` and receives **every** operation — a catch-all adapter needs no tricks.

---

## Option A — adapter actor behind the existing mediator

A catch-all `ActorQueryOperation` in `engines/expressions-sparql` that turns a boolean callback into a
0-or-1-binding stream. `evalExistence` only waits for the first `data` event, so the stream is all it reads.

```typescript
export class ActorQueryOperationExistenceCallback extends ActorQueryOperation {
  public async test(action: IActionQueryOperation): Promise<TestResult<IActorTest>> {
    if (!action.context.has(KeysExpressionEvaluator.existenceCallback)) {
      return failTest('EXISTS requires an existenceCallback in the context');
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    const callback = action.context.getSafe(KeysExpressionEvaluator.existenceCallback);
    const exists = await callback(action.operation, action.context);
    return {
      type: 'bindings',
      bindingsStream: new ArrayIterator(exists ? [ BF.bindings() ] : [], { autoStart: false }),
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: exists ? 1 : 0 },
        variables: [],
      }),
    };
  }
}
```

Registered in the engine's own `config/config-default.json`, next to `ActorInitExpressions`:

```json
{
  "@id": "urn:comunica:default:query-operation/actors#existence-callback",
  "@type": "ActorQueryOperationExistenceCallback"
}
```

Caller side:

```typescript
const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysExpressionEvaluator.existenceCallback.name]:
    async(operation: Algebra.Operation) => myStore.ask(operation),
}));
```

**Touches:** the new engine only.
**Does not remove** the `query-operation/mediators.json` import or the `@comunica/bus-query-operation` and
`@comunica/mediator-number` dependencies — the adapter sits *behind* the mediator, it does not replace it.
It does replace *"No actors are able to reply to a message in the bus…"* with a real message.

---

## Option B — context hook in the evaluator

The sparqlee shape, restored in the one place that needs it:

```typescript
// packages/context-entries/lib/Keys.ts — KeysExpressionEvaluator
existenceResolver: new ActionContextKey<ExistenceResolver>(
  '@comunica/utils-expression-evaluator:existenceResolver',
),
```

```typescript
// InternalEvaluator
private async evalExistence(expr: Eval.Existence, mapping: RDF.Bindings): Promise<Eval.Term> {
  const dataFactory: ComunicaDataFactory = this.context.getSafe(KeysInitQuery.dataFactory);
  const algebraFactory = new AlgebraFactory(dataFactory);
  const operation = materializeOperation(expr.expression.input, mapping, algebraFactory, this.bindingsFactory);

  const resolver = this.context.get(KeysExpressionEvaluator.existenceResolver);
  let exists: boolean;
  if (resolver) {
    exists = await resolver(operation, this.context);
  } else if (this.mediatorQueryOperation) {
    exists = await this.existenceFromQueryOperation(operation);
  } else {
    throw new Eval.NoExistenceHook();
  }

  return new Eval.BooleanLiteral(expr.expression.not ? !exists : exists);
}
```

The mediator then becomes optional on both buses, which is what lets the config import go:

```typescript
// bus-expression-evaluator-factory, and identically bus-term-comparator-factory
export interface IActorExpressionEvaluatorFactoryArgs<TS = undefined> extends IActorArgs<...> {
  /**
   * Required to evaluate EXISTS, unless a KeysExpressionEvaluator.existenceResolver is in the context.
   */
  mediatorQueryOperation?: MediatorQueryOperation;
  ...
}
```

Caller side:

```typescript
const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysExpressionEvaluator.existenceResolver.name]:
    async(operation: Algebra.Operation) => myStore.ask(operation),
}));
```

**Touches:** `context-entries`, `utils-expression-evaluator` (new error), `bus-expression-evaluator-factory`,
`bus-term-comparator-factory`, their two default actors, regenerated components, and
`config-expressions.json`. Full engines keep passing the mediator, so their configs are untouched and
`test:config-compat` stays green — `config-expressions.json` is a new config type with no engine history to
test against.

---

## Comparison

| | Option A — adapter actor | Option B — context hook |
|---|---|---|
| Drops `query-operation/mediators.json` | no | yes |
| Drops `bus-query-operation` + `mediator-number` deps | no | yes |
| Public API change | none | `mediatorQueryOperation` becomes optional on 2 buses |
| Blast radius | new engine only | 6 packages + components |
| Useful error on missing hook | yes | yes |
| Extra machinery | fake bindings stream + metadata | none |

The weight argument is weak either way: `bus-query-operation` has 6 dependencies, all already present, and pulls
in **no** query-operation actors. The real question is whether *"a standalone expression engine requires a query
operation mediator"* is acceptable in the public shape of the package.

## Decision

**Neither option as written.** Option A cannot satisfy signature (b): the adapter actor is only reached at
`InternalEvaluator.ts:78`, *after* `materializeOperation` has already run at `:76`, so it can never see the raw
`ExistenceExpression` and the bindings, nor skip the materialization before failing. Forking `ExpressionEvaluator`
and `InternalEvaluator` into the engine to get in front of that is the only pure-engine alternative
(`subEvaluators` and `internalEvaluator` are both `private readonly` and field-initialised), which means ~130
lines of copied core.

What was implemented instead is Option B reduced to its seam: a context key plus one branch, with everything
else living in the engine. The mediator stays required, the two buses are untouched, and
`config-expressions.json` keeps its `query-operation/mediators.json` import.

```typescript
// packages/types — the hook, matching sparqlee's shape
export type ExistenceResolver = (
  expression: Algebra.ExistenceExpression,
  mapping: RDF.Bindings,
) => Promise<boolean>;

// InternalEvaluator.evalExistence — first lines, rest unchanged
const existenceResolver = this.context.get(KeysExpressionEvaluator.existenceResolver);
if (existenceResolver) {
  return new Eval.BooleanLiteral(await existenceResolver(expr.expression, mapping));
}
```

The resolver owns `expression.not` and any materialization it wants, exactly as sparqlee's `exists` hook did —
the expression carries `not`, so it is visibly the callback's business. `materializeOperation` is exported from
`@comunica/utils-query-operation` for callers that want it.

Failing fast lives in the engine rather than in core, so nothing is computed before the throw:

```typescript
// ExpressionEngine.prepareContext
.setDefault(KeysExpressionEvaluator.existenceResolver, unsupportedExistence)
```

`unsupportedExistence` throws a plain `Error`, which propagates as a programmer error. A caller who throws an
`ExpressionError` from their own resolver gets SPARQL semantics instead — `isExpressionError` is
`error instanceof ExpressionError`, so `FILTER` logs and drops the bindings rather than failing the query. That
`instanceof` requires the class to come from the same `@comunica/utils-expression-evaluator` instance.

**Touched:** `packages/types` (one type), `packages/context-entries` (one key),
`packages/actor-expression-evaluator-factory-default` (one branch, three tests), and
`engines/expressions-sparql` (default resolver, four tests, README).
