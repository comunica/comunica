import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MappingIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorIteratorTransformRecordIntermediateResults }
  from '../lib/ActorIteratorTransformRecordIntermediateResults';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorProcessIteratorCountIntermediateResults', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
  });

  describe('An ActorProcessIteratorCountIntermediateResults instance', () => {
    let actor: ActorIteratorTransformRecordIntermediateResults;
    const statisticIntermediateResults = new StatisticIntermediateResults();
    let actionBindings: IActionIteratorTransform<AsyncIterator<RDF.Bindings>, MetadataBindings>;
    let actionQuads: IActionIteratorTransform<AsyncIterator<RDF.Quad>, MetadataQuads>;
    let metadata: any;

    beforeEach(async() => {
      actor = new ActorIteratorTransformRecordIntermediateResults({ name: 'actor', bus });
      metadata = () => Promise.resolve(
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 5 },
          pageSize: 100,
          requestTime: 20,
          canContainUndefs: false,
        },
      );
      actionBindings = {
        operation: 'inner',
        stream: new ArrayIterator<RDF.Bindings>([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a1') ],
            [ DF.variable('c'), DF.literal('c1') ],
          ]),
        ]),
        streamMetadata: () => Promise.resolve(
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 5 },
            pageSize: 100,
            requestTime: 20,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('c') ],
          },
        ),
        context: new ActionContext(),
        metadata: {
          ...(await metadata()),
        },
      };
      actionQuads = {
        operation: 'construct',
        stream: new ArrayIterator<RDF.Quad>([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
        ]),
        streamMetadata: metadata,
        context: new ActionContext(),
        metadata: {
          ...(await metadata()),
        },
      };
    });
    describe('with quad input', () => {
      it('should throw if no intermediate results statistic exists in context', async() => {
        await expect(actor.run(actionQuads)).rejects.toThrow(
          'Context entry @comunica/statistic:intermediateResults is required but not available',
        );
      });
      it('transform iterator should return mapped stream and unchanged metadata', async() => {
        actionQuads.context = actionQuads.context.set(KeysStatistics.intermediateResults, statisticIntermediateResults);
        await expect(actor.transformIterator(actionQuads)).resolves.toEqual({
          stream: expect.any(MappingIterator),
          streamMetadata: expect.any(Function),
        });
      });
      it('should apply transform to input bindings stream', async() => {
        const statisticEmitSpy = jest.spyOn(statisticIntermediateResults, 'emit');
        actionQuads.context = actionQuads.context.set(KeysStatistics.intermediateResults, statisticIntermediateResults);

        const output = await actor.run(actionQuads);
        await output.stream.toArray();

        expect(statisticEmitSpy).toHaveBeenCalledWith(
          {
            data: DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
            metadata: {
              operation: 'construct',
              time: performance.now(),
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
            },
          },
        );
      });
    });
    describe('with bindings input', () => {
      it('should throw if no intermediate results statistic exists in context', async() => {
        await expect(actor.run(actionBindings)).rejects.toThrow(
          'Context entry @comunica/statistic:intermediateResults is required but not available',
        );
      });
      it('transform iterator should return mapped stream and unchanged metadata', async() => {
        actionBindings.context = actionQuads.context.set(
          KeysStatistics.intermediateResults,
          statisticIntermediateResults,
        );
        const output = await actor.transformIterator(actionBindings);
        expect(output).toEqual({
          stream: expect.any(MappingIterator),
          streamMetadata: expect.any(Function),
        });
      });

      it('should apply transform to input bindings stream', async() => {
        const statisticEmitSpy = jest.spyOn(statisticIntermediateResults, 'emit');
        actionBindings.context = actionQuads.context.set(
          KeysStatistics.intermediateResults,
          statisticIntermediateResults,
        );

        const output = await actor.run(actionBindings);
        await output.stream.toArray();

        expect(statisticEmitSpy).toHaveBeenCalledWith(
          {
            data: BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            metadata: {
              operation: 'inner',
              time: performance.now(),
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
            },
          },
        );
      });
    });
  });
});
