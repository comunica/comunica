import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {PassThrough} from "stream";

/**
 * A quad source that uses a paged RDF dereference mediator
 * and a quad pattern to URL constructor
 * to acts as an RDFJS source.
 *
 * @see RDF.Source
 */
export class MediatedQuadSource implements RDF.Source {

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

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("MediatedQuadSource does not support matching by regular expressions.");
    }
    const url: string = this.uriConstructor(subject, predicate, object, graph);
    const quads: RDF.Stream = new PassThrough({ objectMode: true });

    setImmediate(() => {
      this.mediatorRdfDereferencePaged.mediate({ url })
        .then((output) => {
          // Emit metadata in the stream, so we can attach it later to the actor's promise output
          quads.emit('metadata', output.firstPageMetadata);

          output.data.on('error', (e)    => quads.emit('error', e));
          output.data.on('data',  (data) => quads.emit('data', data));
          output.data.on('end',   ()     => quads.emit('end'));
        })
        .catch((e) => quads.emit('error', e));
    });

    return quads;
  }

}
