import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import * as RdfString from "rdf-string";
import {VersionContext} from "./ActorRdfResolveQuadPatternOstrich";
import {OstrichIterator} from "./OstrichIterator";

export class OstrichQuadSource implements ILazyQuadSource {

  protected readonly ostrichDocument: any;
  protected versionContext: VersionContext = null;

  constructor(ostrichDocument: any) {
    this.ostrichDocument = ostrichDocument;
  }

  public setVersionContext(versionContext: VersionContext) {
    this.versionContext = versionContext;
  }

  public match(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
               graph?: RDF.Term | RegExp): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

  public matchLazy?(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
                    graph?: RDF.Term | RegExp): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("HdtQuadSource does not support matching by regular expressions.");
    }
    if (graph && graph.termType !== 'DefaultGraph') {
      throw new Error("OstrichQuadSource only supports triple pattern queries within the default graph.");
    }
    return new OstrichIterator(this.ostrichDocument, this.versionContext, subject, predicate, object,
      { autoStart: false });
  }

  public count(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term): Promise<number> {
    return new Promise((resolve, reject) => {
      const s = RdfString.termToString(subject);
      const p = RdfString.termToString(predicate);
      const o = RdfString.termToString(object);
      const done = (error: Error, totalItems: number) => {
        if (error) {
          reject(error);
        }
        resolve(totalItems);
      };
      if (this.versionContext.type === 'version-materialization') {
        this.ostrichDocument.countTriplesVersionMaterialized(s, p, o, this.versionContext.version, done);
      } else if (this.versionContext.type === 'delta-materialization') {
        this.ostrichDocument.countTriplesDeltaMaterialized(s, p, o,
          this.versionContext.versionEnd, this.versionContext.versionStart, done);
      } else {
        this.ostrichDocument.countTriplesVersion(s, p, o, done);
      }
    });
  }
}
