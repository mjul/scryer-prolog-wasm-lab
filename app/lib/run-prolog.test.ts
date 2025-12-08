import { describe, expect, it } from "vitest";
import { runProlog } from "./run-prolog";

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
		expect(result.ok?.[0].A.value).toBe("a");
	});
});
