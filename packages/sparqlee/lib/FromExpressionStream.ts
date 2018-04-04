import { AsyncIterator } from 'asynciterator';
import * as Promise from 'bluebird';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { Bindings, BindingsStream } from './core/Bindings';

export type Lookup = (pattern: Alg.Bgp) => Promise<boolean>;

export interface IFilteredStream extends BindingsStream { }

export interface IEvaluatedBindings {
  bindings: Bindings;
  result: RDF.Term;
}

export interface IEvaluatedStream extends AsyncIterator<IEvaluatedBindings> { }
