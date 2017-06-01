const { dirname, resolve } = require('path');
const glob = require('glob-all');

const defaults = require('./defaults');

module.exports = function getPlugins(config, kibanaPath, projectRoot) {
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
};
