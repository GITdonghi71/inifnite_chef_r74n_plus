
(() => {
    // Infinite Chef — Pokémon Acqua
    // Richiede addIngredient() già disponibile nel gioco.

    const pokemonAcqua = `
Squirtle|#65B8F0
Wartortle|#559FE0
Blastoise|#4689D8
Mega Blastoise|#3978C4
Psyduck|#F5D85E
Golduck|#4C8DD9
Poliwag|#77BFFF
Poliwhirl|#559BE8
Poliwrath|#4775C8
Tentacool|#77B9E8
Tentacruel|#6B8CD8
Slowpoke|#E99B9B
Slowbro|#DB8585
Seel|#E5F4FA
Dewgong|#C5E9F5
Shellder|#8F9DF5
Cloyster|#A1A9E8
Krabby|#E88762
Kingler|#DF7754
Horsea|#65BFEA
Seadra|#4D9FD6
Goldeen|#F2A75C
Seaking|#E98B4B
Magikarp|#F5A35A
Gyarados|#5286E8
Lapras|#75BFD8
Vaporeon|#5B9FE8
Totodile|#69B5F0
Croconaw|#559FE0
Feraligatr|#4D8FD8
Mudkip|#77BCE8
Marshtomp|#629FD0
Swampert|#4D83BD
Kyogre|#477AC0
Piplup|#8CC9F0
Prinplup|#65A9E0
Empoleon|#477AC0
Oshawott|#8CCFF0
Dewott|#6BAFE0
Samurott|#5789C9
Froakie|#75BFE8
Frogadier|#65A9E0
Greninja|#4D82C9
Popplio|#83D4EF
Brionne|#A6CFF5
Primarina|#A6CFF5
Sobble|#8CCBF0
Drizzile|#70B5E0
Inteleon|#5599D6
Quaxly|#83D5F5
Quaxwell|#68BFE0
Quaquaval|#4DAAC9
Finizen|#65B8F0
Palafin Zero|#559FE0
Palafin Eroe|#477AC0
Dondozo|#559FE0
Walking Wake|#477AC0
Iron Bundle|#8CCFF0
`.trim();

    const nomiRegistrati = new Set();

    for (const riga of pokemonAcqua.split("\n")) {
        const [nome, colore] = riga.split("|");
        if (!nome || nomiRegistrati.has(nome)) continue;

        nomiRegistrati.add(nome);

        const id = "pokemon_" + nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");

        addIngredient(id, {
            color: colore,
            innerColor: colore,
            type: "water"
        });
    }

    console.log(
        "pokemon_acqua.js: " +
        nomiRegistrati.size +
        " ingredienti registrati."
    );
})();

