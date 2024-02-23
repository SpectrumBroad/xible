# Change Log
All notable changes to the [XIBLE project](https://xible.io) will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
### Changed
- Upgrade Cypress for E2E testing.

- Updated minumum Node.JS version to 20.

## [0.26.0][] - 2021-05-19
### Added
-   It is now possible to `xiblepm flow install <user>/<flow>` instead of `xiblepm flow install <flow> --publish-user-name=<user>`. `xiblepm flow search` returns a list in the same format.

-   Whenever a nodepack is under development and the package.json name attribute does not start with 'xible-np-' or 'xible-nodepack-', a warning is thrown, indicating that the nodepack cannot be published to the registry.

-   The CLI command `xiblepm flow delete <flowname>` has been added to delete a flow which is published to the registry. The [documentation](https://xible.io/docs/commandlinetools/xiblepm#flow.delete) has been updated.

-   The UI has an option to publish flows from the 'Flows' page. This acts similarly as the command line [`xiblepm flow publish <flowname>`](https://xible.io/docs/commandlinetools/xiblepm#flow.publish).

-   It is now possible to navigate the node selector within the editor using the up and down keys to select different nodes, and the space key to insert a node.

### Changed
-   The `.xiblerc.json` file location is now configurable in the config.json and as a result through the [`xible config` command](https://xible.io/docs/commandlinetools/xible#xible).

### Fixed
-   Calling [node.getData()](https://xible.io/docs/api/node#node.getData) on a node that has no [dataStructure](https://xible.io/docs/guides/nodes/data#structure), would throw.

## [0.25.0][] - 2021-05-16
### Changed
-   Flows are now stored per user. This means that the registry can hold multiple flows by the same name, but published by different users. All functionality has been updated to reflect this change. This includes the UI and the cli commands such as [`xiblepm flow install`](https://xible.io/docs/commandlinetools/xiblepm#flow.install).

## [0.24.0][] - 2021-05-12
### Added
-   Within the [structure.json](https://xible.io/docs/guides/nodes/structure) of a node, developers can now configure the input data fields using the [dataStructure object](https://xible.io/docs/guides/nodes/data#structure), instead of creating a separate [`editor/index.htm`](https://xible.io/docs/guides/nodes/editor). This improves development time for new nodes by a fair bit. If an `editor/index.htm` is present, it will overrule any configured dataStructure within the structure.json. ([#95](https://github.com/SpectrumBroad/xible/issues/95))

-   A new convenience method [node.getData(dataName, state)](https://xible.io/docs/api/node#node.getData) to fetch all data for a data field, including related inputs if so configured. This behaves similarly as a combination of fetching data through `NODE.data.x` and `NODE.getInputByName(x).getValues()`. `node.getData()` is the new preferred method of fetching data. ([#95](https://github.com/SpectrumBroad/xible/issues/95))

### Changed
-   [nodeIo.isConnected()](https://xible.io/docs/api/nodeio#nodeIo.isConnected) actually returns a boolean now, instead of the amount of connectors.

## [0.23.2][] - 2021-05-05
### Fixed
-   Describe/help for a node, in the flow editor, was no longer visible. When a node was in focus, and the 'h' key was pressed, the help page would not show up. Similarly when clicking on the help button for that node.

## [0.23.1][] - 2021-05-04
### Fixed
-   Some mouse actions (scroll for zoom, doubleclick to add a node) were not registered in the flow editor in certain scenarios.

## [0.23.0][] - 2021-05-04
### Added
-   A feature has been added to edit the node data/input values in a separate dock, which hosts more space. The amount of space available here is especially useful for nodes which potentially contain large amount of data, such as the [function](https://xible.io/nodes?search=function) node.

-   When hovering the mouse cursor over a node, a box with options appears that could previously only be triggered by hitting the [right key combination](https://xible.io/docs/editor#nodes). These include;
    - Open the help/details page of a node.
    - Delete a node from a flow.
    - Edit the contents of a node in a separate side panel.

### Fixed
-   Within the dock of the flow editor, the 'clear'-logs button was not completely clickable because of overlap by the tab list.

## [0.22.0][] - 2021-05-01
### Added
-   Input fields within nodes that have type=password, now include a toggle to make the password visible from the editor.

-   Data fields that are stored in the [vault](https://xible.io/docs/guides/nodes/structure#structure.json) now have a shield icon available in the editor to signify this. ([#90](https://github.com/SpectrumBroad/xible/issues/90))

-   The ['object' nodepack](https://xible.io/nodes?search=object) now contains a `object.path` node to parse [jsonpath expressions](https://goessner.net/articles/JsonPath/). ([#62](https://github.com/SpectrumBroad/xible/issues/62))

### Changed
-   A focused input field now focuses the surrounding node, preventing the loss of visibility on fields that are not required. These fields hide by default of the focus is not on the node, which could make it cumbersome to edit these fields.

-   The `xible.flow.onstart` and `waitfor` nodes have been renamed to follow naming conventions. They are now called `xible.flow.on-start` and `wait-for`. Existing flows which are using these nodes will have to replace it with the newly named nodes.

-   Within the editor, pasting a selection of nodes will center the copy in the viewport. ([#19](https://github.com/SpectrumBroad/xible/issues/19))

-   For new installations, the default amount of statuses visible on any node in the editor is set to 5. This can be changed through the settings. The value is stored in the configuration file as `editor.nodes.statuses.max`.

### Fixed
-   The 'http' and 'function' nodepacks are now loaded by default. They were included in the package.json, but not in the default nodepack loader. In previous version it is still possible to simply install these nodepacks directly from the registry.

## [0.21.0][] - 2021-04-20
### Added
-   Within the editor, the dock can now be docked to the left or the bottom. Previously there was no option available, it was always stuck to the left. The default location remains the left. The location will be stored in the browsers' `localStorage` to bring it back in the same place when reopening a session.

### Changed
-   Connectors that are not of the type 'trigger', have a slightly different colour to make it easier to follow the flow.

-   Node routes (as described in the [documentation](https://xible.io/docs/guides/nodes/routes)) follow a different structure that supports both global routes, and routes for an initialized node within a flow.
   -   `/node/routes/flow.js` replicates the behaviour of the previously existing `/node/routes.js`; hosting routes for an initialized node within a flow. The endpoint has changed to `/api/nodes/node-name/routes/flow/node-id`.
   -   `/node/routes/global.js` hosts routes directly on `/api/nodes/node-name/routes/global`. The node does not need to be part of a flow for these to work.

-   The purple state colour for initialized flows in the tabs within the editor are no longer suppressed.

### Fixed
-   `npm run debug` and other commands now work on Windows by using [cross-env](https://github.com/kentcdodds/cross-env) to set environment variables, instead of `EXPORT`.

-   Charts work again after version pinning the chart.js dependency.

-   Prevent issues with the zoom-to-fit button showing erratic behaviour if any of the nodes in a flow had an x or y position of exactly 0.

## [0.20.2][] - 2021-04-18
### Fixed
-   An invalid repository reference ended up in the shrinkwrap.json, causing installations to fail.

## [0.20.0][] - 2021-04-14
### Added
-   Nodepack- and node- logging have been improved. ([#89](https://github.com/SpectrumBroad/xible/issues/89))

### Changed
-   A missing `./nodes` directory within the XIBLE installation path no longer throws a warning, and instead silently fails. This directory is used for internal development purposes only and is harmless if it is missing.

-   Minimum supported node version is now 12.0.0

## [0.19.2][] - 2021-03-07
### Fixed
-   Non-existing '~/.xible/nodes' directory no longer prevents XIBLE from importing nodepacks and flows.

## [0.19.1][] - 2021-03-07
### Fixed
-   Non-existing 'xible/nodes' directory no longer prevents XIBLE from importing nodepacks and flows.

-   Browser dependencies imported from node_modules now use `require.resolve()` to ensure a proper path is used on all platforms.

## [0.19.0][] - 2020-07-11
### Added
-   You can now snap nodes in the editor to a grid. The setting is enabled by default. It can be toggled in the editor in the bottom left corner.

-   Searching for a node in the node selector which contains a dash, no longer needs that dash supplied in the search input. For example, the search string 'appendstring' will find the node `filesystem.file.append-string`.

### Fixed
-   Support for NodeJS v14. ([#85](https://github.com/SpectrumBroad/xible/issues/85))

## [0.18.1][] - 2020-04-13
### Fixed
-   Installing nodepacks from the registry failed.

## [0.18.0][] - 2020-04-13
### Added
-   A nodepack view has been added which lists all the installed nodepacks and their nodes.

-   Support for the command key in the editor on MacOS.

### Fixed
-   Vault path description in settings was incorrect.

## [0.17.2][] - 2020-03-15
### Fixed
-   Wrapping of node names in the editor now works cross browser, instead of only in Chrome.

-   Installing XIBLE on non-MacOS operating systems failed because of an older nested dependency in the [filesystem nodepack](https://xible.io/nodes?search=filesystem).

## [0.17.1][] - 2020-02-19
### Fixed
-   Chart labels are no longer overlapped by the chart itself. ([#3](https://github.com/SpectrumBroad/xible/issues/3))

-   Removed browser feature check for HTML imports. ([#84](https://github.com/SpectrumBroad/xible/issues/84))

## [0.17.0][] - 2019-04-06
### Changed
-   Starting flows from the 'flows' page triggers the same checks as the start button on the 'editor' page does. Existing instances can therefor be stopped and instance parameters can be provided.

-   Improved node selector in editor. Node names are now wrapped for better readability.

## [0.16.1][] - 2019-02-01
### Fixed
-   Various `xible node` cli commands are functioning again.

-   The cli command `xible node get <data>` now properly fetches only the specified data field when that particular bit of data is stored in the vault.

## [0.16.0][] - 2019-01-30
### Added
-   Some of the nodes that came with XIBLE by default have been moved to their own respective nodepacks. ([#79](https://github.com/SpectrumBroad/xible/issues/79))

-   Several nodepacks are now installed by default when installing a fresh copy of XIBLE. ([#78](https://github.com/SpectrumBroad/xible/issues/78))

-   When logging in on the registry using the `xiblepm user login` command, the user gets confirmed which user is now logged on, including the registry url. The same goes for adding a new account using `xiblepm user add`.

-   The `xiblepm nodepack publish` command now informs the user of the published version, after completion. ([#44](https://github.com/SpectrumBroad/xible/issues/44))

-   The UI now allows users to search and install flows from the registry. This feature can be found in the 'Flows' section of your XIBLE installation. ([#20](https://github.com/SpectrumBroad/xible/issues/20))

### Changed
-   The `xible config list` command now returns a human readable key-value list. The key nesting is identified by dots, much like json paths and how `xible config set` and `xible config get` already worked. A `xible config json` command has been added which sticks to the previous behaviour and simply prints the actual JSON (formatted) config. ([#23](https://github.com/SpectrumBroad/xible/issues/23))

### Fixed
-   Improved selection handling in the editor.

## [0.15.0][] - 2018-10-27
### Added
-   The `timing` object for flow instances now also contains the `createDate`, `initDate` and `startDate` properties. These contain a `Date.now()` property for their respective dates. This allows you to track exactly when a flow instance was started.

-   On the 'flows' view, you can now select a flow to view the details of that flow. This includes state, parameters, resource graphs and more.

-   Use `xiblepm nodepack init` to create a default node structure. This is useful for starting the development of a new node within a nodepack. ([#81](https://github.com/SpectrumBroad/xible/issues/81))

-   Unsupported browsers can now find exactly which features the browser is missing in a 'details' window.

-   `string.length` node to find the length of all input strings combined.

-   TypeDefs can be related to javascript constructors, so that it is now possible for XIBLE to filter input values based on the typeDef in the extends chain. The typeDef of a value can be set by assigning a typeDef to the constructor of that value using [`Node.setTypeDef(Constr, type)`](https://xible.io/docs/api/node#node.setTypeDef). As a result, node inputs and outputs can now be connected as long as either side is in the extends chain of the other side. If an output is lower in the extends chain than the input, the values will be filtered to match at least the extends level of the input.

-   Added a `input.filter-type` node to return values from a specific type only.

-   The log in the editor can now be cleared using the "clear" button.

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

[Unreleased]: https://github.com/SpectrumBroad/xible/compare/v0.26.0...HEAD
[0.26.0]: https://github.com/SpectrumBroad/xible/compare/v0.25.0...v0.26.0
[0.25.0]: https://github.com/SpectrumBroad/xible/compare/v0.24.0...v0.25.0
[0.24.0]: https://github.com/SpectrumBroad/xible/compare/v0.23.2...v0.24.0
[0.23.2]: https://github.com/SpectrumBroad/xible/compare/v0.23.1...v0.23.2
[0.23.1]: https://github.com/SpectrumBroad/xible/compare/v0.23.0...v0.23.1
[0.23.0]: https://github.com/SpectrumBroad/xible/compare/v0.22.0...v0.23.0
[0.22.0]: https://github.com/SpectrumBroad/xible/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/SpectrumBroad/xible/compare/v0.20.2...v0.21.0
[0.20.2]: https://github.com/SpectrumBroad/xible/compare/v0.20.0...v0.20.2
[0.20.0]: https://github.com/SpectrumBroad/xible/compare/v0.19.2...v0.20.0
[0.19.2]: https://github.com/SpectrumBroad/xible/compare/v0.19.1...v0.19.2
[0.19.1]: https://github.com/SpectrumBroad/xible/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/SpectrumBroad/xible/compare/v0.18.1...v0.19.0
[0.18.1]: https://github.com/SpectrumBroad/xible/compare/v0.18.0...v0.18.1
[0.18.0]: https://github.com/SpectrumBroad/xible/compare/v0.17.2...v0.18.0
[0.17.2]: https://github.com/SpectrumBroad/xible/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/SpectrumBroad/xible/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/SpectrumBroad/xible/compare/v0.16.1...v0.17.0
[0.16.1]: https://github.com/SpectrumBroad/xible/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/SpectrumBroad/xible/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/SpectrumBroad/xible/compare/v0.14.0...v0.15.0
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
