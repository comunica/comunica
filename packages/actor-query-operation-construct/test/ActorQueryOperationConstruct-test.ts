import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationConstruct } from '../lib/ActorQueryOperationConstruct';

const DF = new DataFactory<RDF.BaseQuad>();
const BF = new BindingsFactory();

describe('ActorQueryOperationConstruct', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => arg.operation.input ?
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
            BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false }),
          operated: arg,
          type: 'bindings',
          variables: [ DF.variable('a') ],
        }) :
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            BF.bindings(),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false }),
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
      const op: any = { operation: { type: 'construct', template: []}, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-construct', () => {
      const op: any = { operation: { type: 'some-other-type', template: []}, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on an empty template', () => {
      const op: any = { operation: { type: 'construct', template: []}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await (<any> output).metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([]);
      });
    });

    it('should run on a template with the empty binding and produce one result', () => {
      const op: any = { operation: { template: [
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.literal('o2')),
      ],
      type: 'construct' },
      context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await (<any> output).metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.blankNode('s10'), DF.namedNode('p1'), DF.literal('o1')),
          DF.quad(DF.blankNode('s20'), DF.namedNode('p2'), DF.literal('o2')),
        ]);
      });
    });

    it('should run on a template with input', () => {
      const op: any = { operation: { input: true,
        template: [
          DF.quad(DF.blankNode('s1'), DF.variable('a'), DF.literal('o1')),
          DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.variable('a'), DF.variable('a')),
        ],
        type: 'construct' },
      context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await (<any> output).metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 6 }, canContainUndefs: false });
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
  });
});
