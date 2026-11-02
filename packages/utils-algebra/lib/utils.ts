import type * as RDF from '@rdfjs/types';
import type { Algebra as TraqulaAlgebra } from '@traqula/algebra-transformations-1-2';
import { algebraUtils, Types } from '@traqula/algebra-transformations-1-2';

import type {
  DefaultNodePreVisitor,
  Patch,
  // eslint-disable-next-line unused-imports/no-unused-imports,unused-imports/no-unused-imports-ts
  PreOrderMappingReturn,
  Safeness,
  TransformContext,
  VisitContext,
} from '@traqula/core';
import { forEveryNodeType, TransformerSubTyped, visitOnlyKnownKeys } from '@traqula/core';
import type { Construct, DeleteInsert, DistinctTerms, KnownOperation, Nodes, Operation, Path } from './Algebra';
import { TypesComunica } from './TypesComunica';

export const resolveIRI = algebraUtils.resolveIRI;
export const objectify = algebraUtils.objectify;

/**
 * Type guard that checks if an operation is of a certain type and subType known by Comunica.
 * In case the type and subtype matches one known by Comunica,
 * the type guard will conclude the operation contains all member Comunica expects from this operation-type and subtype.
 * @param val the operation that should be type checked
 * @param type the type we want to test against
 * @param subType the potential subtype we want to test against
 *     - when provided and not matching, we do not fall back to just checking the type.
 * @return a boolean indicating whether the type and subtype are equal to the expected type and subtype.
 * Only checking the subtype when a string is provided.
 */
export function isKnownOperation<
  Type extends KnownOperation['type'],
  SubType extends Extract<KnownOperation, { type: Type }>['subType'] | undefined = undefined,
>(val: Operation, type: Type, subType?: SubType): val is
  SubType extends undefined ? (
    Extract<KnownOperation, { type: Type }> extends object ?
      Extract<KnownOperation, { type: Type }> : { type: Type }
  ) : Extract<KnownOperation, { type: Type; subType: SubType }> extends object ?
    Extract<KnownOperation, { type: Type; subType: SubType }> : { type: Type; subType: SubType } {
  return val.type === type && (subType === undefined || val.subType === subType);
}

/**
 * Type guard that checks if an operation is of a certain subType known by Comunica.
 * In case the subtype matches one known by Comunica,
 * the type guard will conclude the operation contains all member Comunica expects from this operation-subtype
 * @param val the operation that should be type checked
 * @param subType the subType we want to test against
 * @return a boolean indicating whether the subType equals the expected subType
 */
export function isKnownSubType<
  SubType extends KnownOperation['subType'],
  Obj extends Operation,
>(val: Obj, subType: SubType):
  val is Extract<KnownOperation, { type: Obj['type']; subType: SubType }> extends object ?
    Obj & Extract<KnownOperation, { type: Obj['type']; subType: SubType }> : Obj & { subType: SubType } {
  return val.subType === subType;
}

// ----------------------- manipulators --------------------

type _NeedRefForReusabilityWithoutExplicitTypeDefinition = TraqulaAlgebra.Operation;
export const defaultObjectContext: TransformContext = {
  /**
   * Metadata often contains references to actors,
   * the transformer should not copy these actors, nor should it traverse the actors when visitingOperations.
   * (since there can be cycles involved).
   * It should however still make a shallowCopy from the metadata object, but not map over it.
   */
  shallowKeys: new Set([ 'metadata' ]),
  ignoreKeys: new Set([ 'metadata' ]),
};
/**
 * Per operation type, a context that only visits the keys that can hold operations.
 * Keys Comunica does not know, like the metadata of an operation or the keys of an extension, are never traversed.
 * Operation types Comunica does not know get the {@link defaultObjectContext}.
 */
export const defaultNodePreVisitor: DefaultNodePreVisitor<KnownOperation> = {
  ...<DefaultNodePreVisitor<KnownOperation>> algebraUtils.knownKeysAllowlist,
  ...visitOnlyKnownKeys<Nodes | DistinctTerms>({
    [TypesComunica.NODES]: { graph: false, variable: false, metadata: false },
    [TypesComunica.DISTINCT_TERMS]: { variables: false, terms: false, filters: false, metadata: false },
  }),
};

