package main

import (
	"sync"
	"time"
)

// limiter slows down PIN guessing. A 4-digit PIN has only 10,000 combinations,
// so after a few wrong tries the key (a username or an IP) is locked out for a
// while, and the lockout doubles on each further failure.
type limiter struct {
	mu      sync.Mutex
	entries map[string]*limitEntry
}

type limitEntry struct {
	fails int
	until time.Time
}

const (
	freeTries   = 5
	baseLockout = 30 * time.Second
	maxLockout  = 15 * time.Minute
)

func newLimiter() *limiter {
	l := &limiter{entries: map[string]*limitEntry{}}
	go func() {
		for range time.Tick(10 * time.Minute) {
			l.mu.Lock()
			for k, e := range l.entries {
				if time.Since(e.until) > maxLockout {
					delete(l.entries, k)
				}
			}
			l.mu.Unlock()
		}
	}()
	return l
}

// blocked reports how long the key must still wait (0 if it may try now).
func (l *limiter) blocked(key string) time.Duration {
	l.mu.Lock()
	defer l.mu.Unlock()
	if e, ok := l.entries[key]; ok {
		if d := time.Until(e.until); d > 0 {
			return d
		}
	}
	return 0
}

func (l *limiter) fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	e, ok := l.entries[key]
	if !ok {
		e = &limitEntry{}
		l.entries[key] = e
	}
	e.fails++
	if e.fails >= freeTries {
		lock := baseLockout << (e.fails - freeTries)
		if lock > maxLockout || lock <= 0 {
			lock = maxLockout
		}
		e.until = time.Now().Add(lock)
	}
}

func (l *limiter) reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}
