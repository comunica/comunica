import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus, ActionContext } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathOneOrMore } from '../lib/ActorQueryOperationPathOneOrMore';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathOneOrMore', () => {
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
            bindings.push(Bindings(bind));
            if (arg.operation.predicate && arg.operation.predicate.type === 'seq') {
              bindings.push(Bindings(bind));
            }
          }
        } else {
          bindings.push(Bindings({}));
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(distinct ? [ bindings[0] ] : bindings, { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: distinct ? 1 : 3 }),
          operated: arg,
          type: 'bindings',
          variables: vars,
          canContainUndefs: false,
        });
      },
    };
  });

  describe('The ActorQueryOperationPathOneOrMore module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathOneOrMore).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathOneOrMore constructor', () => {
      expect(new (<any> ActorQueryOperationPathOneOrMore)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathOneOrMore);
      expect(new (<any> ActorQueryOperationPathOneOrMore)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathOneOrMore objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathOneOrMore)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathOneOrMore instance', () => {
    let actor: ActorQueryOperationPathOneOrMore;

    beforeEach(() => {
      actor = new ActorQueryOperationPathOneOrMore({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on OneOrMore paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ONE_OR_MORE_PATH }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should mediate with distinct if not yet in context', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('1') }),
      ]);
    });

    it('should mediate with distinct if false in context', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: false }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('1') }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ ?o)', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('1') }),
        Bindings({ '?x': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('3') }),
      ]);
    });

    it('should support OneOrMore paths (?s :p+ :o)', async() => {
      const op = { operation: factory.createPath(
        DF.variable('x'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('o'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('1') }),
        Bindings({ '?x': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('3') }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ :o)', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('1'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ :o) with variable graph', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createZeroOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.namedNode('1'),
        DF.variable('g'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?g': DF.namedNode('2') }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ ?o) with variable graph', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createOneOrMorePath(factory.createLink(DF.namedNode('p'))),
        DF.variable('o'),
        DF.variable('g'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?o', '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?o': DF.namedNode('1'), '?g': DF.namedNode('2') }),
        Bindings({ '?o': DF.namedNode('2'), '?g': DF.namedNode('2') }),
        Bindings({ '?o': DF.namedNode('3'), '?g': DF.namedNode('2') }),
      ]);
    });

    it('should support OneOrMore paths with 2 variables', async() => {
      const op = { operation: factory.createPath(
        DF.variable('x'),
        factory.createOneOrMorePath(factory.createSeq(factory.createLink(DF.namedNode('p')),
          factory.createLink(DF.namedNode('p')))),
        DF.variable('y'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x', '?y' ]);
      expect(output.canContainUndefs).toEqual(false);
      const bindings: Bindings[] = await arrayifyStream(output.bindingsStream);
      expect(bindings).toEqual([
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('1') }),
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('3') }),
      ]);
    });

    it('should support OneOrMore paths with 2 variables and graph a variable', async() => {
      const op = { operation: factory.createPath(
        DF.variable('x'),
        factory.createOneOrMorePath(factory.createSeq(factory.createLink(DF.namedNode('p')),
          factory.createLink(DF.namedNode('p')))),
        DF.variable('y'),
        DF.variable('g'),
      ),
      context: ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true }) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([ '?x', '?y', '?g' ]);
      expect(output.canContainUndefs).toEqual(false);
      const bindings: Bindings[] = await arrayifyStream(output.bindingsStream);
      expect(bindings).toEqual([
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('2'), '?g': DF.namedNode('3') }),
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('1'), '?g': DF.namedNode('3') }),
        Bindings({ '?x': DF.namedNode('1'), '?y': DF.namedNode('3'), '?g': DF.namedNode('3') }),
      ]);
    });
  });
});
