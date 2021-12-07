import { ActorSparqlParse } from '@comunica/bus-sparql-parse';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorSparqlParseGraphql } from '..';

describe('ActorSparqlParseGraphql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlParseGraphql module', () => {
    it('should be a function', () => {
      expect(ActorSparqlParseGraphql).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlParseGraphql constructor', () => {
      expect(new (<any> ActorSparqlParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParseGraphql);
      expect(new (<any> ActorSparqlParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlParse);
    });

    it('should not be able to create new ActorSparqlParseGraphql objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlParseGraphql)(); }).toThrow();
    });
  });

  describe('An ActorSparqlParseGraphql instance', () => {
    let actor: ActorSparqlParseGraphql;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorSparqlParseGraphql({ name: 'actor', bus });
      context = new ActionContext();
    });

    it('should not test on the sparql format', () => {
      return expect(actor.test({ query: 'a', queryFormat: 'sparql', context })).rejects.toBeTruthy();
    });

    it('should not test on no format', () => {
      return expect(actor.test({ query: 'a', context })).rejects.toBeTruthy();
    });

    it('should test on the graphql format', () => {
      return expect(actor.test({ query: 'a', queryFormat: 'graphql', context })).resolves.toBeTruthy();
    });

    it('should run', () => {
      const query = '{ label }';
      context = new ActionContext({
        '@context': {
          label: { '@id': 'http://www.w3.org/2000/01/rdf-schema#label' },
        },
      });
      return expect(actor.run({ query, queryFormat: 'graphql', context })).resolves
        .toMatchObject({
          operation: {
            input: { patterns: [
              {
                graph: { value: '' },
                object: { value: 'label' },
                predicate: { value: 'http://www.w3.org/2000/01/rdf-schema#label' },
                subject: { termType: 'Variable' },
                type: 'pattern',
              },
            ],
            type: 'bgp' },
            type: 'project',
            variables: [
              {
                value: 'label',
              },
            ],
          },
        });
    });

    it('should run with empty @context that has a required URI', () => {
      const query = '{ label }';
      context = new ActionContext({});
      return expect(actor.run({ query, queryFormat: 'graphql', context })).resolves.toMatchObject({
        operation: {
          input: { patterns: [
            {
              graph: { value: '' },
              object: { value: 'label' },
              predicate: { value: 'label' },
              subject: { termType: 'Variable' },
              type: 'pattern',
            },
          ],
          type: 'bgp' },
          type: 'project',
          variables: [
            {
              value: 'label',
            },
          ],
        },
      });
    });
  });
});
