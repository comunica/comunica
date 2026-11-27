import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IEncodedLookup,
  IEncodedQuadAccess,
  IEncodedQuadBuffer,
  IQuerySourceWrapper,
  MetadataVariable,
} from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';
import type { IIndexNestedLoopLookup } from './IndexNestedLoopIterator';

const COMPONENTS = <const> [ 'subject', 'predicate', 'object', 'graph' ];

/**
 * Slot value of a variable of an optional lookup without matches.
 */
const UNBOUND = -2;
/**
 * Ids at or below this one refer to terms that do not occur in the source, which are kept aside.
 * Lookups bound to them match nothing, but zero-length paths with a constant end still match them.
 */
const LOCAL_BASE = -3;
/**
 * Local ids lie above this one, which keeps them apart from the ids of quoted triples, which have their sign bit set.
 */
const LOCAL_MIN = -(2 ** 30);
/**
 * The maximum number of variables and lookups, as their sets are kept in bitmasks.
 */
const MAX_BITS = 30;
/**
 * Lookups with at most this many matches are done without looking for one with fewer.
 */
const ADAPTIVE_THRESHOLD = 8;
/**
 * A lookup only replaces the one in the given order if it has this many times fewer matches,
 * as that order was chosen by the planner with knowledge of the whole join.
 */
const ADAPTIVE_FACTOR = 16;
/**
 * Closures are assumed to reach this many times the nodes that their first step reaches.
 */
const CLOSURE_FANOUT = 4;

/**
 * A variant that matches nothing, for lookups that are not possible with the slots that happen to be bound.
 */
const NO_VARIANT: IVariant = {
  assign: new Int32Array([ -1, -1, -1, -1 ]),
  equal: new Int32Array([ -1, -1, -1, -1 ]),
  assigned: [],
  assignedMask: 0,
};

/**
 * Check if an id refers to a term that does not occur in the source.
 * @param id An id.
 */
function isLocal(id: number): boolean {
  return id <= LOCAL_BASE && id > LOCAL_MIN;
}

/**
 * Looks up one quad pattern of which the components are bound to constants or slots.
 */
interface IPatternMatcher {
  lookup: IEncodedLookup;
  // For each component, the slot it is bound to, or -1.
  bound: Int32Array;
  // For each component, an earlier component of the same quad it must equal, or -1.
  equal: Int32Array;
  // The ids that are looked up, of which the constant components are fixed.
  ids: Int32Array;
  // If a constant of the pattern does not occur in the source.
  empty: boolean;
}

/**
 * A branch of a union, of which the matches are copied into records in the order of the union's variables.
 */
interface IUnionBranch {
  matcher: IPatternMatcher;
  // For each assigned variable of the union, its component in this branch.
  components: number[];
}

/**
 * A path of one or more, or zero or more, steps along a predicate, from a bound start towards the other end.
 */
interface IClosure {
  // Looks up the next nodes of a node.
  step: IEncodedLookup;
  // The ids of a step, of which the predicate and graph are fixed.
  ids: Int32Array;
  // The component in which a step is bound to the current node, and the one holding the next nodes.
  from: number;
  to: number;
  // If the predicate or graph does not occur in the source, so that there are no steps.
  noSteps: boolean;
  zero: boolean;
  // The slot holding the start node, or -1 if it is the constant startId.
  startSlot: number;
  startId: number;
  // If the other end is bound, the slot holding it, or -1 if it is the constant targetId.
  hasTarget: boolean;
  targetSlot: number;
  targetId: number;
  // Look up if a node occurs as subject or object in the graph, as only those have zero-length paths
  // to themselves when neither end is a constant.
  asSubject: IEncodedLookup;
  asObject: IEncodedLookup;
  nodeIds: Int32Array;
}

/**
 * A lookup compiled for a given set of its variables being bound.
 *
 * Pattern variants produce quads, of which components are assigned to slots.
 * Union and closure variants produce records of which the values are assigned to slots in order.
 */
interface IVariant {
  pattern?: IPatternMatcher;
  branches?: IUnionBranch[];
  closure?: IClosure;
  // For each component of a quad or value of a record, the slot it is assigned to, or -1.
  assign: Int32Array;
  // For each component of a quad, an earlier component it must equal, or -1.
  equal: Int32Array;
  // The slots that this variant assigns, and their mask.
  assigned: number[];
  assignedMask: number;
}

/**
 * A lookup, which is compiled into a variant for every set of its variables that is bound when it is looked up.
 */
interface ILookupSpec {
  operation: Algebra.Operation;
  optional: boolean;
  // The mask of the slots of the variables of this lookup.
  slotMask: number;
  variants: Map<number, IVariant | null>;
}

/**
 * The state of a level of nested lookups.
 */
