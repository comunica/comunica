import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
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
      let sourceWildcard: IQuerySourceWrapper;
      let sourcePatterns: IQuerySourceWrapper;

      beforeEach(() => {
        // Such as a SPARQL endpoint
        sourceWildcard = <any> {
          source: {
            getSelectorShape: () => Promise.resolve({ type: 'operation', operation: { operationType: 'wildcard' }}),
          },
        };
        // Such as a TPF interface
        sourcePatterns = <any> {
          source: {
            getSelectorShape: () => Promise.resolve({
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.Types.PATTERN },
            }),
          },
        };
      });

      it('should pass the whole projected distinct-union-pattern to sources that accept it', async() => {
        jest.spyOn(mediatorQueryOperation, 'mediate');
        const opIn = assignOperationSource(
          AF.createNodes(DF.defaultGraph(), DF.variable('x')),
          sourceWildcard,
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
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(1);
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: assignOperationSource(AF.createDistinct(AF.createProject(AF.createUnion([
            AF.createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), DF.defaultGraph()),
            AF.createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), DF.defaultGraph()),
          ]), [ DF.variable('x') ])), sourceWildcard),
        });
      });

      it('should also project onto a variable graph for sources that accept the whole operation', async() => {
        jest.spyOn(mediatorQueryOperation, 'mediate');
        const opIn = assignOperationSource(
          AF.createNodes(DF.variable('g'), DF.variable('x')),
          sourceWildcard,
        );
        await actor.runOperation(opIn, new ActionContext().set(KeysInitQuery.dataFactory, DF));
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(1);
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: assignOperationSource(AF.createDistinct(AF.createProject(AF.createUnion([
            AF.createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), DF.variable('g')),
            AF.createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), DF.variable('g')),
          ]), [ DF.variable('x'), DF.variable('g') ])), sourceWildcard),
        });
      });

      it('should not project onto a variable graph twice if it is the nodes variable', async() => {
        jest.spyOn(mediatorQueryOperation, 'mediate');
        const opIn = assignOperationSource(
          AF.createNodes(DF.variable('x'), DF.variable('x')),
          sourceWildcard,
        );
        await actor.runOperation(opIn, new ActionContext().set(KeysInitQuery.dataFactory, DF));
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(1);
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          context: expect.any(ActionContext),
          operation: assignOperationSource(AF.createDistinct(AF.createProject(AF.createUnion([
            AF.createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), DF.variable('x')),
            AF.createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), DF.variable('x')),
          ]), [ DF.variable('x') ])), sourceWildcard),
        });
      });

      it('should rewrite operations into distinct-union-pattern for sources that only accept patterns', async() => {
        jest.spyOn(mediatorQueryOperation, 'mediate');
        const opIn = assignOperationSource(
          AF.createNodes(DF.defaultGraph(), DF.variable('x')),
          sourcePatterns,
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
            assignOperationSource(
              AF.createPattern(DF.variable('x'), DF.variable('__p'), DF.variable('__x'), DF.defaultGraph()),
              sourcePatterns,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('__x'), DF.variable('__p'), DF.variable('x'), DF.defaultGraph()),
              sourcePatterns,
            ),
          ])),
        });
      });
    });
  });
});
