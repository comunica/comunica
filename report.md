# Review findings left open

From a review of the `feature/expressions-sparql` work. Everything else in this report has been addressed.

## 1. Filter pushdown can bypass the existence resolver

Inside a full engine the resolver is consulted only where the expression evaluator evaluates the `EXISTS`.
A source whose selector shape accepts a wildcard operation can be handed the whole `FILTER`
(`packages/actor-query-source-identify-hypermedia-sparql/lib/QuerySourceSparql.ts:158-166`), in which case the
endpoint answers the `EXISTS` and the resolver never runs.

Unconfirmed — no end-to-end endpoint reproduction was built. It cannot occur in `@comunica/expressions-sparql`,
which configures no optimizers. Worth confirming before the resolver is documented as authoritative for a
query engine.
