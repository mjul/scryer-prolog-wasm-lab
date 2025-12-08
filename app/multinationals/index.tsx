import { useEffect, useState } from "react";
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
import { runProlog } from "~/lib/run-prolog";

const PROLOG_PROGRAM = `% --- Data: Companies & Hierarchy ---
company(bigco_intl).
company(bigco_iceland).
company(bigco_norway).
company(bigco_denmark).

% --- Data: Subsidiaries ---
has_subsidiary(bigco_intl, bigco_iceland).
has_subsidiary(bigco_intl, bigco_norway).
has_subsidiary(bigco_intl, bigco_denmark).

% --- Data: Stores ---
has_store(bigco_iceland, bigco_reykjavik).
has_store(bigco_iceland, bigco_stykkisholmur).
has_store(bigco_norway, bigco_oslo).
has_store(bigco_denmark, bigco_herning).

% --- Predicate: accounting_currency/2 ---
% Idiomatic: Place specific facts (base cases) before recursive rules.
% This allows Prolog to find the known answers immediately before trying to infer others.

accounting_currency(bigco_iceland, isk).
accounting_currency(bigco_norway, nok).
accounting_currency(bigco_denmark, dkk).

% Recursive Rule: If not defined above, inherit from owner.
accounting_currency(Store, Currency) :-
    has_store(Owner, Store),
    accounting_currency(Owner, Currency).


% --- Logic: Ownership & Definitions ---

% Store definition
store(S) :- 
    has_store(Company, S), 
    company(Company).

% Transitive ownership
% 1. Direct
owns(Parent, Child) :- 
    has_subsidiary(Parent, Child).
% 2. Indirect (Recursive)
owns(Parent, Child) :- 
    has_subsidiary(Parent, Intermediate), 
    owns(Intermediate, Child).

% Helper: Reflexive ownership (useful for finding the top root)
owns_or_self(X, X).
owns_or_self(Parent, Child) :- 
    owns(Parent, Child).

% Top Level Owner: An entity that owns the target (or is the target) 
% and has no parent itself.
top_level_owner(Top, Entity) :-
    owns_or_self(Top, Entity),
    \\+ has_subsidiary(_, Top).
`;

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

export default function Multinationals() {
	const [companies, setCompanies] = useState<string[]>([]);
	const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
	const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
	const [stores, setStores] = useState<StoreData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadData() {
			try {
				const program = PROLOG_PROGRAM;

				// Get companies
				const companyResult = await runProlog(program, "company(C).");
				if (companyResult.ok) {
					const comps = companyResult.ok.map((b: any) => b.C.value);
					setCompanies(comps);
				}

				// Get stores data
				const storeQuery = `
					store(Store),
					has_store(Owner, Store),
					accounting_currency(Store, Currency),
					top_level_owner(Top, Owner).
				`;
				const storeResult = await runProlog(program, storeQuery);
				if (storeResult.ok) {
					const storeData: StoreData[] = storeResult.ok.map((b: any) => ({
						Top: b.Top.value,
						Owner: b.Owner.value,
						Store: b.Store.value,
						Currency: b.Currency.value,
					}));
					setStores(storeData);
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, []);

	useEffect(() => {
		if (!selectedCompany) {
			setCompanyDetails(null);
			return;
		}

		const company = selectedCompany;

		async function loadCompanyDetails() {
			try {
				const program = PROLOG_PROGRAM;

				// Get currency
				const currencyResult = await runProlog(
					program,
					`accounting_currency(${company}, C).`,
				);
				const currency = currencyResult.ok
					? currencyResult.ok[0]?.C.value
					: undefined;

				// Get subsidiaries recursively
				const subsidiaries = await getSubsidiaries(program, company);
				const stores = await getStores(program, company);

				setCompanyDetails({
					name: company,
					currency,
					subsidiaries,
					stores,
				});
			} catch (err: any) {
				console.error(err);
			}
		}

		loadCompanyDetails();
	}, [selectedCompany]);

	async function getSubsidiaries(
		program: string,
		company: string,
	): Promise<Company[]> {
		const subResult = await runProlog(
			program,
			`has_subsidiary(${company}, S).`,
		);
		if (!subResult.ok) return [];

		const subs: Company[] = [];
		for (const binding of subResult.ok) {
			const subName = binding.S.value;
			const subSubs = await getSubsidiaries(program, subName);
			const subStores = await getStores(program, subName);
			const subCurrencyResult = await runProlog(
				program,
				`accounting_currency(${subName}, C).`,
			);
			const subCurrency = subCurrencyResult.ok
				? subCurrencyResult.ok[0]?.C.value
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

	async function getStores(
		program: string,
		company: string,
	): Promise<string[]> {
		const storeResult = await runProlog(program, `has_store(${company}, S).`);
		if (!storeResult.ok) return [];
		return storeResult.ok.map((b: any) => b.S.value);
	}

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
