# Release 1.0.0

This workspace initially had no commits, Git remote, Git author identity, or version file. Version 1.0.0 is its first tracked release.

## Build

Requires Node.js 24; no third-party package installation is needed.

```text
node build.mjs
node build-offices.mjs
node build-offices-dark.mjs
node build-redesign.mjs
node build-pages.mjs
node verify.mjs
node verify-offices.mjs
node verify-pages.mjs
```

Only `dist/` is uploaded to Pages. Its root `index.html` is the redesigned website. The detailed sitemap is served at `sitemap.html`, with local links rewritten to preserve navigation. Version metadata is available at `version.json` and in each HTML document's `meta[name=version]`.

## GitHub prerequisites

The repository URL and commit author must be provided before committing and pushing. Inspect the remote history before integrating; do not force-push an existing repository. In the repository Pages settings, the publishing source must be GitHub Actions. The workflow builds pull requests and deploys only the repository's default branch.

After pushing, wait for the Pages workflow to succeed, then verify the live URL returns HTTP 200, `version.json` reports `1.0.0`, and the live homepage contains the enquiry form and version metadata. A local build is not proof of deployment.

The published website is a proposal; the enquiry form prepares a draft and does not submit to a backend. No custom domain or production Northgo DNS changes are included.
