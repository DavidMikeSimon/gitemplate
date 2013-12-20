/**
 * Git cloning with template variables.
 *
 * Licensed under MIT.
 * Copyright (c) 2013 David Smith <https://github.com/codeactual/>
 */

/*jshint node:true*/
'use strict';

/**
 * Gitemplate constructor.
 */
exports.Gitemplate = Gitemplate;

/**
 * Create a new Gitemplate.
 *
 * @return {object}
 */
exports.create = function() { return new Gitemplate(); };

/**
 * Extend Gitemplate.prototype.
 *
 * @param {object} ext
 * @return {object} Merge result.
 */
exports.extend = function(ext) { return extend(Gitemplate.prototype, ext); };

var util = require('util');
var sprintf = util.format;
var outerShelljs = require('outer-shelljs');
var longCon = require('long-con');

var requireComponent = require('../component/require');
var configurable = requireComponent('configurable.js');
var extend = requireComponent('extend');
var escapeRe = requireComponent('escape-regexp');
var defShellOpt = {silent: true};

/**
 * Gitemplate constructor.
 *
 * Usage:
 *
 *     var gt = require('gitemplate').create();
 *     gt
 *       .set('name', this.name)
 *       .set('src', this.src)
 *       .set('dst', this.dst)
 *       .set('desc', this.desc)
 *       .set('json', this.json)
 *       .set('repo', this.repo);
 *     gt.cloneRepo();
 *
 * Configuration:
 *
 * - `{string} desc` `gitemplate_desc` replacement value
 * - `{string} dst` Clone path
 * - `{object} json` Replacement key/value pairs from `--json`
 * - `{string} name` `gitemplate_name` replacement value
 * - `{string} originSha` `gitemplate_originSha` replacement value
 * - `{string} originUrl` `gitemplate_originUrl` replacement value
 * - `{string} src` Source repository URL/path
 * - `{string} year` `gitemplate_year` replacement value
 *
 * Properties:
 *
 * - `{object} shelljs` `OuterShelljs` instance
 * - `{object} stdout`
 *
 * @see OuterShelljs https://github.com/codeactual/outer-shelljs/blob/master/docs/OuterShelljs.md
 */
function Gitemplate() {
  this.settings = {
    name: '',
    desc: '',
    json: {},
    repo: '',
    year: (new Date()).getUTCFullYear(),
    originSha: '',
    originUrl: ''
  };

  this.shelljs = outerShelljs.create();

  var lc = longCon.create().set('time', false);
  this.stdout = lc.create('gitemplate', console.log);
}

configurable(Gitemplate.prototype);

/**
 * Apply collected configuration.
 */
Gitemplate.prototype.init = function() {
  if (this.get('verbose')) {
    defShellOpt.silent = false;
  }

  if (!defShellOpt.silent) {
    this.shelljs.on('cmd', this.onShellCmd.bind(this));
  }
};

/**
 * Display details about each command in `--verbose` mode.
 *
 * Handler for the `cmd` event emitted from `OuterShelljs`.
 *
 * @api private
 */
Gitemplate.prototype.onShellCmd = function(method, args, ret) {
  this.stdout('%s(%s)', method, JSON.stringify(args));
};

/**
 * Clone the configured repo.
 *
 * This creates a new git clone from src, records the origin's URL and SHA,
 * then deletes the .git directory from dst.
 *
 * @return {object} `shelljs.exec()` result for clone command
 */
Gitemplate.prototype.cloneRepo = function() {
  var dst = this.get('dst');
  if (this.shelljs._('test', '-e', dst)) {
    throw new Error('Destination already exists');
  }

  var cloneRes = strictExec(this.shelljs._(
    'exec',
    sprintf('git clone %s %s', this.get('src'), dst),
    defShellOpt
  ));

  this.shelljs._('cd', dst);

  var shaRes = strictExec(this.shelljs._('exec', 'git rev-parse HEAD', defShellOpt));
  this.set('originSha', shaRes.output.slice(0, 10));

  var urlRes = strictExec(this.shelljs._('exec', 'git remote show origin', defShellOpt));
  this.set('originUrl', urlRes.output.match(/Fetch\s+URL: (\S+)/)[1]);

  this.shelljs._('rm', '-rf', this.get('dst') + '/.git');
  return cloneRes;
};

/**
 * Replace macros found in repo file content.
 */
