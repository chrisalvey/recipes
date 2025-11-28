// Search functionality using Fuse.js

let fuse = null;
let allRecipes = [];

// Initialize search with recipes
function initializeSearch(recipes) {
    allRecipes = recipes;

    // Configure Fuse.js options
    const options = {
        includeScore: true,
        threshold: 0.4, // 0 = perfect match, 1 = match anything
        keys: [
            {
                name: 'name',
                weight: 2 // Name is more important
            },
            {
                name: 'description',
                weight: 1
            },
            {
                name: 'recipeIngredient',
                weight: 1.5
            },
            {
                name: 'recipeInstructions',
                weight: 0.5
            },
            {
                name: 'source',
                weight: 0.8
            }
        ],
        ignoreLocation: true, // Search entire string, not just beginning
        minMatchCharLength: 2
    };

    fuse = new Fuse(allRecipes, options);
    console.log('Search initialized with', allRecipes.length, 'recipes');
}

// Search recipes
function searchRecipes(query) {
    if (!query || query.trim() === '') {
        return allRecipes;
    }

    if (!fuse) {
        console.warn('Search not initialized');
        return [];
    }

    const results = fuse.search(query);
    return results.map(result => result.item);
}

// Update search index with new recipes
function updateSearchIndex(recipes) {
    initializeSearch(recipes);
}

// Sort recipes
function sortRecipes(recipes, sortBy) {
    const sorted = [...recipes];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;

        case 'date':
            sorted.sort((a, b) => {
                // Sort by dateAdded, newest first
                const dateA = a.dateAdded ? (a.dateAdded.toDate ? a.dateAdded.toDate() : new Date(a.dateAdded)) : new Date(0);
                const dateB = b.dateAdded ? (b.dateAdded.toDate ? b.dateAdded.toDate() : new Date(b.dateAdded)) : new Date(0);
                return dateB - dateA; // Descending order
            });
            break;

        default:
            // No sorting
            break;
    }

    return sorted;
}

// Filter and search recipes
function filterRecipes(query, sortBy) {
    let results = searchRecipes(query);
    return sortRecipes(results, sortBy);
}

// Get all recipes (for when search is empty)
function getAllSearchRecipes() {
    return allRecipes;
}

// Clear search
function clearSearch() {
    fuse = null;
    allRecipes = [];
}

// Highlight search terms in text (utility function)
function highlightSearchTerms(text, query) {
    if (!query || query.trim() === '' || !text) {
        return text;
    }

    const terms = query.trim().split(/\s+/);
    let highlighted = text;

    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
}
