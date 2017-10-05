const { resolve } = require('path');
const debug = require('./debug');

const getKibanaPath = require('./get_kibana_path');
const getPlugins = require('./get_plugins');

module.exports = function getWebpackConfig(source, projectRoot, config) {
  const kibanaPath = getKibanaPath(config, projectRoot);
  const fromKibana = (...path) => resolve(kibanaPath, ...path);

  const alias = {
    // Kibana defaults https://github.com/elastic/kibana/blob/b7f519704ae0d25f085e3278198e2abec1d9ef6e/src/ui/ui_bundler_env.js#L30-L34
    ui: fromKibana('src/ui/public'),
    ui_framework: fromKibana('ui_framework'),
    test_harness: fromKibana('src/test_harness/public'),
    querystring: 'querystring-browser',

    // Dev defaults for test bundle https://github.com/elastic/kibana/blob/b7f519704ae0d25f085e3278198e2abec1d9ef6e/src/core_plugins/tests_bundle/index.js#L70-L75
    ng_mock$: fromKibana('src/core_plugins/dev_mode/public/ng_mock'),
    'angular-mocks$': fromKibana('src/core_plugins/tests_bundle/webpackShims/angular-mocks.js'),
    fixtures: fromKibana('src/fixtures'),
    test_utils: fromKibana('src/test_utils/public'),
  };

  getPlugins(config, kibanaPath, projectRoot).forEach(plugin => {
    alias[`plugins/${plugin.name}`] = plugin.publicDirectory;
  });

  debug('Webpack resolved aliases', alias);

  return {
    context: kibanaPath,
    resolve: {
      extensions: ['.js', '.json'],
      mainFields: ['browser', 'main'],
      modules: [
        'webpackShims',
        'node_modules',
        fromKibana('webpackShims'),
        fromKibana('node_modules'),
      ],
      alias,
      unsafeCache: true,
    },
  };
};
