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

# Push notifications are optional: if pywebpush / py-vapid / http-ece are not
# yet installed (e.g. running on a production server where `pip install -r
# requirements.txt` has not been executed yet after a deploy), we do NOT want
# the rest of the kiosk package to fail to import. Guard the import and log.
try:
    from . import push  # noqa: F401
except Exception as _push_err:  # pragma: no cover
    import logging as _logging
    _logging.getLogger("kiosk").warning(
        f"[kiosk] Push notifications module failed to load: {_push_err}. "
        f"Run `pip install -r backend/requirements.txt` on the server."
    )

# Re-export for server.py
from .scheduler import _kiosk_daily_scheduler

__all__ = ['router', 'set_database', '_kiosk_daily_scheduler', 'ensure_indexes']
