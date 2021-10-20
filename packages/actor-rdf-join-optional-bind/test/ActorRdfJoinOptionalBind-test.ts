import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionQueryOperation, IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs/index';
import { ActorRdfJoinOptionalBind } from '../lib/ActorRdfJoinOptionalBind';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();
const FACTORY = new Factory();

describe('ActorRdfJoinOptionalBind', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinOptionalBind instance', () => {
    let mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutputBindings>;
    let actor: ActorRdfJoinOptionalBind;

    beforeEach(() => {
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(arg: IActionQueryOperation): Promise<IActorQueryOperationOutputBindings> => {
          let data: Bindings[] = [];
          switch ((<Algebra.Pattern> arg.operation).subject.value) {
            case '1':
              data = [
                Bindings({ '?b': DF.literal('1') }),
              ];
              break;
            case '3':
              data = [
                Bindings({ '?b': DF.literal('1') }),
                Bindings({ '?b': DF.literal('2') }),
              ];
              break;
          }

          return {
            bindingsStream: new ArrayIterator(data, { autoStart: false }),
            metadata: () => Promise.resolve({ cardinality: data.length }),
            type: 'bindings',
            variables: [ 'bound' ],
            canContainUndefs: false,
          };
        }),
      };
      actor = new ActorRdfJoinOptionalBind({ name: 'actor', bus, bindOrder: 'depth-first', mediatorQueryOperation });
    });

    describe('getJoinCoefficients', () => {
      it('should handle two entries', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10 },
            { cardinality: 2, pageSize: 100, requestTime: 20 },
          ],
        )).toEqual({
          iterations: 0.6,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.33,
        });
      });

      it('should handle two entries with a lower variable overlap', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{
                  variables: [ 'a', 'b', 'd' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a', 'c', 'e' ],
                },
                operation: <any>{},
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10 },
            { cardinality: 2, pageSize: 100, requestTime: 20 },
          ],
        )).toEqual({
          iterations: 0.6,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.33,
        });
      });

      it('should reject on a right stream of type extend', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any>{ type: Algebra.types.EXTEND },
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10 },
            { cardinality: 2, pageSize: 100, requestTime: 20 },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
      });

      it('should reject on a right stream of type group', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10 },
            { cardinality: 2, pageSize: 100, requestTime: 20 },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
      });

      it('should not reject on a left stream of type group', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10 },
            { cardinality: 2, pageSize: 100, requestTime: 20 },
          ],
        )).toEqual({
          iterations: 0.6,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.33,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({ '?a': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('2') }),
                  Bindings({ '?a': DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a' ],
                canContainUndefs: false,
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  // This stream will be unused!!!
                  Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: false,
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const result = await actor.run(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(result.canContainUndefs).toEqual(true);

        // Validate mock calls
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(3);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.literal('1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.literal('2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(3, {
          operation: FACTORY.createPattern(DF.literal('3'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
        });
      });

      it('should handle two entries with a context', async() => {
        const context = ActionContext({ a: 'b' });
        const action: IActionRdfJoin = {
          context,
          type: 'optional',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({ '?a': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('2') }),
                  Bindings({ '?a': DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a' ],
                canContainUndefs: false,
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  // This stream will be unused!!!
                  Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
                  Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: false,
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const result = await actor.run(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
          Bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(result.canContainUndefs).toEqual(true);

        // Validate mock calls
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(3);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.literal('1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata]: { cardinality: 3 },
            [KeysQueryOperation.joinRightMetadatas]: [{ cardinality: 3 }],
            [KeysQueryOperation.joinBindings]: Bindings({ '?a': DF.literal('1') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.literal('2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata]: { cardinality: 3 },
            [KeysQueryOperation.joinRightMetadatas]: [{ cardinality: 3 }],
            [KeysQueryOperation.joinBindings]: Bindings({ '?a': DF.literal('2') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(3, {
          operation: FACTORY.createPattern(DF.literal('3'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata]: { cardinality: 3 },
            [KeysQueryOperation.joinRightMetadatas]: [{ cardinality: 3 }],
            [KeysQueryOperation.joinBindings]: Bindings({ '?a': DF.literal('3') }),
          }),
        });
      });
    });
  });
});