interface ILevel {
  // The index of the lookup at this level, and its variant.
  spec: number;
  variant: IVariant | undefined;
  // The slots bound before this level, and the lookups that remain to be done at or after this level.
  boundMask: number;
  remaining: number;
  buffer: IEncodedQuadBuffer;
  scratch: IEncodedQuadBuffer;
  position: number;
  count: number;
  produced: boolean;
}

/**
 * Options for compiling lookups over encoded terms.
 */
export interface IEncodedIndexNestedLoopOptions {
  /**
   * If unions of patterns and zero-or-more or one-or-more paths along a single predicate can be looked up.
   */
  unionsAndPaths: boolean;
  /**
   * If the lookup with the fewest matches is done first for every partial result,
   * instead of doing them in the given order.
   */
  adaptive: boolean;
}

/**
 * A compiled set of lookups over the same encoded source.
 */
export interface IEncodedIndexNestedLoopPlan {
  access: IEncodedQuadAccess;
  specs: ILookupSpec[];
  slots: Map<string, number>;
  // The variables of the input bindings that lookups are bound to, and their slots.
  inputNames: string[];
  inputSlots: number[];
  inputMask: number;
  // The variables that lookups assign, and their slots.
  outputNames: string[];
  outputSlots: number[];
  // If the first lookup scans the first join entry itself, instead of joining with the input stream.
  scansFirst: boolean;
  // Terms that do not occur in the source, by their local id. The first ones are constants of the lookups.
  locals: RDF.Term[];
  constantLocals: number;
  // If lookups are done in the given order, instead of the cheapest one for every partial result first.
  fixedOrder: boolean;
}

/**
 * Joins every binding in a stream with a set of lookups over the same in-memory source,
 * by looking them up as integer-encoded terms.
 *
 * Lookups can be quad patterns, unions of quad patterns,
 * and zero-or-more or one-or-more paths along a single predicate, which are walked breadth-first.
 * For every partial result, the lookup with the fewest matches is done next,
 * which is cheap to determine for the index ranges of an in-memory source.
 *
 * Unlike {@link IndexNestedLoopIterator}, this neither creates patterns nor bindings for intermediate results:
 * the terms of each input binding are encoded once, and the terms of each output binding are decoded once.
 */
export class EncodedIndexNestedLoopIterator extends AsyncIterator<Bindings> {
  private readonly input: BindingsStream;
  private readonly plan: IEncodedIndexNestedLoopPlan;
  private readonly bindingsFactory: BindingsFactory;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly row: Int32Array;
  private readonly levels: ILevel[];
  private readonly outputValues: RDF.Term[];
  private readonly outputKeys: string[];
  private readonly allLookups: number;
  private current: Bindings | undefined;
  // The bound input slots of the current input binding.
  private inputMask = 0;
  private depth = -1;
  private scanned = false;
  // Breadth-first walks mark visited nodes with the number of the walk.
  private walk = 0;
  private visited = new Int32Array(1024);
  private readonly visitedNegative = new Map<number, number>();
  private queue = new Int32Array(1024);

  public constructor(
    input: BindingsStream,
    plan: IEncodedIndexNestedLoopPlan,
    bindingsFactory: BindingsFactory,
    dataFactory: ComunicaDataFactory,
  ) {
    super();
    this.input = input;
    this.plan = plan;
    this.bindingsFactory = bindingsFactory;
    this.dataFactory = dataFactory;
    this.row = new Int32Array(plan.slots.size);
    this.levels = plan.specs.map(() => ({
      spec: -1,
      variant: undefined,
      boundMask: 0,
      remaining: 0,
      buffer: { data: new Int32Array(256), length: 0 },
      scratch: { data: new Int32Array(256), length: 0 },
      position: 0,
      count: 0,
      produced: false,
    }));
    this.allLookups = (2 ** plan.specs.length) - 1;
    this.outputValues = [];
    this.outputKeys = [];
    input.on('error', error => this.destroy(error));
    input.on('readable', () => {
      this.readable = true;
    });
    input.on('end', () => {
      this.readable = true;
    });
    this.readable = true;
  }

  /**
   * Get the source of an operation that can only be looked up over encoded terms:
   * a union of quad patterns, or a zero-or-more or one-or-more path along a single predicate.
   * @param operation An operation.
   * @return The source of the patterns or predicate, or undefined if the operation is not such an operation.
   */
  public static getEncodedOnlySource(operation: Algebra.Operation): IQuerySourceWrapper | undefined {
    if (isKnownOperation(operation, Algebra.Types.UNION)) {
      const sources = operation.input
        .map(input => isKnownOperation(input, Algebra.Types.PATTERN) ? getOperationSource(input) : undefined);
      return sources.length > 0 && sources.every(source => source && source.source === sources[0]!.source) ?
        sources[0] :
        undefined;
    }
    const link = EncodedIndexNestedLoopIterator.getClosureLink(operation);
    return link ? getOperationSource(link.link) : undefined;
  }

