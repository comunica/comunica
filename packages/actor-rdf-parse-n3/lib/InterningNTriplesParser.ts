/* eslint-disable */
// PROTOTYPE: an N-Triples/N-Quads stream parser that interns terms by their bytes, with N3's checks,
// so every occurrence of a term is the same RDF/JS object. It emits ordinary quads.
import type * as RDF from '@rdfjs/types';
import { Transform } from 'readable-stream';

const TAB = 9; const LF = 10; const CR = 13; const SPACE = 32; const QUOTE = 34; const HASH = 35; const DOT = 46;
const LT = 60; const GT = 62; const AT = 64; const BACKSLASH = 92; const CARET = 94; const UNDERSCORE = 95;
const OPEN = 40; const CLOSE = 41;
const ESCAPE = /\\(?:u([\dA-Fa-f]{4})|U([\dA-Fa-f]{8})|([^]))/gu;
const ESCAPED: Record<string, string> = { t: '\t', b: '\b', n: '\n', r: '\r', f: '\f', '"': '"', '\'': '\'', '\\': '\\' };
// As N3's lexer and parser check N-Triples and N-Quads
const ILLEGAL_IRI = /[\x00-\x20<>\\"{}|^`]/u;
const ABSOLUTE_IRI = /^[a-z][a-z0-9+.-]*:/iu;
const LANGUAGE = /^[a-z]+(?:-[a-z0-9]+)*(?:--[a-z]+)?$/iu;
const BLANK_LABEL = /^(?:[0-9A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])(?:\.?(?:[\-0-9A-Z_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]))*$/u;

// Undefined for an invalid escape; IRIs only allow numeric escapes.
function unescape(value: string, characters: boolean): string | undefined {
  let valid = true;
  const result = value.replace(ESCAPE, (m: string, u4: string, u8: string, c: string) => {
    if (u4 || u8) {
      return String.fromCodePoint(Number.parseInt(u4 || u8, 16));
    }
    if (characters && c in ESCAPED) {
      return ESCAPED[c];
    }
    valid = false;
    return '';
  });
  return valid ? result : undefined;
}

export class InterningNTriplesParser extends Transform {
  private readonly factory: RDF.DataFactory;
  private readonly blankNodePrefix: string;
  private readonly defaultGraph: RDF.DefaultGraph;
  private readonly decoder: TextDecoder;
  private table: Int32Array;
  private mask: number;
  private size: number;
  private readonly terms: RDF.Term[];
  private arena: Uint8Array;
  private arenaSize: number;
  private remainder: Buffer | undefined;
  private line = 1;

  public constructor(options: { factory: RDF.DataFactory; blankNodePrefix?: string }) {
    super({ readableObjectMode: true, readableHighWaterMark: 1024 });
    this.factory = options.factory;
    this.blankNodePrefix = options.blankNodePrefix ?? '';
    this.defaultGraph = this.factory.defaultGraph();
    this.decoder = new TextDecoder();
    // Slots of [hash, term index + 1, arena offset, length]
    this.table = new Int32Array(4 << 16);
    this.mask = (1 << 16) - 1;
    this.size = 0;
    this.terms = [];
    this.arena = new Uint8Array(1 << 20);
    this.arenaSize = 0;
    this.remainder = undefined;
  }

  public override _transform(input: Buffer | string, encoding: string, callback: (error?: Error) => void): void {
    const chunk = typeof input === 'string' ? Buffer.from(input) : input;
    try {
      let start = 0;
      if (this.remainder) {
        const lineEnd = chunk.indexOf(LF);
        if (lineEnd < 0) {
          this.remainder = Buffer.concat([ this.remainder, chunk ]);
          return callback();
        }
        const joined = Buffer.concat([ this.remainder, chunk.subarray(0, lineEnd + 1) ]);
        this.remainder = undefined;
        this.lines(joined, joined.length);
        start = lineEnd + 1;
      }
      const end = chunk.lastIndexOf(LF) + 1;
      if (end > start) {
        this.lines(start === 0 ? chunk : chunk.subarray(start), end - start);
      }
      if (end < chunk.length) {
        this.remainder = chunk.slice(Math.max(start, end));
      }
      callback();
    } catch (error: unknown) {
      callback(<Error> error);
    }
  }

  public override _flush(callback: (error?: Error) => void): void {
    try {
      if (this.remainder) {
        const joined = Buffer.concat([ this.remainder, Buffer.from('\n') ]);
        this.remainder = undefined;
        this.lines(joined, joined.length);
      }
      callback();
    } catch (error: unknown) {
      callback(<Error> error);
    }
  }

  private lines(bytes: Buffer, end: number): void {
    let pos = 0;
    while (pos < end) {
      const lineEnd = bytes.indexOf(LF, pos);
      pos = this.space(bytes, pos);
      while (bytes[pos] !== LF && bytes[pos] !== HASH) {
        let e = this.termEnd(bytes, pos, lineEnd);
        if (bytes[pos] === LT ? bytes[pos + 1] === LT : bytes[pos] !== UNDERSCORE) {
          this.error(bytes, pos, e, 'subject');
        }
        const subject = this.term(bytes, pos, e);
        pos = this.space(bytes, e);
        e = this.termEnd(bytes, pos, lineEnd);
        if (bytes[pos] !== LT || bytes[pos + 1] === LT) {
          this.error(bytes, pos, e, 'predicate');
        }
        const predicate = this.term(bytes, pos, e);
        pos = this.space(bytes, e);
        e = this.termEnd(bytes, pos, lineEnd);
        const object = this.term(bytes, pos, e);
        pos = this.space(bytes, e);
        let graph: RDF.Term = this.defaultGraph;
        if (bytes[pos] !== DOT) {
          e = this.termEnd(bytes, pos, lineEnd);
          if (bytes[pos] === LT ? bytes[pos + 1] === LT : bytes[pos] !== UNDERSCORE) {
            this.error(bytes, pos, e, 'graph');
          }
          graph = this.term(bytes, pos, e);
          pos = this.space(bytes, e);
          if (bytes[pos] !== DOT) {
            this.error(bytes, pos, pos + 1, 'punctuation');
          }
        }
        this.push(this.factory.quad(<RDF.Quad_Subject> subject, <RDF.Quad_Predicate> predicate, <RDF.Quad_Object> object, <RDF.Quad_Graph> graph));
        pos = this.space(bytes, pos + 1);
      }
      pos = lineEnd + 1;
      this.line++;
    }
  }

  private error(bytes: Buffer, start: number, end: number, what: string): never {
    throw new Error(`Unexpected ${what} "${this.decoder.decode(bytes.subarray(start, Math.max(end, start + 1)))}" on line ${this.line}.`);
  }

  private space(bytes: Buffer, pos: number): number {
    let b = bytes[pos];
    while (b === SPACE || b === TAB || b === CR) {
      b = bytes[++pos];
    }
    return pos;
  }

  private termEnd(bytes: Buffer, pos: number, lineEnd: number): number {
    const b = bytes[pos];
    let end: number;
    if (b === LT && bytes[pos + 1] === LT) {
      if (bytes[pos + 2] !== OPEN) {
        this.error(bytes, pos, pos + 3, 'token');
      }
      let p = this.space(bytes, pos + 3);
      for (let i = 0; i < 3; i++) {
        p = this.space(bytes, this.termEnd(bytes, p, lineEnd));
      }
      if (bytes[p] !== CLOSE || bytes[p + 1] !== GT || bytes[p + 2] !== GT) {
        this.error(bytes, p, p + 3, 'token');
      }
      end = p + 3;
    } else if (b === LT) {
      end = bytes.indexOf(GT, pos + 1) + 1;
    } else if (b === QUOTE) {
      end = bytes.indexOf(QUOTE, pos + 1);
      while (end > 0 && bytes[end - 1] === BACKSLASH) {
        let n = 1;
        while (bytes[end - 1 - n] === BACKSLASH) n++;
        if (n % 2 === 0) break;
        end = bytes.indexOf(QUOTE, end + 1);
      }
      end++;
      if (bytes[end] === CARET) {
        end = bytes.indexOf(GT, end + 3) + 1;
      } else if (bytes[end] === AT) {
        let c = bytes[++end];
        while (c !== SPACE && c !== TAB && c !== LT && c !== CR && c !== LF) c = bytes[++end];
        while (bytes[end - 1] === DOT) end--;
      }
    } else if (b === UNDERSCORE) {
      end = pos + 2;
      let c = bytes[end];
      while (c !== SPACE && c !== TAB && c !== LT && c !== CR && c !== LF) c = bytes[++end];
      while (bytes[end - 1] === DOT) end--;
    } else {
      this.error(bytes, pos, pos + 1, 'token');
    }
    if (end <= pos || end > lineEnd) {
      this.error(bytes, pos, lineEnd, 'unterminated term');
    }
    return end;
  }

  // The interned term for bytes [start, end)
  private term(bytes: Buffer, start: number, end: number): RDF.Term {
    // Literals are mostly distinct, and the store builds a new key string for them anyway
    if (bytes[start] === QUOTE) {
      return this.create(this.decoder.decode(bytes.subarray(start, end)), bytes, start, end);
    }
    const length = end - start;
    let h = 0x811C9DC5;
    for (let i = start; i < end; i++) {
      h = Math.imul(h ^ bytes[i], 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85EBCA6B);
    h ^= h >>> 13;
    const table = this.table;
    const mask = this.mask;
    let slot = h & mask;
    for (let o = slot * 4; table[o + 1] !== 0; o = (slot = (slot + 1) & mask) * 4) {
      if (table[o] === h && table[o + 3] === length) {
        const arena = this.arena;
        let a = table[o + 2];
        let i = start;
        while (i < end && arena[a] === bytes[i]) {
          a++;
          i++;
        }
        if (i === end) {
          return this.terms[table[o + 1] - 1];
        }
      }
    }
    let term: RDF.Term;
    if (bytes[start] === LT && bytes[start + 1] === LT) {
      term = this.createTripleTerm(bytes, start);
      // Inner terms may have been added
      slot = h & this.mask;
      while (this.table[(slot * 4) + 1] !== 0) {
        slot = (slot + 1) & this.mask;
      }
    } else {
      term = this.create(this.decoder.decode(bytes.subarray(start, end)), bytes, start, end);
    }
    if (this.arenaSize + length > this.arena.length) {
      const grown = new Uint8Array(Math.max(this.arena.length * 2, this.arenaSize + length));
      grown.set(this.arena.subarray(0, this.arenaSize));
      this.arena = grown;
    }
    this.arena.set(bytes.subarray(start, end), this.arenaSize);
    this.terms.push(term);
    const o = slot * 4;
    this.table[o] = h;
    this.table[o + 1] = this.terms.length;
    this.table[o + 2] = this.arenaSize;
    this.table[o + 3] = length;
    this.arenaSize += length;
    if (++this.size * 2 > mask) {
      this.grow();
    }
    return term;
  }

  private grow(): void {
    const old = this.table;
    this.table = new Int32Array(old.length * 2);
    this.mask = (this.mask << 1) | 1;
    for (let o = 0; o < old.length; o += 4) {
      if (old[o + 1] !== 0) {
        let slot = old[o] & this.mask;
        while (this.table[(slot * 4) + 1] !== 0) slot = (slot + 1) & this.mask;
        this.table.set(old.subarray(o, o + 4), slot * 4);
      }
    }
  }

  private createTripleTerm(bytes: Buffer, start: number): RDF.Term {
    const lineEnd = bytes.indexOf(LF, start);
    let pos = this.space(bytes, start + 3);
    let e = this.termEnd(bytes, pos, lineEnd);
    if (bytes[pos] === LT ? bytes[pos + 1] === LT : bytes[pos] !== UNDERSCORE) {
      this.error(bytes, pos, e, 'subject');
    }
    const subject = this.term(bytes, pos, e);
    pos = this.space(bytes, e);
    e = this.termEnd(bytes, pos, lineEnd);
    if (bytes[pos] !== LT || bytes[pos + 1] === LT) {
      this.error(bytes, pos, e, 'predicate');
    }
    const predicate = this.term(bytes, pos, e);
    pos = this.space(bytes, e);
    e = this.termEnd(bytes, pos, lineEnd);
    const object = this.term(bytes, pos, e);
    return this.factory.quad(<RDF.Quad_Subject> subject, <RDF.Quad_Predicate> predicate, <RDF.Quad_Object> object);
  }

  private iri(value: string, bytes: Buffer, start: number, end: number): RDF.NamedNode {
    const iri = value.includes('\\') ? unescape(value, false) : value;
    if (iri === undefined || ILLEGAL_IRI.test(iri) || !ABSOLUTE_IRI.test(iri)) {
      this.error(bytes, start, end, 'IRI');
    }
    return this.factory.namedNode(iri);
  }

  private create(text: string, bytes: Buffer, start: number, end: number): RDF.Term {
    const c = text.charCodeAt(0);
    if (c === LT) {
      return this.iri(text.slice(1, -1), bytes, start, end);
    }
    if (c === UNDERSCORE) {
      const label = text.slice(2);
      if (text.charCodeAt(1) !== 58 || !BLANK_LABEL.test(label)) {
        this.error(bytes, start, end, 'blank node');
      }
      return this.factory.blankNode(this.blankNodePrefix + label);
    }
    const close = text.lastIndexOf('"');
    let value: string | undefined = text.slice(1, close);
    if (value.includes('\\')) {
      value = unescape(value, true);
    }
    if (value === undefined || text.slice(1, close).includes('\r')) {
      this.error(bytes, start, end, 'literal');
    }
    const s = text.charCodeAt(close + 1);
    if (s === CARET) {
      if (text.charCodeAt(close + 2) !== CARET || text.charCodeAt(close + 3) !== LT) {
        this.error(bytes, start, end, 'literal');
      }
      return this.factory.literal(value, this.iri(text.slice(close + 4, -1), bytes, start, end));
    }
    if (s === AT) {
      const tag = text.slice(close + 2);
      if (!LANGUAGE.test(tag)) {
        this.error(bytes, start, end, 'language tag');
      }
      const dir = tag.indexOf('--');
      if (dir < 0) {
        return this.factory.literal(value, tag);
      }
      const direction = tag.slice(dir + 2);
      if (direction !== 'ltr' && direction !== 'rtl') {
        this.error(bytes, start, end, 'direction');
      }
      return this.factory.literal(value, { language: tag.slice(0, dir), direction });
    }
    if (close + 1 !== text.length) {
      this.error(bytes, start, end, 'literal');
    }
    return this.factory.literal(value);
  }
}

