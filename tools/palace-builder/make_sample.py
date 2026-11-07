"""Hand-curated v1 sample for Loci: writes Assets/Scripts/PalaceData.ts and validates it against devpost/data-spec.md."""
import json, math, re, sys

OUT = sys.argv[1]

TOPICS = [
    ("design-rules", "Design rules", "shelf"),
    ("build-plan", "Build plan", "desk"),
    ("open-questions", "Open questions", "window"),
    ("idea-hunt", "Idea hunt", "door"),
    ("what-snap-wants", "What Snap wants", "plant"),
]
S, P = "Winning Strategy", "Loci Build Plan"
OCT31, NOV7 = "2026-10-31", "2026-11-07"

# (id, label, text, kind, date, source, prompt)
T = {
"design-rules": [
 ("d01","Pin it, don't float","A graph in mid-air is a website on your face, so anchor it to a place.","decision",OCT31,S,"Why anchor the palace to real places?"),
 ("d02","Show only what's faced","Only the spot you face opens; everything else stays a dim dot.","decision",OCT31,P,"What happens to spots you aren't facing?"),
 ("d03","Light, never dark panels","The display only adds light, so black shows clear; use light text and glow.","decision",OCT31,P,"Why avoid dark panels on Specs?"),
 ("d04","Big forgiving pinch targets","Use two or three large controls instead of many small buttons.","decision",OCT31,S,"How many controls should the main view have?"),
 ("d05","Info on its thing","Put each cue on the object it is about, at real size, never a HUD.","insight",OCT31,S,"Where should a cue sit?"),
 ("d06","Silence is a feature","Don't show everything at once: one step and one cue at a time.","insight",OCT31,S,"How much should show at once?"),
 ("d07","Comfort over spectacle","Keep sessions short, with no neck turns and no arms held up for long.","insight",OCT31,S,"What keeps the body comfortable in a session?"),
],
"build-plan": [
 ("b01","Data first, then CLAD","Build v1 from a hand-written sample so CLAD never waits on the script.","decision",OCT31,P,"Why build v1 from sample data?"),
 ("b02","Fix with design notes","Walk the preview and change things with design notes, not code.","decision",OCT31,P,"How do we fix problems after a build?"),
 ("b03","Fresh chat per build","Start a fresh chat for each CLAD build, because it works best with clean context.","decision",OCT31,P,"What do we do before each CLAD build?"),
 ("b04","A LEAF test each","Every done criterion gets a LEAF test, and the results go in the repo.","decision",OCT31,P,"How is each done criterion proven?"),
 ("b05","Builds take thirty minutes","A full CLAD build can take thirty minutes or more, so budget a few.","insight",OCT31,S,"How long can a full CLAD build take?"),
 ("b06","Video gets real time","The video gets about ten hours, because Presentation is a quarter of the score.","decision",OCT31,P,"Why give the video so many hours?"),
 ("b07","Cut scope, stay sparse","When time ran short, we cut the script and Follow instead of thinning the design.","decision",NOV7,P,"What did we cut when time ran short?"),
],
"open-questions": [
 ("q01","Legible at two metres?","Labels must stay readable from where I stand; tune their size in the preview.","question",OCT31,P,"What must we check about label size?"),
 ("q02","Comfortable for long sessions?","We can't prove comfort over a long session without wearing the glasses.","question",OCT31,P,"What can't the preview prove about comfort?"),
 ("q03","Head as gaze stand-in","Head direction stands in for eye gaze; does the dwell still feel right?","question",OCT31,P,"What stands in for eye gaze?"),
 ("q04","Can LEAF turn heads?","If LEAF can't turn the head, test the gaze logic with simulated angles.","question",OCT31,S,"What's the fallback if LEAF can't drive the head?"),
 ("q05","Too many stars clutter?","A topic with more than eight stars may clutter its spot.","question",OCT31,P,"What's the most stars a topic should have?"),
 ("q06","Will CLAD float panels?","If v1 puts a menu in front of your face, move it onto the spot.","question",OCT31,S,"What do we do if CLAD floats a panel?"),
 ("q07","Module or JSON data?","If Lens Studio can't import the data as a module, load it as JSON text.","question",OCT31,P,"What's the backup way to load the palace data?"),
],
"idea-hunt": [
 ("i01","Cooking is crowded","The skill pack's own example is a risotto coach, so many entrants copy it.","insight",OCT31,S,"Why avoid a cooking coach?"),
 ("i02","Step coaches start behind","Anything shaped like 'show me the next step' starts behind on Innovation.","insight",OCT31,S,"Which idea shape loses Innovation points?"),
 ("i03","Rehearsal version dropped","The talk-rehearsal Loci wasn't novel enough, since speech tools already exist on Spectacles.","decision",OCT31,P,"Why drop the talk-rehearsal version?"),
 ("i04","Your thinking, your room","Phone apps build palaces from flashcards; Loci places your own conversations in your room.","insight",OCT31,P,"What makes Loci different from phone memory palaces?"),
 ("i05","Method of loci","Memory improves when each cue lives in a real place you can walk to.","insight",OCT31,S,"Why does placing cues in rooms help memory?"),
 ("i06","Headset beat desktop","A study found a headset memory palace gave 8.8% better recall than a desktop one.","insight",OCT31,P,"How much better was headset recall in the study?"),
 ("i07","Furniture, sunlight rejected","Moving furniture wasn't useful enough, and sunlight planners already exist on phones.","decision",OCT31,P,"Why reject the furniture and sunlight ideas?"),
],
"what-snap-wants": [
 ("s01","Who is it for?","Critics ask who Specs are for; Lenses people use every week answer them.","insight",OCT31,S,"What question do Specs critics ask?"),
 ("s02","Weekly use wins","Pick a task people repeat every week, not a demo watched once.","decision",OCT31,S,"What kind of task should the Lens serve?"),
 ("s03","Taste over code","Once agents write the code, design judgment is what separates entries.","insight",OCT31,S,"What separates entries when agents write code?"),
 ("s04","CLAD needs testers","CLAD is in preview, so many strangers building with it is cheap testing.","insight",OCT31,S,"Why does Snap want many CLAD builders?"),
 ("s05","Preview-first pipeline","Specs are expensive and new, so developers build in the preview without glasses.","insight",OCT31,S,"Why is the hackathon preview-only?"),
 ("s06","Show the process","Devpost wants proof its format works, so the brief and logs must be visible.","insight",OCT31,S,"What does Devpost want to see in the repo?"),
 ("s07","Ties go to Design","Four criteria weigh equally, and ties go to Design first.","insight",OCT31,S,"Which criterion breaks ties?"),
],
}

