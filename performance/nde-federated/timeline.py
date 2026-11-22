import json, sys, collections
rs = json.load(open(sys.argv[1] + '.requests.json'))
summ = json.load(open(sys.argv[1] + '.summary.json'))
T = summ['timeMs']
ev = []
for r in rs:
    e = r.get('end', T) if r.get('end', -1) >= r['start'] else T
    ev.append((r['start'], e, r['kind'], r['endpoint']))
# concurrency histogram in 1s buckets
buckets = collections.defaultdict(lambda: [0, 0.0])
busy = 0.0
for s, e, k, _ in ev:
    buckets[s // 2000][0] += 1
    busy += (e - s)
maxc = 0
pts = sorted([(s, 1) for s, e, *_ in ev] + [(e, -1) for s, e, *_ in ev])
c = 0
for t, d in pts:
    c += d; maxc = max(maxc, c)
print(f'total {T} ms, requests {len(ev)}, sum of request durations {busy/1000:.1f}s, avg concurrency {busy/T:.1f}, max concurrency {maxc}')
lat = sorted(e - s for s, e, *_ in ev)
print('latency p50', lat[len(lat)//2], 'p90', lat[int(len(lat)*.9)], 'max', lat[-1])
print('requests started per 2s bucket:', ' '.join(f'{k*2}s:{v[0]}' for k, v in sorted(buckets.items())))
