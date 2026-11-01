package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strings"
	"time"

	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	sesTypes "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/config"
)

// Message encapsulates an outbound email message.
type Message struct {
	ToEmail   string
	ToName    string
	FromEmail string
	ReplyTo   string
	Subject   string
	HTMLBody  string
	TextBody  string
}

// SendResult contains telemetry from the email dispatch.
type SendResult struct {
	MessageID string
	Provider  string
	SentAt    time.Time
}

// Sender defines the contract for sending emails.
type Sender interface {
	Send(ctx context.Context, msg Message) (*SendResult, error)
}

// NewSender creates the appropriate sender according to configuration.
func NewSender(cfg *config.Config) (Sender, error) {
	// If in development mode or explicitly set to mock, return MockSender
	if cfg.Email.DevMode || strings.EqualFold(cfg.Email.Provider, "mock") {
		slog.Info("Email system initialized in DEV/MOCK mode (no external emails will be sent)")
		return NewMockSender(), nil
	}

	switch strings.ToLower(cfg.Email.Provider) {
	case "ses":
		slog.Info("Initializing Amazon SES v2 API sender", slog.String("region", cfg.Email.AWSRegion))
		return NewSESSender(context.Background(), cfg.Email.AWSRegion)

	case "smtp":
		slog.Info("Initializing Amazon SES SMTP Relay sender",
			slog.String("host", cfg.Email.SMTPHost),
			slog.Int("port", cfg.Email.SMTPPort),
		)
		return NewSMTPSender(
			cfg.Email.SMTPHost,
			cfg.Email.SMTPPort,
			cfg.Email.SMTPUsername,
			cfg.Email.SMTPPassword,
		), nil

	default:
		slog.Warn("Unknown email provider configured, falling back to mock sender",
			slog.String("provider", cfg.Email.Provider),
		)
		return NewMockSender(), nil
	}
}

// ==========================================
// 1. MOCK SENDER (Local Dev & Testing)
// ==========================================

type MockSender struct{}

func NewMockSender() *MockSender {
	return &MockSender{}
}

func (m *MockSender) Send(ctx context.Context, msg Message) (*SendResult, error) {
	msgID := fmt.Sprintf("mock-ses-%s", uuid.New().String())
	slog.Info("[EMAIL MOCK DISPATCH]",
		slog.String("message_id", msgID),
		slog.String("to", msg.ToEmail),
		slog.String("subject", msg.Subject),
		slog.Int("html_bytes", len(msg.HTMLBody)),
		slog.Int("text_bytes", len(msg.TextBody)),
	)
	return &SendResult{
		MessageID: msgID,
		Provider:  "mock",
		SentAt:    time.Now().UTC(),
	}, nil
}

// ==========================================
// 2. AMAZON SES v2 SENDER (AWS SDK for Go v2)
// ==========================================

type SESSender struct {
	client *sesv2.Client
}

func NewSESSender(ctx context.Context, region string) (*SESSender, error) {
	// Uses the AWS Default Credential Provider Chain:
	// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
	// 2. Shared credentials file (~/.aws/credentials)
	// 3. IAM Roles for Amazon EC2 (IMDSv2) or Amazon ECS/EKS Tasks
	awsCfg, err := awsConfig.LoadDefaultConfig(ctx, awsConfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS configuration from credential chain: %w", err)
	}

	client := sesv2.NewFromConfig(awsCfg)
	return &SESSender{client: client}, nil
}

func (s *SESSender) Send(ctx context.Context, msg Message) (*SendResult, error) {
	var replyToList []string
	if msg.ReplyTo != "" {
		replyToList = append(replyToList, msg.ReplyTo)
	}

	input := &sesv2.SendEmailInput{
		FromEmailAddress: &msg.FromEmail,
		Destination: &sesTypes.Destination{
			ToAddresses: []string{msg.ToEmail},
		},
		ReplyToAddresses: replyToList,
		Content: &sesTypes.EmailContent{
			Simple: &sesTypes.Message{
				Subject: &sesTypes.Content{
					Data: &msg.Subject,
				},
				Body: &sesTypes.Body{
					Html: &sesTypes.Content{
						Data: &msg.HTMLBody,
					},
					Text: &sesTypes.Content{
						Data: &msg.TextBody,
					},
				},
			},
		},
	}

	output, err := s.client.SendEmail(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("ses send failed: %w", err)
	}

	msgID := ""
	if output.MessageId != nil {
		msgID = *output.MessageId
	}

	return &SendResult{
		MessageID: msgID,
		Provider:  "amazon_ses_v2",
		SentAt:    time.Now().UTC(),
	}, nil
}

