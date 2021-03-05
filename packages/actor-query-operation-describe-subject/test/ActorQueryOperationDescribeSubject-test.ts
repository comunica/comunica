import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputQuads } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorQueryOperationDescribeSubject } from '../lib/ActorQueryOperationDescribeSubject';
const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationDescribeSubject', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        if (arg.operation.input.type === 'join') {
          const patterns = [ ...arg.operation.input.left.patterns, ...arg.operation.input.right.patterns ];
          return {
            metadata: () => Promise.resolve({ totalItems: arg.operation.input.left.patterns.length +
            arg.operation.input.right.patterns.length }),
            quadStream: new ArrayIterator(patterns.map(
              (pattern: RDF.Quad) => DF.quad(DF.namedNode(pattern.subject.value),
                DF.namedNode(pattern.predicate.value),
                DF.namedNode(pattern.object.value)),
            )),
            type: 'quads',
          };
        }
        return {
          metadata: () => Promise.resolve({ totalItems: arg.operation.input.patterns.length }),
          quadStream: new ArrayIterator(arg.operation.input.patterns.map(
            (pattern: RDF.Quad) => DF.quad(DF.namedNode(pattern.subject.value),
              DF.namedNode(pattern.predicate.value),
              DF.namedNode(pattern.object.value)),
          )),
          type: 'quads',
        };
      },
    };
  });

  describe('The ActorQueryOperationDescribeSubject module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationDescribeSubject).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationDescribeSubject constructor', () => {
      expect(new (<any> ActorQueryOperationDescribeSubject)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationDescribeSubject);
      expect(new (<any> ActorQueryOperationDescribeSubject)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationDescribeSubject objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationDescribeSubject)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationDescribeSubject instance', () => {
    let actor: ActorQueryOperationDescribeSubject;

    beforeEach(() => {
      actor = new ActorQueryOperationDescribeSubject({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on describe', () => {
      const op = { operation: { type: 'describe' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-describe', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without variable terms', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: {
          type: 'describe',
          terms: [ DF.namedNode('a'), DF.namedNode('b') ],
          input: { type: 'bgp', patterns: []},
        },
      };
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 2 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate'), DF.namedNode('__object')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate'), DF.namedNode('__object')),
        ]);
      });
    });

    it('should run with variable terms and an input', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [ DF.quad(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ]},
          terms: [ DF.variable('a'), DF.variable('b') ],
          type: 'describe',
        },
      };
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('dummy')),
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate0'), DF.namedNode('__object0')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate1'), DF.namedNode('__object1')),
        ]);
      });
    });

    it('should run with and without variable terms and an input', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [ DF.quad(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ]},
          terms: [ DF.variable('a'), DF.variable('b'), DF.namedNode('c') ],
          type: 'describe',
        },
      };
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 4 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('c'), DF.namedNode('__predicate'), DF.namedNode('__object')),
          DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('dummy')),
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate0'), DF.namedNode('__object0')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate1'), DF.namedNode('__object1')),
        ]);
      });
    });
  });
});
