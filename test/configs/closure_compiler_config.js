/**
 * @fileoverview Closure Builder - Closure compiler config
 *
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author mbordihn@google.com (Markus Bordihn)
 */
const closureBuilder = require('../../closure-builder');
const pathTools = require('../../tools/path.js');
const glob = closureBuilder.globSupport();


/**
 * Build Tools.
 * @constructor
 * @struct
 * @final
 */
var config = function() {};

config.duplicate = {
  name: 'closure_test_duplicate',
  srcs: [
    'test_files/closure_test_1.js',
    'test_files/closure_test_2.js',
    'test_files/closure_test_duplicate.js'
  ],
  deps: glob([
    'test_files/closure_test_*.js'
  ]),
  out: pathTools.getTempTestPath('closure-test-1')
};


config.general1 = {
  name: 'closure_test_1',
  srcs: [
    'test_files/closure_test_1.js'
  ],
  out: pathTools.getTempTestPath('closure-test-1')
};


config.general2 = {
  name: 'closure_test_2',
  srcs: [
    'test_files/closure_test_1.js',
    'test_files/closure_test_2.js'
  ],
  out: pathTools.getTempTestPath('closure-test-2')
};


config.group = {
  name: 'closure_test_group',
  srcs: glob([
    'test_files/closure_test_*.js'
  ]),
  out: pathTools.getTempTestPath('closure-test-group')
};


config.module = {
  name: 'closure_test_require_module',
  srcs: glob([
    'test_files/closure_test_*.js'
  ]),
  out: pathTools.getTempTestPath('closure-module')
};


config.extern = {
  name: 'closure_test_extern',
  srcs: glob([
    'test_files/closure_test_*.js'
  ]),
  externs: [
    'test_files/externs.js'
  ],
  out: pathTools.getTempTestPath('closure-test-extern')
};


config.error = {
  name: 'closure_test_error',
  srcs: glob([
    'test_files/special/closure_error.js'
  ]),
  out: pathTools.getTempTestPath('closure-error'),
  testEnv: true
};


config.warning = {
  name: 'closure_test_warning',
  srcs: glob([
    'test_files/special/closure_warning.js'
  ]),
  out: pathTools.getTempTestPath('closure-warning')
};


config.warningDisabled = {
  name: 'closure_test_warning',
  srcs: glob([
    'test_files/special/closure_warning.js'
  ]),
  warn: false,
  out: pathTools.getTempTestPath('closure-warning')
};


config.export = {
  name: 'closure_test_export',
  srcs: glob([
    'test_files/special/closure_export.js'
  ]),
  out: pathTools.getTempTestPath('closure-export')
};


module.exports = config;
