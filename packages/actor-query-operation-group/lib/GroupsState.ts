import type { IBindingsAggregator, MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Bindings, ComunicaDataFactory, IActionContext } from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { bindingsToCompactString } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A simple type alias for strings that should be hashes of Bindings
 */
export type BindingsHash = string;

/**
 * A state container for a single group
 *
 * @property {Bindings} bindings - The binding entries on which we group
 */
export interface IGroup {
  bindings: Bindings;
  aggregators: Record<string, IBindingsAggregator>;
}

/**
 * A state manager for the groups constructed by consuming the bindings-stream.
 */
export class GroupsState {
  private readonly groups: Map<BindingsHash, IGroup>;
  // We need to the promises of a group so we can await the initialisation/ creation of them.
  //  Without this we could have duplicate work/ override precious work.
  private readonly groupsInitializer: Map<BindingsHash, Promise<IGroup>>;
  private readonly groupVariables: Set<string>;
  private readonly distinctHashes: null | Map<BindingsHash, Set<BindingsHash>>;
  private waitCounter: number;
  // Function that resolves the promise given by collectResults
  private waitResolver: (bindings: Bindings[]) => void;
  private resultHasBeenCalled: boolean;

  public constructor(
    private readonly pattern: Algebra.Group,
    private readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory,
    private readonly context: IActionContext,
    private readonly bindingsFactory: BindingsFactory,
    private readonly variables: RDF.Variable[],
  ) {
    this.groups = new Map();
    this.groupsInitializer = new Map();
    this.groupVariables = new Set(this.pattern.variables.map(x => x.value));
    this.waitCounter = 1;
    this.resultHasBeenCalled = false;
  }

  /**
   * - Consumes a stream binding
   * - Find the corresponding group and create one if need be
   * - Feeds the binding to the group's aggregators
   *
   * @param {Bindings} bindings - The Bindings to consume
   */
  public consumeBindings(bindings: Bindings): Promise<void> {
    const check = this.resultCheck<void>();
    if (check) {
      return check;
    }
    // We increment the counter and decrement him when put action is performed.
    this.waitCounter++;

    // Select the bindings on which we group
    const grouper = bindings
      .filter((_, variable) => this.groupVariables.has(variable.value));
    const groupHash = this.hashBindings(grouper);

    // First member of group -> create new group
    let groupInitializer: Promise<IGroup> | undefined = this.groupsInitializer.get(groupHash);

    let res: Promise<any>;
    if (groupInitializer) {
      const groupInitializerDefined = groupInitializer;
      res = (async() => {
        const group = await groupInitializerDefined;
        await Promise.all(this.pattern.aggregates.map(async(aggregate) => {
          // Distinct handling is done in the aggregator.
          const variable = aggregate.variable.value;
          await group.aggregators[variable].putBindings(bindings);
        }));
      })().then(async() => {
        await this.subtractWaitCounterAndCollect();
      });
    } else {
      // Initialize state for all aggregators for new group
      groupInitializer = (async() => {
        const aggregators: Record<string, IBindingsAggregator> = {};
        await Promise.all(this.pattern.aggregates.map(async(aggregate) => {
          const key = aggregate.variable.value;
          aggregators[key] = await this.mediatorBindingsAggregatorFactory
            .mediate({ expr: aggregate, context: this.context });
          await aggregators[key].putBindings(bindings);
        }));

        const group = { aggregators, bindings: grouper };
        this.groups.set(groupHash, group);
        await this.subtractWaitCounterAndCollect();
        return group;
      })();
      this.groupsInitializer.set(groupHash, groupInitializer);
      res = groupInitializer;
    }
    return res;
  }

  private async subtractWaitCounterAndCollect(): Promise<void> {
    if (--this.waitCounter === 0) {
      await this.handleResultCollection();
    }
  }

  private async handleResultCollection(): Promise<void> {
    const dataFactory: ComunicaDataFactory = this.context.getSafe(KeysInitQuery.dataFactory);
    // Collect groups
    let rows: Bindings[] = await Promise.all([ ...this.groups ].map(async([ _, group ]) => {
      const { bindings: groupBindings, aggregators } = group;

      // Collect aggregator bindings
      // If the aggregate errorred, the result will be undefined
      let returnBindings = groupBindings;
      for (const variable in aggregators) {
        const value = await aggregators[variable].result();
        if (value) {
          // Filter undefined
          returnBindings = returnBindings.set(dataFactory.variable(variable), value);
        }
      }

      // Merge grouping bindings and aggregator bindings
      return returnBindings;
    }));

    // Case: No Input
    // Some aggregators still define an output on the empty input
    // Result is a single Bindings
    if (rows.length === 0 && this.groupVariables.size === 0) {
      const single: [RDF.Variable, RDF.Term][] = [];
      await Promise.all(this.pattern.aggregates.map(async(aggregate) => {
        const key = aggregate.variable;
        const aggregator = await this.mediatorBindingsAggregatorFactory
          .mediate({ expr: aggregate, context: this.context });
        const value = await aggregator.result();
        if (value !== undefined) {
          single.push([ key, value ]);
        }
      }));
      rows = [ this.bindingsFactory.bindings(single) ];
    }

    this.waitResolver(rows);
  }

  private resultCheck<T>(): Promise<T> | undefined {
    if (this.resultHasBeenCalled) {
      return Promise.reject(new Error('Calling any function after calling collectResult is invalid.'));
    }
  }

  /**
   * Collect the result of the final state. This returns a Bindings per group,
   * and a (possibly empty) Bindings in case no Bindings have been consumed yet.
   * You can only call this method once, after calling this method,
   * calling any function on this will result in an error being thrown.
   */
  public async collectResults(): Promise<Bindings[]> {
    const check = this.resultCheck<Bindings[]>();
    if (check) {
      return check;
    }
    this.resultHasBeenCalled = true;
    const res = new Promise<Bindings[]>((resolve) => {
      this.waitResolver = resolve;
    });
    await this.subtractWaitCounterAndCollect();
    return res;
  }

  /**
   * @param {Bindings} bindings - Bindings to hash
   */
  private hashBindings(bindings: Bindings): BindingsHash {
    return bindingsToCompactString(bindings, this.variables);
  }
}
