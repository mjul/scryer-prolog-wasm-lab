import { type Bindings, init, Prolog, type Query } from "scryer";

let initialized = false;

export async function runProlog(
	program: string,
	query: string,
): Promise<{ ok?: Bindings[]; error?: string }> {
	if (!initialized) {
		await init();
		initialized = true;
	}

	const pl = new Prolog();

	try {
		pl.consultText(program);
		const answers: Query = pl.query(query);
		const results: Bindings[] = [];
		for (const answer of answers) {
			results.push(answer.bindings);
		}
		if (results.length > 0) {
			return { ok: results };
		} else {
			return { error: "No solution found" };
		}
	} catch (e: unknown) {
		if (e instanceof Error) {
			return { error: e.message };
		} else {
			return { error: "Unknown error" };
		}
	}
}
