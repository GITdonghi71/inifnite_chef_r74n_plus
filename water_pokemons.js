
// pokemon_acqua.js
// Infinite Chef — R74n
// Pokémon di tipo Acqua, generazioni I-IX
// Include specie, forme regionali e forme speciali.

const pokemonAcqua = `
Squirtle|#65B8F0
Wartortle|#559FE0
Blastoise|#4689D8
Mega Blastoise|#3978C4
Gigantamax Blastoise|#3978C4
Psyduck|#F5D85E
Golduck|#4C8DD9
Poliwag|#77BFFF
Poliwhirl|#559BE8
Poliwrath|#4775C8
Politoed|#65B8F0
Tentacool|#77B9E8
Tentacruel|#6B8CD8
Slowpoke|#E99B9B
Slowbro|#DB8585
Mega Slowbro|#DB8585
Slowking|#C78DCE
Seel|#E5F4FA
Dewgong|#C5E9F5
Shellder|#8F9DF5
Cloyster|#A1A9E8
Krabby|#E88762
Kingler|#DF7754
Gigantamax Kingler|#DF7754
Horsea|#65BFEA
Seadra|#4D9FD6
Goldeen|#F2A75C
Seaking|#E98B4B
Staryu|#DCA15C
Starmie|#A58BDD
Magikarp|#F5A35A
Gyarados|#5286E8
Mega Gyarados|#3559A8
Lapras|#75BFD8
Gigantamax Lapras|#75BFD8
Ditto|#8C83C6
Vaporeon|#5B9FE8
Omanyte|#8CCFF0
Omastar|#559FE0
Kabuto|#DCA15C
Kabutops|#A58BDD
Totodile|#69B5F0
Croconaw|#559FE0
Feraligatr|#4D8FD8
Chinchou|#75BFD8
Lanturn|#5599D6
Marill|#65B8F0
Azumarill|#4D9FD6
Politoed|#68B887
Wooper|#75BFD8
Quagsire|#559FE0
Slowking|#A58BDD
Qwilfish|#E88762
Qwilfish Hisui|#7C6C9D
Corsola|#F5A3B5
Remoraid|#8CCFF0
Octillery|#E88762
Delibird|#E5F4FA
Mantine|#65B8F0
Kingdra|#477AC0
Suicune|#559FE0
Mudkip|#77BCE8
Marshtomp|#629FD0
Swampert|#4D83BD
Mega Swampert|#477AC0
Lotad|#75BFD8
Lombre|#65B8F0
Ludicolo|#559FE0
Wingull|#E5F4FA
Pelipper|#8CCFF0
Surskit|#75BFD8
Masquerain|#8CCFF0
Carvanha|#559FE0
Sharpedo|#477AC0
Wailmer|#65B8F0
Wailord|#559FE0
Numel|#DCA15C
Barboach|#8CCFF0
Whiscash|#559FE0
Corphish|#E88762
Crawdaunt|#DF7754
Feebas|#9BC9D8
Milotic|#E9A6C7
Castform Pioggia|#65B8F0
Spheal|#8CCFF0
Sealeo|#65B8F0
Walrein|#559FE0
Clamperl|#8CCFF0
Huntail|#559FE0
Gorebyss|#E9A6C7
Relicanth|#8CCFF0
Luvdisc|#E9A6C7
Kyogre|#477AC0
Kyogre Primordiale|#3559A8
Piplup|#8CC9F0
Prinplup|#65A9E0
Empoleon|#477AC0
Bibarel|#8CCFF0
Buizel|#E88762
Floatzel|#DF7754
Shellos Mare Ovest|#E9A6C7
Shellos Mare Est|#75BFD8
Gastrodon Mare Ovest|#E9A6C7
Gastrodon Mare Est|#75BFD8
Finneon|#75BFD8
Lumineon|#559FE0
Mantyke|#8CCFF0
Rotom Wash|#559FE0
Palkia|#E9A6C7
Palkia Forma Origine|#A58BDD
Phione|#65B8F0
Manaphy|#559FE0
Arceus Acqua|#65B8F0
Oshawott|#8CCFF0
Dewott|#6BAFE0
Samurott|#5789C9
Samurott Hisui|#477AC0
Panpour|#65B8F0
Simipour|#559FE0
Tympole|#8CCFF0
Palpitoad|#75BFD8
Seismitoad|#559FE0
Basculin Rosso|#559FE0
Basculin Blu|#477AC0
Basculin Bianco|#E5F4FA
Tirtouga|#8CCFF0
Carracosta|#477AC0
Ducklett|#E5F4FA
Swanna|#8CCFF0
Frillish|#A58BDD
Jellicent|#8CCFF0
Alomomola|#E9A6C7
Keldeo|#65B8F0
Keldeo Risoluto|#559FE0
Froakie|#75BFE8
Frogadier|#65A9E0
Greninja|#4D82C9
Greninja Ash|#3559A8
Binacle|#DCA15C
Barbaracle|#DF7754
Skrelp|#75BFD8
Clauncher|#559FE0
Clawitzer|#477AC0
Volcanion|#DF7754
Popplio|#83D4EF
Brionne|#A6CFF5
Primarina|#A6CFF5
Wishiwashi Solo|#559FE0
Wishiwashi Banco|#477AC0
Mareanie|#A58BDD
Toxapex|#8B91B5
Dewpider|#8CCFF0
Araquanid|#559FE0
Wimpod|#E5F4FA
Golisopod|#559FE0
Pyukumuku|#252525
Bruxish|#E9A6C7
Tapu Fini|#A58BDD
Sobble|#8CCBF0
Drizzile|#70B5E0
Inteleon|#5599D6
Gigantamax Inteleon|#477AC0
Chewtle|#65B8F0
Drednaw|#477AC0
Gigantamax Drednaw|#3559A8
Cramorant|#559FE0
Cramorant Gulping|#559FE0
Cramorant Gorging|#477AC0
Arrokuda|#65B8F0
Barraskewda|#477AC0
Dracovish|#559FE0
Arctovish|#8CCFF0
Eiscue|#E5F4FA
Darmanitan Zen Galar|#DF7754
Urshifu Colpo Rapido|#477AC0
Gigantamax Urshifu Colpo Rapido|#3559A8
Basculegion Maschio|#477AC0
Basculegion Femmina|#A58BDD
Overqwil|#252525
Quaxly|#83D5F5
Quaxwell|#68BFE0
Quaquaval|#4DAAC9
Wiglett|#E5F4FA
Wugtrio|#E5F4FA
Tauros Paldea Acqua|#477AC0
Finizen|#65B8F0
Palafin Zero|#559FE0
Palafin Eroe|#477AC0
Veluza|#A58BDD
Dondozo|#559FE0
Tatsugiri Ricciolo|#E9A6C7
Tatsugiri Cadente|#F5A35A
Tatsugiri Teso|#DF7754
Clodsire|#8C83C6
Walking Wake|#477AC0
Iron Bundle|#8CCFF0
Ogerpon Maschera Pozzo|#559FE0
`.trim();

