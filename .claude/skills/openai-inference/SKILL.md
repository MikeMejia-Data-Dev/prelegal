---
name: openai-inference
description: Use this to write code that calls an OpenAI model using LiteLLM and OpenAI API key.
---

# Calling an LLM via OpenAI API

## Setup
OPENAI_API_KEY must be set in the .env file that is on root path and loaded as an enviroments variable. 
The uv project must include litellm, pydantic and python-dotenv in the requirements.txt file.
uv add littellm pydantic python-dotenv

## Imports and constants

```
from dotenv import load_dotenv
from litellm import completion
load_dotenv()  # Load environment variables from .env file
MODEL = "openai/gpt-4.1-mini"  # or "openai/gpt-4.1-mini" for a smaller model

```

## Text response

```
response = completion(model=MODEL, messages=messages)
result = response.choices[0].message.content

```

## Structured Outputs response

```
response = completion(model=MODEL, messages=messages, response_format=MyBaseModelSubclass)
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```
