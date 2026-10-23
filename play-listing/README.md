# Google Play listing management

Edit text files in en-US and run `node scripts/publish-play-listing.mjs` for a dry-run and length validation.

Use the GitHub Actions **Google Play listing metadata** workflow with publish enabled to submit metadata through the Android Publisher API. Requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` GitHub Actions secret with Play Console permissions to manage store presence. Never commit service-account credentials.

The API edit uses `changesNotSentForReview=true`; open Play Console and send changes for review. This workflow does not guarantee approval, publication, search ranking, or instant visibility. It updates English (US) text only, not images. Validate every feature claim against the shipped production app. Calculator count intentionally omitted pending production verification.
