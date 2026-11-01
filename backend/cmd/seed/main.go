package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
	"github.com/quorix/quorix-backend/internal/security"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := database.Connect(ctx, cfg.Database)
	if err != nil {
		slog.Error("Failed to connect to database", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	queries := db.New(pool.Pool)
	slog.Info("Starting database seed with real technical developer content...")

	// 1. Seed Categories
	categories := []struct {
		Name        string
		Slug        string
		Description string
		IconName    string
		SortOrder   int32
	}{
		{"Go & Systems", "go-systems", "Low-level systems programming, high-throughput microservices, and Go concurrency patterns.", "terminal", 1},
		{"Distributed Systems", "distributed-systems", "Consensus algorithms, event-driven architectures, replication, and fault tolerance.", "cpu", 2},
		{"Database Architecture", "databases", "PostgreSQL internals, indexing strategies, query execution plans, and storage engines.", "database", 3},
		{"Frontend & Next.js", "frontend", "React Server Components, Next.js App Router architectures, and high-performance Web APIs.", "layout", 4},
		{"DevOps & Cloud", "devops", "Kubernetes cluster design, Linux eBPF, observability pipelines, and Docker containerization.", "server", 5},
		{"Security & Cryptography", "security", "Zero-trust network access, OWASP hardening, Argon2id, and cryptographic primitives.", "shield", 6},
	}

	categoryMap := make(map[string]pgtype.UUID)
	for _, c := range categories {
		existing, err := queries.GetCategoryBySlug(ctx, c.Slug)
		if err == nil && existing.ID.Valid {
			categoryMap[c.Slug] = existing.ID
			continue
		}
		cat, err := queries.CreateCategory(ctx, db.CreateCategoryParams{
			Name:        c.Name,
			Slug:        c.Slug,
			Description: pgtype.Text{String: c.Description, Valid: true},
			IconName:    pgtype.Text{String: c.IconName, Valid: true},
			SortOrder:   c.SortOrder,
		})
		if err != nil {
			slog.Warn("Could not insert category", slog.String("slug", c.Slug), slog.String("error", err.Error()))
		} else {
			categoryMap[c.Slug] = cat.ID
		}
	}

	// 2. Seed Tags
	tags := []struct {
		Name string
		Slug string
		Desc string
	}{
		{"Go", "go", "The Go programming language ecosystem and runtime"},
		{"Concurrency", "concurrency", "Goroutines, channels, mutexes, and thread synchronization"},
		{"PostgreSQL", "postgresql", "Relational database architecture, MVCC, and query optimization"},
		{"Next.js", "nextjs", "Full-stack React framework with App Router and Turbopack"},
		{"Kubernetes", "kubernetes", "Container orchestration and cloud-native infrastructure"},
		{"Architecture", "architecture", "System design trade-offs, monoliths, and distributed topologies"},
	}

	tagMap := make(map[string]pgtype.UUID)
	for _, t := range tags {
		existing, err := queries.GetTagBySlug(ctx, t.Slug)
		if err == nil && existing.ID.Valid {
			tagMap[t.Slug] = existing.ID
			continue
		}
		tag, err := queries.CreateTag(ctx, db.CreateTagParams{
			Name:        t.Name,
			Slug:        t.Slug,
			Description: pgtype.Text{String: t.Desc, Valid: true},
		})
		if err != nil {
			slog.Warn("Could not insert tag", slog.String("slug", t.Slug), slog.String("error", err.Error()))
		} else {
			tagMap[t.Slug] = tag.ID
		}
	}

	// 3. Seed Core Authors
	authors := []struct {
		Email       string
		Username    string
		DisplayName string
		Headline    string
		Bio         string
		Role        string
		Avatar      string
	}{
		{
			"alex.morgan@quorix.io",
			"alexmorgan",
			"Alex Morgan",
			"Principal Systems Architect | Ex-Cloudflare | Go Core Contributor",
			"Building high-throughput network engines and distributed consensus clusters. Writing about low-latency systems and concurrency models.",
			"author",
			"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
		},
		{
			"elena.rostova@quorix.io",
			"elenarostova",
			"Elena Rostova",
			"Database Infrastructure Engineer | PostgreSQL Specialist",
			"Focusing on query optimization, transaction isolation levels, storage engine internals, and distributed PostgreSQL scaling.",
			"author",
			"https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
		},
		{
			"marcus.vance@quorix.io",
			"marcusvance",
			"Marcus Vance",
			"Staff Frontend Engineer | React & Next.js Core Advocate",
			"Obsessed with compiler toolchains, web performance metrics, React Server Component lifecycles, and edge computing runtimes.",
			"author",
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
		},
	}

	authorUserIDs := make(map[string]pgtype.UUID)
	pwHash, _ := security.HashPassword("QuorixPass2026!")

	for _, a := range authors {
		existingUser, err := queries.GetUserByEmail(ctx, a.Email)
		var uid pgtype.UUID
		if err == nil && existingUser.Email != "" {
			uid = existingUser.ID
		} else {
			newUser, err := queries.CreateUser(ctx, db.CreateUserParams{
				Email:        a.Email,
				PasswordHash: pwHash,
				Role:         a.Role,
				Status:       "active",
			})
			if err != nil {
				slog.Error("Failed to create author user", slog.String("email", a.Email), slog.String("error", err.Error()))
				continue
			}
			uid = newUser.ID
			_ = queries.SetUserEmailVerified(ctx, uid)

			_, _ = queries.CreateProfile(ctx, db.CreateProfileParams{
				UserID:      uid,
				Username:    a.Username,
				DisplayName: a.DisplayName,
			})
		}
		authorUserIDs[a.Username] = uid

		_, _ = queries.UpdateProfile(ctx, db.UpdateProfileParams{
			UserID:      uid,
			DisplayName: a.DisplayName,
			Headline:    pgtype.Text{String: a.Headline, Valid: true},
			Bio:         pgtype.Text{String: a.Bio, Valid: true},
			AvatarUrl:   pgtype.Text{String: a.Avatar, Valid: true},
		})
	}

	// 4. Seed Real Technical Articles
	articles := []struct {
		AuthorUsername string
		CategorySlug   string
		TagSlugs       []string
		Title          string
		Slug           string
		Subtitle       string
		Featured       bool
		ViewsCount     int32
		LikesCount     int32
		CommentsCount  int32
		ReadingTime    int32
		Content        string
		ContentHTML    string
	}{
		{
			"alexmorgan",
			"go-systems",
			[]string{"go", "concurrency", "architecture"},
			"Mastering Go Concurrency: Pipelines, Fan-Out, and Context Cancellation",
			"go-concurrency-pipelines-fan-out",
			"A production-tested blueprint for constructing high-throughput asynchronous workloads without resource leakage.",
			true,
			4520,
			328,
			42,
			9,
			`# Mastering Go Concurrency: Pipelines, Fan-Out, and Context Cancellation

Concurrency in Go is easy to start with, but notoriously difficult to get right at scale. The promise of cheap goroutines often blinds engineers to the reality of unbounded channel buffers, goroutine leaks, and synchronization bottlenecks under extreme load.

In this deep-dive, we examine production-proven patterns for constructing high-throughput concurrent pipelines in Go.

## 1. The Anatomy of an Idiomatic Pipeline

A concurrent pipeline is a series of stages connected by channels, where each stage is a group of goroutines running the same function:

1. Inbound Stage: Ingests raw data or requests from the network or database.
2. Transform / Compute Stage: Performs CPU-heavy business logic, JSON decoding, or cryptographic validation.
3. Outbound Stage: Persists results to disk, streams across gRPC, or delivers to subscribers.

### Rule 1: Always Bound Your Goroutine Ingress
Unbounded worker launches under spikes will exhaust file descriptors and overwhelm the Go runtime garbage collector. Always bound concurrency with semaphore channels or fixed worker pools.

Example Worker Pool Implementation:
- Allocate a bounded job channel with fixed capacity.
- Launch a deterministic number of worker goroutines (e.g. NumCPU * 2).
- Use select statements with context cancellation to guarantee prompt cleanup.

## 2. Preventing Goroutine Leaks with Context Propagation

A goroutine leak occurs when a goroutine begins execution but is blocked indefinitely on a channel read or write because the caller abandoned the request.

Always ensure the root context.Context propagates down every pipeline stage. When an HTTP client disconnects, req.Context().Done() fires immediately, reclaiming all in-flight workers.

## Summary Checklist

- Never create a goroutine without knowing how it will exit.
- Prefer unbuffered channels unless you have profiled a measurable latency reduction with a bounded buffer.
- Pass context as the first parameter to every concurrent function.`,
			`<h1>Mastering Go Concurrency: Pipelines, Fan-Out, and Context Cancellation</h1><p>Concurrency in Go is easy to start with, but notoriously difficult to get right at scale...</p>`,
		},
		{
			"elenarostova",
			"databases",
			[]string{"postgresql", "architecture"},
			"PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive",
			"postgresql-indexing-internals-btree-brin-gin",
			"Understand physical disk layouts, tuple pointer lookups, and index selectivity to eliminate sequential table scans.",
			true,
			6210,
			480,
			57,
			12,
			`# PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive

Most developers slap a B-Tree index on foreign keys and call it a day. While B-Tree is the versatile workhorse of relational databases, understanding its underlying physical layout—and when to replace it with BRIN or GIN—can reduce storage footprints by 90% and accelerate query execution by orders of magnitude.

## 1. The Standard B-Tree: High Selectivity Champion

A PostgreSQL B-Tree is an N-ary balanced search tree where leaf pages store index tuples containing key values and heap ItemPointerData (the physical block and offset of the corresponding row in table storage).

### When B-Tree Breaks Down
- Appended-only Time-Series Data: Inserting millions of sequential timestamps causes constant root-to-leaf page splits.
- Full-Text Search & Inverted Indexes: B-Trees cannot index individual elements of an array or words in a document vector efficiently.

## 2. BRIN (Block Range Index): The Big Data Secret Weapon

BRIN does not store individual row pointers. Instead, it divides heap storage into ranges of physical pages (typically 128 disk blocks) and records only the minimum and maximum values present in each range.

- Storage Comparison: A B-Tree on 500 million rows might consume 15 GB of RAM. The equivalent BRIN index takes under 10 MB!
- Ideal Use Cases: Clustered sequential tables, audit logs, and metrics where timestamp or auto-incrementing ID naturally aligns with physical storage insertion order.

## 3. GIN (Generalized Inverted Index): Arrays and Full-Text Search

GIN indexes multi-valued attributes by splitting each composite column into individual keys. In QUORIX, our full-text article search uses GIN over generated tsvector columns, executing multi-term searches in sub-millisecond latencies.`,
			`<h1>PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive</h1><p>Most developers slap a B-Tree index on foreign keys and call it a day...</p>`,
		},
		{
			"marcusvance",
			"frontend",
			[]string{"nextjs", "architecture"},
			"The Next.js App Router Mental Model: Server Components, Streaming, and Turbopack",
			"nextjs-app-router-mental-model-rsc-streaming",
			"How React Server Components decouple data fetching from client bundle sizes, enabling instant zero-JS reader experiences.",
			false,
			3890,
			290,
			34,
			8,
			`# The Next.js App Router Mental Model: Server Components, Streaming, and Turbopack

The architectural shift from the Pages Router to the App Router represents the most significant evolution in frontend engineering since the release of React hooks.

By separating components into Server Components (RSC) and Client Components ('use client'), developers can eliminate massive dependencies from the client JavaScript bundle while retaining rich, interactive client-side functionality.

## Zero Client Bundle for Reader Views

On QUORIX, guest readers can access long-form engineering essays without downloading bloated client markdown parsers. The markdown syntax tree and code highlighting are executed on the server, streaming semantic HTML directly to the browser.`,
			`<h1>The Next.js App Router Mental Model: Server Components, Streaming, and Turbopack</h1><p>The architectural shift from the Pages Router to the App Router...</p>`,
		},
		{
			"alexmorgan",
			"distributed-systems",
			[]string{"architecture", "concurrency"},
			"Designing Resilient Distributed Systems: Consensus, Gossip, and CAP",
			"designing-resilient-distributed-systems-consensus-cap",
			"Practical trade-offs in distributed topologies: why network partitions are inevitable and how to survive them.",
			false,
			5120,
			410,
			61,
			11,
			`# Designing Resilient Distributed Systems: Consensus, Gossip, and CAP

In distributed computing, failures are not anomalies; they are normal operational parameters. Network switches drop packets, DNS records cache stale IPs, and cloud instances experience unexpected hardware reboots.

Designing resilient systems requires engineering for failure at every tier:
1. **Idempotent Requests**: Guaranteeing that retrying a dropped network packet produces the exact same side-effect without duplicates.
2. **Consensus Protocols**: How Raft and Paxos maintain replicated state machines across clusters.
3. **Graceful Degradation**: Sacrificing non-critical telemetry to preserve core reading and publishing workflows.`,
			`<h1>Designing Resilient Distributed Systems: Consensus, Gossip, and CAP</h1><p>In distributed computing, failures are not anomalies...</p>`,
		},
	}

	for _, art := range articles {
		authorID, ok := authorUserIDs[art.AuthorUsername]
		if !ok {
			continue
		}
		catID := categoryMap[art.CategorySlug]

		// Check if article already exists
		existing, err := queries.GetArticleBySlug(ctx, art.Slug)
		if err == nil && existing.Title != "" {
			slog.Info("Article already seeded", slog.String("slug", art.Slug))
			continue
		}

		createdArt, err := queries.CreateArticle(ctx, db.CreateArticleParams{
			AuthorID:           authorID,
			CategoryID:         catID,
			Title:              art.Title,
			Slug:               art.Slug,
			Subtitle:           pgtype.Text{String: art.Subtitle, Valid: true},
			Content:            art.Content,
			ContentHtml:        art.ContentHTML,
			Status:             "published",
			ReadingTimeMinutes: art.ReadingTime,
			PublishedAt:        pgtype.Timestamptz{Time: time.Now().UTC().Add(-48 * time.Hour), Valid: true},
		})
		if err != nil {
			slog.Error("Failed to seed article", slog.String("slug", art.Slug), slog.String("error", err.Error()))
			continue
		}

		// Update metrics and featured flag
		_, _ = pool.Pool.Exec(ctx, `
			UPDATE articles 
			SET featured = $2, views_count = $3, likes_count = $4, comments_count = $5 
			WHERE id = $1`,
			createdArt.ID, art.Featured, art.ViewsCount, art.LikesCount, art.CommentsCount,
		)

		// Link tags
		for _, tagSlug := range art.TagSlugs {
			if tid, ok := tagMap[tagSlug]; ok {
				_ = queries.AddArticleTag(ctx, db.AddArticleTagParams{
					ArticleID: createdArt.ID,
					TagID:     tid,
				})
			}
		}

		// Increment author article count
		_ = queries.IncrementArticleCount(ctx, db.IncrementArticleCountParams{
			UserID:       authorID,
			ArticleCount: 1,
		})

		slog.Info("Seeded technical article", slog.String("slug", art.Slug), slog.String("author", art.AuthorUsername))
	}

	slog.Info("Database seeding completed successfully!")
}
