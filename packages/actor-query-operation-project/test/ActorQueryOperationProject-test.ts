import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {BlankNodeScoped} from "@comunica/data-factory";
import {blankNode, literal, namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator, SingletonIterator} from "asynciterator";
import {ActorQueryOperationProject} from "../lib/ActorQueryOperationProject";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationProject', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
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
        expect((<any> output).metadata()).toEqual('M');
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
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('A') }),
        ]);
      });
    });

    it('should error run on a stream with variables that should be deleted and are missing', async () => {
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a'), variable('missing') ] } };
      return expect(actor.run(op)).rejects
        .toThrow('Variables \'?missing\' are used in the projection result, but are not assigned.');
    });

    it('should run on a stream with equal blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
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
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': blankNode('a1'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a2'), '?b': literal('b') }),
          Bindings({ '?a': blankNode('a3'), '?b': literal('b') }),
        ]);
      });
    });

    it('should run on a stream with equal scoped blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': new BlankNodeScoped('a', namedNode('A')), '?b': literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a', namedNode('B')), '?b': literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a', namedNode('C')), '?b': literal('b') }),
        ]),
        metadata: () => 'M',
        operated: arg,
        type: 'bindings',
        variables: ['?a'],
      });
      const op = { operation: { type: 'project', input: 'in', variables: [ variable('a') ] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect((<any> output).metadata()).toEqual('M');
        expect(output.variables).toEqual([ '?a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': new BlankNodeScoped('a1', namedNode('A')), '?b': literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a2', namedNode('B')), '?b': literal('b') }),
          Bindings({ '?a': new BlankNodeScoped('a3', namedNode('C')), '?b': literal('b') }),
        ]);
      });
    });
  });
});
