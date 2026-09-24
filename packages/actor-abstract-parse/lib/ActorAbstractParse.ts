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
  /**
   * The URL the data was obtained from, which identifies the data in messages such as errors.
   * Data that was not obtained from a URL (such as a serialized source) describes where it comes from instead.
   */
  url?: string;
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