// ==========================================
// 3. AMAZON SES SMTP RELAY SENDER
// ==========================================

type SMTPSender struct {
	host     string
	port     int
	username string
	password string
}

func NewSMTPSender(host string, port int, username, password string) *SMTPSender {
	return &SMTPSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
	}
}

func (s *SMTPSender) Send(ctx context.Context, msg Message) (*SendResult, error) {
	if s.host == "" {
		return nil, fmt.Errorf("smtp host is not configured")
	}

	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	boundary := fmt.Sprintf("boundary_%s", uuid.New().String())

	// Build MIME multipart message
	var bodyBuilder strings.Builder
	bodyBuilder.WriteString(fmt.Sprintf("From: %s\r\n", msg.FromEmail))
	bodyBuilder.WriteString(fmt.Sprintf("To: %s\r\n", msg.ToEmail))
	if msg.ReplyTo != "" {
		bodyBuilder.WriteString(fmt.Sprintf("Reply-To: %s\r\n", msg.ReplyTo))
	}
	bodyBuilder.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	bodyBuilder.WriteString("MIME-Version: 1.0\r\n")
	bodyBuilder.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	bodyBuilder.WriteString("\r\n")

	// Text Part
	bodyBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	bodyBuilder.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	bodyBuilder.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
	bodyBuilder.WriteString(msg.TextBody)
	bodyBuilder.WriteString("\r\n\r\n")

	// HTML Part
	bodyBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	bodyBuilder.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	bodyBuilder.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
	bodyBuilder.WriteString(msg.HTMLBody)
	bodyBuilder.WriteString("\r\n\r\n")

	bodyBuilder.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	rawMessage := []byte(bodyBuilder.String())

	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	// SES typically uses port 587 with STARTTLS or 465 with SSL/TLS
	var err error
	if s.port == 465 {
		err = s.sendMailImplicitTLS(addr, auth, msg.FromEmail, []string{msg.ToEmail}, rawMessage)
	} else {
		err = s.sendMailStartTLS(addr, auth, msg.FromEmail, []string{msg.ToEmail}, rawMessage)
	}

	if err != nil {
		return nil, fmt.Errorf("smtp relay send failed: %w", err)
	}

	messageID := fmt.Sprintf("ses-relay-%s", uuid.New().String())
	return &SendResult{
		MessageID: messageID,
		Provider:  "amazon_ses_smtp",
		SentAt:    time.Now().UTC(),
	}, nil
}

func (s *SMTPSender) sendMailStartTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	host, _, _ := net.SplitHostPort(addr)
	client, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer client.Close()

	tlsConfig := &tls.Config{
		ServerName: host,
		MinVersion: tls.VersionTLS12,
	}

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err = client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}

	if auth != nil {
		if ok, _ := client.Extension("AUTH"); ok {
			if err = client.Auth(auth); err != nil {
				return err
			}
		}
	}

	if err = client.Mail(from); err != nil {
		return err
	}
	for _, addr := range to {
		if err = client.Rcpt(addr); err != nil {
			return err
		}
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write(msg)
	if err != nil {
		return err
	}
	return w.Close()
}

func (s *SMTPSender) sendMailImplicitTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	host, _, _ := net.SplitHostPort(addr)
	tlsConfig := &tls.Config{
		ServerName: host,
		MinVersion: tls.VersionTLS12,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return err
		}
	}

	if err = client.Mail(from); err != nil {
		return err
	}
	for _, addr := range to {
		if err = client.Rcpt(addr); err != nil {
			return err
		}
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write(msg)
	if err != nil {
		return err
	}
	return w.Close()
}
