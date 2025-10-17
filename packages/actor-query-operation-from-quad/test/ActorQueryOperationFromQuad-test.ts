import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationFromQuad } from '../lib/ActorQueryOperationFromQuad';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationFromQuad', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]),
        metadata: () => Promise.resolve({
          cardinality: 3,
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
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
      expect(() => {
        (<any> ActorQueryOperationFromQuad)();
      }).toThrow(`Class constructor ActorQueryOperationFromQuad cannot be invoked without 'new'`);
    });
  });

  describe('#applyOperationDefaultGraph', () => {
    it('should transform a BGP with a default graph pattern', () => {
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a BGP with a default graph pattern and keep metadata', () => {
      const metadata = { a: 'b' };
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o'), { type: 'pattern', metadata }) ]),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
      expect(result.patterns[0].metadata).toBe(metadata);
    });

    it('should not transform a BGP with a non-default graph pattern', () => {
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a BGP with default graph patterns', () => {
      const result = <Algebra.Union> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('union');
      expect(result.input[0].type).toBe('bgp');
      expect((<Algebra.Bgp>result.input[0]).patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
      expect(result.input[1].type).toBe('bgp');
      expect((<Algebra.Bgp>result.input[1]).patterns[0].equals(quad('s', 'p', 'o', 'h'))).toBeTruthy();
    });

    it('should not transform a BGP with non-default graph patterns', () => {
      const result = <Algebra.Bgp>ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'gother'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern', () => {
      const result = <Algebra.Path>ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns', () => {
      const result = <Algebra.Union> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('union');
      expect((<Algebra.Path> result.input[0]).type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0])).toBeTruthy();
      expect((<Algebra.Path> result.input[1]).type).toBe('path');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1])).toBeTruthy();
    });

    it('should not transform a Path with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform a Pattern with a default graph pattern', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Pattern with a non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform a Pattern with default graph patterns', () => {
      const result = <Algebra.Union>ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('union');
      expect(result.input[0].type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0])).toBeTruthy();
      expect(result.input[1].type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1])).toBeTruthy();
    });

    it('should not transform a Pattern with non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
        );
      expect(result.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'gother').equals(result)).toBeTruthy();
    });

    it('should transform other types of operations', () => {
      const result = <any> ActorQueryOperationFromQuad
        .applyOperationDefaultGraph(
          AF,
 <any> {
   stuff: [
     { type: 'blabla', input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }) },
     { type: 'someunknownthing', variables: [ DF.variable('V') ]},
   ],
   type: 'bla',
 },
 [ DF.namedNode('g') ],
        );
      expect(result.type).toBe('bla');
      expect(result.stuff).toHaveLength(2);
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input)).toBeTruthy();
      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ DF.variable('V') ]});
    });
  });

  describe('#applyOperationNamedGraph', () => {
    it('should transform a pattern with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a pattern with a variable graph pattern', () => {
      const result = <Algebra.Join>ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('join');
      expect((<Algebra.Values>result.input[0]).type).toBe('values');
      expect((<Algebra.Values>result.input[0]).variables).toHaveLength(1);
      expect((<Algebra.Values>result.input[0]).variables[0]).toEqual(DF.variable('g'));
      expect((<Algebra.Values>result.input[0]).bindings[0].g).toEqual(DF.namedNode('g'));
      expect(result.input[1].type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'g').equals((<Algebra.Bgp>result.input[1]).patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should not transform a pattern with a non-available non-default graph pattern but available as default', () => {
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
          [ DF.namedNode('gother') ],
        );
      expect(result.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'gother').equals(result.patterns[0])).toBeTruthy();
    });

    it('should not transform a pattern with an available non-default graph pattern', () => {
      const result = <Algebra.Bgp>ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }) ]),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a pattern with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a pattern with variable graph patterns', () => {
      const result = <Algebra.Union> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('union');

      const resInput0 = <Algebra.Join> result.input[0];
      expect(resInput0.type).toBe('join');
      const values = <Algebra.Values> resInput0.input[0];
      expect(values.type).toBe('values');
      expect(values.variables).toHaveLength(1);
      expect(values.variables[0]).toEqual(DF.variable('g'));
      expect(values.bindings[0].g).toEqual(DF.namedNode('g'));

      const resInput0Bgp = <Algebra.Bgp> resInput0.input[1];
      expect(resInput0Bgp.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(resInput0Bgp.patterns[0])).toBeTruthy();

      const resInput1 = <Algebra.Join> result.input[1];
      expect(resInput1.type).toBe('join');
      const res1Values = <Algebra.Values> resInput1.input[0];
      expect(res1Values.type).toBe('values');
      expect(res1Values.variables).toHaveLength(1);
      expect(res1Values.variables[0]).toEqual(DF.variable('g'));
      expect(res1Values.bindings[0].g).toEqual(DF.namedNode('h'));
      const res1Bgp = <Algebra.Bgp> resInput1.input[1];
      expect(res1Bgp.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(res1Bgp.patterns[0])).toBeTruthy();
    });

    it('should transform a pattern with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a pattern with available non-default graph patterns', () => {
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          AF.createBgp([ Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }) ]),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('bgp');
      expect(result.patterns[0].equals(quad('s', 'p', 'o', 'g'))).toBeTruthy();
    });

    it('should transform a Path with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Path with a variable graph pattern', () => {
      const result = <Algebra.Join> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('join');
      const values = <Algebra.Values> result.input[0];
      expect(values.type).toBe('values');
      expect(values.variables).toHaveLength(1);
      expect(values.variables[0]).toEqual(DF.variable('g'));
      expect(values.bindings[0].g).toEqual(DF.namedNode('g'));
      expect(result.input[1].type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[1])).toBeTruthy();
    });

    it('should transform a Path with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Path with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform a Path with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Path with variable graph patterns', () => {
      const result = <Algebra.Union> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('union');

      const res0 = <Algebra.Join> result.input[0];
      expect(res0.type).toBe('join');
      const res0Values = <Algebra.Values> res0.input[0];
      expect(res0Values.type).toBe('values');
      expect(res0Values.variables).toHaveLength(1);
      expect(res0Values.variables[0]).toEqual(DF.variable('g'));
      expect(res0Values.bindings[0].g).toEqual(DF.namedNode('g'));
      const res0Bgp = <Algebra.Bgp> res0.input[1];
      expect(res0Bgp.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(res0Bgp)).toBeTruthy();

      const res1 = <Algebra.Join> result.input[1];
      expect(res1.type).toBe('join');
      const res1Values = <Algebra.Values> res1.input[0];
      expect(res1Values.type).toBe('values');
      expect(res1Values.variables).toHaveLength(1);
      expect(res1Values.variables[0]).toEqual(DF.variable('g'));
      expect(res1Values.bindings[0].g).toEqual(DF.namedNode('h'));
      const res1Bgp = <Algebra.Bgp> res1.input[1];
      expect(res1Bgp.type).toBe('path');
      expect(quad('s', 'p', 'o', 'h').equals(res1Bgp)).toBeTruthy();
    });

    it('should not transform a Path with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Path with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'path' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Pattern with a default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Pattern with a variable graph pattern', () => {
      const result = <Algebra.Join> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('join');
      const values = <Algebra.Values> result.input[0];
      expect(values.type).toBe('values');
      expect(values.variables).toHaveLength(1);
      expect(values.variables[0]).toEqual(DF.variable('g'));
      expect(values.bindings[0].g).toEqual(DF.namedNode('g'));
      const pattern = <Algebra.Pattern> result.input[1];
      expect(pattern.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(pattern)).toBeTruthy();
    });

    it('should transform a Pattern with a non-available non-default graph pattern to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Pattern with an available non-default graph pattern', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }),
          [ DF.namedNode('g') ],
          [],
        );
      expect(result.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform a Pattern with default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform a Pattern with variable graph patterns', () => {
      const result = <Algebra.Union> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', '?g'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('union');

      const res0 = <Algebra.Join> result.input[0];
      expect(res0.type).toBe('join');
      const res0Values = <Algebra.Values> res0.input[0];
      expect(res0Values.type).toBe('values');
      expect(res0Values.variables).toHaveLength(1);
      expect(res0Values.variables[0]).toEqual(DF.variable('g'));
      expect(res0Values.bindings[0].g).toEqual(DF.namedNode('g'));
      const res0Pattern = <Algebra.Pattern> res0.input[1];
      expect(res0Pattern.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(res0Pattern)).toBeTruthy();

      const res1 = <Algebra.Join> result.input[1];
      expect(res1.type).toBe('join');
      const res1Values = <Algebra.Values> res1.input[0];
      expect(res1Values.type).toBe('values');
      expect(res1Values.variables).toHaveLength(1);
      expect(res1Values.variables[0]).toEqual(DF.variable('g'));
      expect(res1Values.bindings[0].g).toEqual(DF.namedNode('h'));
      const res1Pattern = <Algebra.Pattern> res1.input[1];
      expect(res1Pattern.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'h').equals(res1Pattern)).toBeTruthy();
    });

    it('should not transform a Pattern with available non-default graph patterns', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'g'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should not transform a Pattern with non-available non-default graph patterns to a no-op', () => {
      const result = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
          Object.assign(quad('s', 'p', 'o', 'gother'), { type: 'pattern' }),
          [ DF.namedNode('g'), DF.namedNode('h') ],
          [],
        );
      expect(result).toEqual({ type: Algebra.Types.BGP, patterns: []});
    });

    it('should transform other types of operations', () => {
      const result = <any> ActorQueryOperationFromQuad
        .applyOperationNamedGraph(
          AF,
 <any> {
   stuff: [
     { type: 'blabla', input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }) },
     { type: 'someunknownthing', variables: [ DF.variable('V') ]},
   ],
   type: 'bla',
 },
 [ DF.namedNode('g') ],
 [],
        );
      expect(result.type).toBe('bla');
      expect(result.stuff).toHaveLength(2);

      expect(result.stuff[0].type).toBe('blabla');
      expect(result.stuff[0].input.type).toBe('join');
      expect(result.stuff[0].input.input[0].type).toBe('values');
      expect(result.stuff[0].input.input[0].variables).toHaveLength(1);
      expect(result.stuff[0].input.input[0].variables[0]).toEqual(DF.variable('g'));
      expect(result.stuff[0].input.input[0].bindings[0].g).toEqual(DF.namedNode('g'));
      expect(result.stuff[0].input.input[1].type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result.stuff[0].input.input[1])).toBeTruthy();

      expect(result.stuff[1]).toEqual({ type: 'someunknownthing', variables: [ DF.variable('V') ]});
    });
  });

  describe('#joinOperations', () => {
    it('should error on an empty array', () => {
      expect(() => ActorQueryOperationFromQuad.joinOperations(AF, []))
        .toThrow(`A join can only be applied on at least one operation`);
    });

    it('should transform an array with length 1', () => {
      expect(ActorQueryOperationFromQuad.joinOperations(AF, [{ type: Algebra.Types.NOP }])).toEqual({ type: 'nop' });
    });

    it('should transform two operations', () => {
      expect(ActorQueryOperationFromQuad.joinOperations(AF, <any> [{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
          ],
          type: 'join',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad
        .joinOperations(AF, <any> [{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
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
      expect(() => ActorQueryOperationFromQuad.unionOperations(AF, []))
        .toThrow(`A union can only be applied on at least one operation`);
    });

    it('should transform an array with length 1', () => {
      expect(ActorQueryOperationFromQuad.unionOperations(AF, [{ type: Algebra.Types.NOP }])).toEqual({ type: 'nop' });
    });

    it('should transform two operations', () => {
      expect(ActorQueryOperationFromQuad.unionOperations(AF, <any> [{ type: 'nop0' }, { type: 'nop1' }]))
        .toEqual({
          input: [
            { type: 'nop0' },
            { type: 'nop1' },
          ],
          type: 'union',
        });
    });

    it('should transform three operations', () => {
      expect(ActorQueryOperationFromQuad
        .unionOperations(AF, <any> [{ type: 'nop0' }, { type: 'nop1' }, { type: 'nop2' }]))
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
      expect(ActorQueryOperationFromQuad.createOperation(AF, pattern))
        .toBe('in');
    });

    it('should transform with one default graph and without named graphs', () => {
      const pattern: any = {
        default: [ DF.namedNode('g') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform with two default graphs and without named graphs', () => {
      const pattern: any = {
        default: [ DF.namedNode('g'), DF.namedNode('h') ],
        input: Object.assign(quad('s', 'p', 'o'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = <Algebra.Union> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('union');
      expect(quad('s', 'p', 'o', 'g').equals(result.input[0])).toBeTruthy();
      expect(quad('s', 'p', 'o', 'h').equals(result.input[1])).toBeTruthy();
    });

    it('should transform with two default graphs and without named graphs over two patterns', () => {
      const pattern: any = {
        default: [ DF.namedNode('g'), DF.namedNode('h') ],
        input: { patterns: [
          Object.assign(quad('s', 'p', 'o1'), { type: 'pattern' }),
          Object.assign(quad('s', 'p', 'o2'), { type: 'pattern' }),
        ], type: Algebra.Types.BGP },
        named: [],
        type: 'from',
      };
      const result = <Algebra.Join> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('join');
      const res0 = <Algebra.Union> result.input[0];
      expect(res0.type).toBe('union');
      const res0_0 = <Algebra.Bgp> res0.input[0];
      expect(res0_0.type).toBe('bgp');
      expect(quad('s', 'p', 'o1', 'g').equals(res0_0.patterns[0])).toBeTruthy();
      const res0_1 = <Algebra.Bgp> res0.input[1];
      expect(res0_1.type).toBe('bgp');
      expect(quad('s', 'p', 'o1', 'h').equals(res0_1.patterns[0])).toBeTruthy();
      const res1 = <Algebra.Union> result.input[1];
      expect(res1.type).toBe('union');
      const res1_0 = <Algebra.Bgp> res1.input[0];
      expect(res1_0.type).toBe('bgp');
      expect(quad('s', 'p', 'o2', 'g').equals(res1_0.patterns[0])).toBeTruthy();
      const res1_1 = <Algebra.Bgp> res1.input[1];
      expect(res1_1.type).toBe('bgp');
      expect(quad('s', 'p', 'o2', 'h').equals(res1_1.patterns[0])).toBeTruthy();
    });

    it('should transform with one default graph and without named graphs over a named graph pattern', () => {
      const pattern: any = {
        default: [ DF.namedNode('g1') ],
        input: Object.assign(quad('s', 'p', 'o', 'g2'), { type: 'path' }),
        named: [],
        type: 'from',
      };
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('bgp');
      expect(result.patterns).toEqual([]);
    });

    it('should transform without default graphs and with one variable named graph', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = <Algebra.Join> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('join');
      const values = <Algebra.Values> result.input[0];
      expect(values.type).toBe('values');
      expect(values.variables).toHaveLength(1);
      expect(values.variables[0]).toEqual(DF.variable('g'));
      expect(values.bindings[0].g).toEqual(DF.namedNode('g'));
      const path = <Algebra.Path> result.input[1];
      expect(path.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(path)).toBeTruthy();
    });

    it('should transform without default graphs and with one IRI named graph that matches', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform without default graphs and with one IRI named graph that does not match', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g1'), { type: 'path' }),
        named: [ DF.namedNode('g2') ],
        type: 'from',
      };
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('bgp');
      expect(result.patterns).toEqual([]);
    });

    it('should transform without default graphs and with two variable named graphs', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', '?g'), { type: 'path' }),
        named: [ DF.namedNode('g'), DF.namedNode('h') ],
        type: 'from',
      };
      const result = <Algebra.Union> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('union');

      const res0 = <Algebra.Join> result.input[0];
      expect(res0.type).toBe('join');
      const res0_0 = <Algebra.Values> res0.input[0];
      expect(res0_0.type).toBe('values');
      expect(res0_0.variables).toHaveLength(1);
      expect(res0_0.variables[0]).toEqual(DF.variable('g'));
      expect(res0_0.bindings[0].g).toEqual(DF.namedNode('g'));
      const res0_1 = <Algebra.Path> res0.input[1];
      expect(res0_1.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(res0_1)).toBeTruthy();

      const res1 = <Algebra.Join> result.input[1];
      expect(res1.type).toBe('join');
      const res1_0 = <Algebra.Values> res1.input[0];
      expect(res1_0.type).toBe('values');
      expect(res1_0.variables).toHaveLength(1);
      expect(res1_0.variables[0]).toEqual(DF.variable('g'));
      expect(res1_0.bindings[0].g).toEqual(DF.namedNode('h'));
      const res1_1 = <Algebra.Path> res1.input[1];
      expect(res1_1.type).toBe('path');
      expect(quad('s', 'p', 'o', 'h').equals(res1_1)).toBeTruthy();
    });

    it('should transform without default graphs and with two IRI named graphs one of which matches', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g'), { type: 'path' }),
        named: [ DF.namedNode('g'), DF.namedNode('h') ],
        type: 'from',
      };
      const result = ActorQueryOperationFromQuad.createOperation(AF, pattern);

      expect(result.type).toBe('path');
      expect(quad('s', 'p', 'o', 'g').equals(result)).toBeTruthy();
    });

    it('should transform without default graphs and with two IRI named graphs none of which match', () => {
      const pattern: any = {
        default: [],
        input: Object.assign(quad('s', 'p', 'o', 'g1'), { type: 'path' }),
        named: [ DF.namedNode('g2'), DF.namedNode('g3') ],
        type: 'from',
      };
      const result = <Algebra.Bgp> ActorQueryOperationFromQuad.createOperation(AF, pattern);

      expect(result.type).toBe('bgp');
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
              type: Algebra.Types.BGP,
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: Algebra.Types.BGP,
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = <Algebra.Join> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('join');

      const res0 = <Algebra.Join> result.input[0];
      expect(res0.type).toBe('join');

      const res0_0 = <Algebra.Values> res0.input[0];
      expect(res0_0.type).toBe('values');
      expect(res0_0.variables).toHaveLength(1);
      expect(res0_0.variables[0]).toEqual(DF.variable('g'));
      expect(res0_0.bindings[0].g).toEqual(DF.namedNode('g'));
      const res0_1 = <Algebra.Bgp> res0.input[1];
      expect(res0_1.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(res0_1.patterns[0])).toBeTruthy();

      const res1 = <Algebra.Bgp> result.input[1];
      expect(res1.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(res1.patterns[0])).toBeTruthy();
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
              type: Algebra.Types.BGP,
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: Algebra.Types.BGP,
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g') ],
        type: 'from',
      };
      const result = <Algebra.Join> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('join');

      const res0 = <Algebra.Bgp> result.input[0];
      expect(result.input[0].type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'g').equals(res0.patterns[0])).toBeTruthy();

      const res1 = <Algebra.Bgp> result.input[1];
      expect(res1.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(res1.patterns[0])).toBeTruthy();
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
              type: Algebra.Types.BGP,
            },
            {
              patterns: [
                Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
              ],
              type: Algebra.Types.BGP,
            },
          ],
          type: 'join',
        },
        named: [ DF.namedNode('g2') ],
        type: 'from',
      };
      const result = <Algebra.Join> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('join');

      const res0 = <Algebra.Bgp> result.input[0];
      expect(res0.type).toBe('bgp');
      expect(res0.patterns).toEqual([]);

      const res1 = <Algebra.Bgp> result.input[1];
      expect(res1.type).toBe('bgp');
      expect(quad('s', 'p', 'o', 'h').equals(res1.patterns[0])).toBeTruthy();
    });

    it('should not transform the template part of a construct operation', () => {
      const pattern: any = {
        default: [ DF.namedNode('g') ],
        input: {
          type: 'construct',
          input: Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          template: [
            Object.assign(quad('s', 'p', 'o'), { type: 'pattern' }),
          ],
        },
        named: [],
        type: 'from',
      };
      const result = <Algebra.Construct> ActorQueryOperationFromQuad.createOperation(AF, pattern);
      expect(result.type).toBe('construct');
      expect(quad('s', 'p', 'o').equals(result.template[0])).toBeTruthy();
      expect(result.input.type).toBe('pattern');
      expect(quad('s', 'p', 'o', 'g').equals(result.input)).toBeTruthy();
    });
  });

  describe('An ActorQueryOperationFromQuad instance', () => {
    let actor: ActorQueryOperationFromQuad;

    beforeEach(() => {
      actor = new ActorQueryOperationFromQuad({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on from', async() => {
      const op: any = { operation: { type: 'from' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-from', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports from operations, but got some-other-type`);
    });

    it('should run', async() => {
      const input = Object.assign(quad('s', 'p', 'o'), { type: 'path' });
      const op: any = {
        operation: { type: 'from', default: [ DF.namedNode('g') ], named: [], input },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(arrayifyStream(output.bindingsStream)).resolves.toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
      expect(output.type).toBe('bindings');
    });
  });
});
