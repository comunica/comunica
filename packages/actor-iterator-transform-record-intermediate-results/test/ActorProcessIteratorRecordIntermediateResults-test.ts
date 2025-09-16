import type {
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuads,
} from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import { ActionContext, Bus, failTest, passTestVoid } from '@comunica/core';
import { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, MappingIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { types } from 'sparqlalgebrajs/lib/algebra';
import { ActorIteratorTransformRecordIntermediateResults }
  from '../lib/ActorIteratorTransformRecordIntermediateResults';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorIteratorTransformRecordIntermediateResults', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
  });

  describe('An ActorIteratorTransformRecordIntermediateResults instance', () => {
    let actor: ActorIteratorTransformRecordIntermediateResults;
    const statisticIntermediateResults = new StatisticIntermediateResults();
    let actionBindings: IActionIteratorTransformBindings;
    let actionQuads: IActionIteratorTransformQuads;
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
        type: 'bindings',
        operation: 'inner',
        stream: new ArrayIterator<RDF.Bindings>([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a1') ],
            [ DF.variable('c'), DF.literal('c1') ],
          ]),
        ]),
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      };
      actionQuads = {
        type: 'quads',
        operation: types.CONSTRUCT,
        stream: new ArrayIterator<RDF.Quad>([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
        ]),
        metadata,
        context: new ActionContext(),
        originalAction: { context: new ActionContext() },
      };
    });

    it ('should not test without statistic tracking in the context', async() => {
      await expect(actor.test(actionBindings)).resolves.toEqual(failTest(
        `Missing required context value: ${KeysStatistics.intermediateResults.name}. It must be defined before running actor.`,
      ));
    });

    it ('should test with statistic tracking in the context', async() => {
      actionBindings.context = actionBindings.context.set(
        KeysStatistics.intermediateResults,
        statisticIntermediateResults,
      );
      await expect(actor.test(actionBindings)).resolves.toEqual(passTestVoid());
    });

    it('should not test if there is no wrap is in the context', async() => {
      actor.wraps = [];
      await expect(actor.test(actionBindings)).resolves.toEqual(failTest(
        'Operation type not supported in configuration of actor',
      ));
    });

    describe('with quad input', () => {
      it('should throw if no intermediate results statistic exists in context', async() => {
        await expect(actor.run(actionQuads)).rejects.toThrow(
          'Context entry @comunica/statistic:intermediateResults is required but not available',
        );
      });
      it('transform iterator should return mapped stream and unchanged metadata', async() => {
        actionQuads.context = actionQuads.context.set(KeysStatistics.intermediateResults, statisticIntermediateResults);
        await expect(actor.transformIteratorQuads(actionQuads)).resolves.toEqual({
          stream: expect.any(MappingIterator),
          metadata: expect.any(Function),
        });
      });
      it('should apply transform to input quad stream', async() => {
        const statisticEmitSpy = jest.spyOn(statisticIntermediateResults, 'emit');
        actionQuads.context = actionQuads.context.set(KeysStatistics.intermediateResults, statisticIntermediateResults);

        const output = await actor.run(actionQuads);
        await output.stream.toArray();

        expect(statisticEmitSpy).toHaveBeenCalledWith(
          {
            type: 'quads',
            data: DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
            metadata: {
              operation: types.CONSTRUCT,
              metadata: expect.any(Function),
              time: performance.now(),
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
        actionBindings.context = actionBindings.context.set(
          KeysStatistics.intermediateResults,
          statisticIntermediateResults,
        );
        const output = await actor.transformIteratorBindings(actionBindings);
        expect(output).toEqual({
          stream: expect.any(MappingIterator),
          metadata: expect.any(Function),
        });
      });

      it('should apply transform to input bindings stream', async() => {
        const statisticEmitSpy = jest.spyOn(statisticIntermediateResults, 'emit');
        actionBindings.context = actionBindings.context.set(
          KeysStatistics.intermediateResults,
          statisticIntermediateResults,
        );
        const output = await actor.run(actionBindings);
        await output.stream.toArray();

        expect(statisticEmitSpy).toHaveBeenCalledWith(
          {
            type: 'bindings',
            data: BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            metadata: {
              operation: 'inner',
              metadata: expect.any(Function),
              time: performance.now(),
            },
          },
        );
      });
    });
  });
});
