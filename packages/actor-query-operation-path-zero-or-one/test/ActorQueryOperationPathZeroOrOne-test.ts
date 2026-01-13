import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { Bindings } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { ActorQueryOperationPathZeroOrOne } from '../lib/ActorQueryOperationPathZeroOrOne';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

describe('ActorQueryOperationPathZeroOrOne', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorMergeBindingsContext: any;
  let source1: IQuerySourceWrapper;
  let source2: IQuerySourceWrapper;
  const factory: AlgebraFactory = new AlgebraFactory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => {
        if (arg.operation.type === 'union') {
          return Promise.resolve({
            bindingsStream: new ArrayIterator([
              BF.fromRecord({ x: DF.namedNode('1') }),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 10 },
              variables: vars.map(variable => ({ variable, canBeUndef: false })),
            }),
            operated: arg,
            type: 'bindings',
          });
        }

        const vars: RDF.Variable[] = [];
        const distinct: boolean = arg.operation.type === 'distinct';

        for (const name of QUAD_TERM_NAMES) {
          if (arg.operation.input && (arg.operation.input[name].termType === 'Variable' ||
          arg.operation.input[name].termType === 'BlankNode')) {
            vars.push(arg.operation.input[name]);
          } else if (arg.operation[name] && (arg.operation[name].termType === 'Variable' ||
          arg.operation[name].termType === 'BlankNode')) {
            vars.push(arg.operation[name]);
          }
        }

        const bindings: Bindings[] = [];
        if (vars.length > 0) {
          for (let i = 0; i < 3; ++i) {
            const bind: [RDF.Variable, RDF.Term][] = [];
            for (const [ j, element ] of vars.entries()) {
              bind.push([ element, DF.namedNode(`${1 + i + j}`) ]);
            }
            bindings.push(BF.bindings(bind));
          }
        } else {
          bindings.push(BF.bindings());
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(distinct ? [ bindings[0] ] : bindings),
          metadata: () => Promise.resolve({
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: distinct ? 1 : 3 },
            variables: vars.map(variable => ({ variable, canBeUndef: false })),
          }),
          operated: arg,
          type: 'bindings',
        });
      }),
    };
    // Mediator with no actors attached to it
    mediatorMergeBindingsContext = {
      mediate: () => ({}),
    };
    source1 = <any> {};
    source2 = <any> {};
  });

  describe('The ActorQueryOperationPathZeroOrOne module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathZeroOrOne).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathZeroOrOne constructor', () => {
      expect(new (<any> ActorQueryOperationPathZeroOrOne)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathZeroOrOne);
      expect(new (<any> ActorQueryOperationPathZeroOrOne)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathZeroOrOne objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationPathZeroOrOne)();
      }).toThrow(`Class constructor ActorQueryOperationPathZeroOrOne cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathZeroOrOne instance', () => {
    let actor: ActorQueryOperationPathZeroOrOne;

    beforeEach(() => {
      actor = new ActorQueryOperationPathZeroOrOne({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorMergeBindingsContext,
      });
    });

    it('should test on ZeroOrOne paths', async() => {
      const op: any = {
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        operation: { type: Algebra.Types.PATH, predicate: { type: Algebra.Types.ZERO_OR_ONE_PATH }},
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should test on different paths', async() => {
      const op: any = {
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        operation: { type: Algebra.Types.PATH, predicate: { type: 'dummy' }},
      };
      await expect(actor.test(op)).resolves.toFailTest(`This Actor only supports ZeroOrOnePath Path operations.`);
    });

    it('should mediate with distinct if not in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('x'),
      ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 1 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
      ]);
    });

    it('should mediate with distinct if false in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('x'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: false,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 1 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? ?o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('x'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 4 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('s') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
      ]);
    });

    it('should support ZeroOrOne paths (?s :p? :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('o'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 4 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('o') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('1'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 4 },
        variables: [],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? :s)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('s'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 1 },
        variables: [],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
    });

    it('should support ZeroOrOne paths with 2 variables', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrOnePath(
          assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('y'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 4 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('y'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('4') ],
        ]),
      ]);
    });

    it('should support ZeroOrOne paths with 2 variables with multiple sources on links', async() => {
      const op: any = {
        operation: factory.createPath(
          DF.variable('x'),
          factory.createZeroOrOnePath(factory.createAlt([
            assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
            assignOperationSource(factory.createLink(DF.namedNode('p')), source2),
          ])),
          DF.variable('y'),
        ),
        context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
        }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 4 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('y'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('4') ],
        ]),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.any(ActionContext),
        operation: AF.createUnion([
          AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('xb')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('xb')),
              source2,
            ),
          ]),
          AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.variable('xb'), DF.variable('p'), DF.variable('x')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.variable('xb'), DF.variable('p'), DF.variable('x')),
              source2,
            ),
          ]),
        ]),
      });
    });
  });
});
