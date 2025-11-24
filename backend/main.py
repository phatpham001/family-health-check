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
    user_doc = {
        "email": data["email"],
        "password": hashed_password,
        "name": data["name"],
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
    family = families_collection.find_one({"user_id": payload["sub"]})
    if not family:
        family = {
            "user_id": payload["sub"],
            "name": "My Family",
            "created_at": datetime.utcnow()
        }
        result = families_collection.insert_one(family)
        family["_id"] = result.inserted_id
    return jsonify({"family": {"id": str(family["_id"]), "name": family["name"]}}), 200

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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
