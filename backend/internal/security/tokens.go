package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateRandomToken generates cryptographically secure random bytes and returns:
// 1. rawToken (hex string to send to client / cookie)
// 2. sha256Hash (hex string to store in PostgreSQL)
func GenerateRandomToken(byteLength int) (rawToken string, tokenHash string, err error) {
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}

	rawToken = hex.EncodeToString(bytes)
	tokenHash = HashToken(rawToken)
	return rawToken, tokenHash, nil
}

// HashToken computes the SHA-256 hash of a raw token.
func HashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}
