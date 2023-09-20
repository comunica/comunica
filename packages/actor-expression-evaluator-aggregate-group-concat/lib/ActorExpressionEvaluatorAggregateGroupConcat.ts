import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { string } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Group Concat Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateGroupConcat extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    if (action.expr.aggregator !== 'group_concat') {
      throw new Error('This actor only supports the \'group_concat\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new GroupConcatAggregator(action.factory.createEvaluator(action.expr, action.context)),
    };
  }
}

class GroupConcatAggregator extends AggregateEvaluator {
  private state: string | undefined = undefined;
  private readonly separator: string;

  public constructor(evaluator: ExpressionEvaluator, throwError?: boolean) {
    super(evaluator, throwError);
    this.separator = evaluator.algExpr.separator || ' ';
  }

  public emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
    } else {
      this.state += this.separator + term.value;
    }
  }

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return string(this.state).toRDF();
  }
}
