# Loci build log

CLAD prompts, outcomes and LEAF results, session by session.

## Sat Nov 7: setup and sample data (Claude Code, before CLAD)

- Installed Node.js 26.13.0 (Homebrew) and the Devpost Learn skill pack (`npx skills add challengepost/learn-specs --all -y`), which added `plan-lens`.
- Exported the "Winning Strategy" and "Loci Build Plan" docs to `exports/curated/` (gitignored) as the v1 data source.
- Wrote `Assets/Scripts/PalaceData.ts` by hand from those two docs: 5 topics, 35 thoughts (7 per topic) and 18 threads. `tools/palace-builder/make_sample.py` regenerates it and fails loudly if a spec limit is broken. It passed every limit in `devpost/data-spec.md`, passed `tsc --strict` and has no people's names.
- Created the SPECS Base Template project (Lens Studio 5.23.2), then moved it into the repo root so the repo is the Lens Studio project. The only files with the same name, `.gitignore` and `CLAUDE.md`, were merged by hand. Git LFS is on for binary assets, as Lens Studio's `.gitattributes` expects.
- Installed CLAD (`ls-clad@ls-extensions`) and connected the Lens Studio MCP. TypeScript, including `PalaceData.ts`, compiles with no errors. The only Logger warnings are adb looking for a device over USB.
- `.agents/` vanished after the project reopened, which left `.claude/skills/plan-lens` a broken link. I replaced it with a real copy from `agent/skills/plan-lens`. No CLAD build yet, so no LEAF results.
