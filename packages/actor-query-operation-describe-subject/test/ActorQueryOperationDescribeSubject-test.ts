import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDescribeSubject } from '../lib/ActorQueryOperationDescribeSubject';

const DF = new DataFactory();

describe('ActorQueryOperationDescribeSubject', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        if (arg.operation.input.type === 'join') {
          const patterns = [ ...arg.operation.input.input[0].patterns, ...arg.operation.input.input[1].patterns ];
          return {
            metadata: () => Promise.resolve({
              cardinality: {
                type: 'estimate',
                value: arg.operation.input.input[0].patterns.length + arg.operation.input.input[1].patterns.length,
              },
            }),
            quadStream: new ArrayIterator(patterns.map(
              (pattern: RDF.Quad) => DF.quad(DF.namedNode(pattern.subject.value),
                DF.namedNode(pattern.predicate.value),
                DF.namedNode(pattern.object.value)),
            )),
            type: 'quads',
          };
        }
        return {
          metadata: () => Promise.resolve({
            cardinality: { type: 'estimate', value: arg.operation.input.patterns.length },
          }),
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
      const op: any = { operation: { type: 'describe' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-describe', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without variable terms', () => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          type: 'describe',
          terms: [ DF.namedNode('a'), DF.namedNode('b') ],
          input: { type: 'bgp', patterns: []},
        },
      };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate'), DF.namedNode('__object')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate'), DF.namedNode('__object')),
        ]);
      });
    });

    it('should run with variable terms and an input', () => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [ DF.quad(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ]},
          terms: [ DF.variable('a'), DF.variable('b') ],
          type: 'describe',
        },
      };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('dummy')),
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate0'), DF.namedNode('__object0')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate1'), DF.namedNode('__object1')),
        ]);
      });
    });

    it('should run with and without variable terms and an input', () => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [ DF.quad(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ]},
          terms: [ DF.variable('a'), DF.variable('b'), DF.namedNode('c') ],
          type: 'describe',
        },
      };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 4 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('c'), DF.namedNode('__predicate'), DF.namedNode('__object')),
          DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('dummy')),
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate0'), DF.namedNode('__object0')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate1'), DF.namedNode('__object1')),
        ]);
      });
    });

    it('should handle localizeBlankNodes provided by the context', () => {
      const context = new ActionContext({ name: 'context', [KeysQueryOperation.localizeBlankNodes.name]: true });
      const op: any = {
        context,
        operation: {
          input: { type: 'bgp', patterns: [ DF.quad(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ]},
          terms: [ DF.variable('a'), DF.variable('b'), DF.namedNode('c') ],
          type: 'describe',
        },
      };
      const spyMediator = jest.spyOn(mediatorQueryOperation, 'mediate');

      const result = actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 4 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('c'), DF.namedNode('__predicate'), DF.namedNode('__object')),
          DF.quad(DF.namedNode('a'), DF.namedNode('b'), DF.namedNode('dummy')),
          DF.quad(DF.namedNode('a'), DF.namedNode('__predicate0'), DF.namedNode('__object0')),
          DF.quad(DF.namedNode('b'), DF.namedNode('__predicate1'), DF.namedNode('__object1')),
        ]);
      });
      expect((<IActionQueryOperation>spyMediator.mock.calls[0][0])
        .context.get(KeysQueryOperation.localizeBlankNodes)).toBe(true);
      return result;
    });
  });
});
