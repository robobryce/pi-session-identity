import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const SESSION_FILE_ENV = "PI_SESSION_FILE";
export const SESSION_DIR_ENV = "PI_SESSION_DIR";

export default function sessionIdentity(pi: ExtensionAPI): void {
	let ownedFile: string | undefined;
	let ownedDir: string | undefined;

	const clearOwnedIdentity = (): void => {
		if (ownedFile !== undefined && process.env[SESSION_FILE_ENV] === ownedFile) {
			delete process.env[SESSION_FILE_ENV];
		}
		if (ownedDir !== undefined && process.env[SESSION_DIR_ENV] === ownedDir) {
			delete process.env[SESSION_DIR_ENV];
		}
		ownedFile = undefined;
		ownedDir = undefined;
	};

	pi.on("session_start", (_event, ctx) => {
		clearOwnedIdentity();
		const sessionFile = ctx.sessionManager.getSessionFile();
		if (sessionFile === undefined) return;

		const sessionDir = ctx.sessionManager.getSessionDir();
		process.env[SESSION_FILE_ENV] = sessionFile;
		process.env[SESSION_DIR_ENV] = sessionDir;
		ownedFile = sessionFile;
		ownedDir = sessionDir;
	});

	pi.on("session_shutdown", clearOwnedIdentity);
}
