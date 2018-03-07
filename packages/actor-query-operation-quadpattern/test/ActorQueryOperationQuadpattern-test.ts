import {ActorQueryOperation, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {blankNode, defaultGraph, namedNode, variable} from "rdf-data-model";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";
import {ActorQueryOperationQuadpattern} from "../lib/ActorQueryOperationQuadpattern";
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationQuadpattern', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationQuadpattern module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationQuadpattern).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationQuadpattern constructor', () => {
      expect(new (<any> ActorQueryOperationQuadpattern)({ name: 'actor', bus, mediatorResolveQuadPattern: {} }))
        .toBeInstanceOf(ActorQueryOperationQuadpattern);
      expect(new (<any> ActorQueryOperationQuadpattern)({ name: 'actor', bus, mediatorResolveQuadPattern: {} }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationQuadpattern objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationQuadpattern)(); }).toThrow();
    });
  });

  describe('#isTermVariableOrBlank', () => {
    it('should be true for a variable', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariableOrBlank(variable('v'))).toBeTruthy();
    });

    it('should be true for a blank node', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariableOrBlank(blankNode())).toBeTruthy();
    });

    it('should be false for a named node', () => {
      expect(ActorQueryOperationQuadpattern.isTermVariableOrBlank(namedNode('n'))).toBeFalsy();
    });
  });

  describe('#unionMetadata', () => {
    it('should be 0 for an empty array', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([])()).resolves.toEqual({ totalItems: 0 });
    });

    it('should be 1 for [1]', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([
        () => Promise.resolve({ totalItems: 1 }),
      ])()).resolves.toEqual({ totalItems: 1 });
    });

    it('should be 3 for [1, 2]', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([
        () => Promise.resolve({ totalItems: 1 }),
        () => Promise.resolve({ totalItems: 2 }),
      ])()).resolves.toEqual({ totalItems: 3 });
    });

    it('should be Infinity for [null, 2]', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([
        null,
        () => Promise.resolve({ totalItems: 2 }),
      ])()).resolves.toEqual({ totalItems: Infinity });
    });

    it('should be Infinity for [Infinity, 2]', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([
        () => Promise.resolve({ totalItems: Infinity }),
        () => Promise.resolve({ totalItems: 2 }),
      ])()).resolves.toEqual({ totalItems: Infinity });
    });

    it('should be Infinity for [{}, 2]', () => {
      expect(ActorQueryOperationQuadpattern.unionMetadata([
        () => Promise.resolve({ }),
        () => Promise.resolve({ totalItems: 2 }),
      ])()).resolves.toEqual({ totalItems: Infinity });
    });
  });

  describe('An ActorQueryOperationQuadpattern instance', () => {
    let actor: ActorQueryOperationQuadpattern;
    let mediator;
    let metadata;
    let metadataRaw;

    beforeEach(() => {
      metadataRaw = Promise.resolve({ totalItems: 3 });
      metadata = () => metadataRaw;
      mediator = {
        mediate: () => Promise.resolve({ data: new ArrayIterator([
          quad('s1', 'p1', 'o1', 'g1'),
          quad('s2', 'p2', 'o2', 'g2'),
          quad('s3', 'p3', 'o3', 'g3'),
        ]), metadata }),
      };
      actor = new ActorQueryOperationQuadpattern({ name: 'actor', bus, mediatorResolveQuadPattern: mediator });
    });

    it('should test on quad pattern operations', () => {
      return expect(actor.test({ operation: { type: 'pattern' } })).resolves.toBeTruthy();
    });

    it('should not test on dummy operations', () => {
      return expect(actor.test({ operation: { type: 'dummy' } })).rejects.toBeTruthy();
    });

    it('should not test on invalid operations', () => {
      return expect(actor.test({ operation: <Algebra.Operation> {} })).rejects.toBeTruthy();
    });

    it('should get variables ?s, ?p, ?o, ?g from pattern ?s ?p ?o ?g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: variable('g'),
        object: variable('o'),
        predicate: variable('p'),
        subject: variable('s'),
      })).toEqual([ '?s', '?p', '?o', '?g' ]);
    });

    it('should get blank nodes _:s, _:p, _:o, _:g from pattern _:s _:p _:o _:g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: blankNode('g'),
        object: blankNode('o'),
        predicate: blankNode('p'),
        subject: blankNode('s'),
      })).toEqual([ '_:s', '_:p', '_:o', '_:g' ]);
    });

    it('should get variable ?s from pattern ?s p o g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: namedNode('g'),
        object: namedNode('o'),
        predicate: namedNode('p'),
        subject: variable('s'),
      })).toEqual([ '?s'  ]);
    });

    it('should get variable ?p from pattern ?p ?p ?p g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: namedNode('g'),
        object: variable('o'),
        predicate: variable('p'),
        subject: variable('s'),
      })).toEqual([ '?s', '?p', '?o' ]);
    });

    it('should run s ?p o g', () => {
      const operation = {
        graph: namedNode('g'),
        object: namedNode('o'),
        predicate: variable('p'),
        subject: namedNode('s'),
        type: 'pattern',
      };
      return actor.run({ operation }).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ '?p' ]);
        expect(output.metadata()).toBe(metadataRaw);
        expect(await arrayifyStream(output.bindingsStream)).toEqual(
          [ Bindings({ '?p': <RDF.Term> { value: 'p1' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p2' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p3' } }),
          ]);
      });
    });

    it('should run s ?p o g for an empty context', () => {
      const operation = {
        graph: namedNode('g'),
        object: namedNode('o'),
        predicate: variable('p'),
        subject: namedNode('s'),
        type: 'pattern',
      };
      const context = {};
      return actor.run({ operation, context }).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ '?p' ]);
        expect(output.metadata()).toBe(metadataRaw);
        expect(await arrayifyStream(output.bindingsStream)).toEqual(
          [ Bindings({ '?p': <RDF.Term> { value: 'p1' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p2' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p3' } }),
          ]);
      });
    });
  });
});
