/**
 * Global Resume - Resume any session across all projects.
 *
 * Usage: /resume-global [search term]
 *
 * Shows a fuzzy-searchable list of all sessions from all projects,
 * sorted by most recently modified. Selecting one switches to that session.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import {
	Input,
	type Component,
	matchesKey,
	Key,
	truncateToWidth,
	type Focusable,
} from "@mariozechner/pi-tui";
import { SessionManager, type SessionInfo } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("resume-global", {
		description: "Resume a session from any project",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("resume-global requires interactive mode", "error");
				return;
			}

			// Load all sessions with a loader
			const sessions = await ctx.ui.custom<SessionInfo[] | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, "Loading sessions from all projects...");
				loader.onAbort = () => done(null);

				SessionManager.listAll()
					.then((sessions) => done(sessions))
					.catch(() => done(null));

				return loader;
			});

			if (!sessions || sessions.length === 0) {
				ctx.ui.notify(sessions ? "No sessions found" : "Cancelled", "info");
				return;
			}

			// Sort by modified date, newest first
			sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());

			// Pre-filter by command args if provided
			const initialFilter = args.trim();

			// Show session picker
			const selected = await ctx.ui.custom<SessionInfo | null>((tui, theme, _kb, done) => {
				const picker = new SessionPicker(sessions, initialFilter, theme, tui, done);
				return picker;
			});

			if (!selected) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Switch to the selected session
			const result = await ctx.switchSession(selected.path);
			if (result.cancelled) {
				ctx.ui.notify("Session switch was cancelled", "info");
			}
		},
	});
}

/**
 * Extracts a short project name from a session's cwd.
 * e.g. "/home/user/projects/my-app/backend" -> "my-app/backend"
 */
function projectName(cwd: string): string {
	if (!cwd) return "unknown";
	const parts = cwd.split("/");
	// Take last 2 path segments for a nice short name
	return parts.slice(-2).join("/");
}

/**
 * Format a date as relative time (e.g. "2h ago", "3d ago")
 */
