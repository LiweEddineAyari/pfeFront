# Frontapp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## ETL quality CSV downloads

In the ETL pipeline result screen (step 3), quality metric cards include a download icon button for supported metrics.
Clicking the icon calls a list API and downloads the returned rows as a CSV file.

Implemented endpoint mappings:

TIERS:
- `/quality/tiers/null-check/list`
- `/quality/tiers/duplicate/list`
- `/quality/tiers/type-check/list`

CONTRAT:
- `/quality/contrat/null-check/list`
- `/quality/contrat/duplicate/list`
- `/quality/contrat/type-check/list`

COMPTA:
- `/quality/compta/null-check/list`
- `/quality/compta/duplicate/list`
- `/quality/compta/type-check/list`
- `/quality/compta/contrat-relation-check/list`
- `/quality/compta/tiers-relation-check/list`

Notes:
- Frontend requests are sent through the ETL API base path (`/api/etl`), for example `/api/etl/quality/tiers/null-check/list`.
- Downloaded file name format is `<table>-<metric>-<YYYY-MM-DD>.csv`.
- If no rows are returned, an empty CSV payload is still downloaded with a `message` line.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
