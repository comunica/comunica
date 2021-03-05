import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import type { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperationQuadpattern } from '../lib/ActorQueryOperationQuadpattern';
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const DF = new DataFactory();

describe('ActorQueryOperationQuadpattern', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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

  describe('An ActorQueryOperationQuadpattern instance', () => {
    let actor: ActorQueryOperationQuadpattern;
    let mediatorResolveQuadPattern: any;
    let metadataContent: any;

    beforeEach(() => {
      metadataContent = { totalitems: 3 };
      mediatorResolveQuadPattern = {
        mediate: jest.fn(
          ({ context }) => {
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
      actor = new ActorQueryOperationQuadpattern({ name: 'actor', bus, mediatorResolveQuadPattern });
    });

    it('should test on quad pattern operations', () => {
      return expect(actor.test({ operation: { type: 'pattern' }})).resolves.toBeTruthy();
    });

    it('should not test on dummy operations', () => {
      return expect(actor.test({ operation: { type: 'dummy' }})).rejects.toBeTruthy();
    });

    it('should not test on invalid operations', () => {
      return expect(actor.test({ operation: <Algebra.Operation> {}})).rejects.toBeTruthy();
    });

    it('should get variables ?s, ?p, ?o, ?g from pattern ?s ?p ?o ?g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.Quad> {
        graph: DF.variable('g'),
        object: DF.variable('o'),
        predicate: DF.variable('p'),
        subject: DF.variable('s'),
      })).toEqual([ '?s', '?p', '?o', '?g' ]);
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
      })).toEqual([ '?s' ]);
    });

    it('should get variable ?p from pattern ?p ?p ?p g', () => {
      return expect(ActorQueryOperationQuadpattern.getVariables(<RDF.Quad> {
        graph: DF.namedNode('g'),
        object: DF.variable('o'),
        predicate: DF.variable('p'),
        subject: DF.variable('s'),
      })).toEqual([ '?s', '?p', '?o' ]);
    });

    it('should run s ?p o g', () => {
      const operation = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation }).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ '?p' ]);
        expect(await (<any> output).metadata()).toBe(metadataContent);
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual(
          [ Bindings({ '?p': DF.namedNode('p1') }),
            Bindings({ '?p': DF.namedNode('p2') }),
            Bindings({ '?p': DF.namedNode('p3') }),
          ],
        );
      });
    });

    it('should run s ?p o g for an empty context', () => {
      const operation = {
        graph: DF.namedNode('g'),
        object: DF.namedNode('o'),
        predicate: DF.variable('p'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };
      const context = ActionContext({});
      return actor.run({ operation, context }).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ '?p' ]);
        expect(await (<any> output).metadata()).toBe(metadataContent);
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual(
          [ Bindings({ '?p': DF.namedNode('p1') }),
            Bindings({ '?p': DF.namedNode('p2') }),
            Bindings({ '?p': DF.namedNode('p3') }),
          ],
        );
      });
    });

    it('should run s ?v ?v g with shared variables', () => {
      const operation = {
        graph: DF.namedNode('g'),
        object: DF.variable('v'),
        predicate: DF.variable('v'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };

      mediatorResolveQuadPattern = {
        mediate: jest.fn(
          ({ context }) => {
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
      actor = new ActorQueryOperationQuadpattern({ name: 'actor', bus, mediatorResolveQuadPattern });

      return actor.run({ operation }).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ '?v' ]);
        expect(await (<any> output).metadata()).toBe(metadataContent);
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?v': DF.namedNode('w') }),
        ]);
      });
    });

    it('should accept a quad-pattern-level context without an operation context', async() => {
      const operation = {
        context: ActionContext({ a: 'overridden' }),
        graph: DF.namedNode('g'),
        object: DF.variable('v'),
        predicate: DF.variable('v'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };

      await actor.run({ operation });
      expect(mediatorResolveQuadPattern.mediate)
        .toHaveBeenCalledWith({ pattern: operation, context: operation.context });
    });

    it('should accept a quad-pattern-level context with an operation context', async() => {
      const operation = {
        context: ActionContext({ a: 'overridden' }),
        graph: DF.namedNode('g'),
        object: DF.variable('v'),
        predicate: DF.variable('v'),
        subject: DF.namedNode('s'),
        type: 'pattern',
      };

      await actor.run({ operation, context: ActionContext({ a: 'a', b: 'b' }) });
      expect(mediatorResolveQuadPattern.mediate)
        .toHaveBeenCalledWith({
          context: ActionContext({
            '@comunica/bus-query-operation:operation': operation,
            a: 'overridden',
            b: 'b',
          }),
          pattern: operation,
        });
    });
  });
});
