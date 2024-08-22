import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
  IQueryOperationResultVoid,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { termToString } from 'rdf-string';
import { Readable } from 'readable-stream';

/**
 * A comunica Simple Sparql Serialize Actor.
 */
export class ActorQueryResultSerializeSimple extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{ "simple": 0.9 }} mediaTypePriorities
   *   \ @defaultNested {{ "simple": "https://comunica.linkeddatafragments.org/#results_simple" }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public override async testHandleChecked(action: IActionSparqlSerialize, _context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean', 'void' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams, quad streams, booleans, or updates.');
    }
    return true;
  }

  protected static termToString(term: RDF.Term): string {
    return term.termType === 'Quad' ? termToString(term) : term.value;
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    if (action.type === 'bindings') {
      data.wrap(<any> (<IQueryOperationResultBindings>action).bindingsStream.map((bindings: RDF.Bindings) => `${[ ...bindings ].map(
        ([ key, value ]) => `?${key.value}: ${ActorQueryResultSerializeSimple.termToString(value)}`,
      ).join('\n')}\n\n`));
    } else if (action.type === 'quads') {
      data.wrap(<any> (<IQueryOperationResultQuads>action).quadStream.map(quad =>
        `subject: ${ActorQueryResultSerializeSimple.termToString(quad.subject)}\n` +
        `predicate: ${ActorQueryResultSerializeSimple.termToString(quad.predicate)}\n` +
        `object: ${ActorQueryResultSerializeSimple.termToString(quad.object)}\n` +
        `graph: ${ActorQueryResultSerializeSimple.termToString(quad.graph)}\n\n`));
    } else {
      data.wrap(<any> wrap(
        action.type === 'boolean' ?
            (<IQueryOperationResultBoolean> action).execute().then(value => [ `${value}\n` ]) :
            (<IQueryOperationResultVoid>action).execute().then(() => [ 'ok\n' ]),
      ));
    }

    return { data };
  }
}
