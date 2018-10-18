# Change Log
All notable changes to the [XIBLE project](https://xible.io) will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
### Added
-   The `timing` object for flow instances now also contains the `createDate`, `initDate` and `startDate` properties. These contain a Date.now() property for their respective dates. This allows you to track exactly when a flow instance was started.

-   On the 'flows' view, you can now select a flow to view the details of that flow. This includes state, parameters, resource graphs and more.

-   Use `xiblepm nodepack init` to create a default node structure. This is useful for starting the development of a new node within a nodepack. ([#81](https://github.com/SpectrumBroad/xible/issues/81))

-   Unsupported browsers can now find exactly which features the browser is missing in a 'details' window.

### Changed
-   Improved error handling. Throwing an error can now be intercepted by dedicated xible nodes (formerly `xible.node.onerror`). Using `node.error(err, state)` instead of simply throwing remains a valid use as it provides more details as to where the error originated. The `xible.node.error` and `xible.node.onerror` nodes have been renamed to `xible.flow.instance.error` and `xible.flow.instance.on-error` respectively. ([#80](https://github.com/SpectrumBroad/xible/issues/80))

-   Errors thrown within a flow instance now show up in the editor. ([#12](https://github.com/SpectrumBroad/xible/issues/12))

### Fixed
-   When publishing a nodepack (which already exists), the package.json `name` attribute is now stripped of preceeding 'xible-np-' or 'xible-nodepack-' strings before matching it against the registry to see if the publisher is the same. Prior to this, the registry would return a http 403 which would show up as 'Unsuccessful statuscode returned' in the cli.

-   When initially navigating to the flows overview and after that head over to the editor, the flows would show up empty. This is now fixed. ([#77](https://github.com/SpectrumBroad/xible/issues/77))

## [0.14.0][] - 2018-07-29
### Added
-   It is now possible to specify the input string directly for the `string.split` node.

-   Hovering a global input or output on a node in the editor, now visualizes the connections as if they were directly connected. ([#39](https://github.com/SpectrumBroad/xible/issues/39))

-   Added the `object.include-keys` and `object.exclude-keys` nodes. These can be used to strip unwanted keys from objects.

-   Added the `input.filter-duplicates`, `input.length`, `input.for-each` and `input.map` nodes.

-   Added the `compare.truthy` and `compare.falsy` nodes to verify how objects evaluate in a boolean context.

-   The `string.template` node now supports passing object keys as variables for string expansion.

-   Added the `input.object.filter-duplicates` and `input.object.group` nodes. These allow duplication filtering and grouping based on an object key.

-   Added the `string.join` node, which allows you to join multiple strings together. A separator can be introduced between the strings.

-   Support for `script type="module"` in node editor contents. Note that these script elements are untouched when they are processed by the browser. Script elements that do not contain the `type="module"` directive will be evaluated like ever before, with the document argument attached to the shadow root and `this` referring to the node itself.

### Changed
-   XIBLE now throws an error if it is already running according to the PID file. Similarly, CLI commands which require that XIBLE is running will throw an error if that is not the case.

-   The `input.group` node has been replaced by the `input.concat` node.

### Fixed
-   When viewing a node in help/describe mode, it now properly zooms/scales in Firefox. ([#82](https://github.com/SpectrumBroad/xible/issues/82))

## [0.13.0][] - 2018-06-05
### Added
-   The commandline `xiblepm nodepack upgrade` can now be used to upgrade all installed nodepacks in one go. ([#42](https://github.com/SpectrumBroad/xible/issues/42))

-   The commandline `xiblepm nodepack update` has been introduced as an alias for `xiblepm nodepack upgrade`.

-   All `xiblepm` commands that interact with the registry now support the optional `--registry` parameter.
You can use this to deviate from the default registry stored in your config file.

-   Implemented commandline `xible server stop` to stop a running XIBLE server. ([#76](https://github.com/SpectrumBroad/xible/issues/76))

-   Support for textareas in node editor contents. ([#75](https://github.com/SpectrumBroad/xible/issues/75))

-   Added several string nodes such as `string.replace`. ([#74](https://github.com/SpectrumBroad/xible/issues/74))

-   The editor now keeps track of all messages shared by nodes. To save space in the editor, the resource graphs and this new log functionality share the same area and can be toggled. ([#63](https://github.com/SpectrumBroad/xible/issues/63))

### Changed
-   Flow instances that exited on their own, no longer auto start when XIBLE restarts.

## [0.12.0][] - 2018-05-13
### Added
-   Nodes can now host their own routes through the API of XIBLE. Have a look at the new [routes documentation](https://xible.io/docs/guides/nodes/routes) on how to use them. ([#71](https://github.com/SpectrumBroad/xible/issues/71))

-   Starting a flow through the editor which uses `xible.flow.param` nodes will now request for the values of those parameters. ([#57](https://github.com/SpectrumBroad/xible/issues/57))

-   NodeOutput triggered functions can now return promises instead of relying on the callback parameter. ([#73](https://github.com/SpectrumBroad/xible/issues/73))

### Changed
-   Hexadecimal colors are now allowed in typedefs.

-   `object.assign` node works on all target inputs, instead of just the first one.

-   Saving or deploying a flow while instances on it are running, prompts the sure to ensure it is okay that these running instances are stopped. ([#38](https://github.com/SpectrumBroad/xible/issues/38))

-   Starting while instances are already running prompts the user to stop the running instances or leave them running.

-   The `xible.flow.param` node has been renamed to `xible.flow.instance.param`. The parameter (value) is assigned and therefore specific to the instance, not the flow.

### Fixed
-   `cast` node is working again now the output type is properly reset when all connectors detach.

-   Installing a nodepack through the editor now properly reloads the typedefs. This ensures that the colors on inputs &amp; outputs are working, and that connectors work across the inheritance chain of a newly added typedef.

-   Flow instances stop if there is no more work to be done. Also, XIBLE exists properly after calling `xible.close()`.

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

[Unreleased]: https://github.com/SpectrumBroad/xible/compare/v0.14.0...HEAD
[0.14.0]: https://github.com/SpectrumBroad/xible/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/SpectrumBroad/xible/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/SpectrumBroad/xible/compare/v0.11.1...v0.12.0
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
