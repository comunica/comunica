import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {blankNode, defaultGraph, literal, namedNode} from "rdf-data-model";
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
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      variables = [ 'k1', 'k2' ];
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
        return expect(actor.test({ handle: <any> { quadStream }, handleMediaType: 'sparql-results+xml' }))
          .rejects.toBeTruthy();
      });

      it('should test on sparql-results+xml', () => {
        return expect(actor.test({ handle: <any> { bindingsStream }, handleMediaType: 'sparql-results+xml' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { bindingsStream }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
          {handle: <any> {bindingsStream, variables}, handleMediaType: 'xml'})).handle.data))).toEqual(
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
          {handle: <any> { bindingsStream, variables: [] }, handleMediaType: 'xml'})).handle.data))).toEqual(
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
          {handle: <any> { bindingsStream: bindingsStreamPartial, variables: [] }, handleMediaType: 'xml'}))
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
    });
  });
});