// Database colori Pokémon ampliato
const coloriExtra = [
    "#65B8F0", // Blu acqua
    "#559FE0", // Blu oceano
    "#477AC0", // Blu profondo
    "#8CCFF0", // Azzurro
    "#A58BDD", // Viola
    "#E9A6C7", // Rosa
    "#68B887", // Verde acqua
    "#F5A35A", // Arancione
    "#75BFD8", // Turchese

    // 10 nuovi colori
    "#00CED1", // Turchese brillante
    "#1E90FF", // Blu dodger
    "#4169E1", // Blu reale
    "#7B68EE", // Viola medio
    "#48D1CC", // Turchese medio
    "#20B2AA", // Verde mare
    "#87CEFA", // Azzurro cielo
    "#6495ED", // Blu fiordaliso
    "#40E0D0", // Turchese
    "#9370DB"  // Viola medio

];


const aggiunti = new Set();

for (const riga of pokemonAcqua.split("\n")) {
    const [nome, colore] = riga.split("|");
    if (!nome || aggiunti.has(nome)) continue;

    aggiunti.add(nome);

    const id = "pokemon_" + nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    addIngredient(id, {
        color: colore || coloriExtra[aggiunti.size % coloriExtra.length],
        type: "water"
    });
}

console.log(
    `Pokémon Acqua registrati: ${aggiunti.size}`
);
