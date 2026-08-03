import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationNodes } from '../lib/ActorQueryOperationNodes';
import 'jest-rdf';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

describe('ActorQueryOperationNodes', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.fromRecord({ '?a': DF.literal('1') }),
          BF.fromRecord({ '?a': DF.literal('2') }),
          BF.fromRecord({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: { type: 'exact', value: 3 }}),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('An ActorQueryOperationNodes instance', () => {
    let actor: ActorQueryOperationNodes;

    beforeEach(() => {
      actor = new ActorQueryOperationNodes({ name: 'actor', bus, mediatorQueryOperation });
    });

    describe('test', () => {
      it('should handle operations with top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: assignOperationSource(AF.createNodes(DF.defaultGraph(), DF.variable('x')), <any>{}),
        })).resolves.toPassTestVoid();
      });

      it('should not handle operations without top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: AF.createNodes(DF.defaultGraph(), DF.variable('x')),
        })).resolves.toFailTest(`Actor actor requires an operation with source annotation.`);
      });
    });

    describe('run', () => {
      it('should rewrite operations into distinct-union-pattern', async() => {
        jest.spyOn(mediatorQueryOperation, 'mediate');
        const source1 = <any>{};
        const opIn = assignOperationSource(
          AF.createNodes(DF.defaultGraph(), DF.variable('x')),
          source1,
        );
        const result: IQueryOperationResultBindings = <any> await actor.runOperation(opIn, new ActionContext()
          .set(KeysInitQuery.dataFactory, DF));
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({ cardinality: { type: 'exact', value: 3 }});
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.fromRecord({ '?a': DF.literal('1') }),
          BF.fromRecord({ '?a': DF.literal('2') }),
          BF.fromRecord({ '?a': DF.literal('3') }),
        ]);
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: AF.createDistinct(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), DF.defaultGraph()), source1),
            assignOperationSource(AF
              .createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), DF.defaultGraph()), source1),
          ])),
        });
      });
    });
  });
});
