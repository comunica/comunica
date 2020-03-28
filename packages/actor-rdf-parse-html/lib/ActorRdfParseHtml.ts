import {
  ActorRdfParseFixedMediaTypes,
  IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
} from "@comunica/bus-rdf-parse";
import {
  IActionRdfParseHtml,
  IActorRdfParseHtmlOutput,
  IHtmlParseListener,
} from "@comunica/bus-rdf-parse-html";
import {ActionContext, Actor, Bus, IActorTest} from "@comunica/core";
import {Parser as HtmlParser} from "htmlparser2";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A comunica HTML RDF Parse Actor.
 * It creates an HTML parser, and delegates its events via the bus-rdf-parse-html bus to other HTML parsing actors.
 */
export class ActorRdfParseHtml extends ActorRdfParseFixedMediaTypes {

  private readonly busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest,
    IActorRdfParseHtmlOutput>, IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;

  constructor(args: IActorRdfParseHtmlArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {
    const quads = new Readable({ objectMode: true });
    quads._read = async () => {
      // Only initialize once
      quads._read = null;

      // Create callbacks action
      let endBarrier = 1;
      const emit = (quad: RDF.Quad) => quads.emit('data', quad);
      const error = (e: Error) => quads.emit('error', e);
      const end = () => {
        if (--endBarrier === 0) {
          quads.push(null);
        }
      };
      const htmlAction = {
        baseIRI: action.baseIRI,
        context,
        emit,
        end,
        error,
        headers: action.headers,
      };

      // Register html parse listeners
      Promise.all(this.busRdfParseHtml.publish(htmlAction))
        .then(async (outputs) => {
          endBarrier += outputs.length;

          const htmlParseListeners: IHtmlParseListener[] = [];
          for (const output of outputs) {
            const { htmlParseListener } = await output.actor.run(htmlAction);
            htmlParseListeners.push(htmlParseListener);
          }

          // Create parser
          const parser = new HtmlParser({
            onclosetag: () => {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onTagClose();
                }
              } catch (e) {
                error(e);
              }
            },
            onend: () => {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onEnd();
                }
              } catch (e) {
                error(e);
              }
              end();
            },
            onopentag: (name: string, attributes: {[s: string]: string}) => {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onTagOpen(name, attributes);
                }
              } catch (e) {
                error(e);
              }
            },
            ontext: (data: string) => {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onText(data);
                }
              } catch (e) {
                error(e);
              }
            },
          }, {
            decodeEntities: true,
            recognizeSelfClosing: true,
            xmlMode: false,
          });

          // Push stream to parser
          action.input.on('error', error);
          action.input.pipe(<any> parser);
        });
    };

    return { quads };
  }

}

export interface IActorRdfParseHtmlArgs extends IActorRdfParseFixedMediaTypesArgs {
  busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>,
    IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;
}
