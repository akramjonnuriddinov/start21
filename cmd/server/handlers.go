package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type App struct {
	db      *pgxpool.Pool
	limiter *limiter
}

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"createdAt"`
}

var (
	usernameRe = regexp.MustCompile(`^[a-z0-9]{3,20}$`)
	pinRe      = regexp.MustCompile(`^[0-9]{4}$`)
	lessonRe   = regexp.MustCompile(`^(lesson-[0-9]{2}|words)$`)
)

func (a *App) routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/register", a.register)
	mux.HandleFunc("POST /api/login", a.login)
	mux.HandleFunc("GET /api/username-available", a.usernameAvailable)

	mux.HandleFunc("POST /api/logout", a.auth(a.logout))
	mux.HandleFunc("GET /api/me", a.auth(a.me))
	mux.HandleFunc("GET /api/state", a.auth(a.state))
	mux.HandleFunc("PUT /api/progress/{lesson}", a.auth(a.saveProgress))
	mux.HandleFunc("POST /api/xp", a.auth(a.addXP))
	mux.HandleFunc("GET /api/leaderboard", a.auth(a.leaderboard))
}

// ---------- helpers ----------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

func serverErr(w http.ResponseWriter, err error) {
	log.Printf("error: %v", err)
	writeErr(w, http.StatusInternalServerError, "something went wrong")
}

func normUsername(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func hashToken(t string) string {
	sum := sha256.Sum256([]byte(t))
	return hex.EncodeToString(sum[:])
}

func (a *App) newSession(ctx context.Context, userID int64) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	_, err := a.db.Exec(ctx, `INSERT INTO sessions (token_hash, user_id) VALUES ($1, $2)`, hashToken(token), userID)
	return token, err
}

// ---------- auth middleware ----------

type ctxKey struct{}

func userFrom(r *http.Request) *User { return r.Context().Value(ctxKey{}).(*User) }

func (a *App) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			writeErr(w, http.StatusUnauthorized, "not logged in")
			return
		}
		var u User
		err := a.db.QueryRow(r.Context(), `
			UPDATE sessions s SET last_seen = now()
			FROM users u
			WHERE s.token_hash = $1 AND u.id = s.user_id
			RETURNING u.id, u.name, u.username, u.created_at`, hashToken(token),
		).Scan(&u.ID, &u.Name, &u.Username, &u.CreatedAt)
		if errors.Is(err, pgx.ErrNoRows) {
			writeErr(w, http.StatusUnauthorized, "session expired, please log in again")
			return
		}
		if err != nil {
			serverErr(w, err)
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, &u)))
	}
}

// ---------- accounts ----------

type credentials struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	PIN      string `json:"pin"`
}

func (a *App) register(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !readJSON(w, r, &in) {
		return
	}
	name := strings.Join(strings.Fields(in.Name), " ")
	username := normUsername(in.Username)
	switch {
	case name == "" || utf8.RuneCountInString(name) > 40:
		writeErr(w, http.StatusBadRequest, "Name must be 1–40 characters")
		return
	case !usernameRe.MatchString(username):
		writeErr(w, http.StatusBadRequest, "Username: 3–20 letters or numbers, no spaces")
		return
	case !pinRe.MatchString(in.PIN):
		writeErr(w, http.StatusBadRequest, "PIN must be exactly 4 digits")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.PIN), bcrypt.DefaultCost)
	if err != nil {
		serverErr(w, err)
		return
	}
	var u User
	err = a.db.QueryRow(r.Context(),
		`INSERT INTO users (name, username, pin_hash) VALUES ($1, $2, $3)
		 RETURNING id, name, username, created_at`, name, username, string(hash),
	).Scan(&u.ID, &u.Name, &u.Username, &u.CreatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeErr(w, http.StatusConflict, "That username is taken")
		return
	}
	if err != nil {
		serverErr(w, err)
		return
	}
	token, err := a.newSession(r.Context(), u.ID)
	if err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "user": u})
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !readJSON(w, r, &in) {
		return
	}
	username := normUsername(in.Username)
	key := "login:" + username
	if wait := a.limiter.blocked(key); wait > 0 {
		writeErr(w, http.StatusTooManyRequests,
			fmt.Sprintf("Too many wrong PINs. Try again in %d seconds", int(math.Ceil(wait.Seconds()))))
		return
	}

	var u User
	var hash string
	err := a.db.QueryRow(r.Context(),
		`SELECT id, name, username, created_at, pin_hash FROM users WHERE username = $1`, username,
	).Scan(&u.ID, &u.Name, &u.Username, &u.CreatedAt, &hash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		serverErr(w, err)
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, http.StatusUnauthorized, "No account with that username")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.PIN)) != nil {
		a.limiter.fail(key)
		writeErr(w, http.StatusUnauthorized, "Wrong PIN")
		return
	}
	a.limiter.reset(key)

	token, err := a.newSession(r.Context(), u.ID)
	if err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u})
}

func (a *App) usernameAvailable(w http.ResponseWriter, r *http.Request) {
	u := normUsername(r.URL.Query().Get("u"))
	if !usernameRe.MatchString(u) {
		writeJSON(w, http.StatusOK, map[string]any{"available": false, "valid": false})
		return
	}
	var exists bool
	if err := a.db.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM users WHERE username = $1)`, u).Scan(&exists); err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"available": !exists, "valid": true})
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if _, err := a.db.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash = $1`, hashToken(token)); err != nil {
		serverErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, userFrom(r))
}

// ---------- progress ----------

func (a *App) state(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	progress := map[string]json.RawMessage{}
	rows, err := a.db.Query(r.Context(), `SELECT lesson_id, data FROM lesson_progress WHERE user_id = $1`, u.ID)
	if err != nil {
		serverErr(w, err)
		return
	}
	for rows.Next() {
		var id string
		var data []byte
		if err := rows.Scan(&id, &data); err != nil {
			serverErr(w, err)
			return
		}
		progress[id] = data
	}
	if err := rows.Err(); err != nil {
		serverErr(w, err)
		return
	}

	xp := map[string]int{}
	rows, err = a.db.Query(r.Context(), `SELECT to_char(day, 'YYYY-MM-DD'), xp FROM daily_xp WHERE user_id = $1`, u.ID)
	if err != nil {
		serverErr(w, err)
		return
	}
	for rows.Next() {
		var day string
		var n int
		if err := rows.Scan(&day, &n); err != nil {
			serverErr(w, err)
			return
		}
		xp[day] = n
	}
	if err := rows.Err(); err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": u, "progress": progress, "xp": xp})
}

func (a *App) saveProgress(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	lesson := r.PathValue("lesson")
	if !lessonRe.MatchString(lesson) {
		writeErr(w, http.StatusBadRequest, "unknown lesson")
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil {
		writeErr(w, http.StatusRequestEntityTooLarge, "progress too large")
		return
	}
	var parsed struct {
		Attempts []struct {
			Correct float64 `json:"correct"`
			Total   float64 `json:"total"`
		} `json:"attempts"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid progress")
		return
	}
	done := len(parsed.Attempts) > 0
	var best *float64
	for _, at := range parsed.Attempts {
		if at.Total <= 0 {
			continue
		}
		s := math.Min(1, at.Correct/at.Total)
		if best == nil || s > *best {
			best = &s
		}
	}

	_, err = a.db.Exec(r.Context(), `
		INSERT INTO lesson_progress (user_id, lesson_id, data, done, best_score, updated_at)
		VALUES ($1, $2, $3, $4, $5, now())
		ON CONFLICT (user_id, lesson_id) DO UPDATE
		SET data = EXCLUDED.data, done = EXCLUDED.done, best_score = EXCLUDED.best_score, updated_at = now()`,
		u.ID, lesson, body, done, best)
	if err != nil {
		serverErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) addXP(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	var in struct {
		Day    string `json:"day"`
		Amount int    `json:"amount"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	day, err := time.Parse("2006-01-02", in.Day)
	// The day is the student's local date; allow for time zones but not backfilling.
	if err != nil || math.Abs(time.Since(day).Hours()) > 50 {
		writeErr(w, http.StatusBadRequest, "invalid day")
		return
	}
	if in.Amount < 0 || in.Amount > 200 {
		writeErr(w, http.StatusBadRequest, "invalid amount")
		return
	}
	var total int
	err = a.db.QueryRow(r.Context(), `
		INSERT INTO daily_xp (user_id, day, xp) VALUES ($1, $2, $3)
		ON CONFLICT (user_id, day) DO UPDATE SET xp = daily_xp.xp + EXCLUDED.xp
		RETURNING xp`, u.ID, in.Day, in.Amount).Scan(&total)
	if err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"xp": total})
}

// ---------- group ----------

type leaderRow struct {
	Name     string   `json:"name"`
	Username string   `json:"username"`
	TotalXP  int      `json:"totalXp"`
	WeekXP   int      `json:"weekXp"`
	Done     int      `json:"done"`
	Accuracy *float64 `json:"accuracy"`
	Me       bool     `json:"me"`
}

func (a *App) leaderboard(w http.ResponseWriter, r *http.Request) {
	me := userFrom(r)
	rows, err := a.db.Query(r.Context(), `
		SELECT u.id, u.name, u.username,
		       COALESCE(x.total, 0)::int, COALESCE(x.week, 0)::int,
		       COALESCE(p.done, 0)::int, p.accuracy
		FROM users u
		LEFT JOIN (
			SELECT user_id, SUM(xp) AS total,
			       SUM(xp) FILTER (WHERE day >= CURRENT_DATE - 6) AS week
			FROM daily_xp GROUP BY user_id
		) x ON x.user_id = u.id
		LEFT JOIN (
			SELECT user_id, COUNT(*) FILTER (WHERE done) AS done,
			       AVG(best_score) FILTER (WHERE done)::float8 AS accuracy
			FROM lesson_progress GROUP BY user_id
		) p ON p.user_id = u.id
		ORDER BY COALESCE(x.total, 0) DESC, COALESCE(p.done, 0) DESC, u.created_at
		LIMIT 100`)
	if err != nil {
		serverErr(w, err)
		return
	}
	defer rows.Close()
	out := []leaderRow{}
	for rows.Next() {
		var id int64
		var row leaderRow
		if err := rows.Scan(&id, &row.Name, &row.Username, &row.TotalXP, &row.WeekXP, &row.Done, &row.Accuracy); err != nil {
			serverErr(w, err)
			return
		}
		row.Me = id == me.ID
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		serverErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
