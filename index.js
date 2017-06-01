const { dirname, resolve } = require('path');
const { readFileSync } = require('fs');
const pkgUp = require('pkg-up');
const glob = require('glob-all');
const webpackResolver = require('eslint-import-resolver-webpack');
const webpack = require('webpack');
const DirectoryNameAsMain = require('@elastic/webpack-directory-name-as-main');
const debug = require('debug')('eslint-import-resolver-kibana');

const defaults = {
  kibanaPath: '../kibana',
  pluginDirs: [],
  pluginPaths: [],
};

/*
 * Resolves the path to Kibana, either from default setting or config
 */
function getKibanaPath(config, rootPath) {
  const inConfig = config != null && config.kibanaPath;

  const kibanaPath = (inConfig)
    ? resolve(config.kibanaPath)
    : resolve(rootPath, defaults.kibanaPath);

  debug(`resolved kibana path: ${kibanaPath}`);
  return kibanaPath;
}

function getProjectRoot(file, config) {
  const { pluginName } = config;

  const getRootPackageDir = (dir) => {
    const pkgFile = pkgUp.sync(dir);
    if (pkgFile === null) throw new Error('Failed to find plugin root');
    if (!pluginName) return dirname(pkgFile);

    // if pluginName is provided, check for match
    const { name } = JSON.parse(readFileSync(pkgFile));
    if (name === pluginName) return dirname(pkgFile);

    // recurse until a matching package.json is found
    return getRootPackageDir(resolve(dirname(pkgFile), '..'));
  };

  return getRootPackageDir(dirname(file));
}

function getPlugins(config, kibanaPath, projectRoot) {
  const pluginDirs = [
    ...(config.pluginDirs || defaults.pluginDirs),
    resolve(kibanaPath, 'plugins'),
    resolve(kibanaPath, 'src', 'core_plugins'),
  ];

  const globPatterns = [
    ...pluginDirs.map(dir => `${dir}/*/package.json`),
    ...(config.pluginPaths || defaults.pluginPaths).map(path => `${path}/package.json`),
  ];
  const globOptions = { cwd: projectRoot };

  return glob.sync(globPatterns, globOptions).map(pkgJsonPath => {
    const path = dirname(pkgJsonPath);
    const pkg = require(pkgJsonPath);
    return {
      name: pkg.name,
      directory: path,
      publicDirectory: resolve(path, 'public'),
    };
  });
}

function getWebpackConfig(source, projectRoot, config) {
  const kibanaPath = getKibanaPath(config, projectRoot);
  const fromKibana = (...path) => resolve(kibanaPath, ...path);

  const aliases = {
    // Kibana defaults https://github.com/elastic/kibana/blob/b7f519704ae0d25f085e3278198e2abec1d9ef6e/src/ui/ui_bundler_env.js#L30-L34
    ui: fromKibana('src/ui/public'),
    test_harness: fromKibana('src/test_harness/public'),
    querystring: 'querystring-browser',

    // Dev defaults for test bundle https://github.com/elastic/kibana/blob/b7f519704ae0d25f085e3278198e2abec1d9ef6e/src/core_plugins/tests_bundle/index.js#L70-L75
    ng_mock$: fromKibana('src/core_plugins/dev_mode/public/ng_mock'),
    'angular-mocks$': fromKibana('src/core_plugins/tests_bundle/webpackShims/angular-mocks.js'),
    fixtures: fromKibana('src/fixtures'),
    test_utils: fromKibana('src/test_utils/public'),
  };

  getPlugins(config, kibanaPath, projectRoot).forEach(plugin => {
    aliases[`plugins/${plugin.name}`] = plugin.publicDirectory;
  });

  return {
    context: kibanaPath,
    plugins: [
      new webpack.ResolverPlugin([
        new DirectoryNameAsMain()
      ]),
    ],
    resolve: {
      extensions: ['.js', '.json', '.jsx', '.less', ''],
      postfixes: [''],
      modulesDirectories: ['webpackShims', 'node_modules'],
      fallback: [
        fromKibana('webpackShims'),
        fromKibana('node_modules')
      ],
      loaderPostfixes: ['-loader', ''],
      root: fromKibana('.'),
      alias: aliases,
      unsafeCache: true,
    },
  };
}

// cache projectRoot and webpackConfig
let webpackConfig;
let projectRoot;

exports.resolve = function resolveKibanaPath(source, file, config) {
  projectRoot = projectRoot || getProjectRoot(file, config);
  webpackConfig = webpackConfig || getWebpackConfig(source, projectRoot, config);

  return webpackResolver.resolve(source, file, {
    config: webpackConfig
  });
};

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;
