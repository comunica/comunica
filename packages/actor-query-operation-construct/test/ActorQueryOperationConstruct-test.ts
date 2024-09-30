import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeQuads } from '@comunica/utils-query-operation';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationConstruct } from '../lib/ActorQueryOperationConstruct';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
          metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }}),
          operated: arg,
          type: 'bindings',
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }) :
        Promise.resolve({
          bindingsStream: new ArrayIterator([
            BF.bindings(),
          ], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 1 }}),
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
      expect(() => {
        (<any> ActorQueryOperationConstruct)();
      }).toThrow(`Class constructor ActorQueryOperationConstruct cannot be invoked without 'new'`);
    });
  });

  describe('#getVariables', () => {
    it('should find no variables in the empty array', () => {
      expect(ActorQueryOperationConstruct.getVariables([])).toEqual([]);
    });

    it('should find no variables in patterns without variables', () => {
      expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([]);
    });

    it('should find variables in patterns with variables', () => {
      expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.variable('o1')),
        DF.quad(DF.variable('s2'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([ DF.variable('o1'), DF.variable('s2') ]);
    });

    it('should not find duplicate variables', () => {
      expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.variable('o1')),
        DF.quad(DF.variable('o1'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([ DF.variable('o1') ]);
    });

    it('should find variables in quoted triple patterns with variables', () => {
      expect(ActorQueryOperationConstruct.getVariables([
        DF.quad(
          DF.blankNode('s1'),
          DF.namedNode('p1'),
          DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.variable('o1')),
        ),
        DF.quad(DF.variable('s2'), DF.namedNode('p2'), DF.literal('o2'), DF.namedNode('g2')),
      ])).toEqual([ DF.variable('o1'), DF.variable('s2') ]);
    });
  });

  describe('An ActorQueryOperationConstruct instance', () => {
    let actor: ActorQueryOperationConstruct;

    beforeEach(() => {
      actor = new ActorQueryOperationConstruct({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on construct', async() => {
      const op: any = {
        operation: { type: 'construct', template: []},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-construct', async() => {
      const op: any = {
        operation: { type: 'some-other-type', template: []},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports construct operations, but got some-other-type`);
    });

    it('should run on an empty template', async() => {
      const op: any = {
        operation: { type: 'construct', template: []},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeQuads(await actor.run(op, undefined));
      await expect((<any> output).metadata()).resolves
        .toEqual({ cardinality: { type: 'estimate', value: 0 }});
      expect(output.type).toBe('quads');
      await expect(arrayifyStream(output.quadStream)).resolves.toEqual([]);
    });

    it('should run on a template with the empty binding and produce one result', async() => {
      const op: any = { operation: { template: [
        DF.quad(DF.blankNode('s1'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.literal('o2')),
      ], type: 'construct' }, context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeQuads(await actor.run(op, undefined));
      await expect((<any> output).metadata()).resolves
        .toEqual({ cardinality: { type: 'estimate', value: 2 }});
      expect(output.type).toBe('quads');
      await expect(arrayifyStream(output.quadStream)).resolves.toEqual([
        DF.quad(DF.blankNode('s10'), DF.namedNode('p1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s20'), DF.namedNode('p2'), DF.literal('o2')),
      ]);
    });

    it('should run on a template with input', async() => {
      const op: any = { operation: { input: true, template: [
        DF.quad(DF.blankNode('s1'), DF.variable('a'), DF.literal('o1')),
        DF.quad(DF.blankNode('s2'), DF.namedNode('p2'), DF.variable('a'), DF.variable('a')),
      ], type: 'construct' }, context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeQuads(await actor.run(op, undefined));
      await expect((<any> output).metadata()).resolves
        .toEqual({ cardinality: { type: 'estimate', value: 6 }});
      expect(output.type).toBe('quads');
      await expect(arrayifyStream(output.quadStream)).resolves.toEqual([
        DF.quad(DF.blankNode('s10'), <any>DF.literal('1'), DF.literal('o1')),
        DF.quad(DF.blankNode('s20'), DF.namedNode('p2'), DF.literal('1'), <any>DF.literal('1')),

        DF.quad(DF.blankNode('s11'), <any>DF.literal('2'), DF.literal('o1')),
        DF.quad(DF.blankNode('s21'), DF.namedNode('p2'), DF.literal('2'), <any>DF.literal('2')),

        DF.quad(DF.blankNode('s12'), <any>DF.literal('3'), DF.literal('o1')),
        DF.quad(DF.blankNode('s22'), DF.namedNode('p2'), DF.literal('3'), <any>DF.literal('3')),
      ]);
    });
  });
});