THREADS = [
 ("d01","i05","Anchoring to places is the method of loci"),
 ("d01","i06","Placement in space aids recall"),
 ("d02","q03","Facing depends on head direction"),
 ("d03","q01","Light text must still read far away"),
 ("d07","q02","Comfort is designed in but unproven"),
 ("d06","q05","Sparse spots need few stars"),
 ("d05","q06","Cues belong on spots, not panels"),
 ("b01","q07","The sample data must load cleanly"),
 ("b04","q04","LEAF has to test the gaze"),
 ("b07","d06","Cutting scope keeps every spot sparse"),
 ("b02","s03","Design notes are where judgment shows"),
 ("i02","s02","Repeated tasks, not step-by-step coaches"),
 ("s06","b04","LEAF results are process evidence"),
 ("s07","d02","Design decides ties, so sparseness matters"),
 ("b06","s06","The video carries the process story"),
 ("s01","i04","Your own thinking gives weekly use"),
 ("b05","s04","Slow builds are part of testing CLAD"),
 ("i03","d04","Taking words away became showing less"),
]

# Layout: one star at the centre, six on a 13 cm ring; ring tilted and rotated per topic.
def layout(k):
    pts = [(0.0, 0.0, 0.0)]
    rot = k * 17.0
    for j in range(6):
        a = math.radians(rot + j * 60)
        x, y = 13 * math.cos(a), 13 * math.sin(a) * 0.85
        z = 5.0 if j % 2 == 0 else -5.0
        pts.append((round(x, 1), round(y, 1), z))
    return pts

topics = [{"id": i, "name": n, "spot": s} for i, n, s in TOPICS]
thoughts = []
for k, (tid, _, _) in enumerate(TOPICS):
    for (id_, label, text, kind, date, src, prompt), off in zip(T[tid], layout(k)):
        thoughts.append({"id": id_, "topic": tid, "label": label, "text": text, "kind": kind,
                         "date": date, "source": src, "prompt": prompt, "offset": list(off)})
threads = [{"from": a, "to": b, "why": w} for a, b, w in THREADS]

