/* eslint-disable */
// PROTOTYPE: an N-Triples/N-Quads stream parser that interns terms by their bytes,
// so every occurrence of a term is the same RDF/JS object. It emits ordinary quads.
import type * as RDF from '@rdfjs/types';
import { Transform } from 'readable-stream';

const TAB = 9; const LF = 10; const CR = 13; const SPACE = 32; const QUOTE = 34; const HASH = 35; const DOT = 46;
const LT = 60; const GT = 62; const AT = 64; const BACKSLASH = 92; const CARET = 94; const UNDERSCORE = 95;
const ESCAPE = /\\(?:u([\dA-Fa-f]{4})|U([\dA-Fa-f]{8})|(.))/gu;
const ESCAPED = { t: '\t', b: '\b', n: '\n', r: '\r', f: '\f', '"': '"', '\'': '\'', '\\': '\\' };

function unescape(value: string): string {
  return value.replace(ESCAPE, (m: string, u4: string, u8: string, c: string) => u4 ? String.fromCodePoint(Number.parseInt(u4, 16)) :
    u8 ? String.fromCodePoint(Number.parseInt(u8, 16)) : (<Record<string, string>> ESCAPED)[c]);
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
      if (bytes[pos] === LF || bytes[pos] === HASH) {
        pos = lineEnd + 1;
        continue;
      }
      let e = this.termEnd(bytes, pos, lineEnd);
      const subject = this.term(bytes, pos, e);
      pos = this.space(bytes, e);
      e = this.termEnd(bytes, pos, lineEnd);
      const predicate = this.term(bytes, pos, e);
      pos = this.space(bytes, e);
      e = this.termEnd(bytes, pos, lineEnd);
      const object = this.term(bytes, pos, e);
      pos = this.space(bytes, e);
      let graph: RDF.Term = this.defaultGraph;
      if (bytes[pos] === LT || bytes[pos] === UNDERSCORE) {
        e = this.termEnd(bytes, pos, lineEnd);
        graph = this.term(bytes, pos, e);
        pos = this.space(bytes, e);
      }
      if (bytes[pos] !== DOT) {
        throw new Error('Expected a dot');
      }
      this.push(this.factory.quad(<RDF.Quad_Subject> subject, <RDF.Quad_Predicate> predicate, <RDF.Quad_Object> object, <RDF.Quad_Graph> graph));
      pos = lineEnd + 1;
    }
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
    if (b === LT) {
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
      throw new Error(`Unexpected term start ${b}`);
    }
    if (end <= pos || end > lineEnd) {
      throw new Error('Unterminated term');
    }
    return end;
  }

  // The interned term for bytes [start, end)
  private term(bytes: Buffer, start: number, end: number): RDF.Term {
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
    const term = this.create(this.decoder.decode(bytes.subarray(start, end)));
    if (this.arenaSize + length > this.arena.length) {
      const grown = new Uint8Array(Math.max(this.arena.length * 2, this.arenaSize + length));
      grown.set(this.arena.subarray(0, this.arenaSize));
      this.arena = grown;
    }
    this.arena.set(bytes.subarray(start, end), this.arenaSize);
    this.terms.push(term);
    const o = slot * 4;
    table[o] = h;
    table[o + 1] = this.terms.length;
    table[o + 2] = this.arenaSize;
    table[o + 3] = length;
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

  private create(text: string): RDF.Term {
    const c = text.charCodeAt(0);
    if (c === LT) {
      const value = text.slice(1, -1);
      return this.factory.namedNode(value.includes('\\') ? unescape(value) : value);
    }
    if (c === UNDERSCORE) {
      return this.factory.blankNode(this.blankNodePrefix + text.slice(2));
    }
    const close = text.lastIndexOf('"');
    let value = text.slice(1, close);
    if (value.includes('\\')) value = unescape(value);
    const s = text.charCodeAt(close + 1);
    if (s === CARET) return this.factory.literal(value, this.factory.namedNode(text.slice(close + 4, -1)));
    if (s === AT) {
      const tag = text.slice(close + 2);
      const dir = tag.indexOf('--');
      return this.factory.literal(value, dir < 0 ? tag : { language: tag.slice(0, dir), direction: <'ltr' | 'rtl'> tag.slice(dir + 2) });
    }
    return this.factory.literal(value);
  }
}

