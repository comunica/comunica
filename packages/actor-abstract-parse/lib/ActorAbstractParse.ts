import type { IAction, IActorOutput } from '@comunica/core';
import type { Readable } from 'readable-stream';

export type IParseMetadata = Record<string, any> | undefined;

export interface IActionParse<T extends IParseMetadata = IParseMetadata> extends IAction {
  /**
   * A readable string stream in a certain serialization that needs to be parsed.
   */
  data: NodeJS.ReadableStream;
  /**
   * The returned headers of the final URL.
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
   */
  data: T & Readable;
  /**
   * Any metadata produced from Parsing
   */
  metadata?: K;
}
