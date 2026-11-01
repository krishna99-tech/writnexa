package main

import (
	"context"
	"fmt"
	"log/slog"
	"math/big"
	"math/rand"
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
		{"Linux & eBPF", "linux-kernel", "Kernel internals, eBPF tracing, XDP network bypass, memory paging, and Linux subsystem profiling.", "terminal", 7},
		{"SRE & Observability", "cloud-sre", "Chaos engineering, SLI/SLO design, distributed tracing with OpenTelemetry, and incident response.", "activity", 8},
		{"AI & Distributed ML", "ai-infra", "GPU cluster orchestration, tensor parallelism, vector search at scale, and high-performance inference engines.", "cpu", 9},
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
		{"eBPF", "ebpf", "In-kernel bytecode execution, XDP, and zero-overhead observability"},
		{"Redis", "redis", "In-memory caching, distributed locks, pub/sub, and streams"},
		{"Docker", "docker", "OCI container virtualization, multi-stage builds, and isolation"},
		{"Rust", "rust", "Memory safety without garbage collection, ownership, and zero-cost abstractions"},
		{"Kafka", "kafka", "Distributed event streaming, log partitioning, and consumer groups"},
		{"Microservices", "microservices", "Service boundaries, contract testing, and choreography"},
		{"Zero-Trust", "zero-trust", "mTLS, SPIFFE/SPIRE, and cryptographic workload attestation"},
		{"OpenTelemetry", "opentelemetry", "Vendor-neutral distributed traces, metrics, and logs"},
		{"Performance", "performance", "CPU profiling, flamegraphs, memory allocation, and latency benchmarks"},
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

	// 2.5 Seed Super Admin Account
	adminEmail := "admin@quorix.io"
	adminPass := "QuorixAdmin2026!"
	adminHash, _ := security.HashPassword(adminPass)
	var adminUID pgtype.UUID
	existingAdmin, err := queries.GetUserByEmail(ctx, adminEmail)
	if err == nil && existingAdmin.Email != "" {
		adminUID = existingAdmin.ID
	} else {
		newAdmin, err := queries.CreateUser(ctx, db.CreateUserParams{
			Email:        adminEmail,
			PasswordHash: adminHash,
			Role:         "super_admin",
			Status:       "active",
		})
		if err == nil {
			adminUID = newAdmin.ID
			_ = queries.SetUserEmailVerified(ctx, newAdmin.ID)
			_, _ = queries.CreateProfile(ctx, db.CreateProfileParams{
				UserID:      newAdmin.ID,
				Username:    "admin",
				DisplayName: "System Administrator",
			})
			slog.Info("Default super_admin seeded successfully", slog.String("email", adminEmail))
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
			"elenarostova@quorix.io",
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
		{
			"devin.kumar@quorix.io",
			"devinkumar",
			"Devin Kumar",
			"Linux Kernel & eBPF Engineer | Linux Foundation Contributor",
			"Authoring eBPF bytecode, XDP packet filtering, and kernel debugging tools. Deep diving into Linux memory managers, slab allocators, and schedulers.",
			"author",
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
		},
		{
			"sarah.connor@quorix.io",
			"sarahconnor",
			"Sarah Connor",
			"Staff SRE & Chaos Engineering Lead | Ex-Google SRE",
			"Designing petabyte-scale telemetry pipelines, chaos experiments, and 99.999% uptime architectures. Passionate about OpenTelemetry and resilience.",
			"author",
			"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
		},
		{
			"aisha.patel@quorix.io",
			"aishapatel",
			"Aisha Patel",
			"Cryptography & Zero-Trust Architect | Principal Security Engineer",
			"Implementing post-quantum primitives, mTLS meshes, hardware security modules (HSM), and threat mitigation in mission-critical applications.",
			"author",
			"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=400",
		},
		{
			"kenji.bando@quorix.io",
			"kenjibando",
			"Kenji Bando",
			"Distributed AI & GPU Systems Lead | HPC Researcher",
			"Specializing in multi-node GPU clustering, InfiniBand interconnects, vLLM inference optimization, and distributed vector embeddings.",
			"author",
			"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
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

	// 4. Seed Comprehensive Technical Articles
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
			8920,
			640,
			58,
			9,
			`# Mastering Go Concurrency: Pipelines, Fan-Out, and Context Cancellation

Concurrency in Go is easy to start with, but notoriously difficult to get right at scale. The promise of cheap goroutines often blinds engineers to the reality of unbounded channel buffers, goroutine leaks, and synchronization bottlenecks under extreme load.

In this deep-dive, we examine production-proven patterns for constructing high-throughput concurrent pipelines in Go.

## 1. The Anatomy of an Idiomatic Pipeline

A concurrent pipeline is a series of stages connected by channels, where each stage is a group of goroutines running the same function:

1. **Inbound Stage**: Ingests raw data or requests from the network or database.
2. **Transform / Compute Stage**: Performs CPU-heavy business logic, JSON decoding, or cryptographic validation.
3. **Outbound Stage**: Persists results to disk, streams across gRPC, or delivers to subscribers.

### Rule 1: Always Bound Your Goroutine Ingress
Unbounded worker launches under spikes will exhaust file descriptors and overwhelm the Go runtime garbage collector. Always bound concurrency with semaphore channels or fixed worker pools.

    type WorkerPool struct {
        jobs    chan Job
        results chan Result
        workers int
    }

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
			[]string{"postgresql", "architecture", "performance"},
			"PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive",
			"postgresql-indexing-internals-btree-brin-gin",
			"Understand physical disk layouts, tuple pointer lookups, and index selectivity to eliminate sequential table scans.",
			true,
			11450,
			912,
			76,
			12,
			`# PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive

Most developers slap a B-Tree index on foreign keys and call it a day. While B-Tree is the versatile workhorse of relational databases, understanding its underlying physical layout—and when to replace it with BRIN or GIN—can reduce storage footprints by 90% and accelerate query execution by orders of magnitude.

## 1. The Standard B-Tree: High Selectivity Champion

A PostgreSQL B-Tree is an N-ary balanced search tree where leaf pages store index tuples containing key values and heap ItemPointerData (the physical block and offset of the corresponding row in table storage).

### When B-Tree Breaks Down
- **Appended-only Time-Series Data**: Inserting millions of sequential timestamps causes constant root-to-leaf page splits.
- **Full-Text Search & Inverted Indexes**: B-Trees cannot index individual elements of an array or words in a document vector efficiently.

## 2. BRIN (Block Range Index): The Big Data Secret Weapon

BRIN does not store individual row pointers. Instead, it divides heap storage into ranges of physical pages (typically 128 disk blocks) and records only the minimum and maximum values present in each range.

- **Storage Comparison**: A B-Tree on 500 million rows might consume 15 GB of RAM. The equivalent BRIN index takes under 10 MB!
- **Ideal Use Cases**: Clustered sequential tables, audit logs, and metrics where timestamp or auto-incrementing ID naturally aligns with physical storage insertion order.

## 3. GIN (Generalized Inverted Index): Arrays and Full-Text Search

GIN indexes multi-valued attributes by splitting each composite column into individual keys. In QUORIX, our full-text article search uses GIN over generated tsvector columns, executing multi-term searches in sub-millisecond latencies.`,
			`<h1>PostgreSQL Indexing Internals: B-Tree, BRIN, and GIN Deep Dive</h1><p>Most developers slap a B-Tree index on foreign keys and call it a day...</p>`,
		},
		{
			"marcusvance",
			"frontend",
			[]string{"nextjs", "architecture", "performance"},
			"The Next.js App Router Mental Model: Server Components, Streaming, and Turbopack",
			"nextjs-app-router-mental-model-rsc-streaming",
			"How React Server Components decouple data fetching from client bundle sizes, enabling instant zero-JS reader experiences.",
			false,
			7320,
			530,
			45,
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
			[]string{"architecture", "concurrency", "microservices"},
			"Designing Resilient Distributed Systems: Consensus, Gossip, and CAP",
			"designing-resilient-distributed-systems-consensus-cap",
			"Practical trade-offs in distributed topologies: why network partitions are inevitable and how to survive them.",
			false,
			9810,
			720,
			63,
			11,
			`# Designing Resilient Distributed Systems: Consensus, Gossip, and CAP

In distributed computing, failures are not anomalies; they are normal operational parameters. Network switches drop packets, DNS records cache stale IPs, and cloud instances experience unexpected hardware reboots.

Designing resilient systems requires engineering for failure at every tier:
1. **Idempotent Requests**: Guaranteeing that retrying a dropped network packet produces the exact same side-effect without duplicates.
2. **Consensus Protocols**: How Raft and Paxos maintain replicated state machines across clusters.
3. **Graceful Degradation**: Sacrificing non-critical telemetry to preserve core reading and publishing workflows.`,
			`<h1>Designing Resilient Distributed Systems: Consensus, Gossip, and CAP</h1><p>In distributed computing, failures are not anomalies...</p>`,
		},
		{
			"devinkumar",
			"linux-kernel",
			[]string{"ebpf", "linux", "performance"},
			"Demystifying eBPF: Programmable Kernel Tracing, XDP, and Zero-Overhead Telemetry",
			"demystifying-ebpf-linux-kernel-observability",
			"How modern systems engineers execute sandboxed bytecode directly inside the Linux kernel without kernel modules.",
			true,
			14200,
			1150,
			89,
			14,
			`# Demystifying eBPF: Programmable Kernel Tracing, XDP, and Zero-Overhead Telemetry

For decades, extending the Linux kernel required writing out-of-tree kernel modules. A single null pointer dereference or off-by-one loop index meant an immediate kernel panic, taking down the entire physical machine.

Enter **eBPF (Extended Berkeley Packet Filter)**: a revolutionary technology that allows engineers to execute sandboxed, verified bytecode inside the Linux kernel at runtime without modifying kernel source code or rebooting machines.

## 1. The Kernel In-Flight Verification Engine

Before any eBPF program is loaded into the kernel via the 'bpf()' syscall, the Linux kernel verifier analyzes the bytecode:
- It proves that loops are strictly bounded and guaranteed to terminate.
- It ensures pointers are never read out-of-bounds or dereferenced without null checks.
- It verifies that stack allocations remain within the strict 512-byte limit.

If the verifier fails to mathematically prove safety, the program is rejected before a single instruction runs.

## 2. High-Performance Packet Filtering with XDP

eBPF programs hooked to **XDP (eXpress Data Path)** run at the earliest possible interception point in the network stack: directly inside the network interface card (NIC) driver before the kernel allocates an 'sk_buff' memory structure.

    SEC("xdp")
    int drop_malicious_syn(struct xdp_md *ctx) {
        void *data = (void *)(long)ctx->data;
        void *data_end = (void *)(long)ctx->data_end;
        struct ethhdr *eth = data;
        if ((void *)(eth + 1) > data_end) return XDP_PASS;
        return XDP_DROP;
    }

By dropping malicious DDoS packets before network memory is allocated, servers can filter upwards of 25 million packets per second per CPU core.`,
			`<h1>Demystifying eBPF: Programmable Kernel Tracing, XDP, and Zero-Overhead Telemetry</h1><p>For decades, extending the Linux kernel required writing out-of-tree kernel modules...</p>`,
		},
		{
			"aishapatel",
			"security",
			[]string{"zero-trust", "microservices", "architecture"},
			"Production Zero-Trust with SPIFFE/SPIRE: Eliminating Static Secrets and Passwords",
			"zero-trust-architecture-mtls-spire-production",
			"Workload attestation, automated short-lived X.509 certificate rotation, and mutual TLS across polyglot microservices.",
			true,
			8420,
			680,
			52,
			10,
			`# Production Zero-Trust with SPIFFE/SPIRE: Eliminating Static Secrets and Passwords

Static credentials are an existential liability. In modern cloud environments, API tokens, long-lived database passwords, and hardcoded private keys leaked in repositories account for over 80% of major infrastructure breaches.

A true Zero-Trust architecture establishes cryptographic identity based on verifiable runtime characteristics rather than network topology or pre-shared secrets.

## 1. What is SPIFFE and SPIRE?

- **SPIFFE** (Secure Production Identity Framework for Everyone) is an open standard defining a universal identity format: the SPIFFE ID (e.g., 'spiffe://quorix.internal/ns/prod/sa/backend').
- **SPIRE** is the production-grade reference implementation of SPIFFE, composed of a centralized SPIRE Server and a local SPIRE Agent running as a DaemonSet on every node.

## 2. Workload Attestation: Who Are You Really?

When the QUORIX backend starts up, it connects to the local SPIRE Agent UNIX domain socket. The agent interrogates the host Linux kernel:
1. What is the process ID (PID)?
2. What are the cgroup v2 identifiers?
3. Which Kubernetes ServiceAccount token is mounted in its namespace?

If and only if the kernel attestation succeeds, SPIRE issues an ephemeral SVID (SPIFFE Verifiable Identity Document) with an X.509 certificate valid for only 60 minutes. The service never stores a long-lived secret on disk.`,
			`<h1>Production Zero-Trust with SPIFFE/SPIRE: Eliminating Static Secrets and Passwords</h1><p>Static credentials are an existential liability...</p>`,
		},
		{
			"alexmorgan",
			"go-systems",
			[]string{"go", "kafka", "concurrency", "performance"},
			"Building 100K Req/Sec Event Pipelines in Go with Apache Kafka",
			"building-high-throughput-kafka-pipelines-go",
			"Zero-allocation deserialization, rebalance mitigation, and idempotent producer semantics in production Go services.",
			false,
			12300,
			890,
			67,
			13,
			`# Building 100K Req/Sec Event Pipelines in Go with Apache Kafka

Scaling a streaming event architecture beyond 100,000 events per second requires rethinking every layer of your application: from memory allocations during JSON unmarshaling to the TCP socket buffer parameters of your network interface.

## 1. Avoiding the Garbage Collection Wall

At 100k req/sec, allocating even a tiny 128-byte struct per message creates over 12 MB/sec of heap churn. Under sustained throughput, Go's stop-the-world GC mark-termination phase will trigger latency spikes of up to 50ms.

### Solution: sync.Pool Message Recycling

    var eventPool = sync.Pool{
        New: func() interface{} { return new(TelemetryEvent) },
    }

## 2. Batching and Idempotent Producer Guarantees

Never send messages one-by-one over the wire. Configure your Kafka producer with 'linger.ms=5' and 'batch.size=65536' to allow the batcher to coalesce hundreds of messages into single TCP payloads, drastically reducing network packet syscalls.`,
			`<h1>Building 100K Req/Sec Event Pipelines in Go with Apache Kafka</h1><p>Scaling a streaming event architecture beyond 100,000 events per second...</p>`,
		},
		{
			"elenarostova",
			"databases",
			[]string{"postgresql", "architecture", "microservices"},
			"PostgreSQL Write-Ahead Logging (WAL) and Logical Decoding for Change Data Capture",
			"postgres-wal-replication-cdc-debezium",
			"How pgoutput and logical replication slots turn transactional databases into real-time streaming sources without polling.",
			false,
			7950,
			610,
			39,
			11,
			`# PostgreSQL Write-Ahead Logging (WAL) and Logical Decoding for Change Data Capture

Polling a database with 'SELECT * FROM orders WHERE updated_at > :last_poll' destroys database cache hit rates, locks tables, and misses rows that were updated and deleted between poll intervals.

Change Data Capture (CDC) via PostgreSQL logical decoding solves this fundamentally by tapping directly into the database's Write-Ahead Log (WAL).

## 1. How PostgreSQL WAL Logical Decoding Works

Every transaction committed in PostgreSQL is sequentially appended to binary WAL files on disk before being flushed to the heap tables. 

Logical decoding plugins (such as PostgreSQL's built-in 'pgoutput') read this stream of WAL records, filter them by publication, and decode them into discrete DML change events:
- 'INSERT INTO articles ...'
- 'UPDATE articles SET likes_count = likes_count + 1 WHERE id = ...'
- 'DELETE FROM comments WHERE id = ...'

## 2. Preventing Unbounded Disk Growth

When using logical replication slots, PostgreSQL will **never** delete WAL files until the consumer confirms the Log Sequence Number (LSN) via 'pg_replication_slot_advance'. 

Always monitor slot lag metrics: if your downstream consumer dies or pauses, your Postgres disk will fill up until the database crashes!`,
			`<h1>PostgreSQL Write-Ahead Logging (WAL) and Logical Decoding for Change Data Capture</h1><p>Polling a database with SELECT * FROM orders WHERE updated_at > :last_poll destroys database cache hit rates...</p>`,
		},
		{
			"kenjibando",
			"ai-infra",
			[]string{"performance", "architecture"},
			"Scaling Distributed LLM Inference with vLLM, PagedAttention, and Tensor Parallelism",
			"optimizing-vllm-distributed-inference-clusters",
			"Overcoming GPU memory fragmentation and KV-cache bottlenecks across multi-node H100 clusters.",
			true,
			15600,
			1340,
			104,
			15,
			`# Scaling Distributed LLM Inference with vLLM, PagedAttention, and Tensor Parallelism

Serving Large Language Models (LLMs) in production is fundamentally memory-bound. While model weights occupy dozens of gigabytes of VRAM, the real killer of throughput during multi-turn conversation is the **Key-Value (KV) Cache**.

## 1. The PagedAttention Paradigm

Traditional inference engines pre-allocate contiguous virtual memory for each request's KV-cache based on the maximum context length (e.g., 4096 tokens). Because most user prompts are short, up to 70% of GPU memory is wasted on unused allocations.

Inspired by virtual memory paging in operating systems, **PagedAttention** partitions the KV-cache into discrete non-contiguous physical blocks (typically 16 tokens per block).

- Blocks are allocated dynamically on-demand as generation proceeds.
- Multiple requests can share common prompt blocks (e.g., system prompts) via Copy-on-Write semantics.
- Memory waste is reduced to less than 4%, unlocking 2x–4x higher concurrency per GPU.

## 2. Tensor Parallelism across 8x H100 SXM5 GPUs

When weights exceed a single GPU's 80 GB VRAM, Tensor Parallelism shards matrix multiplications column-wise and row-wise across GPUs connected via NVLink (900 GB/s bidirectional bandwidth), synchronizing via ultra-fast All-Reduce operations.`,
			`<h1>Scaling Distributed LLM Inference with vLLM, PagedAttention, and Tensor Parallelism</h1><p>Serving Large Language Models (LLMs) in production is fundamentally memory-bound...</p>`,
		},
		{
			"sarahconnor",
			"cloud-sre",
			[]string{"kubernetes", "ebpf", "opentelemetry"},
			"Simulating Real-World Failure: Chaos Engineering in Kubernetes Using Linux eBPF and cgroups v2",
			"chaos-engineering-in-kubernetes-with-ebpf",
			"Testing system survivability under simulated packet corruption, artificial tail latencies, and CPU throttling.",
			false,
			6840,
			510,
			37,
			10,
			`# Simulating Real-World Failure: Chaos Engineering in Kubernetes Using Linux eBPF and cgroups v2

If your disaster recovery plan has never been executed against live production traffic, you do not have a disaster recovery plan; you have a wish list.

Chaos Engineering is the discipline of experimenting on a system in order to build confidence in its capability to withstand turbulent conditions in production.

## 1. Non-Invasive Fault Injection with Linux tc and eBPF

Traditional chaos tools often inject faults by terminating pods or restarting VMs. But the hardest bugs in distributed systems are subtle:
- A single microservice responding 500ms slower than normal.
- 2% packet loss on internal gRPC inter-service communication.
- CPU quota exhaustion causing thread starvation.

By leveraging Linux Traffic Control ('tc') and eBPF programs attached to container network namespaces, we can inject synthetic packet corruption and jitter with microsecond precision without touching container application code.`,
			`<h1>Simulating Real-World Failure: Chaos Engineering in Kubernetes Using Linux eBPF and cgroups v2</h1><p>If your disaster recovery plan has never been executed against live production traffic...</p>`,
		},
		{
			"marcusvance",
			"frontend",
			[]string{"nextjs", "performance"},
			"React Compiler and Server Actions: The Death of useMemo and Client-Side Fetch Boilerplate",
			"react-compiler-and-server-actions-deep-dive",
			"How automated AST compilation and server mutations radically simplify React state synchronization.",
			false,
			6490,
			470,
			31,
			9,
			`# React Compiler and Server Actions: The Death of useMemo and Client-Side Fetch Boilerplate

For nearly a decade, React developers have spent countless engineering hours manually optimizing re-renders with 'useMemo', 'useCallback', and 'React.memo'.

The React Compiler (formerly React Forget) fundamentally obsoletes manual memoization by analyzing JavaScript semantics at build time and automatically inserting granular cache boundaries.

## Server Actions: Progressive Enhancement for Web Apps

Pairing the React Compiler with Next.js Server Actions eliminates client API fetch wrappers and state management reducers for data mutations. Form submissions execute directly on the server, leveraging HTTP semantics with seamless optimistic UI updates on the client.`,
			`<h1>React Compiler and Server Actions: The Death of useMemo and Client-Side Fetch Boilerplate</h1><p>For nearly a decade, React developers have spent countless engineering hours...</p>`,
		},
		{
			"devinkumar",
			"go-systems",
			[]string{"rust", "performance", "architecture"},
			"Rust for Go & C Engineers: Borrow Checker Ergonomics and Zero-Cost Concurrency",
			"rust-for-systems-engineers-memory-safety",
			"A practical guide to ownership semantics, fearless concurrency, and interfacing with existing C/Go ABIs.",
			false,
			10120,
			810,
			54,
			12,
			`# Rust for Go & C Engineers: Borrow Checker Ergonomics and Zero-Cost Concurrency

Every systems engineer who transitions from C or Go to Rust experiences the initial struggle with the borrow checker. 

However, once ownership semantics click, the benefits are unmistakable: compile-time thread safety, deterministic resource deallocation (RAII) without garbage collection pauses, and zero-cost abstractions.

## 1. Move Semantics vs. Pointer Passing

In Go, passing a pointer shares memory, leaving synchronization to runtime conventions or mutexes. In Rust, values have a single owner. Moving a value transfers ownership permanently, guaranteeing data races are caught at compile time.`,
			`<h1>Rust for Go & C Engineers: Borrow Checker Ergonomics and Zero-Cost Concurrency</h1><p>Every systems engineer who transitions from C or Go to Rust experiences the initial struggle...</p>`,
		},
	}

	articleMap := make(map[string]pgtype.UUID)
	for _, art := range articles {
		authorID, ok := authorUserIDs[art.AuthorUsername]
		if !ok {
			continue
		}
		catID := categoryMap[art.CategorySlug]

		// Check if article already exists
		existing, err := queries.GetArticleBySlug(ctx, art.Slug)
		if err == nil && existing.Title != "" {
			articleMap[art.Slug] = existing.ID
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
		articleMap[art.Slug] = createdArt.ID

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

	// 5. Seed Author Follows Network
	slog.Info("Seeding author follow relationships...")
	followPairs := [][2]string{
		{"alexmorgan", "devinkumar"},
		{"alexmorgan", "elenarostova"},
		{"elenarostova", "alexmorgan"},
		{"elenarostova", "kenjibando"},
		{"devinkumar", "sarahconnor"},
		{"devinkumar", "aishapatel"},
		{"marcusvance", "alexmorgan"},
		{"sarahconnor", "devinkumar"},
		{"aishapatel", "alexmorgan"},
		{"kenjibando", "devinkumar"},
	}
	for _, pair := range followPairs {
		followerID := authorUserIDs[pair[0]]
		followingID := authorUserIDs[pair[1]]
		if followerID.Valid && followingID.Valid {
			_, _ = queries.CreateFollow(ctx, db.CreateFollowParams{
				FollowerID:  followerID,
				FollowingID: followingID,
			})
			_ = queries.UpdateFollowingCounts(ctx, db.UpdateFollowingCountsParams{
				UserID: followerID, FollowingCount: 1,
			})
			_ = queries.UpdateFollowerCounts(ctx, db.UpdateFollowerCountsParams{
				UserID: followingID, FollowerCount: 1,
			})
		}
	}
	// Admin follows all authors
	if adminUID.Valid {
		for _, authorUID := range authorUserIDs {
			_, _ = queries.CreateFollow(ctx, db.CreateFollowParams{
				FollowerID:  adminUID,
				FollowingID: authorUID,
			})
		}
	}

	// 6. Seed Threaded Comments
	slog.Info("Seeding threaded discussions and peer reviews...")
	commentsData := []struct {
		ArticleSlug    string
		AuthorUsername string
		Content        string
		Replies        []struct {
			AuthorUsername string
			Content        string
		}
	}{
		{
			ArticleSlug:    "go-concurrency-pipelines-fan-out",
			AuthorUsername: "elenarostova",
			Content:        "Great breakdown, Alex. How do you approach GC pressure when fan-out workers generate high allocation rates? In our Postgres ingest pipelines, we saw marked latency spikes until we pooled our byte buffers.",
			Replies: []struct {
				AuthorUsername string
				Content        string
			}{
				{
					AuthorUsername: "alexmorgan",
					Content:        "Exactly right, Elena. Under high QPS, sync.Pool for byte buffers and unmarshaled structs is mandatory. Without buffer pooling, the Go runtime mark-termination phase degrades p99 latency significantly.",
				},
				{
					AuthorUsername: "devinkumar",
					Content:        "We profiled this with Linux eBPF tracing on the Go runtime allocator (runtime.mallocgc). Memory reuse via sync.Pool eliminated 82% of young generation allocation churn.",
				},
			},
		},
		{
			ArticleSlug:    "postgresql-indexing-internals-btree-brin-gin",
			AuthorUsername: "devinkumar",
			Content:        "BRIN indexes are seriously underrated. We use BRIN on 2-billion-row eBPF network telemetry tables. The memory footprint went from 48 GB with B-Tree down to just 65 MB, and query times for sequential time intervals are virtually identical.",
			Replies: []struct {
				AuthorUsername string
				Content        string
			}{
				{
					AuthorUsername: "elenarostova",
					Content:        "That's a textbook use case for BRIN! Because the time-series events are physically appended in timestamp order, the correlation between physical disk pages and logical timestamps is close to 1.0, making range pruning ultra-effective.",
				},
			},
		},
		{
			ArticleSlug:    "demystifying-ebpf-linux-kernel-observability",
			AuthorUsername: "sarahconnor",
			Content:        "Devin, how do you handle ring buffer overflows when high-packet bursts flood the user-space daemon? Have you benchmarked BPF ring buffers vs the older perf buffer?",
			Replies: []struct {
				AuthorUsername string
				Content        string
			}{
				{
					AuthorUsername: "devinkumar",
					Content:        "BPF ring buffer (BPF_MAP_TYPE_RINGBUF) is a huge upgrade over perf buffer. It uses a single mmap'd circular buffer shared across all CPUs with memory reservation semantics (bpf_ringbuf_reserve), completely eliminating memory copies and per-CPU page splits.",
				},
			},
		},
		{
			ArticleSlug:    "optimizing-vllm-distributed-inference-clusters",
			AuthorUsername: "alexmorgan",
			Content:        "Kenji, how is the KV-cache cache hit rate affected during continuous batching with prompt prefixes? Do you use prefix caching across multiple concurrent client sessions?",
			Replies: []struct {
				AuthorUsername string
				Content        string
			}{
				{
					AuthorUsername: "kenjibando",
					Content:        "Yes! Automatic Prefix Caching (APC) in vLLM computes Radix Tree hashes over token prefixes. For multi-turn chats or common system prompts, prompt evaluation latency drops to near-zero because the KV blocks are reused directly from VRAM.",
				},
			},
		},
	}

	for _, c := range commentsData {
		artID, ok := articleMap[c.ArticleSlug]
		if !ok {
			continue
		}
		commenterUID, ok := authorUserIDs[c.AuthorUsername]
		if !ok {
			continue
		}

		// Insert root comment
		rootComment, err := queries.CreateComment(ctx, db.CreateCommentParams{
			ArticleID: artID,
			AuthorID:  commenterUID,
			Content:   c.Content,
		})
		if err != nil {
			continue
		}

		// Insert replies
		for _, reply := range c.Replies {
			replierUID, ok := authorUserIDs[reply.AuthorUsername]
			if !ok {
				continue
			}
			_, _ = queries.CreateComment(ctx, db.CreateCommentParams{
				ArticleID: artID,
				AuthorID:  replierUID,
				ParentID:  rootComment.ID,
				Content:   reply.Content,
			})
		}
	}

	// 7. Seed Likes and Bookmarks
	slog.Info("Seeding likes and bookmarks...")
	for _, artID := range articleMap {
		for _, uid := range authorUserIDs {
			// Randomly like 60% of articles
			if rand.Float32() > 0.4 {
				_, _ = queries.CreateLike(ctx, db.CreateLikeParams{
					UserID:    uid,
					ArticleID: artID,
				})
			}
			// Randomly bookmark 35% of articles
			if rand.Float32() > 0.65 {
				_, _ = queries.CreateBookmark(ctx, db.CreateBookmarkParams{
					UserID:    uid,
					ArticleID: artID,
				})
			}
		}
	}

	// 8. Seed Platform Daily Metrics and Article Daily Metrics for past 14 days
	slog.Info("Seeding 14-day historical telemetry metrics...")
	now := time.Now().UTC()
	for i := 14; i >= 0; i-- {
		day := now.AddDate(0, 0, -i)
		dateParam := pgtype.Date{
			Time:  day,
			Valid: true,
		}

		// Platform Daily Metrics
		pageViews := int32(1800 + rand.Intn(1200) + (14-i)*150)
		articleViews := int32(float64(pageViews) * 0.75)
		uniqueVisitors := int32(float64(pageViews) * 0.45)
		newRegs := int32(rand.Intn(15) + 3)
		activeUsers := int32(float64(uniqueVisitors) * 0.3)
		likesGiven := int32(rand.Intn(80) + 40)
		commentsPosted := int32(rand.Intn(25) + 10)

		_ = queries.UpsertPlatformDailyMetrics(ctx, db.UpsertPlatformDailyMetricsParams{
			Date:              dateParam,
			PageViews:         pageViews,
			ArticleViews:      articleViews,
			UniqueVisitors:    uniqueVisitors,
			NewRegistrations:  newRegs,
			ActiveUsers:       activeUsers,
			PublishedArticles: int32(len(articles)),
			CommentsPosted:    commentsPosted,
			LikesGiven:        likesGiven,
		})

		// Article Daily Metrics for each seeded article
		for _, artID := range articleMap {
			artViews := int32(80 + rand.Intn(200) + (14-i)*15)
			artUniques := int32(float64(artViews) * 0.65)
			artLikes := int32(rand.Intn(10) + 2)
			artBookmarks := int32(rand.Intn(8) + 1)
			artComments := int32(rand.Intn(5))

			// Find author ID for this article
			var artAuthorID pgtype.UUID
			row := pool.Pool.QueryRow(ctx, "SELECT author_id FROM articles WHERE id = $1", artID)
			_ = row.Scan(&artAuthorID)

			_ = queries.UpsertArticleDailyMetrics(ctx, db.UpsertArticleDailyMetricsParams{
				ArticleID:      artID,
				AuthorID:       artAuthorID,
				Date:           dateParam,
				Views:          artViews,
				UniqueVisitors: artUniques,
				Likes:          artLikes,
				Bookmarks:      artBookmarks,
				Comments:       artComments,
			})
		}
	}

	// 9. Seed Sample Analytics Events
	slog.Info("Seeding real analytics events with privacy hashes...")
	sources := []string{"google", "github", "twitter", "direct", "hackernews"}
	devices := []string{"desktop", "mobile", "tablet"}
	for _, artSlug := range []string{"demystifying-ebpf-linux-kernel-observability", "go-concurrency-pipelines-fan-out", "postgresql-indexing-internals-btree-brin-gin"} {
		artID, ok := articleMap[artSlug]
		if !ok {
			continue
		}
		var artAuthorID pgtype.UUID
		_ = pool.Pool.QueryRow(ctx, "SELECT author_id FROM articles WHERE id = $1", artID).Scan(&artAuthorID)

		for j := 0; j < 35; j++ {
			src := sources[rand.Intn(len(sources))]
			dev := devices[rand.Intn(len(devices))]
			visitorHash := fmt.Sprintf("hash_%08x%08x", rand.Uint32(), rand.Uint32())
			var refText pgtype.Text
			if src != "direct" {
				refText = pgtype.Text{String: fmt.Sprintf("https://%s.com/engineering", src), Valid: true}
			}

			_ = queries.RecordAnalyticsEvent(ctx, db.RecordAnalyticsEventParams{
				EventType:   "article_read",
				Path:        fmt.Sprintf("/article/%s", artSlug),
				ArticleID:   artID,
				AuthorID:    artAuthorID,
				VisitorHash: visitorHash,
				Referrer:    refText,
				Source:      src,
				DeviceType:  dev,
			})
		}
	}

	// 10. Seed Ad Placements and Direct Sponsor Campaigns
	slog.Info("Seeding ad placements and sponsor campaigns...")
	placements := []struct {
		SlotKey  string
		Name     string
		PageType string
		Format   string
	}{
		{"footer_banner", "Footer Platform Banner", "article", "banner"},
		{"article_sidebar", "Article Sidebar Sponsor", "article", "sidebar"},
		{"feed_native", "Feed Native Sponsorship", "home", "native"},
	}

	for _, p := range placements {
		existing, err := queries.GetPlacementBySlotKey(ctx, p.SlotKey)
		if err == nil && existing.SlotKey != "" {
			continue
		}
		_, _ = queries.CreatePlacement(ctx, db.CreatePlacementParams{
			SlotKey:      p.SlotKey,
			Name:         p.Name,
			PageType:     p.PageType,
			Provider:     "direct",
			IsEnabled:    true,
			Format:       p.Format,
			FrequencyCap: 5,
			Config:       []byte("{}"),
		})
	}

	campaigns := []struct {
		PlacementSlot string
		Name          string
		Advertiser    string
		TargetURL     string
		ImageURL      string
		Headline      string
		BodyText      string
		CtaText       string
		Format        string
	}{
		{
			"footer_banner",
			"CloudScale Managed Postgres",
			"CloudScale Inc.",
			"https://cloudscale.io/postgres",
			"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800",
			"High-Availability Postgres Built for High-Throughput Microservices",
			"Sub-millisecond read replicas, automated connection pooling, and instant point-in-time recovery.",
			"Deploy Free Cluster",
			"banner",
		},
		{
			"article_sidebar",
			"ZeroKey Developer IAM",
			"ZeroKey Systems",
			"https://zerokey.dev",
			"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=600",
			"Workload Identity & Zero-Trust Without Passwords",
			"Cryptographic mTLS attestation and automated short-lived certificate rotation for modern cloud stacks.",
			"Start Integration",
			"sidebar",
		},
	}

	for _, c := range campaigns {
		var cCount int
		_ = pool.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM ad_campaigns WHERE name = $1", c.Name).Scan(&cCount)
		if cCount > 0 {
			continue
		}

		_, err = queries.CreateCampaign(ctx, db.CreateCampaignParams{
			Name:         c.Name,
			Advertiser:   c.Advertiser,
			SponsorLabel: "Sponsored Partner",
			Headline:     c.Headline,
			Body:         c.BodyText,
			CtaText:      c.CtaText,
			TargetUrl:    c.TargetURL,
			ImageUrl:     c.ImageURL,
			Format:       c.Format,
			Placements:   []string{c.PlacementSlot},
			Status:       "active",
			Cpm:          pgtype.Numeric{Int: big.NewInt(2500), Valid: true},
			Cpc:          pgtype.Numeric{Int: big.NewInt(150), Valid: true},
			StartDate:    pgtype.Timestamptz{Time: time.Now().UTC().Add(-7 * 24 * time.Hour), Valid: true},
			EndDate:      pgtype.Timestamptz{Time: time.Now().UTC().Add(30 * 24 * time.Hour), Valid: true},
		})
		if err != nil {
			slog.Warn("Could not insert ad campaign", slog.String("name", c.Name), slog.String("error", err.Error()))
		}
	}

	slog.Info("Database seeding completed successfully!")
}
