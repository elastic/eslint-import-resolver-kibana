const { dirname, resolve } = require('path');
const findRoot = require('find-root');
const glob = require('glob-all');
const webpackResolver = require('eslint-import-resolver-webpack');
const webpack = require('webpack');
const DirectoryNameAsMain = require('@elastic/webpack-directory-name-as-main');
const debug = require('debug')('eslint-import-resolver-kibana');

const defaults = {
  kibanaPath: '../kibana',
  pluginPaths: [],
  pluginDirs: [
    '../kibana/plugins',
    '../kibana/core_plugins',
  ]
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

function getPlugins(config, projectRoot) {
  const globPatterns = [
    ...(config.pluginDirs || defaults.pluginDirs).map(dir => `${dir}/*/package.json`),
    ...(config.pluginPaths || defaults.pluginPaths).map(path => `${path}/package.json`)
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
    ui: fromKibana('src/ui/public'),
    test_harness: fromKibana('src/test_harness/public'),
    querystring: 'querystring-browser',
  };
  
  getPlugins(config, projectRoot).forEach(plugin => {
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

// use version 2 of the resolver interface, https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md#interfaceversion--number
exports.interfaceVersion = 2;

let webpackConfig;
exports.resolve = function resolveKibanaPath(source, file, config) {
  if (!webpackConfig) {
    webpackConfig = getWebpackConfig(source, findRoot(file), config);
  }

  return webpackResolver.resolve(source, file, {
    config: webpackConfig
  });
};
