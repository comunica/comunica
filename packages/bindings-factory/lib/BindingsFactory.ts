import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { Bindings } from './Bindings';

/**
 * A Bindings factory that provides Bindings backed by immutable.js.
 */
export class BindingsFactory implements RDF.BindingsFactory {
  private readonly dataFactory: RDF.DataFactory;

  public constructor(dataFactory: RDF.DataFactory = new DataFactory()) {
    this.dataFactory = dataFactory;
  }

  public bindings(entries: [RDF.Variable, RDF.Term][] = []): Bindings {
    return new Bindings(this.dataFactory, Map(entries.map(([ key, value ]) => [ key.value, value ])));
  }

  public fromBindings(bindings: Bindings): Bindings {
    return this.bindings([ ...bindings ]);
  }

  public fromRecord(record: Record<string, RDF.Term>): Bindings {
    return this.bindings(Object.entries(record).map(([ key, value ]) => [ this.dataFactory.variable!(key), value ]));
  }
}

export function bindingsToString(bindings: RDF.Bindings): string {
  const raw: Record<string, string> = {};
  for (const key of bindings.keys()) {
    raw[termToString(key)] = termToString(bindings.get(key))!;
  }
  return JSON.stringify(raw, null, '  ');
}
