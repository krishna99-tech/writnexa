package security

import (
	"bytes"
	"errors"
	"fmt"
	"net"
	"net/url"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrInvalidMagicBytes = errors.New("file content does not match allowed image signatures")
	ErrFileTooLarge      = errors.New("file size exceeds maximum allowed threshold")
	ErrDisallowedExt     = errors.New("file extension is not permitted")
	ErrSSRFBlocked       = errors.New("destination address resolves to a restricted private or link-local network")
)

// Allowed MIME signatures
var (
	magicJPEG = []byte{0xFF, 0xD8, 0xFF}
	magicPNG  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	magicGIF87 = []byte("GIF87a")
	magicGIF89 = []byte("GIF89a")
	magicWEBP  = []byte("WEBP")
)

const (
	MaxAvatarSizeBytes = 5 * 1024 * 1024  // 5MB
	MaxCoverSizeBytes  = 10 * 1024 * 1024 // 10MB
)

// ValidateImageBytes checks real file magic signatures to prevent polyglot or executable uploads
func ValidateImageBytes(data []byte, maxSizeBytes int64) (string, error) {
	if int64(len(data)) > maxSizeBytes {
		return "", ErrFileTooLarge
	}

	if len(data) < 12 {
		return "", ErrInvalidMagicBytes
	}

	// 1. JPEG
	if bytes.HasPrefix(data, magicJPEG) {
		return "image/jpeg", nil
	}

	// 2. PNG
	if bytes.HasPrefix(data, magicPNG) {
		return "image/png", nil
	}

	// 3. GIF
	if bytes.HasPrefix(data, magicGIF87) || bytes.HasPrefix(data, magicGIF89) {
		return "image/gif", nil
	}

	// 4. WebP (RIFF....WEBP)
	if bytes.HasPrefix(data, []byte("RIFF")) && bytes.Equal(data[8:12], magicWEBP) {
		return "image/webp", nil
	}

	return "", ErrInvalidMagicBytes
}

// SanitizeFilename creates an unguessable UUID-based filename preserving safe extension
func SanitizeFilename(originalFilename string, detectedMime string) string {
	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" || !isAllowedExt(ext) {
		switch detectedMime {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".bin"
		}
	}
	return fmt.Sprintf("%s%s", uuid.NewString(), ext)
}

func isAllowedExt(ext string) bool {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif":
		return true
	default:
		return false
	}
}

// ValidateRemoteImageURL protects against Server-Side Request Forgery (SSRF) when downloading external assets
func ValidateRemoteImageURL(rawURL string) error {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return errors.New("malformed URL")
	}

	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return errors.New("only HTTP and HTTPS protocols are allowed")
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return errors.New("missing hostname")
	}

	// Check loopback / localhost
	if hostname == "localhost" || strings.HasSuffix(hostname, ".local") {
		return ErrSSRFBlocked
	}

	// Resolve IPs to check against private CIDR blocks
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return fmt.Errorf("DNS resolution failed: %w", err)
	}

	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() {
			return ErrSSRFBlocked
		}
		// Block AWS/GCP instance metadata IP
		if ip.String() == "169.254.169.254" {
			return ErrSSRFBlocked
		}
	}

	return nil
}
