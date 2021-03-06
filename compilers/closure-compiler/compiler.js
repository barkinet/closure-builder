/**
 * @fileoverview Closure Builder - Closure compilers (online/local)
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
var fs = require('fs-extra');
var https = require('https');
var querystring = require('querystring');

var javaTools = require('../../tools/java.js');
var pathTools = require('../../tools/path.js');



/**
 * @constructor
 * @struct
 * @final
 */
var ClosureCompiler = function() {};


/**
 * @type {boolean}
 */
ClosureCompiler.DEBUG = false;


/**
 * @param {!array} files
 * @param {Object=} opt_options
 * @param {string=} opt_target_file
 * @param {function=} opt_callback
 * @param {boolean=} opt_remote_service
 */
ClosureCompiler.compile = function(files, opt_options, opt_target_file,
    opt_callback, opt_remote_service) {
  if (!files || files.length == 0) {
    return ClosureCompiler.error('No valid files are provided!', opt_callback);
  }

  if (opt_remote_service) {
    ClosureCompiler.remoteCompile(files, opt_options, opt_target_file,
      opt_callback);
  } else {
    ClosureCompiler.localCompile(files, opt_options, opt_target_file,
      opt_callback);
  }
};


/**
 * @param {!string} files
 * @param {Object=} opt_options
 * @param {string=} opt_target_file
 * @param {function=} opt_callback
 */
ClosureCompiler.localCompile = function(files, opt_options, opt_target_file,
    opt_callback) {
  if (!files) {
    return ClosureCompiler.error('No valid files are provided!', opt_callback);
  }
  if (!javaTools.hasJava()) {
    return ClosureCompiler.error('Java (JRE) is needed!', opt_callback);
  }

  var compiler = pathTools.getClosureCompilerJar();
  var compilerOptions = [];
  var options = opt_options || {};
  var showWarnings = true;

  // Compilation level
  if (!options.compilation_level) {
    options.compilation_level = 'SIMPLE_OPTIMIZATIONS';
  }

  // Handling warnings
  if (options.no_warnings) {
    showWarnings = false;
    delete options.jscomp_warnings;
    delete options.no_warnings;
  } else {
    // Compiler warnings
    if (!options.jscomp_warning) {
      options.jscomp_warning = ['checkVars', 'conformanceViolations',
        'deprecated', 'externsValidation', 'fileoverviewTags', 'globalThis',
        'misplacedTypeAnnotation', 'missingProvide', 'missingRequire',
        'missingReturn', 'nonStandardJsDocs', 'typeInvalidation',
        'uselessCode'];
    }
  }

  // Handling compiler error
  if (options.jscomp_error) {
    for (let i = 0; i < options.jscomp_error.length; i++) {
      compilerOptions.push('--jscomp_error', options.jscomp_error[i]);
    }
    delete options.jscomp_warning;
  }

  // Handling compiler off
  if (options.jscomp_off) {
    for (let i = 0; i < options.jscomp_off.length; i++) {
      compilerOptions.push('--jscomp_off', options.jscomp_off[i]);
    }
    delete options.jscomp_warning;
  }

  // Handling compiler warnings
  if (options.jscomp_warning) {
    for (let i = 0; i < options.jscomp_warning.length; i++) {
      compilerOptions.push('--jscomp_warning', options.jscomp_warning[i]);
    }
    delete options.jscomp_warning;
  }

  // Handling files
  var dupFile = {};
  for (let i = 0; i < files.length; i++) {
    if (!dupFile[files[i]]) {
      compilerOptions.push('--js', files[i]);
    }
    dupFile[files[i]] = true;
  }

  // Handling externs files
  if (options.externs) {
    for (let i = 0; i < options.externs.length; i++) {
      compilerOptions.push('--externs', options.externs[i]);
    }
    delete options.externs;
  }

  // Handling generate_exports
  if (options.generate_exports && !options.use_closure_basefile) {
    options.use_closure_basefile = true;
  }

  // Closure templates
  if (options.use_closure_templates) {
    compilerOptions.push('--js=' + pathTools.getClosureSoyUtilsFile());
    if (!options.use_closure_library) {
      options.use_closure_library = true;
    }
    delete options.use_closure_templates;
  }

  // Include Closure base file
  if (options.use_closure_basefile || options.use_closure_library) {
    var baseFile = pathTools.getClosureBaseFile();
    if (baseFile) {
      compilerOptions.push('--js', baseFile);
    }
    delete options.use_closure_basefile;
  }

  // Include Closure library files
  if (options.use_closure_library) {
    var ignoreList = [];
    if (options.use_closure_library_ui) {
      delete options.use_closure_library_ui;
    } else {
      ignoreList.push('ui');
    }
    var closureLibraryFiles = pathTools.getClosureLibraryFiles(ignoreList);
    for (let i = 0; i < closureLibraryFiles.length; i++) {
      compilerOptions.push('--js=' + closureLibraryFiles[i]);
    }
    delete options.use_closure_library;
  }

  // Handling options
  for (var option in options) {
    compilerOptions.push('--' + option, options[option]);
  }

  var compilerEvent = (error, stdout, stderr) => {
    var code = stdout;
    var errorMsg = stderr || error;
    var errors = null;
    var warnings = null;
    var numErrors = 0;
    var numWarnings = 0;

    // Handling Error messages
    if (errorMsg) {
      var parsedErrorMessage = ClosureCompiler.parseErrorMessage(errorMsg);
      numErrors = parsedErrorMessage.errors;
      numWarnings = parsedErrorMessage.warnings;
    }

    if (numErrors == 0 && numWarnings > 0 && showWarnings) {
      warnings = errorMsg;
      ClosureCompiler.warn(warnings);
    } else if (numErrors > 0) {
      errors = errorMsg;
      ClosureCompiler.error(errors);
      code = null;
    }

    if (opt_callback) {
      opt_callback(errors, warnings, opt_target_file, code);
    }
  };

  javaTools.execJavaJar(compiler, compilerOptions, compilerEvent, null,
    ClosureCompiler.DEBUG);
};


