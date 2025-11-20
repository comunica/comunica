import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import type { IActionContextPreprocess, IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import type { IActionDereference, IActorDereferenceOutput } from '@comunica/bus-dereference';
import type {
  IActionDereferenceRdf,
  IActorDereferenceRdfOutput,
} from '@comunica/bus-dereference-rdf';
import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import type { IActionFunctionFactory, IActorFunctionFactoryOutput } from '@comunica/bus-function-factory';
import type { IActionHashBindings, IActorHashBindingsOutput } from '@comunica/bus-hash-bindings';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import type { IActionQueryParse, IActorQueryParseOutput } from '@comunica/bus-query-parse';
import type {
  IActionQueryResultSerializeHandle,
  IActorOutputQueryResultSerializeHandle,
  IActorTestQueryResultSerializeHandle,
} from '@comunica/bus-query-result-serialize';

import type { IActionQuerySerialize, IActorQuerySerializeOutput } from '@comunica/bus-query-serialize';
import type {
  IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput,
} from '@comunica/bus-query-source-dereference-link';
import type { IActionQuerySourceIdentify, IActorQuerySourceIdentifyOutput } from '@comunica/bus-query-source-identify';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, IActorRdfJoinEntriesSortOutput } from '@comunica/bus-rdf-join-entries-sort';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
} from '@comunica/bus-rdf-metadata-accumulate';
import type { IActionRdfParseHandle, IActorOutputRdfParseHandle } from '@comunica/bus-rdf-parse';
import type {
  IActionRdfResolveHypermediaLinks,
  IActorRdfResolveHypermediaLinksOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links';
import type {
  IActionRdfResolveHypermediaLinksQueue,
  IActorRdfResolveHypermediaLinksQueueOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type {
  IActionRdfSerializeHandle,
  IActorOutputRdfSerializeHandle,
  IActorTestRdfSerializeHandle,
} from '@comunica/bus-rdf-serialize';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput } from '@comunica/bus-rdf-update-hypermedia';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from '@comunica/bus-rdf-update-quads';
import type {
  IActionTermComparatorFactory,
  IActorTermComparatorFactoryOutput,
} from '@comunica/bus-term-comparator-factory';
import { ActionContext, failTest } from '@comunica/core';
import type { Mediate, IAction, IActorOutput, IActorTest, Bus } from '@comunica/core';
import type { IMediatorTypeAccuracy } from '@comunica/mediatortype-accuracy';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Runner } from '@comunica/runner';
import { instantiateComponent } from '@comunica/runner';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { QueryEngineFactory } from '../lib';

