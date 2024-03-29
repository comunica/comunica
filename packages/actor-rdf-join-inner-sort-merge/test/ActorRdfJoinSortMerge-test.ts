import '@comunica/jest';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { ActionContext, type Actor, Bus, type IActorTest, type Mediator } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinSortMerge } from '../lib/ActorRdfJoinSortMerge';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('ActorRdfJoinSortMerge', () => {
  let bus: any;
  let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
    IActorTest,
    IActorRdfJoinSelectivityOutput
  >;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorJoinSelectivity = <any> {
      mediate: async() => ({ selectivity: 1 }),
    };
    context = new ActionContext();
  });

  describe('An ActorRdfJoinSortMerge instance', () => {
    let actor: ActorRdfJoinSortMerge;

    beforeEach(() => {
      actor = new ActorRdfJoinSortMerge({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should handle compatible entries', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('a'), direction: 'asc' },
                    { term: DF.variable('b'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('b'), direction: 'asc' },
                    { term: DF.variable('c'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        })).resolves.toBeTruthy();
      });

      it('should not handle incompatible entries', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('a'), direction: 'asc' },
                    { term: DF.variable('b'), direction: 'desc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('b'), direction: 'asc' },
                    { term: DF.variable('c'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        })).rejects.toThrow(`Sort-Merge join can only be applied on compatible orders`);
      });

      it('should not handle when left entry has no order', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('b'), direction: 'asc' },
                    { term: DF.variable('c'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        })).rejects.toThrow(`Sort-Merge join can only be applied on compatible orders`);
      });

      it('should not handle when right entry has no order', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [],
                  order: [
                    { term: DF.variable('b'), direction: 'asc' },
                    { term: DF.variable('c'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: <any> undefined,
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        })).rejects.toThrow(`Sort-Merge join can only be applied on compatible orders`);
      });
    });

    describe('compareBindings', () => {
      it('should handle no common variables', () => {
        expect(ActorRdfJoinSortMerge.compareBindings(
          [],
          BF.fromRecord({}),
          BF.fromRecord({}),
        )).toBe(0);
      });

      it('should handle one common variable', () => {
        expect(ActorRdfJoinSortMerge.compareBindings(
          [ DF.variable('a') ],
          BF.fromRecord({ a: DF.namedNode('1') }),
          BF.fromRecord({ a: DF.namedNode('2') }),
        )).toBe(-1);
        expect(ActorRdfJoinSortMerge.compareBindings(
          [ DF.variable('a') ],
          BF.fromRecord({ a: DF.namedNode('2') }),
          BF.fromRecord({ a: DF.namedNode('1') }),
        )).toBe(1);
      });

      it('should handle multiple common variables', () => {
        expect(ActorRdfJoinSortMerge.compareBindings(
          [ DF.variable('a'), DF.variable('b') ],
          BF.fromRecord({
            a: DF.namedNode('a1'),
            b: DF.namedNode('b1'),
          }),
          BF.fromRecord({
            a: DF.namedNode('a1'),
            b: DF.namedNode('b2'),
          }),
        )).toBe(-1);
        expect(ActorRdfJoinSortMerge.compareBindings(
          [ DF.variable('a'), DF.variable('b') ],
          BF.fromRecord({
            a: DF.namedNode('a1'),
            b: DF.namedNode('b2'),
          }),
          BF.fromRecord({
            a: DF.namedNode('a1'),
            b: DF.namedNode('b1'),
          }),
        )).toBe(1);
      });
    });

    describe('getJoinCoefficients', () => {
      it('should handle compatible entries', async() => {
        await expect(actor.getJoinCoefficients(<any> {}, [
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 4 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [],
            order: [
              { term: DF.variable('a'), direction: 'asc' },
              { term: DF.variable('b'), direction: 'asc' },
            ],
          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 5 },
            pageSize: 100,
            requestTime: 20,
            canContainUndefs: false,
            variables: [],
            order: [
              { term: DF.variable('b'), direction: 'asc' },
              { term: DF.variable('c'), direction: 'asc' },
            ],
          },
        ])).resolves.toEqual({
          blockingItems: 0,
          iterations: 9,
          persistedItems: 0,
          requestTime: 1.4,
        });
      });
    });

    describe('areOrdersCompatible', () => {
      it('should be false for non-overlapping variables', () => {
        expect(actor.areOrdersCompatible(
          [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
          ],
          [
            { term: DF.variable('c'), direction: 'asc' },
            { term: DF.variable('d'), direction: 'asc' },
          ],
        )).toBeFalsy();
      });

      it('should be true for overlapping variables with same direction', () => {
        expect(actor.areOrdersCompatible(
          [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
          ],
          [
            { term: DF.variable('b'), direction: 'asc' },
            { term: DF.variable('c'), direction: 'asc' },
          ],
        )).toBeTruthy();
      });

      it('should be false for overlapping variables with different direction', () => {
        expect(actor.areOrdersCompatible(
          [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
          ],
          [
            { term: DF.variable('b'), direction: 'desc' },
            { term: DF.variable('c'), direction: 'asc' },
          ],
        )).toBeFalsy();
      });

      it('should be true for multiple overlapping variables', () => {
        expect(actor.areOrdersCompatible(
          [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
            { term: DF.variable('c'), direction: 'asc' },
            { term: DF.variable('d'), direction: 'asc' },
          ],
          [
            { term: DF.variable('b'), direction: 'asc' },
            { term: DF.variable('c'), direction: 'asc' },
          ],
        )).toBeTruthy();
      });

      it('should be false for multiple overlapping variables in different order', () => {
        expect(actor.areOrdersCompatible(
          [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
            { term: DF.variable('c'), direction: 'asc' },
            { term: DF.variable('d'), direction: 'asc' },
          ],
          [
            { term: DF.variable('c'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
          ],
        )).toBeFalsy();
      });
    });

    describe('run', () => {
      it('should handle compatible entries', async() => {
        const result = await actor.run({
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.fromRecord({
                    a: DF.namedNode('0'),
                    b: DF.namedNode('b0'),
                  }),
                  BF.fromRecord({
                    a: DF.namedNode('2'),
                    b: DF.namedNode('b2'),
                  }),
                  BF.fromRecord({
                    a: DF.namedNode('4'),
                    b: DF.namedNode('b4'),
                  }),
                ], { autoStart: false }),
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                  order: [
                    { term: DF.variable('a'), direction: 'asc' },
                    { term: DF.variable('b'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.fromRecord({
                    a: DF.namedNode('1'),
                    c: DF.namedNode('c1'),
                  }),
                  BF.fromRecord({
                    a: DF.namedNode('2'),
                    c: DF.namedNode('c2'),
                  }),
                  BF.fromRecord({
                    a: DF.namedNode('3'),
                    c: DF.namedNode('c3'),
                  }),
                ], { autoStart: false }),
                metadata: async() => ({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('c') ],
                  order: [
                    { term: DF.variable('b'), direction: 'asc' },
                    { term: DF.variable('c'), direction: 'asc' },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        });

        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 20 },
          variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
          order: [
            { term: DF.variable('a'), direction: 'asc' },
            { term: DF.variable('b'), direction: 'asc' },
            { term: DF.variable('c'), direction: 'asc' },
          ],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.fromRecord({
            a: DF.namedNode('2'),
            b: DF.namedNode('b2'),
            c: DF.namedNode('c2'),
          }),
        ]);
      });
    });
  });
});
