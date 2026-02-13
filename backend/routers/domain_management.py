# Domain Management Router - Nginx/SSL Automation
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import subprocess
import os
import socket
import logging
import uuid

from .deps import db, get_superadmin, get_current_user, SERVER_IP, MAIN_DOMAIN

router = APIRouter(prefix="/domains", tags=["domain-management"])
logger = logging.getLogger(__name__)

# Configuration paths - adjust for your server setup
NGINX_SITES_AVAILABLE = os.environ.get("NGINX_SITES_AVAILABLE", "/etc/nginx/sites-available")
NGINX_SITES_ENABLED = os.environ.get("NGINX_SITES_ENABLED", "/etc/nginx/sites-enabled")
CERTBOT_PATH = os.environ.get("CERTBOT_PATH", "/usr/bin/certbot")
NGINX_RELOAD_CMD = os.environ.get("NGINX_RELOAD_CMD", "sudo systemctl reload nginx")

# ==================== MODELS ====================

class DomainStatus(BaseModel):
    workspace_id: str
    workspace_name: str
    domain_type: str
    domain: str
    dns_verified: bool
    ssl_active: bool
    ssl_expiry: Optional[str] = None
    nginx_configured: bool
    last_checked: Optional[str] = None
    error_message: Optional[str] = None

class DomainProvisionRequest(BaseModel):
    workspace_id: str
    force_ssl: bool = False

class NginxConfigResponse(BaseModel):
    success: bool
    message: str
    config_path: Optional[str] = None
    config_preview: Optional[str] = None

class SSLProvisionResponse(BaseModel):
    success: bool
    message: str
    ssl_active: bool
    expiry_date: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def generate_nginx_config(domain: str, workspace_slug: str, ssl_enabled: bool = False) -> str:
    """Generate Nginx configuration for a custom domain"""
    
    # Backend proxy configuration
    backend_upstream = f"""
upstream {workspace_slug}_backend {{
    server 127.0.0.1:8001;
    keepalive 32;
}}
"""
    
    if ssl_enabled:
        config = f"""{backend_upstream}
# HTTP redirect to HTTPS for {domain}
server {{
    listen 80;
    listen [::]:80;
    server_name {domain};
    
    location /.well-known/acme-challenge/ {{
        root /var/www/certbot;
        allow all;
    }}
    
    location / {{
        return 301 https://$server_name$request_uri;
    }}
}}

# HTTPS server for {domain}
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {domain};
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend static files
    root /var/www/{workspace_slug}/frontend/build;
    index index.html;
    
    # API proxy
    location /api/ {{
        proxy_pass http://{workspace_slug}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }}
    
    # WebSocket support
    location /ws/ {{
        proxy_pass http://{workspace_slug}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }}
    
    # React Router - serve index.html for all routes
    location / {{
        try_files $uri $uri/ /index.html;
    }}
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}}
"""
    else:
        # HTTP only configuration (for initial setup before SSL)
        config = f"""{backend_upstream}
# HTTP server for {domain} (SSL pending)
server {{
    listen 80;
    listen [::]:80;
    server_name {domain};
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {{
        root /var/www/certbot;
        allow all;
    }}
    
    # Frontend static files
    root /var/www/{workspace_slug}/frontend/build;
    index index.html;
    
    # API proxy
    location /api/ {{
        proxy_pass http://{workspace_slug}_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }}
    
    # React Router
    location / {{
        try_files $uri $uri/ /index.html;
    }}
}}
"""
    
    return config


def verify_dns(domain: str, expected_ip: str) -> dict:
    """Verify DNS A record points to the correct IP"""
    try:
        ip_addresses = socket.gethostbyname_ex(domain)[2]
        if expected_ip in ip_addresses:
            return {
                "verified": True,
                "message": f"DNS correct geconfigureerd. {domain} wijst naar {expected_ip}",
                "resolved_ips": ip_addresses
            }
        else:
            return {
                "verified": False,
                "message": f"DNS wijst naar {', '.join(ip_addresses)} in plaats van {expected_ip}",
                "resolved_ips": ip_addresses
            }
    except socket.gaierror as e:
        return {
            "verified": False,
            "message": f"DNS lookup mislukt: {str(e)}",
            "resolved_ips": []
        }


