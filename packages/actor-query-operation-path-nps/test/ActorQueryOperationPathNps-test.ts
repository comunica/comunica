import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES} from "rdf-terms";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathNps} from "../lib/ActorQueryOperationPathNps";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathNps', () => {
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

  describe('The ActorQueryOperationPathNps module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathNps).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathNps constructor', () => {
      expect(new (<any> ActorQueryOperationPathNps)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathNps);
      expect(new (<any> ActorQueryOperationPathNps)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathNps objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathNps)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathNps instance', () => {
    let actor: ActorQueryOperationPathNps;

    beforeEach(() => {
      actor = new ActorQueryOperationPathNps({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Nps paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.NPS }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
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
  });
});
