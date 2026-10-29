import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationAnnotateUnionOrder } from '../lib/ActorOptimizeQueryOperationAnnotateUnionOrder';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorOptimizeQueryOperationAnnotateUnionOrder', () => {
  let bus: any;
  let factory: AlgebraFactory;
  let actor: ActorOptimizeQueryOperationAnnotateUnionOrder;
  let context: IActionContext;

  const pattern = (s: string, p: string, o: string): Algebra.Pattern =>
    factory.createPattern(DF.variable(s), DF.namedNode(p), DF.variable(o));
  const run = async(operation: Algebra.Operation): Promise<any> => (await actor.run({ operation, context })).operation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    factory = new AlgebraFactory();
    actor = new ActorOptimizeQueryOperationAnnotateUnionOrder({ name: 'actor', bus });
    context = new ActionContext({});
  });

  it('should test', async() => {
    await expect(actor.test({ operation: <any> undefined, context })).resolves.toPassTestVoid();
  });

  it('should annotate a union with the variables it shares with the rest of a join', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const operation = await run(factory.createJoin([ union, pattern('s', 'q', 'x') ]));
    expect(operation.input[0].metadata).toEqual({ orderUseful: [ 's' ]});
    expect(operation.input[1]).toEqual(pattern('s', 'q', 'x'));
  });

  it('should keep the existing metadata of a union', async() => {
    const union = { ...factory.createUnion([ pattern('s', 'p0', 'o') ]), metadata: { other: true }};
    const operation = await run(factory.createJoin([ union, pattern('s', 'q', 'x') ]));
    expect(operation.input[0].metadata).toEqual({ other: true, orderUseful: [ 's' ]});
  });

  it('should not annotate a union that shares no variables with the rest of a join', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const operation = await run(factory.createJoin([ union, pattern('y', 'q', 'x') ]));
    expect(operation.input[0].metadata).toBeUndefined();
  });

  it('should not annotate a union outside a join', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    await expect(run(union)).resolves.toEqual(union);
  });

  it('should leave a join without unions unchanged', async() => {
    const join = factory.createJoin([ pattern('s', 'p', 'o'), pattern('s', 'q', 'x') ]);
    await expect(run(join)).resolves.toEqual(join);
  });

  it('should annotate a union below operators that keep the order of their input', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const truth = factory.createTermExpression(DF.literal('true'));
    const wrapped = factory.createDistinct(factory.createReduced(factory.createSlice(
      factory.createExtend(factory.createFilter(union, truth), DF.variable('e'), truth),
      0,
      10,
    )));
    const operation = await run(factory.createJoin([ wrapped, pattern('s', 'q', 'x') ]));
    expect(operation.input[0].input.input.input.input.input.metadata).toEqual({ orderUseful: [ 's' ]});
  });

  it('should not annotate a union that does not bind the shared variables of the operator above it', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const extend = factory.createExtend(union, DF.variable('e'), factory.createTermExpression(DF.literal('e')));
    const operation = await run(factory.createJoin([ extend, pattern('e', 'q', 'x') ]));
    expect(operation.input[0].input.metadata).toBeUndefined();
  });

  it('should annotate a union below a projection on the projected shared variables', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const operation = await run(factory.createJoin([
      factory.createProject(union, [ DF.variable('s'), DF.variable('o') ]),
      pattern('s', 'q', 'o'),
    ]));
    expect(operation.input[0].input.metadata).toEqual({ orderUseful: [ 's', 'o' ]});
  });

  it('should not annotate a union below a projection that drops the shared variables', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const operation = await run(factory.createJoin([
      factory.createProject(union, [ DF.variable('o') ]),
      pattern('s', 'q', 'x'),
    ]));
    expect(operation.input[0].input.metadata).toBeUndefined();
  });

  it('should annotate unions within an annotated union', async() => {
    // Nested unions are flattened, so they only occur below another operator, such as a filter.
    const inner = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const filter = factory.createFilter(inner, factory.createTermExpression(DF.literal('true')));
    const operation = await run(factory.createJoin([
      factory.createUnion([ filter, pattern('s', 'p2', 'x') ]),
      pattern('s', 'q', 'x'),
    ]));
    expect(operation.input[0].metadata).toEqual({ orderUseful: [ 's', 'x' ]});
    expect(operation.input[0].input[0].input.metadata).toEqual({ orderUseful: [ 's' ]});
  });

  it('should not annotate a union below an operator that does not keep the order of its input', async() => {
    const union = factory.createUnion([ pattern('s', 'p0', 'o'), pattern('s', 'p1', 'o') ]);
    const operation = await run(factory.createJoin([
      factory.createOrderBy(union, [ factory.createTermExpression(DF.variable('o')) ]),
      pattern('s', 'q', 'x'),
    ]));
    expect(operation.input[0].input.metadata).toBeUndefined();
  });

  it('should annotate unions in nested joins', async() => {
    const inner = factory.createJoin([
      factory.createUnion([ pattern('m', 'content', 'c'), pattern('m', 'image', 'c') ]),
      pattern('m', 'date', 'd'),
    ]);
    const operation = await run(factory.createUnion([ inner, pattern('m', 'other', 'c') ]));
    expect(operation.input[0].input[0].metadata).toEqual({ orderUseful: [ 'm' ]});
    expect(operation.metadata).toBeUndefined();
  });
});
