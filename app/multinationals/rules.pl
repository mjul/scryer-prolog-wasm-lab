% -*- Prolog -*- 
:- use_module(library(dcgs)).
:- use_module(library(pairs)).
:- use_module(library(serialization/json)).
:- use_module(library(lists)).
:- use_module(library(debug)).

% --- Data: Companies & Hierarchy ---

% --- Data: Companies ---
% company(CompanyID, Name, Currency).
company(bigco_intl, "BigCo International", eur).
company(bigco_iceland, "BigCo Iceland", isk).
company(bigco_norway, "BigCo Norway", nok).
company(bigco_denmark, "BigCo Denmark", dkk).

% --- Data: Subsidiaries ---
% has_subsidiary(ParentCompanyID, SubsidiaryCompanyID).
has_subsidiary(bigco_intl, bigco_iceland).
has_subsidiary(bigco_intl, bigco_norway).
has_subsidiary(bigco_intl, bigco_denmark).

% --- Data: Stores ---
% store(StoreID, Location).
store(bigco_reykjavik, "Reykjavik, Iceland").
store(bigco_stykkisholmur, "Stykkishólmur, Iceland").
store(bigco_oslo, "Oslo, Norway").
store(bigco_herning, "Herning, Denmark").

% has_store(CompanyID, StoreID).
has_store(bigco_iceland, bigco_reykjavik).
has_store(bigco_iceland, bigco_stykkisholmur).
has_store(bigco_norway, bigco_oslo).
has_store(bigco_denmark, bigco_herning).

% --- Predicate: accounting_currency/2 ---

accounting_currency(CompanyID, Currency) :- 
    company(CompanyID, _Name, Currency).

accounting_currency(StoreID, Currency) :-
    has_store(OwnerID, StoreID),
    accounting_currency(OwnerID, Currency).


% --- Logic: Ownership & Definitions ---

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


% --- JSON Serialization Example ---

% company_tree/2: Builds a tree structure of a company, its subsidiaries, and stores.
% company_tree(CompanyID, Tree).
company_tree(CompanyID, Tree) :-
    company(CompanyID, Name, Currency),
    findall(SubTree, 
            (has_subsidiary(CompanyID, SubsidiaryID),
            company_tree(SubsidiaryID, SubTree)), 
            SubTrees),
    findall(Store, (has_store(CompanyID, StoreID), store(StoreID, StoreLocation), Store = [StoreID, StoreLocation]), Stores),
    Tree = [CompanyID, Name, Currency, SubTrees, Stores].

% store_pairs/2: Serializes a store to KV-pairs ready for JSON serialization.
store_pairs([StoreID, Location], Pairs) :- 
    atom_chars(StoreID, StoreIDChars),
    Pairs = pairs([
        string("id")-string(StoreIDChars),
        string("location")-string(Location)
    ]).

% company_tree_pairs/2: Serializes a company tree to KV-pairs ready for JSON serialization.
company_tree_pairs([CompanyID, Name, Currency, Subsidiaries, Stores], Pairs) :- 
    atom_chars(CompanyID, CompanyIDChars),
    atom_chars(Currency, CurrencyChars),
    findall(SubPairs, 
            (member(SubTree, Subsidiaries), company_tree_pairs(SubTree, SubPairs)),
            SubsidiariesPairs),
    findall(StorePairs, 
            (member(Store, Stores), store_pairs(Store, StorePairs)),
            StoresPairs),
    Pairs=pairs([
        string("id")-string(CompanyIDChars),
        string("name")-string(Name),
        string("currency")-string(CurrencyChars),
        string("subsidiaries")-list(SubsidiariesPairs),
        string("stores")-list(StoresPairs)
    ]).

% company_tree_json/2: Serializes a company tree to JSON format.
company_tree_json(Tree, Json) :- 
    Tree = [CompanyID, Name, Currency, _ , _ ],
    company(CompanyID, Name, Currency),
    company_tree_pairs(Tree, Pairs),
    phrase(json_chars(Pairs), Json).


% --- Example Queries ---
% FIRST
% docker run -v .:/mnt -it mjt128/scryer-prolog
%
% consult('/mnt/app/multinationals/rules.pl').
%
% ?- accounting_currency(bigco_reykjavik, Currency).
% phrase(json_chars(pairs([string("id")-string("foo")])), Cs).
% company_tree(bigco_iceland, Tree).
% company_tree(bigco_intl, Tree).
% company_tree(bigco_denmark, Tree), company_tree_pairs(Tree, Pairs).
% company_tree(bigco_denmark, Tree), company_tree_pairs(Tree, Pairs), phrase(json_chars(Pairs), Json). 
% company_tree(bigco_intl, Tree), company_tree_json(Tree, Json).