Gitemplate.prototype.replaceContentVars = function() {
  var cmdHead = "find %s -type f -exec perl -p -i -e 's/";
  var cmdFoot = "/%s/gi' {} \\;";
  var dst = this.get('dst');
  var passThruKeys = ['name', 'desc', 'repo', 'year', 'originSha', 'originUrl'];
  var self = this;

  passThruKeys.forEach(function(key) {
    strictExec(self.shelljs._(
      'exec',
      sprintf(cmdHead + gitemplateEscVar(key) + cmdFoot, dst, escapeRe(self.get(key))),
      defShellOpt
    ));
  });

  var json = this.get('json');
  Object.keys(json).forEach(function(key) {
    strictExec(self.shelljs._(
      'exec',
      sprintf(cmdHead + gitemplateEscVar(key) + cmdFoot, dst, escapeRe(json[key])),
      defShellOpt
    ));
  });
};

/**
 * Replace macros found in repo file names.
 */
Gitemplate.prototype.replaceNameVars = function() {
  var self = this;
  var name = this.get('name');
  var dst = this.get('dst');

  var nameVar = gitemplateVar('name');
  function mvNameVar(target) {
    self.shelljs._('mv', target, target.replace(nameVar, name));
  }

  var targets = this.shelljs._('find', dst).filter(function(file) { // In dir names
    return self.shelljs._('test', '-d', file) && file.match(nameVar);
  });
  targets.forEach(mvNameVar);
  targets = this.shelljs._('find', dst).filter(function(file) { // In file names
    return self.shelljs._('test', '-f', file) && file.match(nameVar);
  });
  targets.forEach(mvNameVar);

  var json = this.get('json');
  var jsonKeys = Object.keys(json);
  jsonKeys.forEach(function(key) {
    var escapedKey = gitemplateEscVar(key);
    function mvJsonVar(target) {
      self.shelljs._('mv', target, target.replace(gitemplateVar(key), json[key]));
    }

    var targets = self.shelljs._('find', dst).filter(function(file) {
      return self.shelljs._('test', '-d', file) && file.match(escapedKey);
    });
    targets.forEach(mvJsonVar);
  });

  jsonKeys.forEach(function(key) {
    var escapedKey = gitemplateEscVar(key);
    function mvJsonVar(target) {
      self.shelljs._('mv', target, target.replace(gitemplateVar(key), json[key]));
    }

    var targets = self.shelljs._('find', dst).filter(function(file) {
      return self.shelljs._('test', '-f', file) && file.match(escapedKey);
    });
    targets.forEach(mvJsonVar);
  });
};

/**
 * Initialize a repo in the clone dir.
 *
 * @return {object} `shelljs.exec()` result from commit command
 */
Gitemplate.prototype.initRepo = function() {
  this.shelljs._('cd', this.get('dst'));
  strictExec(this.shelljs._('exec', 'git init', defShellOpt));
  strictExec(this.shelljs._('exec', 'git add .', defShellOpt));
  var originDesc = this.get('originUrl') + "#" + this.get('originSha');
  var message = "Initial commit from gitemplate: " + originDesc;
  message = message.replace(/[^A-Za-z0-9@#:.\/ -]/, '_', 'g');
  return strictExec(this.shelljs._('exec', 'git commit -m "' + message + '"', defShellOpt));
};

/**
 * Set GitHub remote origin.
 *
 * @return {object} `shelljs.exec()` result from remote command
 */
Gitemplate.prototype.setGithubOrigin = function() {
  this.shelljs._('cd', this.get('dst'));
  return strictExec(this.shelljs._(
    'exec',
    sprintf('git remote add origin git@github.com:%s.git', this.get('repo')),
    defShellOpt
  ));
};

/**
 * Run the `.gitemplate.postreplace` script if present.
 *
 * @return {object} `shelljs.exec()` result if script present, else null
 */
Gitemplate.prototype.runPostReplace = function() {
  var dst = this.get('dst');
  var script = dst + '/.gitemplate.postreplace';
  if (this.shelljs._('test', '-e', script)) {
    this.shelljs._('cd', dst);
    var res = strictExec(this.shelljs._('exec', script, defShellOpt));
    this.shelljs._('rm', '-f', script);
    return res;
  }
};

function gitemplateVar(key) { return 'gitemplate_' + key; }
function gitemplateEscVar(key) { return escapeRe(gitemplateVar(key)); }

function strictExec(res) {
  if (res.code !== 0) {
    throw res;
  } else {
    return res;
  }
}