/**
 * @param {!string} files
 * @param {Object=} opt_options
 * @param {string=} opt_target_file
 * @param {function=} opt_callback
 */
ClosureCompiler.remoteCompile = function(files,
    opt_options, opt_target_file, opt_callback) {
  if (!files) {
    return ClosureCompiler.error('No valid files are provided!', opt_callback);
  }

  // Handling options
  var unsupportedOptions = {
    'entry_point': true,
    'generate_exports': true
  };
  var option;
  for (option in opt_options) {
    if (option in unsupportedOptions) {
      var errorMsg = 'ERROR - ' + option + ' is unsupported by the ' +
        'closure-compiler webservice!';
      return ClosureCompiler.error(errorMsg, opt_callback);
    }
  }

  var options = opt_options || {};
  var data = {
    'compilation_level' : 'SIMPLE_OPTIMIZATIONS',
    'output_format': 'json',
    'output_info': ['compiled_code', 'warnings', 'errors', 'statistics'],
    'js_code': []
  };
  var showWarnings = true;

  // Closure templates
  if (options.use_closure_templates) {
    var closureSoyUtilsFile = pathTools.getClosureSoyUtilsFile();
    if (closureSoyUtilsFile) {
      data['js_code'].push(fs.readFileSync(closureSoyUtilsFile).toString());
      if (!options.use_closure_library) {
        options.use_closure_library = true;
      }
    }
    delete options.use_closure_templates;
  }

  // Handling files
  for (let i = 0; i < files.length; i++) {
    var fileContent = fs.readFileSync(files[i]).toString();
    if (fileContent) {
      data['js_code'].push(fileContent);
    }
  }

  // Handling externs files
  if (options.externs) {
    var externsCode = '';
    for (let i = 0; i < options.externs.length; i++) {
      externsCode += fs.readFileSync(options.externs[i]).toString();
    }
    if (externsCode) {
      data['js_externs'] = externsCode;
    }
    delete options.externs;
  }

  // Handling warnings
  if (options.no_warnings) {
    showWarnings = false;
    delete options.no_warnings;
  }

  // Handling options
  for (option in options) {
    data[option] = options[option];
  }

  var dataString = querystring.stringify(data);
  var httpOptions = {
    host: 'closure-compiler.appspot.com',
    path: '/compile',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': dataString.length
    }
  };

  var request = https.request(httpOptions, function(response) {
    var data = '';
    response.setEncoding('utf8');
    response.on('data', function(chunk) {
      data += chunk;
    });
    response.on('end', function() {
      var result =  JSON.parse(data);
      var code = result.compiledCode;
      var errorMsg = result.errors;
      var warningMsg = result.warnings;
      var serverErrorMsg = result.serverErrors;
      var errors = null;
      var warnings = null;
      if (serverErrorMsg) {
        errors = ClosureCompiler.parseJsonError(serverErrorMsg);
        ClosureCompiler.error(errors || errorMsg);
        code = '';
      } else if (errorMsg) {
        errors = ClosureCompiler.parseJsonError(errorMsg);
        ClosureCompiler.error(errors);
        code = '';
      } else if (warningMsg && showWarnings) {
        warnings = ClosureCompiler.parseJsonError(warningMsg);
        ClosureCompiler.warn(warnings);
      }
      if (code) {
        code += '\n';
      }
      if (opt_callback) {
        opt_callback(errors, warnings, opt_target_file, code);
      }
    });
  });

  request.on('error', function(e) {
    ClosureCompiler.error('HTTP request error:' + e.message, opt_callback);
  });

  request.write(dataString);
  request.end();
};


