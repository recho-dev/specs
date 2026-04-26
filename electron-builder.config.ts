import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.forma.app',
  productName: 'Forma',
  directories: {
    output: 'dist',
    buildResources: 'resources',
  },
  files: [
    'out/**',
    '!out/**/*.map',
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [
      { target: 'dmg', arch: ['arm64', 'x64'] },
    ],
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  linux: {
    target: ['AppImage'],
  },
}

export default config
