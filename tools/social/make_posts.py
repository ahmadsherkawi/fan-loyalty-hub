"""
Jamhoor social images: one bilingual (EN + AR) design rendered as a 4:5 feed post and a 9:16 story,
both with safe margins so Instagram's square crop, the profile grid and story overlays never cut anything.

Usage:  python3 tools/social/make_posts.py spec.json out_dir
Needs:  pip install playwright segno opencv-python-headless --break-system-packages  (Chromium is preinstalled)

spec.json:
{
  "name": "tonight",                       # output files: Jamhoor-<name>-post.png / -story.png
  "pill": "SAT 10 OCT · السبت ١٠ أكتوبر",   # top-right pill
  "eyebrow": "PREMIER LEAGUE · الدوري الإنجليزي",   # optional small green line above the title
  "title_en": "Super Sunday.", "title_en2": "Who wins it?",   # second line is green
  "title_ar": "أحد كبير… مين يفوز؟",
  "sub": "UAE time · بتوقيت الإمارات",       # optional
  "games": [ { "home": ["Liverpool","ليفربول","LIV","#C8102E","#F6EB61"],
               "away": ["Man City","مانشستر سيتي","MCI","#6CABDD","#1C2C5B"],
               "time": "19:30", "day": "Sun · الأحد", "comp": "Premier League", "channel": "beIN Sports",
               "score": "2 - 1" } ],         # day/comp/channel/score optional; score replaces the time (results posts)
  "note": "optional one-line footnote (HTML allowed)",
  "qr_url": "https://jamhoor.lovable.app/predictor?ref=ig",
  "cta_en": "Predict free · beat your friends", "cta_ar": "توقّع مجاناً ونافس أصحابك",
  "link": "jamhoor.lovable.app/predictor"
}
Team tuple = [name EN, name AR, short code, primary colour, secondary colour] — take them from the `teams` table.
Up to 5 games fit comfortably.
"""
import asyncio, json, os, sys, tempfile
import segno
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FM = os.path.join(ROOT, "node_modules")
MARK = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M13 13l9 11M51 13l-9 11" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="3.5" fill="#fff"/><circle cx="52" cy="12" r="3.5" fill="#fff"/><circle cx="21" cy="39" r="5.5" fill="#00C566"/><circle cx="32" cy="35" r="6.5" fill="#00C566"/><circle cx="43" cy="39" r="5.5" fill="#00C566"/><path d="M9 55c3-7 8-9 12-9 4 0 7 2 11-2 4 4 7 2 11 2 4 0 9 2 12 9z" fill="#00C566"/></svg>'
LIGHT = {"#FFFFFF", "#FFD100", "#FFD200", "#FFDD00", "#FFCC00", "#87D8F7", "#6CABDD", "#FFE667", "#59C5F5", "#F5A12D", "#FFE600"}

HEAD = f'''<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:IT;src:url(file://{FM}/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2);font-weight:100 900}}
@font-face{{font-family:AR;src:url(file://{FM}/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2);font-weight:700}}
@font-face{{font-family:AR;src:url(file://{FM}/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2);font-weight:500}}
*{{margin:0;box-sizing:border-box}}
body{{width:1080px;height:1350px;padding:56px 60px;display:flex;flex-direction:column;justify-content:space-between;font-family:IT,AR,sans-serif;color:#fff;overflow:hidden;position:relative;
background:radial-gradient(60% 28% at 50% 0%,rgba(0,197,102,.38),transparent 70%),radial-gradient(50% 30% at 100% 75%,rgba(0,197,102,.14),transparent 70%),#0B1220}}
.rays{{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 50% -10%,rgba(255,255,255,.03) 0 3deg,transparent 3deg 9deg)}}
.ar{{font-family:AR;direction:rtl}} em{{font-style:normal;color:#00C566}}
</style><div class=rays></div>'''
# Safe areas (measured): post content stays within y 185-1165 / x 120-960; story within y ~350-1450 / x 130-950.
SAFE = {
    "post": (1350, '<style>body{padding:185px 120px !important}body>*:not(.rays){zoom:.7}</style>'),
    "story": (1920, '<style>body{width:1080px !important;height:1920px !important;padding:300px 130px 430px !important;justify-content:center !important;gap:34px}body>*:not(.rays){zoom:.78}</style>'),
}

def crest(t):
    tc = "#0B1220" if t[3].upper() in LIGHT else "#fff"
    return f"<svg viewBox='0 0 40 46' style='width:46px;height:54px;flex-shrink:0'><path d='M20 1 38 7v14c0 12-8 20-18 24C10 41 2 33 2 21V7z' fill='{t[3]}' stroke='{t[4]}' stroke-width='2.4'/><text x='20' y='27' text-anchor='middle' font-size='11' font-weight='800' fill='{tc}' font-family='IT'>{t[2]}</text></svg>"

