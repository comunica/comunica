import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathZeroOrOne } from '../lib/ActorQueryOperationPathZeroOrOne';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathZeroOrOne', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        const vars: any = [];
        const distinct: boolean = arg.operation.type === 'distinct';

        for (const name of QUAD_TERM_NAMES) {
          if (arg.operation.input && (arg.operation.input[name].termType === 'Variable' ||
          arg.operation.input[name].termType === 'BlankNode')) {
            vars.push(termToString(arg.operation.input[name]));
          } else if (arg.operation[name] && (arg.operation[name].termType === 'Variable' ||
          arg.operation[name].termType === 'BlankNode')) {
            vars.push(termToString(arg.operation[name]));
          }
        }

        const bindings = [];
        if (vars.length > 0) {
          for (let i = 0; i < 3; ++i) {
            const bind: any = {};
            for (const [ j, element ] of vars.entries()) {
              bind[element] = DF.namedNode(`${1 + i + j}`);
            }
            bindings.push(BF.bindings(bind));
          }
        } else {
          bindings.push(BF.bindings({}));
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(distinct ? [ bindings[0] ] : bindings),
          metadata: () => Promise.resolve({ cardinality: distinct ? 1 : 3, canContainUndefs: false }),
          operated: arg,
          type: 'bindings',
          variables: vars,
        });
      },
    };
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
      expect(() => { (<any> ActorQueryOperationPathZeroOrOne)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathZeroOrOne instance', () => {
    let actor: ActorQueryOperationPathZeroOrOne;

    beforeEach(() => {
      actor = new ActorQueryOperationPathZeroOrOne({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on ZeroOrOne paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ZERO_OR_ONE_PATH }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should mediate with distinct if not in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(await output.metadata()).toEqual({ cardinality: 1, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ '?x': DF.namedNode('1') }),
      ]);
    });

    it('should mediate with distinct if false in context', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ),
      context: new ActionContext({ [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: false }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(await output.metadata()).toEqual({ cardinality: 1, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ '?x': DF.namedNode('1') }),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? ?o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ),
      context: new ActionContext({ [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ '?x': DF.namedNode('s') }),
        BF.bindings({ '?x': DF.namedNode('1') }),
        BF.bindings({ '?x': DF.namedNode('2') }),
        BF.bindings({ '?x': DF.namedNode('3') }),
      ]);
    });

    it('should support ZeroOrOne paths (?s :p? :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('o'),
      ),
      context: new ActionContext({ [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ '?x': DF.namedNode('o') }),
        BF.bindings({ '?x': DF.namedNode('1') }),
        BF.bindings({ '?x': DF.namedNode('2') }),
        BF.bindings({ '?x': DF.namedNode('3') }),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? :o)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('1'),
      ),
      context: new ActionContext({ [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ }),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? :s)', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('s'),
      ),
      context: new ActionContext({ [KeysQueryOperation.isPathArbitraryLengthDistinctKey.name]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await output.metadata()).toEqual({ cardinality: 1, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ }),
      ]);
    });

    it('should not support ZeroOrOne paths with 2 variables', () => {
      const op: any = { operation: factory.createPath(
        DF.variable('x'),
        factory.createZeroOrOnePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('y'),
      ) };
      return expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
