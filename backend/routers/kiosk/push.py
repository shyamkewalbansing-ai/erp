"""
Web Push Notifications for Kiosk PWA
Uses VAPID (W3C standard) - no external service required.
"""
import os
import json
import hashlib
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List

from pywebpush import webpush, WebPushException

from .base import (
    router, APIRouter, HTTPException, Depends, BaseModel,
    db, generate_uuid, get_current_company,
)

logger = logging.getLogger("kiosk.push")

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")


# ============== MODELS ==============
class PushSubscribeData(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}
    subscriber_type: Optional[str] = "company"  # "company" or "employee"
    subscriber_id: Optional[str] = None  # employee_id when subscriber_type = "employee"
    subscriber_name: Optional[str] = None
    device_label: Optional[str] = None
    user_agent: Optional[str] = None


class PushToggleData(BaseModel):
    enabled: bool


def _endpoint_hash(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()[:16]


# ============== PUBLIC (no auth) ==============
@router.get("/public/push/vapid-public-key")
async def get_vapid_public_key():
    """Return VAPID public key so the frontend can subscribe."""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID public key niet geconfigureerd")
    return {"public_key": VAPID_PUBLIC_KEY}


# ============== ADMIN (company auth) ==============
@router.post("/admin/push/subscribe")
async def push_subscribe(data: PushSubscribeData, company: dict = Depends(get_current_company)):
    """Register a browser push subscription for this device."""
    company_id = company["company_id"]
    endpoint = data.endpoint
    ep_hash = _endpoint_hash(endpoint)

    # Upsert based on (company_id, endpoint_hash) so re-subscribing same device updates
    existing = await db.kiosk_push_subscriptions.find_one({
        "company_id": company_id,
        "endpoint_hash": ep_hash,
    })

    now = datetime.now(timezone.utc)
    sub_doc = {
        "company_id": company_id,
        "endpoint_hash": ep_hash,
        "endpoint": endpoint,
        "p256dh": data.keys.get("p256dh", ""),
        "auth": data.keys.get("auth", ""),
        "subscriber_type": data.subscriber_type or "company",
        "subscriber_id": data.subscriber_id,
        "subscriber_name": data.subscriber_name or "",
        "device_label": data.device_label or "",
        "user_agent": data.user_agent or "",
        "enabled": True,
        "updated_at": now,
    }

    if existing:
        await db.kiosk_push_subscriptions.update_one(
            {"subscription_id": existing["subscription_id"]},
            {"$set": sub_doc}
        )
        return {"subscription_id": existing["subscription_id"], "updated": True}
    else:
        sub_id = generate_uuid()
        sub_doc["subscription_id"] = sub_id
        sub_doc["created_at"] = now
        await db.kiosk_push_subscriptions.insert_one(sub_doc)
        return {"subscription_id": sub_id, "created": True}


@router.post("/admin/push/unsubscribe")
async def push_unsubscribe(data: dict, company: dict = Depends(get_current_company)):
    """Remove a push subscription by endpoint."""
    endpoint = data.get("endpoint", "")
    if not endpoint:
        raise HTTPException(status_code=400, detail="endpoint ontbreekt")
    ep_hash = _endpoint_hash(endpoint)
    await db.kiosk_push_subscriptions.delete_one({
        "company_id": company["company_id"],
        "endpoint_hash": ep_hash,
    })
    return {"deleted": True}


@router.get("/admin/push/subscriptions")
async def list_push_subscriptions(company: dict = Depends(get_current_company)):
    """List all push subscriptions for this company."""
    subs = await db.kiosk_push_subscriptions.find(
        {"company_id": company["company_id"]},
        {"_id": 0, "endpoint": 0, "p256dh": 0, "auth": 0}
    ).sort("created_at", -1).to_list(100)
    return subs


@router.patch("/admin/push/subscriptions/{subscription_id}")
async def toggle_push_subscription(subscription_id: str, data: PushToggleData, company: dict = Depends(get_current_company)):
    """Enable/disable a specific device."""
    r = await db.kiosk_push_subscriptions.update_one(
        {"subscription_id": subscription_id, "company_id": company["company_id"]},
        {"$set": {"enabled": data.enabled, "updated_at": datetime.now(timezone.utc)}}
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription niet gevonden")
    return {"enabled": data.enabled}


@router.delete("/admin/push/subscriptions/{subscription_id}")
async def delete_push_subscription(subscription_id: str, company: dict = Depends(get_current_company)):
    r = await db.kiosk_push_subscriptions.delete_one(
        {"subscription_id": subscription_id, "company_id": company["company_id"]}
    )
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription niet gevonden")
    return {"deleted": True}


@router.post("/admin/push/test")
async def send_test_push(company: dict = Depends(get_current_company)):
    """Send a test notification to all this company's enabled devices."""
    count = await send_push_to_company(
        company["company_id"],
        title="🔔 Test Notificatie",
        body=f"Web Push werkt voor {company.get('name', 'uw bedrijf')}!",
        url="/vastgoed",
        tag="test"
    )
    return {"sent": count}


# ============== CORE SEND HELPER ==============
def _send_one(sub_doc: dict, payload_json: str):
    """Synchronous webpush call. Returns: ('ok', None) on success, ('expired', code) for 404/410, ('error', str) for other failures."""
    try:
        webpush(
            subscription_info={
                "endpoint": sub_doc["endpoint"],
                "keys": {
                    "p256dh": sub_doc["p256dh"],
                    "auth": sub_doc["auth"],
                },
            },
            data=payload_json,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=60 * 60 * 24,  # 24 hours
        )
        return ("ok", None)
    except WebPushException as ex:
        code = getattr(getattr(ex, "response", None), "status_code", None)
        if code in (404, 410):
            return ("expired", code)
        logger.warning(f"[push] Send failed (non-fatal): {ex}")
        return ("error", str(ex))
    except Exception as ex:
        logger.warning(f"[push] Unexpected send error: {ex}")
        return ("error", str(ex))


async def send_push_to_company(
    company_id: str,
    title: str,
    body: str,
    url: Optional[str] = None,
    tag: Optional[str] = None,
    exclude_subscriber_id: Optional[str] = None,
) -> int:
    """Send a push notification to all enabled devices of a company.
    Returns number of successful sends. Auto-cleans expired subscriptions.
    """
    if not VAPID_PRIVATE_KEY:
        logger.warning("[push] VAPID_PRIVATE_KEY not configured - skipping push")
        return 0

    query = {"company_id": company_id, "enabled": True}
    subs = await db.kiosk_push_subscriptions.find(query).to_list(500)
    if not subs:
        return 0

    if exclude_subscriber_id:
        subs = [s for s in subs if s.get("subscriber_id") != exclude_subscriber_id]

    payload = {
        "title": title,
        "body": body,
        "url": url or "/vastgoed",
        "tag": tag or "kiosk",
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    payload_json = json.dumps(payload)

    sent = 0
    expired_ids: List[str] = []
    loop = asyncio.get_event_loop()

    async def _run_one(s):
        nonlocal sent
        result = await loop.run_in_executor(None, _send_one, s, payload_json)
        status, _info = result
        if status == "ok":
            sent += 1
        elif status == "expired":
            expired_ids.append(s["subscription_id"])

    # Limit concurrency to 10 at a time
    sem = asyncio.Semaphore(10)
    async def _with_sem(s):
        async with sem:
            await _run_one(s)

    await asyncio.gather(*[_with_sem(s) for s in subs], return_exceptions=True)

    if expired_ids:
        await db.kiosk_push_subscriptions.delete_many({"subscription_id": {"$in": expired_ids}})
        logger.info(f"[push] Cleaned up {len(expired_ids)} expired subscriptions")

    return sent
