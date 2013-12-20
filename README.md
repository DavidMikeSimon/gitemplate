# gitemplate

Git cloning with template variables.

* Replace variables in file names and content.
* Optional GitHub repo init and remote origin setup.
* Custom post-processing scripts.

[![Build Status](https://travis-ci.org/codeactual/gitemplate.png)](https://travis-ci.org/codeactual/gitemplate)

## Examples

### Basic clone

    gitemplate --name my-new-project \
               --src git@github.com:me/my-old-template.git \
               --dst ~/dev/my-new-project \
               --desc 'gets it done' \

### Auto init and set remote GitHub origin via `--repo`

    gitemplate --name my-new-project \
               --src git@github.com:me/my-old-template.git \
               --dst ~/dev/my-new-project \
               --desc 'gets it done' \
               --repo me/my-new-project

### Clone a particular commit tag from src

    gitemplate --name my-new-project \
               --src git@github.com:me/my-old-template.git \
               --commit v0.3
               --dst ~/dev/my-new-project \
               --desc 'gets it done' \


[More](docs/examples.md)

## Built-in variables

Case-insensitive.

### `gitemplate_name`

> Same as `--name`.

### `gitemplate_desc`

> Same as `--desc`.

### `gitemplate_repo`

> Same as `--repo`.

Will also trigger `init` and `remote add origin`.

### `gitemplate_year`

> Full year in local time. (Only replaced in file content.)

### `gitemplate_originSha`

> Cloned origin's commit SHA-1 (first 10 chars). (Only replaced in file content.)

### `gitemplate_originUrl`

> Cloned origin's URL. (Only replaced in file content.)

## Custom vars

> Will also replace in file names and content. Case insensitive.

### Place in a file

    gitemplate_engineVer

### Or file name

    /path/to/gitemplate_engineVer.js

### Then replace

    --json '{"engineVer":"0.10.1"}'

## Post-processing scripts

Will be auto-deleted after successful execution.

### Run after template variable replacement

Add an executable `.gitemplate.postreplace` file to the root.

node.js example that installs all dependencies and runs the unit tests:

    #!/bin/sh

    npm install
    npm test

## Installation

### [NPM](https://npmjs.org/package/gitemplate)

    npm install gitemplate

## API

* [Example](lib/cli/gitemplate/index.js)
* [Documentation](docs/Gitemplate.md)

## License

  MIT

## Tests

    npm test
