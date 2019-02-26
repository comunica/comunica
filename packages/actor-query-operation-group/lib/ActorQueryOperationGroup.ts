import { ArrayIterator } from 'asynciterator';
import { Iterable, List, Map, Seq, Set } from "immutable";
import { termToString } from 'rdf-string';
import { Algebra } from "sparqlalgebrajs";

// tslint:disable-next-line:no-var-requires
const arrayifyStream = require('arrayify-stream');

import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { BindingsStream } from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'group');
  }

  public async testOperation(pattern: Algebra.Group, context: ActionContext): Promise<IActorTest> {
    return pattern.type === 'group';
  }

  public async runOperation(pattern: Algebra.Group, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const { input, aggregates } = pattern;

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);
    ActorQueryOperation.validateQueryOutput(output, 'bindings');

    // The variables in scope are the variables on which we group, e.g. pattern.variables
    // for GROUP BY ?x, ?z, this is [?x, ?z], for GROUP by expr(?x) as ?e this is [?e].
    // But also in scope are the variables defined by the aggregations, since GROUP has to handle this
    const variables = pattern.variables
      .map((variable) => termToString(variable))
      .concat(aggregates.map((agg) => termToString(agg.variable)));

    // Consume the whole stream
    const bindingsArray: Bindings[] = await arrayifyStream(output.bindingsStream);

    // TODO: Can be empty (test behaviour) when implicit group by
    // TODO: We need to know what SELECT * WHERE {?x ?y ?z} GROUP BY str(?x) looks like
    // either it's in pattern.variables or it is not
    const patternVariables = Set(pattern.variables.map((v) => termToString(v)));

    // Group by subset of keys defined in pattern.variables
    const groups: Seq.Keyed<Bindings, Iterable<number, Bindings>> = List(bindingsArray)
      .groupBy<Bindings>((bindings) => {
        return bindings
          .filter((v, key) => patternVariables.has(key))
          .toMap();
      });

    // Aggregate each group with each aggregator and bind the result
    const rows: Bindings[] = groups.map((group, groupKey) => {
      let bindings: Bindings = Map(groupKey);
      aggregates.forEach((aggregate) => {
        // TODO
        // TODO: This might not reach the actual expression actors later on
        // this.mediatorQueryOperation.mediate(aggregate)
        bindings = Bindings({});
      });
      return bindings;
    }).toArray();

    const bindingsStream = new ArrayIterator(rows);
    const metadata = output.metadata;
    return { type: 'bindings', bindingsStream, metadata, variables };
  }

}