export const transformer = new TransformerSubTyped<KnownOperation>(defaultObjectContext, defaultNodePreVisitor);

/**
 * Transform a single operation, similar to {@link mapOperation}, but using stricter typings.
 * e.g. wrapping a distinct around the outermost project:
 * ```ts
 * mapOperationStrict<'unsafe', Operation>({
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.PROJECT,
 *     input: {
 *       type: Algebra.Types.JOIN,
 *       input: [{ type: Algebra.Types.PROJECT }, { type: Algebra.Types.BGP }],
 *     },
 *   },
 * }, {
 *   [Algebra.Types.PROJECT]: {
 *     preVisitor: () => ({ continue: false }),
 *     transform: projection => algebraFactory.createDistinct(projection),
 *   },
 * });
 * const returns = {
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.DISTINCT,
 *     input: {
 *       type: Algebra.Types.PROJECT,
 *       input: {
 *         type: Algebra.Types.JOIN,
 *         input: [{ type: Algebra.Types.PROJECT }, { type: Algebra.Types.BGP }],
 *       },
 *     },
 *   },
 * };
 * ```
 * @param startObject the object from which we will start the transformation,
 *   potentially visiting and transforming its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and transformer.
 *    The preVisitor allows you to provide {@link TransformContext} for the current object,
 *    altering how it will be transformed.
 *    The transformer allows you to manipulate the copy of the current object,
 *    and expects you to return the value that should take the current objects place.
 * @return the result of transforming the requested descendant operations (based on the preVisitor)
 * using a transformer that works its way back up from the descendant to the startObject.
 */
export const mapOperationStrict = transformer.transformNode.bind(transformer);

export type AlgebraTransformer<Safe extends Safeness, T> = Patch<
    Pick<typeof transformer, 'clone' | 'cloneObj' |
        'transformObject' | 'transformObjectAsync' | 'transformObjectPreOrder' | 'transformObjectPreOrderAsync' |
        'visitObject' | 'visitObjectAsync' |
        'transformNode' | 'transformNodeAsync' | 'transformNodePreOrder' | 'transformNodePreOrderAsync' |
        'visitNode' | 'visitNodeAsync' |
        'transformNodeSpecific' | 'transformNodeSpecificAsync' | 'transformNodeSpecificPreOrder' |
            'transformNodeSpecificPreOrderAsync' |
        'visitNodeSpecific' | 'visitNodeSpecificAsync'>,
    {
      transformNode: typeof transformer.transformNode<Safe, T>;
      transformNodeAsync: typeof transformer.transformNodeAsync<Safe, T>;
      transformNodePreOrder: typeof transformer.transformNodePreOrder<Safe, T>;
      transformNodePreOrderAsync: typeof transformer.transformNodePreOrderAsync<Safe, T>;
      transformNodeSpecific: typeof transformer.transformNodeSpecific<Safe, T>;
      transformNodeSpecificAsync: typeof transformer.transformNodeSpecificAsync<Safe, T>;
      transformNodeSpecificPreOrder: typeof transformer.transformNodeSpecificPreOrder<Safe, T>;
      transformNodeSpecificPreOrderAsync: typeof transformer.transformNodeSpecificPreOrderAsync<Safe, T>;
    }
>;

export function algebraTransformer<Safe extends Safeness = 'unsafe', T = Operation>(
  objectConfig?: typeof defaultObjectContext & { useDefaults?: boolean },
  nodePreVisitor?: typeof defaultNodePreVisitor & { useDefaults?: boolean },
): AlgebraTransformer<Safe, T> {
  if (!objectConfig && !nodePreVisitor) {
    return transformer;
  }
  const { useDefaults: objUseDef, ...objConf } = objectConfig ?? {};
  const { useDefaults: nodesUseDef, ...nodeConf } = nodePreVisitor ?? {};
  return new TransformerSubTyped<KnownOperation>(
    objUseDef ?? true ? { ...defaultObjectContext, ...objConf } : objConf,
    nodesUseDef ?? true ? { ...defaultNodePreVisitor, ...nodeConf } : nodeConf,
  );
}

