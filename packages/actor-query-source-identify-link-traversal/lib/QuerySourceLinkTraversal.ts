import type {
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  ILinkTraversalManager,
  IQueryBindingsOptions,
  IQuerySource,
} from '@comunica/types';
import { ClosableTransformIterator } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A query source that operates sources obtained from a link queue.
 */
export class QuerySourceLinkTraversal implements IQuerySource {
  public readonly referenceValue: string;

  public constructor(
    public readonly linkTraversalManager: ILinkTraversalManager,
  ) {
    this.referenceValue = this.linkTraversalManager.seeds.map(link => link.url).join(',');
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return await this.linkTraversalManager.getQuerySourceAggregated().getSelectorShape(context);
  }

  public async getFilterFactor(): Promise<number> {
    return 0;
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    // Start link traversal manager if it had not been started yet
    if (!this.linkTraversalManager.started && !this.linkTraversalManager.stopped) {
      this.linkTraversalManager.start(error => iterator.destroy(error));
    }

    // Take the union of the bindings produced when querying over the aggregated and non-aggregated sources.
    // We take the metadata of the aggregated source.
    const firstIterator = this.linkTraversalManager.getQuerySourceAggregated()
      .queryBindings(operation, context, options);
    const nonAggregatedIterators = this.linkTraversalManager.getQuerySourcesNonAggregated()
      .map(source => source.queryBindings(operation, context, options));
    const iterator = new ClosableTransformIterator(new UnionIterator(nonAggregatedIterators
      .prepend([ firstIterator ]), { autoStart: false }), {
      autoStart: false,
      onClose: () => {
        firstIterator.close();
        nonAggregatedIterators.close();
      },
    });
    firstIterator.getProperty('metadata', metadata => iterator.setProperty('metadata', metadata));
    return iterator;
  }

  public queryQuads(): AsyncIterator<RDF.Quad> {
    throw new Error('queryQuads is not implemented in QuerySourceLinkTraversal');
  }

  public async queryBoolean(): Promise<boolean> {
    throw new Error('queryBoolean is not implemented in QuerySourceLinkTraversal');
  }

  public async queryVoid(): Promise<void> {
    throw new Error('queryVoid is not implemented in QuerySourceLinkTraversal');
  }

  public toString(): string {
    return `QuerySourceLinkTraversal(${this.referenceValue})`;
  }
}
