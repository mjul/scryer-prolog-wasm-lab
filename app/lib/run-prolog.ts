import { init, Prolog } from "scryer";

let initialized = false;

export async function runProlog(
	program: string,
	query: string,
): Promise<{ ok?: any; error?: string }> {
	if (!initialized) {
		await init();
		initialized = true;
	}

	const pl = new Prolog();

	try {
		pl.consultText(program);
		const answer = pl.queryOnce(query);
		if (answer) {
			return { ok: answer.bindings };
		} else {
			return { error: "No solution found" };
		}
	} catch (e: any) {
		return { error: e.message };
	}
}
