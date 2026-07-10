# Care-Bridge AI 배포 가이드

## 1. Supabase 설정

1. https://supabase.com 에서 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 실행
3. Project Settings → API에서 복사:
   - `Project URL` → SUPABASE_URL
   - `anon/public key` → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role key` → SUPABASE_SERVICE_KEY

## 2. Groq API 키 발급

1. https://console.groq.com 가입
2. API Keys → Create API Key
3. 복사 → GROQ_API_KEY

## 3. Backend 배포 (Render)

1. GitHub에 코드 push
2. https://render.com → New Web Service
3. Repository 연결 → Root Directory: `backend`
4. 설정:
   - Build Command: `apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-kor && pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables 추가:
   - GROQ_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
   - CORS_ORIGINS (Vercel URL)
6. Deploy

## 4. Frontend 배포 (Vercel)

1. https://vercel.com → Import Project
2. Repository 연결 → Root Directory: `frontend`
3. Environment Variables 추가:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_BACKEND_URL (Render URL)
4. Deploy

## 5. 확인

- Render: `https://your-app.onrender.com/api/v1/health` → `{"status": "ok"}`
- Vercel: `https://your-app.vercel.app` → 로그인 페이지

## 6. 테스트 계정 생성

Supabase Auth → Users → Add User:
- Email: test@hospital.com
- Password: 원하는 비밀번호
- User Metadata: `{"role": "nurse"}`
