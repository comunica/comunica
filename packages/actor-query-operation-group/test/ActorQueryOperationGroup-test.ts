import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActionQueryOperation } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperationGroup } from '../lib/ActorQueryOperationGroup';
import { GroupsState } from '../lib/GroupsState';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

const simpleXYZinput = {
  type: 'bgp',
  patterns: [
    {
      subject: {
        value: 'x',
      },
      predicate: {
        value: 'y',
      },
      object: {
        value: 'z',
      },
      graph: {
        value: '',
      },
      type: 'pattern',
    },
  ],
};

const countY: Algebra.BoundAggregate = {
  type: 'expression',
  expressionType: 'aggregate',
  aggregator: 'count',
  expression: {
    type: 'expression',
    expressionType: 'term',
    term: DF.variable('y'),
  },
  distinct: false,
  variable: DF.variable('count'),
};

const sumZ: Algebra.BoundAggregate = {
  type: 'expression',
  expressionType: 'aggregate',
  aggregator: 'sum',
  expression: {
    type: 'expression',
    expressionType: 'term',
    term: DF.variable('z'),
  },
  distinct: false,
  variable: DF.variable('sum'),
};

const getDefaultMediatorQueryOperation = () => ({
  mediate: (arg: any) => Promise.resolve({
    bindingsStream: new ArrayIterator([
      Bindings({ a: DF.literal('1') }),
      Bindings({ a: DF.literal('2') }),
      Bindings({ a: DF.literal('3') }),
    ], { autoStart: false }),
    metadata: () => Promise.resolve({ totalItems: 3 }),
    operated: arg,
    type: 'bindings',
    variables: [ 'a' ],
  }),
});

interface ICaseOptions {
  inputBindings?: Bindings[];
  groupVariables?: string[];
  inputVariables?: string[];
  aggregates?: Algebra.BoundAggregate[];
  inputOp?: any;
}
interface ICaseOutput {
  actor: ActorQueryOperationGroup; bus: any; mediatorQueryOperation: any; op: IActionQueryOperation;
}

function constructCase(
  { inputBindings, inputVariables = [], groupVariables = [], aggregates = [], inputOp }: ICaseOptions,
): ICaseOutput {
  const bus: any = new Bus({ name: 'bus' });

  // Construct mediator
  const mediatorQueryOperation: any = inputBindings === undefined ?
    getDefaultMediatorQueryOperation() :
    {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator(inputBindings, { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: inputBindings.length }),
        operated: arg,
        type: 'bindings',
        variables: inputVariables,
        canContainUndefs: false,
      }),
    };

  const operation: Algebra.Group = {
    type: 'group',
    input: inputOp,
    variables: groupVariables.map(name => DF.variable(name)) || [],
    aggregates: aggregates || [],
  };
  const op = { operation };

  const actor = new ActorQueryOperationGroup({ name: 'actor', bus, mediatorQueryOperation });
  return { actor, bus, mediatorQueryOperation, op };
}

