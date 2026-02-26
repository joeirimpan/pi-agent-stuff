import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

const DESTRUCTIVE_PATTERNS = [
  /\bgit\s+commit\b/,
  /\bgit\s+commit\s+--amend\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+reset\b/,
  /\bgit\s+push\s+--force\b/,
  /\bgit\s+push\s+--force-with-lease\b/,
  /\bgit\s+checkout\s+--\s/,
  /\bgit\s+restore\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+branch\s+-D\b/,
  /\bgit\s+stash\s+drop\b/,
];

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    const cmd = event.input.command;
    const matched = DESTRUCTIVE_PATTERNS.some((p) => p.test(cmd));
    if (!matched) return;

    const ok = await ctx.ui.confirm(
      "Git operation requires approval",
      cmd,
    );

    if (!ok) {
      return { block: true, reason: "Git operation denied by user." };
    }
  });
}
