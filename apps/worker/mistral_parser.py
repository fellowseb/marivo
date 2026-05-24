import json
import uuid
from mistralai.client import Mistral, errors
from dotenv import load_dotenv
import os
import re
import logging

load_dotenv()

# import os
#
# from mistralai.client import Mistral
#
# client = Mistral(api_key=os.environ.get("MISTRAL_API_KEY"))
#
# inputs = [
#     {"role":"user","content":"Hello!"}
# ]
#
# response = client.beta.conversations.start(
#     agent_id="ag_019e5bd25b76760e98239377ba992e41",
#     agent_version=0,
#     inputs=inputs,
# )
#
# print(response)


class MistralParser:
    def __init__(self):
        logging.basicConfig(level=logging.DEBUG)
        self.client = Mistral(
            api_key=os.getenv('MISTRAL_API_KEY'),
            debug_logger=logging.getLogger("mistralai.client")
        )

    def parse_script(self, script_text):
        try:
            prompt = """
            Analyse le script de théâtre suivant et retourne un texte avec deux parties :
            - 1. Une partie formattée en JSON contenant des metadonnées sur le script.
            Cette partie est délimitée comme ceci:

            ```json
            ```

            Le contenu du JSON est à mettre entre les triples backticks.
            Les champs du JSON sont les suivants:
            - "title": str
            - "author": str
            - "genre": str
            - "language": str, le code ISO en 2 lettres de la langue en minuscule.
            - "characters": [{{"id": str, "name": str, "description": str, "genre": str}}], avec "genre" valant "male" ou "female", et avec "id" étant l'ID généré pour le personne dans les répliques.
            Ne PAS mettre de personnages ne se trouvant PAS dans les répliques.

            - 2. Une partie formattée en CSV représentant les répliques (ou titres/sous-titres ou textes libres) du scripts, une réplique par ligne.
            Cette partie est délimitée comme ceci:
            ```csv
            ```

            Le contenu CSV est à mettre entre les triples backticks, avec le point virgule (";") comme séparateur de champs et un retour à la ligne ("\n") comme séparateur de ligne.
            Les colonnes du CSV sont ordonnées. Elle sont les suivantes:
            - line_type: le type de réplique à choisir parmi 3 possibilités.
                * heading: c'est un titre ou sous-titre. Ces lignes servent à naviguer dans le script.
                * chartext: c'est une réplique prononcée par un ou plusieurs personnages.
                Ces répliques peuvent aussi contenir des didascalies; celles-ci doivent êtry:
                mises entre doubles parenthèses.
                * freetext: c'est tout le reste; une ligne de texte libre pouvant décrire
                l'environnement d'une scène, lister les personnages etc.
            - characters: une liste des identifiant des personnages prononçant une réplique.
            Doit être formatté comme un tableau SQL: {{identifiant1,identifiant2}}.
            La vraie valeur de chaque identifiant est à générer. Lorsqu'un personnage se voit affecter
            un identifiant pour une réplique il faudra garder ce même identifiant pour TOUTES ses répliques à LUI ou ELLE.
            L'identifiant sera de la forme: CHARACTER_1, CHARACTER_2, etc...
            N'a de sens seulement si line_type est 'chartext'.
            - heading_level: le niveau du titre/sous-titre représenté par un chiffre allant
            de 0 (titre principal) à 5 (sous-titre le moins important).
            - text: le contenu de la réplique.

            Quand il n'y a pas de valeur pour une colonne: ne RIEN mettre MAIS ATTENTION
            de quant même mettre les séparateurs.
            Les valeurs de type str sont à mettre entre double-quotes. Exemple: "Ceci est une réplique".
            ATTENTION à ne PAS METTRE trop de double-quotes.

            ATTENTION, bien vérifier que les UUIDs des personnages soient renseignés dans les metadata !
            ATTENTION, chaque ligne du CSV doit contenir EXACTEMENT le même nombre de champs, donc le même nombre de séparateur.
            ATTENTION, termine CHAQUE LIGNE du CSV avec un retour à la ligne, même la dernière.

            Voici des exemples de lignes bien formattées:

            ```csv
            heading;;1;"Scène I"
            freetext;;;"FÉLICIE. LA FÉE, SOUS LE NOM D'HORTENSE."
            chartext;{{CHARACTER_1}};;"Il faut avouer qu'il fait un beau jour."
            ```

            Voici des exemples de lignes MAL formattées:

            ```csv
            heading;1;"Scène I"                                                                             // Il manque un champs (et un séparateur)
            freetext;1;;"FÉLICIE. LA FÉE, SOUS LE NOM D'HORTENSE."                                          // Le champs heading_level ne fait pas sens ici
            chartext;{{CHARACTER_1}};;""Il faut avouer qu'il fait un beau jour.""    // Trop de double-quotes autour du dernier champs
            ```

            Script :
            ---
            {script_text}
            ---
            """.format(script_text="""
FÉLICIE

Comédie en un acte et en prose

 de Marivaux

 Imprimée dans le Mercure de France de mars 1757. Lecture et réception à la Comédie-Française le 
5 mars 1757. Retraitement à partir des Œuvres complètes, aux Editions Vve Duchesne de 1781.

PERSONNAGES
Félicie.
Lucidor.
La Fée, sous le nom d'Hortense.
La Modestie.
Diane.
Troupe de chasseurs. 

Domaine public – Texte retraité par Libre Théâtre

1

Scène I

FÉLICIE. LA FÉE, SOUS LE NOM D'HORTENSE.

FÉLICIE.
Il faut avouer qu'il fait un beau jour.

HORTENSE.
Aussi y a-t-il longtemps que nous nous promenons.

FÉLICIE.
Aussi le plaisir d'être avec vous, qui est toujours si grand pour moi, ne m'a-t-il jamais été si 
sensible.

HORTENSE.
Je crois, en effet, que vous m'aimez, Félicie.

FÉLICIE.
Vous croyez, Madame ! Quoi ! N'est-ce que d'aujourd'hui que vous êtes bien sûre de cette vérité-là,
vous, avec qui je suis dès mon enfance, vous, à qui je dois tout ce que je puis avoir d'estimable 
dans le cœur et dans l'esprit ?

HORTENSE.
Il est vrai que vous avez toujours été l'objet de mes complaisances ; et s'il vous reste encore 
quelque chose à désirer de mon pouvoir et de ma science, vous n'avez qu'à parler, Félicie ; je ne 
vous ai aujourd'hui menée ici que pour vous le dire.

FÉLICIE.
Vos bontés m'ont-elles rien laissé à souhaiter ?

HORTENSE.
N'y a-t-il point quelque vertu, quelque qualité dont je puisse encore vous douer ?

FÉLICIE.
Il n'y en a point dont vous n'ayez voulu embellir mon âme.

HORTENSE.
Vous avez bien de l'esprit, en demandez-vous encore ?

FÉLICIE.
Je m'en fie à votre tendresse, elle m'en a sans doute donné tout ce qu'il m'en faut.

HORTENSE.
Parcourez tous les avantages possibles, et voyez celui que je pourrais augmenter en vous, ou bien 
ajouter à ceux que vous avez : rêvez-y.
            """)

            response = self.client.chat.complete(
                model="mistral-large-latest",
                messages=[{
                    "role": "user",
                    "content": prompt,
                }],
                stream=False,
                response_format={"type": "text"},
                temperature=0.1
            )
            response_text = response.choices[0].message.content
            json_match = re.search(r'```json\n(.*?)```',
                                   response_text, re.DOTALL)
            csv_match = re.search(r'```csv\n(.*?)```',
                                  response_text, re.DOTALL)
            if json_match is None or csv_match is None:
                print("Error: Unexpected response format from Mistral")

            metadata = json.loads(json_match.group(1))
            csv_data = csv_match.group(1)
            csv_data = csv_data.replace(';"";', ";;")
            csv_data = csv_data.replace('""', '"')

            # Generate real UUIDs
            for character in metadata["characters"]:
                new_uuid = str(uuid.uuid4())
                csv_data = csv_data.replace(character["id"], new_uuid)
                character["id"] = new_uuid

            return metadata, csv_data
        except errors.MistralError as e:
            # The base class for HTTP error responses
            print(e.message)
            print(e.status_code)
            print(e.body)
            print(e.headers)
            print(e.raw_response)

            # Depending on the method different errors may be thrown
            if isinstance(e, errors.HTTPValidationError):
                print(e.data.detail)  # Optional[List[models.ValidationError]]
        except Exception as err:
            print("Mistral failed: {}".format(err))
            raise err
