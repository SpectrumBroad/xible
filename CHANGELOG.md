# Change Log
All notable changes to the XIBLE project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
Nothing notable at the moment.

## [0.5.0][] - 2017-06-03
### Added
-   All of the command line `xiblepm flow` context functions now work. This means that you can install flows from the registry, and publish flows to the registry. See [the xiblepm documentation](https://xible.io/docs/commandlinetools/xiblepm.htm#xiblepm) for more information.

### Fixed
-   Setting an output to global in the editor correctly updates the corresponding inputs within a newly created flow. ([#15](https://github.com/SpectrumBroad/xible/issues/15))

## [0.4.1][] - 2017-05-14
### Fixed
-   Installing nodepacks through the editor or via `xiblepm nodepack install` now works on Windows. ([#14](https://github.com/SpectrumBroad/xible/issues/14))

## [0.4.0][] - 2017-04-30
### Added
-   Flows can be initialized at different levels, allowing for a faster on-demand start. See `Settings/Flows` in your XIBLE installation for more details.

-   The editor contains a link to [the XIBLE docs](https://xible.io/docs).

-   Command-line `xible service` options to run XIBLE through systemctl/systemd.

-   [LICENSE.md](LICENSE.md) file.

### Changed
-   eslint/airbnb is now the default code style. For the time being, `editor/` is ignored from the linter.

-   The runnable state of a flow is better synchronized with the editor. If a flow is not runnable, the deploy and start buttons are unavailable. Intermediate state changes reflect directly in the editor.

-   The status of a flow is now contained in a single `state` parameter, instead of relying on indivual parameters for `starting`, `started`, `stopped`, etc.

### Fixed
-   `xiblepm nodepack install` returns the correct exit code if nodepack.install() fails.

## [0.3.1][] - 2017-04-19
### Fixed
-   Config module failed to create new config.json upon fresh installation.

[Unreleased]: https://github.com/SpectrumBroad/xible/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/SpectrumBroad/xible/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/SpectrumBroad/xible/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/SpectrumBroad/xible/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/SpectrumBroad/xible/compare/v0.3.0...v0.3.1
