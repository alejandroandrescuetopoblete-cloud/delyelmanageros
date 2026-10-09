# Delytel Manager OS — Fase 1 y 2 (base funcional)

Incluye: modo Artista / Manager, perfiles, selector de artista (datos aislados por artista), dashboard con alertas proactivas, tareas con prioridades y estados, calendario, Release Manager (genera plan 30 → +7 días), CRM con detección de contactos sin seguimiento, y Chat IA con contexto del artista.

Los datos se guardan en el navegador (localStorage). Para multiusuario real, el siguiente paso es agregar base de datos y autenticación (ej. Supabase).

## Subir a GitHub
    git init && git add . && git commit -m "Delytel Manager OS" 
    git branch -M main && git remote add origin https://github.com/TU_USUARIO/delytel-manager-os.git && git push -u origin main

## Desplegar en Vercel
1. vercel.com → Add New → Project → importa el repo (Framework: Vite, se detecta solo).
2. Settings → Environment Variables: `GEMINI_API_KEY` (clave de aistudio.google.com/apikey). Opcional: `GEMINI_MODEL`, `GEMINI_SEARCH`.
3. Deploy. El Chat IA usa `/api/chat` (la clave nunca llega al navegador).

## Local
    npm install
    npm run dev          # app sin chat IA
    npx vercel dev       # app + /api/chat (requiere .env.local)
