import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';
import * as sparqlee from 'sparqlee';
import { ActorQueryOperationOrderBySparqlee } from '../lib/ActorQueryOperationOrderBySparqlee';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationOrderBySparqlee with mixed term types', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('http://example.com/a') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('http://example.com/b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('a') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.blankNode('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11') ],
          ]),
          BF.bindings([]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending undefined < blank node < named node < literal', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([]),
        BF.bindings([
          [ DF.variable('a'), DF.blankNode('a') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.blankNode('b') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('http://example.com/a') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('http://example.com/b') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11') ],
        ]),
      ]);
    });

    it('should sort as an descending undefined < blank node < named node < literal', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('http://example.com/b') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('http://example.com/a') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.blankNode('b') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.blankNode('a') ],
        ]),
        BF.bindings([]),
      ]);
    });
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('ActorQueryOperationOrderBySparqlee', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('The ActorQueryOperationOrderBySparqlee module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationOrderBySparqlee).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationOrderBySparqlee constructor', () => {
      expect(new (<any> ActorQueryOperationOrderBySparqlee)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(<any> ActorQueryOperationOrderBySparqlee);
      expect(new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationOrderBySparqlee objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationOrderBySparqlee)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let orderB: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;
    let orderA1: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      orderB = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('b') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
      orderA1 = {
        args: [ orderA ],
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'strlen',
        type: Algebra.types.EXPRESSION,
      };
    });

    it('should test on orderby', () => {
      const op: any = { operation: { type: 'orderby', expressions: []}, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on a descending orderby', () => {
      const op: any = { operation: { type: 'orderby', expressions: [ descOrderA ]}, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on multiple expressions', () => {
      const op: any = { operation: { type: 'orderby', expressions: [ orderA, descOrderA, orderA1 ]},
        context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-orderby', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      expect(await ActorQueryOperation.getSafeBindings(output).metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false });
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
      ]);
    });

    it('should run with a window', async() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation, window: 1 });
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      expect(await ActorQueryOperation.getSafeBindings(output).metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false });
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
      ]);
    });

    it('should run operator expressions', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA1 ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      expect(await ActorQueryOperation.getSafeBindings(output).metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false });
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
      ]);
    });

    it('should run descend', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      expect(await ActorQueryOperation.getSafeBindings(output).metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false });
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
      ]);
    });

    it('should ignore undefined results', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      expect(await ActorQueryOperation.getSafeBindings(output).metadata())
        .toEqual({ cardinality: 3, canContainUndefs: false });
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([[ DF.variable('a'), DF.literal('22') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('333') ]]),
      ]);
    });

    it('should emit an error on a hard erroring expression', async() => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]},
        context: new ActionContext() };
      const output = <any> await actor.run(op);
      await new Promise<void>(resolve => output.bindingsStream.on('error', () => resolve()));
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with multiple comparators', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('Vermeulen') ],
            [ DF.variable('b'), DF.literal('Jos') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('Bosmans') ],
            [ DF.variable('b'), DF.literal('Jos') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('Vermeulen') ],
            [ DF.variable('b'), DF.literal('Ben') ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a'), DF.variable('b') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance multiple comparators', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let orderB: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;
    let descOrderB: Algebra.OperatorExpression;
    let orderA1: Algebra.OperatorExpression;
    let orderB1: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      orderB = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('b') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
      descOrderB = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderB ],
      };
      orderA1 = {
        args: [ orderA ],
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'strlen',
        type: Algebra.types.EXPRESSION,
      };
      orderB1 = {
        args: [ orderB ],
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'strlen',
        type: Algebra.types.EXPRESSION,
      };
    });

    it('should order A', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
      ]);
    });

    it('should order B', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
      ]);
    });

    it('should order priority B and secondary A, ascending', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderB, orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
      ]);
    });

    it('descending order A multiple orderby', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
      ]);
    });

    it('descending order B multiple orderby', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderB ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
      ]);
    });

    it('strlen orderby with multiple comparators', async() => {
      // Priority goes to orderB1 then we secondarily sort by orderA1
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderB1, orderA1 ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('Bosmans') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Jos') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('Vermeulen') ],
          [ DF.variable('b'), DF.literal('Ben') ],
        ]),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with integer type', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending integer', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
      ]);
    });

    it('should sort as an descending integer', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with double type', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending double', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
      ]);
    });

    it('should sort as an descending double', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with decimal type', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending decimal', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
      ]);
    });

    it('should sort as an descending decimal', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) ],
        ]),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with float type', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending float', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
      ]);
    });

    it('should sort as an descending float', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) ],
        ]),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with mixed literal types', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should sort as an ascending integer', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) ],
        ]),
      ]);
    });

    it('should sort as an descending integer', async() => {
      const op: any = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]},
        context: new ActionContext() };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        BF.bindings([
          [ DF.variable('a'), DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) ],
        ]),
      ]);
    });
  });
});

describe('Another ActorQueryOperationOrderBySparqlee with mixed types', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.variable('a') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.variable('b') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.variable('c') ],
          ]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: Algebra.types.EXPRESSION, expressionType: Algebra.expressionTypes.TERM, term: DF.variable('a') };
      descOrderA = {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.OPERATOR,
        operator: 'desc',
        args: [ orderA ],
      };
    });

    it('should not sort since its not a literal ascending', async() => {
      try {
        const op: any = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]},
          context: new ActionContext() };
        const output = await actor.run(op);
        const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
        expect(array).toBeFalsy();
      } catch {
        // Is valid
      }
    });
  });
});
