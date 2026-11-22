// Compares sparqljson-parse's streaming parser with a row-splitting prototype.
const { Readable } = require('node:stream');
const { SparqlJsonParser } = require('/home/user/comunica/node_modules/sparqljson-parse');
const { DataFactory } = require('/home/user/comunica/node_modules/rdf-data-factory');
const DF = new DataFactory();

function makeResponse(rows) {
  const parts = ['{"head":{"vars":["object","title"]},"results":{"bindings":['];
  for (let i = 0; i < rows; i++) {
    parts.push(`${i ? ',' : ''}{"object":{"type":"uri","value":"https://n2t.net/ark:/57463/${(i * 2654435761 >>> 0).toString(16)}a1b2c3d4"},"title":{"type":"literal","xml:lang":"nl","value":"Portret van \\"persoon\\" nummer ${i}, olieverf op doek"}}`);
  }
  parts.push(']}}');
  return Buffer.from(parts.join(''));
}

// Prototype: find each binding object in the bindings array by tracking string state and brace depth,
// and parse each with JSON.parse.
function parseRowSplitting(chunks, onRow) {
  let state = 'seek'; let depth = 0; let inString = false; let escape = false; let rowParts = []; let rowStart = -1;
  let seekBuf = '';
  for (const chunk of chunks) {
    let i = 0;
    const s = chunk.toString('latin1'); // byte-wise scan; slices are decoded as utf8 later
    if (state === 'seek') {
      seekBuf += s;
      const m = seekBuf.indexOf('"bindings"');
      if (m < 0) { seekBuf = seekBuf.slice(-16); continue; }
      const open = seekBuf.indexOf('[', m);
      if (open < 0) continue;
      i = s.length - (seekBuf.length - open - 1);
      state = 'rows';
    }
    for (; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (inString) {
        if (escape) escape = false;
        else if (c === 92) escape = true;
        else if (c === 34) inString = false;
        continue;
      }
      if (c === 34) { inString = true; continue; }
      if (c === 123) { if (depth === 0) { rowStart = i; rowParts = []; } depth++; }
      else if (c === 125) {
        depth--;
        if (depth === 0) {
          rowParts.push(chunk.subarray(rowStart, i + 1)); rowStart = -1;
          onRow(JSON.parse(Buffer.concat(rowParts).toString('utf8')));
        }
      } else if (c === 93 && depth === 0) { return; }
    }
    if (depth > 0) { rowParts.push(chunk.subarray(rowStart < 0 ? 0 : rowStart)); rowStart = -1; }
    if (rowStart === -1 && depth > 0) rowStart = 0;
  }
}
function toTerm(t) {
  if (t.type === 'uri') return DF.namedNode(t.value);
  if (t.type === 'bnode') return DF.blankNode(t.value);
  return t['xml:lang'] ? DF.literal(t.value, t['xml:lang']) : DF.literal(t.value, t.datatype ? DF.namedNode(t.datatype) : undefined);
}

(async () => {
  const rows = Number(process.argv[2] || 300000);
  const buf = makeResponse(rows);
  const chunks = []; for (let i = 0; i < buf.length; i += 65536) chunks.push(buf.subarray(i, i + 65536));
  console.log(`response ${(buf.length / 1e6).toFixed(1)} MB, ${rows} rows`);
  for (let round = 0; round < 2; round++) {
    let t = performance.now(); let n = 0; let last;
    await new Promise((resolve, reject) => {
      const s = new SparqlJsonParser({ dataFactory: DF }).parseJsonResultsStream(Readable.from(chunks));
      s.on('data', b => { n++; last = b; }); s.on('end', resolve); s.on('error', reject);
    });
    const tStream = performance.now() - t;
    t = performance.now(); let m = 0; let lastP;
    parseRowSplitting(chunks, (row) => { m++; const o = {}; for (const k in row) o[`?${k}`] = toTerm(row[k]); lastP = o; });
    const tSplit = performance.now() - t;
    console.log(`round ${round}: sparqljson-parse ${tStream.toFixed(0)} ms (${n} rows), row-splitting ${tSplit.toFixed(0)} ms (${m} rows), speedup ${(tStream / tSplit).toFixed(1)}x, keys ${Object.keys(last)} equal: ${JSON.stringify(Object.values(last).map(t=>t.value))===JSON.stringify(Object.values(lastP).map(t=>t.value))}`);
  }
})();
