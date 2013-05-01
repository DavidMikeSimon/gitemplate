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

### Custom variables via `--json`

    gitemplate --name my-new-project \
               --src git@github.com:me/my-old-template.git \
               --dst ~/dev/my-new-project \
               --desc 'gets it done' \
               --json '{"customVar1":"val1","customVar2":"val2"}' \

### Template Repos

[![Build Status](https://travis-ci.org/codeactual/gitemplate-node-component.png)](https://travis-ci.org/codeactual/gitemplate-node-component) [node component](https://github.com/codeactual/gitemplate-node-component)

[![Build Status](https://travis-ci.org/codeactual/gitemplate-node-bin-component.png)](https://travis-ci.org/codeactual/gitemplate-node-bin-component) [node component w/ bin script](https://github.com/codeactual/gitemplate-node-bin-component)

[![Build Status](https://travis-ci.org/codeactual/gitemplate-connect-middleware.png)](https://travis-ci.org/codeactual/gitemplate-connect-middleware) [connect middleware component](https://github.com/codeactual/gitemplate-connect-middleware)

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

## CLI

    -h, --help                              output usage information
    -v, --verbose

### Required

    -n, --name <project name>               my-new-proj
    -s, --src <source repo>                 git@github.com:me/one-of-my-templates.git
    -d, --dst <destination dir>             ~/dev/my-new-proj

### Optional

    -D, --desc <project description>        gets it done
    -r, --repo <user/project>               set gitemplate.repo and auto init/remote
    -j, --json <custom template variables>  '{"k1":"v1","k2":"v2",...}'

## API

### Example

```js
this.gt = gitemplate.create();
this.gt
  .set('name', this.name)
  .set('src', this.src)
  .set('dst', this.dst)
  .set('desc', this.desc)
  .set('json', this.json)
  .set('repo', this.repo);
this.gt.cloneRepo();
```

[Documentation](docs/Gitemplate.md)

## License

  MIT

## Tests

    npm test
