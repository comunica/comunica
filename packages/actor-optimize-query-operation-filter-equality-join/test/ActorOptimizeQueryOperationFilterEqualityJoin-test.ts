import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationFilterEqualityJoin } from '../lib';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

const KEY = ActorOptimizeQueryOperationFilterEqualityJoin.KEY_VARIABLE_PREFIX;

function pattern(s: string, o: string): Algebra.Pattern {
  return AF.createPattern(DF.variable(s), DF.namedNode(`ex:${s}${o}`), DF.variable(o));
}

function variable(name: string): Algebra.Expression {
  return AF.createTermExpression(DF.variable(name));
}

function str(name: string): Algebra.Expression {
  return AF.createOperatorExpression('str', [ variable(name) ]);
}

function strEquals(left: string, right: string): Algebra.Expression {
  return AF.createOperatorExpression('=', [ str(left), str(right) ]);
}

describe('ActorOptimizeQueryOperationFilterEqualityJoin', () => {
  let bus: any;
  let actor: ActorOptimizeQueryOperationFilterEqualityJoin;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorOptimizeQueryOperationFilterEqualityJoin({ name: 'actor', bus });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  async function optimize(operation: Algebra.Operation): Promise<Algebra.Operation> {
    return (await actor.run({ operation, context })).operation;
  }

  it('should test', async() => {
    await expect(actor.test({ operation: AF.createNop(), context })).resolves.toPassTestVoid();
  });

  describe('run', () => {
    it('does not change operations without filters', async() => {
      const operation = AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]);
      const result = await actor.run({ operation, context });
      expect(result.operation).toBe(operation);
      expect(result.context).toBe(context);
    });

    it('joins two entries on an equality of STR calls', async() => {
      const left = pattern('a', 'x');
      const right = pattern('b', 'y');
      const expression = strEquals('x', 'y');
      await expect(optimize(AF.createFilter(AF.createJoin([ left, right ]), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(left, DF.variable(`${KEY}0`), str('x')),
            AF.createExtend(right, DF.variable(`${KEY}0`), str('y')),
          ], false), expression),
          [ DF.variable('a'), DF.variable('x'), DF.variable('b'), DF.variable('y') ],
        ),
      );
    });

    it('joins two entries on an equality of STR calls in reverse order', async() => {
      const left = pattern('a', 'x');
      const right = pattern('b', 'y');
      const expression = strEquals('y', 'x');
      await expect(optimize(AF.createFilter(AF.createJoin([ left, right ]), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(left, DF.variable(`${KEY}0`), str('x')),
            AF.createExtend(right, DF.variable(`${KEY}0`), str('y')),
          ], false), expression),
          [ DF.variable('a'), DF.variable('x'), DF.variable('b'), DF.variable('y') ],
        ),
      );
    });

    it('joins two entries on a sameTerm call', async() => {
      const left = pattern('a', 'x');
      const right = pattern('b', 'y');
      const expression = AF.createOperatorExpression('sameterm', [ variable('x'), variable('y') ]);
      await expect(optimize(AF.createFilter(AF.createJoin([ left, right ]), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(left, DF.variable(`${KEY}0`), variable('x')),
            AF.createExtend(right, DF.variable(`${KEY}0`), variable('y')),
          ], false), expression),
          [ DF.variable('a'), DF.variable('x'), DF.variable('b'), DF.variable('y') ],
        ),
      );
    });

    it('joins on an equality in a conjunction, and keeps the whole filter', async() => {
      const left = pattern('a', 'x');
      const right = pattern('b', 'y');
      const expression = AF.createOperatorExpression('&&', [
        AF.createOperatorExpression('!=', [ variable('a'), variable('b') ]),
        strEquals('x', 'y'),
      ]);
      await expect(optimize(AF.createFilter(AF.createJoin([ left, right ]), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(left, DF.variable(`${KEY}0`), str('x')),
            AF.createExtend(right, DF.variable(`${KEY}0`), str('y')),
          ], false), expression),
          [ DF.variable('a'), DF.variable('x'), DF.variable('b'), DF.variable('y') ],
        ),
      );
    });

    it('joins three entries on two equalities', async() => {
      const entries = [ pattern('a', 'x'), pattern('b', 'y'), pattern('c', 'z') ];
      const expression = AF.createOperatorExpression('&&', [ strEquals('x', 'y'), strEquals('z', 'y') ]);
      await expect(optimize(AF.createFilter(AF.createJoin(entries), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(entries[0], DF.variable(`${KEY}0`), str('x')),
            AF.createExtend(
              AF.createExtend(entries[1], DF.variable(`${KEY}0`), str('y')),
              DF.variable(`${KEY}1`),
              str('y'),
            ),
            AF.createExtend(entries[2], DF.variable(`${KEY}1`), str('z')),
          ], false), expression),
          [ 'a', 'x', 'b', 'y', 'c', 'z' ].map(name => DF.variable(name)),
        ),
      );
    });

    it('joins two entries once for two equalities between them', async() => {
      const left = AF.createJoin([ pattern('a', 'x'), pattern('a', 'v') ]);
      const right = AF.createJoin([ pattern('b', 'y'), pattern('b', 'w') ]);
      const expression = AF.createOperatorExpression('&&', [ strEquals('x', 'y'), strEquals('v', 'w') ]);
      await expect(optimize(AF.createFilter(AF.createJoin([ left, right ], false), expression))).resolves.toEqual(
        AF.createProject(
          AF.createFilter(AF.createJoin([
            AF.createExtend(left, DF.variable(`${KEY}0`), str('x')),
            AF.createExtend(right, DF.variable(`${KEY}0`), str('y')),
          ], false), expression),
          [ 'a', 'x', 'v', 'b', 'y', 'w' ].map(name => DF.variable(name)),
        ),
      );
    });

    it('uses a key variable that does not occur in the query', async() => {
      const left = pattern('a', `${KEY}0`);
      const right = pattern('b', 'y');
      const expression = strEquals(`${KEY}0`, 'y');
      const result = <Algebra.Project> await optimize(AF.createFilter(AF.createJoin([ left, right ]), expression));
      expect((<Algebra.Extend> (<Algebra.Join> (<Algebra.Filter> result.input).input).input[0]).variable)
        .toEqual(DF.variable(`${KEY}1`));
    });

    it('keeps the metadata of the filter', async() => {
      const filter: Algebra.Operation = AF
        .createFilter(AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]), strEquals('x', 'y'));
      filter.metadata = { custom: true };
      const result = <Algebra.Project> await optimize(filter);
      expect(result.input.metadata).toEqual({ custom: true });
    });

    it('joins on equalities in nested filters', async() => {
      const inner = AF.createFilter(AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]), strEquals('x', 'y'));
      const operation = AF.createFilter(AF.createJoin([ inner, pattern('c', 'z') ], false), strEquals('z', 'x'));
      const result = <Algebra.Project> await optimize(operation);
      const join = <Algebra.Join> (<Algebra.Filter> result.input).input;
      expect(join.input[0]).toMatchObject({ type: 'extend', variable: DF.variable(`${KEY}1`), input: {
        type: 'project',
        input: { type: 'filter', input: { type: 'join', input: [
          { type: 'extend', variable: DF.variable(`${KEY}0`) },
          { type: 'extend', variable: DF.variable(`${KEY}0`) },
        ]}},
      }});
      expect(join.input[1]).toMatchObject({ type: 'extend', variable: DF.variable(`${KEY}1`) });
    });

    it.each([
      [ 'an equality of variables', AF.createOperatorExpression('=', [ variable('x'), variable('y') ]) ],
      [ 'an equality of a STR call and a variable', AF.createOperatorExpression('=', [ str('x'), variable('y') ]) ],
      [ 'an inequality of STR calls', AF.createOperatorExpression('!=', [ str('x'), str('y') ]) ],
      [ 'a disjunction', AF.createOperatorExpression('||', [ strEquals('x', 'y'), strEquals('y', 'x') ]) ],
      [ 'a sameTerm call with a constant', AF.createOperatorExpression('sameterm', [
        variable('x'),
        AF.createTermExpression(DF.namedNode('ex:x')),
      ]) ],
      [ 'an equality within one entry', strEquals('a', 'x') ],
      [ 'an equality with variables of two entries on one side', AF.createOperatorExpression('=', [
        AF.createOperatorExpression('str', [ AF.createOperatorExpression('concat', [ variable('x'), variable('y') ]) ]),
        str('y'),
      ]) ],
      [ 'an equality with an unbound variable', strEquals('x', 'unbound') ],
    ])('does not change a filter with %s', async(_, expression) => {
      const operation = AF.createFilter(AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]), expression);
      await expect(optimize(operation)).resolves.toEqual(operation);
    });

    it('does not change a filter on entries that share a variable', async() => {
      const operation = AF.createFilter(AF.createJoin([ pattern('a', 'x'), pattern('a', 'y') ]), strEquals('x', 'y'));
      await expect(optimize(operation)).resolves.toEqual(operation);
    });

    it('does not change a filter on entries that are joined via another entry', async() => {
      const operation = AF.createFilter(
        AF.createJoin([ pattern('a', 'x'), pattern('b', 'y'), pattern('a', 'b') ]),
        strEquals('x', 'y'),
      );
      await expect(optimize(operation)).resolves.toEqual(operation);
    });

    it('does not change a filter over another operation than a join', async() => {
      const operation = AF.createFilter(AF.createUnion([ pattern('a', 'x'), pattern('b', 'y') ]), strEquals('x', 'y'));
      await expect(optimize(operation)).resolves.toEqual(operation);
    });

    it('does not change a filter of a left join', async() => {
      const operation: Algebra.Operation = AF
        .createFilter(AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]), strEquals('x', 'y'));
      operation.metadata = { isHoistedLeftJoinFilter: true };
      await expect(optimize(operation)).resolves.toEqual(operation);
    });

    it('does not change a filter that is evaluated by a source', async() => {
      const operation = assignOperationSource(
        AF.createFilter(AF.createJoin([ pattern('a', 'x'), pattern('b', 'y') ]), strEquals('x', 'y')),
        <any> { source: { referenceValue: 'source' }},
      );
      await expect(optimize(operation)).resolves.toEqual(operation);
    });
  });
});
