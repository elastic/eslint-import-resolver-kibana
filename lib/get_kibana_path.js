const { resolve } = require('path');
const debug = require('./debug');

const DEFAULT_PLUGIN_PATH = '../kibana';

/*
 * Resolves the path to Kibana, either from default setting or config
 */
module.exports = function getKibanaPath(config, projectRoot) {
  const inConfig = config != null && config.kibanaPath;

  const kibanaPath = (inConfig)
    ? resolve(projectRoot, config.kibanaPath)
    : resolve(projectRoot, DEFAULT_PLUGIN_PATH);

  debug(`Resolved Kibana path: ${kibanaPath}`);
  return kibanaPath;
};