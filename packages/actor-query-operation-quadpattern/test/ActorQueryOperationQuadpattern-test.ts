import {ActorQueryOperation} from "@comunica/bus-query-operation";
import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
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

  describe('An ActorQueryOperationQuadpattern instance', () => {
    let actor: ActorQueryOperationQuadpattern;
    let mediator;
    let metadata;

    beforeEach(() => {
      metadata = 'metadata';
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
        graph: { value: 'g', termType: 'Variable' },
        object: { value: 'o', termType: 'Variable' },
        predicate: { value: 'p', termType: 'Variable' },
        subject: { value: 's', termType: 'Variable' },
      })).toEqual([ '?s', '?p', '?o', '?g' ]);
    });

    it('should get blank nodes _:s, _:p, _:o, _:g from pattern _:s _:p _:o _:g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: { value: 'g', termType: 'BlankNode' },
        object: { value: 'o', termType: 'BlankNode' },
        predicate: { value: 'p', termType: 'BlankNode' },
        subject: { value: 's', termType: 'BlankNode' },
      })).toEqual([ '_:s', '_:p', '_:o', '_:g' ]);
    });

    it('should get variable ?s from pattern ?s p o g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: { value: 'g', termType: 'NamedNode' },
        object: { value: 'o', termType: 'NamedNode' },
        predicate: { value: 'p', termType: 'NamedNode' },
        subject: { value: 's', termType: 'Variable' },
      })).toEqual([ '?s'  ]);
    });

    it('should get variable ?p from pattern ?p ?p ?p g', () => {
      return expect(actor.getVariables(<RDF.Quad> {
        graph: { value: 'g', termType: 'NamedNode' },
        object: { value: 'p', termType: 'Variable' },
        predicate: { value: 'p', termType: 'Variable' },
        subject: { value: 'p', termType: 'Variable' },
      })).toEqual([ '?p' ]);
    });

    it('should run s ?p o g', () => {
      const operation = {
        graph: { value: 'g', termType: 'NamedNode' },
        object: { value: 'o', termType: 'NamedNode' },
        predicate: { value: 'p', termType: 'Variable' },
        subject: { value: 's', termType: 'NamedNode' },
        type: 'pattern',
      };
      return actor.run({ operation }).then(async (output) => {
        expect(output.variables).toEqual([ '?p' ]);
        expect(output.metadata).toBe(metadata);
        expect(await arrayifyStream(output.bindingsStream)).toEqual(
          [ Bindings({ '?p': <RDF.Term> { value: 'p1' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p2' } }),
            Bindings({ '?p': <RDF.Term> { value: 'p3' } }),
          ]);
      });
    });
  });
});
