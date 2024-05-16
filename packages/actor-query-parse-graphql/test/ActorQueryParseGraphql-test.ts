import { ActorQueryParse } from '@comunica/bus-query-parse';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorQueryParseGraphql } from '..';

describe('ActorQueryParseGraphql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryParseGraphql module', () => {
    it('should be a function', () => {
      expect(ActorQueryParseGraphql).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryParseGraphql constructor', () => {
      expect(new (<any> ActorQueryParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryParseGraphql);
      expect(new (<any> ActorQueryParseGraphql)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryParse);
    });

    it('should not be able to create new ActorQueryParseGraphql objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryParseGraphql)();
      }).toThrow(`Class constructor ActorQueryParseGraphql cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryParseGraphql instance', () => {
    let actor: ActorQueryParseGraphql;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQueryParseGraphql({ name: 'actor', bus });
      context = new ActionContext();
    });

    it('should not test on the sparql format', async() => {
      await expect(actor.test({ query: 'a', queryFormat: { language: 'sparql', version: '1.1' }, context }))
        .rejects.toBeTruthy();
    });

    it('should not test on no format', async() => {
      await expect(actor.test({ query: 'a', context })).rejects.toBeTruthy();
    });

    it('should test on the graphql format', async() => {
      await expect(actor.test({ query: 'a', queryFormat: { language: 'graphql', version: '1.1' }, context }))
        .resolves.toBeTruthy();
    });

    it('should run', async() => {
      const query = '{ label }';
      context = new ActionContext({
        '@context': {
          label: { '@id': 'http://www.w3.org/2000/01/rdf-schema#label' },
        },
      });
      await expect(actor.run({ query, queryFormat: { language: 'graphql', version: '1.1' }, context })).resolves
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
            ], type: 'bgp' },
            type: 'project',
            variables: [
              {
                value: 'label',
              },
            ],
          },
        });
    });

    it('should run with empty @context that has a required URI', async() => {
      const query = '{ label }';
      context = new ActionContext({});
      await expect(actor.run({ query, queryFormat: { language: 'graphql', version: '1.1' }, context }))
        .resolves.toMatchObject({
          operation: {
            input: { patterns: [
              {
                graph: { value: '' },
                object: { value: 'label' },
                predicate: { value: 'label' },
                subject: { termType: 'Variable' },
                type: 'pattern',
              },
            ], type: 'bgp' },
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
