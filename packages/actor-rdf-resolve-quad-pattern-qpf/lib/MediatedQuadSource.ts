import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {ILazyQuadSource} from "../../bus-rdf-resolve-quad-pattern/lib/ActorRdfResolveQuadPatternSource";
import {ProxyIterator} from "./ProxyIterator";

/**
 * A quad source that uses a paged RDF dereference mediator
 * and a quad pattern to URL constructor
 * to acts as an RDFJS source.
 *
 * @see RDF.Source
 */
export class MediatedQuadSource implements ILazyQuadSource {

  public readonly mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
    IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  public readonly uriConstructor: ((subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
    => string);

  constructor(mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>,
              uriConstructor: ((subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
                => string)) {
    this.mediatorRdfDereferencePaged = mediatorRdfDereferencePaged;
    this.uriConstructor = uriConstructor;
  }

  public matchLazy(subject?: RegExp | RDF.Term,
                   predicate?: RegExp | RDF.Term,
                   object?: RegExp | RDF.Term,
                   graph?: RegExp | RDF.Term): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("MediatedQuadSource does not support matching by regular expressions.");
    }
    const url: string = this.uriConstructor(subject, predicate, object, graph);
    const quads = new ProxyIterator(() => this.mediatorRdfDereferencePaged.mediate({ url })
      .then((output) => {
        // Emit metadata in the stream, so we can attach it later to the actor's promise output
        quads.emit('metadata', output.firstPageMetadata);
        return output.data;
      }));
    return quads;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

}
