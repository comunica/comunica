"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.langMatches = exports.replace = exports.matches = void 0;
// https://www.w3.org/TR/xpath-functions/#func-matches
// https://www.w3.org/TR/xpath-functions/#flags
function matches(text, pattern, flags) {
    // TODO: Only flags 'i' and 'm' match between XPath and JS.
    // 's', 'x', 'q', would need proper implementation.
    const reg = new RegExp(pattern, flags);
    return reg.test(text);
}
exports.matches = matches;
// TODO: Fix flags
// https://www.w3.org/TR/xpath-functions/#func-replace
function replace(arg, pattern, replacement, flags) {
    let reg = new RegExp(pattern, flags);
    if (!reg.global) {
        const flags_ = flags ?? '';
        reg = new RegExp(pattern, `${flags_}g`);
    }
    return arg.replace(reg, replacement);
}
exports.replace = replace;
// TODO: Not an XPath function
// TODO: Publish as package
// https://www.ietf.org/rfc/rfc4647.txt
// https://www.w3.org/TR/sparql11-query/#func-langMatches
function langMatches(tag, range) {
    const langTags = tag.split('-');
    const rangeTags = range.split('-');
    if (!_matchLangTag(rangeTags[0], langTags[0]) &&
        !_isWildCard(langTags[0])) {
        return false;
    }
    let lI = 1;
    let rI = 1;
    while (rI < rangeTags.length) {
        if (_isWildCard(rangeTags[rI])) {
            rI++;
            continue;
        }
        if (lI === langTags.length) {
            return false;
        }
        if (_matchLangTag(rangeTags[rI], langTags[lI])) {
            lI++;
            rI++;
            continue;
        }
        if (langTags[lI].length === 1) {
            return false;
        }
        lI++;
    }
    return true;
}
exports.langMatches = langMatches;
function _isWildCard(tag) {
    return tag === '*';
}
function _matchLangTag(left, right) {
    const matchInitial = new RegExp(`/${left}/`, 'iu');
    return matchInitial.test(`/${right}/`);
}
//# sourceMappingURL=XPathFunctions.js.map