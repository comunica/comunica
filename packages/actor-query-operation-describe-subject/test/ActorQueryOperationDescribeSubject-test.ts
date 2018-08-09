import {ActorQueryOperation, IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationDescribeSubject} from "../lib/ActorQueryOperationDescribeSubject";
const arrayifyStream = require('arrayify-stream');
import * as RDF from "rdf-js";

describe('ActorQueryOperationDescribeSubject', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => {
        if (arg.operation.input.type === 'join') {
          const patterns = arg.operation.input.left.patterns.concat(arg.operation.input.right.patterns);
          return {
            metadata: () => Promise.resolve({ totalItems: arg.operation.input.left.patterns.length
            + arg.operation.input.right.patterns.length }),
            quadStream: new ArrayIterator(patterns.map(
              (pattern: RDF.Quad) => quad(namedNode(pattern.subject.value),
                namedNode(pattern.predicate.value), namedNode(pattern.object.value)))),
            type: 'quads',
          };
        }
        return {
          metadata: () => Promise.resolve({ totalItems: arg.operation.input.patterns.length }),
          quadStream: new ArrayIterator(arg.operation.input.patterns.map(
            (pattern: RDF.Quad) => quad(namedNode(pattern.subject.value),
              namedNode(pattern.predicate.value), namedNode(pattern.object.value)))),
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
      const op = { operation: { type: 'describe' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-describe', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run without variable terms', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: { type: 'describe', terms: [namedNode('a'), namedNode('b')], input: { type: 'bgp', patterns: [] } },
      };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          quad(namedNode('a'), namedNode('__predicate'), namedNode('__object')),
          quad(namedNode('b'), namedNode('__predicate'), namedNode('__object')),
        ]);
      });
    });

    it('should run with variable terms and an input', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [quad(variable('a'), variable('b'), namedNode('dummy'))] },
          terms: [variable('a'), variable('b')],
          type: 'describe',
        },
      };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          quad(namedNode('a'), namedNode('b'), namedNode('dummy')),
          quad(namedNode('a'), namedNode('__predicate0'), namedNode('__object0')),
          quad(namedNode('b'), namedNode('__predicate1'), namedNode('__object1')),
        ]);
      });
    });

    it('should run with and without variable terms and an input', () => {
      const op = {
        context: ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [quad(variable('a'), variable('b'), namedNode('dummy'))] },
          terms: [variable('a'), variable('b'), namedNode('c')],
          type: 'describe',
        },
      };
      return actor.run(op).then(async (output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ totalItems: 4 });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          quad(namedNode('c'), namedNode('__predicate'), namedNode('__object')),
          quad(namedNode('a'), namedNode('b'), namedNode('dummy')),
          quad(namedNode('a'), namedNode('__predicate0'), namedNode('__object0')),
          quad(namedNode('b'), namedNode('__predicate1'), namedNode('__object1')),
        ]);
      });
    });
  });
});
