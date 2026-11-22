import json, sys, collections, re
reqs = json.load(open(sys.argv[1] + '.requests.json'))
summ = json.load(open(sys.argv[1] + '.summary.json'))
def shape(q):
    if not q: return '-'
    q = re.sub(r'VALUES[^}]*\}', 'VALUES{...}', q, flags=re.S)
    q = re.sub(r'"[^"]*"', '"…"', q)
    q = re.sub(r'<https://data\.rkd\.nl/artists/\d+>', '<rkd:N>', q)
    q = re.sub(r'<https?://(n2t\.net|hdl\.handle\.net)[^>]*>', '<local>', q)
    q = re.sub(r'\s+', ' ', q)
    return q[:260]
c = collections.Counter(); ep = collections.Counter(); epk = collections.Counter()
for r in reqs:
    c[(r['kind'], shape(r.get('query')))] += 1
    ep[r['endpoint']] += 1
for (k, s), n in c.most_common(int(sys.argv[2]) if len(sys.argv) > 2 else 25):
    print(n, k, s)
print('--- per endpoint')
for e, n in ep.most_common(): 
    be = summ['byEndpoint'][e]
    print(n, e.replace('https://',''), be['kinds'], 'rows', be['dataRows'], 'bytes', be['decodedBytes'], 'err', be['errors'])
