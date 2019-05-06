import {ActorQueryOperation, Bindings, IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {blankNode, literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {ActorQueryOperationConstruct} from "../lib/ActorQueryOperationConstruct";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationConstruct', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => arg.operation.input ? Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }) : Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({}),
        ]),
        metadata: () => Promise.resolve({ totalItems: 1 }),
        operated: arg,
        type: 'bindings',
        variables: [],
      }),
    };
  });

  describe('The ActorQueryOperationConstruct module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationConstruct).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationConstruct constructor', () => {
      expect(new (<any> ActorQueryOperationConstruct)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationConstruct);
      expect(new (<any> ActorQueryOperationConstruct)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationConstruct objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationConstruct)(); }).toThrow();
    });
  });

  describe('#getVariables', () => {
    it('should find no variables in the empty array', () => {
      return expect(ActorQueryOperationConstruct.getVariables([])).toEqual([]);
    });

    it('should find no variables in patterns without variables', () => {
      return expect(ActorQueryOperationConstruct.getVariables([
        quad(blankNode('s1'), namedNode('p1'), literal('o1')),
        quad(blankNode('s2'), namedNode('p2'), literal('o2'), namedNode('g2')),
      ])).toEqual([]);
    });

    it('should find variables in patterns with variables', () => {
      return expect(ActorQueryOperationConstruct.getVariables([
        quad(blankNode('s1'), namedNode('p1'), variable('o1')),
        quad(variable('s2'), namedNode('p2'), literal('o2'), namedNode('g2')),
      ])).toEqual([variable('o1'), variable('s2')]);
    });

    it('should not find duplicate variables', () => {
      return expect(ActorQueryOperationConstruct.getVariables([
        quad(blankNode('s1'), namedNode('p1'), variable('o1')),
        quad(variable('o1'), namedNode('p2'), literal('o2'), namedNode('g2')),
      ])).toEqual([variable('o1')]);
    });
  });

  describe('An ActorQueryOperationConstruct instance', () => {
    let actor: ActorQueryOperationConstruct;

    beforeEach(() => {
      actor = new ActorQueryOperationConstruct({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on construct', () => {
      const op = { operation: { type: 'construct', template: [] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-construct', () => {
      const op = { operation: { type: 'some-other-type', template: [] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on an empty template', () => {
      const op = { operation: { type: 'construct', template: [] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([]);
      });
    });

    it('should run on a template with the empty binding and produce one result', () => {
      const op = { operation: { template: [
        quad(blankNode('s1'), namedNode('p1'), literal('o1')),
        quad(blankNode('s2'), namedNode('p2'), literal('o2')),
      ], type: 'construct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          quad(blankNode('s10'), namedNode('p1'), literal('o1')),
          quad(blankNode('s20'), namedNode('p2'), literal('o2')),
        ]);
      });
    });

    it('should run on a template with input', () => {
      const op = { operation: { input: true, template: [
        quad(blankNode('s1'), variable('a'), literal('o1')),
        quad(blankNode('s2'), namedNode('p2'), variable('a'), variable('a')),
      ], type: 'construct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 6 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          quad<RDF.BaseQuad>(blankNode('s10'), literal('1'), literal('o1')),
          quad<RDF.BaseQuad>(blankNode('s20'), namedNode('p2'), literal('1'), literal('1')),

          quad<RDF.BaseQuad>(blankNode('s11'), literal('2'), literal('o1')),
          quad<RDF.BaseQuad>(blankNode('s21'), namedNode('p2'), literal('2'), literal('2')),

          quad<RDF.BaseQuad>(blankNode('s12'), literal('3'), literal('o1')),
          quad<RDF.BaseQuad>(blankNode('s22'), namedNode('p2'), literal('3'), literal('3')),
        ]);
      });
    });

    it('should run on a template with variables when the mediator provides no metadata promise', () => {
      actor = new ActorQueryOperationConstruct({ bus, mediatorQueryOperation: <any> {
        mediate: (arg) => Promise.resolve({
          bindingsStream: new ArrayIterator([]),
          metadata: null,
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        }),
      }, name: 'actor' });
      const op = { operation: { template: [
        quad(blankNode('s1'), variable('a'), literal('o1')),
      ], type: 'construct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(output.metadata).toBeFalsy();
      });
    });

    it('should run on a template with variables when the mediator provides no metadata', () => {
      actor = new ActorQueryOperationConstruct({ bus, mediatorQueryOperation: <any> {
        mediate: (arg) => Promise.resolve({
          bindingsStream: new ArrayIterator([]),
          metadata: () => Promise.resolve(null),
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        }),
      }, name: 'actor' });
      const op = { operation: { template: [
        quad(blankNode('s1'), variable('a'), literal('o1')),
      ], type: 'construct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toBeFalsy();
      });
    });

    it('should run on a template with variables when the mediator provides metadata without totalItems', () => {
      actor = new ActorQueryOperationConstruct({ bus, mediatorQueryOperation: <any> {
        mediate: (arg) => Promise.resolve({
          bindingsStream: new ArrayIterator([]),
          metadata: () => Promise.resolve({}),
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        }),
      }, name: 'actor' });
      const op = { operation: { template: [
        quad(blankNode('s1'), variable('a'), literal('o1')),
      ], type: 'construct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({});
      });
    });
  });
});