/**
 * Transform a single operation.
 * e.g. wrapping a distinct around the outermost project:
 * ```ts
 * mapOperation({
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.PROJECT,
 *     input: {
 *       type: Algebra.Types.JOIN,
 *       input: [{ type: Algebra.Types.PROJECT }, { type: Algebra.Types.BGP }],
 *     },
 *   },
 * }, {
 *   [Algebra.Types.PROJECT]: {
 *     preVisitor: () => ({ continue: false }),
 *     transform: projection => algebraFactory.createDistinct(projection),
 *   },
 * });
 * const returns = {
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.DISTINCT,
 *     input: {
 *       type: Algebra.Types.PROJECT,
 *       input: {
 *         type: Algebra.Types.JOIN,
 *         input: [{ type: Algebra.Types.PROJECT }, { type: Algebra.Types.BGP }],
 *       },
 *     },
 *   },
 * };
 * ```
 * @param startObject the object from which we will start the transformation,
 *   potentially visiting and transforming its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and transformer.
 *    The preVisitor allows you to provide {@link TransformContext} for the current object,
 *    altering how it will be transformed.
 *    The transformer allows you to manipulate the copy of the current object,
 *    and expects you to return the value that should take the current objects place.
 * @return the result of transforming the requested descendant operations (based on the preVisitor)
 * using a transformer that works its way back up from the descendant to the startObject.
 */
export const mapOperation: (typeof mapOperationStrict<'unsafe', Operation>) = <any> mapOperationStrict;

/**
 * Transform a single operation, similar to {@link mapOperationSub}, but using stricter typings.
 * e.g. wrapping a distinct around the all project operations not contained in an aggregate expression
 * (invalid algebra anyway):
 * ```ts
 * mapOperationSubStrict<'unsafe', Operation>({
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.PROJECT,
 *     input: {
 *       type: Algebra.Types.JOIN,
 *       input: [{
 *         type: Algebra.Types.EXPRESSION,
 *         subType: Algebra.ExpressionTypes.AGGREGATE,
 *         input: { type: Algebra.Types.PROJECT },
 *       }, { type: Algebra.Types.BGP }],
 *     },
 *   },
 * }, { [Algebra.Types.PROJECT]: {
 *   transform: projection => algebraFactory.createDistinct(projection),
 * }}, { [Algebra.Types.EXPRESSION]: { [Algebra.ExpressionTypes.AGGREGATE]: {
 *   preVisitor: () => ({ continue: false }),
 * }}});
 * const returns = {
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.DISTINCT,
 *     input: {
 *       type: Algebra.Types.PROJECT,
 *       input: {
 *         type: Algebra.Types.JOIN,
 *         input: [{
 *           type: Algebra.Types.EXPRESSION,
 *           subType: Algebra.ExpressionTypes.AGGREGATE,
 *           input: { type: Algebra.Types.PROJECT },
 *         }, { type: Algebra.Types.BGP }],
 *       },
 *     },
 *   },
 * };
 * ```
 * @param startObject the object from which we will start the transformation,
 *   potentially visiting and transforming its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and transformer.
 *    The preVisitor allows you to provide {@link TransformContext} for the current object,
 *    altering how it will be transformed.
 *    The transformer allows you to manipulate the copy of the current object,
 *    and expects you to return the value that should take the current objects place.
 * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
 *     indicate the subType.
 * @return the result of transforming the requested descendant operations (based on the preVisitor)
 * using a transformer that works its way back up from the descendant to the startObject.
 */
export const mapOperationSubStrict = transformer.transformNodeSpecific.bind(transformer);

