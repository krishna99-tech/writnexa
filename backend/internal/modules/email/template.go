package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"strings"
)

// TemplateName represents supported transactional email templates.
type TemplateName string

const (
	TemplateWelcome           TemplateName = "welcome"
	TemplateEmailVerification TemplateName = "email_verification"
	TemplatePasswordReset     TemplateName = "password_reset"
	TemplatePasswordChanged   TemplateName = "password_changed"
	TemplateNewFollower       TemplateName = "new_follower"
	TemplateNewComment        TemplateName = "new_comment"
)

// BaseEmailData contains common fields for all email templates.
type BaseEmailData struct {
	PlatformName string
	PlatformURL  string
	SupportEmail string
	Year         int
}

// WelcomeData holds parameters for the Welcome email.
type WelcomeData struct {
	BaseEmailData
	Username    string
	DisplayName string
	ProfileURL  string
}

// VerificationData holds parameters for Email Verification.
type VerificationData struct {
	BaseEmailData
	Username        string
	VerificationURL string
	Token           string
	ExpiresInHours  int
}

// PasswordResetData holds parameters for Password Reset.
type PasswordResetData struct {
	BaseEmailData
	Username       string
	ResetURL       string
	Token          string
	ExpiresInHours int
}

// PasswordChangedData holds parameters for Password Changed notification.
type PasswordChangedData struct {
	BaseEmailData
	Username   string
	Timestamp  string
	IPAddress  string
	UserAgent  string
	SettingsURL string
}

// NewFollowerData holds parameters for New Follower notification.
type NewFollowerData struct {
	BaseEmailData
	AuthorUsername   string
	FollowerUsername string
	FollowerName     string
	FollowerProfile  string
}

// NewCommentData holds parameters for New Comment notification.
type NewCommentData struct {
	BaseEmailData
	AuthorUsername    string
	CommenterUsername string
	ArticleTitle      string
	ArticleURL        string
	CommentSnippet    string
}

// RenderResult contains the rendered subject, HTML body, and Plain-text body.
type RenderResult struct {
	Subject  string
	HTMLBody string
	TextBody string
}

// TemplateEngine manages template parsing and rendering.
type TemplateEngine struct{}

func NewTemplateEngine() *TemplateEngine {
	return &TemplateEngine{}
}