  /**
   * Get the predicate of a zero-or-more or one-or-more path along a single predicate or its inverse.
   * @param operation An operation.
   */
  public static getClosureLink(operation: Algebra.Operation):
  { link: Algebra.Link; inverse: boolean; zero: boolean } | undefined {
    if (!isKnownOperation(operation, Algebra.Types.PATH)) {
      return undefined;
    }
    const predicate = operation.predicate;
    const zero = isKnownOperation(predicate, Algebra.Types.ZERO_OR_MORE_PATH);
    if (!zero && !isKnownOperation(predicate, Algebra.Types.ONE_OR_MORE_PATH)) {
      return undefined;
    }
    let path = (predicate).path;
    let inverse = false;
    if (isKnownOperation(path, Algebra.Types.INV)) {
      path = path.path;
      inverse = true;
    }
    return isKnownOperation(path, Algebra.Types.LINK) ? { link: path, inverse, zero } : undefined;
  }

  /**
   * Get the variables of a lookup operation, in the order they occur.
   * @param operation A lookup operation.
   */
  protected static getLookupVariables(operation: Algebra.Operation): string[] {
    const terms: RDF.Term[] = [];
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      terms.push(operation.subject, operation.predicate, operation.object, operation.graph);
    } else if (isKnownOperation(operation, Algebra.Types.UNION)) {
      for (const input of <Algebra.Pattern[]> operation.input) {
        terms.push(input.subject, input.predicate, input.object, input.graph);
      }
    } else {
      const path = <Algebra.Path> operation;
      terms.push(path.subject, path.object, path.graph);
    }
    return [ ...new Set(terms.filter(term => term.termType === 'Variable').map(term => term.value)) ];
  }

  /**
   * Compile the given lookups into a plan over integer-encoded terms, if all of them support it.
   * @param lookups The lookups, in an order in which all of them are possible.
   * @param inputVariables The variables of the input bindings.
   * @param context The action context.
   * @param options Options for the plan.
   * @param first If given, the operation of the first join entry, which is then scanned as the first lookup
   *              instead of reading the input bindings.
   * @return The plan, or undefined if the lookups can not be done over encoded terms.
   */
  public static compile(
    lookups: IIndexNestedLoopLookup[],
    inputVariables: MetadataVariable[],
    context: IActionContext,
    options: IEncodedIndexNestedLoopOptions,
    first?: IIndexNestedLoopLookup,
  ): IEncodedIndexNestedLoopPlan | undefined {
    if (first) {
      lookups = [ first, ...lookups ];
      inputVariables = [];
    }
    // Default graph patterns would also have to match named graphs.
    if (context.get(KeysQueryOperation.unionDefaultGraph) === true || lookups.length === 0 ||
      lookups.length > MAX_BITS) {
      return undefined;
    }
    const inputSet = new Set(inputVariables.map(variable => variable.variable.value));
    const inputUndef = new Set(inputVariables.filter(variable => variable.canBeUndef)
      .map(variable => variable.variable.value));
    let access: IEncodedQuadAccess | undefined;
    const slots = new Map<string, number>();
    const inputNames: string[] = [];
    const inputSlots: number[] = [];
    let inputMask = 0;
    const outputNames: string[] = [];
    const outputSlots: number[] = [];
    const specs: ILookupSpec[] = [];
    for (const [ i, { operation, source, optional = false }] of lookups.entries()) {
      // Optional lookups leave variables unbound, which later lookups can not be bound to.
      if (optional && i < lookups.length - 1) {
        return undefined;
      }
      const isPattern = isKnownOperation(operation, Algebra.Types.PATTERN);
      const sourceWrapper = isPattern ? undefined : EncodedIndexNestedLoopIterator.getEncodedOnlySource(operation);
      if (!isPattern && (!options.unionsAndPaths || !sourceWrapper)) {
        return undefined;
      }
      const lookupContext = sourceWrapper?.context ? context.merge(sourceWrapper.context) : context;
      const sourceAccess = (sourceWrapper?.source ?? source).getEncodedAccess?.(lookupContext);
      if (!sourceAccess || (access && access.encoding !== sourceAccess.encoding)) {
        return undefined;
      }
      access = sourceAccess;

      let slotMask = 0;
      for (const name of EncodedIndexNestedLoopIterator.getLookupVariables(operation)) {
        // Closures need a bound end, which input variables that may be unbound can not guarantee.
        if (inputUndef.has(name) && !isPattern && !isKnownOperation(operation, Algebra.Types.UNION)) {
          return undefined;
        }
        let slot = slots.get(name);
        if (slot === undefined) {
          slot = slots.size;
          if (slot >= MAX_BITS) {
            return undefined;
          }
          slots.set(name, slot);
          if (inputSet.has(name)) {
            inputNames.push(name);
            inputSlots.push(slot);
            inputMask |= 1 << slot;
          } else {
            outputNames.push(name);
            outputSlots.push(slot);
          }
        }
        slotMask |= 1 << slot;
      }
      specs.push({ operation, optional, slotMask, variants: new Map() });
    }
    const plan: IEncodedIndexNestedLoopPlan = {
      access: access!,
      specs,
      slots,
      inputNames,
      inputSlots,
      inputMask,
      outputNames,
      outputSlots,
      scansFirst: Boolean(first),
      locals: [],
      constantLocals: 0,
      fixedOrder: !options.adaptive,
    };
    // Constants that do not occur in the source are kept aside before any local terms of input bindings.
    for (const spec of specs) {
      for (const term of EncodedIndexNestedLoopIterator.getLookupConstants(spec.operation)) {
        EncodedIndexNestedLoopIterator.encodeTerm(term, plan);
      }
    }
    plan.constantLocals = plan.locals.length;
    // Every lookup must be possible in the given order, which is used whenever no other order is cheaper.
    let boundMask = inputMask;
    for (const [ i, spec ] of specs.entries()) {
      if (!EncodedIndexNestedLoopIterator.getVariant(plan, i, boundMask)) {
        return undefined;
      }
      boundMask |= spec.slotMask;
    }
    return plan;
  }

  /**
   * Get the variant of a lookup for the given bound slots, compiling it if needed.
   * @param plan A plan.
   * @param index The index of a lookup.
   * @param boundMask The bound slots.
   * @return The variant, or null if the lookup is not possible with these slots bound.
   */
  protected static getVariant(plan: IEncodedIndexNestedLoopPlan, index: number, boundMask: number): IVariant | null {
    const spec = plan.specs[index];
    const key = boundMask & spec.slotMask;
    let variant = spec.variants.get(key);
    if (variant === undefined) {
      variant = EncodedIndexNestedLoopIterator.compileVariant(plan, spec.operation, key) ?? null;
      spec.variants.set(key, variant);
    }
    return variant;
  }

  /**
   * Compile a lookup for the given bound slots.
   * @param plan A plan.
   * @param operation A lookup operation.
   * @param boundMask The bound slots.
   */
  protected static compileVariant(
    plan: IEncodedIndexNestedLoopPlan,
    operation: Algebra.Operation,
    boundMask: number,
  ): IVariant | undefined {
    const variant: IVariant = {
      assign: new Int32Array([ -1, -1, -1, -1 ]),
      equal: new Int32Array([ -1, -1, -1, -1 ]),
      assigned: [],
      assignedMask: 0,
    };
    // The variables this variant assigns, by their component in a quad or their index in a record.
    let assigned: Map<string, number>;
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      const compiled = EncodedIndexNestedLoopIterator.compilePattern(operation, plan, boundMask);
      if (!compiled) {
        return undefined;
      }
      variant.pattern = compiled.matcher;
      variant.equal = compiled.matcher.equal;
      assigned = compiled.assigned;
    } else if (isKnownOperation(operation, Algebra.Types.UNION)) {
      const branches = operation.input
        .map(input => EncodedIndexNestedLoopIterator.compilePattern(<Algebra.Pattern> input, plan, boundMask));
      if (branches.some(branch => !branch)) {
        return undefined;
      }
      // Branches must assign the same variables, as others would be unbound in some of them.
      const names = [ ...branches[0]!.assigned.keys() ];
      if (branches.some(branch => branch!.assigned.size !== names.length ||
        names.some(name => !branch!.assigned.has(name)))) {
        return undefined;
      }
      variant.branches = branches.map(branch => ({
        matcher: branch!.matcher,
        components: names.map(name => branch!.assigned.get(name)!),
      }));
      assigned = new Map(names.map((name, index) => [ name, index ]));
    } else {
      const compiled = EncodedIndexNestedLoopIterator.compileClosure(<Algebra.Path> operation, plan, boundMask);
      if (!compiled) {
        return undefined;
      }
      variant.closure = compiled.closure;
      assigned = compiled.assigned;
    }
    for (const [ name, index ] of assigned) {
      const slot = plan.slots.get(name)!;
      variant.assign[index] = slot;
      variant.assigned.push(slot);
      variant.assignedMask |= 1 << slot;
    }
    return variant;
  }

  /**
   * Get the constant terms of a lookup operation.
   * @param operation A lookup operation.
   */
  protected static getLookupConstants(operation: Algebra.Operation): RDF.Term[] {
    const terms: RDF.Term[] = [];
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      terms.push(operation.subject, operation.predicate, operation.object, operation.graph);
    } else if (isKnownOperation(operation, Algebra.Types.UNION)) {
      for (const input of <Algebra.Pattern[]> operation.input) {
        terms.push(input.subject, input.predicate, input.object, input.graph);
      }
    } else {
      const path = <Algebra.Path> operation;
      terms.push(path.subject, path.object);
    }
    return terms.filter(term => term.termType !== 'Variable' && term.termType !== 'Quad');
  }

  /**
   * Encode a term, or refer to it as a local term if it does not occur in the source,
   * which keeps it aside unless an equal one already is.
   * @param term A term.
   * @param plan The plan.
   */
  protected static encodeTerm(term: RDF.Term, plan: IEncodedIndexNestedLoopPlan): number {
    const id = plan.access.encode(term);
    if (id !== undefined) {
      return id;
    }
    const locals = plan.locals;
    for (const [ i, local ] of locals.entries()) {
      if (local.equals(term)) {
        return LOCAL_BASE - i;
      }
    }
    locals.push(term);
    return LOCAL_BASE - (locals.length - 1);
  }

  /**
   * Compile a quad pattern.
   * @param pattern A quad pattern.
   * @param plan The plan.
   * @param boundMask The bound slots.
   * @return The matcher and the components of the variables it assigns, or undefined if not supported.
   */
  protected static compilePattern(pattern: Algebra.Pattern, plan: IEncodedIndexNestedLoopPlan, boundMask: number):
  { matcher: IPatternMatcher; assigned: Map<string, number> } | undefined {
    if (pattern.graph.termType === 'Variable') {
      return undefined;
    }
    const matcher: IPatternMatcher = <IPatternMatcher> {
      bound: new Int32Array([ -1, -1, -1, -1 ]),
      equal: new Int32Array([ -1, -1, -1, -1 ]),
      ids: new Int32Array(4),
      empty: false,
    };
    const boundFlags: [boolean, boolean, boolean, boolean] = [ false, false, false, false ];
    const assigned = new Map<string, number>();
    for (const [ position, component ] of COMPONENTS.entries()) {
      const term = pattern[component];
      if (term.termType === 'Quad') {
        return undefined;
      }
      if (term.termType === 'Variable') {
        const slot = plan.slots.get(term.value)!;
        if ((boundMask & (1 << slot)) !== 0) {
          matcher.bound[position] = slot;
          boundFlags[position] = true;
        } else if (assigned.has(term.value)) {
          matcher.equal[position] = assigned.get(term.value)!;
        } else {
          assigned.set(term.value, position);
        }
      } else {
        const id = EncodedIndexNestedLoopIterator.encodeTerm(term, plan);
        if (isLocal(id)) {
          matcher.empty = true;
        } else {
          matcher.ids[position] = id;
        }
        boundFlags[position] = true;
      }
    }
    const lookup = plan.access.prepareLookup(boundFlags);
    if (!lookup) {
      return undefined;
    }
    matcher.lookup = lookup;
    return { matcher, assigned };
  }

  /**
   * Compile a zero-or-more or one-or-more path along a single predicate, of which at least one end is bound.
   * @param path A path.
   * @param plan The plan.
   * @param boundMask The bound slots.
   * @return The closure and the record index of the variable it assigns, or undefined if not supported.
   */
  protected static compileClosure(path: Algebra.Path, plan: IEncodedIndexNestedLoopPlan, boundMask: number):
  { closure: IClosure; assigned: Map<string, number> } | undefined {
    const closureLink = EncodedIndexNestedLoopIterator.getClosureLink(path);
    if (!closureLink || path.graph.termType === 'Variable' || path.subject.termType === 'Quad' ||
      path.object.termType === 'Quad' ||
      (path.subject.termType === 'Variable' && path.object.termType === 'Variable' &&
        path.subject.value === path.object.value)) {
      return undefined;
    }
    // Each end is a constant id, a bound slot, or a variable that this variant assigns.
    const [ subject, object ] = [ path.subject, path.object ].map((term) => {
      if (term.termType !== 'Variable') {
        return { slot: -1, id: EncodedIndexNestedLoopIterator.encodeTerm(term, plan), name: undefined };
      }
      const slot = plan.slots.get(term.value)!;
      return (boundMask & (1 << slot)) === 0 ?
          { slot: -1, id: 0, name: term.value } :
          { slot, id: 0, name: undefined };
    });
    // Walk from a bound end, preferably the subject.
    const fromSubject = subject.name === undefined;
    const start = fromSubject ? subject : object;
    const end = fromSubject ? object : subject;
    if (start.name !== undefined) {
      return undefined;
    }
    // Steps follow the predicate from subject to object, unless walking backwards or along its inverse.
    const forward = fromSubject !== closureLink.inverse;
    const from = forward ? 0 : 2;
    const to = forward ? 2 : 0;
    const bound: [boolean, boolean, boolean, boolean] = [ false, true, false, true ];
    bound[from] = true;
    const step = plan.access.prepareLookup(bound);
    const asSubject = plan.access.prepareLookup([ true, false, false, true ]);
    const asObject = plan.access.prepareLookup([ false, false, true, true ]);
    if (!step || !asSubject || !asObject) {
      return undefined;
    }
    const ids = new Int32Array(4);
    const predicate = plan.access.encode(closureLink.link.iri);
    const graph = plan.access.encode(path.graph);
    ids[1] = predicate ?? 0;
    ids[3] = graph ?? 0;
    const nodeIds = new Int32Array(4);
    nodeIds[3] = graph ?? LOCAL_BASE;
    return {
      closure: {
        step,
        ids,
        from,
        to,
        noSteps: predicate === undefined || graph === undefined,
        zero: closureLink.zero,
        startSlot: start.slot,
        startId: start.id,
        hasTarget: end.name === undefined,
        targetSlot: end.slot,
        targetId: end.id,
        asSubject,
        asObject,
        nodeIds,
      },
      assigned: end.name === undefined ? new Map() : new Map([[ end.name, 0 ]]),
    };
  }

  public override read(): Bindings | null {
    const levels = this.levels;
    while (!this.done) {
      if (this.depth < 0) {
        const bindings = this.plan.scansFirst ? this.nextScan() : this.input.read();
        if (bindings === null) {
          if (this.input.done) {
            this.close();
          } else {
            this.readable = false;
          }
          return null;
        }
        this.encodeInput(bindings);
        this.depth = 0;
        this.startLevel(levels[0], this.inputMask, this.allLookups);
        continue;
      }

      const level = levels[this.depth];
      if (this.advance(level)) {
        level.produced = true;
      } else if (this.plan.specs[level.spec].optional && !level.produced) {
        level.produced = true;
        for (const slot of level.variant!.assigned) {
          this.row[slot] = UNBOUND;
        }
      } else {
        this.depth--;
        continue;
      }
      const remaining = level.remaining & ~(1 << level.spec);
      if (remaining === 0) {
        return this.output();
      }
      this.depth++;
      this.startLevel(levels[this.depth], level.boundMask | level.variant!.assignedMask, remaining);
    }
    return null;
  }

  /**
   * The single empty binding from which the first lookup is scanned, or null after it.
   */
  protected nextScan(): Bindings | null {
    if (this.scanned) {
      this.input.close();
      return null;
    }
    this.scanned = true;
    return this.bindingsFactory.bindings();
  }

  /**
   * Encode the terms of an input binding into the slots of the variables that lookups are bound to.
   * @param bindings An input binding.
   */
  protected encodeInput(bindings: Bindings): void {
    const { inputNames, inputSlots, locals, constantLocals } = this.plan;
    this.current = bindings;
    this.inputMask = this.plan.inputMask;
    // Local terms of earlier input bindings are not needed anymore.
    locals.length = constantLocals;
    for (const [ i, inputName ] of inputNames.entries()) {
      const term = bindings.get(inputName);
      if (!term) {
        // Lookups assign input variables that are unbound.
        this.inputMask &= ~(1 << inputSlots[i]);
        this.row[inputSlots[i]] = UNBOUND;
        continue;
      }
      this.row[inputSlots[i]] = EncodedIndexNestedLoopIterator.encodeTerm(term, this.plan);
    }
  }

  /**
   * Bind the ids of a pattern matcher to the current slots.
   * @param matcher A pattern matcher.
   * @return If the pattern can have matches.
   */
  protected bindMatcher(matcher: IPatternMatcher): boolean {
    if (matcher.empty) {
      return false;
    }
    const { bound, ids } = matcher;
    for (let i = 0; i < 4; i++) {
      const slot = bound[i];
      if (slot >= 0) {
        // Slots of bound variables are never unbound, but may hold terms that do not occur in the source.
        const value = this.row[slot];
        if (isLocal(value)) {
          return false;
        }
        ids[i] = value;
      }
    }
    return true;
  }

  /**
   * Estimate the number of matches of a variant for the current slots, which is exact for patterns and unions.
   * @param variant A variant.
   * @param limit Counting may stop at this number.
   */
  protected estimate(variant: IVariant, limit: number): number {
    if (variant.pattern) {
      return this.bindMatcher(variant.pattern) ? variant.pattern.lookup.count(variant.pattern.ids, limit) : 0;
    }
    if (variant.branches) {
      let count = 0;
      for (const { matcher } of variant.branches) {
        if (this.bindMatcher(matcher)) {
          count += matcher.lookup.count(matcher.ids, limit - count);
          if (count >= limit) {
            return limit;
          }
        }
      }
      return count;
    }
    const closure = variant.closure!;
    if (closure.hasTarget) {
      return 1;
    }
    const start = closure.startSlot >= 0 ? this.row[closure.startSlot] : closure.startId;
    if (isLocal(start) || closure.noSteps) {
      return 1;
    }
    closure.ids[closure.from] = start;
    return 1 + closure.step.count(closure.ids, limit) * CLOSURE_FANOUT;
  }

  /**
   * Choose the lookup of a level, and look up its quads or records for the current slots.
   * @param level A level.
   * @param boundMask The slots that are bound before this level.
   * @param remaining The lookups that remain to be done.
   */
  protected startLevel(level: ILevel, boundMask: number, remaining: number): void {
    level.boundMask = boundMask;
    level.remaining = remaining;
    level.position = 0;
    level.count = 0;
    level.produced = false;
    level.buffer.length = 0;

    // Without a cheaper one, the first remaining lookup is done, which is possible unless an input binding lacks
    // a variable that it should bind, in which case it has no matches.
    let chosen = 31 - Math.clz32(remaining & -remaining);
    let variant = EncodedIndexNestedLoopIterator.getVariant(this.plan, chosen, boundMask) ?? NO_VARIANT;
    // A lookup with fewer matches is done first, except when the first join entry is scanned,
    // as that determines the order of the results.
    if (!this.plan.fixedOrder && !(this.plan.scansFirst && this.depth === 0) &&
      (remaining & (remaining - 1)) !== 0) {
      let best: number;
      if (variant.pattern) {
        // Most lookups have few matches, for which looking for one with fewer is not worth it.
        if (!this.bindMatcher(variant.pattern)) {
          level.spec = chosen;
          level.variant = variant;
          return;
        }
        level.count = variant.pattern.lookup.lookup(variant.pattern.ids, level.buffer, ADAPTIVE_THRESHOLD + 1);
        if (level.count <= ADAPTIVE_THRESHOLD) {
          level.spec = chosen;
          level.variant = variant;
          return;
        }
        level.count = 0;
        level.buffer.length = 0;
        best = variant.pattern.lookup.count(variant.pattern.ids);
      } else {
        best = variant === NO_VARIANT ? Number.POSITIVE_INFINITY : this.estimate(variant, Number.POSITIVE_INFINITY);
      }
      for (let index = chosen + 1; index < this.plan.specs.length && best > 1; index++) {
        if ((remaining & (1 << index)) === 0 || this.plan.specs[index].optional) {
          continue;
        }
        const candidate = EncodedIndexNestedLoopIterator.getVariant(this.plan, index, boundMask);
        if (!candidate) {
          continue;
        }
        // Only a lookup with clearly fewer matches replaces the given order, which the planner chose.
        const estimate = this.estimate(candidate, Math.ceil(best / ADAPTIVE_FACTOR));
        if (estimate * ADAPTIVE_FACTOR < best) {
          best = estimate * ADAPTIVE_FACTOR;
          chosen = index;
          variant = candidate;
        }
      }
    }
    level.spec = chosen;
    level.variant = variant;

    if (variant.pattern) {
      if (this.bindMatcher(variant.pattern)) {
        level.count = variant.pattern.lookup.lookup(variant.pattern.ids, level.buffer);
      }
    } else if (variant.branches) {
      this.startUnion(level, variant);
    } else if (variant.closure) {
      this.startClosure(level, variant.closure);
    }
  }

  /**
   * Append a record to a buffer.
   * @param buffer A buffer.
   * @param value The first value of the record.
   * @return The data of the buffer, which may have grown.
   */
  protected static appendRecord(buffer: IEncodedQuadBuffer, value: number): Int32Array {
    if (buffer.length + 4 > buffer.data.length) {
      const grown = new Int32Array(buffer.data.length * 2);
      grown.set(buffer.data.subarray(0, buffer.length));
      buffer.data = grown;
    }
    buffer.data[buffer.length] = value;
    buffer.length += 4;
    return buffer.data;
  }

  /**
   * Look up all branches of a union, and copy their matches into records.
   * @param level A level.
   * @param variant A union variant.
   */
  protected startUnion(level: ILevel, variant: IVariant): void {
    const scratch = level.scratch;
    for (const { matcher, components } of variant.branches!) {
      if (!this.bindMatcher(matcher)) {
        continue;
      }
      scratch.length = 0;
      const count = matcher.lookup.lookup(matcher.ids, scratch);
      const quads = scratch.data;
      const equal = matcher.equal;
      for (let i = 0; i < count; i++) {
        const base = i * 4;
        let matches = true;
        for (let c = 0; c < 4; c++) {
          if (equal[c] >= 0 && quads[base + c] !== quads[base + equal[c]]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          const data = EncodedIndexNestedLoopIterator.appendRecord(level.buffer, 0);
          const at = level.buffer.length - 4;
          for (const [ k, component ] of components.entries()) {
            data[at + k] = quads[base + component];
          }
          level.count++;
        }
      }
    }
  }

  /**
   * Mark a node as visited in the current walk.
   * @param node A node id.
   * @return If the node was not visited yet.
   */
  protected visit(node: number): boolean {
    if (node < 0) {
      if (this.visitedNegative.get(node) === this.walk) {
        return false;
      }
      this.visitedNegative.set(node, this.walk);
      return true;
    }
    if (node >= this.visited.length) {
      const grown = new Int32Array(Math.max(node + 1, this.visited.length * 2));
      grown.set(this.visited);
      this.visited = grown;
    }
    if (this.visited[node] === this.walk) {
      return false;
    }
    this.visited[node] = this.walk;
    return true;
  }

  /**
   * Check if a node occurs as subject or object in the graph of a closure.
   * @param node A node id.
   * @param closure A closure.
   */
  protected isNode(node: number, closure: IClosure): boolean {
    if (isLocal(node) || closure.nodeIds[3] === LOCAL_BASE) {
      return false;
    }
    const { nodeIds } = closure;
    nodeIds[0] = node;
    nodeIds[2] = node;
    return closure.asSubject.count(nodeIds, 1) > 0 || closure.asObject.count(nodeIds, 1) > 0;
  }

  /**
   * Walk a closure breadth-first from its start node, producing a record for every reached node,
   * or a single empty record if its target is reached.
   * @param level A level.
   * @param closure A closure.
   */
  protected startClosure(level: ILevel, closure: IClosure): void {
    const start = closure.startSlot >= 0 ? this.row[closure.startSlot] : closure.startId;
    const target = closure.hasTarget ? (closure.targetSlot >= 0 ? this.row[closure.targetSlot] : closure.targetId) : 0;
    this.walk++;
    // A reached node is either produced, or only checked against the target.
    const reach = (node: number): boolean => {
      if (!closure.hasTarget) {
        EncodedIndexNestedLoopIterator.appendRecord(level.buffer, node);
        level.count++;
        return false;
      }
      if (node === target) {
        EncodedIndexNestedLoopIterator.appendRecord(level.buffer, 0);
        level.count++;
        return true;
      }
      return false;
    };
    if (closure.zero) {
      this.visit(start);
      // A path pattern with a constant end matches it with zero steps, otherwise only nodes of the graph do.
      if ((closure.startSlot < 0 || (closure.hasTarget && closure.targetSlot < 0) || this.isNode(start, closure)) &&
        reach(start)) {
        return;
      }
    }
    // Local terms do not occur in the source, so there are no steps from them.
    if (isLocal(start) || closure.noSteps) {
      return;
    }
    let queue = this.queue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    const { step, ids, from, to } = closure;
    const scratch = level.scratch;
    while (head < tail) {
      ids[from] = queue[head++];
      scratch.length = 0;
      const count = step.lookup(ids, scratch);
      const quads = scratch.data;
      for (let i = 0; i < count; i++) {
        const next = quads[i * 4 + to];
        if (!this.visit(next)) {
          continue;
        }
        if (reach(next)) {
          return;
        }
        if (tail === queue.length) {
          const grown = new Int32Array(queue.length * 2);
          grown.set(queue);
          queue = grown;
          this.queue = queue;
        }
        queue[tail++] = next;
      }
    }
  }

  /**
   * Assign the next matching quad or record of a level to its slots.
   * @param level A level.
   * @return If there was a next match.
   */
  protected advance(level: ILevel): boolean {
    const { assign, equal } = level.variant!;
    const data = level.buffer.data;
    while (level.position < level.count) {
      const base = level.position++ * 4;
      let matches = true;
      for (let i = 0; i < 4; i++) {
        if (equal[i] >= 0 && data[base + i] !== data[base + equal[i]]) {
          matches = false;
          break;
        }
      }
      if (!matches) {
        continue;
      }
      for (let i = 0; i < 4; i++) {
        if (assign[i] >= 0) {
          this.row[assign[i]] = data[base + i];
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Decode an id into a term.
   * @param id An id, which may be local.
   */
  protected decode(id: number): RDF.Term {
    return isLocal(id) ? this.plan.locals[LOCAL_BASE - id] : this.plan.access.decode(id);
  }

  /**
   * Decode the assigned slots into the output binding.
   */
  protected output(): Bindings {
    const { outputNames, outputSlots, inputNames, inputSlots, inputMask } = this.plan;
    const keys = this.outputKeys;
    const values = this.outputValues;
    let count = 0;
    for (const [ i, outputName ] of outputNames.entries()) {
      const value = this.row[outputSlots[i]];
      if (value !== UNBOUND) {
        keys[count] = outputName;
        values[count] = this.decode(value);
        count++;
      }
    }
    // Input variables that an input binding lacks are assigned by lookups.
    if (this.inputMask !== inputMask) {
      for (const [ i, slot ] of inputSlots.entries()) {
        if ((this.inputMask & (1 << slot)) === 0 && this.row[slot] !== UNBOUND) {
          keys[count] = inputNames[i];
          values[count] = this.decode(this.row[slot]);
          count++;
        }
      }
    }
    const current = this.current!;
    if (typeof (<any> current).extend === 'function') {
      return (<any> current).extend(keys, values, count);
    }
    const entries: [RDF.Variable, RDF.Term][] = [];
    for (let i = 0; i < count; i++) {
      entries.push([ this.dataFactory.variable(keys[i]), values[i] ]);
    }
    return <Bindings> this.bindingsFactory.bindings(entries).merge(current);
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    this.input.destroy();
  }
}