function int(value: string) {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

function float(value: string) {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#float'));
}

function decimal(value: string) {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
}

describe('ActorQueryOperationGroup', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = getDefaultMediatorQueryOperation();
  });

  describe('The ActorQueryOperationGroup module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationGroup).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationGroup constructor', () => {
      expect(new (<any> ActorQueryOperationGroup)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationGroup);
      expect(new (<any> ActorQueryOperationGroup)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationGroup objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationGroup)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationGroup instance', () => {
    it('should test on group', () => {
      const { actor, op } = constructCase({});
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-group', () => {
      const op = { operation: { type: 'some-other-type' }};
      const { actor } = constructCase({});
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on distinct aggregate', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [{ ...countY, distinct: true }],
      });
      await expect(actor.test(op)).resolves.toEqual(true);
    });

    it('should group on a single var', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('bbb') }),
          Bindings({ '?x': DF.literal('ccc') }),
          Bindings({ '?x': DF.literal('aaa') }),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa') }),
        Bindings({ '?x': DF.literal('bbb') }),
        Bindings({ '?x': DF.literal('ccc') }),
      ]);
      expect(output.variables).toMatchObject([ '?x' ]);
    });

    it('should group on multiple vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
        ],
        groupVariables: [ 'x', 'y' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
        Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb') }),
        Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa') }),
        Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa') }),
      ]);
      expect(output.variables).toMatchObject([ '?x', '?y' ]);
    });

    it('should aggregate single vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa'), '?count': int('3') }),
        Bindings({ '?x': DF.literal('bbb'), '?count': int('1') }),
        Bindings({ '?x': DF.literal('ccc'), '?count': int('1') }),
      ]);
      expect(output.variables).toMatchObject([ '?x', '?count' ]);
    });

    it('should aggregate multiple vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa'), '?z': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb'), '?z': int('2') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa'), '?z': int('3') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa'), '?z': int('4') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa'), '?z': int('5') }),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY, sumZ ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa'), '?count': int('3'), '?sum': int('8') }),
        Bindings({ '?x': DF.literal('bbb'), '?count': int('1'), '?sum': int('3') }),
        Bindings({ '?x': DF.literal('ccc'), '?count': int('1'), '?sum': int('4') }),
      ]);
      expect(output.variables).toMatchObject([ '?x', '?count', '?sum' ]);
    });

    it('should aggregate multi variable distinct', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa'), '?z': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa'), '?z': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa'), '?z': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb'), '?z': int('2') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb'), '?z': int('2') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa'), '?z': int('3') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa'), '?z': int('4') }),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [{ ...countY, distinct: true }, sumZ ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa'), '?count': int('2'), '?sum': int('7') }),
        Bindings({ '?x': DF.literal('bbb'), '?count': int('1'), '?sum': int('3') }),
        Bindings({ '?x': DF.literal('ccc'), '?count': int('1'), '?sum': int('4') }),
      ]);
    });

    it('should aggregate implicit', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('bbb') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': DF.literal('aaa') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('aaa') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?count': int('5') }),
      ]);
      expect(output.variables).toMatchObject([ '?count' ]);
    });

    // https://www.w3.org/TR/sparql11-query/#aggregateExample2
    it('should handle aggregate errors', async() => {
      const sumY: Algebra.BoundAggregate = {
        type: 'expression',
        expressionType: 'aggregate',
        aggregator: 'sum',
        expression: {
          type: 'expression',
          expressionType: 'term',
          term: DF.variable('y'),
        },
        distinct: false,
        variable: DF.variable('sum'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('aaa'), '?y': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': int('1') }),
          Bindings({ '?x': DF.literal('bbb'), '?y': DF.literal('not an int') }),
          Bindings({ '?x': DF.literal('ccc'), '?y': int('1') }),
          Bindings({ '?x': DF.literal('aaa'), '?y': DF.literal('not an int') }),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ sumY ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': DF.literal('aaa') }),
        Bindings({ '?x': DF.literal('bbb') }),
        Bindings({ '?x': DF.literal('ccc'), '?sum': int('1') }),
      ]);
      expect(output.variables).toMatchObject([ '?x', '?sum' ]);
    });

    it('should pass errors in the input stream', async() => {
      const inputBindings = [
        Bindings({ '?x': DF.literal('a'), '?y': int('1') }),
        Bindings({ '?x': DF.literal('b'), '?y': int('2') }),
        Bindings({ '?x': DF.literal('c'), '?y': int('3') }),
      ];
      const bindingsStream = new ArrayIterator(inputBindings).transform({
        autoStart: false,
        transform(result, done, push) {
          push(result);
          bindingsStream.emit('error', 'Test error');
          done();
        },
      });
      const myMediatorQueryOperation = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream,
          metadata: () => Promise.resolve({ totalItems: inputBindings.length }),
          operated: arg,
          type: 'bindings',
          variables: [ 'x', 'y' ],
        }),
      };
      const { op } = constructCase({
        inputBindings: [],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });

      const actor = new ActorQueryOperationGroup({
        name: 'actor',
        bus,
        mediatorQueryOperation: <any> myMediatorQueryOperation,
      });
      await expect((async() => arrayifyStream(await actor.run(op)))())
        .rejects
        .toBeTruthy();
    });

    it('should reject in case something unexpected happens when collecting results', async() => {
      const temp = GroupsState.prototype.collectResults;
      GroupsState.prototype.collectResults = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('test error');
        });
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });
      try {
        await arrayifyStream((<any> await actor.run(op)).bindingsStream);
        fail();
      } catch (error: unknown) {
        expect(() => { throw error; }).toThrowError('test error');
      }
      GroupsState.prototype.collectResults = temp;
    });

    it('should reject in case something unexpected happens when consuming the stream', async() => {
      const temp = GroupsState.prototype.consumeBindings;
      GroupsState.prototype.consumeBindings = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('test error');
        });
      const { op, actor } = constructCase({
        inputBindings: [ Bindings({ '?x': DF.literal('doesn\'t matter') }) ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });
      try {
        await arrayifyStream((<any> await actor.run(op)).bindingsStream);
        fail('BindingStream did not error when it should');
      } catch (error: unknown) {
        expect(() => { throw error; }).toThrowError('test error');
      }
      GroupsState.prototype.consumeBindings = temp;
    });

    const aggregateOn = (aggregator: string, inVar: string, outVar: string): Algebra.BoundAggregate => {
      return {
        type: 'expression',
        expressionType: 'aggregate',
        aggregator: <any> aggregator,
        expression: {
          type: 'expression',
          expressionType: 'term',
          term: DF.variable(inVar),
        },
        distinct: false,
        variable: DF.variable(outVar),
      };
    };

    it('should be able to count', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('count', 'x', 'c') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?c': int('4') }),
      ]);
      expect(output.variables).toMatchObject([ '?c' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to count with respect to empty input with group variables', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [ 'g' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('count', 'x', 'c') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(output.variables).toMatchObject([ '?g', '?c' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to count with respect to empty input without group variables', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('count', 'x', 'c') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?c': int('0') }),
      ]);
      expect(output.variables).toMatchObject([ '?c' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to sum', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sum', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?s': int('10') }),
      ]);
      expect(output.variables).toMatchObject([ '?s' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to sum with respect to empty input', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sum', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?s': int('0') }),
      ]);
      expect(output.variables).toMatchObject([ '?s' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should sum with regard to type promotion', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({ '?x': DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sum', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?s': float('10') }),
      ]);
      expect(output.variables).toMatchObject([ '?s' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to min', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('4') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('1') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('min', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?m': int('1') }),
      ]);
      expect(output.variables).toMatchObject([ '?m' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to min with respect to the empty set', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('min', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({}),
      ]);
      expect(output.variables).toMatchObject([ '?m' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to max', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('max', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?m': int('4') }),
      ]);
      expect(output.variables).toMatchObject([ '?m' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to max with respect to the empty set', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('max', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({}),
      ]);
      expect(output.variables).toMatchObject([ '?m' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to avg', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': float('1') }),
          Bindings({ '?x': float('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({ '?x': float('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('avg', 'x', 'a') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': float('2.5') }),
      ]);
      expect(output.variables).toMatchObject([ '?a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to avg with respect to type preservation', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('avg', 'x', 'a') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': decimal('2.5') }),
      ]);
      expect(output.variables).toMatchObject([ '?a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to avg with respect to empty input', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('avg', 'x', 'a') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': int('0') }),
      ]);
      expect(output.variables).toMatchObject([ '?a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to sample', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sample', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect((await arrayifyStream(output.bindingsStream))[0]).toBeTruthy();
      expect(output.variables).toMatchObject([ '?s' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to sample with respect to the empty input', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sample', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({}),
      ]);
      expect(output.variables).toMatchObject([ '?s' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to group_concat', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('group_concat', 'x', 'g') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?g': DF.literal('1 2 3 4') }),
      ]);
      expect(output.variables).toMatchObject([ '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to group_concat with respect to the empty input', async() => {
      const { op, actor } = constructCase({
        inputBindings: [],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('group_concat', 'x', 'g') ],
      });

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?g': DF.literal('') }),
      ]);
      expect(output.variables).toMatchObject([ '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should be able to group_concat with respect to a custom separator', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('group_concat', 'x', 'g') ],
      });
      op.operation.aggregates[0].separator = ';';

      const output = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?g': DF.literal('1;2;3;4') }),
      ]);
      expect(output.variables).toMatchObject([ '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
    });
  });
});
