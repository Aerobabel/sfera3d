# TURN Credentials Reference (Metered.ca)

Saved 2026-04-08. These were configured via GPT to test TURN relay connectivity.
It's unclear whether they helped — disabled for now.

## Environment Variables

```bash
NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_SERVERS=[{"urls":["stun:stun.relay.metered.ca:80"]},{"urls":["turn:global.relay.metered.ca:80"],"username":"707cf53c6ed743e2f0fdd8b6","credential":"Nxehncfk/k44roJV"},{"urls":["turn:global.relay.metered.ca:80?transport=tcp"],"username":"707cf53c6ed743e2f0fdd8b6","credential":"Nxehncfk/k44roJV"},{"urls":["turn:global.relay.metered.ca:443"],"username":"707cf53c6ed743e2f0fdd8b6","credential":"Nxehncfk/k44roJV"},{"urls":["turns:global.relay.metered.ca:443?transport=tcp"],"username":"707cf53c6ed743e2f0fdd8b6","credential":"Nxehncfk/k44roJV"}]

# Optional: force all traffic through TURN relay (bypass direct/STUN)
NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_TRANSPORT_POLICY=relay
```

## Provider

- Service: Metered TURN (relay.metered.ca)
- Username: `707cf53c6ed743e2f0fdd8b6`
- Credential: `Nxehncfk/k44roJV`

## Code Reference

The frontend ICE override logic was added in commit `2b99c8c` ("fix(pixelstreaming): allow frontend ICE override").

The code lives in `src/components/PixelStreamingPlayer.tsx` lines 46-163 and intercepts the signalling server's RTC config in the `onConfig` handler (lines 844-865).

## How to Re-enable

1. Uncomment the `NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_SERVERS` line in `.env.local`
2. Optionally set `NEXT_PUBLIC_PIXELSTREAM_FORCE_ICE_TRANSPORT_POLICY=relay` to force all traffic through TURN
3. Redeploy
