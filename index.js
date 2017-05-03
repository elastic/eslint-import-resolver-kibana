const path = require('path');
const findRoot = require('find-root');
const glob = require('glob');
const debug = require('debug')('eslint-import-resolver-kibana');

const defaults = {
  kibanaPath: '../kibana',
};

function getKibanaPath(config, file) {
  if (config != null && config.kibanaPath) {
    return config.kibanaPath;
  }

  const rootPath = findRoot(file);
  return path.resolve(rootPath, defaults.kibanaPath);
}

function getGlobPattern(source) {
  return `./${source}{*(.js),/${source}.js,/index.js}`;
}

function getFilePath(source, kibanaPath) {
  const uiImport = source.match(new RegExp('^ui/(.*)'));

  if (uiImport !== null) {
    debug(`import is a ui/ import:`, source);
    const baseImport = uiImport[1];
    const checkPath = path.join(kibanaPath, 'src', 'ui', 'public');
    const globPattern = getGlobPattern(uiImport[1]);
    const globOptions = {
      cwd: path.resolve(checkPath),
    };

    const matches = glob.sync(globPattern, globOptions);
    debug(`checking in ${globOptions.cwd}, matched ${matches.length}`);

    if (matches.length >= 1) {
      debug(matches);
      return {
        found: true,
        path: path.resolve(globOptions.cwd, matches[matches.length - 1]),
      }
    }
  }
  return { found: false };
}

exports.interfaceVersion = 2

exports.resolve = function resolveKibanaPath(source, file, config) {
  const kibanaPath = getKibanaPath(config, file);
  return getFilePath(source, kibanaPath);
};
