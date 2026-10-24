# Sovereign templates

This repository is the template source for the SovereignBaaS **Functions** page. It
feeds Appwrite's `POST /functions/{id}/deployments/template` endpoint, which Appwrite
fetches anonymously from a **public** Git tag, so the repository must stay public.

## Provenance

- **Upstream:** [`appwrite/templates`](https://github.com/appwrite/templates) (MIT, see
  `LICENSE`).
- **History:** the full upstream history is preserved unmodified — 942 commits and all
  16 release tags (`0.1.0` … `1.4.1`).
- **Sovereign commit:** this repository adds a single commit on top of upstream `main`
  that (1) adds this `SOVEREIGN.md`, and (2) removes the upstream `.github/` directory
  so the mirror cannot open or auto-merge pull requests from upstream.

The release **tags** (`1.2.0`, `1.3.0`, …) still point at the original upstream commits,
so template code deployed by the Functions page is byte-for-byte upstream.

## Updating from upstream

```bash
git remote add upstream https://github.com/appwrite/templates.git
git fetch upstream --tags
git merge upstream/main
# re-apply this repo's changes: keep SOVEREIGN.md, remove .github/ if it reappears
git push origin main --tags
```

## License

Upstream `appwrite/templates` is MIT; its `LICENSE` is kept verbatim. The additions in
this repository (this file) are likewise MIT.
