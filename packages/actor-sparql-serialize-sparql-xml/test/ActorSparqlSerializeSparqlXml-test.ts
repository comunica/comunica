import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {blankNode, defaultGraph, literal, namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {PassThrough} from "stream";
import {ActorSparqlSerializeSparqlXml} from "../lib/ActorSparqlSerializeSparqlXml";
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeSparqlXml', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeSparqlXml module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeSparqlXml).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeSparqlXml constructor', () => {
      expect(new (<any> ActorSparqlSerializeSparqlXml)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerializeSparqlXml);
    });

    it('should not be able to create new ActorSparqlSerializeSparqlXml objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeSparqlXml)(); }).toThrow();
    });
  });

  describe('#bindingToXmlBindings', () => {
    it('should convert named nodes', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(namedNode('http://ex.org'), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { uri: 'http://ex.org' }]});
    });

    it('should convert default graphs', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(defaultGraph(), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { uri: '' }]});
    });

    it('should convert blank nodes', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(blankNode('b1'), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { bnode: 'b1' }]});
    });

    it('should convert plain literals', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(literal('abc'), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { literal: 'abc' }]});
    });

    it('should convert literals with a language', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(literal('abc', 'en-us'), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { literal: [{ _attr: { 'xml:lang': 'en-us' }}, 'abc'] }]});
    });

    it('should convert literals with a datatype', () => {
      return expect(ActorSparqlSerializeSparqlXml.bindingToXmlBindings(literal('abc', namedNode('http://ex')), '?k'))
        .toEqual({ binding: [{ _attr: { name: 'k' }}, { literal: [{ _attr: { datatype: 'http://ex' }}, 'abc'] }]});
    });
  });

  describe('An ActorSparqlSerializeSparqlXml instance', () => {
    let actor: ActorSparqlSerializeSparqlXml;
    let bindingsStream: BindingsStream;
    let bindingsStreamPartial: BindingsStream;
    let bindingsStreamError: BindingsStream;
    let quadStream;
    let variables;

    beforeEach(() => {
      actor = new ActorSparqlSerializeSparqlXml({ bus, mediaTypes: {
        'sparql-results+xml': 1.0,
      }, name: 'actor' });
      bindingsStream = new ArrayIterator([
        Bindings({ '?k1': namedNode('v1') }),
        Bindings({ '?k2': namedNode('v2') }),
      ]);
      bindingsStreamPartial = new ArrayIterator([
        Bindings({ '?k1': namedNode('v1'), '?k2': null }),
        Bindings({ '?k1': null, '?k2': namedNode('v2') }),
        Bindings({}),
      ]);
      bindingsStreamError = <any> new PassThrough();
      (<any> bindingsStreamError)._read = <any> (() => { bindingsStreamError.emit('error', new Error()); });
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      variables = [ '?k1', '?k2' ];
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'sparql-results+xml': 1.0,
        }});
      });
    });

    describe('for serializing', () => {
      it('should not test on quad streams', () => {
        return expect(actor.test(
          { handle: <any> { type: 'quads', quadStream }, handleMediaType: 'sparql-results+xml' }))
          .rejects.toBeTruthy();
      });

      it('should test on sparql-results+xml bindings', () => {
        return expect(actor.test(
          { handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'sparql-results+xml' }))
          .resolves.toBeTruthy();
      });

      it('should test on sparql-results+xml booleans', () => {
        return expect(actor.test(
          { handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true) },
            handleMediaType: 'sparql-results+xml' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test(
          { handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> {type: 'bindings', bindingsStream, variables}, handleMediaType: 'xml'}))
          .handle.data))).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xlmns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="k1"/>
    <variable name="k2"/>
  </head>
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
</results>
</sparql>
`);
      });

      it('should run on a bindings stream without variables', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream, variables: [] }, handleMediaType: 'xml'}))
          .handle.data))).toEqual(
            `<?xml version="1.0" encoding="UTF-8"?>
<sparql xlmns="http://www.w3.org/2005/sparql-results#">
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
</results>
</sparql>
`);
      });

      it('should run on a bindings stream with unbound variables', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream: bindingsStreamPartial, variables: [] },
            handleMediaType: 'xml'}))
          .handle.data))).toEqual(
          `<?xml version="1.0" encoding="UTF-8"?>
<sparql xlmns="http://www.w3.org/2005/sparql-results#">
  <results>
    <result>
      <binding name="k1">
        <uri>v1</uri>
      </binding>
    </result>
    <result>
      <binding name="k2">
        <uri>v2</uri>
      </binding>
    </result>
    <result>
    </result>
</results>
</sparql>
`);
      });

      it('should emit an error on an errorring bindings stream', async () => {
        return expect((stringifyStream((await actor.run(
          {handle: <any> { bindingsStream: bindingsStreamError, type: 'bindings', variables },
            handleMediaType: 'json'})).handle.data))).rejects.toBeTruthy();
      });

      it('should run on a boolean result that resolves to true', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(true), variables: [] },
            handleMediaType: 'simple'})).handle.data))).toEqual(
`<?xml version="1.0" encoding="UTF-8"?>
<sparql xlmns="http://www.w3.org/2005/sparql-results#">
  <boolean>true</boolean>
</sparql>
`);
      });

      it('should run on a boolean result that resolves to false', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.resolve(false), variables: [] },
            handleMediaType: 'simple'})).handle.data))).toEqual(
`<?xml version="1.0" encoding="UTF-8"?>
<sparql xlmns="http://www.w3.org/2005/sparql-results#">
  <boolean>false</boolean>
</sparql>
`);
      });

      it('should emit an error on a boolean result that rejects', async () => {
        return expect((stringifyStream((await actor.run(
          {handle: <any> { type: 'boolean', booleanResult: Promise.reject(new Error('e')), variables: [] },
            handleMediaType: 'simple'})).handle.data))).rejects.toBeTruthy();
      });
    });
  });
});
