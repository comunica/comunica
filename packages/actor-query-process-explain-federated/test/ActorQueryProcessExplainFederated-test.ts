import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, ActionContextKey } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, toSparql } from 'sparqlalgebrajs';
import { ActorQueryProcessExplainFederated } from '../lib/ActorQueryProcessExplainFederated';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new Factory(DF);

describe('ActorQueryProcessExplainFederated', () => {
  let bus: any;
  let queryProcessor: any;
  let actor: ActorQueryProcessExplainFederated;
  let context: IActionContext;
  let query: Algebra.Operation;
  let queryString: string;

  beforeEach(() => {
    bus = {
      subscribe: jest.fn(),
    };
    queryProcessor = {
      parse: jest.fn().mockImplementation(() => ({ operation: query, context: 'context' })),
      optimize: jest.fn().mockImplementation(() => ({ operation: query, context: 'context' })),
    };
    actor = new ActorQueryProcessExplainFederated({
      bus,
      name: 'actor',
      queryProcessor,
    });
    context = new ActionContext();
    query = AF.createProject(
      AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
      [ DF.variable('s'), DF.variable('p'), DF.variable('o') ],
    );
    queryString = toSparql(query);
  });

  describe('test', () => {
    it('should pass with KeysInitQuery.explain', async() => {
      context = context.set(KeysInitQuery.explain, 'federated');
      await expect(actor.test({ context, query: queryString })).resolves.toPassTestVoid();
    });

    it('should pass with string value explain', async() => {
      context = context.set(new ActionContextKey('explain'), 'federated');
      await expect(actor.test({ context, query: queryString })).resolves.toPassTestVoid();
    });

    it('should reject without explain context key', async() => {
      await expect(actor.test({ context, query: queryString })).resolves
        .toFailTest('actor can only explain in \'federated\' mode');
    });
  });

  describe('run', () => {
    it('should return original query without source assignments', async() => {
      await expect(actor.run({ context, query: queryString })).resolves.toEqual({
        result: {
          data: queryString,
          explain: true,
          type: 'federated',
        },
      });
    });

    it('should return query with service clauses with source assignments', async() => {
      (<Algebra.Pattern>query.input).metadata = {
        scopedSource: {
          source: {
            innerSource: {
              referenceValue: 'ex:source',
            },
          },
        },
      };
      await expect(actor.run({ context, query: queryString })).resolves.toEqual({
        result: {
          data: 'SELECT ?s ?p ?o WHERE { SERVICE <ex:source> { ?s ?p ?o. } }',
          explain: true,
          type: 'federated',
        },
      });
    });
  });
});
