import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Multinationals from "./index";

// Mock the Prolog-related imports to avoid WASM and async dependencies
vi.mock("~/lib/run-prolog", () => ({
	createProlog: vi.fn(() => Promise.resolve({ consultText: vi.fn() })),
	runQuery: vi.fn(() => Promise.resolve({ ok: [] })),
}));

describe("Multinationals", () => {
	it("renders the component without crashing", () => {
		render(<Multinationals />);
		expect(
			screen.getByRole("heading", { name: /multinational/i }),
		).toBeInTheDocument();
	});
});
