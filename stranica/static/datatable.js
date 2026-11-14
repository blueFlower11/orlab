const obrazac = document.getElementById("obrazac");
const poljeTeksta = document.getElementById("q");
const izbornik = document.getElementById("atribut");
const status = document.getElementById("status");
const zaglavlje = document.querySelector("#tablica thead");
const tijelo = document.querySelector("#tablica tbody");
const preuzmiCsv = document.getElementById("preuzmi-csv");
const preuzmiJson = document.getElementById("preuzmi-json");
const kuciceStupaca = document.getElementById("kucice-stupaca");
const gumbSviStupci = document.getElementById("svi-stupci");

const STUPCI = [...izbornik.options]
    .filter((opcija) => opcija.value)
    .map((opcija) => ({ kljuc: opcija.value, naziv: opcija.textContent }));

const vidljivi = new Set(STUPCI.map((s) => s.kljuc));
let zadnjiZapisi = [];

function vidljiviStupci() {
    return STUPCI.filter((s) => vidljivi.has(s.kljuc));
}

function parametri() {
    const p = new URLSearchParams();
    const tekst = poljeTeksta.value.trim();
    if (tekst) {
        p.set("q", tekst);
        if (izbornik.value) p.set("atribut", izbornik.value);
    }
    const s = p.toString();
    return s ? "?" + s : "";
}

function osvjeziPreuzimanja() {
    const p = new URLSearchParams(parametri());
    if (vidljivi.size < STUPCI.length) {
        p.set("stupci", vidljiviStupci().map((s) => s.kljuc).join(","));
    }
    const s = p.toString();
    const upit = s ? "?" + s : "";
    preuzmiCsv.href = "/api/bica.csv" + upit;
    preuzmiJson.href = "/api/bica.json" + upit;
}

const BROJCANI = new Set([
    "kataloski_broj", "visina_cm", "masa_kg", "zdravlje", "napad", "obrana",
    "specijalni_napad", "specijalna_obrana", "brzina",
]);

function klasaStupca(kljuc) {
    return "stupac-" + kljuc + (BROJCANI.has(kljuc) ? " broj" : "");
}

function iscrtajZaglavlje() {
    const redak = document.createElement("tr");
    for (const stupac of vidljiviStupci()) {
        const th = document.createElement("th");
        th.scope = "col";
        th.className = klasaStupca(stupac.kljuc);
        th.textContent = stupac.naziv;
        redak.appendChild(th);
    }
    zaglavlje.replaceChildren(redak);
}

const OZNAKE = new Set(["primarni_tip", "sekundarni_tip", "rijetkost"]);

function sadrzajCelije(kljuc, vrijednost) {
    if (!OZNAKE.has(kljuc) || !vrijednost) return document.createTextNode(vrijednost ?? "");
    const oznaka = document.createElement("span");
    oznaka.className = "oznaka";
    oznaka.dataset.vrijednost = vrijednost;
    oznaka.textContent = vrijednost;
    return oznaka;
}

function iscrtajRetke(zapisi) {
    const stupci = vidljiviStupci();
    const retci = zapisi.map((zapis) => {
        const tr = document.createElement("tr");
        for (const stupac of stupci) {
            const td = document.createElement("td");
            td.className = klasaStupca(stupac.kljuc);
            td.appendChild(sadrzajCelije(stupac.kljuc, zapis[stupac.kljuc]));
            tr.appendChild(td);
        }
        return tr;
    });
    tijelo.replaceChildren(...retci);
}

async function ucitaj() {
    const upit = parametri();
    status.textContent = "Učitavanje…";
    osvjeziPreuzimanja();
    try {
        const odgovor = await fetch("/api/bica" + upit);
        const podaci = await odgovor.json();
        if (!odgovor.ok) throw new Error(podaci.greska || odgovor.statusText);
        zadnjiZapisi = podaci.zapisi;
        iscrtajRetke(zadnjiZapisi);
        status.textContent = `Prikazano zapisa: ${podaci.broj}.`;
    } catch (greska) {
        zadnjiZapisi = [];
        tijelo.replaceChildren();
        status.textContent = "Greška: " + greska.message;
    }
}

function iscrtajKucice() {
    const kucice = STUPCI.map((stupac) => {
        const oznaka = document.createElement("label");
        const kucica = document.createElement("input");
        kucica.type = "checkbox";
        kucica.value = stupac.kljuc;
        kucica.checked = vidljivi.has(stupac.kljuc);
        oznaka.append(kucica, " " + stupac.naziv);
        return oznaka;
    });
    kuciceStupaca.replaceChildren(...kucice);
}

function primijeniOdabirStupaca() {
    const oznacene = kuciceStupaca.querySelectorAll("input:checked");
    for (const kucica of kuciceStupaca.querySelectorAll("input")) {
        kucica.disabled = oznacene.length === 1 && kucica.checked;
    }
    iscrtajZaglavlje();
    iscrtajRetke(zadnjiZapisi);
    osvjeziPreuzimanja();
}

kuciceStupaca.addEventListener("change", (dogadaj) => {
    const kucica = dogadaj.target;
    if (kucica.checked) vidljivi.add(kucica.value);
    else vidljivi.delete(kucica.value);
    primijeniOdabirStupaca();
});

gumbSviStupci.addEventListener("click", () => {
    for (const stupac of STUPCI) vidljivi.add(stupac.kljuc);
    iscrtajKucice();
    primijeniOdabirStupaca();
});

obrazac.addEventListener("submit", (dogadaj) => {
    dogadaj.preventDefault(); // bez ponovnog učitavanja stranice
    ucitaj();
});

obrazac.addEventListener("reset", () => setTimeout(ucitaj));
poljeTeksta.addEventListener("input", () => {
    if (poljeTeksta.value.trim() === "") ucitaj();
});

iscrtajKucice();
iscrtajZaglavlje();
ucitaj();
