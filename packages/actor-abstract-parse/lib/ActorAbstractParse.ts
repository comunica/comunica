import type { Readable } from 'stream';
import type {
  IActorArgsMediaTyped,
} from '@comunica/actor-abstract-mediatyped';
import {
  ActorAbstractMediaTyped,
} from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest } from '@comunica/core';

export type IParseMetadata = Record<string, any> | undefined;

export abstract class ActorAbstractParse<I extends IActionParse, T extends IActorTest, O extends IActorParseOutput<any>>
  extends ActorAbstractMediaTyped<I, T, O> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorArgsMediaTyped<I, T, O>) {
    super(args);
  }
}

export interface IActionParse<T extends IParseMetadata = IParseMetadata> extends IAction {
  /**
   * A readable string stream in a certain serialization that needs to be parsed.
   */
  data: NodeJS.ReadableStream;
  /**
   * The returned headers of the final URL.
   * TODO: Get these somewhere else
   */
  headers?: Headers;
  /**
   * Metadata properties to be given to the string stream that needs to be parsed
   */
  metadata?: T;
}

export interface IActorParseOutput<T, K extends IParseMetadata = IParseMetadata> extends IActorOutput {
  /**
   * The resulting data stream.
   * TODO: Make this T & Readable again
   */
  data: T & Readable;
  /**
   * Any metadata produced from Parsing
   */
  metadata?: K;
}
