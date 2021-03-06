/**
 * @fileoverview Closure Compilers - Closure Compiler
 *
 * @license Copyright 2016 Google Inc. All Rights Reserved.
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
var assert = require('assert');
var path = require('path');

var fileTools = require('../../tools/file.js');
var pathTools = require('../../tools/path.js');

var nodejsCompiler = require('../../compilers/nodejs/compiler.js');

var testDirectory = pathTools.getTempPath('nodejs-compiler-test');


describe('Node.js Compiler::', function() {

  it('Single file', function(done) {
    this.timeout(25000);
    var files = ['test_files/special/node_test.js'];
    var outputFile = path.join(testDirectory, 'node_test_bundle.js');
    var options = {};
    nodejsCompiler.compile(files, options, outputFile,
      (errors, warnings, file) => {
        var result = fileTools.readFile(file);
        assert(result.includes('textTools.getRandomString() + \'hello\';'));
        assert(result.includes('module.exports = getRandomString();'));
        assert(result.includes('var TextTools = function() {};'));
        assert(result.includes('TextTools.getRandomString'));
        assert(result.includes('module.exports = TextTools;'));
        done();
      });
  });

});
