import { Readable } from 'stream';
import type { IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import {
  ActorRdfParseFixedMediaTypes,
} from '@comunica/bus-rdf-parse';
import type {
  IActionRdfParseHtml,
  IActorRdfParseHtmlOutput,
  IHtmlParseListener,
} from '@comunica/bus-rdf-parse-html';
import type { ActionContext, Actor, Bus, IActorTest } from '@comunica/core';
import { WritableStream as HtmlParser } from 'htmlparser2/lib/WritableStream';
import type * as RDF from 'rdf-js';

/**
 * A comunica HTML RDF Parse Actor.
 * It creates an HTML parser, and delegates its events via the bus-rdf-parse-html bus to other HTML parsing actors.
 */
export class ActorRdfParseHtml extends ActorRdfParseFixedMediaTypes {
  private readonly busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest,
  IActorRdfParseHtmlOutput>, IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;

  public constructor(args: IActorRdfParseHtmlArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
  Promise<IActorRdfParseOutput> {
    const quads = new Readable({ objectMode: true });
    quads._read = async() => {
      // Only initialize once
      quads._read = () => {
        // Do nothing
      };

      // Create callbacks action
      let endBarrier = 1;
      function emit(quad: RDF.Quad): void {
        quads.emit('data', quad);
      }
      function error(subError: unknown): void {
        quads.emit('error', subError);
      }
      function end(): void {
        if (--endBarrier === 0) {
          quads.push(null);
        }
      }
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
        .then(async outputs => {
          endBarrier += outputs.length;

          const htmlParseListeners: IHtmlParseListener[] = [];
          for (const output of outputs) {
            const { htmlParseListener } = await output.actor.run(htmlAction);
            htmlParseListeners.push(htmlParseListener);
          }

          // Create parser
          const parser = new HtmlParser({
            onclosetag() {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onTagClose();
                }
              } catch (error_: unknown) {
                error(error_);
              }
            },
            onend() {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onEnd();
                }
              } catch (error_: unknown) {
                error(error_);
              }
              end();
            },
            onopentag(name: string, attributes: Record<string, string>) {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onTagOpen(name, attributes);
                }
              } catch (error_: unknown) {
                error(error_);
              }
            },
            ontext(data: string) {
              try {
                for (const htmlParseListener of htmlParseListeners) {
                  htmlParseListener.onText(data);
                }
              } catch (error_: unknown) {
                error(error_);
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
        }).catch(error);
    };

    return { quads };
  }
}

export interface IActorRdfParseHtmlArgs extends IActorRdfParseFixedMediaTypesArgs {
  busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>,
  IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;
}
