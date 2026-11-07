# Loci data card

**What the Lens shows:** `Assets/Scripts/PalaceData.ts`, with 5 topics, 35 thoughts and 18 threads.

**Sources:** two of my own planning docs for this hackathon, "Learn AR with SPECS: Winning Strategy" and "Loci: Build Plan", both written Oct 31, 2026. Raw copies live in `exports/curated/`, which is never committed.

**How it was made (v1):** the thoughts were hand-curated from those docs, without the planned LLM-and-embedding script, which was cut for time. `tools/palace-builder/make_sample.py` holds the curated data, lays out each cluster (one central star and six on a 13 cm ring), checks every limit in `devpost/data-spec.md`, and writes the file.

**Cleaning:** no people's names (the judges and executives named in the research were left out), no emails and nothing personal. No online API was called to make the data.
