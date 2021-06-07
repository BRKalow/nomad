# Default: run this if working on the website locally to run in watch mode.
website:
	@echo "==> Downloading latest Docker image..."
	@docker pull hashicorp/nomad-website
	@echo "==> Starting website in Docker..."
	@docker run \
		--interactive \
		--rm \
		--tty \
		--workdir "/website" \
		--volume "$(shell pwd):/website" \
		--volume "/website/node_modules" \
		--publish "3000:3000" \
		hashicorp/nomad-website \
		npm start

# This command will generate a static version of the website to the "out" folder.
build:
	@echo "==> Downloading latest Docker image..."
	@docker pull hashicorp/nomad-website
	@echo "==> Starting build in Docker..."
	@docker run \
		--interactive \
		--rm \
		--tty \
		--workdir "/website" \
		--volume "$(shell pwd):/website" \
		--volume "/website/node_modules" \
		hashicorp/nomad-website \
		npm run static

# If you are changing node dependencies locally, run this to generate a new
# local Docker image with the dependency changes included.
build-image:
	@echo "==> Building Docker image..."
	@docker build -t hashicorp-nomad-website-local .

# Use this if you have run `build-image` to use the locally built image
# rather than our CI-generated image to test dependency changes.
website-local:
	@echo "==> Starting website in Docker..."
	@docker run \
		--interactive \
		--rm \
		--tty \
		--workdir "/website" \
		--volume "$(shell pwd):/website" \
		--volume "/website/node_modules" \
		--publish "3000:3000" \
		hashicorp-nomad-website-local \
		npm start

.DEFAULT_GOAL := website
.PHONY: build build-image website website-local

slug=$(display)
ref=$(display)
.PHONY: docs/add-version
# Adds a new version to the version-manifest file, which drives display of past documentation versions on the site.
docs/add-version:
	@echo "==> Adding version $(display) to the manifest..."
	@if [ $(shell git diff --cached | wc -l) -ne 0 ]; then echo "⚠️  staged files found, please commit or unstage these files to add a version" && exit 1; fi
	@docker run \
		--rm \
		-it \
		--volume "$(shell pwd):/website" \
		--workdir "/website" \
		docker.mirror.hashicorp.services/node:14-alpine \
		npx -p @hashicorp/versioned-docs versioned-docs-add-version $(display) $(slug) $(ref)
	git add version-manifest.json
	git commit -m "add version $(display) to version-manifest.json"

.PHONY: docs/remove-version
# Removes a version from the version-manifest file, which drives display of past documentation versions on the site.
docs/remove-version:
	@echo "==> Removing version $(display) from the manifest..."
	@if [ $(shell git diff --cached | wc -l) -ne 0 ]; then echo "⚠️  staged files found, please commit or unstage these files to add a version" && exit 1; fi
	@docker run \
		--rm \
		-it \
		--volume "$(shell pwd):/website" \
		--workdir "/website" \
		docker.mirror.hashicorp.services/node:14-alpine \
		npx -p @hashicorp/versioned-docs versioned-docs-remove-version $(display)
	git add version-manifest.json
	git commit -m "remove version $(display) from version-manifest.json"