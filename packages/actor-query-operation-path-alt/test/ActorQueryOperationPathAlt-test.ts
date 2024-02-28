import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfMetadataAccumulate,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathAlt } from '../lib/ActorQueryOperationPathAlt';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathAlt', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ]),
        metadata: () => Promise.resolve({
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorRdfMetadataAccumulate = <any> {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }, canContainUndefs: false }};
        }

        const metadata = { ...action.accumulatedMetadata };
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
          // We're already at infinite, so ignore any later metadata
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        } else {
          if (subMetadata.cardinality.type === 'estimate') {
            metadata.cardinality.type = 'estimate';
          }
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        if (metadata.requestTime ?? subMetadata.requestTime) {
          metadata.requestTime = metadata.requestTime ?? 0;
          subMetadata.requestTime = subMetadata.requestTime ?? 0;
          metadata.requestTime += subMetadata.requestTime;
        }
        if (metadata.pageSize ?? subMetadata.pageSize) {
          metadata.pageSize = metadata.pageSize ?? 0;
          subMetadata.pageSize = subMetadata.pageSize ?? 0;
          metadata.pageSize += subMetadata.pageSize;
        }
        if (subMetadata.canContainUndefs) {
          metadata.canContainUndefs = true;
        }

        return { metadata };
      },
    };
  });

  describe('The ActorQueryOperationPathAlt module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathAlt).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathAlt constructor', () => {
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathAlt);
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathAlt objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationPathAlt)();
      }).toThrow(`Class constructor ActorQueryOperationPathAlt cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathAlt instance', () => {
    let actor: ActorQueryOperationPathAlt;

    beforeEach(() => {
      actor = new ActorQueryOperationPathAlt(
        { name: 'actor', bus, mediatorQueryOperation, mediatorRdfMetadataAccumulate },
      );
    });

    it('should test on Alt paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }},
        context: new ActionContext(),
      };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext(),
      };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createAlt([
          factory.createLink(DF.namedNode('p1')),
          factory.createLink(DF.namedNode('p2')),
        ]),
        DF.variable('x'),
      ), context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 6 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });
  });
});
