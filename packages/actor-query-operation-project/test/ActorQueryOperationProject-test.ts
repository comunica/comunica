import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {blankNode, literal, variable} from "@rdfjs/data-model";
import {ArrayIterator, SingletonIterator} from "asynciterator";
import {ActorQueryOperationProject} from "../lib/ActorQueryOperationProject";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationProject', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new SingletonIterator(Bindings({ '?a': literal('A'), '_:delet': literal('deleteMe') })),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: ['?a', '_:delet'],
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
      const op = { operation: { type: 'project', input: 'in' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-projects', () => {
      const op = { operation: { type: 'bgp', input: 'in' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream with variables that should not be deleted or are missing', () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a'), blankNode('delet') ] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a', '_:delet' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('A'), '_:delet': literal('deleteMe') }),
        ]);
      });
    });

    it('should run on a stream with variables that should be deleted', () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a') ] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('A') }),
        ]);
      });
    });

    it('should run on a stream with variables that should be deleted and are missing', () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a'), variable('missing') ] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a', '?missing' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('A'), '?missing': null }),
        ]);
      });
    });

    it('should run on a stream with equal blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': blankNode('a'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a'), '?b': literal('b') }),
        ]),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: ['?a'],
      });
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a') ] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': blankNode('a1'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a2'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a3'), '?b': literal('b') }),
        ]);
      });
    });
  });
});
