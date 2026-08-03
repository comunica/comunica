import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggregator-factory';
import type { ComunicaDataFactory, IExpressionEvaluator } from '@comunica/types';
import * as Eval from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class GroupConcatAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: string | undefined = undefined;
  private readonly separator: string;

  public constructor(
    evaluator: IExpressionEvaluator,
    distinct: boolean,
    private readonly dataFactory: ComunicaDataFactory,
    separator?: string,
    throwError?: boolean,
  ) {
    super(evaluator, distinct, throwError);
    this.separator = separator ?? ' ';
  }

  public override emptyValueTerm(): RDF.Term {
    return Eval.typedLiteral('', Eval.TypeURL.XSD_STRING);
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
    } else {
      this.state += this.separator + term.value;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return Eval.typedLiteral(this.state, Eval.TypeURL.XSD_STRING);
  }
}
