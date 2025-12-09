% --- Data: Companies & Hierarchy ---

% --- Data: Companies ---
% company(CompanyID, Name).
company(bigco_intl, 'BigCo International').
company(bigco_iceland, 'BigCo Iceland').
company(bigco_norway, 'BigCo Norway').
company(bigco_denmark, 'BigCo Denmark').

% --- Data: Subsidiaries ---
% has_subsidiary(ParentCompanyID, SubsidiaryCompanyID).
has_subsidiary(bigco_intl, bigco_iceland).
has_subsidiary(bigco_intl, bigco_norway).
has_subsidiary(bigco_intl, bigco_denmark).

% --- Data: Stores ---
% has_store(CompanyID, StoreID).
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
    has_store(CompanyID, S), 
    company(CompanyID, _).

% Transitive ownership
% owns(ParentCompanyID, ChildCompanyID).
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
    \+ has_subsidiary(_, Top).