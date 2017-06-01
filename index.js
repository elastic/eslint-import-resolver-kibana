const webpackResolver = require('eslint-import-resolver-webpack');
const getProjectRoot = require('./lib/get_project_root');
const getWebpackConfig = require('./lib/get_webpack_config');

// cache expensive resolution results
let projectRoot;
let webpackConfig;

exports.resolve = function resolveKibanaPath(source, file, config) {
  projectRoot = projectRoot || getProjectRoot(file, config);
  webpackConfig = webpackConfig || getWebpackConfig(source, projectRoot, config);

  return webpackResolver.resolve(source, file, {
    config: webpackConfig
  });
};

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;
