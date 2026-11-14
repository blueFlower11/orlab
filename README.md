# orlab-Pokemon

Repozitorij laboratorijske vježbe FER kolegija Otvoreno računarstvo.

### Verzija v2.0

Jezik: hrvatski

## Skup podataka

Repozitorij sadrži normaliziranu PostgreSQL bazu (mapa [`baza/`](baza/)) i izvorne datoteke za skup **Izmišljena bića**:

- 15 zapisa, s najmanje 10 atributa po zapisu u CSV-u i JSON-u;
- 10 usmjerenih roditelj–dijete veza raspoređenih u pet razvojnih nizova;
- SQL shemu i podatke, upite za izvoz i automatiziranu skriptu (`baza/`);
- CSV/JSON snimke (`izmisljena-bica.csv`, `izmisljena-bica.json`) i SQL ispis baze (`dump.sql`);
- web sučelje 2. vježbe i strojno čitljive metapodatke u obliku JSON Schema (mapa [`stranica/`](stranica/)).

Bića i njihovi nazivi/opisi izvorno su osmišljeni za ovu vježbu. Razvojni nizovi tematski su nadahnuti igrama Pokémon, ali skup ne sadrži službene likove, slike ni službene podatke te nije povezan s vlasnicima te franšize.

### Opis skupa podataka

- nacin razvoja - za sada je osmisljen samo jedan nacin razvoja, a oznacava nacin na koji zamisljena bica prelaze iz jedne forme u drugu
- rijetkost - informacija o tome koliko cesto se izmisljeno bice moze susresti u prirodi
- sposobnost - posebne sposobnosti koje ima bica
- staniste - lokacija na kojoj se bica najcesce moze susresti
- tip-bica - posebna karakteristika koja opisuje bica i grupira ih medusobno
- vrsta-uvijeta-razvoja - posebna karakteristika koja opisuje uvijet razvoja bica
- vrsta-bica - detalji o bicu, naziv, prosjecka velicina i poveznica sa ostalim velicinama

## Web sučelje

Sve datoteke 2. vježbe nalaze se u mapi [`stranica/`](stranica/):

- `stranica/index.html` – opis skupa, poveznice za preuzimanje cijelog skupa (CSV, JSON s datotečnog sustava) i `stranica/schema.json` te poveznica na tablicu.
- `stranica/datatable.html` + `stranica/static/datatable.js` – HTML tablica koja se puni asinkrono (`fetch`) iz baze, obrazac za filtriranje (po svim atributima ili po odabranom atributu) i preuzimanje trenutnog prikaza u CSV i JSON obliku.
- `stranica/server/server.js` – pozadinski poslužitelj (Node.js, Express + `pg`). Filtriranje se obavlja na poslužitelju SQL upitom s `ILIKE` nad izravnanim prikazom iz `baza/izvoz_csv.sql`.

API:

| Putanja | Opis |
| --- | --- |
| `GET /api/bica?q=&atribut=` | filtrirani zapisi kao JSON za tablicu |
| `GET /api/bica.csv?q=&atribut=` | preuzimanje filtriranog prikaza (CSV) |
| `GET /api/bica.json?q=&atribut=` | preuzimanje filtriranog prikaza (JSON) |

Bez `atribut` pretražuje se po svim atributima; prazan `q` vraća sve zapise.

## Pokretanje

U korijenu repozitorija postavite `DATABASE_URL` u okruženju ili u datoteci `.env` (ne sprema se u repozitorij), zatim:

```bash
cd stranica
npm install
npm start
```

i otvorite <http://localhost:3000>.

Baza se postavlja i izvozi ovako:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f baza/shema.sql -f baza/podaci.sql
baza/izvezi.sh
```

## Promjene u odnosu na v1.0

- dodana mapa `stranica/`: `index.html`, `datatable.html`, `static/` (klijentski kôd) i `server/` + `package.json` (pozadinski kôd, Node.js/Express);
- dodana JSON Schema `stranica/schema.json`;
- README ažuriran (struktura repozitorija, pokretanje web sučelja).

## Licencija

Repozitorij koristi licenciju CC0 1.0 Universal iz datoteke [`LICENSE`](LICENSE). Ona se odnosi na izvorni sadržaj ovog skupa; ne daje prava na Pokémon žigove, likove, slike ni druge materijale trećih strana.

## Autor

Viktorija Sturlic-Tupek
