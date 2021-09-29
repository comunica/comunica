import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationFromQuad } from '../lib/ActorQueryOperationFromQuad';
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const DF = new DataFactory();

describe('ActorQueryOperationFromQuad', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
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
        { patterns: [ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
      );
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should not transform a BGP with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
      );
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a BGP with default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
      );
      expect(result.type).toEqual('union');
      expect(result.input[0].type).toEqual('bgp');
      expect(result.input[0].patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
      expect(result.input[1].type).toEqual('bgp');
      expect(result.input[1].patterns[0].equals(quad('s', 'p', 'o', 'h'))).toBeTruthy();
    });

    it('should not transform a BGP with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
      );
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [ DF.namedNode('g') ],
      );
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [ DF.namedNode('g') ],
      );
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ],
      );
      expect(result.type).toEqual('join');
      expect(result.input[0].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0])).toBeTruthy();
      expect(result.input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1])).toBeTruthy();
    });

    it('should not transform a Path with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ],
      );
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform other types of operations', () => {
      const result = ActorQueryOperationFromQuad.applyOperationDefaultGraph(
        <any> {
          stuff: [
            { type: 'blabla', input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }) },
            { type: 'someunknownthing', variables: [ DF.variable('V') ]},
          ],
          type: 'bla',
        }, [ DF.namedNode('g') ],
      );
      expect(result.type).toEqual('bla');
      expect(result.stuff).toHaveLength(2);
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input)).toBeTruthy();
      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ DF.variable('V') ]});
    });
  });

  describe('#applyOperationNamedGraph', () => {
    it('should transform a pattern with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
        [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a pattern with a variable graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
        [],
      );
      expect(result.type).toEqual('join');
      expect(result.input[0].type).toEqual('values');
      expect(result.input[0].variables.length).toEqual(1);
      expect(result.input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[1].patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
        [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should not transform a pattern with a non-available non-default graph pattern but available as default', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
        [ DF.namedNode('gother') ],
      );
      expect(result.type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'gother').equals(result.patterns[0])).toBeTruthy();
    });

    it('should not transform a pattern with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g') ],
        [],
      );
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a pattern with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
        [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a pattern with variable graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
        [],
      );
      expect(result.type).toEqual('union');

      expect(result.input[0].type).toEqual('join');
      expect(result.input[0].input[0].type).toEqual('values');
      expect(result.input[0].input[0].variables.length).toEqual(1);
      expect(result.input[0].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[0].input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0].input[1].patterns[0])).toBeTruthy();

      expect(result.input[1].type).toEqual('join');
      expect(result.input[1].input[0].type).toEqual('values');
      expect(result.input[1].input[0].variables.length).toEqual(1);
      expect(result.input[1].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[1].input[0].bindings[0]['?g']).toEqual(DF.namedNode('h'));
      expect(result.input[1].input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].input[1].patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
        [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a pattern with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        { patterns: [ Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }) ], type: 'bgp' },
        [ DF.namedNode('g'), DF.namedNode('h') ],
        [],
      );
      expect(result.type).toEqual('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [ DF.namedNode('g') ], [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a Path with a variable graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }), [ DF.namedNode('g') ], [],
      );
      expect(result.type).toEqual('join');
      expect(result.input[0].type).toEqual('values');
      expect(result.input[0].variables.length).toEqual(1);
      expect(result.input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[1])).toBeTruthy();
    });

    it('should transform a Path with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [ DF.namedNode('g') ], [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a Path with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }), [ DF.namedNode('g') ], [],
      );
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ], [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform a Path with variable graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ], [],
      );
      expect(result.type).toEqual('union');

      expect(result.input[0].type).toEqual('join');
      expect(result.input[0].input[0].type).toEqual('values');
      expect(result.input[0].input[0].variables.length).toEqual(1);
      expect(result.input[0].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[0].input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0].input[1])).toBeTruthy();

      expect(result.input[1].type).toEqual('join');
      expect(result.input[1].input[0].type).toEqual('values');
      expect(result.input[1].input[0].variables.length).toEqual(1);
      expect(result.input[1].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[1].input[0].bindings[0]['?g']).toEqual(DF.namedNode('h'));
      expect(result.input[1].input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].input[1])).toBeTruthy();
    });

    it('should not transform a Path with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ], [],
      );
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }), [ DF.namedNode('g'), DF.namedNode('h') ], [],
      );
      expect(result).toEqual({ type: 'bgp', patterns: []});
    });

    it('should transform other types of operations', () => {
      const result = ActorQueryOperationFromQuad.applyOperationNamedGraph(
        <any> {
          stuff: [
            { type: 'blabla', input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }) },
            { type: 'someunknownthing', variables: [ DF.variable('V') ]},
          ],
          type: 'bla',
        }, [ DF.namedNode('g') ], [],
      );
      expect(result.type).toEqual('bla');
      expect(result.stuff).toHaveLength(2);

      expect(result.stuff[0].type).toEqual('blabla');
      expect(result.stuff[0].input.type).toEqual('join');
      expect(result.stuff[0].input.input[0].type).toEqual('values');
      expect(result.stuff[0].input.input[0].variables.length).toEqual(1);
      expect(result.stuff[0].input.input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.stuff[0].input.input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.stuff[0].input.input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input.input[1])).toBeTruthy();

      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ DF.variable('V') ]});
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
      expect(ActorQueryOperationFromQuad.joinOperations(<any> [{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
          ],
          type: 'join',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad.joinOperations(<any> [{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
            { type: 'nop2' },
          ],
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
      expect(ActorQueryOperationFromQuad.unionOperations(<any> [{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
          ],
          type: 'union',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad.unionOperations(<any> [{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
            { type: 'nop2' },
          ],
          type: 'union',
        });
    });
  });

  describe('#createOperation', () => {
    it('should transform without default graphs and without named graphs', () => {
      const pattern: any = { type: 'from', default: [], named: [], input: 'in' };
      expect(ActorQueryOperationFromQuad.createOperation(pattern))
        .toEqual('in');
    });

    it('should transform with one default graph and without named graphs', () => {
      const pattern: any = {
        default: [ DF.namedNode('g') ],
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
        default: [ DF.namedNode('g'), DF.namedNode('h') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0])).toBeTruthy();
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1])).toBeTruthy();
    });

    it('should transform with two default graphs and without named graphs over two patterns', () => {
      const pattern: any = {
        default: [ DF.namedNode('g'), DF.namedNode('h') ],
        input: { patterns: [
          Object.assign(quad('s', 'p', 'o1'), { type: 'pattern' }),
          Object.assign(quad('s', 'p', 'o2'), { type: 'pattern' }),
        ],
        type: 'bgp' },
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(result.input[0].type).toEqual('union');
      expect(result.input[0].input[0].type).toEqual('bgp');
      expect(quad('s', 'p', 'o1', 'g').equals(result.input[0].input[0].patterns[0])).toBeTruthy();
      expect(result.input[0].input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o1', 'h').equals(result.input[0].input[1].patterns[0])).toBeTruthy();
      expect(result.input[1].type).toEqual('union');
      expect(result.input[1].input[0].type).toEqual('bgp');
      expect(quad('s', 'p', 'o2', 'g').equals(result.input[1].input[0].patterns[0])).toBeTruthy();
      expect(result.input[1].input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o2', 'h').equals(result.input[1].input[1].patterns[0])).toBeTruthy();
    });

    it('should transform with one default graph and without named graphs over a named graph pattern', () => {
      const pattern: any = {
        default: [ DF.namedNode('g1') ],
        input: Object.assign(quad('s', 'p', 'o', 'g2'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('bgp');
      expect(result.patterns).toEqual([]);
    });

    it('should transform without default graphs and with one variable named graph', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');
      expect(result.input[0].type).toEqual('values');
      expect(result.input[0].variables.length).toEqual(1);
      expect(result.input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[1])).toBeTruthy();
    });

    it('should transform without default graphs and with one IRI named graph that matches', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform without default graphs and with one IRI named graph that does not match', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g1'), { type: 'path' }),
        named: [ DF.namedNode('g2') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('bgp');
      expect(result.patterns).toEqual([]);
    });

    it('should transform without default graphs and with two variable named graphs', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ DF.namedNode('g'), DF.namedNode('h') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('union');

      expect(result.input[0].type).toEqual('join');
      expect(result.input[0].input[0].type).toEqual('values');
      expect(result.input[0].input[0].variables.length).toEqual(1);
      expect(result.input[0].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[0].input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0].input[1])).toBeTruthy();

      expect(result.input[1].type).toEqual('join');
      expect(result.input[1].input[0].type).toEqual('values');
      expect(result.input[1].input[0].variables.length).toEqual(1);
      expect(result.input[1].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[1].input[0].bindings[0]['?g']).toEqual(DF.namedNode('h'));
      expect(result.input[1].input[1].type).toEqual('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].input[1])).toBeTruthy();
    });

    it('should transform without default graphs and with two IRI named graphs one of which matches', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
        named: [ DF.namedNode('g'), DF.namedNode('h') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);

      expect(result.type).toEqual('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform without default graphs and with two IRI named graphs none of which match', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g1'), { type: 'path' }),
        named: [ DF.namedNode('g2'), DF.namedNode('g3') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);

      expect(result.type).toEqual('bgp');
      expect(result.patterns).toEqual([]);
    });

    it('should transform with one default graph and with one variable named graph', () => {
      const pattern: any = {
        default: [ DF.namedNode('h') ],
        input: {
          input: [
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');

      expect(result.input[0].type).toEqual('join');

      expect(result.input[0].input[0].type).toEqual('values');
      expect(result.input[0].input[0].variables.length).toEqual(1);
      expect(result.input[0].input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.input[0].input[0].bindings[0]['?g']).toEqual(DF.namedNode('g'));
      expect(result.input[0].input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0].input[1].patterns[0])).toBeTruthy();

      expect(result.input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].patterns[0])).toBeTruthy();
    });

    it('should transform with one default graph and with one IRI named graph that matches', () => {
      const pattern: any = {
        default: [ DF.namedNode('h') ],
        input: {
          input: [
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');

      expect(result.input[0].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0].patterns[0])).toBeTruthy();

      expect(result.input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].patterns[0])).toBeTruthy();
    });

    it('should transform with one default graph and with one IRI named graph that does not match', () => {
      const pattern: any = {
        default: [ DF.namedNode('h') ],
        input: {
          input: [
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o', 'g1'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: 'bgp',
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g2') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(pattern);
      expect(result.type).toEqual('join');

      expect(result.input[0].type).toEqual('bgp');
      expect(result.input[0].patterns).toEqual([]);

      expect(result.input[1].type).toEqual('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1].patterns[0])).toBeTruthy();
    });
  });

  describe('An ActorQueryOperationFromQuad instance', () => {
    let actor: ActorQueryOperationFromQuad;

    beforeEach(() => {
      actor = new ActorQueryOperationFromQuad({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on from', () => {
      const op: any = { operation: { type: 'from' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-from', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const input = Object.assign(quad('s', 'p', 'o'), { type: 'path' });
      const op: any = { operation: { type: 'from', default: [ DF.namedNode('g') ], named: [], input }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ]);
      expect(await (<any> output).metadata()).toMatchObject(Promise.resolve({ cardinality: 3 }));
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });
  });
});
