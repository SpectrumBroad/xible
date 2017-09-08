# Change Log
All notable changes to the [XIBLE project](https://xible.io) will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
Nothing notable at the moment.
### Added
-   Introduction of [type definitions](https://xible.io/docs/guides/nodes/typedefs) for inputs and outputs. This allows types to extend other types and provide custom colors for those types. ([#17](https://github.com/SpectrumBroad/xible/issues/17))

-   Added `object.*` nodes to replace the `document.*` nodes.

### Changed
-   `document.*` nodes are now deprecated in favor `object.*`.

-   `log.console` now contains a deprecation notice. It was already deprecated in 0.7.0. ([#27](https://github.com/SpectrumBroad/xible/issues/27))

-   Registry actions such as `xiblepm nodepack install` use the proper OS dependent "tmp" directory. ([#33](https://github.com/SpectrumBroad/xible/issues/33))

## [0.7.0][]
### Added
-   Flows can be [started](https://xible.io/docs/commandlinetools/xible#flow.start)/[stopped](https://xible.io/docs/commandlinetools/xible#flow.stop) and [deleted](https://xible.io/docs/commandlinetools/xible#flow.delete) using the cli. See the [xible cli documentation](https://xible.io/docs/commandlinetools/xible) for more information. ([#18](https://github.com/SpectrumBroad/xible/issues/18))

-   The `xible` command line interface supports the 'config' context just like `xiblepm`. ([#22](https://github.com/SpectrumBroad/xible/issues/22))

-   `console.log`, `console.error` and `console.clear` nodes are now included in XIBLE. `log.console` is deprecated and will be removed in a future release. ([#27](https://github.com/SpectrumBroad/xible/issues/27))

### Changed
-   `xiblepm flow remove` is deprecated in favor of `xible flow delete`.

-   The [command line interface tools](https://xible.io/docs/commandlinetools) `xible` & `xiblepm` are now stored in `./bin`.

-   The `document.assign` node only callbacks once when multiple documents are hooked up to the 'document' input.

-   Callbacks from nodes in response to `output.on('trigger')` resulting from a `input.getValues()` call can now only be called back once. An error is thrown if called multiple times.

-   [Direct mode](https://xible.io/docs/editor#direct) can now be enabled/disabled through the settings. It is disabled by default. ([#26](https://github.com/SpectrumBroad/xible/issues/26))

### Fixed
-   Resizing the editor to only narrowly fit the cpu/mem/delay charts no longer toggles the scrollbar in- and out of view. ([#11](https://github.com/SpectrumBroad/xible/issues/11))

-   Publishing flows to the registry no longer includes the vault data ([#25](https://github.com/SpectrumBroad/xible/issues/25))

## [0.6.0][] - 2017-06-09
### Added
-   Node inputs now have a string value `assignsOutputType` that allows the given output to be assigned the same type as the input. See the [node structure documentation](https://www.xible.io/docs/guides/nodes/structure.htm#structure.json) for more information.

-   The default zoomstate of a flow in the editor can be changed through the settings. The value is stored in the configuration file as `editor.viewstate.zoomstateonopen`.

-   The maximum amount of statuses visible on any node in the editor can be changed through the settings. The value is stored in the configuration file as `editor.nodes.statuses.max`. ([#13](https://github.com/SpectrumBroad/xible/issues/13))

-   A flow saves some performance metrics in the timing object. This object is only available on flows in the main thread.

### Changed
-   xible-wrapper is now fetched from [npm](http://npmjs.com/package/xible-wrapper). It used to be distributed within the xible package itself.

-   All xiblepm commands deliver the user-auth-token header to the registry, if the user is logged in. Previously, the user token was only sent for publish commands.

## [0.5.0][] - 2017-06-03
### Added
-   All of the command line `xiblepm flow` context functions now work. This means that you can install flows from the registry, and publish flows to the registry. See the [xiblepm documentation](https://xible.io/docs/commandlinetools/xiblepm.htm#xiblepm) for more information.

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

[Unreleased]: https://github.com/SpectrumBroad/xible/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/SpectrumBroad/xible/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/SpectrumBroad/xible/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/SpectrumBroad/xible/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/SpectrumBroad/xible/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/SpectrumBroad/xible/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/SpectrumBroad/xible/compare/v0.3.0...v0.3.1
