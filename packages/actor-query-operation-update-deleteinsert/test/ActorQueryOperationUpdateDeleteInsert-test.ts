import type {
  IActorQueryOperationOutputUpdate,
} from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  Bindings, KEY_CONTEXT_READONLY,
} from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationUpdateDeleteInsert } from '../lib/ActorQueryOperationUpdateDeleteInsert';
import 'jest-rdf';

const factory = new Factory();
const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationUpdateDeleteInsert', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorUpdateQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
      }),
    };
    mediatorUpdateQuads = {
      mediate: jest.fn(() => Promise.resolve({
        updateResult: Promise.resolve(),
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
      expect(() => { (<any> ActorQueryOperationUpdateDeleteInsert)(); }).toThrow();
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
      });
    });

    it('should test on deleteinsert', () => {
      const op: any = { operation: { type: 'deleteinsert' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op: any = { operation: { type: 'deleteinsert' }, context: ActionContext({ [KEY_CONTEXT_READONLY]: true }) };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-deleteinsert', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without operation input', async() => {
      const op: any = { operation: { type: 'deleteinsert' }};
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toEqual([
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
      ]);
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toEqual([
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toBeRdfIsomorphic([
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toBeRdfIsomorphic([
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('2')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('3')),
      ]);
    });

    it('should return a rejecting updateResult when the update actor\'s result rejects', async() => {
      const error = new Error('DeleteInsert error');
      mediatorUpdateQuads.mediate = jest.fn(() => Promise.resolve({
        updateResult: Promise.reject(error),
      }));

      const op: any = {
        operation: {
          type: 'deleteinsert',
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).rejects.toBe(error);
    });

    it('should run with insert and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete).toBeUndefined();
    });

    it('should run with delete and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert).toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toEqual([]);
    });

    it('should run with insert, delete and where without matches', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
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
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([]);
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDelete)).toEqual([]);
    });
  });
});
