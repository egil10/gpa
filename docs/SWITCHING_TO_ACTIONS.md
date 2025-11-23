# Switching from Branch to GitHub Actions

## Current Situation

You're currently using **"Deploy from a branch"** (main branch), but the project is set up to use **GitHub Actions** for better control and automatic builds.

## How to Switch

### Step 1: Make Sure Workflow Exists

The workflow file should be at: `.github/workflows/deploy.yml`

If it's not there, it's already in your repo. You can verify by checking the **Actions** tab.

### Step 2: Trigger the Workflow First

Before you can select "GitHub Actions" as the source, you need to run the workflow at least once:

1. Go to **Actions** tab in your GitHub repo
2. Click on **"Deploy to GitHub Pages"** workflow (on the left sidebar)
3. Click **"Run workflow"** button (top right)
4. Select `main` branch
5. Click **"Run workflow"**

Wait for it to complete (2-3 minutes).

### Step 3: Switch to GitHub Actions

1. Go to **Settings** → **Pages**
2. Under **Source**, you should now see **"GitHub Actions"** as an option
3. Select **"GitHub Actions"** (instead of "Deploy from a branch")
4. Save

### Step 4: Verify

- Go to **Actions** tab
- You should see the workflow running
- Once complete, your site will be deployed

## Why Switch?

**Benefits of GitHub Actions:**
- ✅ Automatic builds on every push
- ✅ Better error messages if build fails
- ✅ Can see build logs
- ✅ More control over the build process
- ✅ Can add custom build steps

**Branch Deployment:**
- ❌ Requires manual build and push
- ❌ Less visibility into build process
- ❌ Can't customize build steps easily

## Troubleshooting

### "GitHub Actions" option not showing?

1. Make sure `.github/workflows/deploy.yml` exists in your repo
2. Run the workflow manually at least once (Actions tab → Run workflow)
3. Wait a few minutes, then refresh the Settings → Pages page

### Build failing?

Check the **Actions** tab for error messages. Common issues:
- Missing dependencies
- TypeScript errors
- Build configuration issues

## After Switching

Once switched, every push to `main` will automatically:
1. Build your site
2. Deploy to GitHub Pages
3. Update your live site

No manual steps needed! 🎉