function timeAgo(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

class SessionPicker implements Component, Focusable {
	private sessions: SessionInfo[];
	private filteredSessions: SessionInfo[];
	private selectedIndex = 0;
	private scrollOffset = 0;
	private filterText: string;
	private input: Input;
	private theme: any;
	private tui: any;
	private done: (result: SessionInfo | null) => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	// Focusable
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.input.focused = value;
	}

	constructor(
		sessions: SessionInfo[],
		initialFilter: string,
		theme: any,
		tui: any,
		done: (result: SessionInfo | null) => void,
	) {
		this.sessions = sessions;
		this.filterText = initialFilter;
		this.theme = theme;
		this.tui = tui;
		this.done = done;

		this.input = new Input();
		if (initialFilter) {
			this.input.setValue(initialFilter);
		}

		this.filteredSessions = this.applyFilter(initialFilter);
	}

	private applyFilter(filter: string): SessionInfo[] {
		if (!filter) return this.sessions;
		const lower = filter.toLowerCase();
		const terms = lower.split(/\s+/).filter(Boolean);
		return this.sessions.filter((s) => {
			const searchable = `${s.cwd} ${s.name || ""} ${s.firstMessage} ${s.allMessagesText}`.toLowerCase();
			return terms.every((term) => searchable.includes(term));
		});
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape)) {
			this.done(null);
			return;
		}

		if (matchesKey(data, Key.enter)) {
			if (this.filteredSessions.length > 0) {
				this.done(this.filteredSessions[this.selectedIndex]);
			}
			return;
		}

		if (matchesKey(data, Key.up) || matchesKey(data, Key.ctrl("p"))) {
			if (this.selectedIndex > 0) {
				this.selectedIndex--;
				this.ensureVisible();
				this.invalidate();
				this.tui.requestRender();
			}
			return;
		}

		if (matchesKey(data, Key.down) || matchesKey(data, Key.ctrl("n"))) {
			if (this.selectedIndex < this.filteredSessions.length - 1) {
				this.selectedIndex++;
				this.ensureVisible();
				this.invalidate();
				this.tui.requestRender();
			}
			return;
		}

		// Page up/down
		if (matchesKey(data, "pageup")) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 10);
			this.ensureVisible();
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "pagedown")) {
			this.selectedIndex = Math.min(this.filteredSessions.length - 1, this.selectedIndex + 10);
			this.ensureVisible();
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		// Pass to input for text editing
		const oldValue = this.input.getValue();
		this.input.handleInput(data);
		const newValue = this.input.getValue();

		if (oldValue !== newValue) {
			this.filterText = newValue;
			this.filteredSessions = this.applyFilter(this.filterText);
			this.selectedIndex = 0;
			this.scrollOffset = 0;
			this.invalidate();
			this.tui.requestRender();
		}
	}

	private ensureVisible(): void {
		const maxVisible = this.getMaxVisible();
		if (this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		} else if (this.selectedIndex >= this.scrollOffset + maxVisible) {
			this.scrollOffset = this.selectedIndex - maxVisible + 1;
		}
	}

	private getMaxVisible(): number {
		// Reserve lines for: top border, title, input, help, bottom border, count info = ~6 lines
		// Each session item takes 3 lines (name + first message + separator)
		return 8;
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const theme = this.theme;
		const lines: string[] = [];

		// Top border
		lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));

		// Title + count
		const count = `${this.filteredSessions.length}/${this.sessions.length}`;
		const title = theme.fg("accent", theme.bold(" Resume Global ")) + theme.fg("dim", `(${count} sessions)`);
		lines.push(truncateToWidth(title, width));

		// Search input
		const inputLines = this.input.render(width - 2);
		const searchPrefix = theme.fg("muted", " 🔍 ");
		for (const line of inputLines) {
			lines.push(truncateToWidth(searchPrefix + line, width));
		}

		// Separator
		lines.push(truncateToWidth(theme.fg("dim", "─".repeat(width)), width));

		if (this.filteredSessions.length === 0) {
			lines.push(truncateToWidth(theme.fg("warning", " No matching sessions"), width));
		} else {
			const maxVisible = this.getMaxVisible();
			const end = Math.min(this.scrollOffset + maxVisible, this.filteredSessions.length);

			for (let i = this.scrollOffset; i < end; i++) {
				const session = this.filteredSessions[i];
				const isSelected = i === this.selectedIndex;
				const prefix = isSelected ? "▸ " : "  ";
				const bg = isSelected ? (s: string) => theme.bg("selectedBg", s) : (s: string) => s;

				// Line 1: project name + session name + time
				const proj = projectName(session.cwd);
				const name = session.name ? ` · ${session.name}` : "";
				const time = timeAgo(session.modified);
				const line1 = `${prefix}${proj}${name}`;
				const timeStr = theme.fg("dim", ` ${time}`);

				lines.push(
					truncateToWidth(
						bg(
							(isSelected ? theme.fg("accent", line1) : theme.fg("text", line1)) + timeStr,
						),
						width,
					),
				);

				// Line 2: first message (truncated)
				const firstMsg = (session.firstMessage || "").replace(/\n/g, " ").trim();
				const msgPrefix = isSelected ? "  " : "  ";
				const msgLine = `${msgPrefix}${firstMsg}`;
				lines.push(
					truncateToWidth(
						bg(theme.fg("muted", msgLine)),
						width,
					),
				);

				// Thin separator between items
				if (i < end - 1) {
					lines.push(truncateToWidth(theme.fg("dim", "  " + "·".repeat(Math.min(width - 4, 40))), width));
				}
			}

			// Scroll indicator
			if (this.filteredSessions.length > maxVisible) {
				const scrollInfo = `${this.scrollOffset + 1}-${end} of ${this.filteredSessions.length}`;
				lines.push(truncateToWidth(theme.fg("dim", ` ${scrollInfo}`), width));
			}
		}

		// Help text
		lines.push(truncateToWidth(theme.fg("dim", "─".repeat(width)), width));
		lines.push(
			truncateToWidth(
				theme.fg("dim", " ↑↓ navigate • enter select • esc cancel • type to filter"),
				width,
			),
		);
		lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
		this.input.invalidate();
	}
}
