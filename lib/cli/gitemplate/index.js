exports.init = function(provider) {
  provider
    .option('-n, --name <project name>', 'my-new-proj', String)
    .option('-s, --src <source repo>', 'git@github.com:me/one-of-my-templates.git', String)
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
    .set('dst', path.resolve(this.options.dst))
    .set('desc', this.options.desc)
    .set('json', JSON.parse(this.options.json))
    .set('repo', this.options.repo)
    .set('verbose', this.options.verbose)
    .init();

  this.exitOnMissingOption(['name', 'src', 'dst']);

  this.exitOnShelljsErr(gt.cloneRepo());

  gt.set('originSha', gt.getRepoOriginSha());
  gt.set('originUrl', gt.getRepoOriginUrl());

  gt.rmGitDir();
  this.exitOnShelljsErr(gt.replaceContentVars());
  gt.replaceNameVars();

  if (!this.options.noinit) {
    this.exitOnShelljsErr(gt.initRepo());
  }

  if (this.options.repo) {
    this.exitOnShelljsErr(gt.setGithubOrigin());
  }

  var postReplaceResult = gt.runPostReplace();
  if (postReplaceResult) {
    this.exitOnShelljsErr(postReplaceResult);
  }
};
