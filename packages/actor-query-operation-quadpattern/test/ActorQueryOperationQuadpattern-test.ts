import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, IActionContext, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationQuadpattern } from '../lib/ActorQueryOperationQuadpattern';
import '@comunica/jest';

const quad = require('rdf-quad');

const DF = new DataFactory();
const BF = new BindingsFactory();
const AF = new Factory();

describe('ActorQueryOperationQuadpattern', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorQueryOperationQuadpattern module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationQuadpattern).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationQuadpattern constructor', () => {
      expect(new (<any> ActorQueryOperationQuadpattern)({ name: 'actor', bus, mediatorResolveQuadPattern: {}}))
        .toBeInstanceOf(ActorQueryOperationQuadpattern);
      expect(new (<any> ActorQueryOperationQuadpattern)({ name: 'actor', bus, mediatorResolveQuadPattern: {}}))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationQuadpattern objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationQuadpattern)(); }).toThrow();
    });
  });

  describe('#isTermVariable', () => {
    it('should be true for a variable', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariable(DF.variable('v'))).toBeTruthy();
    });

    it('should be false for a blank node', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariable(DF.blankNode())).toBeFalsy();
    });

    it('should be false for a named node', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariable(DF.namedNode('n'))).toBeFalsy();
    });
  });

  describe('getDuplicateElementLinks', () => {
    it('should return falsy on patterns with different elements', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('s', 'p', 'o', 'g')))
        .toBeFalsy();
    });

    it('should return falsy on patterns with different variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return falsy on patterns when blank nodes and variables have the same value', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '_:v1', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return correctly on patterns with equal subject and predicate variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v4')))
        .toEqual({ subject: [ 'predicate' ]});
    });

    it('should ignore patterns with equal subject and predicate blank nodes', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('_:v1', '_:v1', '?v3', '?v4')))
        .toEqual(undefined);
    });

    it('should return correctly on patterns with equal subject and object variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v4')))
        .toEqual({ subject: [ 'object' ]});
    });

    it('should return correctly on patterns with equal subject and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v1')))
        .toEqual({ subject: [ 'graph' ]});
    });

    it('should return correctly on patterns with equal subject, predicate and object variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v4')))
        .toEqual({ subject: [ 'predicate', 'object' ]});
    });

    it('should return correctly on patterns with equal subject, predicate and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v1')))
        .toEqual({ subject: [ 'predicate', 'graph' ]});
    });

    it('should return correctly on patterns with equal subject, object and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v1')))
        .toEqual({ subject: [ 'object', 'graph' ]});
    });

    it('should return correctly on patterns with equal subject, predicate, object and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v1')))
        .toEqual({ subject: [ 'predicate', 'object', 'graph' ]});
    });

    it('should return correctly on patterns with equal predicate and object variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v4')))
        .toEqual({ predicate: [ 'object' ]});
    });

    it('should return correctly on patterns with equal predicate and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v2')))
        .toEqual({ predicate: [ 'graph' ]});
    });

    it('should return correctly on patterns with equal predicate, object and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v2')))
        .toEqual({ predicate: [ 'object', 'graph' ]});
    });

    it('should return correctly on patterns with equal object and graph variables', () => {
      return expect(ActorQueryOperationQuadpattern.getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v3')))
        .toEqual({ object: [ 'graph' ]});
    });
  });

  describe('validateMetadata', () => {
    it('should throw for empty metadata', () => {
      return expect(() => ActorQueryOperationQuadpattern.validateMetadata({}))
        .toThrowError(`Invalid metadata: missing cardinality in {}`);
    });

    it('should throw for metadata without cardinality', () => {
      return expect(() => ActorQueryOperationQuadpattern.validateMetadata({
        canContainUndefs: false,
        other: true,
      })).toThrowError(`Invalid metadata: missing cardinality in {"canContainUndefs":false,"other":true}`);
    });

    it('should throw for metadata without canContainUndefs', () => {
      return expect(() => ActorQueryOperationQuadpattern.validateMetadata({
        cardinality: 5,
        other: true,
      })).toThrowError(`Invalid metadata: missing canContainUndefs in {"cardinality":5,"other":true}`);
    });

    it('should return true if both have the relevant metadata', () => {
      return expect(ActorQueryOperationQuadpattern.validateMetadata({
        cardinality: 5,
        canContainUndefs: false,
        other: true,
      })).toBeTruthy();
    });
  });

  describe('An ActorQueryOperationQuadpattern instance', () => {
    let actor: ActorQueryOperationQuadpattern;
    let mediatorResolveQuadPattern: any;
    let metadataContent: Partial<MetadataQuads>;

    beforeEach(() => {
      metadataContent = {
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      };
      mediatorResolveQuadPattern = {
        mediate: jest.fn(
          () => {
            const data = new ArrayIterator([
              quad('s1', 'p1', 'o1', 'g1'),
              quad('s2', 'p2', 'o2', 'g2'),
              quad('s3', 'p3', 'o3', 'g3'),
            ]);
            data.setProperty('metadata', metadataContent);
            return Promise.resolve({ data });
          },
        ),
      };
      actor = new ActorQueryOperationQuadpattern({
        name: 'actor',
        bus,
        mediatorResolveQuadPattern,
        unionDefaultGraph: false,
      });
    });

    it('should test on quad pattern operations', () => {
      return expect(actor.test({ operation: <any>{ type: 'pattern' }, context })).resolves.toBeTruthy();
    });

    it('should not test on dummy operations', () => {
      return expect(actor.test(<any> { operation: { type: 'dummy' }})).rejects.toBeTruthy();
    });

    it('should not test on invalid operations', () => {
      return expect(actor.test({ operation: <Algebra.Operation> {}, context })).rejects.toBeTruthy();
    });

    it('should get variables ?s, ?p, ?o, ?g from pattern ?s ?p ?o ?g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.Quad> {
        graph: DF.variable('g'),
        object: DF.variable('o'),
        predicate: DF.variable('p'),
        subject: DF.variable('s'),
      })).toEqual([ DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g') ]);
    });

    it('should not get blank nodes _:s, _:p, _:o, _:g from pattern _:s _:p _:o _:g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.BaseQuad> {
        graph: DF.blankNode('g'),
        object: DF.blankNode('o'),
        predicate: DF.blankNode('p'),
        subject: DF.blankNode('s'),
      })).toEqual([]);
    });

    it('should get variable ?s from pattern ?s p o g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.Quad> {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.namedNode('p'),
        subject: DF.variable('s'),
      })).toEqual([ DF.variable('s') ]);
    });

    it('should get variable ?p from pattern ?p ?p ?p g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.Quad> {
        graph: DF.namedNode('g'),
        object: DF.variable('o'),
        predicate: DF.variable('p'),
        subject: DF.variable('s'),
      })).toEqual([ DF.variable('s'), DF.variable('p'), DF.variable('o') ]);
    });

    it('should run s ?p o g', () => {
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          order: [
            { term: DF.variable('p'), direction: 'asc' },
          ],
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream(
          [
            BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
          ],
        );
      });
    });

    it('should run s ?p o g with custom canContainUndefs metadata', () => {
      metadataContent.canContainUndefs = true;
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          order: [
            { term: DF.variable('p'), direction: 'asc' },
          ],
          canContainUndefs: true,
          variables: [ DF.variable('p') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream(
          [
            BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
          ],
        );
      });
    });

    it('should run s ?p o g without order metadata', () => {
      metadataContent.order = undefined;
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream(
          [
            BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
          ],
        );
      });
    });

    it('should run s ?p o g with custom availableOrders metadata', () => {
      metadataContent.availableOrders = [
        {
          cost: {
            cardinality: { type: 'exact', value: 123 },
            iterations: 1,
            persistedItems: 2,
            blockingItems: 3,
            requestTime: 4,
          },
          terms: [
            { term: 'subject', direction: 'asc' },
            { term: 'predicate', direction: 'asc' },
          ],
        },
        {
          cost: {
            cardinality: { type: 'exact', value: 456 },
            iterations: 1,
            persistedItems: 2,
            blockingItems: 3,
            requestTime: 4,
          },
          terms: [
            { term: 'object', direction: 'desc' },
            { term: 'graph', direction: 'desc' },
          ],
        },
      ];
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          order: [
            { term: DF.variable('p'), direction: 'asc' },
          ],
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
          availableOrders: [
            {
              cost: {
                cardinality: { type: 'exact', value: 123 },
                iterations: 1,
                persistedItems: 2,
                blockingItems: 3,
                requestTime: 4,
              },
              terms: [
                { term: DF.variable('p'), direction: 'asc' },
              ],
            },
            {
              cost: {
                cardinality: { type: 'exact', value: 456 },
                iterations: 1,
                persistedItems: 2,
                blockingItems: 3,
                requestTime: 4,
              },
              terms: [],
            },
          ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream(
          [
            BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
          ],
        );
      });
    });

    it('should run s ?p o g for an empty context', () => {
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          order: [
            { term: DF.variable('p'), direction: 'asc' },
          ],
          canContainUndefs: false,
          variables: [ DF.variable('p') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream(
          [
            BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
            BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
          ],
        );
      });
    });

    it('should run s ?v ?v g with shared variables', () => {
      const operation: any = {
        graph: DF.namedNode('g'),
        object: DF.variable('v'),
        predicate: DF.variable('v'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };

      mediatorResolveQuadPattern = {
        mediate: jest.fn(
          () => {
            const data = new ArrayIterator([
              quad('s1', 'p1', 'o1', 'g1'),
              quad('s2', 'p2', 'o2', 'g2'),
              quad('s3', 'w', 'w', 'g3'),
            ]);
            data.setProperty('metadata', metadataContent);
            return Promise.resolve({ data });
          },
        ),
      };
      actor = new ActorQueryOperationQuadpattern({
        name: 'actor',
        bus,
        mediatorResolveQuadPattern,
        unionDefaultGraph: false,
      });

      return actor.run({ operation, context }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          order: [
            { term: DF.variable('v'), direction: 'asc' },
          ],
          canContainUndefs: false,
          variables: [ DF.variable('v') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('v'), DF.namedNode('w') ]]),
        ]);
      });
    });

    it('should accept a quad-pattern-level context with an operation context', async() => {
      const operation: any = {
        context: new ActionContext({ a: 'overridden' }),
        graph: DF.namedNode('g'),
        object: DF.variable('v'),
        predicate: DF.variable('v'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };

      await actor.run({ operation, context: new ActionContext({ a: 'a', b: 'b' }) });
      expect(mediatorResolveQuadPattern.mediate)
        .toHaveBeenCalledWith({
          context: new ActionContext({
            '@comunica/bus-query-operation:operation': operation,
            a: 'overridden',
            b: 'b',
          }),
          pattern: operation,
        });
    });

    it('should run s ?p o under default non-union default graph semantics', async() => {
      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.defaultGraph(),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
        ],
      );

      expect(mediatorResolveQuadPattern.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        pattern: AF.createPattern(
          DF.namedNode('s'),
          DF.variable('p'),
          DF.namedNode('o'),
          DF.defaultGraph(),
        ),
      });
    });

    it('should run s ?p o under union default graph semantics, defined via actor', async() => {
      actor = new ActorQueryOperationQuadpattern({
        name: 'actor',
        bus,
        mediatorResolveQuadPattern,
        unionDefaultGraph: true,
      });

      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.defaultGraph(),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
        ],
      );

      expect(mediatorResolveQuadPattern.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        pattern: AF.createPattern(
          DF.namedNode('s'),
          DF.variable('p'),
          DF.namedNode('o'),
          DF.variable('__comunica:defaultGraph'),
        ),
      });
    });

    it('should run s ?p o under union default graph semantics, defined via context', async() => {
      context = context.set(KeysQueryOperation.unionDefaultGraph, true);

      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.defaultGraph(),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
        ],
      );

      expect(mediatorResolveQuadPattern.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        pattern: AF.createPattern(
          DF.namedNode('s'),
          DF.variable('p'),
          DF.namedNode('o'),
          DF.variable('__comunica:defaultGraph'),
        ),
      });
    });

    it('should run s ?p o g under union default graph semantics, defined via actor', async() => {
      actor = new ActorQueryOperationQuadpattern({
        name: 'actor',
        bus,
        mediatorResolveQuadPattern,
        unionDefaultGraph: true,
      });

      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.namedNode('g'),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([[ DF.variable('p'), DF.namedNode('p1') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p2') ]]),
          BF.bindings([[ DF.variable('p'), DF.namedNode('p3') ]]),
        ],
      );

      expect(mediatorResolveQuadPattern.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        pattern: AF.createPattern(
          DF.namedNode('s'),
          DF.variable('p'),
          DF.namedNode('o'),
          DF.namedNode('g'),
        ),
      });
    });

    it('should run s ?p o ?g under default non-union default graph semantics', async() => {
      mediatorResolveQuadPattern.mediate = jest.fn(
        () => {
          const data = new ArrayIterator([
            quad('s1', 'p1', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g2'),
            quad('s3', 'p3', 'o3', 'g3'),
            quad('sd', 'pd', 'od'),
          ]);
          data.setProperty('metadata', metadataContent);
          return Promise.resolve({ data });
        },
      );

      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p'), DF.variable('g') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p1') ],
            [ DF.variable('g'), DF.namedNode('g1') ],
          ]),
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p2') ],
            [ DF.variable('g'), DF.namedNode('g2') ],
          ]),
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p3') ],
            [ DF.variable('g'), DF.namedNode('g3') ],
          ]),
        ],
      );
    });

    it('should run s ?p o ?g under union default graph semantics', async() => {
      context = context.set(KeysQueryOperation.unionDefaultGraph, true);
      mediatorResolveQuadPattern.mediate = jest.fn(
        () => {
          const data = new ArrayIterator([
            quad('s1', 'p1', 'o1', 'g1'),
            quad('s2', 'p2', 'o2', 'g2'),
            quad('s3', 'p3', 'o3', 'g3'),
            quad('sd', 'pd', 'od'),
          ]);
          data.setProperty('metadata', metadataContent);
          return Promise.resolve({ data });
        },
      );

      const operation = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const output = <IQueryOperationResultBindings> await actor.run({ operation, context });
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        canContainUndefs: false,
        variables: [ DF.variable('p'), DF.variable('g') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream(
        [
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p1') ],
            [ DF.variable('g'), DF.namedNode('g1') ],
          ]),
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p2') ],
            [ DF.variable('g'), DF.namedNode('g2') ],
          ]),
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('p3') ],
            [ DF.variable('g'), DF.namedNode('g3') ],
          ]),
          BF.bindings([
            [ DF.variable('p'), DF.namedNode('pd') ],
            [ DF.variable('g'), DF.defaultGraph() ],
          ]),
        ],
      );
    });
  });
});
