package security

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestArgon2id_HashAndVerify(t *testing.T) {
	password := "SecretP@ssw0rd!2026"

	hash, err := HashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.Contains(t, hash, "$argon2id$")

	// Verify valid password
	valid, err := VerifyPassword(password, hash)
	assert.NoError(t, err)
	assert.True(t, valid)

	// Verify invalid password
	invalid, err := VerifyPassword("WrongPassword123", hash)
	assert.NoError(t, err)
	assert.False(t, invalid)
}

func TestJWT_GenerateAndVerify(t *testing.T) {
	secret := "test_jwt_secret_key_minimum_32_chars_long"
	userID := uuid.New()
	email := "dev@quorix.io"
	role := "author"

	token, err := GenerateAccessToken(userID, email, role, secret, 15*time.Minute)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := VerifyAccessToken(token, secret)
	assert.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)

	// Verify with wrong secret
	_, err = VerifyAccessToken(token, "wrong_secret_key_minimum_32_characters_here")
	assert.Error(t, err)
}

func TestTokens_RandomAndHash(t *testing.T) {
	raw, hash, err := GenerateRandomToken(32)
	assert.NoError(t, err)
	assert.Len(t, raw, 64)   // 32 bytes in hex = 64 chars
	assert.Len(t, hash, 64)  // SHA256 in hex = 64 chars
	assert.Equal(t, HashToken(raw), hash)
}

