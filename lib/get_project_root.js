const { dirname, resolve } = require('path');
const { readFileSync } = require('fs');
const pkgUp = require('pkg-up');

// cache projectRoot
let projectRoot;

module.exports = function getProjectRoot(file, config) {
  if (projectRoot) return projectRoot;

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

  projectRoot = getRootPackageDir(dirname(file));
  return projectRoot;
};
