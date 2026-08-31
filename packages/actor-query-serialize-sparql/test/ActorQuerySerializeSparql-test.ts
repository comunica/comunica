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
  });
});
