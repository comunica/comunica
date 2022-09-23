import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { Bindings } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperationGroup } from '../lib/ActorQueryOperationGroup';
import { GroupsState } from '../lib/GroupsState';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

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
  type: Algebra.types.EXPRESSION,
  expressionType: Algebra.expressionTypes.AGGREGATE,
  aggregator: 'count',
  expression: {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.TERM,
    term: DF.variable('y'),
  },
  distinct: false,
  variable: DF.variable('count'),
};

const sumZ: Algebra.BoundAggregate = {
  type: Algebra.types.EXPRESSION,
  expressionType: Algebra.expressionTypes.AGGREGATE,
  aggregator: 'sum',
  expression: {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.TERM,
    term: DF.variable('z'),
  },
  distinct: false,
  variable: DF.variable('sum'),
};

const hashFunction = (bindings: any) => JSON.stringify(bindings);

const getDefaultMediatorQueryOperation = () => ({
  mediate: (arg: any) => Promise.resolve({
    bindingsStream: new ArrayIterator([
      BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
      BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
    ], { autoStart: false }),
    metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
    operated: arg,
    type: 'bindings',
    variables: [ DF.variable('a') ],
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
        metadata: () => Promise.resolve({
          cardinality: inputBindings.length,
          canContainUndefs: false,
          variables: inputVariables.map(name => DF.variable(name)),
        }),
        operated: arg,
        type: 'bindings',
      }),
    };

  const mediatorHashBindings: any = {
    mediate: () => Promise.resolve({ hashFunction }),
  };

  const operation: Algebra.Group = {
    type: Algebra.types.GROUP,
    input: inputOp,
    variables: groupVariables.map(name => DF.variable(name)) || [],
    aggregates: aggregates || [],
  };
  const op: any = { operation, context: new ActionContext() };

  const actor = new ActorQueryOperationGroup({ name: 'actor', bus, mediatorQueryOperation, mediatorHashBindings });
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
  let mediatorHashBindings: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = getDefaultMediatorQueryOperation();
    mediatorHashBindings = {
      mediate: () => Promise.resolve({ hashFunction }),
    };
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

  describe('A GroupState instance', () => {
    it('should throw an error if collectResults is called multiple times', async() => {
      const { actor, op } = constructCase({});
      const temp = new GroupsState(hashFunction, <Algebra.Group> op.operation, {});
      expect(await temp.collectResults()).toBeTruthy();
      await expect(temp.collectResults()).rejects.toThrow('collectResult');
    });

    it('should throw an error if consumeBindings is called after collectResults', async() => {
      const { actor, op } = constructCase({});
      const temp = new GroupsState(hashFunction, <Algebra.Group> op.operation, {});
      expect(await temp.collectResults()).toBeTruthy();
      await expect(temp.consumeBindings(BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]])))
        .rejects.toThrow('collectResult');
    });
  });

  describe('An ActorQueryOperationGroup instance', () => {
    it('should test on group', () => {
      const { actor, op } = constructCase({});
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-group', () => {
      const op: any = { operation: { type: 'some-other-type' }};
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
          BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('bbb') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('ccc') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]]),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('bbb') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('ccc') ]]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [ DF.variable('x') ]});
    });

    it('should group on multiple vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
        ],
        groupVariables: [ 'x', 'y' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.literal('aaa') ],
          [ DF.variable('y'), DF.literal('aaa') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('aaa') ],
          [ DF.variable('y'), DF.literal('bbb') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('bbb') ],
          [ DF.variable('y'), DF.literal('aaa') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('ccc') ],
          [ DF.variable('y'), DF.literal('aaa') ],
        ]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [ DF.variable('x'), DF.variable('y') ]});
    });

    it('should aggregate single vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.literal('aaa') ],
          [ DF.variable('count'), int('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('bbb') ],
          [ DF.variable('count'), int('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('ccc') ],
          [ DF.variable('count'), int('1') ],
        ]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [ DF.variable('x'), DF.variable('count') ]});
    });

    it('should aggregate multiple vars', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
            [ DF.variable('z'), int('2') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('3') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('4') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('5') ],
          ]),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY, sumZ ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.literal('aaa') ],
          [ DF.variable('count'), int('3') ],
          [ DF.variable('sum'), int('8') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('bbb') ],
          [ DF.variable('count'), int('1') ],
          [ DF.variable('sum'), int('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('ccc') ],
          [ DF.variable('count'), int('1') ],
          [ DF.variable('sum'), int('4') ],
        ]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [
        DF.variable('x'),
        DF.variable('count'),
        DF.variable('sum'),
      ]});
    });

    it('should aggregate multi variable distinct', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
            [ DF.variable('z'), int('2') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
            [ DF.variable('z'), int('2') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('3') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), DF.literal('aaa') ],
            [ DF.variable('z'), int('4') ],
          ]),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [{ ...countY, distinct: true }, sumZ ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.literal('aaa') ],
          [ DF.variable('count'), int('2') ],
          [ DF.variable('sum'), int('7') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('bbb') ],
          [ DF.variable('count'), int('1') ],
          [ DF.variable('sum'), int('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('ccc') ],
          [ DF.variable('count'), int('1') ],
          [ DF.variable('sum'), int('4') ],
        ]),
      ]);
    });

    it('should aggregate implicit', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('bbb') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('aaa') ],
          ]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ countY ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('count'), int('5') ],
        ]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [
        DF.variable('count'),
      ]});
    });

    // https://www.w3.org/TR/sparql11-query/#aggregateExample2
    it('should handle aggregate errors', async() => {
      const sumY: Algebra.BoundAggregate = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'sum',
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.TERM,
          term: DF.variable('y'),
        },
        distinct: false,
        variable: DF.variable('sum'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('bbb') ],
            [ DF.variable('y'), DF.literal('not an int') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('ccc') ],
            [ DF.variable('y'), int('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('aaa') ],
            [ DF.variable('y'), DF.literal('not an int') ],
          ]),
        ],
        groupVariables: [ 'x' ],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ sumY ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('aaa') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('bbb') ]]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('ccc') ],
          [ DF.variable('sum'), int('1') ],
        ]),
      ]);
      expect(await output.metadata()).toMatchObject({ variables: [
        DF.variable('x'),
        DF.variable('sum'),
      ]});
    });

    it('should pass errors in the input stream', async() => {
      const inputBindings = [
        BF.bindings([
          [ DF.variable('x'), DF.literal('a') ],
          [ DF.variable('y'), int('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('b') ],
          [ DF.variable('y'), int('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.literal('c') ],
          [ DF.variable('y'), int('3') ],
        ]),
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
          metadata: () => Promise.resolve({ cardinality: inputBindings.length, canContainUndefs: false }),
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
        mediatorHashBindings,
        mediatorQueryOperation: <any> myMediatorQueryOperation,
      });

      await expect(async() => arrayifyStream((<any> await actor.run(op)).bindingsStream))
        .rejects
        .toBeTruthy();
    });

    it('should reject in case something unexpected happens when collecting results', async() => {
      const temp = GroupsState.prototype.collectResults;
      GroupsState.prototype.collectResults = jest
        .fn()
        .mockImplementationOnce(async() => {
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
        .mockImplementation(async() => {
          throw new Error('test error');
        });
      const { op, actor } = constructCase({
        inputBindings: [ BF.bindings([[ DF.variable('x'), DF.literal('doesn\'t matter') ]]) ],
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
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: <any> aggregator,
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.TERM,
          term: DF.variable(inVar),
        },
        distinct: false,
        variable: DF.variable(outVar),
      };
    };

    it('should be able to count', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('count', 'x', 'c') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('c'), int('4') ],
        ]),
      ]);
      expect(await output.metadata()).toEqual({
        cardinality: 4,
        canContainUndefs: false,
        variables: [ DF.variable('c') ],
      });
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
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      expect(await output.metadata()).toEqual({
        cardinality: 0,
        canContainUndefs: false,
        variables: [ DF.variable('g'), DF.variable('c') ],
      });
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('c'), int('0') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('c') ]});
    });

    it('should be able to sum', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sum', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('s'), int('10') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('s') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('s'), int('0') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('s') ]});
    });

    it('should sum with regard to type promotion', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ],
          ]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([
            [ DF.variable('x'), float('3') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ],
          ]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sum', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('s'), float('10') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('s') ]});
    });

    it('should be able to min', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('4') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('min', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('m'), int('1') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('m') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('m') ]});
    });

    it('should be able to max', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('max', 'x', 'm') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('m'), int('4') ]]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('m') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('m') ]});
    });

    it('should be able to avg', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), float('1') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), float('2') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), float('3') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), float('4') ],
          ]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('avg', 'x', 'a') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), float('2.5') ]]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    it('should be able to avg with respect to type preservation', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([
            [ DF.variable('x'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ],
          ]),
          BF.bindings([
            [ DF.variable('x'), int('2') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), int('3') ],
          ]),
          BF.bindings([
            [ DF.variable('x'), DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ],
          ]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('avg', 'x', 'a') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), decimal('2.5') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('a') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), int('0') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    it('should be able to sample', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('sample', 'x', 's') ],
      });

      const output = <any> await actor.run(op);
      expect((await arrayifyStream(output.bindingsStream))[0]).toBeTruthy();
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('s') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('s') ]});
    });

    it('should be able to group_concat', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('group_concat', 'x', 'g') ],
      });

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('g'), DF.literal('1 2 3 4') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('g') ]});
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
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('g'), DF.literal('') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 0, canContainUndefs: false, variables: [ DF.variable('g') ]});
    });

    it('should be able to group_concat with respect to a custom separator', async() => {
      const { op, actor } = constructCase({
        inputBindings: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
        groupVariables: [],
        inputVariables: [ 'x', 'y', 'z' ],
        inputOp: simpleXYZinput,
        aggregates: [ aggregateOn('group_concat', 'x', 'g') ],
      });
      op.operation.aggregates[0].separator = ';';

      const output = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('g'), DF.literal('1;2;3;4') ],
        ]),
      ]);
      expect(await output.metadata())
        .toEqual({ cardinality: 4, canContainUndefs: false, variables: [ DF.variable('g') ]});
    });
  });
});
