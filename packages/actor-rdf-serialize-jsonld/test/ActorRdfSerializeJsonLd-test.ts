import { Readable } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfSerializeJsonLd } from '../lib/ActorRdfSerializeJsonLd';

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');
const streamifyArray = require('streamify-array');

describe('ActorRdfSerializeJsonLd', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfSerializeJsonLd module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeJsonLd).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeJsonLd constructor', () => {
      expect(new (<any> ActorRdfSerializeJsonLd)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfSerializeJsonLd);
    });

    it('should not be able to create new ActorRdfSerializeJsonLd objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSerializeJsonLd)(); }).toThrow();
    });
  });

  describe('An ActorRdfSerializeJsonLd instance configured with two spaces', () => {
    let actor: ActorRdfSerializeJsonLd;
    let quadStream: any;
    let quadStreamPipeable: any;
    let quadStreamQuoted: any;

    beforeEach(() => {
      actor = new ActorRdfSerializeJsonLd({ bus,
        jsonStringifyIndentSpaces: 2,
        mediaTypePriorities: {
          'application/json': 1,
          'application/ld+json': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quadStream = () => new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadStreamPipeable = () => streamifyArray([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadStreamQuoted = () => new ArrayIterator([
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/b', 'http://example.org/c'),
          quad('<<ex:s1 ex:p1 ex:o1>>', 'http://example.org/d', 'http://example.org/e'),
        ]);
      });

      it('should run', () => {
        return actor.run({ handle: {
          quadStream: quadStream(),
          context,
        },
        handleMediaType: 'application/ld+json',
        context })
          .then(async(output: any) => expect(await stringifyStream(output.handle.data)).toEqual(
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
`,
          ));
      });
    });

    it('should run on a pipeable stream', () => {
      return actor.run({
        handle: { quadStream: quadStreamPipeable(), context },
        handleMediaType: 'application/ld+json',
        context,
      })
        .then(async(output: any) => expect(await stringifyStream(output.handle.data)).toEqual(
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
`,
        ));
    });

    it('should run on quoted triples', () => {
      return actor.run({
        handle: {
          quadStream: quadStreamQuoted(),
          context,
        },
        handleMediaType: 'application/ld+json',
        context,
      })
        .then(async(output: any) => expect(await stringifyStream(output.handle.data)).toEqual(
          `[
  {
    "@id": {
      "@id": "ex:s1",
      "ex:p1": [
        {
          "@id": "ex:o1"
        }
      ]
    },
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
`,
        ));
    });

    it('should run with multiple array entries', () => {
      return actor.run({ handle: { quadStream: new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),

        quad('http://example.org/a2', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a2', 'http://example.org/d', 'http://example.org/e'),
      ]),
      context },
      handleMediaType: 'application/ld+json',
      context })
        .then(async(output: any) => expect(await stringifyStream(output.handle.data)).toEqual(
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
`,
        ));
    });
  });

  describe('An ActorRdfSerializeJsonLd instance', () => {
    let actor: ActorRdfSerializeJsonLd;
    let quadStream: any;
    let quadsError: any;

    beforeEach(() => {
      actor = new ActorRdfSerializeJsonLd({ bus,
        jsonStringifyIndentSpaces: 0,
        mediaTypePriorities: {
          'application/json': 1,
          'application/ld+json': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quadStream = new ArrayIterator([
          quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
          quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
        ]);
        quadsError = new Readable();
        quadsError._read = () => quadsError.emit('error', new Error('SerializeJsonLd'));
      });

      describe('should test', () => {
        afterEach(() => {
          quadStream.destroy();
        });

        it('should test on application/json', () => {
          return expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'application/json', context }))
            .resolves.toBeTruthy();
        });

        it('should test on application/ld+json', () => {
          return expect(actor.test({
            handle: { quadStream, context },
            handleMediaType: 'application/ld+json',
            context,
          }))
            .resolves.toBeTruthy();
        });

        it('should not test on N-Triples', () => {
          return expect(actor.test({
            handle: { quadStream, context },
            handleMediaType: 'application/n-triples',
            context,
          }))
            .rejects.toBeTruthy();
        });
      });

      it('should run', () => {
        return actor.run({ handle: { quadStream, context }, handleMediaType: 'application/ld+json', context })
          .then(async(output: any) => expect(await stringifyStream(output.handle.data)).toEqual('[{"@id":' +
            '"http://example.org/a","http://example.org/b":[{"@id":"http://example.org/c"}],"http://example.org/d":' +
            '[{"@id":"http://example.org/e"}]}]'));
      });

      it('should forward stream errors', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: { quadStream: quadsError, context }, handleMediaType: 'application/ld+json', context },
        )))
          .handle.data)).rejects.toBeTruthy();

        // Destroy the quadStream since we didn't use it
        quadStream.destroy();
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/json': 1,
          'application/ld+json': 1,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfSerializeJsonLd({ bus,
          jsonStringifyIndentSpaces: 2,
          mediaTypePriorities: {
            'application/json': 1,
            'application/ld+json': 1,
          },
          mediaTypeFormats: {},
          name: 'actor',
          priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/json': 0.5,
          'application/ld+json': 0.5,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfSerializeJsonLd({ bus,
          jsonStringifyIndentSpaces: 2,
          mediaTypePriorities: {
            'application/json': 1,
            'application/ld+json': 1,
          },
          mediaTypeFormats: {},
          name: 'actor',
          priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'application/json': 0,
          'application/ld+json': 0,
        }});
      });
    });
  });
});
