import json, re, sys, glob
CATS = ["breakfast", "starter", "main", "snack", "dessert", "drink"]
TAGS = {"veg", "vgn", "gf", "df", "lc", "mp", "trail"}
out, seen, problems = [], set(), []
MEAT = re.compile(r"\b(chicken|beef|steak|turkey|pork|ham|bacon|chorizo|lamb|salmon|tuna|cod|shrimp|prawn|sardine|anchov|fish|mussel|scallop|squid|crab|trout|sea bass|halibut|mackerel|prosciutto|sausage|duck|venison|bison|gelatin|lox)\b", re.I)
DAIRY = re.compile(r"\b(milk|yogurt|yoghurt|cheese|feta|parmesan|mozzarella|ricotta|butter|cream|skyr|kefir|cottage|halloumi|paneer|ghee|whey|labneh|mascarpone|burrata|goat cheese|cheddar|quark|protein powder)\b", re.I)
PLANT_MILK = re.compile(r"\b(almond|oat|coconut|soy|rice|cashew|plant)[- ](milk|yogurt|cream|butter)\b|peanut butter|almond butter|nut butter|cashew butter|cocoa butter|coconut cream|cream of|sunflower butter|tahini|apple butter|butter lettuce|butternut|butter beans?", re.I)
EGG = re.compile(r"\beggs?\b|egg white|mayonnaise|\bhoney\b", re.I)
GLUTEN = re.compile(r"\b(bread|toast|tortilla|pita|flour|pasta|spaghetti|penne|noodle|couscous|bulgur|barley|farro|sourdough|bagel|wrap|crispbread|panko|breadcrumb|soy sauce|seitan|croissant|bun|lasagna|orzo|fusilli|linguine|rigatoni|macaroni|gnocchi|granola|oats|rolled oats|muesli|waffle|pancake|cracker|flatbread|naan|freekeh|rye|wheat|semolina|udon|ramen|biscuit|cookie)\b", re.I)
for f in sorted(glob.glob("*.txt")):
    for n, line in enumerate(open(f, encoding="utf8"), 1):
        line = line.strip()
        if not line: continue
        parts = line.split("|")
        if len(parts) != 9: problems.append(f"{f}:{n} has {len(parts)} fields"); continue
        name, cat, cuisine, time, serves, mac, tags, ings, steps = parts
        if cat not in CATS: problems.append(f"{f}:{n} bad category {cat}"); continue
        kcal, p, c, fat = [float(x) for x in mac.split(",")]
        est = 4 * p + 4 * c + 9 * fat
        if abs(est - kcal) / kcal > 0.15: problems.append(f"{f}:{n} {name}: kcal {kcal:.0f} vs macros {est:.0f}")
        tg = [t for t in tags.split(",") if t]
        bad = [t for t in tg if t not in TAGS]
        if bad: problems.append(f"{f}:{n} {name}: unknown tags {bad}")
        tg = set(tg)
        if "vgn" in tg: tg |= {"veg", "df"}
        ing = [i.strip() for i in ings.split(";") if i.strip()]
        st = [s.strip() for s in steps.split(";") if s.strip()]
        text = " ".join(ing)
        # sanity checks on the dietary labels, against the ingredient list
        if "veg" in tg and MEAT.search(text): problems.append(f"{f}:{n} {name}: tagged vegetarian but has {MEAT.search(text).group(0)}")
        if "df" in tg and DAIRY.search(PLANT_MILK.sub("", text)): problems.append(f"{f}:{n} {name}: tagged dairy-free but has {DAIRY.search(PLANT_MILK.sub('', text)).group(0)}")
        if "vgn" in tg and EGG.search(text): problems.append(f"{f}:{n} {name}: tagged vegan but has {EGG.search(text).group(0)}")
        gtext = re.sub(r"gluten-free [a-z ]+|chickpea pasta|lentil pasta|spaghetti squash|tamari|corn tortilla|rice noodles?|buckwheat|rice paper|rice crackers?|oat milk|rice flour|almond flour|coconut flour|chickpea flour|corn flour", "", text, flags=re.I)
        if "gf" in tg and GLUTEN.search(gtext): problems.append(f"{f}:{n} {name}: tagged gluten-free but has {GLUTEN.search(gtext).group(0)}")
        # labels computed from the numbers, not hand-set
        if p * 4 / kcal >= 0.25 or p >= 30 or (cat in ("snack", "dessert", "drink", "breakfast") and p >= 15 and p * 4 / kcal >= 0.18): tg.add("hp")
        if c <= 20: tg.add("lc")
        else: tg.discard("lc")
        if int(time) <= 20: tg.add("quick")
        rid = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        if rid in seen: problems.append(f"{f}:{n} duplicate {name}"); continue
        seen.add(rid)
        out.append({"id": rid, "name": name, "cat": cat, "cuisine": cuisine, "time": int(time), "serves": int(serves), "kcal": round(kcal), "p": round(p), "c": round(c), "f": round(fat), "tags": sorted(tg), "ing": ing, "steps": st})
print(len(out), "recipes")
from collections import Counter
print(Counter(r["cat"] for r in out))
print("\n".join(problems) if problems else "no problems")
if "--write" in sys.argv:
    json.dump({"version": 1, "recipes": out}, open(sys.argv[-1], "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
