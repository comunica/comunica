// tslint:disable:object-literal-sort-keys
// tslint:disable:max-classes-per-file

import * as RDFDM from '@rdfjs/data-model';
import { Set } from 'immutable';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

export function createAggregator(expr: Algebra.BoundAggregate): BaseAggregator<any> {
  const aggregator = expr.aggregator as Aggregator;
  return new aggregators[aggregator](expr);
}

export abstract class BaseAggregator<State> {
  protected state: State;

  constructor(expr: Algebra.BoundAggregate) {
    this.state = this.init();
  }

  public abstract init(): State;

  public abstract result(): RDF.Term;

  public put(term: RDF.Term): void {
    try {
      this._put(term);
      // If any term errors, the corresponding aggregate variable should be unbound
      // This is done by setting the result to be undefined
    } catch (err) {
      this.put = () => { return; };
      this.result = () => undefined;
    }
  }

  protected abstract _put(term: RDF.Term): void;

}

enum Aggregator {
  COUNT = 'count',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  AVG = 'avg',
  GROUP_CONCAT = 'groupConcat',
  SAMPLE = 'sample',
}

class Count extends BaseAggregator<number> {
  public init(): number {
    return 0;
  }

  public result(): RDF.Term {
    return int(this.state);
  }

  protected _put(term: RDF.Term): void {
    this.state += 1;
  }
}

// TODO: Type preservation of numeric type
class Sum extends BaseAggregator<number> {
  public init(): number {
    return 0;
  }

  public result(): RDF.Term {
    return float(this.state);
  }

  protected _put(term: RDF.Term): void {
    const value = extractNumericValueOrError(term);
    this.state += value;
  }
}

// // TODO: Type preservation
// const min: IAggregator<[number, number]> = {
//   init(): [number, number] { return [Infinity, 0]; },
//   iter([minimum, counter]: [number, number], term: RDF.Term): [number, number] {
//     const value = extractNumericValueOrError(term);
//     return [Math.min(minimum, value), counter + 1];
//   },
//   result([minimum, counter]: [number, number]): RDF.Term {
//     if (counter === 0) {
//       throw new Error("Aggregate on empty group");
//     }
//     return float(minimum);
//   },
// };

class Min extends BaseAggregator<number> {
  public init(): number {
    throw new Error("Method not implemented.");
  } public _put(term: RDF.Term): void {
    throw new Error("Method not implemented.");
  }
  public result(): RDF.Term {
    throw new Error("Method not implemented.");
  }
}

// // TODO: Type preservation
// const max: IAggregator<[number, number]> = {
//   init(): [number, number] { return [-Infinity, 0]; },
//   iter([minimum, counter]: [number, number], term: RDF.Term): [number, number] {
//     const value = extractNumericValueOrError(term);
//     return [Math.max(minimum, value), counter + 1];
//   },
//   result([minimum, counter]: [number, number]): RDF.Term {
//     if (counter === 0) {
//       throw new Error("Aggregate on empty group");
//     }
//     return float(minimum);
//   },
// };
class Max extends BaseAggregator<number> {
  public init(): number {
    throw new Error("Method not implemented.");
  } public _put(term: RDF.Term): void {
    throw new Error("Method not implemented.");
  }
  public result(): RDF.Term {
    throw new Error("Method not implemented.");
  }
}

class Average extends BaseAggregator<number> {
  public init(): number {
    throw new Error("Method not implemented.");
  } public _put(term: RDF.Term): void {
    throw new Error("Method not implemented.");
  }
  public result(): RDF.Term {
    throw new Error("Method not implemented.");
  }
}

class GroupConcat extends BaseAggregator<string> {
  public init(): string {
    throw new Error("Method not implemented.");
  } public _put(term: RDF.Term): void {
    throw new Error("Method not implemented.");
  }
  public result(): RDF.Term {
    throw new Error("Method not implemented.");
  }
}

class Sample extends BaseAggregator<RDF.Term> {
  public init(): RDF.Term {
    throw new Error("Method not implemented.");
  } public _put(term: RDF.Term): void {
    throw new Error("Method not implemented.");
  }
  public result(): RDF.Term {
    throw new Error("Method not implemented.");
  }
}

const aggregators: {
  [key in Aggregator]: new (expr: Algebra.BoundAggregate) => BaseAggregator<any>
} = {
  count: Count,
  sum: Sum,
  min: Min,
  max: Max,
  avg: Average,
  groupConcat: GroupConcat,
  sample: Sample,
};

// enum Aggregators {
//   COUNT = 'count',
//   SUM = 'sum',
//   MIN = 'min',
//   MAX = 'max',
//   // AVG = 'avg',
//   // GROUP_CONCAT = 'groupConcat',
//   // SAMPLE = 'sample',
// }

// export const aggregators: { [key in Aggregators]: IAggregator<any> } = {
//   count,
//   sum,
//   min,
//   max,
// };

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

// /**
//  * A comunica Aggregate Query Operation Expression Actor.
//  */
// export class ActorQueryOperationExpressionAggregate extends ActorQueryOperationExpression<RDF.Term> {

//   constructor(args: IActorQueryOperationExpressionArgs<RDF.Term>) {
//     super(args, 'aggregate');
//   }

// public async run(action: IActionQueryOperationExpression): Promise<IActorQueryOperationExpressionOutput<RDF.Term>> {
//     const aggregateExpression = action.expression as Algebra.AggregateExpression;
//     const { aggregator, distinct, expression, separator, variable } = aggregateExpression;
//     const { bindingsStream } = action.operationOutputBindings;

//     const evaluator = new SimpleEvaluator(expression);

//     // TODO: Check if mediatorquery exists;

//     // TODO: Check if exists
//     const aggregate = aggregators[aggregator as Aggregators];

//     // TODO: Handle distinct
//     let state = aggregate.init(separator);

//     return new Promise<IActorQueryOperationExpressionOutput<RDF.Term>>(
//       (resolve, reject) => {
//         bindingsStream.on("end", () =>
//           resolve({ result: aggregate.result(state) }));

//         bindingsStream.on("error", (err) => reject(err));

//         bindingsStream.each((bindings: Bindings) => {
//           const result = evaluator.evaluate(bindings);
//           state = aggregate.iter(state, result);
//         });
//       });
//   }

// }
