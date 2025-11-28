// Recipe Import - JSON-LD Schema.org/Recipe parser and validator

// Validate recipe data
function validateRecipe(recipe) {
    const errors = [];

    // Required fields
    if (!recipe.name || recipe.name.trim() === '') {
        errors.push('Recipe name is required');
    }

    if (!recipe.recipeIngredient || (Array.isArray(recipe.recipeIngredient) && recipe.recipeIngredient.length === 0)) {
        errors.push('At least one ingredient is required');
    }

    if (!recipe.recipeInstructions) {
        errors.push('Recipe instructions are required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Normalize recipe data from JSON-LD to internal format
function normalizeRecipe(recipe) {
    const normalized = {};

    // Handle @context and @type (JSON-LD specific)
    // We don't store these, but validate them if present
    if (recipe['@type'] && recipe['@type'] !== 'Recipe') {
        console.warn('Warning: @type is not "Recipe"');
    }

    // Required fields
    normalized.name = recipe.name || '';

    // Ingredients - ensure it's an array
    if (Array.isArray(recipe.recipeIngredient)) {
        normalized.recipeIngredient = recipe.recipeIngredient;
    } else if (typeof recipe.recipeIngredient === 'string') {
        // If it's a string, split by newlines
        normalized.recipeIngredient = recipe.recipeIngredient.split('\n').filter(i => i.trim());
    } else {
        normalized.recipeIngredient = [];
    }

    // Instructions - can be string or array
    if (Array.isArray(recipe.recipeInstructions)) {
        // If array, join with newlines
        normalized.recipeInstructions = recipe.recipeInstructions
            .map(step => {
                // Handle HowToStep format
                if (typeof step === 'object' && step.text) {
                    return step.text;
                }
                return step.toString();
            })
            .join('\n\n');
    } else if (typeof recipe.recipeInstructions === 'object' && recipe.recipeInstructions.text) {
        normalized.recipeInstructions = recipe.recipeInstructions.text;
    } else {
        normalized.recipeInstructions = recipe.recipeInstructions || '';
    }

    // Optional fields
    normalized.description = recipe.description || '';
    normalized.prepTime = recipe.prepTime || null;
    normalized.cookTime = recipe.cookTime || null;
    normalized.totalTime = recipe.totalTime || null;
    normalized.recipeYield = recipe.recipeYield || '';
    normalized.image = recipe.image || '';

    // Source fields (use x-source or source)
    normalized.source = recipe.source || recipe['x-source'] || '';
    normalized.sourceUrl = recipe.sourceUrl || recipe['x-sourceUrl'] || '';

    // Additional optional fields
    if (recipe.keywords) {
        normalized.keywords = recipe.keywords;
    }
    if (recipe.recipeCategory) {
        normalized.recipeCategory = recipe.recipeCategory;
    }
    if (recipe.recipeCuisine) {
        normalized.recipeCuisine = recipe.recipeCuisine;
    }

    return normalized;
}

// Parse JSON string and extract recipes
function parseRecipeJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        // Check if it's an array of recipes or a single recipe
        if (Array.isArray(data)) {
            return data;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error('Invalid JSON format: ' + error.message);
    }
}

// Import recipes from JSON
async function importRecipesFromJSON(jsonString) {
    try {
        // Parse JSON
        const recipes = parseRecipeJSON(jsonString);

        // Normalize and validate each recipe
        const validRecipes = [];
        const invalidRecipes = [];

        recipes.forEach((recipe, index) => {
            const normalized = normalizeRecipe(recipe);
            const validation = validateRecipe(normalized);

            if (validation.valid) {
                validRecipes.push(normalized);
            } else {
                invalidRecipes.push({
                    index,
                    name: recipe.name || `Recipe ${index + 1}`,
                    errors: validation.errors
                });
            }
        });

        // If there are invalid recipes, show warnings
        if (invalidRecipes.length > 0) {
            console.warn('Some recipes failed validation:', invalidRecipes);
        }

        // Import valid recipes
        if (validRecipes.length > 0) {
            const results = await batchImportRecipes(validRecipes);
            return {
                success: true,
                imported: results.success,
                failed: results.failed,
                invalid: invalidRecipes.length,
                errors: results.errors,
                invalidRecipes
            };
        } else {
            return {
                success: false,
                imported: 0,
                failed: 0,
                invalid: invalidRecipes.length,
                errors: [],
                invalidRecipes,
                message: 'No valid recipes to import'
            };
        }
    } catch (error) {
        console.error('Import error:', error);
        return {
            success: false,
            imported: 0,
            failed: 0,
            invalid: 0,
            errors: [error.message],
            message: error.message
        };
    }
}

// Handle file upload
async function handleRecipeFileUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;
                const results = await importRecipesFromJSON(jsonString);
                resolve(results);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

// Example JSON-LD Recipe format for reference
const EXAMPLE_RECIPE_JSON = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": "Example Recipe",
    "description": "A delicious example recipe",
    "prepTime": "PT15M",
    "cookTime": "PT30M",
    "totalTime": "PT45M",
    "recipeYield": "4 servings",
    "recipeIngredient": [
        "2 cups flour",
        "1 cup sugar",
        "1/2 cup butter"
    ],
    "recipeInstructions": "Mix ingredients and bake at 350°F for 30 minutes.",
    "image": "https://example.com/image.jpg",
    "source": "Example Cookbook",
    "sourceUrl": "https://example.com/recipe"
};
