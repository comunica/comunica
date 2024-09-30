import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathLink } from '../lib/ActorQueryOperationPathLink';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationPathLink', () => {
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
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      }),
    };
  });

  describe('The ActorQueryOperationPathLink module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathLink).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathLink constructor', () => {
      expect(new (<any> ActorQueryOperationPathLink)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathLink);
      expect(new (<any> ActorQueryOperationPathLink)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathLink objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationPathLink)();
      }).toThrow(`Class constructor ActorQueryOperationPathLink cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathLink instance', () => {
    let actor: ActorQueryOperationPathLink;

    beforeEach(() => {
      actor = new ActorQueryOperationPathLink({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Link paths', async() => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.LINK }}};
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should test on different paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext(),
      };
      await expect(actor.test(op)).resolves.toFailTest(`This Actor only supports link Path operations.`);
    });

    it('should support Link paths', async() => {
      const op: any = { operation: factory
        .createPath(
          DF.namedNode('s'),
          factory.createLink(DF.namedNode('p')),
          DF.variable('x'),
        ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });

    it('should support Link paths with metadata', async() => {
      const op: any = {
        operation: factory
          .createPath(DF.namedNode('s'), factory.createLink(DF.namedNode('p')), DF.variable('x')),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      op.operation.predicate.metadata = { a: 'b' };

      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);

      expect((<any> output).operated.operation.metadata).toEqual({ a: 'b' });
    });
  });
});
