package security_test

import (
	"testing"

	"github.com/quorix/quorix-backend/internal/security"
	"github.com/stretchr/testify/assert"
)

func TestMedia_ValidateImageBytes(t *testing.T) {
	// 1. Valid JPEG
	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01}
	mime, err := security.ValidateImageBytes(jpegBytes, security.MaxAvatarSizeBytes)
	assert.NoError(t, err)
	assert.Equal(t, "image/jpeg", mime)

	// 2. Valid PNG
	pngBytes := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D}
	mime, err = security.ValidateImageBytes(pngBytes, security.MaxAvatarSizeBytes)
	assert.NoError(t, err)
	assert.Equal(t, "image/png", mime)

	// 3. Executable / HTML masquerading as image
	fakeBytes := []byte("<html><script>alert(1)</script></html>")
	_, err = security.ValidateImageBytes(fakeBytes, security.MaxAvatarSizeBytes)
	assert.ErrorIs(t, err, security.ErrInvalidMagicBytes)

	// 4. Exceeds max size
	_, err = security.ValidateImageBytes(jpegBytes, 5) // threshold 5 bytes
	assert.ErrorIs(t, err, security.ErrFileTooLarge)
}

func TestMedia_SanitizeFilename(t *testing.T) {
	// Path traversal attempt
	name := security.SanitizeFilename("../../etc/passwd.php", "image/jpeg")
	assert.False(t, contains(name, ".."))
	assert.True(t, contains(name, ".jpg"))

	// Clean UUID format
	name2 := security.SanitizeFilename("my_avatar.png", "image/png")
	assert.True(t, contains(name2, ".png"))
}

func TestMedia_ValidateRemoteImageURL(t *testing.T) {
	// Block localhost / loopback
	assert.Error(t, security.ValidateRemoteImageURL("http://localhost:8080/secret.jpg"))
	assert.Error(t, security.ValidateRemoteImageURL("http://127.0.0.1/admin"))
	assert.Error(t, security.ValidateRemoteImageURL("http://169.254.169.254/latest/meta-data/"))

	// Block invalid protocols
	assert.Error(t, security.ValidateRemoteImageURL("file:///etc/passwd"))
	assert.Error(t, security.ValidateRemoteImageURL("ftp://server/image.jpg"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && stringContains(s, substr))
}

func stringContains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
