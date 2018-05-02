# Change Log
All notable changes to the [XIBLE project](https://xible.io) will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
### Added
-   Nodes can now host their own routes through the API of XIBLE. ([#71](https://github.com/SpectrumBroad/xible/issues/71))

### Changed
-   Hexadecimal colors are now allowed in typedefs.

### Fixed
-   `cast` node is working again now the output type is properly reset when all connectors detach.

## [0.11.1][] - 2018-04-28
### Added
-   TypeDef API route test cases.

### Fixed
-   The `store` node is working again now the input and output types are set properly.

-   When the Flow initialization level is set to 1 (Flow), the pre initialized instance is now spawned correctly when saving/updating flows.

-   Typedefs are properly checked on existance when multiple nodepack paths are initialized.

-   Deleted flows no longer re-appear in the editor after the connection to the XIBLE server reconnects.

## [0.11.0][] - 2018-04-23
### Added
-   Added several shortcuts for `xiblepm user *` command line commands. ([#67](https://github.com/SpectrumBroad/xible/issues/67))

-   Alternative panning support without a scroll wheel by holding down `shift` and the left mouse button. ([#59](https://github.com/SpectrumBroad/xible/issues/59))

-   Use `ctrl` to combine multiple area selectors in the editor. ([#69](https://github.com/SpectrumBroad/xible/issues/69))

### Changed
-   Improved `xiblepm user add` registration process. ([#65](https://github.com/SpectrumBroad/xible/issues/65))

### Fixed
-   Individual password characters are no longer briefly visible on the windows command line. ([#66](https://github.com/SpectrumBroad/xible/issues/66))

-   Fixed potential XSS attack concerning flows downloaded from the registry where the nodes were not installed on the target machine.

-   `input.duplicate` node with amount of duplicates set to '1' would throw 'already called back'. ([#68](https://github.com/SpectrumBroad/xible/issues/68))

-    Installing nodepacks from the registry through the editor works again. ([#70](https://github.com/SpectrumBroad/xible/issues/70))

## [0.10.0][] - 2018-04-08
### Added
-   Added the `xible.flow.param` node including applicable command line and REST API options. These allow parameters to be send when starting a flow. ([#45](https://github.com/SpectrumBroad/xible/issues/45))

-   A flow can now be instantiated multiple times. ([#46](https://github.com/SpectrumBroad/xible/issues/46))

-   Added `input.*` nodes to modify return values. ([#48](https://github.com/SpectrumBroad/xible/issues/48))

-   Implemented `xible service restart` command to restart the xible service if it was installed. ([#51](https://github.com/SpectrumBroad/xible/issues/51))

-   Connection status messages are now visible on every view. ([#52](https://github.com/SpectrumBroad/xible/issues/52))

### Changed
-   `xible.flow.start` raises an error if a flow does not exist.

-   `xible.flow.start` contains an output for the instance it created when starting a flow.

-   If the extends keyword for a typedef is not set, it defaults to `object`.

-   NodeOutputs that do not have a type set, will no longer be triggered to ensure only values within the extends chain of the calling NodeInput are returned. ([#49](https://github.com/SpectrumBroad/xible/issues/49))

### Fixed
-   Configuring SSL now redirects plain HTTP requests to the configured SSL port, instead of `plain HTTP port + 1`.

-   The node help page now properly shows the original (structure) type of the node inputs and outputs, instead of the active type.

## 0.9.4 - 2018-04-03
### Fixed
-   The editor is working again properly after including the shrinkwrap which points to the right xible-wrapper version. ([#61](https://github.com/SpectrumBroad/xible/issues/61))

## [0.9.1][] - 2017-12-20
### Fixed
-   `xible service install` is working again. ([#43](https://github.com/SpectrumBroad/xible/issues/43))

-   `npm start` from the XIBLE directory is working again.

-   Navigating the settings page properly uses async requests again instead of reloading the entire page.

## [0.9.0][] - 2017-11-01
### Added
-   Within the editor, optional input fields are now hidden unless the containing node is either hovered or selected. ([#36](https://github.com/SpectrumBroad/xible/issues/36))

-   The `xible` command line interface now supports the 'node' context for getting and setting data values on nodes. ([#34](https://github.com/SpectrumBroad/xible/issues/34))

-   Add a 'state' output to the `xible.flow` node. This returns the running state of a flow, a number between 0 and 5, inclusive.

-   Implemented `xiblepm nodepack remove` for removing nodepacks. ([#24](https://github.com/SpectrumBroad/xible/issues/24))

-   Implemented `xiblepm nodepack upgrade` for upgrading nodepacks. ([#41](https://github.com/SpectrumBroad/xible/issues/41))

### Changed
-   Instances of Node only receive a trigger event when they are an event node at the start of a flow. Previously, this event would also be emitted whenever an input trigger was hit.

### Removed
-   `document.*` nodes are removed, after they were deprecated in favor of `object.*`.

-   `xiblepm flow remove` is removed after it was deprecated in version 0.7.0. It was replaced by `xible flow delete`.

### Fixed
-   Long uninterrupted strings in node descriptions would overflow the node selector.

-   Performance of node selector has been greatly improved, especially when there are many nodes installed.

## [0.8.0][] - 2017-09-10
### Added
-   [Introduction](https://discuss.xible.io/t/on-the-introduction-of-typedefs/52) of [type definitions](https://xible.io/docs/guides/nodes/typedefs) for inputs and outputs. This allows types to extend other types and provide custom colors for those types. ([#17](https://github.com/SpectrumBroad/xible/issues/17))

-   Added `object.*` nodes to replace the `document.*` nodes.

### Changed
-   `document.*` nodes are now deprecated in favor `object.*`.

-   Registry actions such as `xiblepm nodepack install` use the proper OS dependent 'tmp' directory. ([#33](https://github.com/SpectrumBroad/xible/issues/33))

### Removed
-   `log.console` node is now removed, after it was deprecated in favor of `console.log`. ([#27](https://github.com/SpectrumBroad/xible/issues/27))

## [0.7.0][] - 2017-08-20
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

[Unreleased]: https://github.com/SpectrumBroad/xible/compare/v0.11.1...HEAD
[0.11.1]: https://github.com/SpectrumBroad/xible/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/SpectrumBroad/xible/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/SpectrumBroad/xible/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/SpectrumBroad/xible/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/SpectrumBroad/xible/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/SpectrumBroad/xible/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/SpectrumBroad/xible/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/SpectrumBroad/xible/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/SpectrumBroad/xible/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/SpectrumBroad/xible/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/SpectrumBroad/xible/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/SpectrumBroad/xible/compare/v0.3.0...v0.3.1
