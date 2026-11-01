package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/quorix/quorix-backend/internal/response"
)

type Handler struct {
	svc Service
	cfg *config.Config
}

func NewHandler(svc Service, cfg *config.Config) *Handler {
	return &Handler{
		svc: svc,
		cfg: cfg,
	}
}

// Helper to set the HTTP-only refresh cookie
func (h *Handler) setRefreshCookie(c *gin.Context, token string, ttl time.Duration) {
	maxAge := int(ttl.Seconds())
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		h.cfg.JWT.CookieName,
		token,
		maxAge,
		"/api/v1/auth",
		"",
		h.cfg.JWT.CookieSecure,
		true, // HttpOnly
	)
}

// Helper to clear the HTTP-only refresh cookie
func (h *Handler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		h.cfg.JWT.CookieName,
		"",
		-1,
		"/api/v1/auth",
		"",
		h.cfg.JWT.CookieSecure,
		true,
	)
}

type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	Username    string `json:"username" binding:"required,min=3,max=30"`
	DisplayName string `json:"display_name"`
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request payload. Please verify your email, username and password.", response.FieldError{
			Field: "body",
			Issue: err.Error(),
		})
		return
	}

	result, err := h.svc.Register(c.Request.Context(), req.Email, req.Password, req.Username, req.DisplayName)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExists) || errors.Is(err, ErrUsernameAlreadyExists) {
			response.Error(c, http.StatusConflict, "RESOURCE_CONFLICT", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusCreated, gin.H{
		"message": "Account registered successfully. Please verify your email address.",
		"user": gin.H{
			"id":     toUUID(result.User.ID).String(),
			"email":  result.User.Email,
			"role":   result.User.Role,
			"status": result.User.Status,
		},
		"profile": gin.H{
			"username":     result.Profile.Username,
			"display_name": result.Profile.DisplayName,
		},
		"verification_token": result.VerificationToken, // Provided in response for easy local testing / MVP UI
	})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Email and password are required.")
		return
	}

	res, err := h.svc.Login(c.Request.Context(), req.Email, req.Password, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		if errors.Is(err, ErrAccountSuspended) {
			response.Error(c, http.StatusForbidden, "ACCOUNT_SUSPENDED", err.Error())
			return
		}
		response.Error(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", ErrInvalidCredentials.Error())
		return
	}

	h.setRefreshCookie(c, res.RefreshToken, h.cfg.JWT.RefreshTTL)

	var headline, avatarURL *string
	if res.Profile.Headline.Valid {
		headline = &res.Profile.Headline.String
	}
	if res.Profile.AvatarUrl.Valid {
		avatarURL = &res.Profile.AvatarUrl.String
	}

	response.JSON(c, http.StatusOK, gin.H{
		"access_token": res.AccessToken,
		"token_type":   "Bearer",
		"expires_in":   int(h.cfg.JWT.AccessTTL.Seconds()),
		"user": gin.H{
			"id":             toUUID(res.User.ID).String(),
			"email":          res.User.Email,
			"role":           res.User.Role,
			"status":         res.User.Status,
			"email_verified": res.User.EmailVerifiedAt.Valid,
		},
		"profile": gin.H{
			"username":     res.Profile.Username,
			"display_name": res.Profile.DisplayName,
			"avatar_url":   avatarURL,
			"headline":     headline,
		},
	})
}

func (h *Handler) RefreshToken(c *gin.Context) {
	cookieToken, err := c.Cookie(h.cfg.JWT.CookieName)
	if err != nil || cookieToken == "" {
		// Also accept refreshToken in request body if cookies are not used
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.ShouldBindJSON(&body)
		cookieToken = body.RefreshToken
	}

	if cookieToken == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Missing refresh token cookie.")
		return
	}

	res, err := h.svc.RefreshToken(c.Request.Context(), cookieToken, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		h.clearRefreshCookie(c)
		response.Error(c, http.StatusUnauthorized, "REFRESH_FAILED", "Invalid or expired session. Please log in again.")
		return
	}

	h.setRefreshCookie(c, res.NewRefreshToken, h.cfg.JWT.RefreshTTL)

	response.JSON(c, http.StatusOK, gin.H{
		"access_token": res.AccessToken,
		"token_type":   "Bearer",
		"expires_in":   int(h.cfg.JWT.AccessTTL.Seconds()),
	})
}

func (h *Handler) Logout(c *gin.Context) {
	cookieToken, _ := c.Cookie(h.cfg.JWT.CookieName)
	if cookieToken != "" {
		_ = h.svc.Logout(c.Request.Context(), cookieToken)
	}
	h.clearRefreshCookie(c)

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Successfully logged out.",
	})
}

type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

func (h *Handler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Verification token is required.")
		return
	}

	if err := h.svc.VerifyEmail(c.Request.Context(), req.Token); err != nil {
		response.Error(c, http.StatusBadRequest, "VERIFICATION_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Email address verified successfully. You can now access all authoring and publishing features.",
	})
}

type ResendVerificationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *Handler) ResendVerification(c *gin.Context) {
	var req ResendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Valid email address is required.")
		return
	}

	token, _ := h.svc.ResendVerification(c.Request.Context(), req.Email)

	response.JSON(c, http.StatusOK, gin.H{
		"message": "If the email is registered and unverified, a new verification link has been dispatched.",
		"token":   token, // Provided for easy manual inspection in dev mode
	})
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Valid email address is required.")
		return
	}

	token, _ := h.svc.ForgotPassword(c.Request.Context(), req.Email)

	response.JSON(c, http.StatusOK, gin.H{
		"message": "If the account exists, a password reset link has been dispatched.",
		"token":   token, // Provided for dev mode testing
	})
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Token and new password (min 8 characters) are required.")
		return
	}

	if err := h.svc.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		response.Error(c, http.StatusBadRequest, "RESET_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Password reset successfully. All active sessions have been invalidated. Please log in with your new password.",
	})
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

func (h *Handler) ChangePassword(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Current password and new password (min 8 characters) are required.")
		return
	}

	if err := h.svc.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		response.Error(c, http.StatusBadRequest, "CHANGE_PASSWORD_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Password changed successfully. All other sessions have been logged out.",
	})
}

func (h *Handler) GetMe(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
		return
	}

	data, err := h.svc.GetMe(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "User profile not found.")
		return
	}

	var headline, avatarURL, github, twitter, linkedin, website, location *string
	if data.Profile.Headline.Valid {
		headline = &data.Profile.Headline.String
	}
	if data.Profile.AvatarUrl.Valid {
		avatarURL = &data.Profile.AvatarUrl.String
	}
	if data.Profile.GithubUrl.Valid {
		github = &data.Profile.GithubUrl.String
	}
	if data.Profile.TwitterUrl.Valid {
		twitter = &data.Profile.TwitterUrl.String
	}
	if data.Profile.LinkedinUrl.Valid {
		linkedin = &data.Profile.LinkedinUrl.String
	}
	if data.Profile.WebsiteUrl.Valid {
		website = &data.Profile.WebsiteUrl.String
	}
	if data.Profile.Location.Valid {
		location = &data.Profile.Location.String
	}

	response.JSON(c, http.StatusOK, gin.H{
		"user": gin.H{
			"id":             toUUID(data.User.ID).String(),
			"email":          data.User.Email,
			"role":           data.User.Role,
			"status":         data.User.Status,
			"email_verified": data.User.EmailVerifiedAt.Valid,
			"created_at":     data.User.CreatedAt.Time,
		},
		"profile": gin.H{
			"username":        data.Profile.Username,
			"display_name":    data.Profile.DisplayName,
			"headline":        headline,
			"avatar_url":      avatarURL,
			"github_url":      github,
			"twitter_url":     twitter,
			"linkedin_url":    linkedin,
			"website_url":     website,
			"location":        location,
			"article_count":   data.Profile.ArticleCount,
			"follower_count":  data.Profile.FollowerCount,
			"following_count": data.Profile.FollowingCount,
		},
	})
}

type BecomeAuthorRequest struct {
	DisplayName string `json:"display_name"`
	Headline    string `json:"headline"`
	Bio         string `json:"bio"`
	GithubURL   string `json:"github_url"`
}

func (h *Handler) BecomeAuthor(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
		return
	}

	var req BecomeAuthorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request payload.", response.FieldError{
			Field: "body",
			Issue: err.Error(),
		})
		return
	}

	res, err := h.svc.BecomeAuthor(c.Request.Context(), userID, req.DisplayName, req.Headline, req.Bio, req.GithubURL)
	if err != nil {
		if errors.Is(err, ErrAccountSuspended) {
			response.Error(c, http.StatusForbidden, "ACCOUNT_SUSPENDED", err.Error())
			return
		}
		response.InternalServerError(c, err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message":      "Author status activated successfully! Welcome to QUORIX Studio.",
		"access_token": res.AccessToken,
		"user": gin.H{
			"id":     toUUID(res.User.ID).String(),
			"email":  res.User.Email,
			"role":   res.User.Role,
			"status": res.User.Status,
		},
		"profile": gin.H{
			"username":     res.Profile.Username,
			"display_name": res.Profile.DisplayName,
		},
	})
}

func (h *Handler) ListSessions(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
		return
	}

	sessions, err := h.svc.ListSessions(c.Request.Context(), userID)
	if err != nil {
		response.InternalServerError(c, "Failed to retrieve active sessions.")
		return
	}

	var sessionList []gin.H
	for _, s := range sessions {
		userAgent := ""
		if s.UserAgent.Valid {
			userAgent = s.UserAgent.String
		}
		sessionList = append(sessionList, gin.H{
			"id":         toUUID(s.ID).String(),
			"user_agent": userAgent,
			"expires_at": s.ExpiresAt.Time,
			"created_at": s.CreatedAt.Time,
		})
	}

	response.JSON(c, http.StatusOK, sessionList)
}

func (h *Handler) RevokeSession(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
		return
	}

	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		response.BadRequest(c, "Invalid session ID format.")
		return
	}

	if err := h.svc.RevokeSession(c.Request.Context(), userID, sessionID); err != nil {
		response.Error(c, http.StatusBadRequest, "REVOKE_FAILED", err.Error())
		return
	}

	response.JSON(c, http.StatusOK, gin.H{
		"message": "Session revoked successfully.",
	})
}
