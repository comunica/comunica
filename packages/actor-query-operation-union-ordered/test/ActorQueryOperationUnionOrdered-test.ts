import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfMetadataAccumulate,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActionContext, Bus } from '@comunica/core';
import type { Bindings, IActionContext, MetadataBindings, TermsOrder } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnionOrdered } from '../lib/ActorQueryOperationUnionOrdered';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const a = DF.variable('a');
const b = DF.variable('b');
const ascA: TermsOrder<RDF.Variable> = [{ term: a, direction: 'asc' }];

function metadata(
  termOrder: TermsOrder<RDF.Variable> | undefined,
  canSeek?: boolean,
  variables = [{ variable: a, canBeUndef: false }],
): MetadataBindings {
  return {
    state: new MetadataValidationState(),
    cardinality: { type: 'exact', value: 2 },
    variables,
    termOrder,
    canSeek,
  };
}

function input(values: string[], meta: MetadataBindings): any {
  return {
    stream: new ArrayIterator(values.map(value => BF.bindings([[ a, DF.literal(value) ]])), { autoStart: false }),
    metadata: async() => meta,
  };
}

function union(inputs: any[], orderUseful?: unknown): Algebra.Union {
  return <any> {
    type: Algebra.Types.UNION,
    input: inputs,
    ...orderUseful === undefined ? {} : { metadata: { orderUseful }},
  };
}

function values(items: Bindings[]): string[] {
  return items.map(item => item.get(a)!.value);
}

describe('ActorQueryOperationUnionOrdered', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let actor: ActorQueryOperationUnionOrdered;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    mediatorQueryOperation = {
      mediate: async({ operation }: any) => ({
        type: 'bindings',
        bindingsStream: operation.stream,
        metadata: operation.metadata,
      }),
    };
    mediatorRdfMetadataAccumulate = <any> {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }}};
        }
        return {
          metadata: {
            cardinality: {
              type: 'exact',
              value: action.accumulatedMetadata.cardinality.value + action.appendingMetadata.cardinality.value,
            },
          },
        };
      },
    };
    actor = new ActorQueryOperationUnionOrdered({
      name: 'actor',
      bus,
      mediatorQueryOperation,
      mediatorRdfMetadataAccumulate,
    });
  });

  describe('getUsefulOrder', () => {
    it('returns the order that all inputs share', () => {
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([ metadata(ascA), metadata(ascA) ], [ 'a' ]))
        .toEqual(ascA);
    });

    it('returns the longest prefix that all inputs share', () => {
      const variables = [{ variable: a, canBeUndef: false }, { variable: b, canBeUndef: false }];
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([
        metadata([ ...ascA, { term: b, direction: 'asc' }], undefined, variables),
        metadata([ ...ascA, { term: b, direction: 'desc' }], undefined, variables),
      ], [ 'a' ])).toEqual(ascA);
    });

    it('returns no order if an input has none', () => {
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([ metadata(ascA), metadata(undefined) ], [ 'a' ]))
        .toBeUndefined();
    });

    it('returns no order if the inputs are sorted on different variables', () => {
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([
        metadata(ascA),
        metadata([{ term: b, direction: 'asc' }]),
      ], [ 'a', 'b' ])).toBeUndefined();
    });

    it('returns no order if an input may leave the variable unbound', () => {
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([
        metadata(ascA),
        metadata(ascA, undefined, [{ variable: a, canBeUndef: true }]),
      ], [ 'a' ])).toBeUndefined();
    });

    it('returns no order if it does not start with a useful variable', () => {
      expect(ActorQueryOperationUnionOrdered.getUsefulOrder([ metadata(ascA), metadata(ascA) ], [ 'b' ]))
        .toBeUndefined();
    });
  });

  describe('test', () => {
    it('fails on unions without annotation', async() => {
      await expect(actor.test({ operation: union([]), context })).resolves
        .toFailTest('actor only handles unions whose order is useful to a join');
    });

    it('fails on unions without useful variables', async() => {
      await expect(actor.test({ operation: union([], []), context })).resolves
        .toFailTest('actor only handles unions whose order is useful to a join');
    });

    it('passes on unions with useful variables', async() => {
      await expect(actor.test({ operation: union([], [ 'a' ]), context })).resolves.toPassTestVoid();
    });
  });

  describe('run', () => {
    it('emits the inputs in their shared order', async() => {
      const output = getSafeBindings(await actor.run({
        operation: union([ input([ '1', '3' ], metadata(ascA, true)), input([ '2' ], metadata(ascA, true)) ], [ 'a' ]),
        context,
      }, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 4 },
        termOrder: ascA,
        canSeek: true,
      });
      expect(values(await output.bindingsStream.toArray())).toEqual([ '1', '2', '3' ]);
    });

    it('does not report seeking unless all inputs can seek', async() => {
      const output = getSafeBindings(await actor.run({
        operation: union([ input([ '1' ], metadata(ascA, true)), input([ '2' ], metadata(ascA)) ], [ 'a' ]),
        context,
      }, undefined));
      const result = await output.metadata();
      expect(result.termOrder).toEqual(ascA);
      expect(result.canSeek).toBeUndefined();
    });

    it('reports no order if the inputs share none', async() => {
      const output = getSafeBindings(await actor.run({
        operation: union([ input([ '3' ], metadata(ascA)), input([ '1' ], metadata(undefined)) ], [ 'a' ]),
        context,
      }, undefined));
      expect((await output.metadata()).termOrder).toBeUndefined();
      expect(values(await output.bindingsStream.toArray())).toEqual([ '3', '1' ]);
    });

    it('reports no order once reading has started without one', async() => {
      const output = getSafeBindings(await actor.run({
        operation: union([ input([ '3' ], metadata(ascA)), input([ '1' ], metadata(ascA)) ], [ 'a' ]),
        context,
      }, undefined));
      expect(values(await output.bindingsStream.toArray())).toEqual([ '3', '1' ]);
      expect((await output.metadata()).termOrder).toBeUndefined();
    });

    it('rejects inputs that do not produce bindings', async() => {
      mediatorQueryOperation.mediate = async() => ({ type: 'boolean' });
      await expect(actor.run({ operation: union([{}], [ 'a' ]), context }, undefined)).rejects
        .toThrow(`Invalid query output type: Expected 'bindings' but got 'boolean'`);
    });
  });

  it('is a query operation actor', () => {
    expect(actor).toBeInstanceOf(ActorQueryOperation);
  });
});
