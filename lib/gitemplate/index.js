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
 * @return {object} `shelljs.exec()` result
 */
Gitemplate.prototype.cloneRepo = function() {
  var dst = this.get('dst');
  if (this.shelljs._('test', '-e', dst)) {
    return {code: 1, output: 'Destination already exists'};
  }

  var res = this.shelljs._(
    'exec',
    sprintf('git clone %s %s', this.get('src'), dst),
    defShellOpt
  );
  if (res.code !== 0) { return res; }

  this.shelljs._('cd', dst);

  res = this.shelljs._('exec', 'git rev-parse HEAD', defShellOpt);
  if (res.code !== 0) { return res; }
  this.set('originSha', res.output.slice(0, 10));

  res = this.shelljs._('exec', 'git remote show origin', defShellOpt)
  if (res.code !== 0) { return res; }
  this.set('originUrl', res.output.match(/Fetch\s+URL: (\S+)/)[1]);

  this.shelljs._('rm', '-rf', this.get('dst') + '/.git');
  return res;
};

/**
 * Replace macros found in repo file content.
 */
Gitemplate.prototype.replaceContentVars = function() {
  var cmdHead = "find %s -type f -exec perl -p -i -e 's/";
  var cmdFoot = "/%s/gi' {} \\;";
  var dst = this.get('dst');
  var passThruKeys = ['name', 'desc', 'repo', 'year', 'originSha', 'originUrl'];
  var res = {code: 0};
  var self = this;

  passThruKeys.forEach(function(key) {
    if (res.code !== 0) { // Prior exec() failed, bail out.
      return;
    }
    res = self.shelljs._(
      'exec',
      sprintf(cmdHead + gitemplateEscVar(key) + cmdFoot, dst, escapeRe(self.get(key))),
      defShellOpt
    );
  });
  if (res.code !== 0) { return res; }

  var json = this.get('json');
  Object.keys(json).forEach(function(key) {
    res = self.shelljs._(
      'exec',
      sprintf(cmdHead + gitemplateEscVar(key) + cmdFoot, dst, escapeRe(json[key])),
      defShellOpt
    );
    if (res.code !== 0) { return res; }
  });

  return res;
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
 * @return {object} `shelljs.exec()` result
 */
Gitemplate.prototype.initRepo = function() {
  this.shelljs._('cd', this.get('dst'));
  var res;
  res = this.shelljs._('exec', 'git init', defShellOpt);
  if (res.code === 0) {
    res = this.shelljs._('exec', 'git add .', defShellOpt);
  }
  if (res.code === 0) {
    var message = "Initial commit from gitemplate: " + this.get('originUrl') + "#" + this.get('originSha');
    message = message.replace(/[^A-Za-z0-9@#:.\/ -]/, '_', 'g');
    res = this.shelljs._('exec', 'git commit -m "' + message + '"', defShellOpt);
  }
  return res;
};

/**
 * Set GitHub remote origin.
 */
Gitemplate.prototype.setGithubOrigin = function() {
  this.shelljs._('cd', this.get('dst'));
  return this.shelljs._(
    'exec',
    sprintf('git remote add origin git@github.com:%s.git', this.get('repo')),
    defShellOpt
  );
};

/**
 * Run the `.gitemplate.postreplace` script if present.
 *
 * @return {object} `shelljs.exec()` result
 */
Gitemplate.prototype.runPostReplace = function() {
  var dst = this.get('dst');
  var script = dst + '/.gitemplate.postreplace';
  if (!this.shelljs._('test', '-e', script)) {
    return {code: 0, output: "No postreplace script to run"};
  }
  this.shelljs._('cd', dst);
  var res = this.shelljs._('exec', script, defShellOpt);
  if (res.code === 0) {
    this.shelljs._('rm', '-f', script);
  }
  return res;
};

function gitemplateVar(key) { return 'gitemplate_' + key; }
function gitemplateEscVar(key) { return escapeRe(gitemplateVar(key)); }
