<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `npx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

## Skill deliverable wins over plan-mode workflow

When a loaded skill declares its own deliverable (e.g. `grilling`, `domain-modeling`, `grill-with-docs` → docs/glossary/ADR only), the **skill wins** over the default plan-mode workflow:

- Do NOT produce a full implementation plan or write code unless the user explicitly asks for it.
- Stop at the skill's declared artifact (glossary entry, ADR, interview summary, etc.).
- The default plan-mode "explore → design plan → `ExitPlanMode` → code" flow is a fallback for tasks with no skill, not a universal path.

<!-- intent-skills:end -->
