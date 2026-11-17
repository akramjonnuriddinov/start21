-- Applied on every start; every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    username   TEXT        NOT NULL UNIQUE,
    pin_hash   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the SHA-256 of a session token is stored, so a DB leak can't be used to log in.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- One row per user per lesson. `data` is the client's lesson state (answers, key,
-- attempts, notes, bookmarks…). `done` and `best_score` are derived from it on
-- write so the leaderboard doesn't have to parse JSON.
CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id  TEXT        NOT NULL,
    data       JSONB       NOT NULL,
    done       BOOLEAN     NOT NULL DEFAULT false,
    best_score REAL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

-- XP earned per calendar day (the student's local date). A row with 0 XP still
-- counts as an active day for the streak.
CREATE TABLE IF NOT EXISTS daily_xp (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day     DATE   NOT NULL,
    xp      INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