// Common HTML wrapper template for consistent developer branding.
const htmlWrapper = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{.Subject}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #09090b;
      padding: 40px 0;
    }
    .main {
      background-color: #18181b;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border: 1px solid #27272a;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background-color: #09090b;
      padding: 24px 32px;
      border-bottom: 1px solid #27272a;
    }
    .brand-logo {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      font-size: 18px;
      color: #10b981;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      color: #71717a;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-left: 8px;
    }
    .content {
      padding: 32px;
      font-size: 14px;
      color: #e4e4e7;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .btn-container {
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #10b981;
      color: #09090b !important;
      font-weight: 600;
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
    }
    .code-block {
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 14px 18px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #10b981;
      word-break: break-all;
      margin: 16px 0;
    }
    .info-card {
      background-color: #27272a;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
      font-size: 12px;
      color: #a1a1aa;
    }
    .footer {
      background-color: #09090b;
      padding: 24px 32px;
      border-top: 1px solid #27272a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #71717a;
    }
    .footer a {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="header">
          <span class="brand-logo">Q/ QUORIX</span>
          <span class="brand-sub">// Technical Publishing Ecosystem</span>
        </td>
      </tr>
      <tr>
        <td class="content">
          {{.BodyHTML}}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin: 0 0 6px 0;">QUORIX Platform — Built for software engineers, authors, and system designers.</p>
          <p style="margin: 0;">Sent automatically by QUORIX. Configure notification preferences in your <a href="{{.PlatformURL}}/settings">Account Settings</a>.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`

func decodePayload[T any](data any) (T, error) {
	if typed, ok := data.(T); ok {
		return typed, nil
	}
	var target T
	b, err := json.Marshal(data)
	if err != nil {
		return target, err
	}
	err = json.Unmarshal(b, &target)
	return target, err
}

// Render produces the Subject, HTML, and Text representations for any supported template.
func (e *TemplateEngine) Render(name TemplateName, data any) (*RenderResult, error) {
	switch name {
	case TemplateWelcome:
		d, err := decodePayload[WelcomeData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for welcome template: %w", err)
		}
		return e.renderWelcome(d)

	case TemplateEmailVerification:
		d, err := decodePayload[VerificationData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for email_verification template: %w", err)
		}
		return e.renderVerification(d)

	case TemplatePasswordReset:
		d, err := decodePayload[PasswordResetData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for password_reset template: %w", err)
		}
		return e.renderPasswordReset(d)

	case TemplatePasswordChanged:
		d, err := decodePayload[PasswordChangedData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for password_changed template: %w", err)
		}
		return e.renderPasswordChanged(d)

	case TemplateNewFollower:
		d, err := decodePayload[NewFollowerData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for new_follower template: %w", err)
		}
		return e.renderNewFollower(d)

	case TemplateNewComment:
		d, err := decodePayload[NewCommentData](data)
		if err != nil {
			return nil, fmt.Errorf("invalid payload for new_comment template: %w", err)
		}
		return e.renderNewComment(d)

	default:
		return nil, fmt.Errorf("unknown email template: %s", name)
	}
}

func (e *TemplateEngine) wrapHTML(subject, platformURL string, innerHTML string) (string, error) {
	tmpl, err := template.New("wrapper").Parse(htmlWrapper)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, struct {
		Subject     string
		PlatformURL string
		BodyHTML    template.HTML
	}{
		Subject:     subject,
		PlatformURL: platformURL,
		BodyHTML:    template.HTML(innerHTML),
	})
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

// 1. Welcome Template
func (e *TemplateEngine) renderWelcome(d WelcomeData) (*RenderResult, error) {
	subject := fmt.Sprintf("Welcome to QUORIX, @%s", d.Username)

	innerTmpl := `<h1>Welcome to QUORIX, {{.DisplayName}}!</h1>
<p>Your developer account <strong>@{{.Username}}</strong> is ready. You now have full access to explore engineering publications, bookmark systems architectures, and author your own technical deep-dives.</p>
<div class="btn-container">
  <a href="{{.PlatformURL}}/studio" class="btn">Launch Author Studio &rarr;</a>
</div>
<div class="info-card">
  <strong>Quick Start Checklist:</strong>
  <ul style="margin: 8px 0 0 0; padding-left: 20px;">
    <li>Read full technical articles without distraction or paywalls</li>
    <li>Publish markdown articles with live syntax highlighting</li>
    <li>Follow systems architects and open-source contributors</li>
  </ul>
</div>
<p>Happy hacking,<br>The QUORIX Engineering Team</p>`

	t, err := template.New("welcome_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`Welcome to QUORIX, @%s!

Your developer account is now active.
Display Name: %s
Platform URL: %s

Quick start:
- Author Studio: %s/studio
- Explorer: %s

Happy hacking,
The QUORIX Team`, d.Username, d.DisplayName, d.PlatformURL, d.PlatformURL, d.PlatformURL)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}

// 2. Email Verification Template
func (e *TemplateEngine) renderVerification(d VerificationData) (*RenderResult, error) {
	subject := "Verify your email address for QUORIX"
	if d.ExpiresInHours == 0 {
		d.ExpiresInHours = 24
	}

	innerTmpl := `<h1>Verify your developer email</h1>
<p>Hello @{{.Username}},</p>
<p>Please confirm your email address to enable article publishing, commenting, and developer community features on QUORIX.</p>
<div class="btn-container">
  <a href="{{.VerificationURL}}" class="btn">Verify Email Address &rarr;</a>
</div>
<p style="font-size: 12px; color: #a1a1aa;">Or paste this single-use verification token manually:</p>
<div class="code-block">{{.Token}}</div>
<p style="font-size: 12px; color: #71717a;">This link will expire in {{.ExpiresInHours}} hours. If you did not create a QUORIX account, you can safely ignore this email.</p>`

	t, err := template.New("verif_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`Verify your QUORIX developer email:

Hello @%s,

Please confirm your email address to enable publishing and discussion features:
%s

Verification Token:
%s

This token expires in %d hours.
If you did not register, please ignore this email.`, d.Username, d.VerificationURL, d.Token, d.ExpiresInHours)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}

// 3. Password Reset Template
func (e *TemplateEngine) renderPasswordReset(d PasswordResetData) (*RenderResult, error) {
	subject := "Reset your QUORIX account password"
	if d.ExpiresInHours == 0 {
		d.ExpiresInHours = 1
	}

	innerTmpl := `<h1>Password Reset Request</h1>
<p>Hello @{{.Username}},</p>
<p>We received a request to reset the password for your QUORIX developer account.</p>
<div class="btn-container">
  <a href="{{.ResetURL}}" class="btn">Reset Password &rarr;</a>
</div>
<p style="font-size: 12px; color: #a1a1aa;">Or enter your recovery token manually:</p>
<div class="code-block">{{.Token}}</div>
<p style="font-size: 12px; color: #71717a;">This password reset link is single-use and will expire in {{.ExpiresInHours}} hour. If you did not request a password reset, no action is required and your account remains secure.</p>`

	t, err := template.New("reset_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`Password Reset Request:

Hello @%s,

We received a request to reset your password:
%s

Reset Token:
%s

This token expires in %d hour.
If you did not request this, you can safely ignore this email.`, d.Username, d.ResetURL, d.Token, d.ExpiresInHours)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}

// 4. Password Changed Notification
func (e *TemplateEngine) renderPasswordChanged(d PasswordChangedData) (*RenderResult, error) {
	subject := "Security Alert: Your QUORIX password was changed"

	innerTmpl := `<h1>Security Alert: Password Changed</h1>
<p>Hello @{{.Username}},</p>
<p>The password for your QUORIX developer account was successfully changed.</p>
<div class="info-card">
  <strong>Activity Details:</strong><br>
  Timestamp: {{.Timestamp}}<br>
  IP Address: {{.IPAddress}}<br>
  User Agent: {{.UserAgent}}
</div>
<p>For your security, all existing sessions and refresh tokens have been invalidated.</p>
<p style="color: #ef4444; font-size: 13px;"><strong>If you did not make this change</strong>, please immediately contact our security team at <a href="mailto:{{.SupportEmail}}" style="color: #ef4444;">{{.SupportEmail}}</a> or revoke access via <a href="{{.SettingsURL}}" style="color: #10b981;">Account Settings</a>.</p>`

	t, err := template.New("pw_changed_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`Security Alert: Password Changed

Hello @%s,

Your password was recently changed.
Timestamp: %s
IP Address: %s
Device: %s

All existing sessions have been terminated.
If you did not make this change, please contact support immediately: %s`, d.Username, d.Timestamp, d.IPAddress, d.UserAgent, d.SupportEmail)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}

// 5. New Follower Notification
func (e *TemplateEngine) renderNewFollower(d NewFollowerData) (*RenderResult, error) {
	subject := fmt.Sprintf("@%s started following you on QUORIX", d.FollowerUsername)

	innerTmpl := `<h1>New Follower Alert</h1>
<p>Hello @{{.AuthorUsername}},</p>
<p><strong>{{.FollowerName}}</strong> (@{{.FollowerUsername}}) started following your technical publications on QUORIX.</p>
<div class="btn-container">
  <a href="{{.FollowerProfile}}" class="btn">View Developer Profile &rarr;</a>
</div>
<p style="font-size: 12px; color: #71717a;">They will receive notifications when you publish new engineering deep-dives.</p>`

	t, err := template.New("follower_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`New Follower Alert:

Hello @%s,

%s (@%s) is now following your publications on QUORIX.
View profile: %s`, d.AuthorUsername, d.FollowerName, d.FollowerUsername, d.FollowerProfile)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}

// 6. New Comment Notification
func (e *TemplateEngine) renderNewComment(d NewCommentData) (*RenderResult, error) {
	subject := fmt.Sprintf("New comment from @%s on \"%s\"", d.CommenterUsername, d.ArticleTitle)
	if len(subject) > 80 {
		subject = subject[:77] + "..."
	}

	innerTmpl := `<h1>New Comment on Your Article</h1>
<p>Hello @{{.AuthorUsername}},</p>
<p><strong>@{{.CommenterUsername}}</strong> left a new comment on your article <strong>"{{.ArticleTitle}}"</strong>:</p>
<div class="code-block" style="color: #e4e4e7; font-family: inherit; font-size: 13px; font-style: italic;">
  &ldquo;{{.CommentSnippet}}&rdquo;
</div>
<div class="btn-container">
  <a href="{{.ArticleURL}}" class="btn">View & Reply to Comment &rarr;</a>
</div>`

	t, err := template.New("comment_body").Parse(innerTmpl)
	if err != nil {
		return nil, err
	}
	var innerBuf bytes.Buffer
	if err := t.Execute(&innerBuf, d); err != nil {
		return nil, err
	}

	html, err := e.wrapHTML(subject, d.PlatformURL, innerBuf.String())
	if err != nil {
		return nil, err
	}

	text := fmt.Sprintf(`New comment on "%s":

Hello @%s,

@%s commented:
"%s"

Join the discussion:
%s`, d.ArticleTitle, d.AuthorUsername, d.CommenterUsername, strings.TrimSpace(d.CommentSnippet), d.ArticleURL)

	return &RenderResult{Subject: subject, HTMLBody: html, TextBody: text}, nil
}
