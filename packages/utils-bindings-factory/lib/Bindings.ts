import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActionContext } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IActionContextKey } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based Bindings object.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  private readonly dataFactory: ComunicaDataFactory;
  private readonly entries: Map<string, RDF.Term>;
  private readonly contextHolder: IContextHolder | undefined;

  /**
   * Creates a new Bindings instance.
   * @param dataFactory The data factory used to create RDF terms.
   * @param entries An immutable map of variable name strings to RDF terms.
   * @param contextHolder An optional holder for the action context and its merge handlers.
   */
  public constructor(dataFactory: ComunicaDataFactory, entries: Map<string, RDF.Term>, contextHolder?: IContextHolder) {
    this.dataFactory = dataFactory;
    this.entries = entries;
    this.contextHolder = contextHolder;
  }

  /**
   * Checks whether a binding exists for the given variable.
   * @param key An RDF variable or variable name string.
   * @return True if a binding exists for the given variable, false otherwise.
   */
  public has(key: RDF.Variable | string): boolean {
    return this.entries.has(typeof key === 'string' ? key : key.value);
  }

  /**
   * Retrieves the term bound to the given variable.
   * @param key An RDF variable or variable name string.
   * @return The RDF term bound to the variable, or undefined if no binding exists.
   */
  public get(key: RDF.Variable | string): RDF.Term | undefined {
    return this.entries.get(typeof key === 'string' ? key : key.value);
  }

  /**
   * Returns a new Bindings with the given variable bound to the given term.
   * @param key An RDF variable or variable name string.
   * @param value The RDF term to bind to the variable.
   * @return A new Bindings instance with the added or updated binding.
   */
  public set(key: RDF.Variable | string, value: RDF.Term): Bindings {
    return new Bindings(
      this.dataFactory,
      this.entries.set(typeof key === 'string' ? key : key.value, value),
      this.contextHolder,
    );
  }

  /**
   * Returns a new Bindings with the binding for the given variable removed.
   * @param key An RDF variable or variable name string.
   * @return A new Bindings instance without the specified binding.
   */
  public delete(key: RDF.Variable | string): Bindings {
    return new Bindings(
      this.dataFactory,
      this.entries.delete(typeof key === 'string' ? key : key.value),
      this.contextHolder,
    );
  }

  /**
   * Returns an iterable of all variables in this Bindings.
   * @return An iterable of RDF variables.
   */
  public keys(): Iterable<RDF.Variable> {
    return this.mapIterable<string, RDF.Variable>(
      this.iteratorToIterable(this.entries.keys()),
      key => this.dataFactory.variable(key),
    );
  }

  /**
   * Returns an iterable of all bound terms in this Bindings.
   * @return An iterable of RDF terms.
   */
  public values(): Iterable<RDF.Term> {
    return this.iteratorToIterable(this.entries.values());
  }

  /**
   * Invokes a callback for each variable-term binding in this Bindings.
   * @param fn A function called with each term and its corresponding variable.
   */
  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    for (const [ key, value ] of this.entries.entries()) {
      fn(value, this.dataFactory.variable(key));
    }
  }

  /**
   * Returns the number of variable-term bindings.
   */
  public get size(): number {
    return this.entries.size;
  }

  /**
   * Returns an iterator over [variable, term] pairs in this Bindings.
   * @return An iterator of variable-term tuples.
   */
  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    return this.mapIterable<[string, RDF.Term], [RDF.Variable, RDF.Term]>(
      this.iteratorToIterable(<Iterator<[string, RDF.Term]>> this.entries.entries()),
      ([ key, value ]) => [ this.dataFactory.variable(key), value ],
    )[Symbol.iterator]();
  }

  /**
   * Checks whether this Bindings is equal to another Bindings.
   * @param other The other Bindings to compare with, or null/undefined.
   * @return True if both Bindings contain the same variable-term pairs, false otherwise.
   */
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

  /**
   * Returns a new Bindings containing only the entries for which the predicate returns true.
   * @param fn A predicate function called with each term and its variable.
   * @return A new Bindings instance with only the entries that satisfy the predicate.
   */
  public filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean): Bindings {
    return new Bindings(this.dataFactory, Map<string, RDF.Term>(<any> this.entries
      .filter((value, key) => fn(value, this.dataFactory.variable(key)))), this.contextHolder);
  }

  /**
   * Returns a new Bindings with each term transformed by the given function.
   * @param fn A mapping function called with each term and its variable.
   * @return A new Bindings instance with the transformed terms.
   */
  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    return new Bindings(this.dataFactory, Map<string, RDF.Term>(<any> this.entries
      .map((value, key) => fn(value, this.dataFactory.variable(key)))), this.contextHolder);
  }

  /**
   * Merges this Bindings with another if they are compatible.
   *
   * Two bindings are compatible when they share no variables with conflicting term values.
   * @param other The other Bindings to merge with.
   * @return A new merged Bindings, or undefined if the bindings are incompatible.
   */
  public merge(other: RDF.Bindings | Bindings): Bindings | undefined {
    if (this.size < other.size && other instanceof Bindings) {
      return other.merge(this);
    }
    let entries = this.entries;

    // Check if other is of type Bindings, in that case we can access entries immediately.
    // This skips the unnecessary conversion from string to variable.
    if (other instanceof Bindings) {
      for (const [ variable, right ] of other.entries) {
        const left = this.entries.get(variable);
        if (left && !left.equals(right)) {
          return;
        }
        entries = entries.set(variable, right);
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries.get(variable.value);
        if (left && !left.equals(right)) {
          return;
        }
        entries = entries.set(variable.value, right);
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  /**
   * Merges this Bindings with another, using a custom merger function to resolve conflicts.
   * @param merger A function that resolves conflicting terms for the same variable.
   * @param other The other Bindings to merge with.
   * @return A new merged Bindings with conflicts resolved by the merger function.
   */
  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings | Bindings,
  ): Bindings {
    if (this.size < other.size && other instanceof Bindings) {
      return other.mergeWith(merger, this);
    }
    let entries = this.entries;

    // For code comments see Bindings.merge function
    if (other instanceof Bindings) {
      for (const [ variable, right ] of other.entries) {
        const left = this.entries.get(variable);
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, this.dataFactory.variable(variable));
        } else {
          value = right;
        }
        entries = entries.set(variable, value);
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries.get(variable.value);
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, variable);
        } else {
          value = right;
        }
        entries = entries.set(variable.value, value);
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  /**
   * Creates a new Bindings with merged context entries from this and another Bindings.
   * @param entries The immutable map of variable-term entries for the new Bindings.
   * @param other The other Bindings whose context is merged into the result.
   * @return A new Bindings instance with merged contexts.
   */
  protected createBindingsWithContexts(entries: Map<string, RDF.Term>, other: RDF.Bindings | Bindings): Bindings {
    // If any context is empty, we skip merging contexts
    if (this.contextHolder && this.contextHolder.context) {
      let mergedContext = this.contextHolder.context;
      // Only merge if the other has a context
      if ('contextHolder' in other && other.contextHolder && other.contextHolder.context) {
        mergedContext = Bindings
          .mergeContext(this.contextHolder.contextMergeHandlers, mergedContext, other.contextHolder.context);
      }
      return new Bindings(
        this.dataFactory,
        entries,
        { contextMergeHandlers: this.contextHolder.contextMergeHandlers, context: mergedContext },
      );
    }

    // Otherwise, use optional context from other
    return new Bindings(this.dataFactory, entries, (<Bindings> other).contextHolder);
  }

  private static mergeContext(
    contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>>,
    context: IActionContext,
    otherContext: IActionContext,
  ): IActionContext {
    // All keys can contain duplicates, we prevent this by checking our built datamap for duplicates
    const allKeys = [ ...context.keys(), ...otherContext.keys() ];
    // Map we build up with merged context values
    const newContextData: Record<string, any> = {};
    const handledKeys: Record<string, number> = {};

    // Set of names of keys in other context to allow for constant time lookup
    const keysSetOtherContext = new Set(
      otherContext.keys().map(key => key.name),
    );
    const keysBothContext = context.keys().filter(
      key => keysSetOtherContext.has(key.name),
    );

    for (const key of allKeys) {
      // If duplicate key, we continue iterating
      if (handledKeys[key.name] === 1) {
        continue;
      }

      // We've processed this key and shouldn't repeat it
      handledKeys[key.name] = 1;

      // Determine whether this key occurs in both contexts
      const occursInBoth = keysBothContext.some(x => x.name === key.name);

      // If we execute this function, we already check for existence of context merge handlers
      // This if statement is first as the most likely case for non-empty contexts is that we have mergehandlers
      // and both contexts have an entry
      if (contextMergeHandlers[key.name] && occursInBoth) {
        newContextData[key.name] = contextMergeHandlers[key.name]
          .run(context.get(key), otherContext.get(key));
        continue;
      }
      // If we have no merge handler, but both contexts have entries for key, we don't add it to new context
      if (!contextMergeHandlers[key.name] && occursInBoth) {
        continue;
      }

      // If key doesn't occur in own context, it must be in other context
      // (if we get to this point, the key doesn't occur in both)
      newContextData[key.name] = context.get(key) || otherContext.get(key);
    }
    return new ActionContext(newContextData);
  }

  /**
   * Returns a new Bindings with a context entry set for the given key.
   * @template V The type of the context value.
   * @param key The context key to set.
   * @param value The context value to associate with the key.
   * @return A new Bindings instance with the updated context entry.
   */
  public setContextEntry<V>(key: IActionContextKey<V>, value: any): Bindings {
    return this.setContextEntryRaw(key, value);
  }

  /**
   * Returns a new Bindings with a raw context entry set for the given key.
   *
   * Creates a new context if none exists yet.
   * @template V The type of the context value.
   * @param key The context key to set.
   * @param value The context value to associate with the key.
   * @return A new Bindings instance with the updated context entry.
   */
  public setContextEntryRaw<V>(key: IActionContextKey<V>, value: any): Bindings {
    if (this.contextHolder && this.contextHolder.context) {
      return new Bindings(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context.set(key, value),
        },
      );
    }
    return new Bindings(
      this.dataFactory,
      this.entries,
      {
        contextMergeHandlers: this.contextHolder?.contextMergeHandlers ?? {},
        context: new ActionContext().set(key, value),
      },
    );
  }

  /**
   * Returns a new Bindings with the context entry for the given key removed.
   * @template V The type of the context value.
   * @param key The context key to delete.
   * @return A new Bindings instance without the specified context entry.
   */
  public deleteContextEntry<V>(key: IActionContextKey<V>): Bindings {
    return this.deleteContextEntryRaw(key);
  }

  /**
   * Returns a new Bindings with the raw context entry for the given key removed.
   * @template V The type of the context value.
   * @param key The context key to delete.
   * @return A new Bindings instance without the specified context entry.
   */
  public deleteContextEntryRaw<V>(key: IActionContextKey<V>): Bindings {
    if (this.contextHolder) {
      return new Bindings(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context?.delete(key),
        },
      );
    }
    return new Bindings(this.dataFactory, this.entries);
  }

  /**
   * Returns the action context associated with this Bindings, if any.
   * @return The action context, or undefined if no context is set.
   */
  public getContext(): IActionContext | undefined {
    return this.contextHolder?.context;
  }

  /**
   * Retrieves a specific entry from the action context.
   * @template V The type of the context value.
   * @param key The context key to look up.
   * @return The context value, or undefined if the key is not present.
   */
  public getContextEntry<V>(key: IActionContextKey<V>): V | undefined {
    return this.getContext()?.get(key);
  }

  /**
   * Returns a string representation of this Bindings.
   * @return A human-readable string of the variable-term bindings.
   */
  public toString(): string {
    return bindingsToString(this);
  }

  /**
   * Lazily maps each element of an iterable using a callback function.
   * @template T The type of elements in the source iterable.
   * @template U The type of elements in the resulting iterable.
   * @param iterable The source iterable to transform.
   * @param callback A function applied to each element to produce the mapped value.
   * @return An iterable of transformed elements.
   */
  protected* mapIterable<T, U>(iterable: Iterable<T>, callback: (value: T) => U): Iterable<U> {
    for (const x of iterable) {
      yield callback(x);
    }
  }

  /**
   * Wraps an iterator as an iterable so it can be used in for-of loops.
   * @template T The type of elements produced by the iterator.
   * @param iterator The iterator to wrap.
   * @return An iterable that delegates to the given iterator.
   */
  protected iteratorToIterable<T>(iterator: Iterator<T>): Iterable<T> {
    return {
      [Symbol.iterator]: () => iterator,
    };
  }
}

/**
 * Holds the action context and its associated merge handlers for a Bindings instance.
 */
export interface IContextHolder {
  contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>>;
  context?: IActionContext;
}
