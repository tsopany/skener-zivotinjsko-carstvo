# Kod skener

A bookmarklet for the [Životinjsko carstvo digital album](https://digitalni-album.igraoni.ca). You photograph your cards, Claude reads the dot-matrix codes, and they're submitted to your album.

There's no server. Everything runs in your browser, using **your own** Anthropic API key.

**Setup page:** https://skener.tsopany.com

## How it works

- The bookmarklet loads `docs/scanner.js` (served by GitHub Pages) into the album page.
- **Photos → codes.** The photo is resized in the browser and sent straight to the Anthropic API with the user's key. Claude returns every 11-character code it finds.
- **Submitting.** Codes go through the site's own form (session cookie + CSRF token, `Accept: text/javascript`), one every 0.8 s, exactly like typing them by hand. `success-message` in the reply means accepted, `error-message` means rejected.
- **Storage.** The API key, model choice and accepted codes are stored in `localStorage` on the album site's origin. Nothing is sent anywhere except the album site and `api.anthropic.com`.

## Publishing

- GitHub Pages serves the `/docs` folder of `main` (Settings → Pages).
- `docs/CNAME` points it to `skener.tsopany.com`.
- In Cloudflare DNS there's a `CNAME` record from `skener` to `<github-user>.github.io`.

## License

GPL-3.0, see `LICENSE`.

## Notes

- Haiku is the default model. If it misreads codes, switch to Sonnet in ⚙️.
- Users should set a monthly spend limit on their API key in the Anthropic Console.
- The key sits in the album site's `localStorage`, so any script running on that site could read it. A key with a low spend limit keeps that risk small.
- Unofficial and not affiliated with Kraš. It only submits codes from cards the user photographs.
