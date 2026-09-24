import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  containsCallerResolvedExistence,
  isExistenceWithinService,
  markExistenceWithinService,
} from '../lib/Existence';

const AF = new AlgebraFactory();

describe('Existence', () => {
  describe('#containsCallerResolvedExistence', () => {
    const pattern = AF.createPattern(
      AF.dataFactory.variable!('s'),
      AF.dataFactory.namedNode('ex:p'),
      AF.dataFactory.variable!('o'),
    );
    const existenceFilter = AF.createFilter(
      pattern,
      AF.createExistenceExpression(false, pattern),
    );

    it('returns false without an existence resolver in the context', () => {
      expect(containsCallerResolvedExistence(existenceFilter, new ActionContext())).toBeFalsy();
    });

    it('returns false for an operation without existence expressions', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const filter = AF.createFilter(
        pattern,
        AF.createTermExpression(AF.dataFactory.variable!('o')),
      );
      expect(containsCallerResolvedExistence(filter, context)).toBeFalsy();
      expect(containsCallerResolvedExistence(pattern, context)).toBeFalsy();
    });

    it('returns true for an operation containing an existence expression', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      expect(containsCallerResolvedExistence(existenceFilter, context)).toBeTruthy();
      expect(containsCallerResolvedExistence(AF.createProject(existenceFilter, []), context)).toBeTruthy();
    });

    it('returns true for an existence expression in any expression of an operation', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const existence = AF.createExistenceExpression(true, pattern);
      const variable = AF.dataFactory.variable!('v');
      const operations = [
        AF.createExtend(pattern, variable, existence),
        AF.createOrderBy(pattern, [ existence ]),
        AF.createLeftJoin(pattern, pattern, existence),
        AF.createGroup(pattern, [], [ AF.createBoundAggregate(variable, 'sum', AF.createOperatorExpression('if', [
          existence,
          AF.createTermExpression(AF.dataFactory.literal('1')),
          AF.createTermExpression(AF.dataFactory.literal('0')),
        ]), false) ]),
        AF.createFilter(pattern, AF.createOperatorExpression('!', [ existence ])),
        AF.createFilter(pattern, AF.createOperatorExpression('||', [
          AF.createTermExpression(AF.dataFactory.variable!('o')),
          existence,
        ])),
      ];
      for (const operation of operations) {
        expect(containsCallerResolvedExistence(operation, context)).toBeTruthy();
      }
    });

    it('returns false for an existence expression in the body of a SERVICE clause', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const service = AF.createService(existenceFilter, AF.dataFactory.namedNode('ex:service'));
      expect(containsCallerResolvedExistence(service, context)).toBeFalsy();
      expect(containsCallerResolvedExistence(AF.createJoin([ pattern, service ]), context)).toBeFalsy();
      const filter = AF.createFilter(service, AF.createExistenceExpression(false, pattern));
      expect(containsCallerResolvedExistence(filter, context)).toBeTruthy();
    });

    it('returns false for an existence expression marked as from the body of a SERVICE clause', () => {
      const context = new ActionContext({
        [KeysExpressionEvaluator.existenceResolver.name]: async() => true,
      });
      const marked = markExistenceWithinService(AF.createExistenceExpression(false, existenceFilter));
      expect(containsCallerResolvedExistence(AF.createFilter(pattern, marked), context)).toBeFalsy();
      expect(containsCallerResolvedExistence(AF.createFilter(existenceFilter, marked), context)).toBeTruthy();
    });
  });

  describe('#markExistenceWithinService', () => {
    it('marks a copy of the expression', () => {
      const pattern = AF.createPattern(
        AF.dataFactory.variable!('s'),
        AF.dataFactory.namedNode('ex:p'),
        AF.dataFactory.variable!('o'),
      );
      const expression = Object.assign(AF.createExistenceExpression(true, pattern), { metadata: { other: true }});
      expect(markExistenceWithinService(expression)).toEqual({
        ...expression,
        metadata: { other: true, withinService: true },
      });
      expect(expression.metadata).toEqual({ other: true });
    });
  });

  describe('#isExistenceWithinService', () => {
    it('only holds for marked expressions', () => {
      const expression = AF.createExistenceExpression(false, AF.createNop());
      expect(isExistenceWithinService(expression)).toBeFalsy();
      expect(isExistenceWithinService(markExistenceWithinService(expression))).toBeTruthy();
    });
  });
});
