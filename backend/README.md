# TaskFlow Backend

REST API на NestJS с PostgreSQL, TypeORM и JWT-аутентификацией. Access token
возвращается клиенту в JSON, а ротируемый refresh token хранится в `HttpOnly`
cookie. Access JWT проверяется stateless: без запроса к таблице сессий на каждом
защищённом маршруте.

## Быстрый запуск

Полный backend вместе с PostgreSQL:

```bash
docker compose up --build
```

После запуска:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- healthcheck: `http://localhost:3000/api/v1/health`

Compose содержит безопасные только для разработки значения по умолчанию. Для
развёртывания обязательно задайте собственные `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, пароль PostgreSQL и включите HTTPS.

## Локальная разработка

```bash
cp .env.example .env
docker compose up -d postgres
npm run migration:run
npm run start:dev
```

PostgreSQL из Compose доступен локальному NestJS на `localhost:5434`, чтобы не
конфликтовать с системной PostgreSQL на стандартном порту `5432`.

Создание новой миграции после изменения entities:

```bash
npm run migration:generate -- src/database/migrations/DescribeChange
```

## Auth API

Все маршруты имеют префикс `/api/v1`.

| Метод | Маршрут | Авторизация |
| --- | --- | --- |
| POST | `/auth/register` | публичный |
| POST | `/auth/login` | публичный |
| POST | `/auth/refresh` | refresh cookie |
| POST | `/auth/logout` | refresh cookie |
| POST | `/auth/logout-all` | Bearer access token |
| GET | `/auth/me` | Bearer access token |

Регистрация автоматически создаёт сессию:

```bash
curl -i -c cookies.txt http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Иван","surname":"Иванов","email":"ivan@example.com","password":"password123","passwordConfirm":"password123"}'
```

Вызов закрытого endpoint:

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H 'Authorization: Bearer ACCESS_TOKEN'
```

Ротация refresh token:

```bash
curl -i -b cookies.txt -c cookies.txt \
  -X POST http://localhost:3000/api/v1/auth/refresh
```

## Интеграция с React

Запросы, использующие refresh cookie, должны включать credentials:

```ts
const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});
```

Access token можно хранить в `localStorage` и добавлять в заголовок
`Authorization: Bearer <token>`. При нескольких одновременных ответах `401`
фронтенд должен выполнять только один refresh-запрос и повторять остальные
запросы после его завершения.

После `logout` или `logout-all` frontend обязан удалить локальный access token.
Backend отзывает refresh-сессии немедленно, но уже выданный stateless access JWT
может использоваться до окончания его короткого срока действия (15 минут по
умолчанию).

## Тесты

```bash
npm test
npm run typecheck
npm run build
```

E2E-тесты используют отдельный PostgreSQL на порту `5433`:

```bash
docker compose --profile test up -d postgres-test
npm run test:e2e
docker compose --profile test stop postgres-test
```
