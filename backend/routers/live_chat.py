"""
Live Chat Router - Real-time chat between customers and support staff
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid
import bcrypt
import jwt
import os
import json
import asyncio

router = APIRouter(prefix="/live-chat", tags=["Live Chat"])

# Will be set by main server
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_database(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

# ==================== MODELS ====================

class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "support"  # support, supervisor, admin
    department: Optional[str] = "Algemeen"
    max_concurrent_chats: int = 5

class StaffLogin(BaseModel):
    email: EmailStr
    password: str

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    max_concurrent_chats: Optional[int] = None
    is_active: Optional[bool] = None
    is_online: Optional[bool] = None

class ChatMessage(BaseModel):
    content: str
    sender_type: str  # customer, staff, system
    sender_name: Optional[str] = None

class ChatSessionCreate(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    initial_message: Optional[str] = None

class ChatTransfer(BaseModel):
    target_staff_id: str
    reason: Optional[str] = None

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_staff_token(staff_id: str, email: str, role: str) -> str:
    payload = {
        "sub": staff_id,
        "email": email,
        "role": role,
        "type": "staff",
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 3600)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_staff(token: str) -> dict:
    """Verify staff token and return staff data"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "staff":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        staff = await db.chat_staff.find_one({"id": payload["sub"]}, {"_id": 0})
        if not staff:
            raise HTTPException(status_code=401, detail="Staff not found")
        if not staff.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated")
        
        return staff
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        # Active WebSocket connections: {session_id: {role: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Staff connections: {staff_id: websocket}
        self.staff_connections: Dict[str, WebSocket] = {}
        # Online staff tracking
        self.online_staff: Dict[str, dict] = {}
    
    async def connect_customer(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}
        self.active_connections[session_id]["customer"] = websocket
    
    async def connect_staff(self, websocket: WebSocket, staff_id: str, staff_data: dict):
        await websocket.accept()
        self.staff_connections[staff_id] = websocket
        self.online_staff[staff_id] = staff_data
        # Update staff online status in DB
        if db:
            await db.chat_staff.update_one(
                {"id": staff_id},
                {"$set": {"is_online": True, "last_seen": datetime.now(timezone.utc).isoformat()}}
            )
    
    async def connect_staff_to_session(self, websocket: WebSocket, session_id: str, staff_id: str):
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}
        self.active_connections[session_id]["staff"] = websocket
        self.active_connections[session_id]["staff_id"] = staff_id
    
    def disconnect_customer(self, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].pop("customer", None)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def disconnect_staff(self, staff_id: str):
        self.staff_connections.pop(staff_id, None)
        self.online_staff.pop(staff_id, None)
        # Update staff online status in DB
        if db:
            await db.chat_staff.update_one(
                {"id": staff_id},
                {"$set": {"is_online": False, "last_seen": datetime.now(timezone.utc).isoformat()}}
            )
        # Remove from any active sessions
        for session_id, conn in list(self.active_connections.items()):
            if conn.get("staff_id") == staff_id:
                conn.pop("staff", None)
                conn.pop("staff_id", None)
    
    async def send_to_session(self, session_id: str, message: dict, exclude_role: str = None):
        """Send message to all participants in a session"""
        if session_id in self.active_connections:
            for role, ws in self.active_connections[session_id].items():
                if role != exclude_role and isinstance(ws, WebSocket):
                    try:
                        await ws.send_json(message)
                    except:
                        pass
    
    async def send_to_staff(self, staff_id: str, message: dict):
        """Send message to specific staff member"""
        if staff_id in self.staff_connections:
            try:
                await self.staff_connections[staff_id].send_json(message)
            except:
                pass
    
    async def broadcast_to_online_staff(self, message: dict):
        """Broadcast message to all online staff"""
        for staff_id, ws in self.staff_connections.items():
            try:
                await ws.send_json(message)
            except:
                pass
    
    def get_online_staff_count(self) -> int:
        return len(self.online_staff)
    
    def get_available_staff(self) -> List[dict]:
        """Get staff members who can accept new chats"""
        available = []
        for staff_id, staff in self.online_staff.items():
            # Check if staff hasn't reached max concurrent chats
            current_chats = sum(1 for conn in self.active_connections.values() 
                              if conn.get("staff_id") == staff_id)
            max_chats = staff.get("max_concurrent_chats", 5)
            if current_chats < max_chats:
                available.append({**staff, "current_chats": current_chats})
        return available

