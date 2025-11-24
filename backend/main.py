from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from bson import ObjectId
import jwt
import bcrypt
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from email_validator import validate_email, EmailNotValidError
from urllib.parse import quote_plus

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "health_check")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

try:
    client = MongoClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        tlsAllowInvalidCertificates=True
    )
    client.admin.command('ping')
    db = client[DATABASE_NAME]
    print("✓ MongoDB connected successfully")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    db = None

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None

@app.route("/api/auth/register", methods=["POST"])
def register():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    data = request.get_json()
    
    if not data or not all(k in data for k in ["email", "password", "name"]):
        return jsonify({"detail": "Missing required fields"}), 400
    
    try:
        validate_email(data["email"], check_deliverability=False)
    except EmailNotValidError as e:
        return jsonify({"detail": f"Invalid email: {str(e)}"}), 400
    
    users_collection = db["users"]
    
    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"detail": "Email already registered"}), 400
    
    hashed_password = hash_password(data["password"])
    
    # Tài khoản đầu tiên là admin, những tài khoản sau là user
    users_count = users_collection.count_documents({})
    role = "admin" if users_count == 0 else "user"
    
    user_doc = {
        "email": data["email"],
        "password": hashed_password,
        "name": data["name"],
        "role": role,
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(user_doc)
    
    access_token = create_access_token({"sub": str(result.inserted_id)})
    return jsonify({"access_token": access_token, "token_type": "bearer"}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    data = request.get_json()
    
    if not data or not all(k in data for k in ["email", "password"]):
        return jsonify({"detail": "Missing email or password"}), 400
    
    users_collection = db["users"]
    user_doc = users_collection.find_one({"email": data["email"]})
    
    if not user_doc or not verify_password(data["password"], user_doc["password"]):
        return jsonify({"detail": "Invalid email or password"}), 401
    
    access_token = create_access_token({"sub": str(user_doc["_id"])})
    return jsonify({"access_token": access_token, "token_type": "bearer"}), 200

@app.route("/api/users/me", methods=["GET"])
def get_me():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    users_collection = db["users"]
    user_doc = users_collection.find_one({"_id": ObjectId(payload["sub"])})
    
    if not user_doc:
        return jsonify({"detail": "User not found"}), 404
    
    return jsonify({
        "id": str(user_doc["_id"]),
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc.get("role", "user"),
        "created_at": user_doc["created_at"].isoformat()
    }), 200

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route("/api/family", methods=["GET"])
def get_family():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    families_collection = db["families"]
    families = list(families_collection.find({"members.userId": payload["sub"]}))
    
    if not families:
        return jsonify({"family": None}), 200
    
    family = families[0]
    return jsonify({
        "family": {
            "id": str(family["_id"]), 
            "name": family["name"], 
            "members": family.get("members", []),
            "admin": family.get("admin")
        }
    }), 200

@app.route("/api/family/create", methods=["POST"])
def create_family():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    data = request.get_json()
    name = data.get("name")
    members_data = data.get("members", [])
    creator_is_admin = data.get("creatorIsAdmin", True)
    
    if not name:
        return jsonify({"detail": "Family name required"}), 400
    
    users_collection = db["users"]
    current_user = users_collection.find_one({"_id": ObjectId(payload["sub"])})
    
    members = [{
        "userId": payload["sub"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": "admin" if creator_is_admin else "member",
        "joinedAt": datetime.utcnow().isoformat()
    }]
    
    # Người tạo luôn là admin nếu họ chọn
    admin_id = payload["sub"] if creator_is_admin else None
    
    for member_data in members_data:
        email = member_data.get("email")
        is_admin = member_data.get("isAdmin", False)
        
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"detail": f"User with email {email} not found"}), 404
        
        members.append({
            "userId": str(user["_id"]),
            "email": email,
            "name": user["name"],
            "role": "admin" if is_admin else "member",
            "joinedAt": datetime.utcnow().isoformat()
        })
        
        if is_admin and not admin_id:
            admin_id = str(user["_id"])
    
    if not admin_id:
        return jsonify({"detail": "At least one admin is required"}), 400
    
    families_collection = db["families"]
    family_doc = {
        "name": name,
        "createdBy": payload["sub"],
        "admin": admin_id,
        "members": members,
        "created_at": datetime.utcnow()
    }
    
    result = families_collection.insert_one(family_doc)
    return jsonify({"family": {"id": str(result.inserted_id), "name": name, "admin": admin_id, "members": members}}), 201

@app.route("/api/family/<family_id>/members", methods=["GET"])
def get_family_members(family_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    families_collection = db["families"]
    family = families_collection.find_one({"_id": ObjectId(family_id)})
    
    if not family:
        return jsonify({"detail": "Family not found"}), 404
    
    members = family.get("members", [])
    return jsonify({"members": [{"id": m.get("userId"), "name": m.get("name"), "email": m.get("email"), "role": m.get("role")} for m in members]}), 200

@app.route("/api/family/<family_id>/members", methods=["POST"])
def add_family_member(family_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    families_collection = db["families"]
    family = families_collection.find_one({"_id": ObjectId(family_id)})
    
    if not family:
        return jsonify({"detail": "Family not found"}), 404
    
    if family["admin"] != payload["sub"]:
        return jsonify({"detail": "Only admin can add members"}), 403
    
    data = request.get_json()
    email = data.get("email")
    is_admin = data.get("isAdmin", False)
    
    if not email:
        return jsonify({"detail": "Email required"}), 400
    
    users_collection = db["users"]
    user = users_collection.find_one({"email": email})
    
    if not user:
        return jsonify({"detail": f"User with email {email} not found"}), 404
    
    new_member = {
        "userId": str(user["_id"]),
        "email": email,
        "name": user["name"],
        "role": "admin" if is_admin else "member",
        "joinedAt": datetime.utcnow().isoformat()
    }
    
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$push": {"members": new_member}}
    )
    
    return jsonify({"member": new_member}), 201

@app.route("/api/members", methods=["GET"])
def get_members():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    members_collection = db["members"]
    members = list(members_collection.find({"user_id": payload["sub"]}))
    return jsonify({"members": [{"id": str(m["_id"]), "name": m["name"], "relationship": m.get("relationship")} for m in members]}), 200

@app.route("/api/members", methods=["POST"])
def add_member():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    data = request.get_json()
    members_collection = db["members"]
    member_doc = {
        "user_id": payload["sub"],
        "name": data.get("name"),
        "relationship": data.get("relationship"),
        "created_at": datetime.utcnow()
    }
    result = members_collection.insert_one(member_doc)
    return jsonify({"member": {"id": str(result.inserted_id), "name": member_doc["name"]}}), 201

@app.route("/api/members/<member_id>", methods=["DELETE"])
def delete_member(member_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    members_collection = db["members"]
    members_collection.delete_one({"_id": ObjectId(member_id), "user_id": payload["sub"]})
    return jsonify({"success": True}), 200

@app.route("/api/health-checks", methods=["POST"])
def create_health_check():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    data = request.get_json()
    checks_collection = db["health_checks"]
    check_doc = {
        "user_id": payload["sub"],
        "member_id": data.get("memberId"),
        "status": data.get("status"),
        "note": data.get("note"),
        "created_at": datetime.utcnow()
    }
    result = checks_collection.insert_one(check_doc)
    return jsonify({"healthCheck": {"id": str(result.inserted_id)}}), 201

@app.route("/api/health-checks/<member_id>", methods=["GET"])
def get_health_checks(member_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    checks_collection = db["health_checks"]
    checks = list(checks_collection.find({"user_id": payload["sub"], "member_id": member_id}))
    return jsonify({"healthChecks": [{"id": str(c["_id"]), "status": c["status"]} for c in checks]}), 200

@app.route("/api/notes", methods=["POST"])
def create_note():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    data = request.get_json()
    notes_collection = db["notes"]
    note_doc = {
        "user_id": payload["sub"],
        "content": data.get("content"),
        "type": data.get("type"),
        "created_at": datetime.utcnow()
    }
    result = notes_collection.insert_one(note_doc)
    return jsonify({"note": {"id": str(result.inserted_id)}}), 201

@app.route("/api/notes", methods=["GET"])
def get_notes():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    notes_collection = db["notes"]
    notes = list(notes_collection.find({"user_id": payload["sub"]}))
    return jsonify({"notes": [{"id": str(n["_id"]), "content": n["content"]} for n in notes]}), 200

@app.route("/api/family/invite", methods=["POST"])
def invite_user():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    users_collection = db["users"]
    admin_user = users_collection.find_one({"_id": ObjectId(payload["sub"])})
    if not admin_user or admin_user.get("role") != "admin":
        return jsonify({"detail": "Only admin can invite users"}), 403
    
    data = request.get_json()
    email = data.get("email")
    
    if not email:
        return jsonify({"detail": "Email required"}), 400
    
    invited_user = users_collection.find_one({"email": email})
    if not invited_user:
        return jsonify({"detail": "User not found"}), 404
    
    invitations_collection = db["invitations"]
    invitation = {
        "from_user_id": payload["sub"],
        "to_user_id": str(invited_user["_id"]),
        "to_email": email,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    result = invitations_collection.insert_one(invitation)
    
    return jsonify({"invitation": {"id": str(result.inserted_id), "status": "pending"}}), 201

@app.route("/api/family/invitations", methods=["GET"])
def get_invitations():
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    invitations_collection = db["invitations"]
    invitations = list(invitations_collection.find({"to_user_id": payload["sub"], "status": "pending"}))
    
    return jsonify({"invitations": [{"id": str(i["_id"]), "from_email": i.get("from_email", "Unknown")} for i in invitations]}), 200

@app.route("/api/family/invitations/<invitation_id>/accept", methods=["POST"])
def accept_invitation(invitation_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    invitations_collection = db["invitations"]
    invitation = invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    
    if not invitation:
        return jsonify({"detail": "Invitation not found"}), 404
    
    if invitation["to_user_id"] != payload["sub"]:
        return jsonify({"detail": "Not authorized"}), 403
    
    invitations_collection.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$set": {"status": "accepted"}}
    )
    
    return jsonify({"status": "accepted"}), 200

@app.route("/api/family/<family_id>", methods=["DELETE"])
def delete_family(family_id):
    if db is None:
        return jsonify({"detail": "Database connection failed"}), 503
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"detail": "Missing token"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"detail": "Invalid token"}), 401
    
    families_collection = db["families"]
    family = families_collection.find_one({"_id": ObjectId(family_id)})
    
    if not family:
        return jsonify({"detail": "Family not found"}), 404
    
    if family["admin"] != payload["sub"]:
        return jsonify({"detail": "Only admin can delete family"}), 403
    
    families_collection.delete_one({"_id": ObjectId(family_id)})
    return jsonify({"success": True}), 200

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
