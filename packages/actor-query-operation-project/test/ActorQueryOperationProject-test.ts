import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { BlankNodeScoped } from '@comunica/data-factory';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationProject } from '../lib/ActorQueryOperationProject';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationProject', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new SingletonIterator(Bindings({ '?a': DF.literal('A'), '_:delet': DF.literal('deleteMe') })),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: [ '?a', '_:delet' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('The ActorQueryOperationProject module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationProject).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationProject constructor', () => {
      expect(new (<any> ActorQueryOperationProject)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationProject);
      expect(new (<any> ActorQueryOperationProject)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationProject objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationProject)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationProject instance', () => {
    let actor: ActorQueryOperationProject;

    beforeEach(() => {
      actor = new ActorQueryOperationProject({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on projects', () => {
      const op = { operation: { type: 'project', input: 'in' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-projects', () => {
      const op = { operation: { type: 'bgp', input: 'in' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream with variables that should not be deleted or are missing', () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.blankNode('delet') ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a', '_:delet' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('A'), '_:delet': DF.literal('deleteMe') }),
        ]);
      });
    });

    it('should run on a stream with variables that should be deleted', () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.literal('A') }),
        ]);
      });
    });

    it('should error run on a stream with variables that should be deleted and are missing', async() => {
      const op = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.variable('missing') ]}};
      await expect(actor.run(op)).rejects
        .toThrow('Variables \'?missing\' are used in the projection result, but are not assigned.');
    });

    it('should run on a stream with equal blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.blankNode('a'), '?b': DF.literal('b') }),
          Bindings({ '?a': DF.blankNode('a'), '?b': DF.literal('b') }),
          Bindings({ '?a': DF.blankNode('a'), '?b': DF.literal('b') }),
        ]),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
        canContainUndefs: true,
      });
      const op = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': DF.blankNode('a1'), '?b': DF.literal('b') }),
          Bindings({ '?a': DF.blankNode('a2'), '?b': DF.literal('b') }),
          Bindings({ '?a': DF.blankNode('a3'), '?b': DF.literal('b') }),
        ]);
      });
    });

    it('should run on a stream with equal scoped blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': new BlankNodeScoped('a', DF.namedNode('A')), '?b': DF.literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a', DF.namedNode('B')), '?b': DF.literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a', DF.namedNode('C')), '?b': DF.literal('b') }),
        ]),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
        canContainUndefs: true,
      });
      const op = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': new BlankNodeScoped('a1', DF.namedNode('A')), '?b': DF.literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a2', DF.namedNode('B')), '?b': DF.literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a3', DF.namedNode('C')), '?b': DF.literal('b') }),
        ]);
      });
    });
  });
});