async def provision_ssl_certificate(domain: str) -> dict:
    """Provision SSL certificate using Let's Encrypt/Certbot"""
    try:
        # First, ensure certbot directory exists
        certbot_webroot = "/var/www/certbot"
        os.makedirs(certbot_webroot, exist_ok=True)
        
        # Run certbot
        cmd = [
            CERTBOT_PATH, "certonly",
            "--webroot",
            "-w", certbot_webroot,
            "-d", domain,
            "--non-interactive",
            "--agree-tos",
            "--email", f"ssl@{MAIN_DOMAIN}",
            "--expand"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            # Get certificate expiry
            expiry_cmd = ["openssl", "x509", "-enddate", "-noout", 
                         "-in", f"/etc/letsencrypt/live/{domain}/fullchain.pem"]
            expiry_result = subprocess.run(expiry_cmd, capture_output=True, text=True)
            expiry_date = expiry_result.stdout.strip().replace("notAfter=", "") if expiry_result.returncode == 0 else None
            
            return {
                "success": True,
                "message": f"SSL certificaat succesvol geïnstalleerd voor {domain}",
                "expiry_date": expiry_date
            }
        else:
            return {
                "success": False,
                "message": f"Certbot fout: {result.stderr}",
                "expiry_date": None
            }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "SSL provisioning timeout - probeer later opnieuw",
            "expiry_date": None
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"SSL fout: {str(e)}",
            "expiry_date": None
        }


def reload_nginx() -> dict:
    """Test and reload Nginx configuration"""
    try:
        # Test configuration first
        test_result = subprocess.run(["sudo", "nginx", "-t"], capture_output=True, text=True)
        if test_result.returncode != 0:
            return {
                "success": False,
                "message": f"Nginx configuratie fout: {test_result.stderr}"
            }
        
        # Reload nginx
        reload_result = subprocess.run(NGINX_RELOAD_CMD.split(), capture_output=True, text=True)
        if reload_result.returncode == 0:
            return {
                "success": True,
                "message": "Nginx succesvol herladen"
            }
        else:
            return {
                "success": False,
                "message": f"Nginx reload fout: {reload_result.stderr}"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Nginx fout: {str(e)}"
        }


# ==================== API ENDPOINTS ====================

