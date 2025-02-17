const withHashicorp = require('@hashicorp/nextjs-scripts')
const path = require('path')
const redirects = require('./redirects')
const rewrites = require('./rewrites')

module.exports = withHashicorp({
  defaultLayout: true,
  transpileModules: [
    'is-absolute-url',
    '@hashicorp/react-.*',
    '@hashicorp/versioned-docs',
  ],
  mdx: { resolveIncludes: path.join(__dirname, 'pages/partials') },
})({
  redirects() {
    return redirects
  },
  rewrites() {
    return rewrites
  },
  svgo: {
    plugins: [
      {
        removeViewBox: false,
      },
    ],
  },
  env: {
    SEGMENT_WRITE_KEY: 'qW11yxgipKMsKFKQUCpTVgQUYftYsJj0',
    BUGSNAG_CLIENT_KEY: '4fa712dfcabddd05da29fd1f5ea5a4c0',
    BUGSNAG_SERVER_KEY: '61141296f1ba00a95a8788b7871e1184',
    ENABLE_VERSIONED_DOCS: true,
  },
})