manager = ConnectionManager()

# ==================== STAFF MANAGEMENT (Superadmin only) ====================

@router.post("/staff")
async def create_staff(staff_data: StaffCreate):
    """Create a new support staff member (superadmin only)"""
    # Check if email already exists
    existing = await db.chat_staff.find_one({"email": staff_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc)
    staff = {
        "id": str(uuid.uuid4()),
        "name": staff_data.name,
        "email": staff_data.email,
        "password": hash_password(staff_data.password),
        "role": staff_data.role,
        "department": staff_data.department,
        "max_concurrent_chats": staff_data.max_concurrent_chats,
        "is_active": True,
        "is_online": False,
        "created_at": now.isoformat(),
        "last_seen": None,
        "total_chats": 0,
        "avg_rating": 0.0
    }
    
    await db.chat_staff.insert_one(dict(staff))
    
    # Don't return password - create a new dict without it
    staff_response = {k: v for k, v in staff.items() if k != "password"}
    return staff_response

@router.get("/staff")
async def list_staff():
    """List all support staff members"""
    staff_list = await db.chat_staff.find({}, {"_id": 0, "password": 0}).to_list(100)
    return staff_list

@router.get("/staff/{staff_id}")
async def get_staff(staff_id: str):
    """Get staff member details"""
    staff = await db.chat_staff.find_one({"id": staff_id}, {"_id": 0, "password": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, update_data: StaffUpdate):
    """Update staff member"""
    staff = await db.chat_staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.chat_staff.update_one({"id": staff_id}, {"$set": update_dict})
    
    updated = await db.chat_staff.find_one({"id": staff_id}, {"_id": 0, "password": 0})
    return updated

@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str):
    """Delete (deactivate) staff member"""
    result = await db.chat_staff.update_one(
        {"id": staff_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff member deactivated"}

# ==================== STAFF AUTH ====================

@router.post("/staff/login")
async def staff_login(login_data: StaffLogin):
    """Staff login endpoint"""
    staff = await db.chat_staff.find_one({"email": login_data.email}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, staff["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not staff.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    token = create_staff_token(staff["id"], staff["email"], staff["role"])
    
    # Update last login
    await db.chat_staff.update_one(
        {"id": staff["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    staff.pop("password", None)
    return {
        "access_token": token,
        "token_type": "bearer",
        "staff": staff
    }

@router.get("/staff/me")
async def get_current_staff_profile(token: str):
    """Get current staff profile"""
    staff = await get_current_staff(token)
    staff.pop("password", None)
    return staff

# ==================== CHAT SESSIONS ====================

@router.post("/sessions")
async def create_chat_session(session_data: ChatSessionCreate):
    """Create a new chat session (customer initiates)"""
    now = datetime.now(timezone.utc)
    session_id = str(uuid.uuid4())
    
    session = {
        "id": session_id,
        "customer_name": session_data.customer_name,
        "customer_email": session_data.customer_email,
        "status": "waiting",  # waiting, active, closed
        "assigned_staff_id": None,
        "assigned_staff_name": None,
        "created_at": now.isoformat(),
        "started_at": None,
        "closed_at": None,
        "messages": [],
        "rating": None,
        "feedback": None,
        "tags": [],
        "priority": "normal"
    }
    
    # Add initial message if provided
    if session_data.initial_message:
        session["messages"].append({
            "id": str(uuid.uuid4()),
            "content": session_data.initial_message,
            "sender_type": "customer",
            "sender_name": session_data.customer_name,
            "timestamp": now.isoformat()
        })
    
    await db.chat_sessions.insert_one(session)
    
    # Notify all online staff about new chat request
    await manager.broadcast_to_online_staff({
        "type": "new_chat_request",
        "session": session
    })
    
    return session

@router.get("/sessions")
async def list_chat_sessions(status: Optional[str] = None, staff_id: Optional[str] = None):
    """List chat sessions"""
    query = {}
    if status:
        query["status"] = status
    if staff_id:
        query["assigned_staff_id"] = staff_id
    
    sessions = await db.chat_sessions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sessions

@router.get("/sessions/waiting")
async def get_waiting_sessions():
    """Get all waiting chat sessions (queue)"""
    sessions = await db.chat_sessions.find(
        {"status": "waiting"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    return sessions

@router.get("/sessions/{session_id}")
async def get_chat_session(session_id: str):
    """Get chat session details"""
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/sessions/{session_id}/accept")
async def accept_chat_session(session_id: str, token: str):
    """Staff accepts a chat session"""
    staff = await get_current_staff(token)
    
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Session is not waiting")
    
    now = datetime.now(timezone.utc)
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "status": "active",
            "assigned_staff_id": staff["id"],
            "assigned_staff_name": staff["name"],
            "started_at": now.isoformat()
        }}
    )
    
    # Add system message
    system_message = {
        "id": str(uuid.uuid4()),
        "content": f"{staff['name']} is nu verbonden met u.",
        "sender_type": "system",
        "sender_name": "Systeem",
        "timestamp": now.isoformat()
    }
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": system_message}}
    )
    
    # Notify customer
    await manager.send_to_session(session_id, {
        "type": "staff_connected",
        "staff_name": staff["name"],
        "message": system_message
    })
    
    return {"message": "Chat accepted", "session_id": session_id}

@router.post("/sessions/{session_id}/close")
async def close_chat_session(session_id: str, token: Optional[str] = None, reason: Optional[str] = None):
    """Close a chat session"""
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = datetime.now(timezone.utc)
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "status": "closed",
            "closed_at": now.isoformat(),
            "close_reason": reason
        }}
    )
    
    # Add system message
    system_message = {
        "id": str(uuid.uuid4()),
        "content": "Chat is beëindigd.",
        "sender_type": "system",
        "sender_name": "Systeem",
        "timestamp": now.isoformat()
    }
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": system_message}}
    )
    
    # Notify participants
    await manager.send_to_session(session_id, {
        "type": "chat_closed",
        "message": system_message
    })
    
    return {"message": "Chat closed"}

@router.post("/sessions/{session_id}/message")
async def send_message(session_id: str, message_data: ChatMessage):
    """Send a message in a chat session"""
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "closed":
        raise HTTPException(status_code=400, detail="Chat is closed")
    
    now = datetime.now(timezone.utc)
    message = {
        "id": str(uuid.uuid4()),
        "content": message_data.content,
        "sender_type": message_data.sender_type,
        "sender_name": message_data.sender_name,
        "timestamp": now.isoformat()
    }
    
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": message}}
    )
    
    # Send to all participants via WebSocket
    await manager.send_to_session(session_id, {
        "type": "new_message",
        "message": message
    })
    
    return message

@router.post("/sessions/{session_id}/transfer")
async def transfer_chat(session_id: str, transfer_data: ChatTransfer, token: str):
    """Transfer chat to another staff member"""
    staff = await get_current_staff(token)
    
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    target_staff = await db.chat_staff.find_one({"id": transfer_data.target_staff_id}, {"_id": 0})
    if not target_staff:
        raise HTTPException(status_code=404, detail="Target staff not found")
    
    now = datetime.now(timezone.utc)
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "assigned_staff_id": target_staff["id"],
            "assigned_staff_name": target_staff["name"],
            "transferred_at": now.isoformat(),
            "transferred_from": staff["id"]
        }}
    )
    
    # Add system message
    system_message = {
        "id": str(uuid.uuid4()),
        "content": f"Chat is overgedragen aan {target_staff['name']}.",
        "sender_type": "system",
        "sender_name": "Systeem",
        "timestamp": now.isoformat()
    }
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": system_message}}
    )
    
    # Notify participants
    await manager.send_to_session(session_id, {
        "type": "chat_transferred",
        "new_staff_name": target_staff["name"],
        "message": system_message
    })
    
    # Notify target staff
    await manager.send_to_staff(target_staff["id"], {
        "type": "chat_assigned",
        "session_id": session_id
    })
    
    return {"message": "Chat transferred"}

