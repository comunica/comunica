Want to contribute? That's great!

[Find our here how you can contribute](https://comunica.dev/contribute/).

## Development tips and tricks

* Only do `yarn install` in the repo root, and *never* in one of the sub-packages, as this can break your repo.
* `yarn run build` will (re)build all TypeScript to JavaScript. This can also be executed on package-level.
* `yarn run build-watch` will continuously build the TypeScript to JavaScript. This is useful during development.
* `yarn test` and `yarn run lint` execute the tests and linter checks locally. Before a PR is opened, these must always pass, and testing coverage must be 100%.
* When editing configuration files in packages like `actor-init-sparql`, `yarn run prepare` can be executed to compile the JSON files to JavaScript before they can be executed. (not needed when executing dynamically)
* When modifying a dependency package such as [sparqlee](https://github.com/comunica/sparqlee), [Yarn's link functionality](https://classic.yarnpkg.com/en/docs/cli/link/) can be used to force your local version of that dependency to be used in Comunica.

## Branching Strategy
The `master` branch is the main development branch.

Releases are `tags` on the `master` branch.

All changes (features and bugfixes) must be done in a separate branch, and PR'd to `master`.

Recursive features must be PR'd to their parent feature branches, as a feature can consist of multiple smaller features.

The naming strategy of branches is as follows:
* Features: `feature/short-name-of-feature`
* Bugfixes: `fix/short-name-of-fix`

## Issue Strategy

Issues must be assigned to people, and must be progressed using the [GitHub project board](https://github.com/rubensworks/comunica-core/projects/1).

Issues progress as follows:
1. To Do: When the issue is accepted and assigned, but not in progress yet.
2. In Progress: When the issue is being worked on by the assignee.
3. To Review: When the issue is resolved, but must be reviewed. This can be attached to a PR.
4. Done: When the issue is resolved and reviewed. If attached to a PR, this can be merged, or closed otherwise.

## Pull Requests
In order to improve code and quality, all features and bugfixes must go through a Pull Request before they can be merged with the `master` branch.

### Checklist for PRs

* Clean code (lint checks)
* Documented code
* (Passing) unit tests with a full coverage

## Commit style

We use the [git guidelines](https://git.kernel.org/pub/scm/git/git.git/tree/Documentation/SubmittingPatches?id=HEAD) for commit messages.
> Describe your changes in imperative mood, e.g. "make xyzzy do frotz" instead of "[This patch] makes xyzzy do frotz" or "[I] changed xyzzy to do frotz", as if you are giving orders to the codebase to change its behavior.

No dots are required after the first line of a commit message, and of course, no emojis if not needed.

## Code style

As any self-respecting developer can adhere to, your code should always be clean, well tested and well documented.
In this project, we use linting tools that check code style and are available as pre-commit hooks.
