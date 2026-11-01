package ads

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

// AdPayload represents the unified client payload for rendering an ad
type AdPayload struct {
	Provider        string     `json:"provider"` // direct, adsense, disabled
	SlotKey         string     `json:"slot_key"`
	Format          string     `json:"format"`
	CampaignID      *uuid.UUID `json:"campaign_id,omitempty"`
	SponsorLabel    string     `json:"sponsor_label,omitempty"`
	Headline        string     `json:"headline,omitempty"`
	Body            string     `json:"body,omitempty"`
	CtaText         string     `json:"cta_text,omitempty"`
	TargetURL       string     `json:"target_url,omitempty"`
	ImageURL        string     `json:"image_url,omitempty"`
	AdSenseClientID string     `json:"adsense_client_id,omitempty"`
	AdSenseSlotID   string     `json:"adsense_slot_id,omitempty"`
	IsTestMode      bool       `json:"is_test_mode"`
}

// Provider defines the interface for modular advertising integrations
type Provider interface {
	Name() string
	Resolve(ctx context.Context, placement *db.AdPlacement) (*AdPayload, error)
}

// ProviderRegistry manages available ad network providers
type ProviderRegistry struct {
	providers map[string]Provider
}

// NewProviderRegistry initializes registry with supported providers
func NewProviderRegistry(q *db.Queries) *ProviderRegistry {
	r := &ProviderRegistry{
		providers: make(map[string]Provider),
	}
	r.Register(&DirectProvider{q: q})
	r.Register(&AdSenseProvider{})
	return r
}

func (r *ProviderRegistry) Register(p Provider) {
	r.providers[strings.ToLower(p.Name())] = p
}

func (r *ProviderRegistry) Get(name string) (Provider, bool) {
	p, ok := r.providers[strings.ToLower(name)]
	return p, ok
}

// DirectProvider serves internal direct-sold sponsor campaigns
type DirectProvider struct {
	q *db.Queries
}

func (d *DirectProvider) Name() string {
	return "direct"
}

func (d *DirectProvider) Resolve(ctx context.Context, placement *db.AdPlacement) (*AdPayload, error) {
	cmp, err := d.q.GetActiveCampaignForPlacement(ctx, placement.SlotKey)
	if err != nil {
		// No active direct campaign available
		return &AdPayload{
			Provider:   "direct",
			SlotKey:    placement.SlotKey,
			Format:     placement.Format,
			IsTestMode: false,
		}, nil
	}

	campaignID := uuid.UUID(cmp.ID.Bytes)
	return &AdPayload{
		Provider:     "direct",
		SlotKey:      placement.SlotKey,
		Format:       cmp.Format,
		CampaignID:   &campaignID,
		SponsorLabel: cmp.SponsorLabel,
		Headline:     cmp.Headline,
		Body:         cmp.Body,
		CtaText:      cmp.CtaText,
		TargetURL:    cmp.TargetUrl,
		ImageURL:     cmp.ImageUrl,
		IsTestMode:   false,
	}, nil
}

// AdSenseProvider configures official Google AdSense integration units
type AdSenseProvider struct{}

func (a *AdSenseProvider) Name() string {
	return "adsense"
}

func (a *AdSenseProvider) Resolve(ctx context.Context, placement *db.AdPlacement) (*AdPayload, error) {
	// Parse placement configuration JSON
	type PlacementConfig struct {
		AdSenseSlotID   string `json:"adsense_slot_id"`
		AdSenseClientID string `json:"adsense_client_id"`
		MinHeight       int    `json:"min_height"`
	}

	var conf PlacementConfig
	if len(placement.Config) > 0 {
		_ = json.Unmarshal(placement.Config, &conf)
	}

	clientID := conf.AdSenseClientID
	if clientID == "" {
		clientID = os.Getenv("ADSENSE_CLIENT_ID")
		if clientID == "" {
			// Approved default test client for Google AdSense sandboxing
			clientID = "ca-pub-0000000000000000"
		}
	}

	slotID := conf.AdSenseSlotID
	if slotID == "" {
		slotID = fmt.Sprintf("slot_%s", placement.SlotKey)
	}

	// In non-production or test client, mark test mode enabled
	appEnv := os.Getenv("APP_ENV")
	isTest := appEnv != "production" || strings.Contains(clientID, "0000") || strings.Contains(clientID, "test")

	return &AdPayload{
		Provider:        "adsense",
		SlotKey:         placement.SlotKey,
		Format:          placement.Format,
		AdSenseClientID: clientID,
		AdSenseSlotID:   slotID,
		IsTestMode:      isTest,
	}, nil
}
