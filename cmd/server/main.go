// Command echo-server is the backend for the echo listening-practice app:
// PIN-based accounts, per-lesson progress, daily XP and a group leaderboard.
package main

import (
	"context"
	_ "embed"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schema string

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbURL := env("DATABASE_URL", "postgres://localhost:5432/echo_listening?sslmode=disable")
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("db ping: %v", err)
	}
	if _, err := pool.Exec(ctx, schema); err != nil {
		log.Fatalf("schema: %v", err)
	}

	app := &App{db: pool, limiter: newLimiter()}

	mux := http.NewServeMux()
	app.routes(mux)

	// In production, serve the built Vue app from the same origin. Defaults to
	// ./dist when it exists (the build output when run from the repo root).
	dir := os.Getenv("STATIC_DIR")
	if dir == "" {
		if fi, err := os.Stat("dist"); err == nil && fi.IsDir() {
			dir = "dist"
		}
	}
	if dir != "" {
		mux.Handle("GET /", http.FileServer(http.Dir(dir)))
		log.Printf("serving static files from %s", dir)
	}

	srv := &http.Server{
		Addr:              ":" + env("PORT", "8080"),
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
			log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
		}
	})
}
