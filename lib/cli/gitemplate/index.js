exports.init = function(provider) {
  provider
    .option('-n, --name <project name>', 'my-new-proj', String)
    .option('-s, --src <source repo>', 'git@github.com:me/one-of-my-templates.git', String)
    .option('-c, --commit <commit>', '1234abc', String, '')
    .option('-d, --dst <destination dir>', '~/dev/my-new-proj', String)
    .option('-D, --desc <project description>', 'gets it done', String, '')
    .option('-r, --repo <user/project>', 'set gitemplate.repo and auto remote', String, '')
    .option('-j, --json <custom template variables>', '\'{"k1":"v1","k2":"v2",...}\'', String, '{}')
    .option('-I, --noinit')
    .option('-v, --verbose');
};

exports.run = function() {
  'use strict';

  var path = require('path');

  var gt = require('../../gitemplate').create();

  gt
    .set('name', this.options.name)
    .set('src', this.options.src)
    .set('commit', this.options.commit)
    .set('dst', path.resolve(this.options.dst))
    .set('desc', this.options.desc)
    .set('json', JSON.parse(this.options.json))
    .set('repo', this.options.repo)
    .set('verbose', this.options.verbose)
    .init();

  this.exitOnMissingOption(['name', 'src', 'dst']);

  try {
    gt.cloneRepo();
    gt.replaceContentVars();
    gt.replaceNameVars();
    gt.runPostReplace();

    if (!this.options.noinit) {
      gt.initRepo();
      if (this.options.repo) {
        gt.setGithubOrigin();
      }
    }
  } catch (e) {
    if (e.hasOwnProperty('code') && e.hasOwnProperty('output')) {
      this.exitOnShelljsErr(e);
    } else if (e instanceof Error) {
      this.exit(e.message);
    } else {
      this.exit("Fatal exception: " + String(e));
    }
  }
};
