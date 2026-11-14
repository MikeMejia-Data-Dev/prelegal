"""AI chat that drafts the Mutual NDA cover page via Structured Outputs."""

from datetime import date
from typing import Literal

from dotenv import load_dotenv
from litellm import completion
from pydantic import BaseModel

load_dotenv()

MODEL = "openai/gpt-4.1-mini"

SYSTEM_PROMPT = """You are Prelegal, a friendly assistant helping the user fill in the Cover Page of a \
Common Paper Mutual Non-Disclosure Agreement (MNDA). Today is {today}.

Fields: purpose, effectiveDate (yyyy-mm-dd), mndaTerm (expires after N years, or until terminated), \
confidentialityTerm (N years, or perpetual), governingLaw (a US state), jurisdiction (city/county and \
state for courts), modifications (optional changes to the standard terms), and for each party: \
company, name (signer), title, noticeAddress (email or postal address).

Each turn you receive the current fields. Return `fields` with every field, keeping existing values \
unless the user changes them. Record every value the user gives, even several in one message. \
If the user names the two companies without saying which is which, the first is party1 and the \
second is party2. Never invent values. \
In `reply`, briefly confirm what you recorded and ask about one or two missing fields at a time. \
Required before download: governing law, jurisdiction, both company names, and positive whole years \
for any term that expires. When everything required is filled in, tell the user they can download \
the agreement and offer to adjust anything."""


class Party(BaseModel):
    company: str
    name: str
    title: str
    noticeAddress: str


class Expires(BaseModel):
    kind: Literal["expires"]
    years: int


class UntilTerminated(BaseModel):
    kind: Literal["untilTerminated"]


class Years(BaseModel):
    kind: Literal["years"]
    years: int


class Perpetual(BaseModel):
    kind: Literal["perpetual"]


class NdaFields(BaseModel):
    """Mirrors NdaFormData in frontend/src/lib/nda/types.ts."""

    purpose: str
    effectiveDate: str
    mndaTerm: Expires | UntilTerminated
    confidentialityTerm: Years | Perpetual
    governingLaw: str
    jurisdiction: str
    modifications: str
    party1: Party
    party2: Party


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    fields: NdaFields


class ChatResponse(BaseModel):
    reply: str
    fields: NdaFields


def build_messages(request: ChatRequest) -> list[dict]:
    """Assemble the system prompt, history, and current fields for the LLM."""
    system = SYSTEM_PROMPT.format(today=date.today().isoformat())
    state = f"Current fields: {request.fields.model_dump_json()}"
    history = [m.model_dump() for m in request.messages]
    return [{"role": "system", "content": system}, *history, {"role": "system", "content": state}]


def run_chat(request: ChatRequest) -> ChatResponse:
    """Ask the LLM for its reply and the updated fields."""
    response = completion(model=MODEL, messages=build_messages(request), response_format=ChatResponse)
    return ChatResponse.model_validate_json(response.choices[0].message.content)