/**
 * Transform a single operation, similar to {@link mapOperation}, but also allowing you to target subTypes.
 * e.g. wrapping a distinct around the all project operations not contained in an aggregate expression
 * (invalid algebra anyway):
 * ```ts
 * mapOperationSub({
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.PROJECT,
 *     input: {
 *       type: Algebra.Types.JOIN,
 *       input: [{
 *         type: Algebra.Types.EXPRESSION,
 *         subType: Algebra.ExpressionTypes.AGGREGATE,
 *         input: { type: Algebra.Types.PROJECT },
 *       }, { type: Algebra.Types.BGP }],
 *     },
 *   },
 * }, { [Algebra.Types.PROJECT]: {
 *   transform: projection => algebraFactory.createDistinct(projection),
 * }}, { [Algebra.Types.EXPRESSION]: { [Algebra.ExpressionTypes.AGGREGATE]: {
 *   preVisitor: () => ({ continue: false }),
 * }}});
 * const returns = {
 *   type: Algebra.Types.SLICE,
 *   input: {
 *     type: Algebra.Types.DISTINCT,
 *     input: {
 *       type: Algebra.Types.PROJECT,
 *       input: {
 *         type: Algebra.Types.JOIN,
 *         input: [{
 *           type: Algebra.Types.EXPRESSION,
 *           subType: Algebra.ExpressionTypes.AGGREGATE,
 *           input: { type: Algebra.Types.PROJECT },
 *         }, { type: Algebra.Types.BGP }],
 *       },
 *     },
 *   },
 * };
 * ```
 * @param startObject the object from which we will start the transformation,
 *   potentially visiting and transforming its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and transformer.
 *    The preVisitor allows you to provide {@link TransformContext} for the current object,
 *    altering how it will be transformed.
 *    The transformer allows you to manipulate the copy of the current object,
 *    and expects you to return the value that should take the current objects place.
 * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
 *     indicate the subType.
 * @return the result of transforming the requested descendant operations (based on the preVisitor)
 * using a transformer that works its way back up from the descendant to the startObject.
 */
export const mapOperationSub: (typeof mapOperationSubStrict<'unsafe', Operation>) = <any> mapOperationSubStrict;

/**
 * Similar to {@link mapOperation}, but only visiting instead of copying and transforming explicitly.
 * e.g.:
 * ```ts
 * visitOperation({
 *   type: Algebra.Types.DISTINCT,
 *   input: {
 *     type: Algebra.Types.PROJECT,
 *     input: { type: Algebra.Types.DISTINCT },
 *   },
 * }, {
 *   [Algebra.Types.DISTINCT]: { visitor: () => console.log('1') },
 *   [Algebra.Types.PROJECT]: {
 *     preVisitor: () => ({ continue: false }),
 *     visitor: () => console.log('2'),
 *   },
 * });
 * ```
 * Will first call the preVisitor on the project and notice it should not iterate on its descendants.
 * It then visits the project, and the outermost distinct, printing '21'.
 * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
 * @param startObject the object from which we will start visiting,
 *   potentially visiting its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and visitor.
 *    The preVisitor allows you to provide {@link VisitContext} for the current object,
 *    altering how it will be visited.
 *    The visitor allows you to visit the object from deepest to the outermost object.
 *    This is useful if you for example want to manipulate the objects you visit during your visits,
 *    similar to {@link mapOperation}.
 */
export const visitOperation = transformer.visitNode.bind(transformer);

/**
 * Visits an object and it's descendants, similar to {@link visitOperation},
 * but also allowing you to target subTypes. e.g.:
 * e.g.:
 * ```ts
 * visitOperationSub({
 *   type: Algebra.Types.DISTINCT,
 *   input: {
 *     type: Algebra.Types.DISTINCT,
 *     subType: 'special',
 *   },
 * }, {
 *   [Algebra.Types.DISTINCT]: {
 *     visitor: () => console.log('1'),
 *     preVisitor: () => {
 *       console.log('2');
 *       return {};
 *     },
 *   },
 * }, {
 *   [Algebra.Types.DISTINCT]: { special: {
 *     visitor: () => console.log('3'),
 *   }},
 * });
 * ```
 * Will call the preVisitor on the outer distinct, then the visitor of the special distinct,
 * followed by the visiting the outer distinct, printing '231'.
 * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
 * @param startObject the object from which we will start visiting,
 *   potentially visiting its descendants along the way.
 * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
 *    containing preVisitor and visitor.
 *    The preVisitor allows you to provide {@link VisitContext} for the current object,
 *    altering how it will be visited.
 *    The visitor allows you to visit the object from deepest to the outermost object.
 *    This is useful if you for example want to manipulate the objects you visit during your visits,
 *    similar to {@link mapOperation}.
 * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
 *     indicate the subType.
 */
export const visitOperationSub = transformer.visitNodeSpecific.bind(transformer);

