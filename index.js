const path = require('path');
const findRoot = require('find-root');
const glob = require('glob');
const debug = require('debug')('eslint-import-resolver-kibana');

const defaults = {
  kibanaPath: '../kibana',
};

/*
 * Resolves the path to Kibana, either from default setting or config
 */
function getKibanaPath(config, file, rootPath) {
  const inConfig = config != null && config.kibanaPath;

  const kibanaPath = (inConfig)
    ? path.resolve(config.kibanaPath)
    : path.resolve(rootPath, defaults.kibanaPath);

  debug(`resolved kibana path: ${kibanaPath}`);
  return kibanaPath;
}

/*
 * Creates a glob pattern string that looks for:
 *  - file that matches the source (source.js)
 *  - directory with an index.js that matches the source (source/index.js)
 *  - directory with a matching module name that matches the source (source/source.js)
 * NOTE: last condition mentioned above can be removed when the custom resolver is removed from Kibana webpack config
 * @param {String|Array} source: the module identifier (./imported-file).
 */
function getGlobPattern(source) {
  if (Array.isArray(source)) {
    const rootPath = path.join(...source);
    const filename = source[source.length - 1];
    return `./${rootPath}{*(.js),/${filename}.js,/index.js}`;
  } else {
    return `./${source}{*(.js),/${source}.js,/index.js}`;
  }
}

/*
 * Returns an array of relative file path strings that match the source
 * @param {String} source: the module identifier
 * @param {String} checkPath: path to search in for file globbing
 */
function getFileMatches(source, checkPath) {
  const globPattern = getGlobPattern(source);
  const globOptions = {
    cwd: path.resolve(checkPath),
  };

  const matches = glob.sync(globPattern, globOptions);
  debug(`checking in ${checkPath}, matched ${matches.length}`);

  return matches;
}

/*
 * Return an object with a found property of `true` or `false`
 * If found, returns a `path` property of the matched file
 * @param {Array} matches: relative paths to check
 * @param {String} checkPath: prefix for the path
 */
function getMatch(matches, checkPath) {
  if (Array.isArray(matches) && matches.length >= 1) {
    const matchPath = path.resolve(checkPath, matches[matches.length - 1]);
    debug(`matched path: ${matchPath}`);
    return {
      found: true,
      path: matchPath,
    };
  }

  return { found: false };
}

/*
 * Resolves imports in local plugin that begin with `plugin/`
 * NOTE: this does not resolve across different plugins
 * NOTE: when webpack aliases are removed from Kibana, this will no longer be needed.
 */
function resolvePluginsAliasImport(pluginsImport, kibanaPath, rootPath) {
  const { name: packageName } = require(path.resolve(rootPath, 'package.json'));
  const [ pluginName, ...importPaths ] = pluginsImport[1].split('/');
  debug(`resolving plugins import: plugins/${pluginName}/${importPaths.join('/')}`);

  if (packageName === pluginName) {
    const checkPath = path.join(rootPath, 'public');
    const matches = getFileMatches(importPaths, checkPath);
    return getMatch(matches, checkPath);
  } else {
    const checkPath = path.join(kibanaPath, 'src', 'core_plugins', pluginName, 'public');
    const matches = getFileMatches(importPaths, checkPath);
    return getMatch(matches, checkPath);
  }
}

/*
 * Resolves imports where source is a directory with relative path and has a source file with the same name
 * @param {Array} fileImport: source of relative
 * @param {String} file: absolute path to the file making the import
 * @param {String} rootPath: root path of the project code
 */
function resolveLocalRelativeImport(fileImport, file) {
  const sourceBase = path.basename(fileImport);
  const localPath = path.dirname(path.resolve(path.dirname(file), fileImport));
  debug(`resolving relative path: ${localPath}`);
  const matches = getFileMatches(sourceBase, localPath);
  return getMatch(matches, localPath);
}

/*
 * Attempts to resolve imports as webpackShims, either in Kibana or in the local plugin
 * @param {String} source: the module identifier
 * @param {String} kibanaPath: path to Kibana, default or configured
 * @param {String} rootPath: root path of the project code
 */
