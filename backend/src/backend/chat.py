"""AI chat that picks a Common Paper agreement and fills it in via Structured Outputs."""

from datetime import date
from typing import Literal

from dotenv import load_dotenv
from litellm import completion
from pydantic import BaseModel, Field

from backend.catalog import DOCUMENT_IDS, NDA_ID, catalog_text

load_dotenv()

MODEL = "openai/gpt-4.1-mini"

SYSTEM_PROMPT = """You are Prelegal, a friendly assistant that helps the user draft a legal agreement \
from Common Paper standard templates. Today is {today}.

Supported documents:
{catalog}

How to work:
1. First find out which document the user needs. If it is unclear, ask about their situation.
2. If the user asks for a document that is not supported (for example an employment contract or a \
lease), explain that Prelegal can't generate it and offer the closest supported document, with a \
short reason. Only select a document once the user agrees.
3. Once a document is chosen, set `documentId` and fill `fields` for it. For `{nda_id}` use the NDA \
shape: purpose, effectiveDate (yyyy-mm-dd), mndaTerm (expires after N years, or until terminated), \
confidentialityTerm (N years, or perpetual), governingLaw (a US state), jurisdiction (city/county and \
state for courts), modifications (optional). When you first select it, start from these defaults: \
purpose "Evaluating whether to enter into a business relationship with the other party.", \
effectiveDate "{today}", mndaTerm expires after 1 year, confidentialityTerm 1 year. The NDA requires governing law, jurisdiction, both company \
names, and positive whole years for any term that expires. For every other document use the generic \
shape: `keyTerms` as a list of {{key, value}} using only that document's keys. Every document has \
party1 and party2 with company, name (signer), title and noticeAddress (email or postal address); \
both company names are required.
4. Until a document is chosen, return `documentId` and `fields` as null. If the user switches to a \
different document, set the new `documentId` and fill its fields, keeping the party details.

Each turn you receive the current document and fields. Return every field, keeping existing values \
unless the user changes them. Record every value the user gives, even several in one message. If the \
user names the two companies without saying which is which, the first is party1 and the second is \
party2. Never invent values. Write values as they should appear in the agreement.

In `reply`, briefly confirm what you recorded using statements only; never put a question in `reply`. \
In `question`, always ask exactly one \
direct follow-up question ending in "?": while no document is chosen or any required field is missing, \
ask about one or two missing items (e.g. "What is the Effective Date?"); never write an instruction \
such as "Please provide ...". When everything required is filled in, say in `reply` that the agreement \
is ready to download and ask in `question` whether they want to adjust anything."""


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


class KeyTerm(BaseModel):
    key: str
    value: str


class GenericFields(BaseModel):
    """Mirrors GenericFields in frontend/src/lib/documents/catalog.ts."""

    keyTerms: list[KeyTerm]
    party1: Party
    party2: Party


DocumentId = Literal[*DOCUMENT_IDS]


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    documentId: DocumentId | None
    fields: NdaFields | GenericFields | None


class ChatResponse(BaseModel):
    reply: str
    documentId: DocumentId | None
    fields: NdaFields | GenericFields | None


class AiTurn(BaseModel):
    """What the LLM returns; a separate `question` guarantees every turn ends with a follow-up."""

    reply: str = Field(description='Statements only: confirm what was recorded. Must not contain "?".')
    question: str = Field(description='One direct follow-up question ending in "?".')
    documentId: DocumentId | None
    fields: NdaFields | GenericFields | None


def build_messages(request: ChatRequest) -> list[dict]:
    """Assemble the system prompt, history, and current document state for the LLM."""
    system = SYSTEM_PROMPT.format(today=date.today().isoformat(), catalog=catalog_text(), nda_id=NDA_ID)
    fields = request.fields.model_dump_json() if request.fields else "null"
    state = f"Current documentId: {request.documentId}. Current fields: {fields}"
    history = [m.model_dump() for m in request.messages]
    return [{"role": "system", "content": system}, *history, {"role": "system", "content": state}]


def run_chat(request: ChatRequest) -> ChatResponse:
    """Ask the LLM for its reply, the chosen document, and the updated fields."""
    response = completion(model=MODEL, messages=build_messages(request), response_format=AiTurn)
    turn = AiTurn.model_validate_json(response.choices[0].message.content)
    # The model occasionally leaves the NDA date blank despite the default in the prompt.
    if isinstance(turn.fields, NdaFields) and not turn.fields.effectiveDate:
        turn.fields.effectiveDate = date.today().isoformat()
    reply = f"{turn.reply.strip()} {turn.question.strip()}".strip()
    return ChatResponse(reply=reply, documentId=turn.documentId, fields=turn.fields)
