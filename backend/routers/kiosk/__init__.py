"""
Kiosk Package - Split into modules for maintainability
"""
from .base import router, set_database, db, ensure_indexes

# Import all sub-modules to register their routes on the shared router
from . import auth
from . import payment_gateways
from . import public
from . import admin
from . import loans
from . import admin_operations
from . import devices
from . import messaging
from . import superadmin
from . import faceid
from . import scheduler

# Re-export for server.py
from .scheduler import _kiosk_daily_scheduler

__all__ = ['router', 'set_database', '_kiosk_daily_scheduler', 'ensure_indexes']
