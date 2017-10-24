import {ActorRdfParse, IActionRdfParse, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {IAction, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";
import * as _ from "lodash";
import {
  IActionRdfParseOrMediaType, IActorOutputRdfParseOrMediaType,
  IActorRdfMediaTypeOutput,
} from "../../bus-rdf-parse/lib/ActorRdfParse";
// TODO: Temporarily use rdf-parser-n3, until N3 is ported to RDFJS
const N3Parser: any = require('rdf-parser-n3'); // tslint:disable-line:no-var-requires

/**
 * An N3 RDF Parse actor that listens to on the 'rdf-parse' bus.
 *
 * It is able to parse N3-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseN3 extends ActorRdfParse implements IActorRdfParseN3Args {

  public static DEFAULT_MEDIA_TYPES: {[id: string]: number} = {
    'application/trig': 1.0,
    'application/n-quads': 0.7, // tslint:disable-line:object-literal-sort-keys // We want to sort by preference
    'text/turtle': 0.6,
    'application/n-triples': 0.3,
    'text/n3': 0.2,
  };
  public readonly mediaTypes: {[id: string]: number};
  public readonly priorityScale: number;

  constructor(args: IActorRdfParseN3Args) {
    super(args);
    if (!this.mediaTypes) {
      this.mediaTypes = _.clone(ActorRdfParseN3.DEFAULT_MEDIA_TYPES);
    }
    const scale: number = this.priorityScale || this.priorityScale === 0 ? this.priorityScale : 1;
    this.mediaTypes = _.mapValues(this.mediaTypes, (priority) => priority * scale);
    this.mediaTypes = Object.freeze(this.mediaTypes);
  }

  public async testParse(action: IActionRdfParse): Promise<IActorTest> {
    if (!(action.mediaType in this.mediaTypes)) {
      throw new Error('Unrecognized media type');
    }
    return true;
  }

  public async runParse(action: IActionRdfParse): Promise<IActorRdfParseOutput> {
    return { quads: N3Parser.import(action.input) };
  }

  public async runMediaType(action: IAction): Promise<IActorRdfMediaTypeOutput> {
    return { mediaTypes: this.mediaTypes };
  }

}

export interface IActorRdfParseN3Args
  extends IActorArgs<IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType> {
  mediaTypes?: {[id: string]: number};
  priorityScale?: number;
}
