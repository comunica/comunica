import { ActorQueryParse } from '@comunica/bus-query-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryParseSparql } from '..';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ActorQueryParseSparql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryParseSparql module', () => {
    it('should be a function', () => {
      expect(ActorQueryParseSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryParseSparql constructor', () => {
      expect(new (<any> ActorQueryParseSparql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryParseSparql);
      expect(new (<any> ActorQueryParseSparql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryParse);
    });

    it('should not be able to create new ActorQueryParseSparql objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryParseSparql)();
      }).toThrow(`Class constructor ActorQueryParseSparql cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryParseSparql instance', () => {
    let actor: ActorQueryParseSparql;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQueryParseSparql({ name: 'actor', bus });
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    });

    it('should not test on the graphql format', async() => {
      await expect(actor.test({
        query: 'a',
        queryFormat: { language: 'graphql', version: '1.0' },
        context,
      }))
        .resolves.toFailTest(`This actor can only parse SPARQL queries`);
    });

    it('should test on no format', async() => {
      await expect(actor.test({
        query: 'a',
        context,
      })).resolves.toPassTestVoid();
    });

    it('should test on the sparql format', async() => {
      await expect(actor.test({
        query: 'a',
        queryFormat: { language: 'sparql', version: '1.1' },
        context,
      }))
        .resolves.toPassTestVoid();
    });

    it('should run', async() => {
      const result = await actor.run({ query: 'SELECT * WHERE { ?a a ?b }', context });
      expect(result).toMatchObject({
        operation: AF.createProject(AF.createBgp([ AF.createPattern(
          DF.variable('a'),
          DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          DF.variable('b'),
        ) ]), [ DF.variable('a'), DF.variable('b') ]),
      });
    });

    it('should run for a SPARQL-star query', async() => {
      const result = await actor.run({ query: 'SELECT * WHERE { << ?a a ?q >> a ?b }', context });
      expect(result).toBeTruthy();
    });

    it('should run for an update query', async() => {
      const result = await actor.run({
        query: 'INSERT { <http://example/egbook> <http://ex.org/p> "A" } WHERE {}',
        context,
      });
      expect(result).toMatchObject({
        operation: AF.createDeleteInsert(undefined, [ AF.createPattern(
          DF.namedNode('http://example/egbook'),
          DF.namedNode('http://ex.org/p'),
          DF.literal('A'),
        ) ]),
      });
    });

    it('should run with an overridden baseIRI', async() => {
      const result = await actor.run({
        query: 'BASE <http://example.org/book/> SELECT * WHERE { ?a a ?b }',
        context,
      });
      expect(result).toMatchObject({
        baseIRI: 'http://example.org/book/',
        operation: AF.createProject(AF.createBgp([ AF.createPattern(
          DF.variable('a'),
          DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          DF.variable('b'),
        ) ]), [ DF.variable('a'), DF.variable('b') ]),
      });
    });

    it('should provide a clear error message by default on invalid query', async() => {
      const invalidQuery = [
        'SELECT ?movie ?title ?name',
        'WHERE {',
        '  FILTER LANGMATCHES(LANG(?title), "EN"',
        '  FILTER LANGMATCHES(LANG(?name),  "EN")',
        '}',
      ].join('\n');
      await expect(actor.run({
        query: invalidQuery,
        context,
      })).rejects.toThrow(/on line \d+/u);
    });

    it('should provide a less detailed error message when minimalErrorMessages is set', async() => {
      const actorOptimized = new ActorQueryParseSparql({
        name: 'actor',
        bus,
        minimalErrorMessages: true,
      });
      const invalidQuery = [
        'SELECT ?movie ?title ?name',
        'WHERE {',
        '  FILTER LANGMATCHES(LANG(?title), "EN"',
        '  FILTER LANGMATCHES(LANG(?name),  "EN")',
        '}',
      ].join('\n');
      await expect(actorOptimized.run({
        query: invalidQuery,
        context,
      })).rejects.not.toThrow(/on line \d+/u);
    });

    it('should run with minimalErrorMessages flag', async() => {
      const actorOptimized = new ActorQueryParseSparql({
        name: 'actor',
        bus,
        minimalErrorMessages: true,
      });
      const result = await actorOptimized.run({ query: 'SELECT * WHERE { ?a a ?b }', context });
      expect(result).toMatchObject({
        operation: AF.createProject(AF.createBgp([ AF.createPattern(
          DF.variable('a'),
          DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          DF.variable('b'),
        ) ]), [ DF.variable('a'), DF.variable('b') ]),
      });
    });

    describe('with extension aggregates', () => {
      const aggregateQuery = 'PREFIX ex: <http://example.org/> SELECT (ex:median(DISTINCT ?o) AS ?m) { ?s ?p ?o }';
      const extensionAggregator = jest.fn();
      const expectedAggregates = [{
        ...AF.createNamedExpression(DF.namedNode('http://example.org/median'), [
          AF.createTermExpression(DF.variable('o')),
        ]),
        aggregate: true,
        distinct: true,
        variable: DF.variable('var0'),
      }];

      it('should run without extension aggregates', async() => {
        await expect(actor.run({ query: aggregateQuery, context })).resolves.toMatchObject({
          operation: { input: { type: 'extend', input: { type: 'bgp' }}},
        });
      });

      it('should run with extensionAggregators', async() => {
        context = context.set(KeysInitQuery.extensionAggregators, {
          'http://example.org/median': extensionAggregator,
        });
        await expect(actor.run({ query: aggregateQuery, context })).resolves.toMatchObject({
          operation: { input: { type: 'extend', input: { type: 'group', aggregates: expectedAggregates }}},
        });
      });

      it('should run with extensionAggregatorCreator', async() => {
        const extensionAggregatorCreator = jest.fn((iri: RDF.NamedNode) =>
          iri.value === 'http://example.org/median' ? extensionAggregator : undefined);
        context = context.set(KeysInitQuery.extensionAggregatorCreator, extensionAggregatorCreator);
        await expect(actor.run({ query: aggregateQuery, context })).resolves.toMatchObject({
          operation: { input: { type: 'extend', input: { type: 'group', aggregates: expectedAggregates }}},
        });
        expect(extensionAggregatorCreator).toHaveBeenCalledWith(DF.namedNode('http://example.org/median'));
      });

      it('should not parse unknown functions as aggregates', async() => {
        context = context.set(KeysInitQuery.extensionAggregators, {
          'http://example.org/other': extensionAggregator,
        });
        await expect(actor.run({ query: aggregateQuery, context })).rejects
          .toThrow('DISTINCT is only allowed in a function call of a custom aggregate');
      });

      it('should throw when extensionAggregators and extensionAggregatorCreator are both set', async() => {
        context = context
          .set(KeysInitQuery.extensionAggregators, {})
          .set(KeysInitQuery.extensionAggregatorCreator, () => undefined);
        await expect(actor.run({ query: aggregateQuery, context })).rejects
          .toThrow('Illegal simultaneous usage of extensionAggregatorCreator and extensionAggregators in context');
      });
    });
  });
});
