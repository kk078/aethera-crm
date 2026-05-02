# Gmail OAuth Setup Instructions

## Step 1: Get Authorization Code

1. Open the following URL in your browser:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&access_type=offline&prompt=consent
   ```

2. Sign in with `info@aetherahealthcare.com`

3. Grant all requested permissions

4. You will see a code like `4/0Aean...` - copy this code

## Step 2: Exchange Code for Refresh Token

Use the following curl command to exchange the code for tokens:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d client_id=280155650451-afhvc54egr4tm8tv24utp6mfcqe8qbku \
  -d client_secret=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 \
  -d code=YOUR_AUTH_CODE_HERE \
  -d redirect_uri=urn:ietf:wg:oauth:2.0:oob \
  -d grant_type=authorization_code
```

This will return:
```json
{
  "access_token": "...",
  "expires_in": 3599,
  "refresh_token": "...",
  "scope": "...",
  "token_type": "Bearer"
}
```

## Step 3: Set Refresh Token as Worker Secret

In the relay-email-proxy directory, run:

```bash
npx wrangler secret put GMAIL_REFRESH_TOKEN --env production
# Paste your refresh token here
```

## Step 4: Update CRM Settings

Update the CRM settings to use the relay worker:

```json
{
  "relay_url": "https://relay-email-proxy-production.aetherahealthcare.workers.dev",
  "api_key": "shared_secret",
  "from_email": "info@aetherahealthcare.com",
  "from_name": "Aethera Healthcare",
  "use_relay": true
}
```

## Step 5: Send a Test Email

Once the refresh token is set, send a test email via the CRM to verify everything works.

## Alternative: Use Cloudflare Email Routing

Instead of the relay worker, you can verify your email address in Cloudflare Email Routing dashboard:

1. Go to Cloudflare Dashboard > Email > Email Routing
2. Add and verify `kirkmar078@gmail.com` as a verified destination
3. The email system will work immediately without needing the relay worker

