# Diagnostico gamificado de IA — Bootcamp

Pagina web autonoma para nivelar a los participantes de un bootcamp de IA. En vez de una encuesta, son **5 misiones jugables** que perfilan como cada persona piensa y trabaja con IA. Al final entrega una **carta de arquetipo** con radar, y el facilitador ve un **tablero en vivo** para nivelar los equipos.

Look corporativo MetLife (azul, marino, verde), mobile-first, sin dependencias ni build.

## Que mide

Cuatro dimensiones (los ejes del radar):

- **Explorador** — amplitud de herramientas que conoce y usa.
- **Constructor** — skill tecnico: prompting y capacidades demostradas.
- **Esceptico** — pensamiento critico: cazar alucinaciones y saber cuando NO usar IA.
- **Integrador** — cuanto ha metido IA a su trabajo real.

El arquetipo es la dimension mas alta.

## Las 5 misiones

1. **Arma tu arsenal** — clasifica herramientas en cofres (arrastrar o tocar).
2. **Arbol de habilidades** — auto-evalua cada skill con niveles.
3. **Caza de alucinaciones** — marca lo que la IA invento (reloj generoso).
4. **Tu jugada real** — decide como (o si) usar IA en escenarios de trabajo.
5. **Desafio del prompt** — repara un prompt pobre eligiendo las piezas correctas.

## Estructura

```
index.html            App del jugador
facilitador.html      Dashboard del facilitador
css/styles.css        Tema MetLife
js/config.js          Configuracion (MOCK_MODE, Supabase, sesion)
js/data.js            Contenido editable de las misiones
js/app.js             Flujo del jugador
js/scoring.js         Calculo de dimensiones y arquetipo
js/radar.js           Radar SVG
js/supabase.js        Guardado + tablero en vivo (mock o Supabase real)
js/ui.js              Utilidades de UI
js/missions/*.js      Una mision por archivo
js/facilitador.js     Modelo en vivo y agregados
```

## Probar en local

Cualquier servidor estatico sirve. Por ejemplo:

```bash
cd bootcamp-ia-diagnostico
python3 -m http.server 4700
```

- Jugador: http://localhost:4700/
- Facilitador: http://localhost:4700/facilitador.html

Ambos comparten el codigo de sesion (`?sesion=xxx` en la URL o el default en `config.js`). En **modo mock** el tablero se actualiza entre pestañas del mismo navegador.

## Conectar Supabase (opcional)

Arranca en **modo mock** (sin backend). Para guardar de verdad y tener tablero en vivo entre dispositivos:

> Las dos tablas (`bootcamp_diagnostico` y `bootcamp_tareas`) están consolidadas en
> `supabase/migrations/20260720000000_bootcamp_tablas.sql` — con acceso al proyecto,
> `supabase db push --project-ref hyylhendjtwdtflzsjdx` las crea de un jalón. Si no,
> pega ese archivo en el SQL Editor de Supabase.

1. Crea la tabla:

   ```sql
   create table bootcamp_diagnostico (
     id uuid primary key default gen_random_uuid(),
     sesion text,
     nombre text,
     equipo text,
     respuestas jsonb,
     dimensiones jsonb,
     arquetipo text,
     created_at timestamptz default now()
   );
   ```

   Activa Realtime en la tabla y una policy de insert/select para el rol anon segun tu politica.

