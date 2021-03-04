import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { Bindings } from '@comunica/bus-query-operation';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import { BufferedIterator } from 'asynciterator';
import { SparqlJsonParser } from 'sparqljson-parse';

/**
 * An AsyncIterator that executes a SPARQL query against an endpoint, parses each binding, and emits it in this stream.
 */
export class AsyncIteratorJsonBindings extends BufferedIterator<Bindings> {
  private readonly endpoint: string;
  private readonly query: string;
  private readonly context?: ActionContext;
  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  private initialized = false;

  public constructor(endpoint: string, query: string, context: ActionContext | undefined, mediatorHttp: Mediator<
  Actor<IActionHttp, IActorTest, IActorHttpOutput>, IActionHttp, IActorTest, IActorHttpOutput>) {
    super({ autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY });
    this.endpoint = endpoint;
    this.query = query;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  protected _read(count: number, done: () => void): void {
    if (!this.initialized) {
      this.initialized = true;
      this.fetchBindingsStream(this.endpoint, this.query, this.context)
        .then(responseStream => {
          const rawBindingsStream = new SparqlJsonParser({ prefixVariableQuestionMark: true })
            .parseJsonResultsStream(responseStream);
          responseStream.on('error', error => rawBindingsStream.emit('error', error));

          rawBindingsStream.on('error', error => this.emit('error', error));
          rawBindingsStream.on('data', rawBindings => this._push(Bindings(rawBindings)));
          rawBindingsStream.on('end', () => {
            this.close();
          });

          super._read(count, done);
        })
        .catch(error => this.emit('error', error));
    } else {
      super._read(count, done);
    }
  }

  protected async fetchBindingsStream(endpoint: string, query: string, context?: ActionContext):
  Promise<NodeJS.ReadableStream> {
    const url = `${endpoint}?query=${encodeURIComponent(query)}`;

    // Initiate request
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { context, input: url, init: { headers }};
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = ActorHttp.toNodeReadable(httpResponse.body);

    // Emit an error if the server returned an invalid response
    if (!httpResponse.ok) {
      throw new Error(
        `Invalid SPARQL endpoint (${endpoint}) response: ${httpResponse.statusText} (${httpResponse.status})`,
      );
    }

    return responseStream;
  }
}