/**
 * Visit the operations the given transformer reaches first when stepping into the given operation,
 * without descending into them.
 * With the default transformer, these are the operations under the keys that can hold operations
 * of an operation type Comunica knows, and the operations under any key but the metadata of other operation types.
 *
 * @param operation The operation to take apart.
 * @param visitor Called with each operation, in the order the transformer visits them,
 *   which keeps the order of the elements of an array.
 * @param membersTransformer The transformer deciding which keys to step into.
 */
export function visitOperationMembers(
  operation: Operation,
  visitor: (member: Operation) => void,
  membersTransformer: Pick<typeof transformer, 'visitNode'> = transformer,
): void {
  membersTransformer.visitNode(operation, forEveryNodeType({
    // Step into the given operation only, visiting the operations right below it
    preVisitor(node: Operation): VisitContext {
      if (node === operation) {
        return {};
      }
      visitor(node);
      return { continue: false };
    },
  }));
}

/**
 * The transformer stepping into the keys that hold the operations an operation is composed of.
 * Of the keys that can hold operations, these leave out those holding templates or the predicate of a path.
 */
const subOperationsTransformer = transformer.clone({}, visitOnlyKnownKeys<Path | Construct | DeleteInsert>({
  [Types.PATH]: { subject: false, predicate: false, object: false, graph: false, metadata: false },
  [Types.CONSTRUCT]: { input: true, template: false, metadata: false },
  [Types.DELETE_INSERT]: { where: true, delete: false, insert: false, metadata: false },
}));

/**
 * Obtain the operations that the given operation is directly composed of, in the order of an array holding them.
 *
 * Expressions are not included.
 *
 * @param operation An operation.
 * @return The operations directly nested within it.
 */
export function getSubOperations(operation: Operation): Operation[] {
  const subOperations: Operation[] = [];
  visitOperationMembers(operation, (member) => {
    if (member.type !== Types.EXPRESSION) {
      subOperations.push(member);
    }
  }, subOperationsTransformer);
  return subOperations;
}

/**
 * Detects all in-scope variables.
 * In practice this means iterating through the entire algebra tree, finding all variables,
 * and stopping when a project function is found.
 * @param {Operation} op Input algebra tree.
 * @param visitor the visitor to be used to traverse the various nodes.
 *        Allows you to provide a visitor with different default preVisitor cotexts.
 * @returns {RDF.Variable[]} List of unique in-scope variables.
 */
export const inScopeVariables: typeof algebraUtils.inScopeVariables =
  (op: Operation, visitor = <typeof algebraUtils.visitOperation>visitOperation): RDF.Variable[] =>
    algebraUtils.inScopeVariables(op, (startObject, nodeCallBacks) =>
      visitor(startObject, ignoreDefaultKeys(nodeCallBacks)));

type VisitCallBacks = Parameters<typeof algebraUtils.visitOperation>[1];

/**
 * Make the pre-visitors of the given callbacks ignore the keys of the default object context on top of their own.
 * Otherwise, their own keys replace the default ones, so metadata, which can contain cycles, would be traversed.
 * @param nodeCallBacks Visitor callbacks per operation type.
 * @return The callbacks with adjusted pre-visitors.
 */
function ignoreDefaultKeys(nodeCallBacks: VisitCallBacks): VisitCallBacks {
  return Object.fromEntries(Object.entries(nodeCallBacks)
    .map(([ type, callBacks ]): [ string, NonNullable<VisitCallBacks[keyof VisitCallBacks]> ] => {
      const preVisitor = <((op: Operation) => VisitContext) | undefined> callBacks.preVisitor;
      return [ type, { ...callBacks, preVisitor: preVisitor && ((op: Operation) => {
        const context = preVisitor(op);
        return context.ignoreKeys ?
            { ...context, ignoreKeys: new Set([ ...defaultObjectContext.ignoreKeys!, ...context.ignoreKeys ]) } :
          context;
      }) }];
    }));
}

/**
 * Returns an operation with an always-defined metadata property.
 */
export function withMetadata<T extends Operation>(op: T): T & { metadata: Record<string, unknown> } {
  op.metadata ??= {};
  return <T & { metadata: Record<string, unknown> }> op;
}
