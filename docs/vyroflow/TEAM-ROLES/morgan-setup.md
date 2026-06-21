# Morgan — Auto-Commenter Setup

## What Morgan Does
Runs `morgan-commenter.js` — posts a debate-hook comment on every video within 5 minutes of Dan uploading. Logs the comment thread ID so Dan/Taylor can pin it in YouTube Studio in one click.

## One-Time Setup

### 1. Install Node.js (if not already installed)
Download from nodejs.org — free, takes 2 minutes.

### 2. Set your environment variable
This keeps your token out of the code.

**Mac/Linux — add to your terminal profile (~/.zshrc or ~/.bashrc):**
```bash
export YOUTUBE_REFRESH_TOKEN="1//04qk72WaF3IikCgYIARAAGAQSNwF-L9Ir..."
export YOUTUBE_CLIENT_SECRET="your-secret-here"
```
Then run: `source ~/.zshrc`

**Windows — Command Prompt:**
```cmd
setx YOUTUBE_REFRESH_TOKEN "1//04qk72..."
setx YOUTUBE_CLIENT_SECRET "your-secret-here"
```

### 3. Download the script
The script lives at `scripts/morgan-commenter.js` in this repo.

## How Dan Triggers Morgan After Every Upload

The moment a video goes live, Dan runs one command:

```bash
# Get the video ID from the YouTube URL
# e.g. youtube.com/shorts/V4YY8KshZFc → video ID is V4YY8KshZFc

# For a Fortnite debate clip:
node morgan-commenter.js V4YY8KshZFc debate

# For a funny fail clip:
node morgan-commenter.js V4YY8KshZFc fail

# For a skill clip:
node morgan-commenter.js V4YY8KshZFc skill

# Default (works for anything):
node morgan-commenter.js V4YY8KshZFc
```

## Comment Types

| Type | Comment Posted |
|------|----------------|
| `debate` | "Drop your setup below 👇 console or PC?" |
| `fail` | "This actually happened 💀 who's had worse?" |
| `skill` | "Rate this out of 10 👇" |
| `fortnite` | "What do YOU play on? Comment below ⬇️" |

## After Morgan Posts
Morgan prints the comment thread ID. Dan or Taylor goes to YouTube Studio → Comments → finds it → clicks **Pin**. Takes 10 seconds.

## Finding the Video ID
The video ID is in the URL:
- `youtube.com/shorts/V4YY8KshZFc` → ID is `V4YY8KshZFc`
- `youtube.com/watch?v=V4YY8KshZFc` → ID is `V4YY8KshZFc`

## Security
- NEVER put the refresh token directly in the script
- NEVER commit the .env file
- The token is stored as an environment variable only
- If the token ever leaks, go back to developers.google.com/oauthplayground and generate a new one
