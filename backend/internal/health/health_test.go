package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type healthTestResponse struct {
	Success bool       `json:"success"`
	Data    HealthData `json:"data"`
}

func TestHealthCheck_NoServices(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewHandler(nil, nil, "1.0.0-test")
	router.GET("/health", handler.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res healthTestResponse
	err := json.Unmarshal(w.Body.Bytes(), &res)
	assert.NoError(t, err)
	assert.True(t, res.Success)
	assert.Equal(t, "degraded", res.Data.Status)
	assert.Equal(t, "1.0.0-test", res.Data.Version)
	assert.Equal(t, "not_configured", res.Data.Services["database"].Status)
	assert.Equal(t, "disabled", res.Data.Services["redis"].Status)
}

