import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputQuads } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorQueryOperationConstruct } from '../lib/ActorQueryOperationConstruct';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory<RDF.BaseQuad>();

describe('ActorQueryOperationConstruct', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => arg.operation.input ?
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            Bindings({ '?a': DF.literal('1') }),
            Bindings({ '?a': DF.literal('2') }),
            Bindings({ '?a': DF.literal('3') }),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        }) :
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            Bindings({}),
          ], { autoStart: false }),
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
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([]);
    });

    it('should find variables in patterns with variables', () => {
      return expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.variable('o1')),
        DF.quad(DF.variable('s2'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([ DF.variable('o1'), DF.variable('s2') ]);
    });

    it('should not find duplicate variables', () => {
      return expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.variable('o1')),
        DF.quad(DF.variable('o1'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([ DF.variable('o1') ]);
    });
  });

  describe('An ActorQueryOperationConstruct instance', () => {
    let actor: ActorQueryOperationConstruct;

    beforeEach(() => {
      actor = new ActorQueryOperationConstruct({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on construct', () => {
      const op = { operation: { type: 'construct', template: []}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-construct', () => {
      const op = { operation: { type: 'some-other-type', template: []}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on an empty template', () => {
      const op = { operation: { type: 'construct', template: []}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 0 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([]);
      });
    });

    it('should run on a template with the empty binding and produce one result', () => {
      const op = { operation: { template: [
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.literal('o2')),
      ],
      type: 'construct' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 2 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.blankNode('s10'), DF.namedNode('p1'), DF.literal('o1')),
          DF.quad(DF.blankNode('s20'), DF.namedNode('p2'), DF.literal('o2')),
        ]);
      });
    });

    it('should run on a template with input', () => {
      const op = { operation: { input: true,
        template: [
          DF.quad(DF.blankNode('s1'), DF.variable('a'), DF.literal('o1')),
          DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.variable('a'), DF.variable('a')),
        ],
        type: 'construct' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 6 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.blankNode('s10'), DF.literal('1'), DF.literal('o1')),
          DF.quad(DF.blankNode('s20'), DF.namedNode('p2'), DF.literal('1'), DF.literal('1')),

          DF.quad(DF.blankNode('s11'), DF.literal('2'), DF.literal('o1')),
          DF.quad(DF.blankNode('s21'), DF.namedNode('p2'), DF.literal('2'), DF.literal('2')),

          DF.quad(DF.blankNode('s12'), DF.literal('3'), DF.literal('o1')),
          DF.quad(DF.blankNode('s22'), DF.namedNode('p2'), DF.literal('3'), DF.literal('3')),
        ]);
      });
    });

    it('should run on a template with variables when the mediator provides no metadata promise', () => {
      actor = new ActorQueryOperationConstruct({ bus,
        mediatorQueryOperation: <any> {
          mediate: (arg: any) => Promise.resolve({
            bindingsStream: new ArrayIterator([]),
            metadata: null,
            operated: arg,
            type: 'bindings',
            variables: [ 'a' ],
          }),
        },
        name: 'actor' });
      const op = { operation: { template: [
        DF.quad(DF.blankNode('s1'), DF.variable('a'), DF.literal('o1')),
      ],
      type: 'construct' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(output.metadata).toBeFalsy();
      });
    });

    it('should run on a template with variables when the mediator provides metadata without totalItems', () => {
      actor = new ActorQueryOperationConstruct({ bus,
        mediatorQueryOperation: <any> {
          mediate: (arg: any) => Promise.resolve({
            bindingsStream: new ArrayIterator([]),
            metadata: () => Promise.resolve({}),
            operated: arg,
            type: 'bindings',
            variables: [ 'a' ],
          }),
        },
        name: 'actor' });
      const op = { operation: { template: [
        DF.quad(DF.blankNode('s1'), DF.variable('a'), DF.literal('o1')),
      ],
      type: 'construct' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({});
      });
    });
  });
});
