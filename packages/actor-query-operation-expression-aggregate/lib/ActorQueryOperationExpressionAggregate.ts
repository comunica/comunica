// tslint:disable:object-literal-sort-keys
import * as RDFDM from '@rdfjs/data-model';
import { Set } from 'immutable';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';
import { SimpleEvaluator } from 'sparqlee';

import { Bindings } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationExpression,
  IActionQueryOperationExpression,
  IActorQueryOperationExpressionArgs,
  IActorQueryOperationExpressionOutput,
} from "@comunica/bus-query-operation-expression";

/**
 * A comunica Aggregate Query Operation Expression Actor.
 */
export class ActorQueryOperationExpressionAggregate extends ActorQueryOperationExpression<RDF.Term> {

  constructor(args: IActorQueryOperationExpressionArgs<RDF.Term>) {
    super(args, 'aggregate');
  }

  public async run(action: IActionQueryOperationExpression): Promise<IActorQueryOperationExpressionOutput<RDF.Term>> {
    const aggregateExpression = action.expression as Algebra.AggregateExpression;
    const { aggregator, distinct, expression, separator, variable } = aggregateExpression;
    const { bindingsStream } = action.operationOutputBindings;

    const evaluator = new SimpleEvaluator(expression);

    // TODO: Check if mediatorquery exists;

    // TODO: Check if exists
    const aggregate = aggregators[aggregator as Aggregator];

    // TODO: Handle distinct
    let state = aggregate.init(separator);

    return new Promise<IActorQueryOperationExpressionOutput<RDF.Term>>(
      (resolve, reject) => {
        bindingsStream.on("end", () =>
          resolve({ result: aggregate.result(state) }));

        bindingsStream.on("error", (err) => reject(err));

        bindingsStream.each((bindings: Bindings) => {
          const result = evaluator.evaluate(bindings);
          state = aggregate.iter(state, result);
        });
      });
  }

}

interface IAggregator<State> {
  init(separator?: string): State;
  iter(state: State, term: RDF.Term): State;
  result(state: State): RDF.Term;
}

const count: IAggregator<number> = {
  init(): number { return 0; },
  iter(state: number, term: RDF.Term): number {
    return state + 1;
  },
  result(state: number): RDF.Term { return int(state); },
};

// TODO: Type preservation
const sum: IAggregator<number> = {
  init(): number { return 0; },
  iter(state: number, term: RDF.Term): number {
    const value = extractNumericValueOrError(term);
    return state + value;
  },
  result(state: number): RDF.Term { return float(state); },
};

// TODO: Type preservation
const min: IAggregator<[number, number]> = {
  init(): [number, number] { return [Infinity, 0]; },
  iter([minimum, counter]: [number, number], term: RDF.Term): [number, number] {
    const value = extractNumericValueOrError(term);
    return [Math.min(minimum, value), counter + 1];
  },
  result([minimum, counter]: [number, number]): RDF.Term {
    if (counter === 0) {
      throw new Error("Aggregate on empty group");
    }
    return float(minimum);
  },
};

// TODO: Type preservation
const max: IAggregator<[number, number]> = {
  init(): [number, number] { return [-Infinity, 0]; },
  iter([minimum, counter]: [number, number], term: RDF.Term): [number, number] {
    const value = extractNumericValueOrError(term);
    return [Math.max(minimum, value), counter + 1];
  },
  result([minimum, counter]: [number, number]): RDF.Term {
    if (counter === 0) {
      throw new Error("Aggregate on empty group");
    }
    return float(minimum);
  },
};

enum Aggregator {
  COUNT = 'count',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  // AVG = 'avg',
  // GROUP_CONCAT = 'groupConcat',
  // SAMPLE = 'sample',
}

const aggregators: { [key in Aggregator]: IAggregator<any> } = {
  count,
  sum,
  min,
  max,
};

function int(value: number): RDF.Literal {
  return RDFDM.literal(value.toString(), RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

function float(value: number): RDF.Literal {
  return RDFDM.literal(value.toString(), RDFDM.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

function extractNumericValueOrError(term: RDF.Term): number {
  // TODO: Check behaviour
  if (
    term.termType !== 'Literal'
    || !numericTypes.contains(term.datatype.value)
  ) {
    throw new Error("Term is not numeric");
  }
  return parseFloat(term.value);
}

const numericTypes = Set([
  'http://www.w3.org/2001/XMLSchema#integer',
  'http://www.w3.org/2001/XMLSchema#decimal',
  'http://www.w3.org/2001/XMLSchema#float',
  'http://www.w3.org/2001/XMLSchema#double',

  // Derived numeric types
  'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
  'http://www.w3.org/2001/XMLSchema#negativeInteger',
  'http://www.w3.org/2001/XMLSchema#long',
  'http://www.w3.org/2001/XMLSchema#int',
  'http://www.w3.org/2001/XMLSchema#short',
  'http://www.w3.org/2001/XMLSchema#byte',
  'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
  'http://www.w3.org/2001/XMLSchema#unsignedLong',
  'http://www.w3.org/2001/XMLSchema#unsignedInt',
  'http://www.w3.org/2001/XMLSchema#unsignedShort',
  'http://www.w3.org/2001/XMLSchema#unsignedByte',
  'http://www.w3.org/2001/XMLSchema#positiveInteger',
]);
