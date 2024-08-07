import { ActorHttp } from '@comunica/bus-http';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import { fromArray, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

const DF = new DataFactory();

describe('QuadDestinationPatchSparqlUpdate', () => {
  let context: IActionContext;
  let url: string;
  let mediatorHttp: any;
  let destination: QuadDestinationPatchSparqlUpdate;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
      })),
    };
    context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
    url = 'abc';
    destination = new QuadDestinationPatchSparqlUpdate(url, context, mediatorHttp);
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.update({
        insert: fromArray([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      await expect(stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body))).resolves
        .toBe(`INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });

    it('should handle a valid insert with quoted triples', async() => {
      await destination.update({
        insert: fromArray([
          DF.quad(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          ),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      await expect(stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body))).resolves
        .toBe(`INSERT DATA {
  <ex:s1> <ex:p1> <<<ex:s1> <ex:p1> <ex:o1>>> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });

    it('should handle a valid Promisified insert', async() => {
      await destination.update({
        insert: wrap(Promise.resolve(fromArray([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]))),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      await expect(stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body))).resolves
        .toBe(`INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });

    it('should throw on a server error', async() => {
      mediatorHttp.mediate = () => ({ status: 400 });
      await expect(destination.update({ insert: fromArray<RDF.Quad>([]) })).rejects
        .toThrow('Could not update abc (HTTP status 400):\nempty response');
    });

    it('should close body if available', async() => {
      const cancel = jest.fn();
      mediatorHttp.mediate = () => ({
        status: 200,
        body: { cancel },
      });
      await destination.update({ insert: fromArray<RDF.Quad>([]) });
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should handle a valid delete', async() => {
      await destination.update({
        delete: fromArray<RDF.Quad>([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      await expect(stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body))).resolves
        .toBe(`DELETE DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });
  });

  describe('update', () => {
    it('should handle a valid update', async() => {
      await destination.update({
        insert: fromArray<RDF.Quad>([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
        delete: fromArray<RDF.Quad>([
          DF.quad(DF.namedNode('ex:sd1'), DF.namedNode('ex:pd1'), DF.namedNode('ex:od1')),
          DF.quad(DF.namedNode('ex:sd2'), DF.namedNode('ex:pd2'), DF.namedNode('ex:od2'), DF.namedNode('ex:gd2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      await expect(stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body))).resolves
        .toBe(`DELETE DATA {
  <ex:sd1> <ex:pd1> <ex:od1> .
  GRAPH <ex:gd2> { <ex:sd2> <ex:pd2> <ex:od2> . }
} ;
INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });
  });

  describe('deleteGraphs', () => {
    it('should always throw', async() => {
      await expect(destination.deleteGraphs('ALL', true, true))
        .rejects.toThrow(`Patch-based SPARQL Update destinations don't support named graphs`);
    });
  });

  describe('createGraph', () => {
    it('should always throw', async() => {
      await expect(destination.createGraphs([ DF.namedNode('a') ], true))
        .rejects.toThrow(`Patch-based SPARQL Update destinations don't support named graphs`);
    });
  });
});
