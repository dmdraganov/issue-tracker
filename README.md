## TaskFlow — SaaS для управления разработкой небольших команд

**B2B SaaS для управления проектами и задачами небольших команд. Реализованы workspace-based architecture, управление проектами и sprint'ами, Kanban/List views, фильтрация и сортировка задач, роли участников, комментарии и activity log.**

**Суть:** веб-сервис, в котором небольшая команда создаёт рабочее пространство, проекты и задачи, распределяет работу между участниками и отслеживает прогресс.

### Кто пользуется

Небольшие IT-команды: 2–20 человек.

У каждого пользователя есть аккаунт и доступ к одному или нескольким **workspaces**.

```text
Workspace
├── Members
├── Projects
│   ├── Project A
│   └── Project B
└── Settings
```

### Основной сценарий

Создаётся проект → команда формирует sprint → добавляет задачи → назначает исполнителей → задачи проходят по статусам → команда отслеживает прогресс.

```text
Backlog → To Do → In Progress → Review → Done
```

### Основные экраны

**Dashboard** — общая информация по workspace и проектам.

**Projects** — список проектов.

**Project** — задачи конкретного проекта, переключение между Board и List.

**Task** — подробная карточка задачи: описание, исполнитель, приоритет, сроки, комментарии, история изменений.

**Team** — участники workspace.

**Settings** — настройки workspace и проекта.

### Главные функции

- регистрация и авторизация;
- создание workspace и приглашение участников;
- создание проектов;
- создание и редактирование задач;
- назначение исполнителей;
- статусы, приоритеты, labels, due dates;
- Kanban с drag & drop;
- список задач с поиском, фильтрами и сортировкой;
- комментарии;
- activity log;
- sprint'ы;
- dashboard с базовой аналитикой.

### SaaS-часть

Главное отличие от обычного task manager:

```text
User
 ↓
Workspace
 ↓
Projects
 ↓
Tasks
```

То есть приложение изначально рассчитано на **несколько организаций**, а данные и участники изолированы между workspace.

Можно сделать простой тарифный план:

```text
Free
— 1 workspace
— до 5 участников
— до 3 проектов

Pro
— больше участников
— неограниченные проекты
— расширенная аналитика
```

Платежи для первой версии я бы даже не реализовывал — достаточно продемонстрировать модель SaaS.

### Технически

**Frontend**

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Redux Toolkit
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui

**UI / interaction**

- dnd-kit — для Kanban
- Recharts — для dashboard
- Sonner или аналог — notifications

**Testing**

- Vitest
- React Testing Library
- Playwright

**Backend**

- NestJS
- PostgreSQL
- Prisma
- REST API
- JWT + refresh tokens

**Infra**

- Docker / Docker Compose
- GitHub Actions
- Vercel для frontend
- отдельный VPS/облако для backend + PostgreSQL
