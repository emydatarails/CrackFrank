> **Superseded:** this repository now deploys on Vercel (see `README.md` → Deploy). Kept for reference only.

# Install Frank's Computer on GitHub — instructions for Claude Code

Paste this whole file into Claude Code, from inside this folder (the unzipped `franks-computer` folder).

---

You are setting up the repository for **Frank's Computer**, a single-file browser game, and publishing it with
GitHub Pages. Everything the game needs is in this folder. Read `README.md` and `CLAUDE.md` first.

## 0. Ask me before you start
Ask me these in one go and wait for the answers:
1. The GitHub owner (my user or an organization) and the repository name. Suggest `franks-computer`.
2. Public or private repository. Note that GitHub Pages on a private repository needs a paid plan, and the game
   must be publicly reachable for the campaign.
3. Whether to use a custom domain (for example `game.packacorp.com`). If yes, which one.
4. The final URLs for `ctaUrl` (ending-screen button), `ctaLabel`, and `seriesUrl` (the "Frank Is Missing" series
   page, or empty). If I don't know yet, keep the current values in `config.json`.

## 1. Check the tools
- `git`, `python3` (3.8+) and `node` must be available. `gh` (GitHub CLI) is preferred. If `gh` is missing or not
  logged in, ask me to run `gh auth login`, or fall back to creating the repository in the browser and adding
  the remote by hand.

## 2. Configure
- Update `config.json` with my answers. Set `meta.url` to the final public URL of the game
  (`https://<owner>.github.io/<repo>/`, or `https://<custom-domain>/`) so the share card uses absolute links.
- If I chose a custom domain, create a file named `CNAME` at the repository root that contains only the domain.
- Run `python3 build.py` and `node test/excel_engine_test.js`. The test must print `ALL PASS`. Optionally run
  `pip install playwright && python3 test/play.py` (headless Chromium full playthrough; if a browser download is
  needed, `python3 -m playwright install chromium`). It must end with `no console errors`.

## 3. Create the repository and push
```bash
git init -b main
git add -A
git commit -m "Frank's Computer: initial import"
gh repo create <owner>/<repo> --<public|private> --source . --remote origin --push
```

## 4. Turn on GitHub Pages (source: GitHub Actions)
```bash
gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow   # if it already exists, use -X PUT
```
If the API call fails, tell me to open **Settings → Pages** and set **Source** to **GitHub Actions**.
Then trigger and watch the deploy:
```bash
gh workflow run deploy.yml     # the push already triggers it; this is a manual re-run if needed
gh run watch
```

## 5. Custom domain (only if I chose one)
- Set it on the Pages site: `gh api -X PUT repos/<owner>/<repo>/pages -f cname=<domain>`.
- Tell me exactly which DNS record to create: a `CNAME` record for the subdomain that points to `<owner>.github.io`.
  An apex domain needs A records instead; list GitHub's current Pages IPs from the GitHub docs rather than from memory.
- After DNS resolves, enable **Enforce HTTPS** (`gh api -X PUT repos/<owner>/<repo>/pages -F https_enforced=true`).

## 6. Verify
- Open the live URL. The intro screen "Packa Corporation · CASE FILE" must appear, and `?dev=1` must NOT skip it
  on the public site (dev shortcuts are local only).
- Check that `og-image.png` loads from the live URL and that the page's `og:image` tag is an absolute URL.
- In the game, log in (password `sedalia1958`) and open Internet Explorer. If packacorp.com doesn't show inside it,
  the Packa site is blocking framing. Tell me to allow the game's domain in the Packa site's
  `Content-Security-Policy: frame-ancestors` (or remove `X-Frame-Options`). Don't change the game to work around it.
- Report back: the repository URL, the live game URL, and anything I still need to do (DNS, CTA URLs).

## Rules
- Don't hand-edit `dist/index.html`. Change `src/` or `config.json` and rebuild.
- Don't add frameworks, bundlers or npm dependencies.
- Don't commit secrets or tokens.
