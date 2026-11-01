package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestStore_NilSafety(t *testing.T) {
	store := NewStore(nil)
	assert.NotNil(t, store)

	assert.NotNil(t, store.Users())
	assert.NotNil(t, store.Profiles())
	assert.NotNil(t, store.Sessions())
	assert.NotNil(t, store.Articles())
	assert.NotNil(t, store.Categories())
	assert.NotNil(t, store.Tags())
	assert.NotNil(t, store.Publications())
	assert.NotNil(t, store.Social())

	ctx := context.Background()

	// Verify safe behavior when DB is nil
	user, err := store.Users().GetUserByID(ctx, uuid.New())
	assert.NoError(t, err)
	assert.Empty(t, user.Email)

	categories, err := store.Categories().ListCategories(ctx)
	assert.NoError(t, err)
	assert.Nil(t, categories)

	articles, err := store.Articles().ListPublishedArticles(ctx, 10, 0)
	assert.NoError(t, err)
	assert.Nil(t, articles)

	err = store.WithTx(ctx, nil)
	assert.NoError(t, err)
}
