import {Bus} from "@comunica/core";
import {ArrayIterator, AsyncIterator} from "asynciterator";
import {ActorRdfSerializeJsonLd} from "../lib/ActorRdfSerializeJsonLd";
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorRdfSerializeJsonLd', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSerializeJsonLd module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeJsonLd).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeJsonLd constructor', () => {
      expect(new (<any> ActorRdfSerializeJsonLd)({ name: 'actor', bus, mediaTypes: {} }))
        .toBeInstanceOf(ActorRdfSerializeJsonLd);
    });

    it('should not be able to create new ActorRdfSerializeJsonLd objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSerializeJsonLd)(); }).toThrow();
    });
  });

  describe('An ActorRdfSerializeJsonLd instance configured with two spaces', () => {
    let actor: ActorRdfSerializeJsonLd;
    let quads;

    beforeEach(() => {
      actor = new ActorRdfSerializeJsonLd({ bus, jsonStringifyIndentSpaces: 2, mediaTypes: {
        'application/json': 1.0,
        'application/ld+json': 1.0,
      }, name: 'actor'});
    });

    describe('for parsing', () => {
      beforeEach(() => {
        quads = new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
      });

      it('should run', () => {
        return actor.run({ handle: { quads }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await stringifyStream(output.handle.data)).toEqual(
`[
  {
    "@id": "http://example.org/a",
    "http://example.org/b": [
      {
        "@id": "http://example.org/c"
      }
    ],
    "http://example.org/d": [
      {
        "@id": "http://example.org/e"
      }
    ]
  }
]
`));
      });
    });

    it('should run with multiple array entries', () => {
      quads = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),

        quad('http://example.org/a2', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a2', 'http://example.org/d', 'http://example.org/e'),
      ]);

      return actor.run({ handle: { quads }, handleMediaType: 'application/ld+json' })
        .then(async (output) => expect(await stringifyStream(output.handle.data)).toEqual(
          `[
  {
    "@id": "http://example.org/a",
    "http://example.org/b": [
      {
        "@id": "http://example.org/c"
      }
    ],
    "http://example.org/d": [
      {
        "@id": "http://example.org/e"
      }
    ]
  },
  {
    "@id": "http://example.org/a2",
    "http://example.org/b": [
      {
        "@id": "http://example.org/c"
      }
    ],
    "http://example.org/d": [
      {
        "@id": "http://example.org/e"
      }
    ]
  }
]
`));
    });
  });

  describe('An ActorRdfSerializeJsonLd instance', () => {
    let actor: ActorRdfSerializeJsonLd;
    let quads;

    beforeEach(() => {
      actor = new ActorRdfSerializeJsonLd({ bus, jsonStringifyIndentSpaces: 0, mediaTypes: {
        'application/json': 1.0,
        'application/ld+json': 1.0,
      }, name: 'actor'});
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quads = new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
      });

      it('should test on application/json', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'application/json' })).resolves.toBeTruthy();
      });

      it('should test on application/ld+json', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'application/ld+json' })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: { quads }, handleMediaType: 'application/n-triples' })).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ handle: { quads }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await stringifyStream(output.handle.data)).toEqual('[{"@id":' +
            '"http://example.org/a","http://example.org/b":[{"@id":"http://example.org/c"}],"http://example.org/d":' +
            '[{"@id":"http://example.org/e"}]}]'));
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfSerializeJsonLd({ bus, jsonStringifyIndentSpaces: 2, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0.5,
          'application/ld+json': 0.5,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfSerializeJsonLd({ bus, jsonStringifyIndentSpaces: 2, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0,
          'application/ld+json': 0,
        }});
      });
    });
  });
});
