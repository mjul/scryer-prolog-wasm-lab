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
	describe("All Stores", () => {
		const allStoresCard = screen
			.getByText("All Stores", { selector: '[data-slot="card-title"]' })
			.closest('[data-slot="card"]');
		const allStoresCardQueries = within(allStoresCard);
		it("renders All Stores card", () => {
			expect(allStoresCard).toBeInTheDocument();
		});
		it("eventually displays a list of stores", async () => {
			await waitFor(async () => {
				const storeRows = await allStoresCardQueries.findAllByText(/.*/, {
					selector: 'tbody > tr[data-slot="table-row"]',
				});
				expect(storeRows.length).toBeGreaterThan(0);
				console.log(`Found ${storeRows.length} store rows.`);
				const rowTexts = storeRows.map((row) =>
					row.textContent.replace(/\s+/g, ""),
				);
				// Check for some expected store entries
				expect(rowTexts).toContain(
					"BigCo International	BigCo Iceland	Reykjavik, Iceland	ISK".replace(
						/\s+/g,
						"",
					),
				);
				expect(rowTexts).toContain(
					"BigCo International	BigCo Norway	Oslo, Norway	NOK".replace(
						/\s+/g,
						"",
					),
				);
			});
		});
	});
});
