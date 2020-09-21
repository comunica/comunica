/* eslint-disable mocha/max-top-level-suites */
import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import * as sparqlee from 'sparqlee';
import { ActorQueryOperationOrderBySparqlee } from '../lib/ActorQueryOperationOrderBySparqlee';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationOrderBySparqlee', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.literal('22') }),
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('333') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a' ],
        canContainUndefs: false,
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      orderB = { type: 'expression', expressionType: 'term', term: DF.variable('b') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
      orderA1 = { args: [ orderA ], expressionType: 'operator', operator: 'strlen', type: 'expression' };
    });

    it('should test on orderby', () => {
      const op = { operation: { type: 'orderby', expressions: []}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on a descending orderby', () => {
      const op = { operation: { type: 'orderby', expressions: [ descOrderA ]}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on multiple expressions', () => {
      const op = { operation: { type: 'orderby', expressions: [ orderA, descOrderA, orderA1 ]}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-orderby', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      expect(ActorQueryOperation.getSafeBindings(output).canContainUndefs).toEqual(false);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('22') }),
        Bindings({ '?a': DF.literal('333') }),
      ]);
    });

    it('should run with a window', async() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation, window: 1 });
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      expect(ActorQueryOperation.getSafeBindings(output).canContainUndefs).toEqual(false);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('22') }),
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('333') }),
      ]);
    });

    it('should run operator expressions', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA1 ]}};
      const output = await actor.run(op);
      expect(ActorQueryOperation.getSafeBindings(output).canContainUndefs).toEqual(false);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('22') }),
        Bindings({ '?a': DF.literal('333') }),
      ]);
    });

    it('should run descend', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      expect(ActorQueryOperation.getSafeBindings(output).canContainUndefs).toEqual(false);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('333') }),
        Bindings({ '?a': DF.literal('22') }),
        Bindings({ '?a': DF.literal('1') }),
      ]);
    });

    it('should ignore undefined results', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]}};
      const output = await actor.run(op);
      expect(ActorQueryOperation.getSafeBindings(output).canContainUndefs).toEqual(false);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('22') }),
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('333') }),
      ]);
    });

    it('should emit an error on a hard erroring expression', async next => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]}};
      const output = <any> await actor.run(op);
      output.bindingsStream.on('error', () => next());
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
          Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
          Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
          Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ '?a', '?b' ],
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      orderB = { type: 'expression', expressionType: 'term', term: DF.variable('b') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
      descOrderB = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderB ]};
      orderA1 = { args: [ orderA ], expressionType: 'operator', operator: 'strlen', type: 'expression' };
      orderB1 = { args: [ orderB ], expressionType: 'operator', operator: 'strlen', type: 'expression' };
    });

    it('should order A', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
      ]);
    });

    it('should order B', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderB ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
      ]);
    });

    it('should order priority B and secondary A, ascending', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderB, orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
      ]);
    });

    it('descending order A multiple orderby', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
      ]);
    });

    it('descending order B multiple orderby', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderB ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
      ]);
    });

    it('strlen orderby with multiple comparators', async() => {
      // Priority goes to orderB1 then we secondarily sort by orderA1
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderB1, orderA1 ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('Bosmans'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Jos') }),
        Bindings({ '?a': DF.literal('Vermeulen'), '?b': DF.literal('Ben') }),
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
          Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
          Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
          Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should sort as an ascending integer', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
      ]);
    });

    it('should sort as an descending integer', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
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
          Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
          Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
          Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should sort as an ascending double', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
      ]);
    });

    it('should sort as an descending double', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
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
          Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
          Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
          Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should sort as an ascending decimal', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
        Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
      ]);
    });

    it('should sort as an descending decimal', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
        Bindings({ '?a': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')) }),
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
          Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
          Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
          Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should sort as an ascending float', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
        Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
      ]);
    });

    it('should sort as an descending float', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('11.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
        Bindings({ '?a': DF.literal('1.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#float')) }),
      ]);
    });
  });
});

describe('ActorQueryOperationOrderBySparqlee with mixed types', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
          Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) }),
          Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should sort as an ascending integer', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) }),
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
      ]);
    });

    it('should sort as an descending integer', async() => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [ descOrderA ]}};
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': DF.literal('2.0e6', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')) }),
        Bindings({ '?a': DF.literal('11', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) }),
        Bindings({ '?a': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
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
          Bindings({ '?a': DF.variable('a') }),
          Bindings({ '?a': DF.variable('b') }),
          Bindings({ '?a': DF.variable('c') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
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
      orderA = { type: 'expression', expressionType: 'term', term: DF.variable('a') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [ orderA ]};
    });

    it('should not sort since its not a literal ascending', async() => {
      try {
        const op = { operation: { type: 'orderby', input: {}, expressions: [ orderA ]}};
        const output = await actor.run(op);
        const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
        expect(array).toBeFalsy();
      } catch {
        // Is valid
      }
    });
  });
});
