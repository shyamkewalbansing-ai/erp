# Workspace management router
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import socket

from .deps import (
    db, get_superadmin, get_current_user, 
    SERVER_IP, MAIN_DOMAIN, create_workspace_for_user
)

router = APIRouter(prefix="/api", tags=["workspaces"])

# ==================== MODELS ====================

class WorkspaceBranding(BaseModel):
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#0caf60"
    secondary_color: str = "#059669"
    portal_name: Optional[str] = None

class WorkspaceCreate(BaseModel):
    name: str
    slug: str
    owner_id: str
    domain_type: str = "subdomain"
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    branding: Optional[WorkspaceBranding] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    branding: Optional[WorkspaceBranding] = None
    domain_type: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    status: str
    domain: dict
    branding: dict
    created_at: str
    updated_at: Optional[str] = None
    users_count: int = 0
    error_message: Optional[str] = None

# ==================== ADMIN WORKSPACE ROUTES ====================

@router.get("/admin/workspaces", response_model=List[WorkspaceResponse])
async def get_all_workspaces(current_user: dict = Depends(get_superadmin)):
    """Get all workspaces - superadmin only"""
    workspaces = await db.workspaces.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for ws in workspaces:
        owner = await db.users.find_one({"id": ws.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
        users_count = await db.workspace_users.count_documents({"workspace_id": ws["id"]})
        
        result.append({
            **ws,
            "owner_name": owner.get("name") if owner else None,
            "owner_email": owner.get("email") if owner else None,
            "users_count": users_count,
            "domain": ws.get("domain", {
                "type": "subdomain",
                "subdomain": ws.get("slug"),
                "dns_verified": False,
                "ssl_active": False,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }),
            "branding": ws.get("branding", {
                "primary_color": "#0caf60",
                "secondary_color": "#059669"
            })
        })
    
    return result

@router.post("/admin/workspaces", response_model=WorkspaceResponse)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: dict = Depends(get_superadmin)):
    """Create a new workspace - superadmin only"""
    import re
    
    slug = workspace_data.slug.lower().strip()
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', slug):
        raise HTTPException(status_code=400, detail="Slug mag alleen kleine letters, cijfers en koppeltekens bevatten")
    
    existing = await db.workspaces.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="Deze slug is al in gebruik")
    
    if workspace_data.domain_type == "subdomain":
        subdomain = workspace_data.subdomain or slug
        existing_domain = await db.workspaces.find_one({"domain.subdomain": subdomain})
        if existing_domain:
            raise HTTPException(status_code=400, detail="Dit subdomein is al in gebruik")
    elif workspace_data.domain_type == "custom" and workspace_data.custom_domain:
        existing_domain = await db.workspaces.find_one({"domain.custom_domain": workspace_data.custom_domain})
        if existing_domain:
            raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
    
    owner = await db.users.find_one({"id": workspace_data.owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Eigenaar niet gevonden")
    
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    domain_config = {
        "type": workspace_data.domain_type,
        "subdomain": workspace_data.subdomain or slug if workspace_data.domain_type == "subdomain" else None,
        "custom_domain": workspace_data.custom_domain if workspace_data.domain_type == "custom" else None,
        "dns_verified": workspace_data.domain_type == "subdomain",
        "ssl_active": workspace_data.domain_type == "subdomain",
        "dns_record_type": "A",
        "dns_record_value": SERVER_IP
    }
    
    branding_config = {
        "logo_url": workspace_data.branding.logo_url if workspace_data.branding else None,
        "favicon_url": workspace_data.branding.favicon_url if workspace_data.branding else None,
        "primary_color": workspace_data.branding.primary_color if workspace_data.branding else "#0caf60",
        "secondary_color": workspace_data.branding.secondary_color if workspace_data.branding else "#059669",
        "portal_name": workspace_data.branding.portal_name if workspace_data.branding else workspace_data.name
    }
    
    workspace = {
        "id": workspace_id,
        "name": workspace_data.name,
        "slug": slug,
        "owner_id": workspace_data.owner_id,
        "status": "active" if workspace_data.domain_type == "subdomain" else "pending",
        "domain": domain_config,
        "branding": branding_config,
        "created_at": now,
        "updated_at": now,
        "error_message": None
    }
    
    await db.workspaces.insert_one(workspace)
    
    return {
        **workspace,
        "owner_name": owner.get("name"),
        "owner_email": owner.get("email"),
        "users_count": 0
    }

@router.put("/admin/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: str, workspace_data: WorkspaceUpdate, current_user: dict = Depends(get_superadmin)):
    """Update a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if workspace_data.name:
        update_data["name"] = workspace_data.name
    
    if workspace_data.branding:
        update_data["branding"] = workspace_data.branding.dict()
    
    if workspace_data.domain_type:
        if workspace_data.domain_type == "subdomain":
            subdomain = workspace_data.subdomain or workspace["slug"]
            existing = await db.workspaces.find_one({
                "domain.subdomain": subdomain,
                "id": {"$ne": workspace_id}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Dit subdomein is al in gebruik")
            
            update_data["domain"] = {
                "type": "subdomain",
                "subdomain": subdomain,
                "custom_domain": None,
                "dns_verified": True,
                "ssl_active": True,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }
            update_data["status"] = "active"
            
        elif workspace_data.domain_type == "custom" and workspace_data.custom_domain:
            existing = await db.workspaces.find_one({
                "domain.custom_domain": workspace_data.custom_domain,
                "id": {"$ne": workspace_id}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Dit domein is al in gebruik")
            
            update_data["domain"] = {
                "type": "custom",
                "subdomain": None,
                "custom_domain": workspace_data.custom_domain,
                "dns_verified": False,
                "ssl_active": False,
                "dns_record_type": "A",
                "dns_record_value": SERVER_IP
            }
            update_data["status"] = "pending"
    
    await db.workspaces.update_one({"id": workspace_id}, {"$set": update_data})
    
    updated = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    owner = await db.users.find_one({"id": updated.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
    users_count = await db.workspace_users.count_documents({"workspace_id": workspace_id})
    
    return {
        **updated,
        "owner_name": owner.get("name") if owner else None,
        "owner_email": owner.get("email") if owner else None,
        "users_count": users_count
    }

@router.delete("/admin/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Delete a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    await db.workspaces.delete_one({"id": workspace_id})
    await db.workspace_users.delete_many({"workspace_id": workspace_id})
    await db.workspace_logs.delete_many({"workspace_id": workspace_id})
    
    return {"message": "Workspace verwijderd"}

@router.post("/admin/workspaces/{workspace_id}/verify-dns")
async def verify_workspace_dns(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Verify DNS configuration for custom domain - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    if domain.get("type") != "custom" or not domain.get("custom_domain"):
        raise HTTPException(status_code=400, detail="Geen custom domein geconfigureerd")
    
    custom_domain = domain["custom_domain"]
    
    try:
        ip_addresses = socket.gethostbyname_ex(custom_domain)[2]
        
        if SERVER_IP in ip_addresses:
            await db.workspaces.update_one(
                {"id": workspace_id},
                {"$set": {
                    "domain.dns_verified": True,
                    "status": "active",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": None
                }}
            )
            
            return {
                "success": True,
                "message": f"DNS geverifieerd! {custom_domain} wijst naar {SERVER_IP}",
                "ssl_instructions": "SSL-certificaat kan nu worden aangevraagd via: sudo certbot --nginx -d " + custom_domain
            }
        else:
            return {
                "success": False,
                "message": f"DNS wijst naar {', '.join(ip_addresses)} in plaats van {SERVER_IP}",
                "instructions": f"Maak een A-record aan voor {custom_domain} dat wijst naar {SERVER_IP}"
            }
            
    except socket.gaierror:
        return {
            "success": False,
            "message": f"Domein {custom_domain} niet gevonden in DNS",
            "instructions": f"Maak een A-record aan voor {custom_domain} dat wijst naar {SERVER_IP}"
        }

@router.get("/admin/workspaces/{workspace_id}/nginx-config")
async def get_workspace_nginx_config(workspace_id: str, current_user: dict = Depends(get_superadmin)):
    """Get Nginx configuration for a workspace - superadmin only"""
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    domain = workspace.get("domain", {})
    
    if domain.get("type") == "subdomain":
        server_name = f"{domain['subdomain']}.{MAIN_DOMAIN}"
    else:
        server_name = domain.get("custom_domain", "example.com")
    
    nginx_config = f"""# Nginx config voor workspace: {workspace['name']}
server {{
    listen 80;
    server_name {server_name};
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {server_name};
    
    ssl_certificate /etc/letsencrypt/live/{server_name}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{server_name}/privkey.pem;
    
    location / {{
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Workspace-ID {workspace['id']};
        proxy_cache_bypass $http_upgrade;
    }}
    
    location /api {{
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Workspace-ID {workspace['id']};
    }}
}}
"""
    
    return {
        "config": nginx_config,
        "server_name": server_name,
        "commands": [
            f"sudo nano /etc/nginx/sites-available/{workspace['slug']}",
            f"sudo ln -s /etc/nginx/sites-available/{workspace['slug']} /etc/nginx/sites-enabled/",
            f"sudo certbot --nginx -d {server_name}",
            "sudo nginx -t && sudo systemctl reload nginx"
        ]
    }

@router.get("/admin/workspace-stats")
async def get_workspace_stats(current_user: dict = Depends(get_superadmin)):
    """Get workspace statistics - superadmin only"""
    total = await db.workspaces.count_documents({})
    active = await db.workspaces.count_documents({"status": "active"})
    pending = await db.workspaces.count_documents({"status": "pending"})
    
    return {
        "total": total,
        "active": active,
        "pending": pending,
        "suspended": await db.workspaces.count_documents({"status": "suspended"})
    }

# ==================== USER WORKSPACE ROUTES ====================

@router.get("/workspace/current")
async def get_current_workspace(current_user: dict = Depends(get_current_user)):
    """Get the current user's workspace with branding"""
    if current_user.get("role") == "superadmin":
        return {
            "workspace": None,
            "branding": {
                "logo_url": None,
                "primary_color": "#0caf60",
                "secondary_color": "#059669",
                "portal_name": "Facturatie Admin"
            }
        }
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        workspace = await create_workspace_for_user(
            current_user["id"],
            current_user["name"],
            current_user.get("company_name")
        )
    else:
        workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    
    if not workspace:
        return {
            "workspace": None,
            "branding": {
                "logo_url": None,
                "primary_color": "#0caf60",
                "secondary_color": "#059669",
                "portal_name": "Facturatie"
            }
        }
    
    return {
        "workspace": {
            "id": workspace["id"],
            "name": workspace["name"],
            "slug": workspace["slug"],
            "domain": workspace.get("domain", {})
        },
        "branding": workspace.get("branding", {
            "logo_url": None,
            "primary_color": "#0caf60",
            "secondary_color": "#059669",
            "portal_name": workspace["name"]
        })
    }

@router.put("/workspace/branding")
async def update_workspace_branding(branding: WorkspaceBranding, current_user: dict = Depends(get_current_user)):
    """Update the current user's workspace branding"""
    if current_user.get("role") == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
    
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {
            "branding": branding.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Branding bijgewerkt"}

# ==================== WORKSPACE USERS ====================

class WorkspaceUserInvite(BaseModel):
    email: str
    name: str
    role: str = "member"

class WorkspaceUserResponse(BaseModel):
    id: str
    user_id: Optional[str]
    workspace_id: str
    email: str
    name: str
    role: str
    status: str
    invited_at: str
    joined_at: Optional[str] = None

@router.get("/workspace/users", response_model=List[WorkspaceUserResponse])
async def get_workspace_users(current_user: dict = Depends(get_current_user)):
    """Get all users in current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        if current_user.get("role") == "superadmin":
            raise HTTPException(status_code=400, detail="Superadmin heeft geen workspace")
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"]
        })
        if not user_role or user_role.get("role") not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Geen toegang tot gebruikersbeheer")
    
    users = await db.workspace_users.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(100)
    return users

@router.post("/workspace/users/invite", response_model=WorkspaceUserResponse)
async def invite_workspace_user(invite: WorkspaceUserInvite, current_user: dict = Depends(get_current_user)):
    """Invite a user to the current workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace niet gevonden")
    
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"],
            "role": {"$in": ["admin", "owner"]}
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten om gebruikers uit te nodigen")
    
    existing = await db.workspace_users.find_one({
        "workspace_id": workspace_id,
        "email": invite.email
    })
    if existing:
        raise HTTPException(status_code=400, detail="Gebruiker is al uitgenodigd")
    
    existing_user = await db.users.find_one({"email": invite.email}, {"_id": 0})
    
    invitation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    invitation = {
        "id": invitation_id,
        "user_id": existing_user["id"] if existing_user else None,
        "workspace_id": workspace_id,
        "email": invite.email,
        "name": invite.name,
        "role": invite.role,
        "status": "active" if existing_user else "invited",
        "invited_at": now,
        "joined_at": now if existing_user else None,
        "invited_by": current_user["id"]
    }
    
    await db.workspace_users.insert_one(invitation)
    
    if existing_user and not existing_user.get("workspace_id"):
        await db.users.update_one(
            {"id": existing_user["id"]},
            {"$set": {"workspace_id": workspace_id}}
        )
    
    return WorkspaceUserResponse(**invitation)

@router.delete("/workspace/users/{user_id}")
async def remove_workspace_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a user from the workspace"""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Geen workspace gevonden")
    
    workspace = await db.workspaces.find_one({"id": workspace_id})
    
    if workspace["owner_id"] != current_user["id"]:
        user_role = await db.workspace_users.find_one({
            "workspace_id": workspace_id,
            "user_id": current_user["id"],
            "role": "admin"
        })
        if not user_role:
            raise HTTPException(status_code=403, detail="Geen rechten om gebruikers te verwijderen")
    
    if user_id == workspace["owner_id"]:
        raise HTTPException(status_code=400, detail="Kan de eigenaar niet verwijderen")
    
    await db.workspace_users.delete_one({
        "workspace_id": workspace_id,
        "user_id": user_id
    })
    
    await db.users.update_one(
        {"id": user_id, "workspace_id": workspace_id},
        {"$set": {"workspace_id": None}}
    )
    
    return {"message": "Gebruiker verwijderd"}
