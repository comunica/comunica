import * as E from '../expressions';
import * as C from '../util/Consts';
export interface ISpecialDefinition {
    arity: number;
    applyAsync: E.SpecialApplicationAsync;
    applySynchronously: E.SpecialApplicationSync;
    checkArity?: (args: E.Expression[]) => boolean;
}
export declare const specialDefinitions: Record<C.SpecialOperator, ISpecialDefinition>;