2. En `js/config.js` pon `MOCK_MODE: false` y llena `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Publicar en GitHub Pages

Sube la carpeta como raiz del repo y activa Pages sobre la rama principal. Al ser 100% estatico, funciona tal cual.

## Editar contenido

Todo el texto de las misiones (herramientas, nodos del arbol, alucinaciones, escenarios, piezas del prompt, arquetipos) vive en `js/data.js`. No hace falta tocar la logica.

## Plan de trabajo con IA (solo admin)

Al terminar, el dashboard del facilitador muestra por participante **qué le está fallando**
(diagnóstico determinista, sin IA) y un botón **Generar plan de trabajo con IA**.

- El diagnóstico (`js/diagnostico.js`) sale de las respuestas: arsenal corto, skills flojos,
  no cazó alucinaciones, decisiones riesgosas con datos, prompting incompleto, dimensiones bajas.
- El plan lo genera OpenAI (`gpt-4o-mini`) vía una Edge Function, reusando la conexión de Polibio:
  la `OPENAI_API_KEY` vive como secreto de Supabase, nunca en el frontend.
- En **modo mock** (`MOCK_PLAN: true`) el plan se arma localmente de ejemplo, sin llamar a OpenAI.

### Desplegar la Edge Function (en el Supabase de Polibio)

```bash
cd bootcamp-ia-diagnostico
supabase functions deploy bootcamp-plan --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt
```

La función usa el secreto `OPENAI_API_KEY` que ya existe en ese proyecto. Para activarlo en el
frontend: en `js/config.js` pon `MOCK_MODE: false` y `MOCK_PLAN: false`.

> Aviso: el OpenAI de esa cuenta puede estar **sin cuota/billing**. Si el plan real falla con
> error de OpenAI, recarga el billing de OpenAI; mientras tanto usa `MOCK_PLAN: true`.

### Tabla (en el Supabase de Polibio)

```sql
create table bootcamp_diagnostico (
  id uuid primary key default gen_random_uuid(),
  sesion text,
  nombre text,
  equipo text,
  email text,
  respuestas jsonb,
  dimensiones jsonb,
  arquetipo text,
  created_at timestamptz default now()
);
alter table bootcamp_diagnostico enable row level security;
-- Datos no sensibles (nombre + niveles de skill). Acceso anon para el bootcamp:
create policy "bootcamp insert anon" on bootcamp_diagnostico for insert to anon with check (true);
create policy "bootcamp select anon" on bootcamp_diagnostico for select to anon using (true);
```

Activa Realtime en la tabla si quieres el tablero en vivo entre dispositivos.

## Seguimiento de tareas por correo (Resend + revisor)

Con el plan generado, el admin aprieta **Enviar plan y crear tareas**: se crea una tarea por
cada paso y se manda el correo (marca **Bootcamp IA**) con el link a la página de seguimiento.

- El usuario abre `seguimiento.html?sesion=...&u=<nombre>` (el link del correo), ve sus tareas
  y sube su respuesta/evidencia.
- El **revisor** (`bootcamp-followup`) evalúa las entregas con OpenAI (cumple / por reforzar +
  feedback) y a los que no entregan y ya vencieron les manda **recordatorios** (cada día, hasta 3).
- Dispara: botón **Revisar tareas ahora** en el admin, y el cron `.github/workflows/followup-cron.yml`
  (diario). Cadencia configurable en `js/config.js` → `TAREAS`.
- En **modo mock** todo funciona sin backend: los correos no se envían, se apilan en un "buzón"
  local visible en el admin, y la evaluación usa una heurística local.

### Tabla de tareas (en el Supabase de Polibio)

```sql
create table bootcamp_tareas (
  id uuid primary key,
  sesion text,
  participante text,
  email text,
  arquetipo text,
  orden int,
  paso jsonb,                 -- { titulo, accion, recurso, practica, prioridad }
  estado text default 'pendiente', -- pendiente|entregada|cumplida|rehacer|vencida
  creada_at timestamptz,
  fecha_limite timestamptz,
  respuesta text,
  entregada_at timestamptz,
  evaluacion jsonb,           -- { cumple, veredicto, feedback, modelo, at }
  recordatorios int default 0,
  ultimo_recordatorio_at timestamptz
);
alter table bootcamp_tareas enable row level security;
create policy "tareas anon rw" on bootcamp_tareas for all to anon using (true) with check (true);
```

### Desplegar las funciones de correo/revisor

```bash
supabase functions deploy bootcamp-email    --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt
supabase functions deploy bootcamp-followup --project-ref hyylhendjtwdtflzsjdx --no-verify-jwt
```

Usan los secretos ya existentes en Polibio: `RESEND_API_KEY`, `OPENAI_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. El remitente es `Bootcamp IA <noreply@metaiqcli.pro>`.

### Protección de las funciones (importante)

`bootcamp-plan`, `bootcamp-email` y `bootcamp-followup` se despliegan con `--no-verify-jwt`
(igual que otras funciones públicas de Polibio) porque las llama directo el navegador del admin.
Eso las deja **totalmente públicas a nivel de plataforma** — la protección real es una llave
compartida que cada función valida en código: header `x-bootcamp-key` contra el secreto de
Supabase `BOOTCAMP_APP_KEY`. El valor vive en `js/config.js` (`CONFIG.APP_KEY`) — no es un
secreto fuerte (es JS público), pero evita que bots que escanean funciones públicas las
disparen y gasten OpenAI/Resend. Hay que setear el mismo valor en ambos lados:

```bash
supabase secrets set BOOTCAMP_APP_KEY=<el mismo valor que CONFIG.APP_KEY> --project-ref hyylhendjtwdtflzsjdx
```

Si el secreto no está seteado en Supabase, las funciones igual funcionan (sin exigir la llave) —
para no romper nada en el primer deploy — pero **debe** setearse antes de dejarlo corriendo.

### Cron (recordatorios automáticos)

`.github/workflows/followup-cron.yml` corre a diario. En el repo, define los secrets:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BOOTCAMP_APP_KEY` (mismo valor que arriba), y `BASE_URL`
(la URL pública de GitHub Pages, para armar los links de los correos). También se puede correr
a mano desde la pestaña Actions.

## Fase 2 (ideas)

Prediccion social, apostar confianza, escenarios por rol, muro de aportaciones y reto por equipos.
