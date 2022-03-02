import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathAlt } from '../lib/ActorQueryOperationPathAlt';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathAlt', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ]),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
  });

  describe('The ActorQueryOperationPathAlt module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathAlt).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathAlt constructor', () => {
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathAlt);
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathAlt objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathAlt)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathAlt instance', () => {
    let actor: ActorQueryOperationPathAlt;

    beforeEach(() => {
      actor = new ActorQueryOperationPathAlt({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Alt paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }},
        context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createAlt([
          factory.createLink(DF.namedNode('p1')),
          factory.createLink(DF.namedNode('p2')),
        ]),
        DF.variable('x'),
      ),
      context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 6 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });
  });
});
