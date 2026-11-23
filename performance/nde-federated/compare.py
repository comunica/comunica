"""Compare NDE runs. Usage: python3 compare.py <dir>... (relative to the harness)"""
import json, os, sys
EXPECTED = {'q1': (334, 'rows'), 'q2': (53, 'rows'), 'q3': (205, 'rows'), 'q4': (2026, 'distinct'),
            'q4b': (2022, 'rows'), 'q5': (711, 'items'), 'q5b': (711, 'items'), 'q6': (391, 'distinct'),
            'q6b': (73, 'distinct'), 'q7': (11, 'rows')}
dirs = sys.argv[1:]
print(f"{'q':4} " + ' | '.join(f"{d[-14:]:>44}" for d in dirs))
for q, (exp, kind) in EXPECTED.items():
    cells = []
    for d in dirs:
        p = os.path.join(d, f'{q}.summary.json')
        if not os.path.exists(p):
            cells.append(f"{'-':>44}"); continue
        s = json.load(open(p))
        r = json.load(open(os.path.join(d, f'{q}.results.json')))
        distinct = len({json.dumps(x, sort_keys=True) for x in r})
        items = len({x.get('item') or x.get('dataset') for x in r})
        got = {'rows': s['results'], 'distinct': distinct, 'items': items}[kind]
        ok = 'ok' if got == exp else f'{got}/{exp}'
        reqs = json.load(open(os.path.join(d, f'{q}.requests.json')))
        cnt = sum(1 for x in reqs if 'COUNT' in (x.get('query') or '') and x['kind'] != 'ask')
        cells.append(f"{s['status'][:4]} {ok:>9} {s['timeMs']/1000:6.1f}s {s['httpRequests']:5}r c{cnt:<4} {s['decodedBytes']/1e6:6.1f}MB")
    print(f"{q:4} " + ' | '.join(cells))
