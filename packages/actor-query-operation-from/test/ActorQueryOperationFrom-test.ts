import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, namedNode, variable} from "rdf-data-model";
import {ActorQueryOperationFrom} from "../lib/ActorQueryOperationFrom";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorQueryOperationFrom', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationFrom module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFrom).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFrom constructor', () => {
      expect(new (<any> ActorQueryOperationFrom)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFrom);
      expect(new (<any> ActorQueryOperationFrom)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFrom objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFrom)(); }).toThrow();
    });
  });

  describe('#applyOperationGraph', () => {
    it('should transform a BGP with a default graph pattern', () => {
      const result = ActorQueryOperationFrom.applyOperationGraph({ patterns: [
        quad('s', 'p', 'o'),
      ], type: 'bgp'}, namedNode('g'));
      expect(result.type).toEqual('bgp');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should not transform a BGP with a non-default graph pattern', () => {
      const result = ActorQueryOperationFrom.applyOperationGraph({ patterns: [
        quad('s', 'p', 'o', 'gother'),
      ], type: 'bgp'}, namedNode('g'));
      expect(result.type).toEqual('bgp');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern', () => {
      const result = ActorQueryOperationFrom.applyOperationGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), namedNode('g'));
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with a non-default graph pattern', () => {
      const result = ActorQueryOperationFrom.applyOperationGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), namedNode('g'));
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform other types of operations', () => {
      const result = ActorQueryOperationFrom.applyOperationGraph(
        {
          stuff: [
            { type: 'blabla', input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }) },
            { type: 'someunknownthing', variables: [ variable('V') ] },
          ],
          type: 'bla',
        }, namedNode('g'));
      expect(result.type).toEqual('bla');
      expect(result.stuff).toHaveLength(2);
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input)).toBeTruthy();
      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ variable('V') ] });
    });
  });

  describe('#unionOperations', () => {
    it('should error on an empty array', () => {
      expect(() => ActorQueryOperationFrom.unionOperations([])).toThrow();
    });

    it('should error on an array with length 1', () => {
      expect(() => ActorQueryOperationFrom.unionOperations([{ type: 'nop' }])).toThrow();
    });

    it('should transform two operations', () => {
      expect(ActorQueryOperationFrom.unionOperations([{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          left: { type: 'nop0' },
          right: { type: 'nop1' },
          type: 'union',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFrom.unionOperations([{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
        .toEqual({
          left: { type: 'nop0' },
          right: {
            left: { type: 'nop1' },
            right: { type: 'nop2' },
            type: 'union',
          },
          type: 'union',
        });
    });
  });

  describe('#transformContext', () => {
    describe('without a context', () => {
      it('should not transform without named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: []};
        const context: any = null;
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual(null);
      });

      it('should transform a single named graph', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0')]};
        const context: any = null;
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g0')]});
      });

      it('should transform a two named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0'), namedNode('g1')]};
        const context: any = null;
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g0'), namedNode('g1')]});
      });
    });

    describe('with an empty context', () => {
      it('should not transform without named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: []};
        const context: any = {};
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({});
      });

      it('should transform a single named graph', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0')]};
        const context: any = {};
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g0')]});
      });

      it('should transform a two named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0'), namedNode('g1')]};
        const context: any = {};
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g0'), namedNode('g1')]});
      });
    });

    describe('with an context with existing named graphs', () => {
      it('should not transform without named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: []};
        const context: any = { namedGraphs: [ namedNode('g1') ] };
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g1')]});
      });

      it('should transform a single named graph', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0')]};
        const context: any = { namedGraphs: [ namedNode('g1') ] };
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: []});
      });

      it('should transform a two named graphs', () => {
        const pattern: any = {type: 'from', default: [], named: [namedNode('g0'), namedNode('g1')]};
        const context: any = { namedGraphs: [ namedNode('g1') ] };
        expect(ActorQueryOperationFrom.transformContext(pattern, context))
          .toEqual({namedGraphs: [namedNode('g1')]});
      });
    });
  });

  describe('#createOperation', () => {
    it('should transform without default graphs', () => {
      const pattern: any = {type: 'from', default: [], named: [], input: 'in'};
      expect(ActorQueryOperationFrom.createOperation(pattern))
        .toEqual('in');
    });

    it('should transform with one default graph', () => {
      const pattern: any = {
        default: [ namedNode('g') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFrom.createOperation(pattern);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform with two default graphs', () => {
      const pattern: any = {
        default: [ namedNode('g'), namedNode('h') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFrom.createOperation(pattern);
      expect(result.type).toEqual('union');
      expect(quad('s', 'p', 'o', 'g').equals(result.left)).toBeTruthy();
      expect(quad('s', 'p', 'o', 'h').equals(result.right)).toBeTruthy();
    });
  });

  describe('An ActorQueryOperationFrom instance', () => {
    let actor: ActorQueryOperationFrom;

    beforeEach(() => {
      actor = new ActorQueryOperationFrom({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on from', () => {
      const op = { operation: { type: 'from' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-from', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async () => {
      const input = Object.assign(quad('s', 'p', 'o'), { type: 'path' });
      const op = { operation: { type: 'from', default: [ namedNode('g') ], named: [], input } };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ a: literal('1') }),
        Bindings({ a: literal('2') }),
        Bindings({ a: literal('3') }),
      ]);
      expect(await output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject(['a']);
    });
  });
});
