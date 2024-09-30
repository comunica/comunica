import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { BlankNodeBindingsScoped, BlankNodeScoped } from '@comunica/utils-data-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationProject } from '../lib/ActorQueryOperationProject';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
        metadata: async() => ({
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('delet'), canBeUndef: false },
          ],
        }),
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
      expect(() => {
        (<any> ActorQueryOperationProject)();
      }).toThrow(`Class constructor ActorQueryOperationProject cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationProject instance', () => {
    let actor: ActorQueryOperationProject;

    beforeEach(() => {
      actor = new ActorQueryOperationProject({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on projects', async() => {
      const op: any = {
        operation: { type: 'project', input: 'in' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-projects', async() => {
      const op: any = {
        operation: { type: 'bgp', input: 'in' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports project operations, but got bgp`);
    });

    it('should run on a stream with variables that should not be deleted or are missing', async() => {
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.variable('delet') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('delet'), canBeUndef: false },
        ]});
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.literal('A') ],
          [ DF.variable('delet'), DF.literal('deleteMe') ],
        ]),
      ]);
    });

    it('should run on a stream with variables that should be deleted', async() => {
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.literal('A') ],
        ]),
      ]);
    });

    it('should handle on a stream with variables that should be deleted and are missing', async() => {
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a'), DF.variable('missing') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };

      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('missing'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.literal('A') ],
        ]),
      ]);
    });

    it('should run on a stream with equal blank nodes across bindings', async() => {
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
        metadata: async() => ({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      expect(output.type).toBe('bindings');
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

    it('should run on a stream with equal scoped blank nodes across bindings', async() => {
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
        metadata: async() => ({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      expect(output.type).toBe('bindings');
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

    it('should run on a stream with binding-scoped blank nodes across bindings', async() => {
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
        metadata: async() => ({ variables: [
          { variable: DF.variable('a'), canBeUndef: true },
        ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: true },
        ]});
      expect(output.type).toBe('bindings');
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

    it('should run on a stream with binding-scoped blank nodes within a single bindings object', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), new BlankNodeBindingsScoped('a') ],
            [ DF.variable('b'), new BlankNodeBindingsScoped('a') ],
          ]),
        ]),
        metadata: async() => ({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]}),
        operated: arg,
        type: 'bindings',
      });
      const op: any = {
        operation: { type: 'project', input: 'in', variables: [ DF.variable('a') ]},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves
        .toEqual({ variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ]});
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.blankNode('a1') ],
          [ DF.variable('b'), DF.blankNode('a1') ],
        ]),
      ]);
    });
  });
});
