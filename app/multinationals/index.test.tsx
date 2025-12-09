import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Multinationals from "./index";

describe("Multinationals", () => {
	render(<Multinationals />);
	it("renders the component without crashing", () => {
		expect(
			screen.getByRole("heading", { name: /multinational/i }),
		).toBeInTheDocument();
	});
	describe("Status bar", () => {
		const statusCard = screen.getByText("Status").closest('[data-slot="card"]');
		const statusCardQueries = within(statusCard);
		it("renders status card", () => {
			// Find the card containing "Status" title
			expect(statusCard).toBeInTheDocument();
		});
		it("eventually displays Prolog status initialized", async () => {
			await waitFor(() => {
				expect(
					statusCardQueries.getByText("Prolog:").nextSibling?.textContent,
				).toBe("Initialized");
			});
		});
		it("eventually displays Code status Loaded", async () => {
			// Initially might be "Loading...", wait for it to become "Loaded"
			await waitFor(() => {
				expect(
					statusCardQueries.getByText("Code:").nextSibling?.textContent,
				).toBe("Loaded");
			});
		});
		it("displays Error status -", () => {
			expect(
				statusCardQueries.getByText("Error:").nextSibling?.textContent,
			).toBe("-");
		});
	});
});
