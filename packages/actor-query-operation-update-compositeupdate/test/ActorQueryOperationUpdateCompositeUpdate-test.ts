import type { IActorQueryOperationOutputUpdate } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUpdateCompositeUpdate } from '../lib/ActorQueryOperationUpdateCompositeUpdate';

const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationUpdateCompositeUpdate', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        if (arg.operation === 'INSERT') {
          return Promise.resolve({
            type: 'update',
            updateResult: Promise.resolve(),
            quadStreamInserted: new ArrayIterator([
              DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
              DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
              DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
            ]),
          });
        }
        if (arg.operation === 'DELETE') {
          return Promise.resolve({
            type: 'update',
            updateResult: Promise.resolve(),
            quadStreamDeleted: new ArrayIterator([
              DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('1')),
              DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('2')),
              DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('3')),
            ]),
          });
        }
        if (arg.operation === 'INSERTDELETE') {
          return Promise.resolve({
            type: 'update',
            updateResult: Promise.resolve(),
            quadStreamInserted: new ArrayIterator([
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
            ]),
            quadStreamDeleted: new ArrayIterator([
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
              DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
            ]),
          });
        }
        if (arg.operation === 'INSERTEMPTY') {
          return Promise.resolve({
            type: 'update',
            updateResult: Promise.resolve(),
            quadStreamInserted: new ArrayIterator([]),
          });
        }
        throw new Error(`INVALID OPERATION ${JSON.stringify(arg)}`);
      },
    };
  });

  describe('The ActorQueryOperationUpdateCompositeUpdate module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationUpdateCompositeUpdate).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationUpdateCompositeUpdate constructor', () => {
      expect(new (<any> ActorQueryOperationUpdateCompositeUpdate)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationUpdateCompositeUpdate);
      expect(new (<any> ActorQueryOperationUpdateCompositeUpdate)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationUpdateCompositeUpdate objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationUpdateCompositeUpdate)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationUpdateCompositeUpdate instance', () => {
    let actor: ActorQueryOperationUpdateCompositeUpdate;

    beforeEach(() => {
      actor = new ActorQueryOperationUpdateCompositeUpdate({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on compositeupdate', () => {
      const op = { operation: { type: 'compositeupdate' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-compositeupdate', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without updates', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([]);
    });

    it('should run with one insert', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERT',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([]);
    });

    it('should run with one insert and handling updateResult later', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERT',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([]);
      await expect(output.updateResult).resolves.toBeUndefined();
    });

    it('should run with one three inserts', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERT',
            'INSERT',
            'INSERT',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([]);
    });

    it('should run with one delete', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'DELETE',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('2')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('3')),
      ]);
    });

    it('should run with one insert-delete', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERTDELETE',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
      ]);
    });

    it('should run with one empty insert', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERTEMPTY',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([]);
    });

    it('should run with mixed operations', async() => {
      const op = {
        operation: {
          type: 'compositeupdate',
          updates: [
            'INSERTEMPTY',
            'INSERTDELETE',
            'INSERTEMPTY',
            'DELETE',
            'INSERT',
          ],
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(await arrayifyStream(output.quadStreamInserted)).toEqual([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('1')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.literal('3')),
      ]);
      expect(await arrayifyStream(output.quadStreamDeleted)).toEqual([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('1')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('2')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.literal('3')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.literal('3')),
      ]);
    });
  });
});
