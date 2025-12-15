import { Handshake, Store } from "lucide-react";
import { useEffect, useState } from "react";
import type { Bindings, Prolog, Term } from "scryer";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { DataTable } from "~/components/ui/data-table";
import { Tree, type TreeItem } from "~/components/ui/tree";
import { createProlog, runQuery } from "~/lib/run-prolog";
// This is not TypeScript-native import, but using ?raw to import the Prolog code as a string
import PROLOG_PROGRAM from "./rules.pl?raw";

/** Corresponds to the fact company(CompanyID, Name, Currency). */
interface CompanyFact {
	id: string;
	name: string;
	currency: string;
}

/** Corresponds to the fact store(StoreID, Location). */
interface StoreFact {
	id: string;
	location: string;
}

interface StoreData {
	top: CompanyFact;
	owner: CompanyFact;
	store: StoreFact;
	currency: string;
}

interface Company {
	id: string;
	name: string;
	currency?: string;
	subsidiaries: Company[];
	stores: StoreFact[];
}

function companyToTreeItem(company: Company): TreeItem {
	const children: TreeItem[] = [];
	// Add subsidiaries
	for (const sub of company.subsidiaries) {
		children.push(companyToTreeItem(sub));
	}
	// Add stores
	for (const store of company.stores) {
		children.push({
			id: store.id,
			name: store.location,
			icon: <Store />,
		});
	}
	return {
		id: company.id,
		name: company.name,
		icon: <Handshake />,
		children,
	};
}

export default function Multinationals() {
	const [prolog, setProlog] = useState<Prolog | null>(null);
	const [codeLoaded, setCodeLoaded] = useState(false);
	const [companies, setCompanies] = useState<CompanyFact[]>([]);
	const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
	const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
	const [stores, setStores] = useState<StoreData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Start interpreter and load the Prolog code
	useEffect(() => {
		async function initializeProgram(code: string) {
			const pl = await createProlog();
			setProlog(pl);
			setCodeLoaded(false);
			try {
				pl.consultText(code);
				setCodeLoaded(true);
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError(`Failed to load Prolog code: ${err.message}`);
				} else {
					setError("Failed to load Prolog code: Unknown error");
				}
			}
		}
		initializeProgram(PROLOG_PROGRAM);
	}, []);

	useEffect(() => {
		async function loadData(prolog: Prolog) {
			try {
				// Get companies
				const companyResult = await runQuery(
					prolog,
					"company(Id, Name, Currency).",
				);
				if (companyResult.ok) {
					const comps: CompanyFact[] = companyResult.ok.map((b: Bindings) => {
						return {
							id: b.Id.valueOf().toString(),
							name: b.Name.valueOf().toString(),
							currency: b.Currency.valueOf().toString().toUpperCase(),
						};
					});
					setCompanies(comps);
				}

				// Get stores data
				const storeQuery = `
					company(OwnerId, OwnerName, OwnerCurrency),
					has_store(OwnerId, StoreId),
					store(StoreId, StoreLocation),
					accounting_currency(StoreId, Currency),
					top_level_owner(TopId, OwnerId),
					company(TopId, TopName, TopCurrency).
				`;
				const storeResult = await runQuery(prolog, storeQuery);
				if (storeResult.ok) {
					const storeData: StoreData[] = storeResult.ok.map((b: Bindings) => ({
						top: {
							id: b.TopId.valueOf().toString(),
							name: b.TopName.valueOf().toString(),
							currency: b.TopCurrency.valueOf().toString().toUpperCase(),
						},
						owner: {
							id: b.OwnerId.valueOf().toString(),
							name: b.OwnerName.valueOf().toString(),
							currency: b.OwnerCurrency.valueOf().toString().toUpperCase(),
						},
						store: {
							id: b.StoreId.valueOf().toString(),
							location: b.StoreLocation.valueOf().toString(),
						},
						currency: b.Currency.valueOf().toString().toUpperCase(),
					}));
					setStores(storeData);
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("Unknown error in company data query.");
				}
			} finally {
				setLoading(false);
			}
		}
		if (prolog && codeLoaded) {
			loadData(prolog);
		}
	}, [prolog, codeLoaded]);

	useEffect(() => {
		async function loadCompanyDetails(prolog: Prolog, companyId: string) {
			try {
				const query = `company_tree(${companyId}, Tree), company_tree_json(Tree, Json).`;
				const tree = await runQuery(prolog, query);
				if (tree.ok && tree.ok.length === 1) {
					function upperCaseCompanyCurrency(company: Company): Company {
						const currency = company.currency?.toUpperCase();
						const subs = company.subsidiaries.map(upperCaseCompanyCurrency);
						return {
							...company,
							currency,
							subsidiaries: subs,
						};
					}
					const jsonCharArray = tree.ok[0]?.Json as Term[];
					// we cannot use valueOf() here because the term is here in fact an Object, {value: string}
					const jsonStr = jsonCharArray
						.map((o: Term) => o["value"] || "")
						.join("");
					const jsonCompany = JSON.parse(jsonStr);
					const company = upperCaseCompanyCurrency(jsonCompany);
					setCompanyDetails(company);
				} else {
					setError(`Company ${companyId} not found.`);
					setCompanyDetails(null);
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("Unknown error in company details query.");
				}
			}
		}
		if (prolog && codeLoaded && selectedCompany) {
			loadCompanyDetails(prolog, selectedCompany);
		} else {
			setCompanyDetails(null);
		}
	}, [selectedCompany, prolog, codeLoaded]);

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">Multinational</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Companies</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<DataTable
							columns={[
								{
									accessorKey: "name",
									header: "Company Name",
								},
							]}
							data={companies}
							onRowClick={(company) => setSelectedCompany(company.id)}
							selectedId={selectedCompany || undefined}
						/>
						{companyDetails && (
							<Card>
								<CardHeader>
									<CardTitle>{companyDetails.name}</CardTitle>
									<CardDescription>
										<dl>
											<dt>Currency</dt>
											<dd>{companyDetails.currency}</dd>
										</dl>
									</CardDescription>
								</CardHeader>
								<CardContent>
									<CardDescription>
										<dl>
											<dt>Subsidiaries</dt>
											<dd>
												<Tree data={companyToTreeItem(companyDetails)} />
											</dd>
										</dl>
									</CardDescription>
								</CardContent>
							</Card>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>All Stores</CardTitle>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={[
								{
									accessorKey: "top.name",
									header: "Top",
								},
								{
									accessorKey: "owner.name",
									header: "Owner",
								},
								{
									accessorKey: "store.location",
									header: "Store Location",
								},
								{
									accessorKey: "currency",
									header: "Currency",
								},
							]}
							data={stores}
						/>
					</CardContent>
				</Card>
			</div>
			<div className="grid grid-cols-1 mt-4">
				<Card className="bg-muted flex flex-row">
					<CardHeader>
						<CardTitle className="text-sm">Status</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="flex flex-row gap-4 text-sm">
							<dt className="text-muted-foreground">Prolog:</dt>
							<dd>{prolog ? "Initialized" : "Initializing..."}</dd>
							<dt className="text-muted-foreground">Code:</dt>
							<dd>{loading ? "Loading..." : "Loaded"}</dd>
							<dt className="text-muted-foreground">Error:</dt>
							<dd>{error ? error : "-"}</dd>
						</dl>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
