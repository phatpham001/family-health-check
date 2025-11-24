# Health Check Backend

Flask backend với MongoDB cho ứng dụng Family Health Check.

## Setup

1. Tạo virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# hoặc
venv\Scripts\activate  # Windows
```

2. Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

3. Tạo file `.env`:
```bash
cp .env.example .env
```

4. Chạy server:
```bash
python3 main.py
```

Server sẽ chạy tại `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
  - Body: `{"email": "...", "password": "...", "name": "..."}`
  - Response: `{"access_token": "...", "token_type": "bearer"}`

- `POST /api/auth/login` - Đăng nhập
  - Body: `{"email": "...", "password": "..."}`
  - Response: `{"access_token": "...", "token_type": "bearer"}`

### Users
- `GET /api/users/me` - Lấy thông tin người dùng hiện tại
  - Header: `Authorization: Bearer <token>`
  - Response: `{"id": "...", "email": "...", "name": "...", "created_at": "..."}`

### Health
- `GET /api/health` - Health check
  - Response: `{"status": "ok"}`

## Database

MongoDB được lưu trữ tại: `mongodb+srv://hoaiphieu99:p300499@health-check.ph9mqyl.mongodb.net/`

Collections:
- `users` - Thông tin người dùng
