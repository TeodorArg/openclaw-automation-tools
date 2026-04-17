import crypto from "node:crypto";
import { loadOpenClawBrowserSupport } from "./browser-support.js";
import type { HostNodeSelection } from "./selection.js";

export type HostCommandRunner = {
	run(
		command: string,
		args: string[],
		options: { cwd: string; timeoutMs?: number },
	): Promise<{ stdout: string; stderr: string }>;
};

type PreparedSystemRun = {
	plan: {
		argv: string[];
		cwd: string | null;
		commandText: string;
		agentId: string | null;
		sessionKey: string | null;
	};
};

type SystemRunPayload = {
	success?: boolean;
	stdout?: string;
	stderr?: string;
	error?: string;
	exitCode?: number | null;
};

function shellEscape(value: string): string {
	if (value === "") {
		return "''";
	}

	return /^[A-Za-z0-9_./:=+-]+$/u.test(value)
		? value
		: `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function formatCommand(args: string[]): string {
	return args.map(shellEscape).join(" ");
}

function parsePreparedSystemRunPayload(payload: unknown): PreparedSystemRun {
	if (!payload || typeof payload !== "object") {
		throw new Error("system.run.prepare returned an empty payload.");
	}

	const plan = (payload as { plan?: PreparedSystemRun["plan"] }).plan;
	if (
		!plan ||
		!Array.isArray(plan.argv) ||
		typeof plan.commandText !== "string"
	) {
		throw new Error("system.run.prepare returned an invalid execution plan.");
	}

	return {
		plan: {
			argv: plan.argv,
			cwd: typeof plan.cwd === "string" ? plan.cwd : null,
			commandText: plan.commandText,
			agentId: typeof plan.agentId === "string" ? plan.agentId : null,
			sessionKey: typeof plan.sessionKey === "string" ? plan.sessionKey : null,
		},
	};
}

function buildNodeError(
	command: string,
	args: string[],
	payload: SystemRunPayload,
): Error {
	const parts = [payload.error, payload.stderr, payload.stdout].filter(
		(value): value is string => typeof value === "string" && value !== "",
	);
	const reason =
		parts.join("\n").trim() ||
		`Node command failed with exit code ${payload.exitCode ?? "unknown"}.`;
	return new Error(`${formatCommand([command, ...args])}: ${reason}`);
}

async function invokePreparedSystemRun(params: {
	nodeId: string;
	command: string;
	args: string[];
	cwd: string;
	timeoutMs?: number;
	agentId?: string;
	sessionKey?: string;
}): Promise<{ stdout: string; stderr: string }> {
	const rawCommand = formatCommand([params.command, ...params.args]);
	const { callGatewayTool } = await loadOpenClawBrowserSupport();
	const prepareResponse = await callGatewayTool<{ payload?: unknown }>(
		"node.invoke",
		{ timeoutMs: params.timeoutMs ?? 15000 },
		{
			nodeId: params.nodeId,
			command: "system.run.prepare",
			params: {
				command: [params.command, ...params.args],
				rawCommand,
				cwd: params.cwd,
				agentId: params.agentId,
				sessionKey: params.sessionKey,
			},
			idempotencyKey: crypto.randomUUID(),
		},
	);
	const prepared = parsePreparedSystemRunPayload(prepareResponse?.payload);

	const runResponse = await callGatewayTool<{ payload?: SystemRunPayload }>(
		"node.invoke",
		{ timeoutMs: params.timeoutMs ?? 15000 },
		{
			nodeId: params.nodeId,
			command: "system.run",
			params: {
				command: prepared.plan.argv,
				rawCommand: prepared.plan.commandText,
				systemRunPlan: prepared.plan,
				cwd: prepared.plan.cwd ?? params.cwd,
				agentId: prepared.plan.agentId ?? params.agentId,
				sessionKey: prepared.plan.sessionKey ?? params.sessionKey,
			},
			idempotencyKey: crypto.randomUUID(),
		},
	);

	const payload =
		runResponse?.payload && typeof runResponse.payload === "object"
			? runResponse.payload
			: {};

	if (payload.success !== true) {
		throw buildNodeError(params.command, params.args, payload);
	}

	return {
		stdout: typeof payload.stdout === "string" ? payload.stdout.trim() : "",
		stderr: typeof payload.stderr === "string" ? payload.stderr.trim() : "",
	};
}

export function describeNodeBindingTarget(
	node: {
		nodeId: string;
		displayName?: string;
		platform?: string;
		connected?: boolean;
	},
	bindingSource: "selector" | "implicit_singleton",
) {
	return {
		nodeId: node.nodeId,
		displayName: node.displayName ?? null,
		platform: node.platform ?? null,
		connected: node.connected ?? null,
		bindingSource,
		commandSurface: "node.invoke.system.run",
	};
}

export function assertBoundNodeSelection(
	nodeSelection: HostNodeSelection,
): asserts nodeSelection is HostNodeSelection & {
	runtimeBindingStatus: "bound";
	runtimeBindingTarget: NonNullable<HostNodeSelection["runtimeBindingTarget"]>;
} {
	if (nodeSelection.runtimeBindingStatus !== "bound") {
		throw new Error(
			`Host node binding is required before host-backed execution can continue: ${nodeSelection.note}`,
		);
	}
}

export function createNodeHostCommandRunner(params: {
	nodeSelection: HostNodeSelection;
	agentId?: string;
	sessionKey?: string;
}): HostCommandRunner {
	assertBoundNodeSelection(params.nodeSelection);
	const nodeId = params.nodeSelection.runtimeBindingTarget.nodeId;

	return {
		async run(command, args, options) {
			return invokePreparedSystemRun({
				nodeId,
				command,
				args,
				cwd: options.cwd,
				timeoutMs: options.timeoutMs,
				agentId: params.agentId,
				sessionKey: params.sessionKey,
			});
		},
	};
}
