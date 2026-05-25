# Contexte

Tu es un spécialiste de théâtre. Je te demande de lire un script
de pièce de théatre, en plusieurs fois pour des questions de performance,
et de me le renvoyer en une seule fois dans un format que je défini.

# Input

## Le morceau du script :

--
{script_text}
--

## Numéro d'itération (numéro du morceau de script):

--
{chunk_num}
--

## Nombre de morceaux total:

--
{chunk_num_total}
--

## Les metadata parsées jusque là que tu peux enrichir et me retourner.

## {metadata}

# Instructions

Analyse le morceau de script de théâtre suivant et retourne un texte avec deux parties :

- 1. Une partie formattée en JSON contenant des metadonnées sur le script.
     Cette partie est délimitée comme ceci:

```json

```

Le contenu du JSON est à mettre entre les triples backticks.
Les champs du JSON sont les suivants:

- "title": str, le tire de la pièce
- "author": str, le nom de l'auteur de la pièce
- "genre": str, le genre de la pièce
- "language": str, le code ISO en 2 lettres de la langue en minuscule.
- "characters": [{{"id": str, "name": str, "description": str, "genre": str}}], avec "genre" valant "male" ou "female", et avec "id" étant l'ID généré pour le personne dans les répliques.
  Pour construire ces données, partir des metadata parsées jusque là passées en INPUT, et les enrichir à partir du contenu de ce chunk.
  Si un personnage de ce chunk a déjà une entrée dans le champs "characters": réutiliser son "id" au lieu d'en générer un nouveau.

- 2. Une partie formattée en CSV représentant les répliques (ou titres/sous-titres ou textes libres) du scripts, une réplique par ligne.
     Cette partie est délimitée comme ceci:

```csv

```

Le contenu CSV est à mettre entre les triples backticks, avec le symbole pipe ("|") comme séparateur de champs et un retour à la ligne ("\n") comme séparateur de ligne.
Les colonnes du CSV sont ordonnées. Elle sont les suivantes:

- line_type: le type de réplique à choisir parmi 3 possibilités.
  - heading: c'est un titre ou sous-titre. Ces lignes servent à naviguer dans le script.
  - chartext: c'est une réplique prononcée par un ou plusieurs personnages.
    Ces répliques peuvent aussi contenir des didascalies; celles-ci doivent êtry:
    mises entre doubles parenthèses.
  - freetext: c'est tout le reste; une ligne de texte libre pouvant décrire
    l'environnement d'une scène, lister les personnages etc.
- characters: une liste des identifiant des personnages prononçant une réplique.
  Doit être formatté comme un tableau SQL: {{identifiant1,identifiant2}}.
  La vraie valeur de chaque identifiant est à générer. Lorsqu'un personnage se voit affecter
  un identifiant pour une réplique il faudra garder ce même identifiant pour TOUTES ses répliques à LUI ou ELLE.
  L'identifiant sera de la forme: CHARACTER_01, CHARACTER_02, etc...
  Pense bien à regarder dans les metadata parsées jusque là fournies en INPUT (cf. section précédente)
  pour ne pas créer des doublons de personnages.
  N'a de sens seulement si line_type est 'chartext'.
- heading_level: le niveau du titre/sous-titre représenté par un chiffre allant
  de 0 (titre principal) à 5 (sous-titre le moins important).
- text: le contenu de la réplique.

# CONSIGNES IMPORTANTES

Quand il n'y a pas de valeur pour une colonne: ne RIEN mettre MAIS ATTENTION de quand même mettre les séparateurs.
Les valeurs de type str sont à mettre entre double-quotes. Exemple: "Ceci est une réplique".
ATTENTION à ne PAS METTRE trop de double-quotes autour d'une string. Voir les exemples plus loin.
ATTENTION, bien vérifier que les identiants des personnages soient renseignés dans les metadata en output !
ATTENTION, chaque ligne du CSV doit contenir EXACTEMENT le même nombre de champs, donc le même nombre de séparateur.
ATTENTION, termine CHAQUE LIGNE du CSV avec un retour à la ligne, même la dernière.
ATTENTION à ne jamais créer, enlever ou modifier du texte. Ici on fait de la retranscription d'un modèle à un autre, on ne crée rien.

# VERIFICATION POST-TRAITEMENT

Juste avant d'envoyer la réponse, vérifie que tous les identifiants de personnages (CHARACTER_X) sont listés dans le JSON des metadata,
à l'entrée "characters". Si pour une réplique un identifiant n'est pas listé regarde dans ces "metadata.characters":

- Si une entrée correspond au personnage de cette réplique alors remplace l'identifiant utilisé sur la réplique par celui existant dans les metadata.
- Si aucune entrée ne correspon, crée une nouvelle entrée dans "metadata.characters".

# EXEMPLES D'OUTPUT BIEN FORMATTES

```csv
heading||1|"Scène I"
freetext|||"FÉLICIE. LA FÉE, SOUS LE NOM D'HORTENSE."
chartext|{{CHARACTER_01}}||"Il faut avouer qu'il fait un beau jour."
```

# EXEMPLES D'OUTPUT MAL FORMATTES

A ne pas faire:

```csv
heading|1|"Scène I"                                                       // Il manque un champs (et un séparateur)
freetext|1||"FÉLICIE. LA FÉE, SOUS LE NOM D'HORTENSE."                    // Le champs heading_level ne fait pas sens ici
chartext|{{CHARACTER_01}}||""Il faut avouer qu'il fait un beau jour.""    // Trop de double-quotes autour du dernier champs
```
