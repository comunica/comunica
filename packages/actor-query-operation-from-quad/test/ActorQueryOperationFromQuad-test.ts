import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal, namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationFromQuad} from "../lib/ActorQueryOperationFromQuad";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorQueryOperationFromQuad', () => {
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

  describe('The ActorQueryOperationFromQuad module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFromQuad).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFromQuad constructor', () => {
      expect(new (<any> ActorQueryOperationFromQuad)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFromQuad);
      expect(new (<any> ActorQueryOperationFromQuad)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFromQuad objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFromQuad)(); }).toThrow();
    });
  });

  describe('#applyOperationDefaultGraph', () => {
    it('should transform a BGP with a default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o'), { type: 'pattern' })], type: 'bgp' },
      [namedNode('g')]);
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should not transform a BGP with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')]);
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a BGP with default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')]);
      expect(result.type).toEqual('union');
      expect(result.left.type).toEqual('bgp');
      expect(result.left.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
      expect(result.right.type).toEqual('bgp');
      expect(result.right.patterns[0].equals(quad('s', 'p', 'o', 'h'))).toBeTruthy();
    });

    it('should not transform a BGP with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')]);
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [namedNode('g')]);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [namedNode('g')]);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [namedNode('g'), namedNode('h')]);
      expect(result.type).toEqual('join');
      expect(result.left.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.left)).toBeTruthy();
      expect(result.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.right)).toBeTruthy();
    });

    it('should not transform a Path with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [namedNode('g'), namedNode('h')]);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform other types of operations', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        {
          stuff: [
            { type: 'blabla', input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }) },
            { type: 'someunknownthing', variables: [ variable('V') ] },
          ],
          type: 'bla',
        }, [namedNode('g')]);
      expect(result.type).toEqual('bla');
      expect(result.stuff).toHaveLength(2);
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input)).toBeTruthy();
      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ variable('V') ] });
    });
  });

  describe('#applyOperationNamedGraph', () => {
    it('should transform a pattern with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a pattern with a variable graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')], []);
      expect(result.type).toEqual('join');
      expect(result.left.type).toEqual('values');
      expect(result.left.variables.length).toEqual(1);
      expect(result.left.variables[0]).toEqual(variable('g'));
      expect(result.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.right.patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should not transform a pattern with a non-available non-default graph pattern but available as default', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')], [namedNode('gother')]);
      expect(result.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'gother').equals(result.patterns[0])).toBeTruthy();
    });

    it('should not transform a pattern with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g')], []);
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a pattern with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a pattern with variable graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')], []);
      expect(result.type).toEqual('union');

      expect(result.left.type).toEqual('join');
      expect(result.left.left.type).toEqual('values');
      expect(result.left.left.variables.length).toEqual(1);
      expect(result.left.left.variables[0]).toEqual(variable('g'));
      expect(result.left.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.left.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.left.right.patterns[0])).toBeTruthy();

      expect(result.right.type).toEqual('join');
      expect(result.right.left.type).toEqual('values');
      expect(result.right.left.variables.length).toEqual(1);
      expect(result.right.left.variables[0]).toEqual(variable('g'));
      expect(result.right.left.bindings[0]['?g']).toEqual(namedNode('h'));
      expect(result.right.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.right.right.patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a pattern with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' })], type: 'bgp' },
        [namedNode('g'), namedNode('h')], []);
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [namedNode('g')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a Path with a variable graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }), [namedNode('g')], []);
      expect(result.type).toEqual('join');
      expect(result.left.type).toEqual('values');
      expect(result.left.variables.length).toEqual(1);
      expect(result.left.variables[0]).toEqual(variable('g'));
      expect(result.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.right)).toBeTruthy();
    });

    it('should transform a Path with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [namedNode('g')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a Path with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }), [namedNode('g')], []);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [namedNode('g'), namedNode('h')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform a Path with variable graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }), [namedNode('g'), namedNode('h')], []);
      expect(result.type).toEqual('union');

      expect(result.left.type).toEqual('join');
      expect(result.left.left.type).toEqual('values');
      expect(result.left.left.variables.length).toEqual(1);
      expect(result.left.left.variables[0]).toEqual(variable('g'));
      expect(result.left.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.left.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.left.right)).toBeTruthy();

      expect(result.right.type).toEqual('join');
      expect(result.right.left.type).toEqual('values');
      expect(result.right.left.variables.length).toEqual(1);
      expect(result.right.left.variables[0]).toEqual(variable('g'));
      expect(result.right.left.bindings[0]['?g']).toEqual(namedNode('h'));
      expect(result.right.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.right.right)).toBeTruthy();
    });

    it('should not transform a Path with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }), [namedNode('g'), namedNode('h')], []);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [namedNode('g'), namedNode('h')], []);
      expect(result).toEqual({ type: 'bgp', patterns: [] });
    });

    it('should transform other types of operations', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        {
          stuff: [
            { type: 'blabla', input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }) },
            { type: 'someunknownthing', variables: [ variable('V') ] },
          ],
          type: 'bla',
        }, [namedNode('g')], []);
      expect(result.type).toEqual('bla');
      expect(result.stuff).toHaveLength(2);

      expect(result.stuff[0].type).toEqual('blabla');
      expect(result.stuff[0].input.type).toEqual('join');
      expect(result.stuff[0].input.left.type).toEqual('values');
      expect(result.stuff[0].input.left.variables.length).toEqual(1);
      expect(result.stuff[0].input.left.variables[0]).toEqual(variable('g'));
      expect(result.stuff[0].input.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.stuff[0].input.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input.right)).toBeTruthy();

      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ variable('V') ] });
    });
  });

  describe('#joinOperations', () => {
    it('should error on an empty array', () => {
      expect(() => ActorQueryOperationFromQuad.joinOperations([])).toThrow();
    });

    it('should transform an array with length 1', () => {
      expect(ActorQueryOperationFromQuad.joinOperations([{ type: 'nop' }])).toEqual({ type: 'nop' });
    });

    it('should transform two operations', () => {
      expect(ActorQueryOperationFromQuad.joinOperations([{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          left: { type: 'nop0' },
          right: { type: 'nop1' },
          type: 'join',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad.joinOperations([{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
        .toEqual({
          left: { type: 'nop0' },
          right: {
            left: { type: 'nop1' },
            right: { type: 'nop2' },
            type: 'join',
          },
          type: 'join',
        });
    });
  });

  describe('#unionOperations', () => {
    it('should error on an empty array', () => {
      expect(() => ActorQueryOperationFromQuad.unionOperations([])).toThrow();
    });

    it('should transform an array with length 1', () => {
      expect(ActorQueryOperationFromQuad.unionOperations([{ type: 'nop' }])).toEqual({ type: 'nop' });
    });

    it('should transform two operations', () => {
      expect(ActorQueryOperationFromQuad.unionOperations([{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          left: { type: 'nop0' },
          right: { type: 'nop1' },
          type: 'union',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad.unionOperations([{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
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

  describe('#createOperation', () => {
    it('should transform without default graphs and without named graphs', () => {
      const pattern: any = {type: 'from', default: [], named: [], input: 'in'};
      expect(ActorQueryOperationFromQuad.createOperation(pattern))
        .toEqual('in');
    });

    it('should transform with one default graph and without named graphs', () => {
      const pattern: any = {
        default: [ namedNode('g') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform with two default graphs and without named graphs', () => {
      const pattern: any = {
        default: [ namedNode('g'), namedNode('h') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(quad('s', 'p', 'o', 'g').equals(result.left)).toBeTruthy();
      expect(quad('s', 'p', 'o', 'h').equals(result.right)).toBeTruthy();
    });

    it('should transform with two default graphs and without named graphs over two patterns', () => {
      const pattern: any = {
        default: [ namedNode('g'), namedNode('h') ],
        input: { patterns: [
          Object.assign(quad('s', 'p', 'o1'), { type: 'pattern' }),
          Object.assign(quad('s', 'p', 'o2'), { type: 'pattern' }),
        ], type: 'bgp' },
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(result.left.type).toEqual('union');
      expect(result.left.left.type).toEqual('bgp');
      expect(quad('s', 'p', 'o1', 'g').equals(result.left.left.patterns[0])).toBeTruthy();
      expect(result.left.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o1', 'h').equals(result.left.right.patterns[0])).toBeTruthy();
      expect(result.right.type).toEqual('union');
      expect(result.right.left.type).toEqual('bgp');
      expect(quad('s', 'p', 'o2', 'g').equals(result.right.left.patterns[0])).toBeTruthy();
      expect(result.right.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o2', 'h').equals(result.right.right.patterns[0])).toBeTruthy();
    });

    it('should transform without default graphs and with one named graph', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(result.left.type).toEqual('values');
      expect(result.left.variables.length).toEqual(1);
      expect(result.left.variables[0]).toEqual(variable('g'));
      expect(result.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.right)).toBeTruthy();
    });

    it('should transform without default graphs and with two named graphs', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ namedNode('g'), namedNode('h') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('union');

      expect(result.left.type).toEqual('join');
      expect(result.left.left.type).toEqual('values');
      expect(result.left.left.variables.length).toEqual(1);
      expect(result.left.left.variables[0]).toEqual(variable('g'));
      expect(result.left.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.left.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.left.right)).toBeTruthy();

      expect(result.right.type).toEqual('join');
      expect(result.right.left.type).toEqual('values');
      expect(result.right.left.variables.length).toEqual(1);
      expect(result.right.left.variables[0]).toEqual(variable('g'));
      expect(result.right.left.bindings[0]['?g']).toEqual(namedNode('h'));
      expect(result.right.right.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.right.right)).toBeTruthy();
    });

    it('should transform with one default graph and with one named graph', () => {
      const pattern: any = {
        default: [ namedNode('h') ],
        input: {
          left: {
            patterns: [
              Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }),
            ],
            type: 'bgp',
          },
          right: {
            patterns: [
              Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
            ],
            type: 'bgp',
          },
          type: 'join',
        },
        named: [ namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');

      expect(result.left.type).toEqual('join');

      expect(result.left.left.type).toEqual('values');
      expect(result.left.left.variables.length).toEqual(1);
      expect(result.left.left.variables[0]).toEqual(variable('g'));
      expect(result.left.left.bindings[0]['?g']).toEqual(namedNode('g'));
      expect(result.left.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.left.right.patterns[0])).toBeTruthy();

      expect(result.right.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.right.patterns[0])).toBeTruthy();
    });
  });

  describe('An ActorQueryOperationFromQuad instance', () => {
    let actor: ActorQueryOperationFromQuad;

    beforeEach(() => {
      actor = new ActorQueryOperationFromQuad({ name: 'actor', bus, mediatorQueryOperation });
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
