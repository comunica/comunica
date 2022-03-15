import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based Bindings object.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  private readonly dataFactory: RDF.DataFactory;
  private readonly entries: Map<string, RDF.Term>;

  public constructor(dataFactory: RDF.DataFactory, entries: Map<string, RDF.Term>) {
    this.dataFactory = dataFactory;
    this.entries = entries;
  }

  public has(key: RDF.Variable | string): boolean {
    return this.entries.has(typeof key === 'string' ? key : key.value);
  }

  public get(key: RDF.Variable | string): RDF.Term | undefined {
    return this.entries.get(typeof key === 'string' ? key : key.value);
  }

  public set(key: RDF.Variable | string, value: RDF.Term): Bindings {
    return new Bindings(this.dataFactory, this.entries.set(typeof key === 'string' ? key : key.value, value));
  }

  public delete(key: RDF.Variable | string): Bindings {
    return new Bindings(this.dataFactory, this.entries.delete(typeof key === 'string' ? key : key.value));
  }

  public keys(): Iterable<RDF.Variable> {
    return this.mapIterable<string, RDF.Variable>(
      this.iteratorToIterable(this.entries.keys()),
      key => this.dataFactory.variable!(key),
    );
  }

  public values(): Iterable<RDF.Term> {
    return this.iteratorToIterable(this.entries.values());
  }

  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    this.entries.forEach((value, key) => fn(value, this.dataFactory.variable!(key)));
  }

  public get size(): number {
    return this.entries.size;
  }

  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    return this.mapIterable<[string, RDF.Term], [RDF.Variable, RDF.Term]>(
      this.iteratorToIterable(<Iterator<[string, RDF.Term]>> this.entries.entries()),
      ([ key, value ]) => [ this.dataFactory.variable!(key), value ],
    )[Symbol.iterator]();
  }

  public equals(other: RDF.Bindings | null | undefined): boolean {
    if (!other) {
      return false;
    }
    if (this === other) {
      return true;
    }

    // First check if size is equal
    if (this.size !== other.size) {
      return false;
    }

    // Then check if keys and values are equal
    for (const key of this.keys()) {
      if (!this.get(key)?.equals(other.get(key))) {
        return false;
      }
    }

    return true;
  }

  public filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean): Bindings {
    return new Bindings(this.dataFactory, Map(<any> this.entries
      .filter((value, key) => fn(value, this.dataFactory.variable!(key)))));
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    return new Bindings(this.dataFactory, Map(<any> this.entries
      .map((value, key) => fn(value, this.dataFactory.variable!(key)))));
  }

  public merge(other: Bindings): Bindings | undefined {
    // Determine the union of keys
    const keys = new Set([
      ...this.iteratorToIterable(this.entries.keys()),
      ...[ ...other.keys() ].map(key => key.value),
    ]);

    // Collect entries
    const entries: [string, RDF.Term][] = [];
    for (const key of keys) {
      const left = this.entries.get(key)!;
      const right = other.get(this.dataFactory.variable!(key));
      if (left && right && !left.equals(right)) {
        return;
      }
      const value = left || right;
      entries.push([ key, value ]);
    }

    return new Bindings(this.dataFactory, Map(entries));
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: Bindings,
  ): Bindings {
    // Determine the union of keys
    const keys = new Set([
      ...this.iteratorToIterable(this.entries.keys()),
      ...[ ...other.keys() ].map(key => key.value),
    ]);

    // Collect entries
    const entries: [string, RDF.Term][] = [];
    for (const key of keys) {
      const variable = this.dataFactory.variable!(key);
      const left = this.entries.get(key)!;
      const right = other.get(variable);
      let value: RDF.Term;
      if (left && right && !left.equals(right)) {
        value = merger(left, right, variable);
      } else {
        value = left || right;
      }
      entries.push([ key, value ]);
    }

    return new Bindings(this.dataFactory, Map(entries));
  }

  public toString(): string {
    return bindingsToString(this);
  }

  protected * mapIterable<T, U>(iterable: Iterable<T>, callback: (value: T) => U): Iterable<U> {
    for (const x of iterable) {
      // eslint-disable-next-line callback-return
      yield callback(x);
    }
  }

  protected iteratorToIterable<T>(iterator: Iterator<T>): Iterable<T> {
    return {
      [Symbol.iterator]: () => iterator,
    };
  }
}
