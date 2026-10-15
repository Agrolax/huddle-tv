const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');

// Claude Code worktrees hold copies of our packages; Metro must not index them.
// When this checkout is itself a worktree, block only the others.
const ownWorktree = workspaceRoot.match(/[\\/]\.claude[\\/]worktrees[\\/]([^\\/]+)$/)?.[1];
const worktrees = ownWorktree
  ? new RegExp(`[\\\\/]\\.claude[\\\\/]worktrees[\\\\/](?!${ownWorktree.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\\\/]).*`)
  : /[\\/]\.claude[\\/]worktrees[\\/].*/;

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
    blockList: [worktrees],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
