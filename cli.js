#!/usr/bin/env node

// windows: running "npm blah" in this folder will invoke WSH, not node.
/*global WScript*/
if (typeof WScript !== 'undefined') {
	WScript.echo(
		'npm does not work when run\n' +
		'with the Windows Scripting Host\n\n' +
		"'cd' to a different directory,\n" +
		"or type 'npm.cmd <args>',\n" +
		"or type 'node npm <args>'."
	);
	WScript.quit(1);
	return;
}

process.title = 'xible';

console.log(`command line functionality not available yet.`);
