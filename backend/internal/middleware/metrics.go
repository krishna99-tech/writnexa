package middleware

import (
	"math"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

type APITelemetry struct {
	TotalRequests    uint64  `json:"total_requests"`
	Status2xx        uint64  `json:"status_2xx"`
	Status3xx        uint64  `json:"status_3xx"`
	Status4xx        uint64  `json:"status_4xx"`
	Status5xx        uint64  `json:"status_5xx"`
	ErrorRatePercent float64 `json:"error_rate_percent"`
	AvgLatencyMs     float64 `json:"avg_latency_ms"`
	P50LatencyMs     float64 `json:"p50_latency_ms"`
	P95LatencyMs     float64 `json:"p95_latency_ms"`
	P99LatencyMs     float64 `json:"p99_latency_ms"`
}

type MetricsTracker struct {
	totalRequests uint64
	status2xx     uint64
	status3xx     uint64
	status4xx     uint64
	status5xx     uint64

	mu       sync.RWMutex
	samples  []float64
	maxSize  int
	cursor   int
	isFilled bool
}

var globalMetrics = NewMetricsTracker(1000)

func NewMetricsTracker(maxSize int) *MetricsTracker {
	if maxSize <= 0 {
		maxSize = 1000
	}
	return &MetricsTracker{
		samples: make([]float64, maxSize),
		maxSize: maxSize,
	}
}

func GetGlobalMetrics() *MetricsTracker {
	return globalMetrics
}

func (m *MetricsTracker) Record(status int, latency time.Duration) {
	atomic.AddUint64(&m.totalRequests, 1)

	if status >= 200 && status < 300 {
		atomic.AddUint64(&m.status2xx, 1)
	} else if status >= 300 && status < 400 {
		atomic.AddUint64(&m.status3xx, 1)
	} else if status >= 400 && status < 500 {
		atomic.AddUint64(&m.status4xx, 1)
	} else if status >= 500 {
		atomic.AddUint64(&m.status5xx, 1)
	}

	latencyMs := float64(latency.Microseconds()) / 1000.0

	m.mu.Lock()
	m.samples[m.cursor] = latencyMs
	m.cursor++
	if m.cursor >= m.maxSize {
		m.cursor = 0
		m.isFilled = true
	}
	m.mu.Unlock()
}

func (m *MetricsTracker) Snapshot() APITelemetry {
	total := atomic.LoadUint64(&m.totalRequests)
	s2 := atomic.LoadUint64(&m.status2xx)
	s3 := atomic.LoadUint64(&m.status3xx)
	s4 := atomic.LoadUint64(&m.status4xx)
	s5 := atomic.LoadUint64(&m.status5xx)

	var errorRate float64
	if total > 0 {
		errorRate = (float64(s5) / float64(total)) * 100.0
	}

	m.mu.RLock()
	var count int
	if m.isFilled {
		count = m.maxSize
	} else {
		count = m.cursor
	}

	currentSamples := make([]float64, count)
	copy(currentSamples, m.samples[:count])
	m.mu.RUnlock()

	var avg, p50, p95, p99 float64
	if count > 0 {
		var sum float64
		for _, s := range currentSamples {
			sum += s
		}
		avg = sum / float64(count)

		sort.Float64s(currentSamples)
		p50 = percentile(currentSamples, 0.50)
		p95 = percentile(currentSamples, 0.95)
		p99 = percentile(currentSamples, 0.99)
	}

	return APITelemetry{
		TotalRequests:    total,
		Status2xx:        s2,
		Status3xx:        s3,
		Status4xx:        s4,
		Status5xx:        s5,
		ErrorRatePercent: math.Round(errorRate*100) / 100,
		AvgLatencyMs:     math.Round(avg*100) / 100,
		P50LatencyMs:     math.Round(p50*100) / 100,
		P95LatencyMs:     math.Round(p95*100) / 100,
		P99LatencyMs:     math.Round(p99*100) / 100,
	}
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(math.Ceil(float64(len(sorted))*p)) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

// MetricsTelemetryMiddleware intercepts requests to collect status and latency telemetry
func MetricsTelemetryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)
		globalMetrics.Record(c.Writer.Status(), latency)
	}
}
