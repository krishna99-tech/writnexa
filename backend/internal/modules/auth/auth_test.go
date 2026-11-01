package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	"github.com/quorix/quorix-backend/internal/response"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *config.Config) {
	gin.SetMode(gin.TestMode)
	cfg, err := config.Load()
	assert.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg.Database)
	if err != nil {
		t.Skip("PostgreSQL not running; skipping live auth integration tests")
	}

	router := gin.New()
	v1 := router.Group("/api/v1")
	authSvc := NewService(db, cfg)
	authHandler := NewHandler(authSvc, cfg)
	RegisterRoutes(v1, authHandler, cfg)

	return router, cfg
}

func TestAuth_ValidationRejection(t *testing.T) {
	router, _ := setupTestRouter(t)

	// Short password
	body, _ := json.Marshal(RegisterRequest{
		Email:    "test-invalid@quorix.io",
		Password: "short",
		Username: "validuser",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuth_CompleteWorkflow(t *testing.T) {
	router, cfg := setupTestRouter(t)

	testEmail := "dev" + time.Now().Format("20060102150405") + "@quorix.io"
	testUsername := "dev" + time.Now().Format("150405")
	testPassword := "ComplexPassword123!"

	// 1. REGISTER
	regBody, _ := json.Marshal(RegisterRequest{
		Email:       testEmail,
		Password:    testPassword,
		Username:    testUsername,
		DisplayName: "Test Engineer",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var regRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &regRes)
	assert.True(t, regRes.Success)

	dataMap := regRes.Data.(map[string]interface{})
	verificationToken := dataMap["verification_token"].(string)
	assert.NotEmpty(t, verificationToken)

	// 2. VERIFY EMAIL
	verBody, _ := json.Marshal(VerifyEmailRequest{Token: verificationToken})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", bytes.NewReader(verBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Logf("VerifyEmail failed status=%d body=%s", w.Code, w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)

	// 3. LOGIN
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    testEmail,
		Password: testPassword,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Logf("VerifyEmail failed status=%d body=%s", w.Code, w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)
	var loginRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &loginRes)
	assert.True(t, loginRes.Success)

	loginData := loginRes.Data.(map[string]interface{})
	accessToken := loginData["access_token"].(string)
	assert.NotEmpty(t, accessToken)

	// Verify Refresh Token Cookie was set
	cookies := w.Result().Cookies()
	var refreshCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == cfg.JWT.CookieName {
			refreshCookie = c
			break
		}
	}
	assert.NotNil(t, refreshCookie)
	assert.True(t, refreshCookie.HttpOnly)

	// 4. GET /api/v1/auth/me (Protected Route)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Logf("VerifyEmail failed status=%d body=%s", w.Code, w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)
	var meRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &meRes)
	assert.True(t, meRes.Success)
	meData := meRes.Data.(map[string]interface{})
	profile := meData["profile"].(map[string]interface{})
	assert.Equal(t, testUsername, profile["username"])

	// 5. REFRESH TOKEN ROTATION
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req.AddCookie(refreshCookie)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Logf("VerifyEmail failed status=%d body=%s", w.Code, w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)
	var refreshRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &refreshRes)
	assert.True(t, refreshRes.Success)
	refreshedData := refreshRes.Data.(map[string]interface{})
	newAccessToken := refreshedData["access_token"].(string)
	assert.NotEmpty(t, newAccessToken)

	// 6. LOGOUT
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(refreshCookie)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Logf("VerifyEmail failed status=%d body=%s", w.Code, w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)

	// 7. SESSIONS LISTING & CHANGE PASSWORD & FORGOT PASSWORD WORKFLOW
	// Log in again to get fresh credentials
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	_ = json.Unmarshal(w.Body.Bytes(), &loginRes)
	loginData = loginRes.Data.(map[string]interface{})
	accessToken = loginData["access_token"].(string)

	// Test GET /api/v1/auth/sessions
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/auth/sessions", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	var sessionsRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &sessionsRes)
	sessions := sessionsRes.Data.([]interface{})
	assert.GreaterOrEqual(t, len(sessions), 1)

	// Test Change Password
	newPassword := "NewSecurePass99#"
	changeBody, _ := json.Marshal(ChangePasswordRequest{
		CurrentPassword: testPassword,
		NewPassword:     newPassword,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewReader(changeBody))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify old password no longer works
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Verify new password works
	newLoginBody, _ := json.Marshal(LoginRequest{
		Email:    testEmail,
		Password: newPassword,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(newLoginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Test Forgot Password & Reset Password
	forgotBody, _ := json.Marshal(ForgotPasswordRequest{Email: testEmail})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(forgotBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	var forgotRes response.Response
	_ = json.Unmarshal(w.Body.Bytes(), &forgotRes)
	forgotData := forgotRes.Data.(map[string]interface{})
	resetToken := forgotData["token"].(string)
	assert.NotEmpty(t, resetToken)

	// Reset Password with resetToken
	finalPassword := "FinalResetPassword2026!"
	resetBody, _ := json.Marshal(ResetPasswordRequest{
		Token:       resetToken,
		NewPassword: finalPassword,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", bytes.NewReader(resetBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify final password login
	finalLoginBody, _ := json.Marshal(LoginRequest{
		Email:    testEmail,
		Password: finalPassword,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(finalLoginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}
