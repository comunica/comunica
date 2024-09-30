import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationUpdateDeleteInsert } from '../lib/ActorQueryOperationUpdateDeleteInsert';
import 'jest-rdf';
import '@comunica/utils-jest';

const factory = new Factory();
const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorQueryOperationUpdateDeleteInsert', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorUpdateQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
    mediatorUpdateQuads = {
      mediate: jest.fn(() => Promise.resolve({
        execute: () => Promise.resolve(),
      })),
    };
  });

  describe('The ActorQueryOperationUpdateDeleteInsert module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationUpdateDeleteInsert).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationUpdateDeleteInsert constructor', () => {
      expect(new (<any> ActorQueryOperationUpdateDeleteInsert)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationUpdateDeleteInsert);
      expect(new (<any> ActorQueryOperationUpdateDeleteInsert)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationUpdateDeleteInsert objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationUpdateDeleteInsert)();
      }).toThrow(`Class constructor ActorQueryOperationUpdateDeleteInsert cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationUpdateDeleteInsert instance', () => {
    let actor: ActorQueryOperationUpdateDeleteInsert;

    beforeEach(() => {
      actor = new ActorQueryOperationUpdateDeleteInsert({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorUpdateQuads,
        mediatorMergeBindingsContext,
      });
    });

    it('should test on deleteinsert', async() => {
      const op: any = {
        operation: { type: 'deleteinsert' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on readOnly', async() => {
      const op: any = {
        operation: { type: 'deleteinsert' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-deleteinsert', async() => {
      const op: any = {
        operation: { type: 'some-other-type' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports deleteinsert operations, but got some-other-type`);
    });

    it('should run without operation input', async() => {
      const op: any = {
        operation: { type: 'deleteinsert' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete).toBeUndefined();
    });

    it('should run with insert', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          ],
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).resolves.toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete).toBeUndefined();
    });

    it('should run with delete', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          delete: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          ],
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).resolves.toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
    });

    it('should run with insert and delete', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
          delete: [
            factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          ],
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).resolves.toEqual([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
      ]);
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).resolves.toEqual([
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
    });

    it('should run with insert and where', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert))
        .resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('1')),
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('2')),
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('3')),
        ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete).toBeUndefined();
    });

    it('should run with delete and where', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          delete: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete))
        .resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('1')),
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('2')),
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.literal('3')),
        ]);
    });

    it('should run with insert, delete and where', async() => {
      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.variable('a')),
          ],
          delete: [
            factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert))
        .resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
        ]);
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete))
        .resolves.toBeRdfIsomorphic([
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('2')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('3')),
        ]);
    });

    it('should return a rejecting updateResult when the update actor\'s result rejects', async() => {
      const error = new Error('DeleteInsert error');
      jest.spyOn(mediatorUpdateQuads, 'mediate').mockResolvedValue({
        execute: () => Promise.reject(error),
      });

      const op: any = {
        operation: {
          type: 'deleteinsert',
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).rejects.toBe(error);
    });

    it('should run with insert and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
      });

      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).resolves.toEqual([]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete).toBeUndefined();
    });

    it('should run with delete and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
      });

      const op: any = {
        operation: {
          type: 'deleteinsert',
          delete: [
            factory.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).resolves.toEqual([]);
    });

    it('should run with insert, delete and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
      });

      const op: any = {
        operation: {
          type: 'deleteinsert',
          insert: [
            factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.variable('a')),
          ],
          delete: [
            factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.variable('a')),
          ],
          where: factory.createBgp([]), // Dummy operation
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).resolves.toEqual([]);
      await expect(arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).resolves.toEqual([]);
    });
  });
});
