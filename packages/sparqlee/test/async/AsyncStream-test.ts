import { ArrayIterator } from 'asynciterator';
import * as RDFDM from 'rdf-data-model';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { AsyncEvaluatedStream, AsyncFilteredStream } from '../../index';
import { Bindings } from '../../lib/core/Bindings';
import { Example, mockLookup, parse } from '../../util/Util';

describe('Async evaluated stream', () => {
  const input = [
    Bindings({ a: RDFDM.literal("a") }),
    Bindings({ a: RDFDM.literal("a") }),
    Bindings({ a: RDFDM.literal("a") }),
    Bindings({ a: RDFDM.literal("a") }),
    Bindings({ a: RDFDM.literal("a") }),
  ];

  it('ends when stream ends', (done) => {
    const inputs = new ArrayIterator(input);
    const eStream = new AsyncEvaluatedStream(parse('?a'), inputs, mockLookup);
    eStream.on('error', (err) => fail(err));
    eStream.on('end', (data) => done());
    eStream.each(() => { return; });
  });

  it('emits the same amount of items as came in', (done) => {
    const inputs = new ArrayIterator(input);
    const eStream = new AsyncEvaluatedStream(parse('?a'), inputs, mockLookup);
    let counter = 0;
    eStream.on('error', (err) => fail(err));
    eStream.on('end', (data) => {
      expect(counter).toBe(input.length);
      done();
    });
    eStream.on('data', (data) => counter++);
  });

  it('emits errors when it needs to', (done) => {
    const inputs = new ArrayIterator(input);
    const eStream = new AsyncEvaluatedStream(parse('?err'), inputs, mockLookup);
    eStream.on('error', (err) => done());
    eStream.each(() => { return; });
  });
});
