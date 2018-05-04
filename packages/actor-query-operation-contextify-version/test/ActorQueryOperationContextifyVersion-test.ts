import {ActorQueryOperation, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, namedNode} from "rdf-data-model";
import Factory from "sparqlalgebrajs/lib/Factory";
import {ActorQueryOperationContextifyVersion} from "../lib/ActorQueryOperationContextifyVersion";
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationContextifyVersion', () => {
  let bus;
  let mediatorQueryOperation;
  let baseGraphUri;
  let numericalVersions;
  let actionValidDmAdd;
  let actionValidDmDel;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    baseGraphUri = 'http://ex/g/';
    numericalVersions = true;
    actionValidDmAdd = { context: {},
      operation: {
        expression: {
          expressionType: 'existence',
          input: { type: 'bgp', patterns: [ quad('s', 'p', 'o', 'http://ex/g/1') ] },
          not: true,
          type: 'expression',
        },
        input: { type: 'bgp', patterns: [ quad('s', 'p', 'o', 'http://ex/g/2') ] },
        type: 'filter',
      },
    };
    actionValidDmDel = { context: {},
      operation: {
        expression: {
          expressionType: 'existence',
          input: { type: 'bgp', patterns: [ quad('s', 'p', 'o', 'http://ex/g/2') ] },
          not: true,
          type: 'expression',
        },
        input: { type: 'bgp', patterns: [ quad('s', 'p', 'o', 'http://ex/g/1') ] },
        type: 'filter',
      },
    };
  });

  describe('The ActorQueryOperationContextifyVersion module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationContextifyVersion).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationContextifyVersion constructor', () => {
      expect(new (<any> ActorQueryOperationContextifyVersion)(
        { name: 'actor', bus, mediatorQueryOperation, baseGraphUri, numericalVersions }))
        .toBeInstanceOf(ActorQueryOperationContextifyVersion);
      expect(new (<any> ActorQueryOperationContextifyVersion)(
        { name: 'actor', bus, mediatorQueryOperation, baseGraphUri, numericalVersions }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationContextifyVersion objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationContextifyVersion)(); }).toThrow();
    });
  });

  describe('#unwrapProject', () => {
    it('should unwrap projects', () => {
      return expect(ActorQueryOperationContextifyVersion.unwrapProject({ type: 'project', input: 'a' }))
        .toEqual('a');
    });

    it('should not unwrap other operations', () => {
      return expect(ActorQueryOperationContextifyVersion.unwrapProject({ type: 'other', input: 'a' }))
        .toEqual({ type: 'other', input: 'a' });
    });
  });

  describe('#isSingularBgp', () => {
    it('should be true on a singular BGP', () => {
      return expect(ActorQueryOperationContextifyVersion.isSingularBgp({ type: 'bgp', patterns: ['a'] }))
        .toBeTruthy();
    });

    it('should be false on a non-singular BGP', () => {
      return expect(ActorQueryOperationContextifyVersion.isSingularBgp({ type: 'bgp', patterns: ['a', 'b'] }))
        .toBeFalsy();
    });

    it('should be false on a non-BGP', () => {
      return expect(ActorQueryOperationContextifyVersion.isSingularBgp({ type: 'other' }))
        .toBeFalsy();
    });
  });

  describe('#graphToStringOrNumber', () => {
    it('should convert a graph directly', () => {
      return expect(ActorQueryOperationContextifyVersion.graphToStringOrNumber(
        null, false, 'http://ex/g')).toEqual('http://ex/g');
    });

    it('should take the suffix of a graph', () => {
      return expect(ActorQueryOperationContextifyVersion.graphToStringOrNumber(
        'http://ex/', false, 'http://ex/g')).toEqual('g');
    });

    it('should fail to convert a string-graph directly to a number', () => {
      return expect(ActorQueryOperationContextifyVersion.graphToStringOrNumber(
        null, true, 'http://ex/g')).toEqual(NaN);
    });

    it('should fail to take the number suffix of a string-graph', () => {
      return expect(ActorQueryOperationContextifyVersion.graphToStringOrNumber(
        'http://ex/', true, 'http://ex/g')).toEqual(NaN);
    });

    it('should take the number suffix of a string-graph', () => {
      return expect(ActorQueryOperationContextifyVersion.graphToStringOrNumber(
        'http://ex/g', true, 'http://ex/g1')).toEqual(1);
    });
  });

  describe('An ActorQueryOperationContextifyVersion instance', () => {
    let actor: ActorQueryOperationContextifyVersion;

    beforeEach(() => {
      actor = new ActorQueryOperationContextifyVersion(
        { name: 'actor', bus, mediatorQueryOperation, baseGraphUri, numericalVersions });
    });

    describe('#getContextifiedVersionOperation', () => {
      it('should not convert non-matching operations', () => {
        const action: any = { operation: { type: 'any' }, context: {} };
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should not convert patterns in the default graph', () => {
        const action: any = { context: {},
          operation: quad('s', 'p', 'o') };
        action.operation.type = 'pattern';
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should convert patterns in the non-default graph', () => {
        const action: any = { context: {},
          operation: quad('s', 'p', 'o', 'http://ex/g/1') };
        action.operation.type = 'pattern';
        return expect(actor.getContextifiedVersionOperation(action)).toEqual({
          context: { version: { type: 'version-materialization', version: 1 } },
          operation: new Factory().createPattern(namedNode('s'), namedNode('p'), namedNode('o')),
        });
      });

      it('should not convert an invalid DM', () => {
        const action: any = { context: {},
          operation: {  type: 'none' } };
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should not convert DM with invalid left-input', () => {
        const action: any = { context: {},
          operation: {
            expression: {
              expressionType: 'existence',
              input: { type: 'bgp', patterns: [ 'a' ] },
              not: true,
              type: 'expression',
            },
            input: { type: 'none' },
            type: 'filter',
          },
        };
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should not convert DM with invalid left-expression', () => {
        const action: any = { context: {},
          operation: {
            expression: {
              expressionType: 'existence',
              input: { type: 'none' },
              not: true,
              type: 'expression',
            },
            input: { type: 'bgp', patterns: [ 'a' ] },
            type: 'filter',
          },
        };
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should not convert DM with non-equal inner patterns', () => {
        const action: any = { context: {},
          operation: {
            expression: {
              expressionType: 'existence',
              input: { type: 'bgp', patterns: [ quad('s', 'px', 'o', 'g1') ] },
              not: true,
              type: 'expression',
            },
            input: { type: 'bgp', patterns: [ quad('s', 'p', 'o', 'g2') ] },
            type: 'filter',
          },
        };
        return expect(actor.getContextifiedVersionOperation(action)).toBeFalsy();
      });

      it('should convert a valid DM for additions', () => {
        return expect(actor.getContextifiedVersionOperation(actionValidDmAdd)).toEqual({
          context: { version: {
            queryAdditions: true, type: 'delta-materialization', versionEnd: 2, versionStart: 1 } },
          operation: new Factory().createPattern(namedNode('s'), namedNode('p'), namedNode('o')),
        });
      });

      it('should convert a valid DM for deletions', () => {
        return expect(actor.getContextifiedVersionOperation(actionValidDmDel)).toEqual({
          context: { version: {
            queryAdditions: false, type: 'delta-materialization', versionEnd: 2, versionStart: 1 } },
          operation: new Factory().createPattern(namedNode('s'), namedNode('p'), namedNode('o')),
        });
      });
    });

    it('should test', () => {
      return expect(actor.test(actionValidDmDel)).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test(<any> { context: null })).rejects.toBeTruthy();
    });

    it('should not test with a version context', () => {
      return expect(actor.test(<any> { context: { version: {} } })).rejects.toBeTruthy();
    });

    it('should not test with an invalid operation', () => {
      return expect(actor.test({ operation: { type: 'any' }, context: {} })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return actor.run(actionValidDmDel).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ]);
      });
    });
  });
});