# ---- validation (fails loudly) ----
err = []
wc = lambda s: len(s.split())
spots = {"shelf", "desk", "window", "door", "plant"}
if len(topics) != 5: err.append("need 5 topics")
if {t["spot"] for t in topics} != spots: err.append("spots must be the five named spots")
for t in topics:
    if wc(t["name"]) > 3: err.append(f"topic name too long: {t['name']}")
ids = {}
for th in thoughts:
    if th["id"] in ids: err.append(f"duplicate id {th['id']}")
    ids[th["id"]] = th
    for f, lim in (("label", 4), ("text", 20), ("source", 6), ("prompt", 12)):
        if wc(th[f]) > lim: err.append(f"{th['id']} {f} has {wc(th[f])} words (max {lim})")
    if any(abs(v) > 20 for v in th["offset"]): err.append(f"{th['id']} offset out of ±20")
    if not re.fullmatch(r"2026-\d\d-\d\d", th["date"]): err.append(f"{th['id']} bad date")
for t in topics:
    group = [th for th in thoughts if th["topic"] == t["id"]]
    if not 6 <= len(group) <= 8: err.append(f"{t['id']} has {len(group)} thoughts")
    for i in range(len(group)):
        for j in range(i + 1, len(group)):
            if math.dist(group[i]["offset"], group[j]["offset"]) < 6:
                err.append(f"{group[i]['id']} and {group[j]['id']} closer than 6 cm")
if not 35 <= len(thoughts) <= 40: err.append(f"{len(thoughts)} thoughts total")
if len(threads) > 40: err.append("too many threads")
deg, seen = {}, set()
for th in threads:
    a, b = ids.get(th["from"]), ids.get(th["to"])
    if not a or not b: err.append(f"thread to unknown id {th}"); continue
    if a["topic"] == b["topic"]: err.append(f"thread {th['from']}-{th['to']} within one topic")
    if wc(th["why"]) > 8: err.append(f"thread why too long: {th['why']}")
    key = frozenset((th["from"], th["to"]))
    if key in seen: err.append(f"duplicate thread {th}")
    seen.add(key)
    for x in (th["from"], th["to"]): deg[x] = deg.get(x, 0) + 1
for x, n in deg.items():
    if n > 2: err.append(f"{x} has {n} threads (max 2)")
if err:
    print("VALIDATION FAILED:\n  " + "\n  ".join(err)); sys.exit(1)

def js(v): return json.dumps(v, ensure_ascii=False)
lines = ["// Assets/Scripts/PalaceData.ts",
         "// v1 hand-curated sample (scope cut, 2026-11-07): built from the Winning Strategy and Loci Build Plan docs.",
         "// Schema and limits: devpost/data-spec.md. No people's names.",
         "",
         'export type Kind = "decision" | "insight" | "question";',
         "",
         "export interface Topic {\n  id: string;\n  name: string;\n  spot: string;\n}",
         "",
         "export interface Thought {\n  id: string;\n  topic: string;\n  label: string;\n  text: string;\n  kind: Kind;\n  date: string;\n  source: string;\n  prompt: string;\n  offset: [number, number, number];\n}",
         "",
         "export interface Thread {\n  from: string;\n  to: string;\n  why: string;\n}",
         "",
         "export const PALACE: { topics: Topic[]; thoughts: Thought[]; threads: Thread[] } = {",
         "  topics: ["]
lines += [f"    {{ id: {js(t['id'])}, name: {js(t['name'])}, spot: {js(t['spot'])} }}," for t in topics]
lines += ["  ],", "  thoughts: ["]
for th in thoughts:
    o = ", ".join(str(v) for v in th["offset"])
    lines.append(f"    {{ id: {js(th['id'])}, topic: {js(th['topic'])}, label: {js(th['label'])}, kind: {js(th['kind'])},\n"
                 f"      text: {js(th['text'])},\n"
                 f"      date: {js(th['date'])}, source: {js(th['source'])}, prompt: {js(th['prompt'])}, offset: [{o}] }},")
lines += ["  ],", "  threads: ["]
lines += [f"    {{ from: {js(t['from'])}, to: {js(t['to'])}, why: {js(t['why'])} }}," for t in threads]
lines += ["  ],", "};", ""]
open(OUT, "w").write("\n".join(lines))
print(f"OK: {len(topics)} topics, {len(thoughts)} thoughts, {len(threads)} threads -> {OUT}")
