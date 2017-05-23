const path = require('path');
const findRoot = require('find-root');
const glob = require('glob');
const debug = require('debug')('eslint-import-resolver-kibana');

const defaults = {
  kibanaPath: '../kibana',
};

function getKibanaPath(config, file, rootPath) {
  if (config != null && config.kibanaPath) {
    return path.resolve(config.kibanaPath);
  }

  const kibanaPath = path.resolve(rootPath, defaults.kibanaPath);
  debug(`resolved kibana path: ${kibanaPath}`);

  return kibanaPath;
}

function getGlobPattern(source) {
  if (Array.isArray(source)) {
    const rootPath = path.join(...source);
    const filename = source[source.length - 1];
    return `./${rootPath}{*(.js),/${filename}.js,/index.js}`;
  } else {
    return `./${source}{*(.js),/${source}.js,/index.js}`;
  }
}

function getFileMatches(baseImport, checkPath) {
  const globPattern = getGlobPattern(baseImport);
  const globOptions = {
    cwd: path.resolve(checkPath),
  };

  const matches = glob.sync(globPattern, globOptions);
  debug(`checking in ${checkPath}, matched ${matches.length}`);

  return matches;
}

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

function resolveUiImport(uiImport, kibanaPath) {
  const baseImport = uiImport[1];
  debug(`resolving ui import: ui/${baseImport}`);
  const checkPath = path.join(kibanaPath, 'src', 'ui', 'public');
  const matches = getFileMatches(baseImport, checkPath);
  return getMatch(matches, checkPath);
}

function resolvePluginsImport(pluginsImport, kibanaPath, rootPath) {
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

  return getMatch();
}

exports.interfaceVersion = 2

exports.resolve = function resolveKibanaPath(source, file, config) {
  const uiImport = source.match(new RegExp('^ui/(.*)'));
  const pluginsImport = source.match(new RegExp('^plugins/(.*)'));
  const rootPath = findRoot(file);
  const kibanaPath = getKibanaPath(config, file, rootPath);

  if (uiImport !== null) return resolveUiImport(uiImport, kibanaPath)
  if (pluginsImport !== null) return resolvePluginsImport(pluginsImport, kibanaPath, rootPath);
  return getMatch();
};