function resolveWebpackShim(source, kibanaPath, rootPath) {
  const pluginShimPath = path.join(rootPath, 'webpackShims');
  const pluginMatches = getFileMatches(source, pluginShimPath);
  const pluginFileMatches = getMatch(pluginMatches, pluginShimPath);
  debug(`resolveWebpackShim: checking for ${source}`);
  if (pluginFileMatches.found) {
    debug(`resolved webpackShim import in plugin: ${source}`);
    return pluginFileMatches;
  }

  const kibanaShimPath = path.join(kibanaPath, 'webpackShims');
  const kibanaMatches = getFileMatches(source, kibanaShimPath);
  const kibanaFileMatches = getMatch(kibanaMatches, kibanaShimPath);
  if (kibanaFileMatches.found) {
    debug(`resolved webpackShim import in Kibana: ${source}`);
  }
  return kibanaFileMatches;
}

/*
 * Resolves global import aliases that map a prefix to a Kibana source directory
 * Used for UI: https://github.com/elastic/kibana/blob/5c04ff65fbb3b16f8958f8241488463136415670/src/ui/ui_bundler_env.js#L29
 * Used for tests: https://github.com/elastic/kibana/blob/5c04ff65fbb3b16f8958f8241488463136415670/src/core_plugins/tests_bundle/index.js#L70-L75
 */
function resolveKibanaModuleImport(source, kibanaPath) {
  debug(`resolveKibanaModuleImport: checking ${kibanaPath} for ${source}`);
  const checkPaths = [
    path.join(kibanaPath), // ui_framework/components
    path.join(kibanaPath, 'src', 'core_plugins', 'dev_mode', 'public'), // ng_mock
    path.join(kibanaPath, 'src', 'fixtures'),
    path.join(kibanaPath, 'src', 'test_harness', 'public'),
    path.join(kibanaPath, 'src', 'test_utils', 'public'),
    path.join(kibanaPath, 'src', 'ui', 'public'), // ui/something
  ];

  // clean the source
  // strip off leading prefix, if its there (ui, fixtures, test_utils, test_harness)
  const baseSource = source.replace(/^(ui|fixtures|test_utils|test_harness)\//, '');
  let resolved = { found: false };
  checkPaths.forEach(function (checkPath) {
    if (!resolved.found) {
      debug(`resolveKibanaModuleImport: check for ${baseSource} in ${checkPath}`);
      const matches = getFileMatches(baseSource, checkPath);
      const match = getMatch(matches, checkPath);
      if (match.found) {
        debug(`resolving ui import ${source} as ${match.path}`);
        resolved = match;
      }
    }
  });
  return resolved;
}

function stripPath(strip, result) {
  if (!result.found || !strip) return result;
  return {
    found: result.found,
    path: null,
  };
}

/*
 * See
 * https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#resolvesource-file-config---found-boolean-path-string-
 * @param {String} source: the module identifier (./imported-file).
 * @param {String} file: the absolute path to the file making the import (/some/path/to/module.js)
 * @param {Object} config: an object provided via the import/resolver setting.
 */
exports.resolve = function resolveKibanaPath(source, file, config) {
  const rootPath = findRoot(file);
  const kibanaPath = getKibanaPath(config, file, rootPath);

  const loaderPrefix = source.match(/\!*(raw|file.+)\!+(.*)/);
  const loaderPrefixed = (loaderPrefix !== null);
  const realSource = (loaderPrefixed) ? loaderPrefix[2] : source;
  const pathFix = (result) => stripPath(loaderPrefixed, result);

  // check relative paths
  const relativeImport = Boolean(realSource.match(new RegExp('^\\.\\.?/(.*)')));
  if (relativeImport) return pathFix(resolveLocalRelativeImport(realSource, file));

  // check local plugins path (resolves kibana webpack alias)
  const pluginsImport = realSource.match(new RegExp('^plugins/(.*)'));
  if (pluginsImport !== null) return pathFix(resolvePluginsAliasImport(pluginsImport, kibanaPath, rootPath));

  // check for matches in kibana (using kibana webpack aliases)
  const aliasModuleImport = pathFix(resolveKibanaModuleImport(realSource, kibanaPath));
  if (aliasModuleImport.found) return aliasModuleImport;

  return resolveWebpackShim(realSource, kibanaPath, rootPath);
};

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;
