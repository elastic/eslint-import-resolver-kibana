const { resolve } = require('path');
const debug = require('./debug');
const defaults = require('./defaults');

let kibanaPath;

/*
 * Resolves the path to Kibana, either from default setting or config
 */
module.exports = function getKibanaPath(config, rootPath) {
  if (kibanaPath) return kibanaPath;

  const inConfig = config != null && config.kibanaPath;

  kibanaPath = (inConfig)
    ? resolve(config.kibanaPath)
    : resolve(rootPath, defaults.kibanaPath);

  debug(`resolved kibana path: ${kibanaPath}`);
  return kibanaPath;
};