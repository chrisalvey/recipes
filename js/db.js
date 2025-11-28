// Database Operations for Recipe Collection

// Get reference to user's recipes collection
function getRecipesCollection(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    return db.collection('users').doc(userId).collection('recipes');
}

// Add a new recipe
async function addRecipe(recipeData) {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in to add recipes');
    }

    try {
        const recipesRef = getRecipesCollection(userId);
        const timestamp = firebase.firestore.Timestamp.now();

        const recipe = {
            ...recipeData,
            dateAdded: timestamp,
            dateModified: timestamp
        };

        const docRef = await recipesRef.add(recipe);
        console.log('Recipe added with ID:', docRef.id);
        return { id: docRef.id, ...recipe };
    } catch (error) {
        console.error('Error adding recipe:', error);
        throw error;
    }
}

// Get a single recipe by ID
async function getRecipe(recipeId) {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in');
    }

    try {
        const recipeRef = getRecipesCollection(userId).doc(recipeId);
        const doc = await recipeRef.get();

        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            throw new Error('Recipe not found');
        }
    } catch (error) {
        console.error('Error getting recipe:', error);
        throw error;
    }
}

// Get all recipes for current user
async function getAllRecipes() {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in');
    }

    try {
        const recipesRef = getRecipesCollection(userId);
        const snapshot = await recipesRef.get();

        const recipes = [];
        snapshot.forEach(doc => {
            recipes.push({ id: doc.id, ...doc.data() });
        });

        return recipes;
    } catch (error) {
        console.error('Error getting recipes:', error);
        throw error;
    }
}

// Update a recipe
async function updateRecipe(recipeId, recipeData) {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in');
    }

    try {
        const recipeRef = getRecipesCollection(userId).doc(recipeId);
        const timestamp = firebase.firestore.Timestamp.now();

        const updatedData = {
            ...recipeData,
            dateModified: timestamp
        };

        await recipeRef.update(updatedData);
        console.log('Recipe updated:', recipeId);
        return { id: recipeId, ...updatedData };
    } catch (error) {
        console.error('Error updating recipe:', error);
        throw error;
    }
}

// Delete a recipe
async function deleteRecipe(recipeId) {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in');
    }

    try {
        const recipeRef = getRecipesCollection(userId).doc(recipeId);
        await recipeRef.delete();
        console.log('Recipe deleted:', recipeId);
        return true;
    } catch (error) {
        console.error('Error deleting recipe:', error);
        throw error;
    }
}

// Listen to recipe changes (real-time updates)
function listenToRecipes(callback) {
    const userId = getCurrentUserId();
    if (!userId) {
        console.warn('User not signed in, cannot listen to recipes');
        return null;
    }

    try {
        const recipesRef = getRecipesCollection(userId);
        return recipesRef.onSnapshot(snapshot => {
            const recipes = [];
            snapshot.forEach(doc => {
                recipes.push({ id: doc.id, ...doc.data() });
            });
            callback(recipes);
        }, error => {
            console.error('Error listening to recipes:', error);
        });
    } catch (error) {
        console.error('Error setting up listener:', error);
        return null;
    }
}

// Helper function to convert minutes to ISO 8601 duration format
function minutesToDuration(minutes) {
    if (!minutes || minutes <= 0) return null;
    return `PT${minutes}M`;
}

// Helper function to convert ISO 8601 duration to minutes
function durationToMinutes(duration) {
    if (!duration) return null;
    const match = duration.match(/PT(\d+)M/);
    return match ? parseInt(match[1]) : null;
}

// Helper function to format Firestore timestamp to readable date
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

// Batch import recipes
async function batchImportRecipes(recipesArray) {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User must be signed in to import recipes');
    }

    try {
        const recipesRef = getRecipesCollection(userId);
        const timestamp = firebase.firestore.Timestamp.now();
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Firebase has a limit of 500 operations per batch
        // For simplicity, we'll add them one by one
        for (const recipeData of recipesArray) {
            try {
                const recipe = {
                    ...recipeData,
                    dateAdded: timestamp,
                    dateModified: timestamp
                };
                await recipesRef.add(recipe);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    recipe: recipeData.name || 'Unknown',
                    error: error.message
                });
                console.error('Error importing recipe:', error);
            }
        }

        return results;
    } catch (error) {
        console.error('Error in batch import:', error);
        throw error;
    }
}

// Export all recipes
async function exportAllRecipes() {
    try {
        const recipes = await getAllRecipes();
        return recipes.map(recipe => {
            // Remove Firestore-specific fields and format for JSON-LD
            const { id, dateAdded, dateModified, ...recipeData } = recipe;
            return {
                '@context': 'https://schema.org',
                '@type': 'Recipe',
                ...recipeData
            };
        });
    } catch (error) {
        console.error('Error exporting recipes:', error);
        throw error;
    }
}

// Export single recipe
function exportRecipe(recipe) {
    const { id, dateAdded, dateModified, ...recipeData } = recipe;
    return {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        ...recipeData
    };
}
