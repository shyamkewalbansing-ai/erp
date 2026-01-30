# Routers package
from .workspaces import router as workspaces_router
from .autodealer import router as autodealer_router
from .tenant_portal import router as tenant_portal_router
from .hrm import router as hrm_router
from .autodealer_portal import router as autodealer_portal_router

__all__ = [
    'workspaces_router',
    'autodealer_router', 
    'tenant_portal_router',
    'hrm_router',
    'autodealer_portal_router'
]
