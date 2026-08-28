# Facebook Login Deployment Checkpoint

This checkpoint deliberately triggers the normal `main` branch CI and downstream hosting deployment after Facebook was added to the shared BNDY login panel.

Expected UI: `Continue with Facebook` alongside Google and Apple.

Expected auth target: `https://api.bndy.co.uk/auth/facebook`, preserving the requested `returnTo` path.
