# Documentation

Welcome to the Karakterstatistikk documentation.

## 📚 Available Documentation

### [Quick Start Guide](QUICK_START.md)
Get started quickly - for both users and developers.

### [Running Locally](RUNNING_LOCALLY.md)
How to run the website on your computer for development.

### [Architecture Overview](ARCHITECTURE.md)
Project structure, design system, and technical architecture.

### [Data Retrieval](DATA_RETRIEVAL.md)
How data is fetched from NSD API - on-demand, real-time requests.

### [API Documentation](API.md)
Complete API reference for functions and integrations.

### [Deployment Guide](DEPLOYMENT.md)
Step-by-step instructions for deploying to GitHub Pages.

### [Project Structure](PROJECT_STRUCTURE.md)
Detailed breakdown of the project structure.

## 🔍 Quick Answers

**Q: When is data retrieved?**  
A: Data is fetched **on-demand** when users search. Each search makes a fresh API call to NSD - no caching.

**Q: How does autocomplete work?**  
A: Uses a local database of popular courses. Searches by course code or name, filters by institution.

**Q: Can I add more courses?**  
A: Yes! Edit `lib/courses.ts` and add courses to the `POPULAR_COURSES` array.

**Q: How is GPA calculated?**  
A: Weighted average: `GPA = (Σ(grade_value × credits)) / (Σ(credits))`

## 📖 Need Help?

- Check the [Quick Start Guide](QUICK_START.md) for common tasks
- See [Architecture](ARCHITECTURE.md) for technical details
- Review [API Documentation](API.md) for function references

