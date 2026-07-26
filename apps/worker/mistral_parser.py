import json
import uuid
from mistralai.client import Mistral, errors
from dotenv import load_dotenv
import os
import re
import logging
import httpx

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
        self.http_client = httpx.Client(timeout=None)
        self.client = Mistral(
            api_key=os.getenv('MISTRAL_API_KEY'),
            debug_logger=logging.getLogger("mistralai.client"),
            client=self.http_client
        )
        model_info = self.client.models.retrieve(
            model_id="mistral-large-latest")
        print(model_info.max_context_length)  # → te dit la limite en to

    def parse_script(self, script_text, theatrical_genres, theatrical_periods):
        try:
            prompt = ""
            with open('IMPORT-SCRIPT-PROMPT.md', 'r', encoding='utf-8') as f:
                prompt = f.read()

            chunks = list(split_script_strategically(script_text))
            all_csv_data = ""
            all_metadata = {}
            chunk_count = 0
            for chunk in chunks:
                chunk_count += 1
                response = self.client.chat.complete(
                    model="mistral-large-latest",
                    messages=[{
                        "role": "user",
                        "content": prompt.format(
                            script_text=chunk,
                            chunk_num=chunk_count,
                            chunk_num_total=len(chunks),
                            metadata=all_metadata,
                            theatrical_genres=theatrical_genres,
                            theatrical_periods=theatrical_periods,
                        ),
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

                all_csv_data += csv_data
                all_metadata = metadata

            all_csv_data = all_csv_data.replace('|""|', "||")
            all_csv_data = all_csv_data.replace('""', '"')
            all_csv_data = all_csv_data.replace('|"\n', '|""\n')
            # Generate real UUIDs
            for character in all_metadata["characters"]:
                new_uuid = str(uuid.uuid4())
                all_csv_data = all_csv_data.replace(character["id"], new_uuid)
                character["id"] = new_uuid

            return all_metadata, all_csv_data
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


def chunk_script(text, max_tokens=1000):
    # Approximation : 1 token ≈ 4 caractères
    chunk_size = max_tokens * 4
    for i in range(0, len(text), chunk_size):
        yield text[i:i+chunk_size]


def split_script_strategically(text, max_chunk_tokens=1000):
    # Séparateurs par ordre de priorité
    separators = [
        (r'\nACT\*+\s*\n', 'ACTE'),
        (r'\nSCEN\*+\s*\n', 'SCENE'),
        (r'\n\n', 'PARAGRAPH'),
    ]

    chunks = []
    current = text

    for sep, name in separators:
        parts = re.split(sep, current)
        if len(parts) > 1:
            # Reconstruire avec le séparateur
            current_parts = []
            for i, part in enumerate(parts[:-1]):
                current_parts.append(part + sep)
            current_parts.append(parts[-1])
            current = '\n'.join(current_parts)

    # Estime tokens ≈ len(text) / 4
    # Maintenant split par taille approximative
    target_len = max_chunk_tokens * 4
    if len(current) <= target_len:
        return [current]

    start = 0
    chunks = []

    while start < len(current):
        end = start + target_len
        if end >= len(current):
            chunks.append(current[start:])
            break
        last_break = current.rfind('\n\n', start, end)
        if last_break == -1:
            last_break = current.rfind('\n', start, end)
        if last_break == -1 or last_break <= start:
            last_break = end
        chunks.append(current[start:last_break])
        start = last_break

    return chunks
