"""OCR endpoint voor ID-kaart scanning via telefoon camera.
Gebruikt Gemini 2.5-flash vision via emergentintegrations + EMERGENT_LLM_KEY.
"""
import os
import base64
import json
import re
import uuid
from .base import *
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


class IdCardScanRequest(BaseModel):
    image_base64: str  # data URL of pure base64


OCR_SYSTEM_PROMPT = """Je bent een OCR-assistent die Surinaamse en Nederlandse ID-kaarten/paspoorten analyseert.
Extraheer de volgende velden uit de foto:
- id_number: het ID-nummer, paspoortnummer, of burgerservicenummer (BSN/CRIB). Meestal 8-11 cijfers.
- name: de VOLLEDIGE NAAM zoals op de kaart (voornaam + achternaam).
- dob: geboortedatum in formaat DD-MM-YYYY (bv. "15-03-1985").
- raw_text: alle gelezen tekst als backup.

Antwoord ALLEEN met een geldige JSON-object in dit exacte formaat:
{"id_number": "...", "name": "...", "dob": "DD-MM-YYYY", "raw_text": "..."}

Als een veld niet leesbaar is, gebruik null voor dat veld.
Geef GEEN uitleg, alleen de JSON."""


@router.post("/admin/ocr/id-card")
async def scan_id_card(data: IdCardScanRequest, company: dict = Depends(get_current_company)):
    """Analyseer een ID-kaart foto via Gemini Vision en retourneer gestructureerde data."""
    if not data.image_base64:
        raise HTTPException(status_code=400, detail="Geen foto ontvangen")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OCR service niet geconfigureerd (EMERGENT_LLM_KEY ontbreekt)")

    # Strip data URL prefix if present
    img = data.image_base64
    if img.startswith("data:"):
        img = img.split(",", 1)[-1]

    # Validate it's decodable base64
    try:
        raw_bytes = base64.b64decode(img)
        if len(raw_bytes) < 1000:
            raise ValueError("Foto is te klein/leeg")
        if len(raw_bytes) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Foto is te groot (max 15MB)")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ongeldige foto: {e}")

    session_id = f"id-ocr-{company['company_id']}-{uuid.uuid4().hex[:8]}"

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=OCR_SYSTEM_PROMPT,
        ).with_model("gemini", "gemini-2.5-flash")

        image = ImageContent(image_base64=img)

        message = UserMessage(
            text="Lees de ID-kaart op deze foto en geef de gevraagde JSON terug.",
            file_contents=[image],
        )

        response = await chat.send_message(message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR service fout: {str(e)[:200]}")

    # Parse response JSON (model may wrap in ```json ... ```)
    txt = str(response).strip()
    # Remove code fences
    txt = re.sub(r"^```(?:json)?\s*", "", txt)
    txt = re.sub(r"\s*```$", "", txt).strip()

    try:
        parsed = json.loads(txt)
    except json.JSONDecodeError:
        # Try to extract JSON object from mixed text
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                parsed = {"raw_text": txt}
        else:
            parsed = {"raw_text": txt}

    return {
        "id_number": parsed.get("id_number") or "",
        "name": parsed.get("name") or "",
        "dob": parsed.get("dob") or "",
        "raw_text": parsed.get("raw_text") or txt,
    }
