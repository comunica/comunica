import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { IQuerySource } from './IQuerySource';

export interface IStatisticDocumentSize {
  /**
   * Set size of document at URL
   *
   * @param link The dereferenced URL
   * @param documentSize The size of the dereferenced document
   * @returns Boolean indicating success
   */
  setDocumentSize: (link: ILink, documentSize: number) => boolean;

  /**
   * Returns the size of document dereferenced from URL
   * @param link
   * @returns size of document dereferenced at URL
   */
  getDocumentSize: (link: ILink) => number | undefined;
}

export interface IStatisticRequestTime {
  /**
   * Set HTTP request time of document at URL
   *
   * @param link The dereferenced URL
   * @param documentSize The HTTP request time of document
   * @returns Boolean indicating success
   */
  setRequestTime: (link: ILink, requestTime: number) => boolean;

  /**
   * Returns the size of document dereferenced from URL
   * @param link
   * @returns The HTTP request time of document
   */
  getDocumentSize: (link: ILink) => number | undefined;
}

export interface IStatisticDiscoveredLinks {
  /**
   * Set parent - child relation of discovered link
   * @param link The link discovered by the engine
   * @returns Boolean indicating success
   */
  setDiscoveredLink: (link: ILink, parent: ILink) => boolean;

  /**
   *
   * @returns List of all discovered [ parent - child ] relations
   */
  getDiscoveredLinks: () => Set<[string, string]>;
}

export interface IStatisticDereferencedLinks {
  /**
   * Track dereference event by engine
   * @param link Link dereferenced by the engine
   * @returns Boolean indicating success
   */
  setDereferenced: (link: ILink, source: IQuerySource) => boolean;

  /**
   * Returns ordered list of dereferenced links, indicating order of
   * traversal of engine
   * @returns list of URLs
   */
  getDereferencedLinks: () => ILink[];
}
