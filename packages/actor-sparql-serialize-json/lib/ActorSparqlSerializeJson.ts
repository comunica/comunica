import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import { ActorSparqlSerializeFixedMediaTypes } from '@comunica/bus-sparql-serialize';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings, IActorQueryOperationOutputBoolean,
  IActorQueryOperationOutputQuads } from '@comunica/types';
import * as RdfString from 'rdf-string';

/**
 * A comunica JSON SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeJson extends ActorSparqlSerializeFixedMediaTypes {
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let empty = true;
    if (action.type === 'bindings') {
      const resultStream = (<IActorQueryOperationOutputBindings> action).bindingsStream;
      data.push('[');
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', element => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(element.map(RdfString.termToString)));
        empty = false;
      });
      resultStream.on('end', () => {
        data.push(empty ? ']\n' : '\n]\n');
        data.push(null);
      });
    } else if (action.type === 'quads') {
      const resultStream = (<IActorQueryOperationOutputQuads> action).quadStream;
      data.push('[');
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', element => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(RdfString.quadToStringQuad(element)));
        empty = false;
      });
      resultStream.on('end', () => {
        data.push(empty ? ']\n' : '\n]\n');
        data.push(null);
      });
    } else {
      try {
        data.push(`${JSON.stringify(await (<IActorQueryOperationOutputBoolean> action).booleanResult)}\n`);
        data.push(null);
      } catch (error: unknown) {
        setImmediate(() => data.emit('error', error));
      }
    }

    return { data };
  }
}
