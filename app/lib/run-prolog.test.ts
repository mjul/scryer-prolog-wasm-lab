import { describe, expect, it } from "vitest";
import { createProlog, runProlog } from "./run-prolog";

describe("createProlog", () => {
	it("should initialize and return Prolog instance", async () => {
		const pl = await createProlog();
		expect(pl).not.toBeNull;
	});
	it("the Prolog instance should be reusable", async () => {
		const pl = await createProlog();
		pl.consultText("[user]. foo(a). foo(b).");
		const answers = pl.query("foo(X).");
		const results: Set<string> = new Set();
		for (const answer of answers) {
			results.add(answer.bindings.X.valueOf().toString());
		}
		expect(Array.from(results).sort()).toEqual(["a", "b"]);
	});
});

describe("runProlog", () => {
	it("should return error for invalid Prolog program", async () => {
		const result = await runProlog("invalid syntax", "true");
		expect(result).toHaveProperty("error");
		expect(typeof result.error).toBe("string");
	});

	it("should return ok for valid program and query", async () => {
		const result = await runProlog("[user]. foo(a).", "foo(A).");
		expect(result).toHaveProperty("ok");
		expect(result.ok).toBeDefined();
		expect(Array.isArray(result.ok)).toBe(true);
		expect(result.ok?.length).toBeGreaterThan(0);
		expect(result.ok?.[0].A.valueOf().toString()).toBe("a");
	});
});
