import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { QUAD_TERM_NAMES } from 'rdf-terms';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathSeq } from '../lib/ActorQueryOperationPathSeq';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathSeq', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;
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
        });
      },
    };

    mediatorJoin = {
      async mediate(arg: any) {
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
          metadata: () => Promise.resolve({ totalItems: 3 }),
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
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.SEQ }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Seq paths', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createSeq(factory.createLink(DF.namedNode('p1')), factory.createLink(DF.namedNode('p2'))),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('3') }),
        Bindings({ '?x': DF.namedNode('4') }),
      ]);
    });

    it('should name variable bb because b already used', async() => {
      const op = { operation: factory.createPath(
        DF.namedNode('b'),
        factory.createSeq(factory.createLink(DF.namedNode('p1')), factory.createLink(DF.namedNode('p2'))),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.namedNode('2') }),
        Bindings({ '?x': DF.namedNode('3') }),
        Bindings({ '?x': DF.namedNode('4') }),
      ]);
    });
  });
});
