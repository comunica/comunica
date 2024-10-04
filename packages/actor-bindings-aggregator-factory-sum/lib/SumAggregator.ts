import { AggregateEvaluator } from '@comunica/bus-bindings-aggregator-factory';
import type { ITermFunction } from '@comunica/bus-function-factory';
import type { NumericLiteral } from '../../utils-expression-evaluator';
import { typedLiteral, TypeURL } from '../../utils-expression-evaluator';
import type { ComunicaDataFactory, IExpressionEvaluator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

type SumState = NumericLiteral;

export class SumAggregator extends AggregateEvaluator {
  private state: SumState | undefined = undefined;

  public constructor(
    evaluator: IExpressionEvaluator,
    distinct: boolean,
    private readonly dataFactory: ComunicaDataFactory,
    private readonly additionFunction: ITermFunction,
    throwError?: boolean,
  ) {
    super(evaluator, distinct, throwError);
  }

  public override emptyValueTerm(): RDF.Term {
    return typedLiteral('0', TypeURL.XSD_INTEGER);
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = this.termToNumericOrError(term);
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state = <NumericLiteral> this.additionFunction.applyOnTerms([ this.state, internalTerm ], this.evaluator);
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state.toRDF(this.dataFactory);
  }
}
