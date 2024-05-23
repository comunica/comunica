import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import {
  ActorOptimizeQueryOperationDescribeToConstructsSubject,
} from '../lib/ActorOptimizeQueryOperationDescribeToConstructsSubject';

const DF = new DataFactory();
const AF = new Factory();

describe('ActorOptimizeQueryOperationDescribeToConstructsSubject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationDescribeToConstructsSubject instance', () => {
    let actor: ActorOptimizeQueryOperationDescribeToConstructsSubject;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationDescribeToConstructsSubject({ name: 'actor', bus });
    });

    it('should test on describe', async() => {
      const op: any = { operation: { type: 'describe' }};
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-describe', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).rejects
        .toThrow(`Actor actor only supports describe operations, but got some-other-type`);
    });

    it('should run without variable terms', async() => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          type: 'describe',
          terms: [ DF.namedNode('a'), DF.namedNode('b') ],
          input: { type: 'bgp', patterns: []},
        },
      };
      const { operation: opOut } = await actor.run(op);
      expect(opOut).toEqual(AF.createUnion([
        AF.createConstruct(
          AF.createBgp([
            AF.createPattern(DF.namedNode('a'), DF.variable('__predicate'), DF.variable('__object')),
          ]),
          [
            AF.createPattern(DF.namedNode('a'), DF.variable('__predicate'), DF.variable('__object')),
          ],
        ),
        AF.createConstruct(
          AF.createBgp([
            AF.createPattern(DF.namedNode('b'), DF.variable('__predicate'), DF.variable('__object')),
          ]),
          [
            AF.createPattern(DF.namedNode('b'), DF.variable('__predicate'), DF.variable('__object')),
          ],
        ),
      ]));
    });

    it('should run with variable terms and an input', async() => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          input: { type: 'bgp', patterns: [
            AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')),
          ]},
          terms: [ DF.variable('a'), DF.variable('b') ],
          type: 'describe',
        },
      };
      const { operation: opOut } = await actor.run(op);
      expect(opOut).toEqual(AF.createUnion([
        AF.createConstruct(
          AF.createJoin([
            AF.createBgp([
              AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')),
            ]),
            AF.createBgp([
              AF.createPattern(DF.variable('a'), DF.variable('__predicate0'), DF.variable('__object0')),
              AF.createPattern(DF.variable('b'), DF.variable('__predicate1'), DF.variable('__object1')),
            ]),
          ]),
          [
            AF.createPattern(DF.variable('a'), DF.variable('__predicate0'), DF.variable('__object0')),
            AF.createPattern(DF.variable('b'), DF.variable('__predicate1'), DF.variable('__object1')),
          ],
        ),
      ]));
    });

    it('should run with and without variable terms and an input', async() => {
      const op: any = {
        context: new ActionContext({ name: 'context' }),
        operation: {
          input: {
            type: 'bgp',
            patterns: [ AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')) ],
          },
          terms: [ DF.variable('a'), DF.variable('b'), DF.namedNode('c') ],
          type: 'describe',
        },
      };
      const { operation: opOut } = await actor.run(op);
      expect(opOut).toEqual(AF.createUnion([
        AF.createConstruct(
          AF.createBgp([
            AF.createPattern(DF.namedNode('c'), DF.variable('__predicate'), DF.variable('__object')),
          ]),
          [
            AF.createPattern(DF.namedNode('c'), DF.variable('__predicate'), DF.variable('__object')),
          ],
        ),
        AF.createConstruct(
          AF.createJoin([
            AF.createBgp([
              AF.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('dummy')),
            ]),
            AF.createBgp([
              AF.createPattern(DF.variable('a'), DF.variable('__predicate0'), DF.variable('__object0')),
              AF.createPattern(DF.variable('b'), DF.variable('__predicate1'), DF.variable('__object1')),
            ]),
          ]),
          [
            AF.createPattern(DF.variable('a'), DF.variable('__predicate0'), DF.variable('__object0')),
            AF.createPattern(DF.variable('b'), DF.variable('__predicate1'), DF.variable('__object1')),
          ],
        ),
      ]));
    });
  });
});
