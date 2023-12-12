import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathNps } from '../lib/ActorQueryOperationPathNps';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathNps', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        const vars: RDF.Variable[] = [];
        for (const name of QUAD_TERM_NAMES) {
          if (arg.operation[name].termType === 'Variable' || arg.operation[name].termType === 'BlankNode') {
            vars.push(arg.operation[name]);
          }
        }

        const bindings = [];
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
          bindingsStream: new ArrayIterator(bindings),
          metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
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
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.NPS }},
        context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Nps paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createNps([ DF.namedNode('2') ]),
        DF.variable('x'),
      ),
      context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('4') ]]),
      ]);
    });
  });
});
