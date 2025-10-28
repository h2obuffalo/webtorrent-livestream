# SSL/TLS Certificates

This directory contains SSL/TLS certificates for secure HTTPS connections.

## Required Files

Place the following files in this directory:

- `origin.pem` - Cloudflare Origin Certificate (public key)
- `origin-key.pem` - Cloudflare Origin Private Key

## File Permissions

Ensure proper file permissions for security:

```bash
chmod 600 origin-key.pem  # Private key - read only for owner
chmod 644 origin.pem      # Public certificate - readable by all
```

## Usage

These certificates are used by:
- Broadcaster server (port 3000) - HTTPS mode
- Signaling server (port 8080) - WSS mode

## Cloudflare Setup

1. Generate origin certificate in Cloudflare Dashboard
2. Download both certificate and private key
3. Place files in this directory with the correct names
4. Restart services to enable HTTPS

## Security Notes

- Never commit private keys to version control
- Keep certificates up to date
- Monitor certificate expiration dates
- Use strong file permissions (600 for private keys)
