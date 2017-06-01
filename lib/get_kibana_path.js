const { resolve } = require('path');
const debug = require('./debug');
const defaults = require('./defaults');

let kibanaPath;

/*
 * Resolves the path to Kibana, either from default setting or config
 */
module.exports = function getKibanaPath(config, projectRoot) {
  if (kibanaPath) return kibanaPath;

  const inConfig = config != null && config.kibanaPath;

  kibanaPath = (inConfig)
    ? resolve(config.kibanaPath)
    : resolve(projectRoot, defaults.kibanaPath);

  debug(`Resolved Kibana path: ${kibanaPath}`);
  return kibanaPath;
};