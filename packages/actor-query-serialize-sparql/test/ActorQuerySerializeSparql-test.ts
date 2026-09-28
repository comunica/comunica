import { ActionContext, Bus } from '@comunica/core';
import '@comunica/utils-jest';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySerializeSparql } from '../lib/ActorQuerySerializeSparql';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorQuerySerializeSparql', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorQuerySerializeSparql instance', () => {
    let actor: ActorQuerySerializeSparql;

    beforeEach(() => {
      actor = new ActorQuerySerializeSparql({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should fail for non-sparql', async() => {
        await expect(actor.test({
          operation: <any> undefined,
          queryFormat: { language: 'graphql', version: '1.0' },
          context,
        })).resolves.toFailTest('This actor can only serialize SPARQL queries');
      });

      it('should pass non-sparql', async() => {
        await expect(actor.test({
          operation: <any> undefined,
          queryFormat: { language: 'sparql', version: '1.0' },
          context,
        })).resolves.toPassTestVoid();
      });
    });

    it('should run', async() => {
      await expect(actor.run({
        operation: AF.createProject(
          AF.createJoin([
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            ]),
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            ]),
          ]),
          [ DF.variable('s') ],
        ),
        queryFormat: { language: 'graphql', version: '1.0' },
        context,
      })).resolves.toEqual({ query: `SELECT ?s WHERE {
  ?s <ex:p> <ex:o> .
  ?s <ex:p2> <ex:o2> .
}` });
    });

    it('should run without indent', async() => {
      await expect(actor.run({
        operation: AF.createProject(
          AF.createJoin([
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            ]),
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            ]),
          ]),
          [ DF.variable('s') ],
        ),
        queryFormat: { language: 'graphql', version: '1.0' },
        context,
        indentWidth: 0,
      })).resolves.toEqual({ query: `SELECT ?s WHERE {
?s <ex:p> <ex:o> .
?s <ex:p2> <ex:o2> .
}` });
    });

    it('should run without indent and without newlines', async() => {
      await expect(actor.run({
        operation: AF.createProject(
          AF.createJoin([
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            ]),
            AF.createBgp([
              AF.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
            ]),
          ]),
          [ DF.variable('s') ],
        ),
        queryFormat: { language: 'graphql', version: '1.0' },
        context,
        newlines: false,
        indentWidth: 0,
      })).resolves.toEqual({ query: `SELECT ?s WHERE { ?s <ex:p> <ex:o> . ?s <ex:p2> <ex:o2> . }` });
    });

    describe('with a projection of the aggregate variables of a group', () => {
      const bgp = AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ]);

      it('should write each kind of aggregate as the expression of its variable', async() => {
        const o = AF.createTermExpression(DF.variable('o'));
        await expect(actor.run({
          operation: AF.createProject(
            AF.createGroup(bgp, [ DF.variable('s') ], [
              AF.createBoundAggregate(DF.variable('var0'), 'count', o, false),
              AF.createBoundAggregate(DF.variable('var1'), 'count', AF.createWildcardExpression(), false),
              AF.createBoundAggregate(DF.variable('var2'), 'count', o, true),
              AF.createBoundAggregate(DF.variable('var3'), 'sum', o, false),
              AF.createBoundAggregate(DF.variable('var4'), 'sample', o, false),
              AF.createBoundAggregate(DF.variable('var5'), 'group_concat', o, false, '|'),
            ]),
            [ 'var0', 'var1', 'var2', 'var3', 'var4', 'var5', 's' ].map(name => DF.variable(name)),
          ),
          queryFormat: { language: 'sparql', version: '1.2' },
          context,
          newlines: false,
          indentWidth: 0,
        })).resolves.toEqual({ query: 'SELECT ( COUNT( ?o ) AS ?var0 ) ( COUNT( * ) AS ?var1 ) ' +
          '( COUNT( DISTINCT ?o ) AS ?var2 ) ( SUM( ?o ) AS ?var3 ) ( SAMPLE( ?o ) AS ?var4 ) ' +
          '( GROUP_CONCAT( ?o ;SEPARATOR="|" ) AS ?var5 ) ?s WHERE { ?s ?p ?o . } GROUP BY ?s' });
      });

      it('should write an aggregate as the expression of its variable next to an extension of it', async() => {
        await expect(actor.run({
          operation: AF.createProject(
            AF.createExtend(
              AF.createGroup(bgp, [ DF.variable('s') ], [
                AF.createBoundAggregate(DF.variable('var0'), 'count', AF.createTermExpression(DF.variable('o')), false),
              ]),
              DF.variable('c'),
              AF.createTermExpression(DF.variable('var0')),
            ),
            [ DF.variable('var0'), DF.variable('s'), DF.variable('c') ],
          ),
          queryFormat: { language: 'sparql', version: '1.2' },
          context,
          newlines: false,
          indentWidth: 0,
        })).resolves.toEqual({
          query: 'SELECT ( COUNT( ?o ) AS ?var0 ) ?s ( COUNT( ?o ) AS ?c ) WHERE { ?s ?p ?o . } GROUP BY ?s',
        });
      });
    });
  });
});
