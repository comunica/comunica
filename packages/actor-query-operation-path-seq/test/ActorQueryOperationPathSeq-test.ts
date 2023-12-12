import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { ActionContext, Bus } from '@comunica/core';
import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathSeq } from '../lib/ActorQueryOperationPathSeq';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathSeq', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;
  const factory: Factory = new Factory();

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
          metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: vars }),
          operated: arg,
          type: 'bindings',
        });
      }),
    };

    mediatorJoin = {
      async mediate(arg: IActionRdfJoin) {
        const left: Bindings[] = await arrayifyStream(arg.entries[0].output.bindingsStream);
        const right: Bindings[] = await arrayifyStream(arg.entries[1].output.bindingsStream);
        const bindings = [];
        for (const l of left) {
          for (const r of right) {
            const join = ActorRdfJoin.joinBindings(l, r);
            if (join) {
              bindings.push(join);
            }
          }
        }

        return Promise.resolve({
          bindingsStream: new ArrayIterator(bindings),
          metadata: async() => ({
            cardinality: 3,
            canContainUndefs: false,
            variables: [
              ...(await arg.entries[0].output.metadata()).variables,
              ...(await arg.entries[1].output.metadata()).variables,
            ],
          }),
          operated: arg,
          type: 'bindings',
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
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.SEQ }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Seq paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createSeq([
          factory.createLink(DF.namedNode('p1')),
          factory.createLink(DF.namedNode('p2')),
        ]),
        DF.variable('x'),
      ),
      context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({
        cardinality: 3,
        canContainUndefs: false,
        variables: [ DF.variable('x') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('4') ]]),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
        context: expect.anything(),
        operation: factory.createPath(
          DF.namedNode('s'),
          factory.createLink(DF.namedNode('p1')),
          DF.variable('b0'),
        ),
      });
      expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
        context: expect.anything(),
        operation: factory.createPath(
          DF.variable('b0'),
          factory.createLink(DF.namedNode('p2')),
          DF.variable('x'),
        ),
      });
    });

    it('should name variable differently if it is already used', async() => {
      const op: any = {
        operation: factory.createPath(
          DF.namedNode('b0'),
          factory.createSeq([
            factory.createLink(DF.namedNode('p1')),
            factory.createLink(DF.namedNode('p2')),
          ]),
          DF.variable('x'),
        ),
        context: new ActionContext(),
      };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({
        cardinality: 3,
        canContainUndefs: false,
        variables: [ DF.variable('x') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.namedNode('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.namedNode('4') ]]),
      ]);

      expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
        context: expect.anything(),
        operation: factory.createPath(
          DF.namedNode('b0'),
          factory.createLink(DF.namedNode('p1')),
          DF.variable('b0b'),
        ),
      });
      expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
        context: expect.anything(),
        operation: factory.createPath(
          DF.variable('b0b'),
          factory.createLink(DF.namedNode('p2')),
          DF.variable('x'),
        ),
      });
    });
  });
});
