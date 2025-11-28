# Recipe Collection App

A static web application for collecting, searching, and managing personal recipes. Built with vanilla JavaScript and hosted on GitHub Pages with Firebase Firestore for data storage.

## Features

- **Recipe Management**: Add, edit, and delete recipes
- **Import/Export**: Import recipes in JSON-LD format (schema.org/Recipe) and export your collection
- **Search**: Full-text search across recipe names, ingredients, and instructions
- **Sorting**: Sort recipes by name or date added
- **Authentication**: Sign in with Google or anonymously
- **Real-time Sync**: Changes sync automatically across devices

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript (no framework)
- Storage: Firebase Firestore
- Authentication: Firebase Auth (Google and Anonymous)
- Search: Fuse.js (client-side full-text search)
- Hosting: GitHub Pages

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Firestore Database**:
   - Go to Firestore Database in the Firebase Console
   - Click "Create database"
   - Start in **production mode** (we'll add rules next)
   - Choose a location close to your users

4. Enable **Authentication**:
   - Go to Authentication in the Firebase Console
   - Click "Get started"
   - Enable **Google** sign-in provider
   - Enable **Anonymous** sign-in provider

5. Set up **Firestore Security Rules**:
   - Go to Firestore Database > Rules
   - Replace the default rules with the contents of `firestore.rules` (see below)
   - Click "Publish"

6. Get your **Firebase Configuration**:
   - Go to Project Settings (gear icon) > General
   - Scroll down to "Your apps"
   - Click the web icon (`</>`) to add a web app
   - Register the app (you can name it "Recipe Collection")
   - Copy the Firebase configuration object

### 2. Configure the App

1. Open `js/firebase.js`
2. Replace the placeholder values in `firebaseConfig` with your Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Deploy to GitHub Pages

1. Commit your changes:
```bash
git add .
git commit -m "Initial commit - Recipe Collection App"
```

2. Push to GitHub:
```bash
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Click "Settings" > "Pages"
   - Under "Source", select "main" branch and "/" (root) folder
   - Click "Save"
   - Your site will be published at `https://yourusername.github.io/recipes`

4. Update Firebase Auth Domain:
   - Go to Firebase Console > Authentication > Settings
   - Add your GitHub Pages domain to "Authorized domains"
   - Example: `yourusername.github.io`

### 4. Local Development

To test locally before deploying:

1. Use a local web server (required for Firebase):
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

2. Open `http://localhost:8000` in your browser

3. Add `localhost` to Firebase authorized domains if needed

## Firestore Security Rules

Create a file named `firestore.rules` with the following content:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/recipes/{recipeId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Usage

### Adding a Recipe

1. Sign in with Google or anonymously
2. Click "Add Recipe"
3. Fill in the form (name, ingredients, and instructions are required)
4. Click "Save Recipe"

### Importing Recipes

1. Click "Import"
2. Either upload a JSON file or paste JSON directly
3. JSON must follow the schema.org Recipe format:

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Chip Cookies",
  "description": "Classic homemade cookies",
  "prepTime": "PT15M",
  "cookTime": "PT12M",
  "recipeYield": "24 cookies",
  "recipeIngredient": [
    "2 1/4 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup sugar",
    "2 eggs"
  ],
  "recipeInstructions": "Mix ingredients and bake at 375°F for 12 minutes.",
  "source": "Grandma's Cookbook",
  "sourceUrl": "https://example.com/recipe"
}
```

### Searching Recipes

- Use the search box to find recipes by name, ingredients, or instructions
- Search updates as you type
- Use the sort dropdown to sort by name or date added

### Exporting Recipes

- Click "Export" to download all your recipes as JSON
- Individual recipes can be exported from the recipe detail page
- Exported files maintain the schema.org Recipe format

## File Structure

```
/
  index.html          # Main HTML file
  css/
    styles.css        # All styles
  js/
    app.js            # Main application logic
    firebase.js       # Firebase initialization and auth
    db.js             # Firestore database operations
    search.js         # Search functionality (Fuse.js)
    import.js         # JSON parsing and validation
    ui.js             # DOM manipulation and rendering
  README.md           # This file
  firestore.rules     # Firestore security rules
```

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- Firebase SDK
- Fetch API

## Future Enhancements

Potential features for future development:
- Recipe scaling (adjust serving sizes)
- Tags/categories
- Image upload to Firebase Storage
- Baker's percentage calculations for bread recipes
- Print-friendly view
- Offline support via Firestore persistence
- Recipe sharing via URL

## License

MIT License - feel free to use this for your own recipe collection!

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase configuration is correct
3. Ensure Firestore security rules are deployed
4. Check that authentication is working

## Contributing

This is a personal project, but suggestions and improvements are welcome!
