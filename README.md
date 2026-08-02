# URL Shortener API — Project 3 (Database Integration)

Builds on Project 2's API by replacing in-memory storage with a real
database, using **Prisma** (ORM) + **SQLite** (database engine).

SQLite is used here so the project runs with zero external setup — no
database server to install. The schema and code work the same way with
PostgreSQL; see "Switching to PostgreSQL" below if you want to match a
production-style setup.

## Schema

One table, `Link`:

| Column      | Type     | Notes                          |
|-------------|----------|---------------------------------|
| id          | Int      | primary key, auto-increment     |
| code        | String   | unique short code                |
| originalUrl | String   | the long URL                    |
| createdAt   | DateTime | set automatically on create      |
| updatedAt   | DateTime | set automatically on update      |

Defined in `prisma/schema.prisma`.

## Endpoints (full CRUD)

| Method | Route         | Operation | Description                            |
|--------|---------------|-----------|------------------------------------------|
| POST   | /links        | Create    | Create a short link from a long URL      |
| GET    | /links        | Read      | List all short links                     |
| GET    | /links/:code  | Read      | Get metadata for one link (no redirect)  |
| PUT    | /links/:code  | Update    | Change the destination URL for a code    |
| DELETE | /links/:code  | Delete    | Delete a short link                      |
| GET    | /:code        | —         | Redirects to the original URL            |

## How to run it

```bash
npm install
npx prisma generate
npm run migrate
npm start
```

- `npx prisma generate` builds the Prisma Client based on the schema
- `npm run migrate` creates the actual `dev.db` SQLite file and the `Link` table
- `npm start` runs the server on `http://localhost:3000`

You only need to run `generate` and `migrate` once (and again if you
change `schema.prisma`).

## How to test it

```bash
# Create
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com"}'

# Read all
curl http://localhost:3000/links

# Read one
curl http://localhost:3000/links/<code>

# Update
curl -X PUT http://localhost:3000/links/<code> \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.bing.com"}'

# Delete
curl -X DELETE http://localhost:3000/links/<code>

# Redirect (open in browser, or):
curl -i http://localhost:3000/<code>
```

You can also inspect the database visually at any time with:
```bash
npm run studio
```
This opens Prisma Studio in your browser — a GUI to view/edit table rows directly.

## Validation & status codes

- Missing/invalid `url` → `400 Bad Request`
- Successful creation → `201 Created`
- Successful read/update → `200 OK`
- Successful delete → `204 No Content`
- Unknown code → `404 Not Found`
- Unexpected server error → `500 Internal Server Error`

## Switching to PostgreSQL

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. In `.env`, set `DATABASE_URL` to your Postgres connection string, e.g.:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/urlshortener"
   ```
   (A free hosted Postgres like [Neon](https://neon.tech) or [Supabase](https://supabase.com) works too — no local install needed.)
3. Run `npx prisma migrate dev --name init` again.

Nothing else in `server.js` needs to change — this is the whole point of using an ORM.
