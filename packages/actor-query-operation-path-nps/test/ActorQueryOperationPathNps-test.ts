import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathNps } from '../lib/ActorQueryOperationPathNps';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathNps', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        const vars: any = [];
        for (const name of QUAD_TERM_NAMES) {
          if (arg.operation[name].termType === 'Variable' || arg.operation[name].termType === 'BlankNode') {
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
          }
        } else {
          bindings.push(Bindings({}));
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(bindings),
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: vars,
          canContainUndefs: false,
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
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.NPS }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Nps paths', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createNps([ DF.namedNode('2') ]),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('4') }),
      ]);
    });
  });
});
