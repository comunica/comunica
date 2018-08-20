import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES} from "rdf-terms";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathZeroOrMore} from "../lib/ActorQueryOperationPathZeroOrMore";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathZeroOrMore', () => {
  let bus;
  let mediatorQueryOperation;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => {
        const vars = [];
        for (const name of QUAD_TERM_NAMES) {
          if (arg.operation[name].termType === 'Variable' || arg.operation[name].termType === 'BlankNode') {
            vars.push(termToString(arg.operation[name]));
          }
        }

        const bindings = [];
        if (vars.length > 0) {
          for (let i = 0; i < 3; ++i) {
            const bind = {};
            for (let j = 0; j < vars.length; ++j) {
              bind[vars[j]] = namedNode('' + (1 + i + j));
            }
            bindings.push(Bindings(bind));
          }
        } else {
          bindings.push(Bindings({}));
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(bindings),
          metadata: () => Promise.resolve({totalItems: 3}),
          operated: arg,
          type: 'bindings',
          variables: vars,
        });
      },
    };
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
      expect(() => { (<any> ActorQueryOperationPathZeroOrMore)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathZeroOrMore instance', () => {
    let actor: ActorQueryOperationPathZeroOrMore;

    beforeEach(() => {
      actor = new ActorQueryOperationPathZeroOrMore({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on ZeroOrMore paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ZERO_OR_MORE_PATH }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support ZeroOrMore paths (:s :p* ?o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createZeroOrMorePath(factory.createLink(namedNode('p'))),
          variable('x'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual(['?x']);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('s') }),
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support ZeroOrMore paths (?s :p* :o)', async () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createZeroOrMorePath(factory.createLink(namedNode('p'))),
          namedNode('o'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual(['?x']);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('o') }),
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support ZeroOrMore paths (:s :p* :o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createZeroOrMorePath(factory.createLink(namedNode('p'))),
          namedNode('1'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ }),
      ]);
    });

    it('should not support ZeroOrMore paths with 2 variables', () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createZeroOrMorePath(factory.createLink(namedNode('p'))),
          variable('y'),
        )};
      return expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
