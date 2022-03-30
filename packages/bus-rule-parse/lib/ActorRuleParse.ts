import {
  ActorAbstractMediaTyped, IActionAbstractMediaTyped,
  IActionAbstractMediaTypedHandle, IActionAbstractMediaTypedMediaTypeFormats, IActionAbstractMediaTypedMediaTypes,
  IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped,
  IActorOutputAbstractMediaTypedHandle, IActorOutputAbstractMediaTypedMediaTypeFormats, IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTyped,
  IActorTestAbstractMediaTypedHandle,
  IActorTestAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypes
} from '@comunica/actor-abstract-mediatyped';
import type { IActionParse, IActorParseOutput } from '@comunica/actor-abstract-parse';
import type { IActorTest, Mediate } from '@comunica/core';
import type { RuleStream } from '@comunica/reasoning-types';

/**
 * A comunica actor for parsing reasoning rules
 *
 * Actor types:
 * * Input:  IActionRuleParse:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorRuleParseOutput: The parsed rules.
 *
 * @see IActionRuleParse
 * @see IActorRuleParseOutput
 */
export abstract class ActorRuleParse extends ActorAbstractMediaTyped<IActionRuleParse, IActorTest, IActorRuleParseOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRuleParseArgs) {
    super(args);
  }
}

export type IActionRootRuleParse = IActionAbstractMediaTyped<IActionRuleParse>;
export type IActorTestRootRuleParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootRuleParse = IActorOutputAbstractMediaTyped<IActorRuleParseOutput>;

export type IActionRuleParseHandle = IActionAbstractMediaTypedHandle<IActionRuleParse>;
export type IActorTestRuleParseHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputRuleParseHandle = IActorOutputAbstractMediaTypedHandle<IActorRuleParseOutput>;

export type IActionRuleParseMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestRuleParseMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputRuleParseMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionRuleParseMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestRuleParseMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputRuleParseMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;


export interface IActionRuleParseMetadata {
  /**
   * The base IRI for parsed rules.
   */
  baseIRI: string;
}

export type IActorRuleParseOutputMetadata = undefined;

export type IActionRuleParse = IActionParse<IActionRuleParseMetadata>;

export type IActorRuleParseOutput = IActorParseOutput<RuleStream, IActorRuleParseOutputMetadata>;

export type IActorRuleParseArgs = IActorArgsMediaTyped<IActionRuleParse, IActorTest, IActorRuleParseOutput>;

// TODO: See if we can emove this
export type MediatorRdfParseHandle = Mediate<
IActionRuleParseHandle, IActorOutputRuleParseHandle, IActorTestRuleParseHandle>;

export type MediatorRuleParseMediaTypes = Mediate<
IActionRuleParseMediaTypes, IActorOutputRuleParseMediaTypes, IActorTestRuleParseMediaTypes>;

export type MediatorRuleParseMediaTypeFormats = Mediate<
IActionRuleParseMediaTypeFormats, IActorOutputRuleParseMediaTypeFormats, IActorTestRuleParseMediaTypeFormats>;
