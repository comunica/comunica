import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as Eval from '@comunica/utils-expression-evaluator';
import { generalEvaluate } from '@comunica/utils-expression-evaluator/test/util/generalEvaluation';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/utils-expression-evaluator/test/util/helpers';
import { DataFactory } from 'rdf-data-factory';
import { ActorFunctionFactoryExpressionBound } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

describe('evaluation of \'bound\'', () => {
  let mediatorFunctionFactory: MediatorFunctionFactory;

  beforeEach(() => {
    mediatorFunctionFactory = createFuncMediator([
      args => new ActorFunctionFactoryExpressionBound(args),
    ], {});
  });

  it('\'bound\' on bounded variable returns true', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory,
      }),
      bindings: BF.bindings([
        [ DF.variable('s'), DF.namedNode('http://example.com') ],
      ]),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('true', DF.namedNode(Eval.TypeURL.XSD_BOOLEAN)));
  });

  it('\'bound\' on unbounded variable returns false', async() => {
    const evaluated = await generalEvaluate({
      expression: 'SELECT * WHERE { ?s ?p ?o FILTER(BOUND(?s))}',
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory,
      }),
    });
    expect(evaluated.asyncResult).toEqual(DF.literal('false', DF.namedNode(Eval.TypeURL.XSD_BOOLEAN)));
  });

  it('\'bound\' on term returns error', async() => {
    const algExpr = AF.createOperatorExpression('bound', [ AF.createTermExpression(DF.namedNode('http://example.com')) ]);
    const evaluator = await getMockEEFactory({
      mediatorFunctionFactory,
    }).run({
      algExpr,
      context: getMockEEActionContext(),
    }, undefined);
    await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Eval.InvalidArgumentTypes);
  });
});
