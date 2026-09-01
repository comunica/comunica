import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { assignOperationSource, getOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationService } from '../lib/ActorQueryOperationService';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

const mediatorMergeBindingsContext: any = { mediate: () => ({}) };

function context(): IActionContext {
  return new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
}

describe('ActorQueryOperationService', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorQuerySourceIdentify: any;
  let querySource: IQuerySourceWrapper;
  let wildcardShape: boolean;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    wildcardShape = true;
    querySource = <any> {
      source: {
        referenceValue: 'http://ex.org/sparql',
        getSelectorShape: () => Promise.resolve(wildcardShape ?
            { type: 'operation', operation: { operationType: 'wildcard' }} :
            { type: 'operation', operation: { operationType: 'type', type: Algebra.Types.PATTERN }}),
      },
    };
    mediatorQuerySourceIdentify = {
      mediate: jest.fn(() => Promise.resolve({ querySource })),
    };
    mediatorQueryOperation = {
      mediate: jest.fn((action: any) => Promise.resolve({
        type: 'bindings',
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 1 },
          variables: [{ variable: DF.variable('x'), canBeUndef: false }],
        }),
        operated: action,
      })),
    };
  });

  function createActor(forceSparqlEndpoint = false): ActorQueryOperationService {
    return new ActorQueryOperationService({
      name: 'actor',
      bus,
      forceSparqlEndpoint,
      mediatorQueryOperation,
      mediatorQuerySourceIdentify,
      mediatorMergeBindingsContext,
    });
  }

  describe('testOperation', () => {
    it('should test on a named node target', async() => {
      const op: any = { operation: AF.createService(AF.createNop(), DF.namedNode('http://ex.org/sparql')), context: context() };
      await expect(createActor().test(op)).resolves.toPassTestVoid();
    });

    it('should test on a variable target', async() => {
      const op: any = { operation: AF.createService(AF.createNop(), DF.variable('s')), context: context() };
      await expect(createActor().test(op)).resolves.toPassTestVoid();
    });

    it('should not test on a literal target', async() => {
      const op: any = {
        operation: { type: Algebra.Types.SERVICE, name: DF.literal('abc'), input: AF.createNop() },
        context: context(),
      };
      await expect(createActor().test(op)).resolves
        .toFailTest(`actor can only query services by IRI or variable, while a Literal was given.`);
    });

    it('should not test on a non-service operation', async() => {
      const op: any = { operation: AF.createNop(), context: context() };
      await expect(createActor().test(op)).resolves.toFailTest(`Actor actor only supports service operations, but got nop`);
    });
  });

  describe('runOperation with a named node target', () => {
    const pattern = () => AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('x'));

    it('should identify the source and delegate the body', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql')), context: context() };
      const output = getSafeBindings(await createActor().run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
      ]);
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith(expect.objectContaining({
        querySourceUnidentified: { value: 'http://ex.org/sparql', type: undefined },
      }));
      expect(getOperationSource(mediatorQueryOperation.mediate.mock.calls[0][0].operation)).toBe(querySource);
    });

    it('should force a sparql endpoint if configured', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql')), context: context() };
      await createActor(true).run(op, undefined);
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith(expect.objectContaining({
        querySourceUnidentified: { value: 'http://ex.org/sparql', type: 'sparql' },
      }));
    });

    it('should not re-identify a body that already has a source', async() => {
      const annotated = assignOperationSource(pattern(), querySource);
      const op: any = { operation: AF.createService(annotated, DF.namedNode('http://ex.org/sparql')), context: context() };
      await createActor().run(op, undefined);
      expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
    });

    it('should only annotate leaves if the source does not accept the whole operation', async() => {
      wildcardShape = false;
      const join = AF.createJoin([ pattern(), pattern() ]);
      const op: any = { operation: AF.createService(join, DF.namedNode('http://ex.org/sparql')), context: context() };
      await createActor().run(op, undefined);
      const operated = mediatorQueryOperation.mediate.mock.calls[0][0].operation;
      expect(getOperationSource(operated)).toBeUndefined();
      expect(getOperationSource(operated.input[0])).toBe(querySource);
      expect(getOperationSource(operated.input[1])).toBe(querySource);
    });

    it('should propagate errors for non-silent clauses', async() => {
      mediatorQueryOperation.mediate = () => Promise.reject(new Error('Endpoint down'));
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql')), context: context() };
      await expect(createActor().run(op, undefined)).rejects.toThrow('Endpoint down');
    });

    it('should emit a single empty solution for silent clauses that fail immediately', async() => {
      mediatorQueryOperation.mediate = () => Promise.reject(new Error('Endpoint down'));
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql'), true), context: context() };
      const output = getSafeBindings(await createActor().run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.anything(),
        cardinality: { type: 'exact', value: 1 },
        variables: [],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([ BF.bindings() ]);
    });

    it('should mark the identified source of a silent clause as silent', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql'), true), context: context() };
      await createActor().run(op, undefined);
      const assigned = getOperationSource(mediatorQueryOperation.mediate.mock.calls[0][0].operation)!;
      expect(assigned.source).toBe(querySource.source);
      expect(assigned.context!.get(KeysQueryOperation.silent)).toBe(true);
      expect(assigned.context!.get(KeysInitQuery.lenient)).toBe(true);
    });

    it('should not mark the identified source of a non-silent clause as silent', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.namedNode('http://ex.org/sparql')), context: context() };
      await createActor().run(op, undefined);
      const assigned = getOperationSource(mediatorQueryOperation.mediate.mock.calls[0][0].operation)!;
      expect(assigned).toBe(querySource);
    });
  });

  describe('runOperation with a variable target', () => {
    const pattern = () => AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('x'));

    it('should return a placeholder with the service variable in scope', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.variable('endpoint')), context: context() };
      const output = getSafeBindings(await createActor().run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.anything(),
        cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
        variables: [
          { variable: DF.variable('s'), canBeUndef: false },
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('endpoint'), canBeUndef: false },
        ],
      });
      expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
    });

    it('should error when the placeholder stream is read', async() => {
      const op: any = { operation: AF.createService(pattern(), DF.variable('endpoint')), context: context() };
      const output = getSafeBindings(await createActor().run(op, undefined));
      await expect(output.bindingsStream.toArray()).rejects
        .toThrow('Tried to evaluate a SERVICE clause with unbound variable ?endpoint');
    });
  });
});
