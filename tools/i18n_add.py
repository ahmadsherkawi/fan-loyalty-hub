# usage: python3 addkeys.py keys.json   ({"key": ["en", "ar"], ...}); updates existing keys too
import json, re, sys
keys = json.load(open(sys.argv[1]))
for path, idx, end in [("src/i18n/en.ts", 0, "} as const;"), ("src/i18n/ar.ts", 1, "};")]:
    s = open(path).read()
    add = []
    for k, v in keys.items():
        val = json.dumps(v[idx], ensure_ascii=False)
        pat = re.compile(r'^(  "' + re.escape(k) + r'": ).*,$', re.M)
        if pat.search(s): s = pat.sub(lambda m: m.group(1) + val + ",", s, count=1)
        else: add.append(f'  "{k}": {val},')
    i = s.rindex(end)
    s = s[:i] + ("\n".join(add) + "\n" if add else "") + s[i:]
    open(path, "w").write(s)
print("ok", len(keys))