# ==================== STATISTICS ====================

@router.get("/stats")
async def get_chat_statistics():
    """Get chat statistics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_sessions = await db.chat_sessions.count_documents({})
    active_sessions = await db.chat_sessions.count_documents({"status": "active"})
    waiting_sessions = await db.chat_sessions.count_documents({"status": "waiting"})
    
    # Today's stats
    today_sessions = await db.chat_sessions.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # Online staff
    online_staff = await db.chat_staff.count_documents({"is_online": True, "is_active": True})
    total_staff = await db.chat_staff.count_documents({"is_active": True})
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "waiting_sessions": waiting_sessions,
        "today_sessions": today_sessions,
        "online_staff": online_staff,
        "total_staff": total_staff
    }

@router.get("/online-status")
async def get_online_status():
    """Check if any staff is online"""
    online_count = await db.chat_staff.count_documents({"is_online": True, "is_active": True})
    return {
        "staff_online": online_count > 0,
        "online_count": online_count
    }

# ==================== WEBSOCKET ENDPOINTS ====================

@router.websocket("/ws/customer/{session_id}")
async def customer_websocket(websocket: WebSocket, session_id: str):
    """WebSocket for customer chat"""
    await manager.connect_customer(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Save and broadcast message
                now = datetime.now(timezone.utc)
                message = {
                    "id": str(uuid.uuid4()),
                    "content": data.get("content", ""),
                    "sender_type": "customer",
                    "sender_name": data.get("sender_name", "Klant"),
                    "timestamp": now.isoformat()
                }
                
                await db.chat_sessions.update_one(
                    {"id": session_id},
                    {"$push": {"messages": message}}
                )
                
                await manager.send_to_session(session_id, {
                    "type": "new_message",
                    "message": message
                })
            
            elif data.get("type") == "typing":
                await manager.send_to_session(session_id, {
                    "type": "typing",
                    "sender": "customer"
                }, exclude_role="customer")
    
    except WebSocketDisconnect:
        manager.disconnect_customer(session_id)

@router.websocket("/ws/staff/{token}")
async def staff_websocket(websocket: WebSocket, token: str):
    """WebSocket for staff member"""
    try:
        staff = await get_current_staff(token)
    except:
        await websocket.close(code=4001)
        return
    
    await manager.connect_staff(websocket, staff["id"], staff)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "join_session":
                session_id = data.get("session_id")
                await manager.connect_staff_to_session(websocket, session_id, staff["id"])
                await websocket.send_json({"type": "joined_session", "session_id": session_id})
            
            elif data.get("type") == "message":
                session_id = data.get("session_id")
                now = datetime.now(timezone.utc)
                message = {
                    "id": str(uuid.uuid4()),
                    "content": data.get("content", ""),
                    "sender_type": "staff",
                    "sender_name": staff["name"],
                    "timestamp": now.isoformat()
                }
                
                await db.chat_sessions.update_one(
                    {"id": session_id},
                    {"$push": {"messages": message}}
                )
                
                await manager.send_to_session(session_id, {
                    "type": "new_message",
                    "message": message
                })
            
            elif data.get("type") == "typing":
                session_id = data.get("session_id")
                await manager.send_to_session(session_id, {
                    "type": "typing",
                    "sender": "staff",
                    "sender_name": staff["name"]
                }, exclude_role="staff")
    
    except WebSocketDisconnect:
        await manager.disconnect_staff(staff["id"])
