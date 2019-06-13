import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal, namedNode} from "@rdfjs/data-model";
import {ActorRdfMetadataExtractQuery} from "../lib/ActorRdfMetadataExtractQuery";
const streamifyArray = require("streamify-array");
const streamifyString = require("streamify-string");
const arrayifyStream = require("arrayify-stream");
const quad = require('rdf-quad');

describe('ActorRdfMetadataExtractQuery', () => {
  const context = {
    name: 'http://example.org/name',
    person: 'http://example.org/person',
  };
  const query = '{ person { name } }';
  const queryEngine: any = {
    query: jest.fn((operation, options) => ({
      bindings: Promise.resolve(streamifyArray([
        Bindings({ person: namedNode('p1' + options.source.type), name: literal('P1' + options.source.value.size) }),
        Bindings({ person: namedNode('p2' + options.source.type), name: literal('P2' + options.source.value.size) }),
      ])),
    })),
    resultToString: jest.fn(async (p) => ({
      data: streamifyString(JSON.stringify({
        results: {
          bindings: await arrayifyStream(await p.bindings),
        },
      })),
    })),
  };
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfMetadataExtractQuery module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractQuery).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractQuery constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractQuery)(context, query, { name: 'actor', bus, queryEngine }))
        .toBeInstanceOf(ActorRdfMetadataExtractQuery);
    });

    it('should not be able to create new ActorRdfMetadataExtractQuery objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractQuery)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractQuery instance', () => {
    const actor = new (<any> ActorRdfMetadataExtractQuery)(context, query, { name: 'actor', bus, queryEngine });

    describe('queryData', () => {

      it('should query results', async () => {
        const data = streamifyArray([
          quad('s1In', 'p1In', 'o1In'),
          quad('s2In', 'p2In', 'o2In'),
        ]);
        expect(await actor.queryData(data)).toEqual([
          {
            name: ["P12", "P22"],
            person: ["p1rdfjsSource", "p2rdfjsSource"],
          },
        ]);
      });

    });

  });

  describe('An ActorRdfMetadataExtractQuery instance with query parameters', () => {
    const queryParam = 'query($var: string){ person { name(_:$var) } }';
    const actor = new (<any> ActorRdfMetadataExtractQuery)(context, queryParam, { name: 'actor', bus, queryEngine });

    describe('queryData', () => {

      it('should query results without initial bindings', async () => {
        const data = streamifyArray([
          quad('s1In', 'p1In', 'o1In'),
          quad('s2In', 'p2In', 'o2In'),
        ]);
        expect(await actor.queryData(data)).toEqual([
          {
            name: ["P12", "P22"],
            person: ["p1rdfjsSource", "p2rdfjsSource"],
          },
        ]);
      });

      it('should query results with initial bindings', async () => {
        const data = streamifyArray([
          quad('s1In', 'p1In', 'o1In'),
          quad('s2In', 'p2In', 'o2In'),
        ]);
        expect(await actor.queryData(data, { '?var': namedNode('V1') })).toEqual([
          {
            name: ["P12", "P22"],
            person: ["p1rdfjsSource", "p2rdfjsSource"],
          },
        ]);
      });

    });

  });
});
