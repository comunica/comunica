import type * as T12 from '@traqula/rules-sparql-1-2';

// From T12.Pattern
export type Pattern = T12.Pattern | PatternLateral;

export type PatternLateral = T12.PatternBase & {
  subType: 'lateral';
  patterns: Pattern[];
};