@router.get("/status", response_model=List[DomainStatus])
async def get_all_domain_status(current_user: dict = Depends(get_superadmin)):
    """Get status of all custom domains - superadmin only"""
    workspaces = await db.workspaces.find(
        {"domain.type": "custom", "domain.custom_domain": {"$ne": None}},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    for ws in workspaces:
        domain_info = ws.get("domain", {})
        custom_domain = domain_info.get("custom_domain")
        
        if not custom_domain:
            continue
            
        # Check DNS
        dns_result = verify_dns(custom_domain, SERVER_IP)
        
        # Check if nginx config exists
        nginx_config_path = f"{NGINX_SITES_ENABLED}/{custom_domain}"
        nginx_configured = os.path.exists(nginx_config_path)
        
        # Check SSL certificate
        ssl_cert_path = f"/etc/letsencrypt/live/{custom_domain}/fullchain.pem"
        ssl_active = os.path.exists(ssl_cert_path)
        ssl_expiry = None
        
        if ssl_active:
            try:
                expiry_cmd = ["openssl", "x509", "-enddate", "-noout", "-in", ssl_cert_path]
                expiry_result = subprocess.run(expiry_cmd, capture_output=True, text=True)
                if expiry_result.returncode == 0:
                    ssl_expiry = expiry_result.stdout.strip().replace("notAfter=", "")
            except Exception:
                pass
        
        result.append(DomainStatus(
            workspace_id=ws["id"],
            workspace_name=ws["name"],
            domain_type="custom",
            domain=custom_domain,
            dns_verified=dns_result["verified"],
            ssl_active=ssl_active,
            ssl_expiry=ssl_expiry,
            nginx_configured=nginx_configured,
            last_checked=datetime.now(timezone.utc).isoformat(),
            error_message=None if dns_result["verified"] else dns_result["message"]
        ))
    
    return result


@router.get("/status/{workspace_id}", response_model=DomainStatus)
async def get_domain_status(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Get domain status for a specific workspace"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain_info = workspace.get("domain", {})
    domain_type = domain_info.get("type", "subdomain")
    
    if domain_type == "subdomain":
        subdomain = domain_info.get("subdomain", workspace["slug"])
        return DomainStatus(
            workspace_id=workspace["id"],
            workspace_name=workspace["name"],
            domain_type="subdomain",
            domain=f"{subdomain}.{MAIN_DOMAIN}",
            dns_verified=True,
            ssl_active=True,  # Main domain SSL covers subdomains
            ssl_expiry=None,
            nginx_configured=True,
            last_checked=datetime.now(timezone.utc).isoformat()
        )
    
    custom_domain = domain_info.get("custom_domain")
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    # Check DNS
    dns_result = verify_dns(custom_domain, SERVER_IP)
    
    # Check nginx
    nginx_config_path = f"{NGINX_SITES_ENABLED}/{custom_domain}"
    nginx_configured = os.path.exists(nginx_config_path)
    
    # Check SSL
    ssl_cert_path = f"/etc/letsencrypt/live/{custom_domain}/fullchain.pem"
    ssl_active = os.path.exists(ssl_cert_path)
    ssl_expiry = None
    
    if ssl_active:
        try:
            expiry_cmd = ["openssl", "x509", "-enddate", "-noout", "-in", ssl_cert_path]
            expiry_result = subprocess.run(expiry_cmd, capture_output=True, text=True)
            if expiry_result.returncode == 0:
                ssl_expiry = expiry_result.stdout.strip().replace("notAfter=", "")
        except Exception:
            pass
    
    return DomainStatus(
        workspace_id=workspace["id"],
        workspace_name=workspace["name"],
        domain_type="custom",
        domain=custom_domain,
        dns_verified=dns_result["verified"],
        ssl_active=ssl_active,
        ssl_expiry=ssl_expiry,
        nginx_configured=nginx_configured,
        last_checked=datetime.now(timezone.utc).isoformat(),
        error_message=None if dns_result["verified"] else dns_result["message"]
    )


@router.post("/provision/nginx/{workspace_id}", response_model=NginxConfigResponse)
async def provision_nginx_config(
    workspace_id: str, 
    preview_only: bool = False,
    current_user: dict = Depends(get_superadmin)
):
    """Generate and install Nginx configuration for a workspace's custom domain"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain_info = workspace.get("domain", {})
    if domain_info.get("type") != "custom":
        raise HTTPException(status_code=400, detail="Workspace gebruikt geen custom domain")
    
    custom_domain = domain_info.get("custom_domain")
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    # Check if SSL is already active
    ssl_cert_path = f"/etc/letsencrypt/live/{custom_domain}/fullchain.pem"
    ssl_active = os.path.exists(ssl_cert_path)
    
    # Generate config
    nginx_config = generate_nginx_config(custom_domain, workspace["slug"], ssl_active)
    
    if preview_only:
        return NginxConfigResponse(
            success=True,
            message="Preview van Nginx configuratie",
            config_preview=nginx_config
        )
    
    # Write configuration
    try:
        config_path = f"{NGINX_SITES_AVAILABLE}/{custom_domain}"
        with open(config_path, 'w') as f:
            f.write(nginx_config)
        
        # Create symlink
        enabled_path = f"{NGINX_SITES_ENABLED}/{custom_domain}"
        if not os.path.exists(enabled_path):
            os.symlink(config_path, enabled_path)
        
        # Reload nginx
        reload_result = reload_nginx()
        if not reload_result["success"]:
            # Cleanup on failure
            if os.path.exists(enabled_path):
                os.remove(enabled_path)
            if os.path.exists(config_path):
                os.remove(config_path)
            raise HTTPException(status_code=500, detail=reload_result["message"])
        
        # Update workspace status
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {
                "domain.nginx_configured": True,
                "domain.nginx_config_path": config_path,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return NginxConfigResponse(
            success=True,
            message=f"Nginx configuratie succesvol geïnstalleerd voor {custom_domain}",
            config_path=config_path,
            config_preview=nginx_config[:500] + "..."  # Truncated preview
        )
        
    except PermissionError:
        raise HTTPException(
            status_code=500, 
            detail="Geen schrijfrechten voor Nginx configuratie. Controleer server permissies."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fout bij installeren configuratie: {str(e)}")


@router.post("/provision/ssl/{workspace_id}", response_model=SSLProvisionResponse)
async def provision_ssl(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_superadmin)
):
    """Provision SSL certificate for a workspace's custom domain"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain_info = workspace.get("domain", {})
    custom_domain = domain_info.get("custom_domain")
    
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    # Verify DNS first
    dns_result = verify_dns(custom_domain, SERVER_IP)
    if not dns_result["verified"]:
        raise HTTPException(
            status_code=400, 
            detail=f"DNS niet correct geconfigureerd: {dns_result['message']}"
        )
    
    # Check if nginx is configured (required for HTTP challenge)
    nginx_enabled = f"{NGINX_SITES_ENABLED}/{custom_domain}"
    if not os.path.exists(nginx_enabled):
        raise HTTPException(
            status_code=400,
            detail="Nginx moet eerst geconfigureerd worden voordat SSL kan worden geïnstalleerd"
        )
    
    # Provision SSL
    ssl_result = await provision_ssl_certificate(custom_domain)
    
    if ssl_result["success"]:
        # Update workspace
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {
                "domain.ssl_active": True,
                "domain.ssl_expiry": ssl_result["expiry_date"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Regenerate nginx config with SSL
        nginx_config = generate_nginx_config(custom_domain, workspace["slug"], ssl_enabled=True)
        config_path = f"{NGINX_SITES_AVAILABLE}/{custom_domain}"
        
        try:
            with open(config_path, 'w') as f:
                f.write(nginx_config)
            reload_nginx()
        except Exception as e:
            logger.error(f"Failed to update nginx config with SSL: {e}")
    
    return SSLProvisionResponse(
        success=ssl_result["success"],
        message=ssl_result["message"],
        ssl_active=ssl_result["success"],
        expiry_date=ssl_result.get("expiry_date")
    )


@router.post("/provision/full/{workspace_id}")
async def full_domain_provision(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_superadmin)
):
    """Full domain provisioning: DNS check -> Nginx -> SSL"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain_info = workspace.get("domain", {})
    custom_domain = domain_info.get("custom_domain")
    
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    results = {
        "workspace_id": workspace_id,
        "domain": custom_domain,
        "steps": []
    }
    
    # Step 1: DNS Verification
    dns_result = verify_dns(custom_domain, SERVER_IP)
    results["steps"].append({
        "step": "DNS Verificatie",
        "success": dns_result["verified"],
        "message": dns_result["message"]
    })
    
    if not dns_result["verified"]:
        results["overall_success"] = False
        results["message"] = "DNS verificatie mislukt. Configureer eerst het A-record."
        return results
    
    # Step 2: Nginx Configuration (HTTP only first)
    try:
        nginx_config = generate_nginx_config(custom_domain, workspace["slug"], ssl_enabled=False)
        config_path = f"{NGINX_SITES_AVAILABLE}/{custom_domain}"
        enabled_path = f"{NGINX_SITES_ENABLED}/{custom_domain}"
        
        with open(config_path, 'w') as f:
            f.write(nginx_config)
        
        if not os.path.exists(enabled_path):
            os.symlink(config_path, enabled_path)
        
        reload_result = reload_nginx()
        results["steps"].append({
            "step": "Nginx Configuratie (HTTP)",
            "success": reload_result["success"],
            "message": reload_result["message"]
        })
        
        if not reload_result["success"]:
            results["overall_success"] = False
            results["message"] = "Nginx configuratie mislukt"
            return results
            
    except Exception as e:
        results["steps"].append({
            "step": "Nginx Configuratie",
            "success": False,
            "message": str(e)
        })
        results["overall_success"] = False
        results["message"] = f"Nginx fout: {str(e)}"
        return results
    
    # Step 3: SSL Certificate
    ssl_result = await provision_ssl_certificate(custom_domain)
    results["steps"].append({
        "step": "SSL Certificaat",
        "success": ssl_result["success"],
        "message": ssl_result["message"]
    })
    
    if ssl_result["success"]:
        # Step 4: Update Nginx with SSL
        try:
            nginx_config_ssl = generate_nginx_config(custom_domain, workspace["slug"], ssl_enabled=True)
            with open(config_path, 'w') as f:
                f.write(nginx_config_ssl)
            
            reload_result = reload_nginx()
            results["steps"].append({
                "step": "Nginx Configuratie (HTTPS)",
                "success": reload_result["success"],
                "message": reload_result["message"]
            })
        except Exception as e:
            results["steps"].append({
                "step": "Nginx SSL Update",
                "success": False,
                "message": str(e)
            })
    
    # Update workspace
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "domain.dns_verified": True,
            "domain.nginx_configured": True,
            "domain.ssl_active": ssl_result["success"],
            "domain.ssl_expiry": ssl_result.get("expiry_date"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    all_success = all(step["success"] for step in results["steps"])
    results["overall_success"] = all_success
    results["message"] = "Domein volledig geconfigureerd!" if all_success else "Sommige stappen zijn mislukt"
    
    return results


@router.delete("/provision/{workspace_id}")
async def remove_domain_config(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Remove Nginx configuration and SSL for a workspace's custom domain"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain_info = workspace.get("domain", {})
    custom_domain = domain_info.get("custom_domain")
    
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    results = {"domain": custom_domain, "actions": []}
    
    # Remove nginx config
    config_path = f"{NGINX_SITES_AVAILABLE}/{custom_domain}"
    enabled_path = f"{NGINX_SITES_ENABLED}/{custom_domain}"
    
    try:
        if os.path.exists(enabled_path):
            os.remove(enabled_path)
            results["actions"].append("Nginx enabled symlink verwijderd")
        
        if os.path.exists(config_path):
            os.remove(config_path)
            results["actions"].append("Nginx configuratie verwijderd")
        
        reload_nginx()
        results["actions"].append("Nginx herladen")
    except Exception as e:
        results["actions"].append(f"Nginx cleanup fout: {str(e)}")
    
    # Note: We don't revoke SSL certificates, they will expire naturally
    # Revoking is optional and can be done manually if needed
    
    # Update workspace
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "domain.nginx_configured": False,
            "domain.ssl_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    results["success"] = True
    results["message"] = "Domein configuratie verwijderd"
    return results


# ==================== AUTOMATED DOMAIN SETUP ====================

class AutomatedDomainSetupRequest(BaseModel):
    """Request model for automated domain setup"""
    domain: str
    user_id: str
    force: bool = False  # Force reinstall even if already configured

class AutomatedDomainSetupResponse(BaseModel):
    """Response model for automated domain setup"""
    success: bool
    message: str
    workspace_id: Optional[str] = None
    domain: Optional[str] = None
    steps_completed: List[str] = []
    error_details: Optional[str] = None

# Path to the setup script on the server
DOMAIN_SETUP_SCRIPT = os.environ.get(
    "DOMAIN_SETUP_SCRIPT", 
    "/home/facturatie/htdocs/facturatie.sr/setup-domain.sh"
)

@router.post("/setup-automated", response_model=AutomatedDomainSetupResponse)
async def automated_domain_setup(
    request: AutomatedDomainSetupRequest,
    current_user: dict = Depends(get_superadmin)
):
    """
    Fully automated domain setup for a new customer.
    This endpoint:
    1. Creates or finds the workspace for the user
    2. Configures the custom domain
    3. Runs the setup-domain.sh script to configure Nginx and SSL
    4. Updates the workspace status
    """
    steps_completed = []
    
    # Step 1: Validate the user exists
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        return AutomatedDomainSetupResponse(
            success=False,
            message="Gebruiker niet gevonden",
            error_details=f"Geen gebruiker met ID: {request.user_id}"
        )
    steps_completed.append("Gebruiker geverifieerd")
    
    # Step 2: Clean the domain name
    domain = request.domain.lower().strip()
    if domain.startswith("http://"):
        domain = domain[7:]
    if domain.startswith("https://"):
        domain = domain[8:]
    if domain.startswith("www."):
        domain = domain[4:]
    domain = domain.rstrip("/")
    
    # Basic domain validation
    if not domain or "." not in domain:
        return AutomatedDomainSetupResponse(
            success=False,
            message="Ongeldig domein",
            error_details="Voer een geldig domein in (bijv. portal.voorbeeld.nl)"
        )
    steps_completed.append(f"Domein gevalideerd: {domain}")
    
    # Step 3: Check if domain is already in use
    existing_workspace = await db.workspaces.find_one(
        {"domain.custom_domain": domain},
        {"_id": 0}
    )
    if existing_workspace and existing_workspace.get("owner_id") != request.user_id:
        return AutomatedDomainSetupResponse(
            success=False,
            message="Domein al in gebruik",
            error_details="Dit domein is al gekoppeld aan een andere klant"
        )
    
    # Step 4: Get or create workspace
    workspace = await db.workspaces.find_one({"owner_id": request.user_id}, {"_id": 0})
    
    if not workspace:
        # Create new workspace
        import re
        workspace_id = str(uuid.uuid4())
        base_slug = re.sub(r'[^a-z0-9]', '', user.get("company_name", user.get("name", "klant")).lower())[:20]
        slug = base_slug or f"klant-{str(uuid.uuid4())[:8]}"
        
        # Ensure unique slug
        existing_slug = await db.workspaces.find_one({"slug": slug})
        if existing_slug:
            slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
        
        now = datetime.now(timezone.utc).isoformat()
        workspace = {
            "id": workspace_id,
            "name": user.get("company_name") or f"{user.get('name')}'s Workspace",
            "slug": slug,
            "owner_id": request.user_id,
            "status": "pending",
            "domain": {
                "type": "custom",
                "subdomain": slug,
                "custom_domain": domain,
                "dns_verified": False,
                "ssl_active": False,
                "nginx_configured": False,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            },
            "branding": {
                "logo_url": None,
                "favicon_url": None,
                "primary_color": "#0caf60",
                "secondary_color": "#059669",
                "portal_name": user.get("company_name") or f"{user.get('name')}'s Portaal"
            },
            "created_at": now,
            "updated_at": now
        }
        await db.workspaces.insert_one(workspace)
        
        # Link workspace to user
        await db.users.update_one(
            {"id": request.user_id},
            {"$set": {"workspace_id": workspace_id}}
        )
        steps_completed.append(f"Nieuwe workspace aangemaakt: {slug}")
    else:
        workspace_id = workspace["id"]
        # Update existing workspace with new domain
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {
                "domain.type": "custom",
                "domain.custom_domain": domain,
                "domain.dns_verified": False,
                "domain.ssl_active": False,
                "domain.nginx_configured": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        steps_completed.append(f"Workspace bijgewerkt: {workspace.get('slug')}")
    
    # Step 5: Check DNS (optional - don't fail if DNS not ready)
    dns_result = verify_dns(domain, SERVER_IP)
    if dns_result["verified"]:
        steps_completed.append("DNS geverifieerd - wijst naar server")
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {"domain.dns_verified": True}}
        )
    else:
        steps_completed.append(f"DNS nog niet geconfigureerd: {dns_result['message']}")
    
    # Step 6: Run the setup script (if it exists)
    if os.path.exists(DOMAIN_SETUP_SCRIPT):
        try:
            # The script takes domain as argument
            # It configures Nginx and optionally SSL
            cmd = ["sudo", DOMAIN_SETUP_SCRIPT, domain]
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=180  # 3 minute timeout for SSL provisioning
            )
            
            if result.returncode == 0:
                steps_completed.append("Server setup script succesvol uitgevoerd")
                steps_completed.append("Nginx geconfigureerd")
                
                # Check if SSL was installed
                ssl_cert_path = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
                ssl_active = os.path.exists(ssl_cert_path)
                
                if ssl_active:
                    steps_completed.append("SSL certificaat geïnstalleerd")
                else:
                    steps_completed.append("SSL nog niet actief - DNS moet eerst correct zijn")
                
                # Update workspace
                await db.workspaces.update_one(
                    {"id": workspace_id},
                    {"$set": {
                        "status": "active",
                        "domain.nginx_configured": True,
                        "domain.ssl_active": ssl_active,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                steps_completed.append(f"Setup script fout: {result.stderr[:200] if result.stderr else 'Onbekende fout'}")
                await db.workspaces.update_one(
                    {"id": workspace_id},
                    {"$set": {
                        "status": "error",
                        "error_message": result.stderr[:500] if result.stderr else "Script mislukt"
                    }}
                )
                
        except subprocess.TimeoutExpired:
            steps_completed.append("Setup script timeout - proces duurt langer dan verwacht")
        except FileNotFoundError:
            steps_completed.append("Setup script niet gevonden op server")
        except Exception as e:
            steps_completed.append(f"Setup script fout: {str(e)[:100]}")
    else:
        # Script doesn't exist - just generate config preview
        steps_completed.append("Setup script niet aanwezig - alleen workspace aangemaakt")
        steps_completed.append(f"Nginx config handmatig configureren voor: {domain}")
        
        # Generate config preview
        workspace_slug = workspace.get("slug") if workspace else slug
        nginx_config = generate_nginx_config(domain, workspace_slug, ssl_enabled=False)
        
        # Store config in workspace for manual setup
        await db.workspaces.update_one(
            {"id": workspace_id},
            {"$set": {
                "status": "pending",
                "nginx_config_preview": nginx_config,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Step 7: Add to custom_domains collection for tracking
    domain_record = await db.custom_domains.find_one({"domain": domain})
    if not domain_record:
        await db.custom_domains.insert_one({
            "id": str(uuid.uuid4()),
            "domain": domain,
            "user_id": request.user_id,
            "workspace_id": workspace_id,
            "verified": dns_result["verified"],
            "status": "pending" if not dns_result["verified"] else "active",
            "dns_record_type": "A",
            "dns_record_value": SERVER_IP,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "verified_at": datetime.now(timezone.utc).isoformat() if dns_result["verified"] else None
        })
        steps_completed.append("Domein geregistreerd in database")
    
    return AutomatedDomainSetupResponse(
        success=True,
        message=f"Domein setup gestart voor {domain}",
        workspace_id=workspace_id,
        domain=domain,
        steps_completed=steps_completed
    )


@router.post("/verify-dns/{workspace_id}")
async def verify_workspace_dns(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Verify DNS configuration for a workspace (available to workspace owner)"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    # Check authorization
    is_admin = current_user.get("role") == "superadmin"
    is_owner = workspace.get("owner_id") == current_user.get("id")
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze workspace")
    
    domain_info = workspace.get("domain", {})
    custom_domain = domain_info.get("custom_domain")
    
    if not custom_domain:
        raise HTTPException(status_code=400, detail="Geen custom domain geconfigureerd")
    
    dns_result = verify_dns(custom_domain, SERVER_IP)
    
    # Update workspace with verification result
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "domain.dns_verified": dns_result["verified"],
            "domain.last_dns_check": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "domain": custom_domain,
        "expected_ip": SERVER_IP,
        **dns_result
    }
