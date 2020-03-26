import {blankNode, namedNode} from "@rdfjs/data-model";
import {BlankNodeScoped} from "..";

describe('BlankNodeScoped', () => {
  describe('equals', () => {
    it('should be false for a falsy term', () => {
      return expect(new BlankNodeScoped('abc', namedNode('def')).equals(null))
        .toBeFalsy();
    });

    it('should be false for a named node', () => {
      return expect(new BlankNodeScoped('abc', namedNode('def')).equals(namedNode('abc')))
        .toBeFalsy();
    });

    it('should be false for a blank node with another label', () => {
      return expect(new BlankNodeScoped('abc', namedNode('def')).equals(blankNode('ABC')))
        .toBeFalsy();
    });

    it('should be true for a blank node with the same label', () => {
      return expect(new BlankNodeScoped('abc', namedNode('def')).equals(blankNode('abc')))
        .toBeTruthy();
    });
  });
});
