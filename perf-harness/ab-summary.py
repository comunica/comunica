# Summarize ab-driver outputs: per variant, median over runs of the sum of per-query medians, and of the round median.
import glob, re, statistics as st, sys
prefix = sys.argv[1]
rows = {}
for f in sorted(glob.glob(f'{prefix}-*-*.txt')):
    name = re.match(rf'{re.escape(prefix)}-(.+)-(\d+)\.txt$', f).group(1)
    lines = open(f).read().splitlines()
    if len(lines) < 2 or '\t' not in lines[1]:
        print('bad', f, lines[:3]); continue
    parts = lines[1].split('\t')
    rows.setdefault(name, []).append((float(parts[2]), float(parts[4]), float(parts[5]) if len(parts) > 5 else float('nan')))
base = None
for name, vals in sorted(rows.items(), key=lambda kv: kv[0] != 'base'):
    per_query = st.median(v[0] for v in vals); sum_med = st.median(v[1] for v in vals); cpu = st.median(v[2] for v in vals)
    if base is None: base = (per_query, sum_med, cpu)
    print(f'{name:12s} runs={len(vals)}  mean/exec {per_query:.3f} ms ({per_query/base[0]:.3f})  cpu/exec {cpu:.3f} ms ({cpu/base[2]:.3f})  sum-of-medians {sum_med:.2f} ms ({sum_med/base[1]:.3f})  [{", ".join(f"{v[1]:.1f}" for v in vals)}]')
