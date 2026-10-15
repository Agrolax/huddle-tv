const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');

/**
 * npm workspaces hoist dependencies to the repo root and symlink
 * packages/* into node_modules/@huddle. Metro needs to watch the root and
 * follow those symlinks.
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
    disableHierarchicalLookup: false,
    // Claude Code worktrees hold copies of our packages; Metro must not index them.
    blockList: [/[\\/]\.claude[\\/]worktrees[\\/].*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
