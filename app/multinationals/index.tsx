import { Handshake, Store } from "lucide-react";
import { useEffect, useState } from "react";
import type { Bindings, Prolog } from "scryer";
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

/** Corresponds to the fact company(CompanyID, Name). */
interface CompanyFact {
	id: string;
	name: string;
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

async function getSubsidiaries(
	prolog: Prolog,
	companyId: string,
): Promise<Company[]> {
	const subResult = await runQuery(
		prolog,
		`has_subsidiary(${companyId}, SubsidiaryId), company(SubsidiaryId, SubsidiaryName).`,
	);
	if (!subResult.ok) return [];

	const subs: Company[] = [];
	for (const binding of subResult.ok) {
		const subId = binding.SubsidiaryId.valueOf().toString();
		const subName = binding.SubsidiaryName.valueOf().toString();
		const subSubs = await getSubsidiaries(prolog, subId);
		const subStores: StoreFact[] = await getStores(prolog, subId);
		const subCurrencyResult = await runQuery(
			prolog,
			`accounting_currency(${subId}, Ccy).`,
		);
		const subCurrency = subCurrencyResult.ok
			? subCurrencyResult.ok[0]?.Ccy.valueOf().toString()
			: undefined;
		subs.push({
			id: subId,
			name: subName,
			currency: subCurrency,
			subsidiaries: subSubs,
			stores: subStores,
		});
	}
	return subs;
}

async function getStores(
	prolog: Prolog,
	companyId: string,
): Promise<StoreFact[]> {
	const storeResult = await runQuery(
		prolog,
		`has_store(${companyId}, StoreId), store(StoreId, Location).`,
	);
	if (!storeResult.ok) return [];
	return storeResult.ok.map((b: Bindings) => ({
		id: b.StoreId.valueOf().toString(),
		location: b.Location.valueOf().toString(),
	}));
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
				const companyResult = await runQuery(prolog, "company(Id, Name).");
				if (companyResult.ok) {
					const comps: CompanyFact[] = companyResult.ok.map((b: Bindings) => {
						return {
							id: b.Id.valueOf().toString(),
							name: b.Name.valueOf().toString(),
						};
					});
					setCompanies(comps);
				}

				// Get stores data
				const storeQuery = `
					company(OwnerId, OwnerName),
					has_store(OwnerId, StoreId),
					store(StoreId, StoreLocation),
					accounting_currency(StoreId, Currency),
					top_level_owner(TopId, OwnerId),
					company(TopId, TopName).
				`;
				const storeResult = await runQuery(prolog, storeQuery);
				if (storeResult.ok) {
					const storeData: StoreData[] = storeResult.ok.map((b: Bindings) => ({
						top: {
							id: b.TopId.valueOf().toString(),
							name: b.TopName.valueOf().toString(),
						},
						owner: {
							id: b.OwnerId.valueOf().toString(),
							name: b.OwnerName.valueOf().toString(),
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
				// Get currency
				const result = await runQuery(
					prolog,
					`company(${companyId}, Name), (accounting_currency(${companyId}, Currency) -> Ccy = Currency ; Ccy = undefined).`,
				);
				if (result.ok && result.ok.length === 1) {
					// Currency is not available for all companies
					const ccyResult = result.ok[0]?.Ccy.valueOf().toString();
					const currency = ccyResult === "undefined" ? null : ccyResult;
					const name = result.ok[0]?.Name.valueOf().toString();

					// Get subsidiaries recursively
					const subsidiaries = await getSubsidiaries(prolog, companyId);
					const stores = await getStores(prolog, companyId);

					setCompanyDetails({
						id: companyId,
						name,
						currency: currency?.toUpperCase() || "-",
						subsidiaries,
						stores,
					});
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
