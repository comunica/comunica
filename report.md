# Review findings left open

From a review of the `feature/expressions-sparql` work. The findings that belonged to that branch are fixed;
these are the ones that reach beyond it and need a separate decision. Ordered by how much they can bite.

## 1. `existenceResolver` is not reachable from a plain query context

`packages/context-entries/lib/Keys.ts` (`KeysExpressionEvaluator.existenceResolver`)

The key works at runtime inside a full engine — a resolver set through it is called and fully replaces the
query-operation path. But the other two user-facing `KeysExpressionEvaluator` keys, `nonLexicalComparison` and
`fullTermComparison`, also appear in `packages/types/lib/IQueryContext.ts:64-65` and in the shortcut map in
`packages/actor-context-preprocess-convert-shortcuts/lib/ActorContextPreprocessConvertShortcuts.ts:87-88`.
`existenceResolver` appears in neither, so `engine.queryBindings(query, { ... })` cannot set it type-safely.

Decide whether it is meant to be a public query-context option at all. If yes, it needs both entries; if no,
the comment on the key should say it is for expression-evaluation embedders rather than query callers.

## 2. Stale npm badges outside the expression-evaluation packages

The badge and install sweep only covered expression-evaluation packages. Six more carry the same defect,
left over from earlier renames:

| package | wrong value |
|---|---|
| `actor-dereference-rdf-parse` | badge says `bus-dereference-rdf` |
| `actor-iterator-transform-record-intermediate-results` | badge, npm link and `yarn add` say `actor-process-iterator-record-intermediate-results` |
| `actor-merge-bindings-context-union` | badge says `actor-merge-binding-factory-context-union` |
| `bus-merge-bindings-context` | badge says `bus-merge-binding-factory` |
| `mediator-combine-pipeline` | badge, npm link and `yarn add` say `mediator-sequential` |
| `mediatortype-httprequests` | badge says `mediatortype-time` |

Every other `packages/*` and `engines/*` README was machine-checked against its `package.json` name; the
remaining mismatches are deliberate cross-references or third-party links.

Related: 35 READMEs link to typedoc pages in the old underscore form (`_comunica_bus_rdf_join`). Typedoc's
`createNormalizedUrl` preserves dashes, so the live URLs are `_comunica_bus-rdf-join` and those links 404.
`packages/bus-query-parse/README.md:25` already uses the correct form.

## 3. Two defects on the website expression evaluator page

`Comunica-website/pages/docs/2_modify/advanced/expression-evaluator.md`

* The Config list links to `#functionArgumentsCache`, but `components/Markdown.js:43` slugifies headings with
  `text.toLowerCase().replace(/\W/g, '-')`, making the real anchor `#functionargumentscache`. The link is dead.
  Every other anchor on the page resolves.
* The BNODE section describes a blank node constructor callback the caller can supply, and `blank_uuid` labels
  generated with uuid v4. `ExpressionFunctionBnode` accepts no such callback and labels nodes
  `strInput ?? BNODE_${counter}` via `BlankNodeBindingsScoped`
  (`packages/actor-function-factory-expression-bnode/lib/ExpressionFunctionBnode.ts:51`). Either restore the
  hook or rewrite the section.

## 4. Filter pushdown can bypass the existence resolver

Inside a full engine the resolver is consulted only where the expression evaluator evaluates the `EXISTS`.
A source whose selector shape accepts a wildcard operation can be handed the whole `FILTER`
(`packages/actor-query-source-identify-hypermedia-sparql/lib/QuerySourceSparql.ts:158-166`), in which case the
endpoint answers the `EXISTS` and the resolver never runs.

Unconfirmed — no end-to-end endpoint reproduction was built. It cannot occur in `@comunica/expressions-sparql`,
which configures no optimizers. Worth confirming before the resolver is documented as authoritative for a
query engine.
