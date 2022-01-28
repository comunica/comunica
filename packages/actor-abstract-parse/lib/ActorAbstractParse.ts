import type {
  IActorArgsMediaTyped
} from '@comunica/actor-abstract-mediatyped';
import {
  ActorAbstractMediaTyped
} from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import type { Readable } from 'stream';

export abstract class ActorParse<
  I extends IActionParse<any>,
  T extends IActorTest,
  O extends IActorParseOutput<any, any>
> extends ActorAbstractMediaTyped<I, T, O> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorArgsMediaTyped<I, T, O>) {
    super(args);
  }
}

export interface IActionParse<T extends { [key: string]: any } | undefined = undefined> extends IAction {
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

export interface IActorParseOutput<T, K extends { [key: string]: any } | undefined = undefined> extends IActorOutput {
  /**
   * The resulting data stream.
   */
  data: T & Readable;
  /**
   * Any metadata produced from Parsing
   */
  metadata?: K
}
