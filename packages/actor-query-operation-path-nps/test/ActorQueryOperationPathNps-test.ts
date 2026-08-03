import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { ActorQueryOperationPathNps } from '../lib/ActorQueryOperationPathNps';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

describe('ActorQueryOperationPathNps', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: AlgebraFactory = new AlgebraFactory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => {
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
          metadata: () => Promise.resolve({ cardinality: 3 }),
          operated: arg,
          type: 'bindings',
          variables: vars,
        });
      }),
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
      expect(() => {
        (<any> ActorQueryOperationPathNps)();
      }).toThrow(`Class constructor ActorQueryOperationPathNps cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathNps instance', () => {
    let actor: ActorQueryOperationPathNps;

    beforeEach(() => {
      actor = new ActorQueryOperationPathNps({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Nps paths', async() => {
      const op: any = {
        operation: { type: Algebra.Types.PATH, predicate: { type: Algebra.Types.NPS }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should test on different paths', async() => {
      const op: any = {
        operation: { type: Algebra.Types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`This Actor only supports nps Path operations.`);
    });

    it('should support Nps paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createNps([ DF.namedNode('2') ]),
        DF.variable('x'),
      ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('4') ]]),
      ]);
    });

    it('should support Nps paths with metadata', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createNps([ DF.namedNode('2') ]),
        DF.variable('x'),
      ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      op.operation.predicate.metadata = { a: 'b' };

      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('4') ]]),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: Object.assign(AF
          .createPattern(DF.namedNode('s'), DF.variable('b'), DF.variable('x')), { metadata: { a: 'b' }}),
        context: expect.any(ActionContext),
      });
    });
  });
});
