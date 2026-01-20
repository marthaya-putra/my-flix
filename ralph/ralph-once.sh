#!/bin/bash

claude --permission-mode acceptEdits "@ralph/PRD.json   @ralph/progress.txt \\
1. Read the PRD and progress file. \\
2. Find the next incomplete task (pending) and implement it. \\
3. Check typing with ``npm run typecheck``, fix if there's any error \\
4. Check if the app is built successfully with ``npm run build``, fix if there's any error \\
5. Commit your changes. \\
6. Update progress.txt with what you did. \\
7. Update the target PRD status to "done" \\
ONLY DO ONE TASK AT A TIME."
