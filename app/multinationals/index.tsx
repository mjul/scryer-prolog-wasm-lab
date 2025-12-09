import { useEffect, useState } from "react";
import type { Bindings, Prolog } from "scryer";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { createProlog, runQuery } from "~/lib/run-prolog";
// This is not TypeScript-native import, but using ?raw to import the Prolog code as a string
import PROLOG_PROGRAM from "./rules.pl?raw";

interface StoreData {
	Top: string;
	Owner: string;
	Store: string;
	Currency: string;
}

interface Company {
	name: string;
	currency?: string;
	subsidiaries: Company[];
	stores: string[];
}

async function getSubsidiaries(
	prolog: Prolog,
	company: string,
): Promise<Company[]> {
	const subResult = await runQuery(prolog, `has_subsidiary(${company}, S).`);
	if (!subResult.ok) return [];

	const subs: Company[] = [];
	for (const binding of subResult.ok) {
		const subName = binding.S.valueOf().toString();
		const subSubs = await getSubsidiaries(prolog, subName);
		const subStores = await getStores(prolog, subName);
		const subCurrencyResult = await runQuery(
			prolog,
			`accounting_currency(${subName}, C).`,
		);
		const subCurrency = subCurrencyResult.ok
			? subCurrencyResult.ok[0]?.C.valueOf().toString()
			: undefined;
		subs.push({
			name: subName,
			currency: subCurrency,
			subsidiaries: subSubs,
			stores: subStores,
		});
	}
	return subs;
}

async function getStores(prolog: Prolog, company: string): Promise<string[]> {
	const storeResult = await runQuery(prolog, `has_store(${company}, S).`);
	if (!storeResult.ok) return [];
	return storeResult.ok.map((b: Bindings) => b.S.valueOf().toString());
}

export default function Multinationals() {
	const [prolog, setProlog] = useState<Prolog | null>(null);
	const [codeLoaded, setCodeLoaded] = useState(false);
	const [companies, setCompanies] = useState<string[]>([]);
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
				const companyResult = await runQuery(prolog, "company(C).");
				if (companyResult.ok) {
					const comps = companyResult.ok.map((b: Bindings) =>
						b.C.valueOf().toString(),
					);
					setCompanies(comps);
				}

				// Get stores data
				const storeQuery = `
					store(Store),
					has_store(Owner, Store),
					accounting_currency(Store, Currency),
					top_level_owner(Top, Owner).
				`;
				const storeResult = await runQuery(prolog, storeQuery);
				if (storeResult.ok) {
					const storeData: StoreData[] = storeResult.ok.map((b: Bindings) => ({
						Top: b.Top.valueOf().toString(),
						Owner: b.Owner.valueOf().toString(),
						Store: b.Store.valueOf().toString(),
						Currency: b.Currency.valueOf().toString().toUpperCase(),
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
		async function loadCompanyDetails(prolog: Prolog, company: string) {
			try {
				// Get currency
				const currencyResult = await runQuery(
					prolog,
					`accounting_currency(${company}, C).`,
				);
				const currency = currencyResult.ok
					? currencyResult.ok[0]?.C.valueOf().toString()
					: undefined;

				// Get subsidiaries recursively
				const subsidiaries = await getSubsidiaries(prolog, company);
				const stores = await getStores(prolog, company);

				setCompanyDetails({
					name: company,
					currency,
					subsidiaries,
					stores,
				});
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

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">Multinational</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Companies</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{companies.map((company) => (
								<Button
									key={company}
									variant={selectedCompany === company ? "default" : "outline"}
									onClick={() => setSelectedCompany(company)}
									className="w-full justify-start"
								>
									{company}
								</Button>
							))}
						</div>
						{companyDetails && (
							<div className="mt-4">
								<h3 className="font-semibold">{companyDetails.name}</h3>
								{companyDetails.currency && (
									<p>Currency: {companyDetails.currency}</p>
								)}
								<CompanyTree company={companyDetails} />
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>All Stores</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Top</TableHead>
									<TableHead>Owner</TableHead>
									<TableHead>Store</TableHead>
									<TableHead>Currency</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{stores.map((store, index) => (
									<TableRow key={index}>
										<TableCell>{store.Top}</TableCell>
										<TableCell>{store.Owner}</TableCell>
										<TableCell>{store.Store}</TableCell>
										<TableCell>{store.Currency}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function CompanyTree({ company }: { company: Company }) {
	return (
		<div className="ml-4">
			<div className="font-medium">{company.name}</div>
			{company.currency && (
				<div className="text-sm text-gray-600">
					Currency: {company.currency}
				</div>
			)}
			{company.subsidiaries.length > 0 && (
				<div>
					{company.subsidiaries.map((sub) => (
						<CompanyTree key={sub.name} company={sub} />
					))}
				</div>
			)}
			{company.stores.length > 0 && (
				<div className="ml-4">
					{company.stores.map((store) => (
						<div key={store} className="text-sm">
							🏪 {store}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
