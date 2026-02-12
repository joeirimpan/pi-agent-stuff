/**
 * /move-session
 *
 * Move a session file from one project directory to another.
 *
 * Flow:
 * 1. List all project dirs (subdirs of ~/.pi/agent/sessions/)
 * 2. User picks source project dir
 * 3. List sessions in that dir (show name or first user message + date)
 * 4. User picks session(s) to move
 * 5. User picks destination project dir
 * 6. Confirm and move
 *
 * Safety: refuses to move the currently active session.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createReadStream } from "node:fs";
import readline from "node:readline";

const SESSIONS_DIR = path.join(os.homedir(), ".pi", "agent", "sessions");

/** Decode a dir name like --home-joe-Development-foo-- back to a readable label.
 *  We strip the leading --home-joe- prefix and trailing -- to keep it short,
 *  but preserve internal dashes as-is since they're ambiguous (path sep vs literal dash). */
function decodeDirName(name: string): string {
	// Strip leading/trailing --
	let label = name.replace(/^--/, "").replace(/--$/, "");
	// Strip common home prefix (home-<user>-)
	label = label.replace(/^home-[^-]+-/, "");
	return label;
}

/** Read first few lines of a jsonl to extract session info */
async function getSessionInfo(
	filePath: string
): Promise<{ name?: string; firstMessage?: string; timestamp: string; id: string }> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: createReadStream(filePath, { encoding: "utf8" }),
			crlfDelay: Infinity,
		});

		let lineNum = 0;
		let sessionId = "";
		let sessionTimestamp = "";
		let sessionName: string | undefined;
		let firstMessage: string | undefined;

		rl.on("line", (line) => {
			lineNum++;
			try {
				const entry = JSON.parse(line);

				if (lineNum === 1 && entry.type === "session") {
					sessionId = entry.id ?? "";
					sessionTimestamp = entry.timestamp ?? "";
				}

				// Look for session name
				if (entry.type === "session_info" && entry.name) {
					sessionName = entry.name;
				}

				// Grab first user message as fallback label
				if (!firstMessage && entry.type === "message" && entry.message?.role === "user") {
					const content = entry.message.content;
					if (typeof content === "string") {
						firstMessage = content.slice(0, 80);
					} else if (Array.isArray(content)) {
						const text = content.find((c: any) => c.type === "text");
						if (text) firstMessage = text.text.slice(0, 80);
					}
				}
			} catch {
				// skip malformed lines
			}

			// Stop after 50 lines - we should have what we need
			if (lineNum > 50) rl.close();
		});

		rl.on("close", () => {
			resolve({
				name: sessionName,
				firstMessage,
				timestamp: sessionTimestamp,
				id: sessionId,
			});
		});

		rl.on("error", () => {
			resolve({ timestamp: "", id: "" });
		});
	});
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("move-session", {
		description: "Move a session to a different project directory",
		handler: async (args, ctx) => {
			// 1. List all project directories
			let projectDirs: string[];
			try {
				const entries = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
				projectDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
			} catch {
				ctx.ui.notify("No sessions directory found", "error");
				return;
			}

			if (projectDirs.length === 0) {
				ctx.ui.notify("No project directories found", "error");
				return;
			}

			// 2. Pick source project
			const sourceOptions = projectDirs.map((d) => decodeDirName(d));
			const sourceChoice = await ctx.ui.select("Source project directory:", sourceOptions);
			if (!sourceChoice) return;
			const sourceIdx = sourceOptions.indexOf(sourceChoice);
			const sourceDirName = projectDirs[sourceIdx];
			const sourcePath = path.join(SESSIONS_DIR, sourceDirName);

			// 3. List sessions in source dir
			let sessionFiles: string[];
			try {
				const files = await fs.readdir(sourcePath);
				sessionFiles = files.filter((f) => f.endsWith(".jsonl")).sort().reverse();
			} catch {
				ctx.ui.notify("Could not read sessions directory", "error");
				return;
			}

			if (sessionFiles.length === 0) {
				ctx.ui.notify("No sessions in this directory", "info");
				return;
			}

			// Get info for each session
			const sessionInfos = await Promise.all(
				sessionFiles.map(async (f) => {
					const info = await getSessionInfo(path.join(sourcePath, f));
					return { file: f, ...info };
				})
			);

			// Build display labels
			const currentSessionFile = ctx.sessionManager.getSessionFile();
			const sessionLabels = sessionInfos.map((s) => {
				const dateStr = s.timestamp ? new Date(s.timestamp).toLocaleString() : "unknown date";
				const label = s.name || s.firstMessage || "(empty session)";
				const fullPath = path.join(sourcePath, s.file);
				const isCurrent = currentSessionFile === fullPath;
				const prefix = isCurrent ? "🔒 " : "   ";
				return `${prefix}${dateStr} | ${label}`;
			});

			// 4. Pick session to move
			const sessionChoice = await ctx.ui.select("Select session to move:", sessionLabels);
			if (!sessionChoice) return;
			const sessionIdx = sessionLabels.indexOf(sessionChoice);
			const selectedFile = sessionFiles[sessionIdx];
			const selectedPath = path.join(sourcePath, selectedFile);

			// Check if it's the current session
			if (currentSessionFile === selectedPath) {
				ctx.ui.notify("Cannot move the currently active session!", "error");
				return;
			}

			// 5. Pick destination project dir
			const destOptions = projectDirs.filter((d) => d !== sourceDirName).map((d) => decodeDirName(d));
			if (destOptions.length === 0) {
				ctx.ui.notify("No other project directories to move to", "error");
				return;
			}

			const destChoice = await ctx.ui.select("Destination project directory:", destOptions);
			if (!destChoice) return;
			const destIdx = destOptions.indexOf(destChoice);
			const destDirName = projectDirs.filter((d) => d !== sourceDirName)[destIdx];
			const destPath = path.join(SESSIONS_DIR, destDirName);

			// 6. Confirm
			const info = sessionInfos[sessionIdx];
			const label = info.name || info.firstMessage || selectedFile;
			const confirmed = await ctx.ui.confirm(
				"Move session?",
				`"${label}"\n\nFrom: ${sourceChoice}\nTo:   ${destChoice}`
			);

			if (!confirmed) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Move the file
			try {
				await fs.mkdir(destPath, { recursive: true });
				await fs.rename(selectedPath, path.join(destPath, selectedFile));
				ctx.ui.notify(`Moved session to ${destChoice}`, "info");
			} catch (err: any) {
				ctx.ui.notify(`Failed to move: ${err.message}`, "error");
			}
		},
	});
}
