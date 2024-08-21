import type { Bindings } from '@comunica/bindings-factory';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathZeroOrMore } from '../lib/ActorQueryOperationPathZeroOrMore';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new Factory();

describe('ActorQueryOperationPathZeroOrMore', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorMergeBindingsContext: any;
  let source1: IQuerySourceWrapper;
  let source2: IQuerySourceWrapper;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorMergeBindingsContext = {
      mediate(arg: any) {
        return {};
      },
    };

    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => {
        const vars: RDF.Variable[] = [];
        const distinct: boolean = arg.operation.type === 'distinct';

        if (arg.operation.type === 'union') {
          for (const name of QUAD_TERM_NAMES) {
            if (arg.operation.input[0][name].termType === 'Variable' ||
            arg.operation.input[0][name].termType === 'BlankNode') {
              vars.push(arg.operation.input[0][name]);
            }
            if (arg.operation.input[1][name].termType === 'Variable' ||
            arg.operation.input[1][name].termType === 'BlankNode') {
              vars.push(arg.operation.input[1][name]);
            }
          }
        } else {
          for (const name of QUAD_TERM_NAMES) {
            if (arg.operation.input && (arg.operation.input[name].termType === 'Variable' ||
            arg.operation.input[name].termType === 'BlankNode')) {
              vars.push(arg.operation.input[name]);
            } else if (arg.operation[name] && (arg.operation[name].termType === 'Variable' ||
            arg.operation[name].termType === 'BlankNode')) {
              vars.push(arg.operation[name]);
            }
          }
        }

        const bindings: Bindings[] = [];
        if (vars.length > 0) {
          for (let i = 0; i < 3; ++i) {
            const bind: [RDF.Variable, RDF.Term][] = [];
            for (const [ j, element ] of vars.entries()) {
              bind.push([ element, DF.namedNode(`${1 + i + j}`) ]);
            }
            // Special case for coverage (making sure not every subject gets same objects)
            if (!(arg.operation && termToString(arg.operation.subject) === '5' && i === 2)) {
              bindings.push(BF.bindings(bind));
              if (vars.length > 1) {
                bindings.push(BF.bindings(bind));
              }
            }
          }
        } else {
          bindings.push(BF.bindings());
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(distinct ? [ bindings[0] ] : bindings),
          metadata: () => Promise.resolve({
            cardinality: { value: distinct ? 1 : 3 },
            canContainUndefs: false,
            variables: vars,
          }),
          operated: arg,
          type: 'bindings',
        });
      }),
    };
    source1 = <any> {};
    source2 = <any> {};
  });

  describe('The ActorQueryOperationPathZeroOrMore module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathZeroOrMore).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathZeroOrMore constructor', () => {
      expect(new (<any> ActorQueryOperationPathZeroOrMore)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathZeroOrMore);
      expect(new (<any> ActorQueryOperationPathZeroOrMore)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathZeroOrMore objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationPathZeroOrMore)();
      }).toThrow(`Class constructor ActorQueryOperationPathZeroOrMore cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathZeroOrMore instance', () => {
    let actor: ActorQueryOperationPathZeroOrMore;

    beforeEach(() => {
      actor = new ActorQueryOperationPathZeroOrMore({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorMergeBindingsContext,
      });
    });

    it('should test on ZeroOrMore paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ZERO_OR_MORE_PATH }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should mediate with distinct if not in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 1 }, canContainUndefs: false, variables: [ DF.variable('x') ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
      ]);
    });

    it('should mediate with distinct if false in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: false,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 1 }, canContainUndefs: false, variables: [ DF.variable('x') ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
      ]);
    });

    it('should support ZeroOrMore paths (:s :p* ?o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('x'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 4 }, canContainUndefs: false, variables: [ DF.variable('x') ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('s') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
      ]);
    });

    it('should support ZeroOrMore paths (?s :p* :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('o'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 4 }, canContainUndefs: false, variables: [ DF.variable('x') ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('o') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
      ]);
    });

    it('should support ZeroOrMore paths (:s :p* :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('1'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 4 }, canContainUndefs: false, variables: []});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings(),
      ]);
    });

    it('should support ZeroOrMore paths (:s :p* :o) with variable graph', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.namedNode('1'),
        DF.variable('g'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves
        .toEqual({ cardinality: { value: 3 }, canContainUndefs: false, variables: [ DF.variable('g') ]});
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('g'), DF.namedNode('6') ]]),
        BF.bindings([[ DF.variable('g'), DF.namedNode('7') ]]),
        BF.bindings([[ DF.variable('g'), DF.namedNode('8') ]]),
      ]);
    });

    it('should support ZeroOrMore paths (:s :p* ?o) with variable graph', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('x'),
        DF.variable('g'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('x'), DF.variable('g') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('s') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('s') ],
          [ DF.variable('g'), DF.namedNode('7') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('7') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('7') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('7') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('s') ],
          [ DF.variable('g'), DF.namedNode('8') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('8') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('8') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('8') ],
        ]),
      ]);
    });

    it('should support zeroOrMore paths with 2 variables', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('y'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('x'), DF.variable('y') ],
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
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('1') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('2') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('3') ],
        ]),
      ]);
    });

    it('should support zeroOrMore paths with 2 variables with variable graph', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrMorePath(
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
        ),
        DF.variable('y'),
        DF.variable('g'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('x'), DF.variable('y'), DF.variable('g') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('1') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('4') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('2') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('4') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('4') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('5') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('5') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('3') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('1') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('2') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('5') ],
          [ DF.variable('y'), DF.namedNode('3') ],
          [ DF.variable('g'), DF.namedNode('6') ],
        ]),
      ]);
    });

    it('should support zeroOrMore paths with 2 variables with multiple sources on links', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrMorePath(factory.createAlt([
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source1),
          ActorQueryOperation.assignOperationSource(factory.createLink(DF.namedNode('p')), source2),
        ])),
        DF.variable('y'),
      ), context: new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true,
      }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('x'), DF.variable('y') ],
      });
      await expect(output.bindingsStream.toArray()).resolves.toHaveLength(22);

      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.any(ActionContext),
        operation: AF.createUnion([
          ActorQueryOperation.assignOperationSource(
            AF.createPattern(DF.variable('x'), DF.variable('b'), DF.variable('y')),
            source1,
          ),
          ActorQueryOperation.assignOperationSource(
            AF.createPattern(DF.variable('x'), DF.variable('b'), DF.variable('y')),
            source2,
          ),
        ]),
      });
    });
  });
});
