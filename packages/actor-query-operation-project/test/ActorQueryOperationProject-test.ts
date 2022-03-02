import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { BlankNodeBindingsScoped, BlankNodeScoped } from '@comunica/data-factory';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationProject } from '../lib/ActorQueryOperationProject';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationProject', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new SingletonIterator(BF.bindings([
          [ DF.variable('a'), DF.literal('A') ],
          [ DF.variable('delet'), DF.literal('deleteMe') ],
        ])),
        metadata: async() => ({ variables: [ DF.variable('a'), DF.variable('delet') ]}),
        operated: arg,
        type: 'bindings',
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
      const op: any = { operation: { type: 'project', input: 'in' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-projects', () => {
      const op: any = { operation: { type: 'bgp', input: 'in' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream with variables that should not be deleted or are missing', () => {
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.variable('delet') ]},
        context: new ActionContext(),
      };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a'), DF.variable('delet') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('A') ],
            [ DF.variable('delet'), DF.literal('deleteMe') ],
          ]),
        ]);
      });
    });

    it('should run on a stream with variables that should be deleted', () => {
      const op: any = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('A') ],
          ]),
        ]);
      });
    });

    it('should error run on a stream with variables that should be deleted and are missing', async() => {
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.variable('missing') ]},
        context: new ActionContext(),
      };
      await expect(actor.run(op)).rejects
        .toThrow('Variables \'?missing\' are used in the projection result, but are not assigned.');
    });

    it('should run on a stream with equal blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]),
        metadata: async() => ({ variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]);
      });
    });

    it('should run on a stream with equal scoped blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('A')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('B')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('C')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]),
        metadata: async() => ({ variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('A')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('B')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeScoped('a', DF.namedNode('C')) ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]);
      });
    });

    it('should run on a stream with binding-scoped blank nodes across bindings', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), new BlankNodeBindingsScoped('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeBindingsScoped('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), new BlankNodeBindingsScoped('a') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]),
        metadata: async() => ({ variables: [ DF.variable('a') ], canContainUndefs: true }),
        operated: arg,
        type: 'bindings',
      });
      const op: any = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a') ], canContainUndefs: true });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a1') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a2') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a3') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]);
      });
    });

    it('should run on a stream with binding-scoped blank nodes within a single bindings object', () => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), new BlankNodeBindingsScoped('a') ],
            [ DF.variable('b'), new BlankNodeBindingsScoped('a') ],
          ]),
        ]),
        metadata: async() => ({ variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = { operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata())
          .toEqual({ variables: [ DF.variable('a') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a1') ],
            [ DF.variable('b'), DF.blankNode('a1') ],
          ]),
        ]);
      });
    });
  });
});
