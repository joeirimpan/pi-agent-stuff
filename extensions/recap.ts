import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const SESSIONS_DIR = path.join(process.env.HOME!, ".pi/agent/sessions");

interface SessionSummary {
  project: string;
  cwd: string;
  userMessages: string[];
}

function getProjectName(cwd: string): string {
  // Use the last directory component of the cwd as the project name
  return path.basename(cwd) || cwd;
}

function getTodaySessions(dateStr?: string): SessionSummary[] {
  const today = dateStr || new Date().toISOString().slice(0, 10);
  const results: SessionSummary[] = [];

  if (!fs.existsSync(SESSIONS_DIR)) return results;

  const dirs = fs.readdirSync(SESSIONS_DIR);

  for (const dir of dirs) {
    const dirPath = path.join(SESSIONS_DIR, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl"));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      const modDate = stat.mtime.toISOString().slice(0, 10);

      // Check if file was modified today
      if (modDate !== today) continue;

      // Also check if the session timestamp in filename is from today
      // Files look like: 2026-02-26T05-03-11-234Z_uuid.jsonl
      const fileDate = file.slice(0, 10);

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter(Boolean);

      let cwd = "";
      const userMessages: string[] = [];

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === "session" && obj.cwd) {
            cwd = obj.cwd;
          }
          if (
            obj.type === "message" &&
            obj.message?.role === "user" &&
            Array.isArray(obj.message?.content)
          ) {
            for (const block of obj.message.content) {
              if (block.type === "text" && block.text) {
                // Skip very short messages like "exit", "yes", "no"
                if (block.text.length > 5) {
                  userMessages.push(block.text.slice(0, 300));
                }
              }
            }
          }
        } catch {}
      }

      if (userMessages.length > 0) {
        const project = getProjectName(cwd);

        // Merge with existing project if already seen
        const existing = results.find((r) => r.project === project);
        if (existing) {
          existing.userMessages.push(...userMessages);
        } else {
          results.push({ project, cwd, userMessages });
        }
      }
    }
  }

  return results;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("recap", {
    description: "Summarize today's work across all projects",
    handler: async (args, ctx) => {
      const dateStr = args?.trim() || undefined;
      const sessions = getTodaySessions(dateStr);

      if (sessions.length === 0) {
        ctx.ui.notify("No sessions found for today.", "warning");
        return;
      }

      // Build context for LLM
      let context = `Summarize the following session activity into project-wise one-liners.\n`;
      context += `Format: **project**: <concise one-liner summary of ALL work done>\n`;
      context += `Group by project. Be specific about what was done (features, fixes, configs).\n\n`;

      for (const session of sessions) {
        context += `## ${session.project} (${session.cwd})\n`;
        context += `User prompts:\n`;
        for (const msg of session.userMessages) {
          context += `- ${msg}\n`;
        }
        context += `\n`;
      }

      pi.sendUserMessage(context);
    },
  });
}
