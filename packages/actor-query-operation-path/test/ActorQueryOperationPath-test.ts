import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {blankNode, defaultGraph, namedNode, variable} from "rdf-data-model";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES} from "rdf-terms";
import {Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPath} from "../lib/ActorQueryOperationPath";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPath', () => {
  let bus;
  let mediatorQueryOperation;
  let mediatorJoin;
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

    mediatorJoin = {
      mediate: async (arg) => {
        const left: Bindings[] = await arrayifyStream(arg.entries[0].bindingsStream);
        const right: Bindings[] = await arrayifyStream(arg.entries[1].bindingsStream);
        const bindings = [];
        for (const l of left) {
          for (const r of right) {
            const join = ActorRdfJoin.join(l, r);
            if (join) {
              bindings.push(join);
            }
          }
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(bindings),
          metadata: () => Promise.resolve({totalItems: 3}),
          operated: arg,
          type: 'bindings',
          variables: [],
        });
      },
    };
  });

  describe('The ActorQueryOperationPath module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPath).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPath constructor', () => {
      expect(new (<any> ActorQueryOperationPath)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPath);
      expect(new (<any> ActorQueryOperationPath)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPath objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPath)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPath instance', () => {
    let actor: ActorQueryOperationPath;

    beforeEach(() => {
      actor = new ActorQueryOperationPath({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on path', () => {
      const op = { operation: { type: 'path' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-path', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('generates unique blank nodes', () => {
      const path = factory.createPath(
          namedNode('s'),
          factory.createLink(namedNode('p')),
          blankNode('b'),
        );
      return expect(actor.generateBlankNode(path).value).not.toEqual(path.object.value);
    });

    it('should error on unknown paths', () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createLink(namedNode('p')),
          variable('x')),
      };
      op.operation.predicate.type = 'dummy';
      return expect(actor.run(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createAlt(factory.createLink(namedNode('p1')), factory.createLink(namedNode('p2'))),
          variable('x')),
      };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support Inv paths', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createInv(factory.createLink(namedNode('p'))),
          variable('x'),
          defaultGraph(),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
      expect((<any> output).operated.operation).toEqual(
        factory.createPattern(variable('x'), namedNode('p'), namedNode('s'), defaultGraph()));
    });

    it('should support Link paths', async () => {
      const op = { operation: factory.createPath(namedNode('s'), factory.createLink(namedNode('p')), variable('x')) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support Nps paths', async () => {
      const op = { operation: factory.createPath(
            namedNode('s'),
            factory.createNps([namedNode('2')]),
            variable('x'),
          )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('4') }),
      ]);
    });

    it('should support Seq paths', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createSeq(factory.createLink(namedNode('p1')), factory.createLink(namedNode('p2'))),
          variable('x'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
        Bindings({ '?x': namedNode('4') }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ ?o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createOneOrMorePath(factory.createLink(namedNode('p'))),
          variable('x'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual(['?x']);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support OneOrMore paths (?s :p+ :o)', async () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createOneOrMorePath(factory.createLink(namedNode('p'))),
          namedNode('o'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual(['?x']);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
    });

    it('should support OneOrMore paths (:s :p+ :o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createOneOrMorePath(factory.createLink(namedNode('p'))),
          namedNode('1'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ }),
      ]);
    });

    it('should not support OneOrMore paths with 2 variables', () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createOneOrMorePath(factory.createLink(namedNode('p'))),
          variable('y'),
        )};
      return expect(actor.run(op)).rejects.toBeTruthy();
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

    it('should support ZeroOrOne paths (:s :p? ?o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createZeroOrOnePath(factory.createLink(namedNode('p'))),
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

    it('should support ZeroOrOne paths (?s :p? :o)', async () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createZeroOrOnePath(factory.createLink(namedNode('p'))),
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

    it('should support ZeroOrOne paths (:s :p? :o)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createZeroOrOnePath(factory.createLink(namedNode('p'))),
          namedNode('1'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ }),
      ]);
    });

    it('should support ZeroOrOne paths (:s :p? :s)', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createZeroOrOnePath(factory.createLink(namedNode('p'))),
          namedNode('s'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.variables).toEqual([]);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ }),
      ]);
    });

    it('should not support ZeroOrOne paths with 2 variables', () => {
      const op = { operation: factory.createPath(
          variable('x'),
          factory.createZeroOrOnePath(factory.createLink(namedNode('p'))),
          variable('y'),
        )};
      return expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
