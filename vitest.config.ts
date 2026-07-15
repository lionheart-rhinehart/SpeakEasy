import { defineConfig } from "vitest/config";

// Restrict test discovery to the real source tree. Without this, vitest also runs
// stale copies of *.test.ts under .backups/ (test-protocol snapshots) and
// .claude/worktrees/ (parallel-track worktrees), inflating/duplicating the run.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".backups", ".claude", "src-tauri"],
    environment: "node",
  },
});