const queryEngineFactory = new QueryEngineFactory();
const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('System test: mediators', () => {
  let runner: Runner;
  beforeAll(async() => {
    runner = await instantiateComponent(
      (<any> queryEngineFactory).defaultConfigPath,
      'urn:comunica:default:Runner',
      {},
    );
  });
  const context: IActionContext = new ActionContext();

  addTest<IActionBindingsAggregatorFactory, IActorBindingsAggregatorFactoryOutput>(
    'bindings-aggregator-factory',
    ':query-operation/actors#group',
    'mediatorBindingsAggregatorFactory',
    { expr: AF.createAggregateExpression('avg', AF.createTermExpression(DF.variable('x')), false) },
      `Creation of Aggregator failed: none of the configured actors were able to handle avg`,
  );
  addTest<IActionContextPreprocess, IActorContextPreprocessOutput>(
    'context-preprocess',
    ':optimize-query-operation/actors#query-source-identify',
    'mediatorContextPreprocess',
    {},
    `Context preprocessing failed`,
  );
  addTest<IActionDereference, IActorDereferenceOutput>(
    'dereference',
    ':dereference-rdf/actors#parse',
    'mediatorDereference',
    { url: 'http://example.org/' },
    `Dereferencing failed: none of the configured actors were able to handle http://example.org/`,
  );
  addTest<IActionDereferenceRdf, IActorDereferenceRdfOutput>(
    'dereference-rdf',
    ':query-source-dereference-link/actors#dereference',
    'mediatorDereferenceRdf',
    <any> { handle: <any> { data: <any> undefined, context, mediaType: 'text/css', url: 'http://example.org/' }},
    `RDF dereferencing failed: none of the configured parsers were able to handle the media type text/css for http://example.org/`,
  );
  addTest<IActionExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryOutput>(
    'expression-evaluator-factory',
    ':query-operation/actors#extend',
    'mediatorExpressionEvaluatorFactory',
    { algExpr: <any> {
      type: Algebra.Types.EXPRESSION,
      expressionType: Algebra.ExpressionTypes.TERM,
      term: DF.variable('x'),
    }},
      `Creation of Expression Evaluator failed`,
  );
  addTest<IActionFunctionFactory, IActorFunctionFactoryOutput>(
    'function-factory',
    ':expression-evaluator-factory/actors#default',
    'mediatorFunctionFactory',
    {
      functionName: 'http://example.org/',
      requireTermExpression: false,
    },
      `Creation of function evaluator failed: no configured actor was able to evaluate function http://example.org/`,
  );
  addTest<IActionHashBindings, IActorHashBindingsOutput>(
    'hash-bindings',
    ':rdf-join/actors#inner-hash-def',
    'mediatorHashBindings',
    { allowHashCollisions: false },
    `Failed to obtaining hash functions for bindings`,
  );
  addTest<IActionHttp, IActorHttpOutput>(
    'http',
    ':dereference/actors#http',
    'mediatorHttp',
    { input: 'http://example.org/' },
    `HTTP request failed: none of the configured actors were able to handle http://example.org/`,
  );
  // 'http-invalidate' uses MediatorAll, which never fails.
  // 'init' has no mediator.
  // 'merge-bindings-context' ignores failures.
  // 'optimize-query-operation' ignores failures.
  addTest<IActionOptimizeQueryOperation, IActorOptimizeQueryOperationOutput>(
    'query-operation',
    ':query-operation/actors#ask',
    'mediatorQueryOperation',
    { operation: <any> { type: 'unknown' }},
    `Query operation processing failed: none of the configured actors were able to handle the operation type unknown`,
  );
  addTest<IActionQueryParse, IActorQueryParseOutput>(
    'query-parse',
    ':query-process/actors#sequential',
    'mediatorQueryParse',
    { query: 'abc' },
    `Query parsing failed: none of the configured parsers were able to the query "abc"`,
  );
  addTest<IActionQueryParse, IActorQueryParseOutput>(
    'query-process',
    ':init/actors#query',
    'mediatorQueryProcess',
    { query: 'abc' },
    `Query processing failed: none of the configured actor were process to the query "abc"`,
  );
  addTest<
    IActionQueryResultSerializeHandle,
    IActorOutputQueryResultSerializeHandle,
IActorTestQueryResultSerializeHandle
>(
  'query-result-serialize',
  ':init/actors#query',
  'mediatorQueryResultSerialize',
  { handle: { type: 'abc', context }},
    `Query result serialization failed: none of the configured actors were able to serialize for type abc`,
);
  addTest<
    IActionQuerySerialize,
    IActorQuerySerializeOutput
  >(
    'query-serialize',
    ':query-source-identify-hypermedia/actors#sparql',
    'mediatorQuerySerialize',
    { queryFormat: { language: 'sparql', version: '1.1' }, operation: <any> {}},
    `Query serializing failed: none of the configured parsers were able to serialize for the query language "sparql" at version "1.1"`,
  );
  addTest<IActionQuerySourceDereferenceLink, IActorQuerySourceDereferenceLinkOutput>(
    'query-source-dereference-link',
    ':query-source-identify/actors#hypermedia',
    'mediatorQuerySourceDereferenceLink',
    { link: { url: 'abc' }},
    `Query source dereference link failed: none of the configured actors were able to resolve abc`,
  );
  addTest<IActionQuerySourceIdentify, IActorQuerySourceIdentifyOutput>(
    'query-source-identify',
    ':optimize-query-operation/actors#query-source-identify',
    'mediatorQuerySourceIdentify',
    { querySourceUnidentified: { value: 'abc' }},
    `Query source identification failed: none of the configured actors were able to identify abc`,
  );
  addTest<
    IActionQuerySourceIdentifyHypermedia,
IActorQuerySourceIdentifyHypermediaOutput,
IActorQuerySourceIdentifyHypermediaTest
>(
  'query-source-identify-hypermedia',
  ':query-source-dereference-link/actors#dereference',
  'mediatorQuerySourceIdentifyHypermedia',
  { url: 'http://example.org/', metadata: {}, quads: <any> undefined },
    `Query source hypermedia identification failed: none of the configured actors were able to identify http://example.org/`,
);
  addTest<
    IActionRdfJoin,
    IQueryOperationResultBindings,
IMediatorTypeJoinCoefficients
  >(
    'rdf-join',
    ':rdf-join/actors#inner-multi-smallest',
    'mediatorJoin',
    { type: 'inner', entries: []},
    `RDF joining failed: none of the configured actors were able to handle the join type inner`,
  );
  addTest<IActionRdfJoinEntriesSort, IActorRdfJoinEntriesSortOutput>(
    'rdf-join-entries-sort',
    ':rdf-join/actors#inner-multi-smallest-filter-bindings',
    'mediatorJoinEntriesSort',
    { entries: []},
    `Sorting join entries failed: none of the configured actors were able to sort`,
  );
  addTest<IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput, IMediatorTypeAccuracy>(
    'rdf-join-selectivity',
    ':rdf-join/actors#inner-none',
    'mediatorJoinSelectivity',
    { entries: []},
    `Determining join selectivity failed: none of the configured actors were able to calculate selectivities`,
  );
  addTest<IActionRdfMetadata, IActorRdfMetadataOutput>(
    'rdf-metadata',
    ':rdf-update-quads/actors#hypermedia',
    'mediatorMetadata',
    { url: 'http://example.org/', quads: <any> undefined },
    `Metadata splicing failed: none of the configured actors were able to splice metadata from http://example.org/`,
  );
  addTest<IActionRdfMetadataAccumulate, IActorRdfMetadataAccumulateOutput>(
    'rdf-metadata-accumulate',
    ':query-source-identify/actors#hypermedia',
    'mediatorMetadataAccumulate',
    { mode: 'initialize' },
    `actor test failure`,
  );
  // 'rdf-metadata-extract' ignores failures.
  addTest<IActionRdfParseHandle, IActorOutputRdfParseHandle>(
    'rdf-parse',
    ':dereference-rdf/actors#parse',
    'mediatorParse',
    { handle: <any> { data: <any> undefined, context, mediaType: 'text/css', url: 'http://example.org/' }},
    `RDF parsing failed: none of the configured parsers were able to handle the media type text/css for http://example.org/`,
  );
  // 'rdf-parse-html' has no mediator.
  addTest<IActionRdfResolveHypermediaLinks, IActorRdfResolveHypermediaLinksOutput>(
    'rdf-resolve-hypermedia-links',
    ':query-source-identify/actors#hypermedia',
    'mediatorRdfResolveHypermediaLinks',
    { metadata: {}},
    `Hypermedia link resolution failed: none of the configured actors were able to resolve links from metadata`,
  );
  addTest<IActionRdfResolveHypermediaLinksQueue, IActorRdfResolveHypermediaLinksQueueOutput>(
    'rdf-resolve-hypermedia-links-queue',
    ':query-source-identify/actors#hypermedia',
    'mediatorRdfResolveHypermediaLinksQueue',
    { firstUrl: 'http://example.org/' },
    `Link queue creation failed: none of the configured actors were able to create a link queue`,
  );
  addTest<IActionRdfSerializeHandle, IActorOutputRdfSerializeHandle, IActorTestRdfSerializeHandle>(
    'rdf-serialize',
    ':query-result-serialize/actors#rdf',
    'mediatorRdfSerialize',
    { handle: { quadStream: <any> undefined, context }, handleMediaType: 'MEDIATYPE' },
    `RDF serialization failed: none of the configured serializers were able to handle media type MEDIATYPE`,
  );
  addTest<IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput>(
    'rdf-update-hypermedia',
    ':rdf-update-quads/actors#hypermedia',
    'mediatorRdfUpdateHypermedia',
    { url: 'http://example.org/', exists: true, metadata: {}},
    `RDF hypermedia updating failed: none of the configured actors were able to handle an update for http://example.org/`,
  );
  addTest<IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput>(
    'rdf-update-quads',
    ':query-operation/actors#update-delete-insert',
    'mediatorUpdateQuads',
    {},
    `RDF updating failed: none of the configured actors were able to handle an update`,
  );
  addTest<IActionTermComparatorFactory, IActorTermComparatorFactoryOutput>(
    'term-comparator-factory',
    ':query-operation/actors#orderby',
    'mediatorTermComparatorFactory',
    {},
      `Creation of term comparator failed`,
  );

  /**
   * Add a test for a given bus mediator.
   * @param name The bus name.
   * @param mediatorAccessorActorName The name of an actor that contains the given mediator.
   * @param mediatorAccessorActorMediatorField The field name in the accessed actor that contains the mediator to select
   * @param action An action to simulate.
   * @param failMessage The failure message to expect when all actors in the bus fail.
   */
  function addTest<I extends IAction, O extends IActorOutput, T extends IActorTest = IActorTest>(
    name: string,
    mediatorAccessorActorName: string,
    mediatorAccessorActorMediatorField: string,
    action: Omit<I, 'context'>,
    failMessage: string,
  ): void {
    describe(name, () => {
      let mediator: Mediate<I, O, T>;
      let bus: Bus<any, any, any, any>;

      describe('with all actors failing', () => {
        beforeEach(() => {
          for (const actor of runner.actors) {
            if (actor.name.endsWith(mediatorAccessorActorName)) {
              mediator = (<any> actor)[mediatorAccessorActorMediatorField];
              bus = mediator.bus;
            }
          }
          for (const actor of runner.actors) {
            if (actor.bus === bus) {
              actor.test = () => Promise.resolve(failTest('actor test failure'));
            }
          }
        });

        it('mediator rejects', async() => {
          if (!mediator) {
            throw new Error(`Could not find the mediator in '${mediatorAccessorActorName}' through '${mediatorAccessorActorMediatorField}'`);
          }
          await expect(mediator.mediate(<I> { ...action, context })).rejects.toThrow(failMessage);
        });
      });
    });
  }
});
