# Set up Scryer Prolog

We want this application to run Scryer Prolog from the npm package `scryer` in the web application.

Please install it using `pnpm`.

Please also install `vitest` if it is not installed.

Then, add app/lib/run-prolog.ts that takes a string with a Prolog program as input and a query, calls the 
Scryer Prolog in WASM and evaluates that program, then runs the query and returns a structure with an "ok" key with the result on success or an "error" key with an error message on failure. Return an error if the program or query does not compile.

# Add tests
Please add a app/lib/run-prolog.test.ts with a few test cases 
- tests the above with an invalid Prolog program (expecting an error).
- test the above with program `[user]. foo(a).` and a query `?- foo(A).`, expecting `A = a`.

