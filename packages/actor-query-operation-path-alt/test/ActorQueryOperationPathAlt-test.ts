import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathAlt } from '../lib/ActorQueryOperationPathAlt';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathAlt', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': DF.literal('1') }),
          Bindings({ '?x': DF.literal('2') }),
          Bindings({ '?x': DF.literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
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
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createAlt(factory.createLink(DF.namedNode('p1')), factory.createLink(DF.namedNode('p2'))),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('3') }),
        Bindings({ '?x': DF.literal('3') }),
      ]);
    });
  });
});
