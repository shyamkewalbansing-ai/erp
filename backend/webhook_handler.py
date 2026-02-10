"""
GitHub Webhook Handler for Auto-Deploy
Voeg dit toe aan je server.py of draai als aparte service
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import subprocess
import hmac
import hashlib
import os

router = APIRouter()

# Webhook secret (zet dit in je .env)
WEBHOOK_SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', 'your-webhook-secret-here')
DEPLOY_SCRIPT = os.environ.get('DEPLOY_SCRIPT', '/home/facturatie/htdocs/facturatie.sr/webhook-deploy.sh')

def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature:
        return False
    
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)

def run_deploy():
    """Run the deploy script"""
    try:
        subprocess.Popen(['bash', DEPLOY_SCRIPT], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Deploy error: {e}")

@router.post("/webhook/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    GitHub Webhook endpoint
    Triggered on every push to the repository
    """
    # Get signature from headers
    signature = request.headers.get('X-Hub-Signature-256', '')
    
    # Get payload
    payload = await request.body()
    
    # Verify signature (skip in development)
    if WEBHOOK_SECRET != 'your-webhook-secret-here':
        if not verify_signature(payload, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Get event type
    event = request.headers.get('X-GitHub-Event', '')
    
    if event == 'push':
        # Run deploy in background
        background_tasks.add_task(run_deploy)
        return {"status": "ok", "message": "Deploy started"}
    
    elif event == 'ping':
        return {"status": "ok", "message": "Pong!"}
    
    return {"status": "ok", "message": f"Event {event} ignored"}
