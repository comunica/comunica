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