/**
 * @param {string} data
 * @return {!string}
 */
ClosureCompiler.parseJsonError = function(data) {
  var message = '';
  for (let i=0; i<data.length; i++) {
    var msg = data[i].error || data[i].warning;
    var type = (data[i].error) ? 'ERROR' : 'WARNING';
    if (data.file && data.file !== 'Input_0') {
      message += data.file + ':' + data.lineno + ': ' +  type + ' - ' +
        msg + '\n';
    } else if (data[i].line) {
      message += type + ' - ' + msg + ' : ' + data[i].line + '\n';
    } else {
      message += type + ' - ' + msg + '\n';
    }
  }
  return message;
};


/**
 * @param {string} message
 * @return {Object} with number of detected errors and warnings
 */
ClosureCompiler.parseErrorMessage = function(message) {
  var errors = 0;
  var warnings = 0;
  if (message && message.match) {
    var message_reg = /([0-9]+) error\(s\), ([0-9]+) warning\(s\)/;
    var messageInfo = message.match(message_reg);
    if (messageInfo) {
      errors = messageInfo[1];
      warnings = messageInfo[2];
    } else if (message.includes('INTERNAL COMPILER ERROR') ||
               message.includes('NullPointerException')) {
      errors = 1;
    } else if (message.toLowerCase().includes('error')) {
      errors = message.toLowerCase().split('error').length - 1;
    } else if (message.toLowerCase().includes('warning')) {
      if (!message.includes('Java HotSpot\(TM\) Client VM warning') ||
          message.toLowerCase().split('warning').length > 2) {
        warnings = message.toLowerCase().split('warning').length - 1;
      } else {
        warnings = 0;
      }
    }
  } else if (message) {
    errors = 1;
  }
  return {
    errors: errors,
    warnings: warnings
  };
};


/**
 * @param {string} msg
 */
ClosureCompiler.info = function(msg) {
  if (msg) {
    console.info('[Closure Compiler]', msg);
  }
};


/**
 * @param {string} msg
 */
ClosureCompiler.warn = function(msg) {
  console.error('[Closure Compiler Warn]', msg);
};


/**
 * @param {string} msg
 * @param {function=} opt_callback
 */
ClosureCompiler.error = function(msg, opt_callback) {
  console.error('[Closure Compiler Error]', msg);
  if (opt_callback) {
    opt_callback(msg);
  }
};


module.exports = ClosureCompiler;
