package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response represents the standard QUORIX JSON envelope.
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// APIError represents the error structure.
type APIError struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []FieldError  `json:"details,omitempty"`
}

// FieldError gives field-level validation issue details.
type FieldError struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

// Meta contains pagination and query metadata.
type Meta struct {
	Page         int   `json:"page,omitempty"`
	PerPage      int   `json:"per_page,omitempty"`
	TotalRecords int64 `json:"total_records,omitempty"`
	TotalPages   int   `json:"total_pages,omitempty"`
}

// JSON sends a standard success response.
func JSON(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, Response{
		Success: true,
		Data:    data,
	})
}

// JSONWithMeta sends a standard success response with pagination metadata.
func JSONWithMeta(c *gin.Context, statusCode int, data interface{}, meta *Meta) {
	c.JSON(statusCode, Response{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

// Error sends a standardized error response.
func Error(c *gin.Context, statusCode int, code string, message string, details ...FieldError) {
	c.JSON(statusCode, Response{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// InternalServerError sends a standard 500 response.
func InternalServerError(c *gin.Context, message string) {
	if message == "" {
		message = "An unexpected server error occurred."
	}
	Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message)
}

// NotFound sends a standard 404 response.
func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "The requested resource was not found."
	}
	Error(c, http.StatusNotFound, "NOT_FOUND", message)
}

// BadRequest sends a standard 400 response.
func BadRequest(c *gin.Context, message string, details ...FieldError) {
	if message == "" {
		message = "Invalid request payload or parameters."
	}
	Error(c, http.StatusBadRequest, "BAD_REQUEST", message, details...)
}
