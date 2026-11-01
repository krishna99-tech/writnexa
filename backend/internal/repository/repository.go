package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/quorix/quorix-backend/internal/database"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

// Store aggregates all domain repositories and transactional capabilities.
type Store interface {
	Users() UserRepository
	Profiles() ProfileRepository
	Sessions() SessionRepository
	Articles() ArticleRepository
	Categories() CategoryRepository
	Tags() TagRepository
	Publications() PublicationRepository
	Social() SocialRepository
	WithTx(ctx context.Context, fn func(queries *db.Queries) error) error
}

type pgStore struct {
	pool         *pgxpool.Pool
	database     *database.DB
	queries      *db.Queries
	userRepo     UserRepository
	profileRepo  ProfileRepository
	sessionRepo  SessionRepository
	articleRepo  ArticleRepository
	categoryRepo CategoryRepository
	tagRepo      TagRepository
	pubRepo      PublicationRepository
	socialRepo   SocialRepository
}

// NewStore instantiates the consolidated database repository store.
func NewStore(d *database.DB) Store {
	var q *db.Queries
	var pool *pgxpool.Pool
	if d != nil && d.Pool != nil {
		pool = d.Pool
		q = db.New(pool)
	}

	return &pgStore{
		pool:         pool,
		database:     d,
		queries:      q,
		userRepo:     newUserRepository(q),
		profileRepo:  newProfileRepository(q),
		sessionRepo:  newSessionRepository(q),
		articleRepo:  newArticleRepository(q),
		categoryRepo: newCategoryRepository(q),
		tagRepo:      newTagRepository(q),
		pubRepo:      newPublicationRepository(q),
		socialRepo:   newSocialRepository(q),
	}
}

func (s *pgStore) Users() UserRepository               { return s.userRepo }
func (s *pgStore) Profiles() ProfileRepository         { return s.profileRepo }
func (s *pgStore) Sessions() SessionRepository         { return s.sessionRepo }
func (s *pgStore) Articles() ArticleRepository         { return s.articleRepo }
func (s *pgStore) Categories() CategoryRepository     { return s.categoryRepo }
func (s *pgStore) Tags() TagRepository                 { return s.tagRepo }
func (s *pgStore) Publications() PublicationRepository { return s.pubRepo }
func (s *pgStore) Social() SocialRepository           { return s.socialRepo }

func (s *pgStore) WithTx(ctx context.Context, fn func(queries *db.Queries) error) error {
	if s.database == nil {
		return nil
	}
	return s.database.WithTx(ctx, fn)
}
