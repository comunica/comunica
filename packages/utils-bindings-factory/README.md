# Comunica Bindings Factory

[![npm version](https://badge.fury.io/js/%40comunica%2Futils-bindings-factory.svg)](https://www.npmjs.com/package/@comunica/utils-bindings-factory)

This package provides a factory for `Bindings` objects, which allow variables to be mapped to RDF terms.
This package implements the RDF/JS [`BindingsFactory`](http://rdf.js.org/query-spec/#bindingsfactory-interface)
and [`Bindings`](http://rdf.js.org/query-spec/#bindings-interface) interfaces.

Internally, it makes use of [`immutable`](https://www.npmjs.com/package/immutable)
to make sure that operations such as `set` and `delete` reuse internal memory when possible.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/utils-bindings-factory
```

## Usage

```typescript
import * as RDF from '@rdfjs/types';
import { DataFactory } from '@comunica/utils-data-factory';
import { BindingsFactory } from '@comunica/utils-bindings-factory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const bindings1: RDF.Bindings = BF.bindings([
  [ DF.variable('var1'), DF.literal('abc') ],
  [ DF.variable('var2'), DF.literal('def') ],
]);

const bindings2: RDF.Bindings = BF.fromRecord({
  var1: DF.literal('abc'),
  var2: DF.literal('def'),
});
```

### Factory methods

Factory instances can be used as follows.

#### Creating new bindings

Bindings can either be created by passing key-value pairs, or in record-form:

```typescript
const bindings1: RDF.Bindings = BF.bindings([
  [ DF.variable('var1'), DF.literal('abc') ],
  [ DF.variable('var2'), DF.literal('def') ],
]);

const bindings2: RDF.Bindings = BF.fromRecord({
  var1: DF.literal('abc'),
  var2: DF.literal('def'),
});
```

#### Cloning bindings

Bindings can be cloned as follows:

```typescript
const clonedBindings = BF.fromBindings(otherBindings);
```

### Bindings methods

The following methods are exposed on bindings created by the factory.

Since all bindings are immutable, the original bindings instances will never be changed.

#### `Bindings.has()`

The `has()` method is used to check if a value exists for the given variable.
The variable can either be supplied as a string (without `?` prefix), or as an RDF/JS variable.

```typescript
if (bindings.has('var1')) {
  console.log('Has var1!');
}
if (bindings.has(DF.variable('var2'))) {
  console.log('Has var2!');
}
```

#### `Bindings.get()`

The `get()` method is used to read the bound value of variable.
The variable can either be supplied as a string (without `?` prefix), or as an RDF/JS variable.

```typescript
const term1: RDF.Term | undefined = bindings.get('var1');
const term2: RDF.Term | undefined = bindings.get(DF.variable('var2'));
```

#### `Bindings.set()`

The `set()` method is used to create a copy of the current bindings object, with the addition of a new variable binding.
The variable can either be supplied as a string (without `?` prefix), or as an RDF/JS variable.

```typescript
const newBindings = bindings
  .set('var1', DF.namedNode('ex:term1'))
  .set(DF.variable('var2'), DF.namedNode('ex:term2'));
```

#### `Bindings.delete()`

The `delete()` method is used to create a copy of the current bindings object, with the removal of a variable binding.
The variable can either be supplied as a string (without `?` prefix), or as an RDF/JS variable.

```typescript
const newBindings = bindings
  .delete('var1')
  .delete(DF.variable('var2'));
```

#### `Bindings.keys()`

The `keys()` method returns an iterable over all the RDF/JS variable keys that have a value in this bindings object.

```typescript
for (const variable of bindings.keys()) {
  console.log(variable);
}
```

#### `Bindings.values()`

The `values()` method returns an iterable over all the RDF/JS term values that have a key in this bindings object.

```typescript
for (const term of bindings.values()) {
  console.log(term);
}
```

#### `Bindings.forEach()`

The `forEach()` method iterates over all entries in this bindings object
and invokes the callback with the RDF/JS term value and RDF/JS variable key of each entry.

```typescript
bindings.forEach((value, key) => {
  console.log(key);
  console.log(value);
})
```

#### `Bindings.size`

The `size` field returns the number of key-value entries in the bindings object.

```typescript
console.log(bindings.size);
```

#### Entry iteration

Each bindings object is an Iterable over its key-value entries,
where each entry is a tuple of type `[RDF.Variable, RDF.Term]`.

```typescript
// Iterate over all entries
for (const [ key, value ] of bindings) {
  console.log(key);
  console.log(value);
}

// Save the entries in an array
const entries = [ ...bindings ];
```

#### `Bindings.equals`

The `equals()` method checks if the entries of this bindings object equal the entries in another bindings object.

```typescript
bindings1.equals(bindings2);
```

#### `Bindings.filter`

The `filter()` method creates a new bindings object by filtering entries using a callback.
The callback is applied on each entry.
Returning true indicates that this entry must be contained in the resulting bindings object.

```typescript
const filteredBindings = bindings.filter((value, key) => {
  return key.value !== 'abc';
});
```

#### `Bindings.map`

The `map()` method creates a new bindings object by mapping entries using a callback.
The callback is applied on each entry in which the original value is replaced by the returned value.

```typescript
const mappedBindings = bindings.map((value, key) => {
  return DF.namedNode(value.value + '_modified');
});
```

#### `Bindings.merge`

The `merge()` method merges the entries of this bindings object with all entries of another bindings object.
If a merge conflict occurs (this and other have an equal variable with unequal value), then undefined is returned.

```typescript
const mergedBindings = bindings1.merge(bindings2);
```

#### `Bindings.mergeWith`

The `mergeWith()` method merges this bindings object with another
where merge conflicts can be resolved using a callback function.
The callback function that is invoked when a merge conflict occurs,
for which the returned value is considered the merged value.

```typescript
const mergedBindings = bindings1.mergeWith((self, other, key) => {
  return DF.namedNode(self.value + other.value);
}, bindings2);
```

#### `Bindings.toString`

The `toString()` method returns a compact string representation of the bindings object,
which can be useful for debugging.

```typescript
console.log(bindings.toString());

/*
Can output in the form of:
{
  "a": "ex:a",
  "b": "ex:b",
  "c": "ex:c"
}
 */
```
