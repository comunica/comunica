import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES} from "rdf-terms";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathSeq} from "../lib/ActorQueryOperationPathSeq";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathSeq', () => {
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

  describe('The ActorQueryOperationPathSeq module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathSeq).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathSeq constructor', () => {
      expect(new (<any> ActorQueryOperationPathSeq)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathSeq);
      expect(new (<any> ActorQueryOperationPathSeq)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathSeq objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathSeq)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathSeq instance', () => {
    let actor: ActorQueryOperationPathSeq;

    beforeEach(() => {
      actor = new ActorQueryOperationPathSeq({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on Seq paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.SEQ }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
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
  });
});
