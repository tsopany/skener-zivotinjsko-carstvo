# Kod skener

Bookmarklet za [digitalni album Životinjsko carstvo](https://digitalni-album.igraoni.ca). Slikaš kartice, Claude pročita kodove odštampane tačkastim slovima, a oni se upišu u tvoj album.

Nema servera. Sve radi u tvom browseru, sa **tvojim** Anthropic API ključem.

**Stranica za podešavanje:** https://skener.tsopany.com

## Kako radi

- Bookmarklet učitava `docs/scanner.js` (sa GitHub Pages) u bilo koju stranicu albuma.
- **Slika → kodovi.** Slika se smanji u browseru i šalje direktno Anthropic API-ju sa ključem korisnika. Claude vraća sve kodove od 11 znakova koje nađe.
- **Upisivanje.** Kodovi idu preko forme samog sajta (sesijski kolačić + CSRF token, `Accept: text/javascript`), jedan na svakih 0,8 s, isto kao kad ih ručno upišeš. Ako na stranici nema forme, šalju se na `/codes` sa tokenom iz `<meta name="csrf-token">`. `success-message` u odgovoru znači da je kod prihvaćen, `error-message` da nije.
- **Već upisani kodovi.** Panel pročita `/log` sajta, gde se vidi prvih 8 znakova svakog upisanog koda. Kod koji počinje isto označava se sa ↺ kao verovatno već upisan, ali se ipak šalje, jer više kodova može imati isti početak.
- **Čuvanje.** API ključ i izabrani model čuvaju se u `localStorage` sajta albuma. Ništa se ne šalje nikome osim sajtu albuma i `api.anthropic.com`.

## Objavljivanje

- Svaki push na `main` pokreće `.github/workflows/pages.yml`: upisuje verziju u `docs/scanner.js` i objavljuje folder `/docs` na GitHub Pages (Settings → Pages → Source: *GitHub Actions*).
- Verzija je u obliku `GG.NN.D.SSMM`: godina, ISO nedelja, dan u nedelji (1 = ponedeljak … 7 = nedelja) i vreme po Beogradu. Lokalno, bez deploya, piše `dev`.
- `docs/CNAME` ga usmerava na `skener.tsopany.com`.
- U Cloudflare DNS-u postoji `CNAME` zapis od `skener` ka `tsopany.github.io`.

## Licenca

GPL-3.0, vidi `LICENSE`.

## Napomene

- Podrazumevani model je Haiku. Ako pogrešno čita kodove, prebaci na Sonnet u ⚙️.
- Korisnici bi trebalo da postave mesečni limit potrošnje za svoj ključ u Anthropic konzoli.
- Ključ stoji u `localStorage` sajta albuma, pa bi ga svaka skripta na tom sajtu mogla pročitati. Ključ sa niskim limitom potrošnje drži taj rizik malim.
- Nezvaničan alat, nije povezan sa Krašom. Upisuje samo kodove sa kartica koje korisnik slika.
