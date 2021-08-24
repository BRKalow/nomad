#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PATH_TO_GITHUB_WORKFLOWS_FOLDER = path_1.default.join(process.cwd(), '..', '.github/workflows');
const WORKFLOW_FILE_INGEST = {
    path: path_1.default.join(PATH_TO_GITHUB_WORKFLOWS_FOLDER, 'versioned-docs.yml'),
    content: `name: Versioned Docs Ingest

on:
  push:
    branches:
      - 'main'
    paths:
      - 'website/version-manifest.json'

jobs:
  ingest-new-versions:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - env:
          HC_AWS_ACCESS_KEY_ID: \${{ secrets.HC_AWS_ACCESS_KEY_ID }}
          HC_AWS_SECRET_ACCESS_KEY: \${{ secrets.HC_AWS_SECRET_ACCESS_KEY }}
        run: npx -p @hashicorp/versioned-docs versioned-docs-ingest \${{ github.event.repository.name }} content
`,
};
const WORKFLOW_FILE_RELEASE = {
    path: path_1.default.join(PATH_TO_GITHUB_WORKFLOWS_FOLDER, 'versioned-docs-release.yml'),
    content: `
name: Versioned Docs Release

on:
  release:
    types: [published]

jobs:
  ingest-latest-version:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - name: Ingest New Version
        env:
          HC_AWS_ACCESS_KEY_ID: \${{ secrets.HC_AWS_ACCESS_KEY_ID }}
          HC_AWS_SECRET_ACCESS_KEY: \${{ secrets.HC_AWS_SECRET_ACCESS_KEY }}
        run: npx -p @hashicorp/versioned-docs versioned-docs-release $GITHUB_REF $GITHUB_SHA \${{ github.event.repository.name }} content
      - name: Commit version-manifest
        uses: EndBug/add-and-commit@v7
        with:
          add: 'version-manifest.json'
          cwd: 'website'
          branch: \${{ github.event.repository.default_branch }}
          author_name: hashibot-web
          author_email: mktg-dev-github-bot@hashicorp.com
          message: 'update version-manifest for release [skip ci]'
`,
};
const WORKFLOW_FILE_SYNC = {
    path: path_1.default.join(PATH_TO_GITHUB_WORKFLOWS_FOLDER, 'versioned-docs-sync.yml'),
    content: `
name: Versioned Docs Sync

on:
  push:
    branches:
      - 'release-**'

jobs:
  ingest-latest-version:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - name: Sync versioned content
        env:
          HC_AWS_ACCESS_KEY_ID: \${{ secrets.HC_AWS_ACCESS_KEY_ID }}
          HC_AWS_SECRET_ACCESS_KEY: \${{ secrets.HC_AWS_SECRET_ACCESS_KEY }}
        run: npx -p @hashicorp/versioned-docs versioned-docs-sync $GITHUB_REF $GITHUB_SHA \${{ github.event.repository.name }}
`,
};
const ASSET_API_ROUTE = {
    path: path_1.default.join(process.cwd(), 'pages', 'api', 'versioned-asset', '[...asset].ts'),
    content: ({ product, }) => `import { makeServeStaticAssets } from '@hashicorp/versioned-docs/server'

export default makeServeStaticAssets('${product}')
`,
};
const MAKEFILE_COMMANDS = `slug=$(display)
ref=$(display)
.PHONY: docs/add-version
# Adds a new version to the version-manifest file, which drives display of past documentation versions on the site.
docs/add-version:
	@echo "==> Adding version $(display) to the manifest..."
	@if [ $(shell git diff --cached | wc -l) -ne 0 ]; then echo "⚠️  staged files found, please commit or unstage these files to add a version" && exit 1; fi
	@docker run \\
		--rm \\
		-it \\
		--volume "$(shell pwd):/website" \\
		--workdir "/website" \\
		docker.mirror.hashicorp.services/node:14-alpine \\
		npx -p @hashicorp/versioned-docs versioned-docs-add-version $(display) $(slug) $(ref)
	git add version-manifest.json
	git commit -m "add version $(display) to version-manifest.json"

.PHONY: docs/remove-version
# Removes a version from the version-manifest file, which drives display of past documentation versions on the site.
docs/remove-version:
	@echo "==> Removing version $(display) from the manifest..."
	@if [ $(shell git diff --cached | wc -l) -ne 0 ]; then echo "⚠️  staged files found, please commit or unstage these files to add a version" && exit 1; fi
	@docker run \\
		--rm \\
		-it \\
		--volume "$(shell pwd):/website" \\
		--workdir "/website" \\
		docker.mirror.hashicorp.services/node:14-alpine \\
		npx -p @hashicorp/versioned-docs versioned-docs-remove-version $(display)
	git add version-manifest.json
	git commit -m "remove version $(display) from version-manifest.json"`;
async function writeFile(fileDef, ctx) {
    console.log(`📝 Writing ${fileDef.path}...`);
    await fs_1.default.promises.mkdir(path_1.default.dirname(fileDef.path), {
        recursive: true,
    });
    const content = typeof fileDef.content === 'function'
        ? fileDef.content(ctx)
        : fileDef.content;
    await fs_1.default.promises.writeFile(fileDef.path, content, {
        encoding: 'utf-8',
    });
}
async function appendToFile(filePath, content) {
    console.log(`📝 Editing ${filePath}...`);
    const currentContent = await fs_1.default.promises.readFile(filePath, {
        encoding: 'utf-8',
    });
    if (currentContent.includes(content))
        return;
    await fs_1.default.promises.appendFile(filePath, `\n${content}`);
}
/**
 * Initializes a project with the necessary files and settings for the versioned docs integration to work
 */
async function main() {
    const [, , product] = process.argv;
    console.log('📖 Initializing versioned docs integration');
    await writeFile(WORKFLOW_FILE_INGEST, { product });
    await writeFile(WORKFLOW_FILE_RELEASE, { product });
    await writeFile(WORKFLOW_FILE_SYNC, { product });
    await writeFile(ASSET_API_ROUTE, { product });
    await appendToFile(path_1.default.join(process.cwd(), 'Makefile'), MAKEFILE_COMMANDS);
    console.log('Set fallback: true in getStaticPaths of any docs pages');
    console.log(`import currentVersion from 'data/version'`);
    console.log('pass `currentVersion` to `generateStaticPaths` and `generateStaticProps`');
    console.log('pass `basePath` to `generateStaticPaths` and `generateStaticProps`');
    console.log('ensure `version-manifest.json` exists');
    console.log('Set ENABLE_VERSIONED_DOCS=true in .env');
    console.log('Remove call to `next export` in build step');
    console.log('Add `HC_AWS_ACCESS_KEY_ID` and `HC_AWS_SECRET_ACCESS_KEY` to the repository secrets as well as Vercel environment variables');
}
main();
