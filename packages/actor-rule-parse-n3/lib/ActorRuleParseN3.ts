import type { MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';
import type { MediatorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import type {
  IActionRuleParse, IActorRuleParseOutput, IActorRuleParseFixedMediaTypesArgs,
} from '@comunica/bus-rule-parse';
import { ActorRuleParseFixedMediaTypes } from '@comunica/bus-rule-parse';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { promisifyEventEmitter } from 'event-emitter-promisify';
import type { Quad, Quad_Object } from 'n3';
import { Store, DataFactory } from 'n3';

const { quad } = DataFactory;
// Test suite
// https://github.com/w3c/N3/blob/16d1eec49048f87a97054540f4e1301e73a12130/tests/N3Tests/cwm_syntax/
// this-quantifiers-ref2.n3

/**
 * A comunica N3 Rule Parse Actor.
 */
export class ActorRuleParseN3 extends ActorRuleParseFixedMediaTypes {
  // Whilst we do not currently use is mediator inside this component - we are leaving it here to prevent version
  // inflation when we require it in the future.
  // The plan is to replace lines 43-53 with mediatorRdfResolveQuadPattern.mediate and hence we are able to resolve
  // more types of sources
  public readonly mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;
  public readonly mediatorRdfParse: MediatorRdfParseHandle;

  /**
   * TODO: Check this
   * @param args -
   *   \ @defaultNested {{
   *       "application/n-quads": 1.0,
   *       "application/trig": 0.95,
   *       "application/n-triples": 0.8,
   *       "text/turtle": 0.6,
   *       "text/n3": 0.35
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/n-quads": "http://www.w3.org/ns/formats/N-Quads",
   *       "application/trig": "http://www.w3.org/ns/formats/TriG",
   *       "application/n-triples": "http://www.w3.org/ns/formats/N-Triples",
   *       "text/turtle": "http://www.w3.org/ns/formats/Turtle",
   *       "text/n3": "http://www.w3.org/ns/formats/N3"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorParseN3Args) {
    super(args);
  }

  public async testHandle(action: IActionRuleParse, mediaType: string, context: IActionContext): Promise<IActorTest> {
    return this.mediatorRdfParse.publish({
      handle: action,
      context,
      handleMediaType: mediaType,
    });
  }

  public async runHandle(action: IActionRuleParse, mediaType: string, context: ActionContext):
  Promise<IActorRuleParseOutput> {
    const { handle } = await this.mediatorRdfParse.mediate({
      handle: action,
      context,
      handleMediaType: mediaType,
    });

    const store = new Store();
    await promisifyEventEmitter(store.import(handle.data));

    const matches = wrap<Quad>(
      store.match(null, DataFactory.namedNode('http://www.w3.org/2000/10/swap/log#implies'), null),
    );

    const rules = matches.transform<Rule>({
      async transform({ subject, object }, done, push) {
        if (subject.termType === 'BlankNode' && object.termType === 'BlankNode') {
          push({
            premise: await match(store, subject),
            conclusion: await match(store, object),
            ruleType: 'premise-conclusion',
          });
        }
        done();
      },
    });

    return { data: <any> rules };
  }
}

function match(store: Store, object: Quad_Object): Promise<RDF.Quad[]> {
  // TODO: add graph as variable
  return wrap<Quad>(store.match(null, null, null, object))
    .map(_quad => quad(_quad.subject, _quad.predicate, _quad.object, DataFactory.variable('g')))
    .toArray();
}

export interface IActorParseN3Args extends IActorRuleParseFixedMediaTypesArgs {
  mediatorRdfParse: MediatorRdfParseHandle;
}
