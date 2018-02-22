import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {ArrayIterator, AsyncIterator} from "asynciterator";
import {blankNode, literal, namedNode, quad, variable} from "rdf-data-model";
import {termToString} from "rdf-string";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationBgpLeftDeepReordering} from "../lib/ActorQueryOperationBgpLeftDeepReordering";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationBgpLeftDeepReordering', () => {
  let bus;
  let mediatorQueryOperation;
  const factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: async (arg) => {
        let bindingsStream;
        let totalItems;
        let variables = [];
        if (arg.operation.type === 'pattern') {
          const pattern = <Algebra.Pattern> arg.operation;
          const subject = pattern.subject.termType === 'Variable' || pattern.subject.termType === 'BlankNode';
          // bound pattern
          if (!subject && pattern.object.termType !== 'Variable' && pattern.object.termType !== 'BlankNode') {
            const val = pattern.object.value;
            return {
              bindingsStream: new ArrayIterator<Bindings>(val === '1' || val === '2' ? [Bindings({})] : []),
              metadata: Promise.resolve({ totalItems: 1 }),
              operated: arg,
              type: 'bindings',
              variables: [],
            };
          }
          const v = termToString(subject ? pattern.subject : pattern.object);
          const base =  subject ? 0 : 1;
          totalItems = subject ? 3 : 4; // allows for sort differences
          variables = [v];
          bindingsStream = new ArrayIterator<Bindings>([
            Bindings({ [v]: literal(base + '') }),
            Bindings({ [v]: literal((base + 1) + '') }),
            Bindings({ [v]: literal((base + 2) + '') }),
          ]);
        } else { // bgp
          const bgp = <Algebra.Bgp> arg.operation;
          const output = bgp.patterns.map((p) => mediatorQueryOperation.mediate({ operation: p }));
          // only have 2 patterns at most
          if (output.length === 1) {
            return output[0];
          } else {
            const outputLeft = await output[0];
            const outputRight = await output[1];
            const left = await arrayifyStream(outputLeft.bindingsStream);
            const right = await arrayifyStream(outputRight.bindingsStream);

            const results = [];
            for (const bLeft of left) {
              for (const bRight of right) {
                const b: Bindings = ActorRdfJoin.join(bLeft, bRight);
                if (b) {
                  results.push(b);
                }
              }
            }
            totalItems = results.length;
            variables = [].concat(outputLeft.variables, outputRight.variables);
            bindingsStream = new ArrayIterator<Bindings>(results);
          }
        }
        return {
          bindingsStream,
          metadata: Promise.resolve({ totalItems }),
          operated: arg,
          type: 'bindings',
          variables,
        };
      },
    };
  });

  describe('The ActorQueryOperationBgpLeftDeepReordering module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpLeftDeepReordering).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpLeftDeepReordering constructor', () => {
      expect(new (<any> ActorQueryOperationBgpLeftDeepReordering)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationBgpLeftDeepReordering);
      expect(new (<any> ActorQueryOperationBgpLeftDeepReordering)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpLeftDeepReordering objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpLeftDeepReordering)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationBgpLeftDeepReordering instance', () => {
    let actor: ActorQueryOperationBgpLeftDeepReordering;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpLeftDeepReordering({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on bgp', () => {
      const op = { operation: { type: 'bgp', patterns: ['a', 'b'] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-bgp', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on bgps of length < 2', () => {
      const op = { operation: { type: 'bgp', patterns: [] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should find connected patterns', () => {
      const quads = [
        quad(namedNode('a'), namedNode('a'), variable('x')),
        quad(variable('x'), namedNode('a'), namedNode('a')),
        quad(namedNode('a'), namedNode('a'), variable('y')),
        quad(namedNode('a'), namedNode('a'), blankNode('x')),
        quad(blankNode('x'), namedNode('a'), namedNode('a')),
        quad(namedNode('a'), namedNode('a'), blankNode('y')),
      ];
      const clusters = ActorQueryOperationBgpLeftDeepReordering.findConnectedPatterns(<any> quads);
      expect(clusters.length).toEqual(4);
      expect(clusters).toContainEqual({
        quads: [
          quad(namedNode('a'), namedNode('a'), variable('x')),
          quad(variable('x'), namedNode('a'), namedNode('a'))],
        variables: [variable('x')],
      });
      expect(clusters).toContainEqual({
        quads: [
          quad(namedNode('a'), namedNode('a'), blankNode('x')),
          quad(blankNode('x'), namedNode('a'), namedNode('a'))],
        variables: [blankNode('x')],
      });
      expect(clusters).toContainEqual({
        quads: [ quad(namedNode('a'), namedNode('a'), variable('y')) ],
        variables: [variable('y')],
      });
      expect(clusters).toContainEqual({
        quads: [ quad(namedNode('a'), namedNode('a'), blankNode('y')) ],
        variables: [blankNode('y')],
      });
    });

    it('should easily find single clusters', () => {
      const quads = [
        quad(namedNode('a'), namedNode('a'), variable('x')),
      ];
      const clusters = ActorQueryOperationBgpLeftDeepReordering.findConnectedPatterns(<any> quads);
      expect(clusters.length).toEqual(1);
      expect(clusters).toEqual([{
        quads: [ quad(namedNode('a'), namedNode('a'), variable('x')) ],
        variables: [variable('x')],
      }]);
    });

    it('should run', async () => {
      const op = { operation: factory.createBgp([
        factory.createPattern(namedNode('a'), namedNode('a'), variable('x')),
        factory.createPattern(variable('x'), namedNode('a'), namedNode('a')),
      ])};
      const output = <IActorQueryOperationOutputBindings> await actor.run(op);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject(['?x']);
      const results = await arrayifyStream(output.bindingsStream);
      expect(results).toContainEqual(Bindings({ '?x': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2') }));
    });

    it('should run on more patterns', async () => {
      const op = { operation: factory.createBgp([
        factory.createPattern(namedNode('a'), namedNode('a'), variable('x')),
        factory.createPattern(variable('x'), namedNode('a'), variable('y')),
        factory.createPattern(variable('y'), namedNode('b'), namedNode('b')),
      ])};
      const output = <IActorQueryOperationOutputBindings> await actor.run(op);
      expect(output.type).toEqual('bindings');
      expect(output.variables.sort()).toMatchObject(['?x', '?y']);
      const results = await arrayifyStream(output.bindingsStream);
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('0') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('2') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('0') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('2') }));
    });

    it('should support unconnected patterns', async () => {
      const op = { operation: factory.createBgp([
        factory.createPattern(namedNode('a'), namedNode('a'), variable('x')),
        factory.createPattern(variable('y'), namedNode('a'), namedNode('a')),
      ])};
      const output = <IActorQueryOperationOutputBindings> await actor.run(op);
      expect(output.type).toEqual('bindings');
      expect(output.variables.sort()).toMatchObject(['?x', '?y']);
      const results = await arrayifyStream(output.bindingsStream);
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('0') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('0') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('3'), '?y': literal('0') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('3'), '?y': literal('1') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('1'), '?y': literal('2') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('2'), '?y': literal('2') }));
      expect(results).toContainEqual(Bindings({ '?x': literal('3'), '?y': literal('2') }));
    });
  });
});