def side(t, right):
    name = f"<div style='text-align:{'right' if right else 'left'};min-width:0'><b style='display:block;font-size:26px;letter-spacing:-.02em;white-space:nowrap'>{t[0]}</b><span class=ar style='display:block;font-size:19px;opacity:.65;font-weight:500'>{t[1]}</span></div>"
    inner = name + crest(t) if right else crest(t) + name
    return f"<div style='display:flex;align-items:center;gap:12px;justify-content:{'flex-end' if right else 'flex-start'};min-width:0'>{inner}</div>"

def game(g):
    big = g.get("score") or g["time"]
    day = f"<div style='font-size:15px;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.08em'>{g['day']}</div>" if g.get("day") else ""
    bg = "#fff" if g.get("score") else "#00C566"
    mid = f"<div style='text-align:center'>{day}<div style='background:{bg};color:#0B1220;border-radius:12px;padding:6px 14px;font-size:30px;font-weight:800;letter-spacing:-.02em'>{big}</div></div>"
    foot = ""
    if g.get("comp") or g.get("channel"):
        foot = f"<div style='display:flex;justify-content:space-between;margin-top:10px;font-size:16px;font-weight:700;opacity:.6'><span>{g.get('comp','')}</span><span>{g.get('channel','')}</span></div>"
    return f"<div style='background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px 20px'><div style='display:grid;grid-template-columns:1fr 150px 1fr;align-items:center;gap:10px'>{side(g['home'], True)}{mid}{side(g['away'], False)}</div>{foot}</div>"

def body(s, qr_path):
    top = f'<div style="position:relative;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:12px;align-items:center;font-size:30px;font-weight:800"><div style="width:50px;height:50px">{MARK}</div>Jamhoor <small style="font-family:AR;font-weight:500;font-size:22px;opacity:.6">جمهور</small></div><div style="background:#00C566;color:#0B1220;font-weight:800;font-size:20px;padding:8px 18px;border-radius:999px">{s["pill"]}</div></div>'
    eyebrow = f'<p style="font-size:20px;font-weight:800;letter-spacing:.16em;color:#00C566;margin-bottom:8px">{s["eyebrow"]}</p>' if s.get("eyebrow") else ""
    sub = f'<p style="margin-top:10px;font-size:20px;opacity:.6">{s["sub"]}</p>' if s.get("sub") else ""
    head = f'<div style="position:relative;text-align:center">{eyebrow}<h1 style="font-size:88px;line-height:.95;font-weight:800;letter-spacing:-.05em">{s["title_en"]}<br><em>{s.get("title_en2","")}</em></h1><p class=ar style="margin-top:12px;font-size:44px;font-weight:700">{s["title_ar"]}</p>{sub}</div>'
    games = '<div style="position:relative;display:grid;gap:10px">' + "".join(game(g) for g in s["games"]) + "</div>"
    note = f'<div style="position:relative;text-align:center;font-size:21px;opacity:.75">{s["note"]}</div>' if s.get("note") else ""
    foot = f'''<div style="position:relative;display:flex;align-items:center;gap:24px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:18px 22px">
<div style="position:relative;background:#fff;border-radius:16px;padding:10px;flex-shrink:0"><img src="file://{qr_path}" style="width:210px;height:210px;display:block">
<div style="position:absolute;left:50%;top:50%;width:52px;height:52px;transform:translate(-50%,-50%);background:#0B1220;border-radius:11px;box-shadow:0 0 0 5px #fff;padding:5px">{MARK}</div></div>
<div><b style="font-size:30px;letter-spacing:-.02em">{s["cta_en"]}</b><div class=ar style="unicode-bidi:plaintext;text-align:left;font-size:25px;font-weight:700;margin-top:4px">{s["cta_ar"]}</div>
<div style="margin-top:8px;font-size:20px;color:#3BE08A;font-weight:700">{s["link"]}</div></div></div>'''
    return HEAD + f"<body>{top}{head}{games}{note}{foot}</body>"

async def render(spec, out):
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp()
    qr = os.path.join(tmp, "qr.svg")
    segno.make(spec["qr_url"], error="h").save(qr, scale=10, border=0, dark="#0B1220")
    files = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for kind, (h, css) in SAFE.items():
            html = os.path.join(tmp, f"{kind}.html")
            open(html, "w").write(body(spec, qr) + css)
            pg = await b.new_page(viewport={"width": 1080, "height": h})
            await pg.goto("file://" + html); await pg.wait_for_timeout(900)
            path = os.path.join(out, f"Jamhoor-{spec['name']}-{kind}.png")
            await pg.screenshot(path=path); await pg.close(); files.append(path)
        await b.close()
    return files

def check_qr(path, want):
    try:
        import cv2
    except ImportError:
        return "skipped (no opencv)"
    im = cv2.imread(path)
    d = cv2.QRCodeDetector().detectAndDecode(im)[0] or cv2.QRCodeDetector().detectAndDecode(cv2.resize(im, None, fx=1.5, fy=1.5))[0]
    return "ok" if d == want else f"FAILED (read {d!r})"

if __name__ == "__main__":
    spec = json.load(open(sys.argv[1]))
    for f in asyncio.run(render(spec, sys.argv[2])):
        print(f, "QR", check_qr(f, spec["qr_url"]))
