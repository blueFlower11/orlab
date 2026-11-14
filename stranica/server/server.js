// Poslužitelj za 2. laboratorijsku vježbu.
//
// Poslužuje statične datoteke (index.html, datatable.html, CSV, JSON, schema.json)
// i REST sučelje koje podatke čita iz PostgreSQL baze:
//
//   GET /api/bica?q=<tekst>&atribut=<naziv>       -> JSON za tablicu
//   GET /api/bica.csv?q=<tekst>&atribut=<naziv>   -> preuzimanje filtriranog prikaza (CSV)
//   GET /api/bica.json?q=<tekst>&atribut=<naziv>  -> preuzimanje filtriranog prikaza (JSON)
//
// Bez parametra `atribut` traži se po svim atributima.
// Preuzimanja primaju i `stupci=<a,b,...>` da sadrže samo stupce prikazane u tablici.
// Pokretanje:  npm start

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

const STRANICA = path.join(__dirname, "..");
const KORIJEN = path.join(STRANICA, "..");
const PORT = Number(process.env.PORT) || 3000;

// Učitava DATABASE_URL iz .env ako nije postavljen u okruženju (Node >= 20.12).
if (!process.env.DATABASE_URL && fs.existsSync(path.join(KORIJEN, ".env"))) {
    process.loadEnvFile(path.join(KORIJEN, ".env"));
}
if (!process.env.DATABASE_URL) {
    console.error("Postavite DATABASE_URL u okruženju ili u datoteci .env.");
    process.exit(1);
}

require("pg").types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ATRIBUTI = [
    "kataloski_broj", "naziv", "opis", "visina_cm", "masa_kg", "staniste",
    "rijetkost", "primarni_tip", "sekundarni_tip", "sposobnosti", "zdravlje",
    "napad", "obrana", "specijalni_napad", "specijalna_obrana", "brzina",
    "roditelji", "djeca", "uvjeti_razvoja",
];

function ucitajUpitPregleda() {
    const sql = fs.readFileSync(path.join(KORIJEN, "baza", "izvoz_csv.sql"), "utf8");
    const pocetak = sql.indexOf("COPY (");
    const kraj = sql.lastIndexOf(") TO STDOUT");
    if (pocetak < 0 || kraj < 0) {
        throw new Error("baza/izvoz_csv.sql nema očekivani oblik COPY ( ... ) TO STDOUT.");
    }
    return sql.slice(pocetak + "COPY (".length, kraj);
}
const UPIT_PREGLEDA = ucitajUpitPregleda();

async function dohvatiBica(tekst, atribut) {
    tekst = (tekst || "").trim();
    let sql = `SELECT * FROM (${UPIT_PREGLEDA}) AS pregled`;
    const parametri = [];
    if (tekst) {
        const uzorak = "%" + tekst.replace(/[\\%_]/g, (z) => "\\" + z) + "%";
        if (atribut) {
            sql += ` WHERE pregled.${atribut}::text ILIKE $1`;
        } else {
            const svi = ATRIBUTI.map((a) => `pregled.${a}::text`).join(", ");
            sql += ` WHERE concat_ws(' ', ${svi}) ILIKE $1`;
        }
        parametri.push(uzorak);
    }
    sql += " ORDER BY pregled.kataloski_broj";
    const rezultat = await pool.query(sql, parametri);
    return rezultat.rows;
}

function csvPolje(vrijednost) {
    const s = vrijednost === null || vrijednost === undefined ? "" : String(vrijednost);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function uCsv(zapisi, stupci) {
    const retci = [stupci.join(",")];
    for (const zapis of zapisi) {
        retci.push(stupci.map((a) => csvPolje(zapis[a])).join(","));
    }
    return retci.join("\n") + "\n";
}

function samoStupci(zapisi, stupci) {
    return zapisi.map((zapis) => Object.fromEntries(stupci.map((a) => [a, zapis[a]])));
}

const app = express();

async function filtriraj(req, res, next) {
    const tekst = typeof req.query.q === "string" ? req.query.q : "";
    const atribut = typeof req.query.atribut === "string" ? req.query.atribut : "";
    if (atribut && !ATRIBUTI.includes(atribut)) {
        return res.status(400).json({ greska: `Nepoznat atribut: ${atribut}` });
    }
    const trazeni = typeof req.query.stupci === "string" && req.query.stupci
        ? req.query.stupci.split(",")
        : ATRIBUTI;
    const nepoznati = trazeni.filter((a) => !ATRIBUTI.includes(a));
    if (nepoznati.length) {
        return res.status(400).json({ greska: `Nepoznati stupci: ${nepoznati.join(", ")}` });
    }
    res.locals.stupci = ATRIBUTI.filter((a) => trazeni.includes(a));
    try {
        res.locals.zapisi = await dohvatiBica(tekst, atribut);
        next();
    } catch (e) {
        console.error("Greška baze:", e.message);
        res.status(500).json({ greska: "Greška pri čitanju iz baze." });
    }
}

app.get("/api/bica", filtriraj, (req, res) => {
    res.json({ broj: res.locals.zapisi.length, zapisi: res.locals.zapisi });
});

app.get("/api/bica.csv", filtriraj, (req, res) => {
    res.attachment("izmisljena-bica-filtrirano.csv");
    res.type("text/csv; charset=utf-8").send(uCsv(res.locals.zapisi, res.locals.stupci));
});

app.get("/api/bica.json", filtriraj, (req, res) => {
    res.attachment("izmisljena-bica-filtrirano.json");
    const zapisi = samoStupci(res.locals.zapisi, res.locals.stupci);
    res.type("application/json; charset=utf-8").send(JSON.stringify(zapisi, null, 2));
});

const STATICNE = {
    "index.html": STRANICA,
    "datatable.html": STRANICA,
    "schema.json": STRANICA,
    "izmisljena-bica.csv": KORIJEN,
    "izmisljena-bica.json": KORIJEN,
    "LICENSE": KORIJEN,
};
app.get("/", (req, res) => res.sendFile(path.join(STRANICA, "index.html")));
for (const [datoteka, mapa] of Object.entries(STATICNE)) {
    app.get("/" + datoteka, (req, res) => res.sendFile(path.join(mapa, datoteka)));
}
app.use("/static", express.static(path.join(STRANICA, "static")));

app.listen(PORT, () => console.log(`Poslužitelj radi na http://localhost:${PORT}`));
