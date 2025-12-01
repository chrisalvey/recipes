// Main Application Logic

let recipesListener = null;
let currentRecipes = [];
let currentSearchQuery = '';
let currentSortBy = 'name';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    console.log('Initializing Recipe Collection App...');

    // Set up navigation
    setupNavigation();

    // Set up search and sort
    setupSearchAndSort();

    // Set up recipe form
    setupRecipeForm();
    
    // Set up tag input
    setupTagInput();

    // Set up import functionality
    setupImport();

    // Set up export functionality
    setupExport();

    // Set up back button
    setupBackButton();

    // Check if user is already signed in
    // Auth state will be handled by firebase.js
}

// Handle auth state changes
window.onAuthStateChanged = (user) => {
    if (user) {
        loadRecipes();
    } else {
        // Clear recipes when signed out
        currentRecipes = [];
        renderRecipesList([]);
        if (recipesListener) {
            recipesListener();
            recipesListener = null;
        }
    }
};

// Set up navigation
function setupNavigation() {
    document.getElementById('nav-browse').addEventListener('click', () => {
        showView('browse-view');
        setActiveNav('nav-browse');
        loadRecipes();
    });

    document.getElementById('nav-add').addEventListener('click', () => {
        clearRecipeForm();
        showView('edit-view');
        setActiveNav('nav-add');
    });
document.getElementById('nav-smart-add').addEventListener('click', () => {        showView('smart-add-view');        setActiveNav('nav-smart-add');    });

    document.getElementById('nav-import').addEventListener('click', () => {
        showView('import-view');
        setActiveNav('nav-import');
    });

    document.getElementById('nav-export').addEventListener('click', () => {
        showView('export-view');
        setActiveNav('nav-export');
    });
}

// Set up search and sort
function setupSearchAndSort() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        applyFilters();
    });

    sortSelect.addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        applyFilters();
    });
}

// Apply search and sort filters
function applyFilters() {
    const filtered = filterRecipes(currentSearchQuery, currentSortBy);
    renderRecipesList(filtered);
}

// Load recipes from Firestore
async function loadRecipes() {
    if (!isAuthenticated()) {
        console.log('User not authenticated, skipping recipe load');
        return;
    }

    try {
        showLoading('Loading recipes');

        // Set up real-time listener
        if (recipesListener) {
            recipesListener(); // Unsubscribe previous listener
        }

        recipesListener = listenToRecipes((recipes) => {
            currentRecipes = recipes;
            updateSearchIndex(recipes);
            applyFilters();
            console.log('Loaded', recipes.length, 'recipes');
        });

    } catch (error) {
        console.error('Error loading recipes:', error);
        showStatus('import-status', 'Failed to load recipes: ' + error.message, true);
    }
}

// Set up recipe form
function setupRecipeForm() {
    const form = document.getElementById('recipe-form');
    const cancelBtn = document.getElementById('cancel-edit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRecipe();
    });

    cancelBtn.addEventListener('click', () => {
        clearRecipeForm();
        showView('browse-view');
        setActiveNav('nav-browse');
    });
}

// Save recipe (add or update)
async function saveRecipe() {
    if (!isAuthenticated()) {
        alert('Please sign in to save recipes');
        return;
    }

    try {
        // Get form values
        const name = document.getElementById('recipe-name').value.trim();
        const description = document.getElementById('recipe-description').value.trim();
        const prepTime = document.getElementById('recipe-preptime').value;
        const cookTime = document.getElementById('recipe-cooktime').value;
        const recipeYield = document.getElementById('recipe-yield').value.trim();
        const ingredients = document.getElementById('recipe-ingredients').value
            .split('\n')
            .map(i => i.trim())
            .filter(i => i.length > 0);
        const instructions = document.getElementById('recipe-instructions').value.trim();
        const source = document.getElementById('recipe-source').value.trim();
        const sourceUrl = document.getElementById('recipe-sourceurl').value.trim();
        const image = document.getElementById('recipe-image').value.trim();

        // Build recipe object
        const recipeData = {
            name,
            recipeIngredient: ingredients,
            recipeInstructions: instructions
        };

        if (description) recipeData.description = description;
        if (prepTime) recipeData.prepTime = minutesToDuration(parseInt(prepTime));
        if (cookTime) recipeData.cookTime = minutesToDuration(parseInt(cookTime));
        if (recipeYield) recipeData.recipeYield = recipeYield;
        if (image) recipeData.image = image;
        if (source) recipeData.source = source;
        if (sourceUrl) recipeData.sourceUrl = sourceUrl;
        if (currentRecipeTags.length > 0) recipeData.recipeTags = currentRecipeTags;

        // Calculate total time if both prep and cook are provided
        if (prepTime && cookTime) {
            const total = parseInt(prepTime) + parseInt(cookTime);
            recipeData.totalTime = minutesToDuration(total);
        }

        // Save or update
        if (currentRecipeId) {
            await updateRecipe(currentRecipeId, recipeData);
            alert('Recipe updated successfully!');
        } else {
            await addRecipe(recipeData);
            alert('Recipe added successfully!');
        }

        // Clear form and return to browse view
        clearRecipeForm();
        showView('browse-view');
        setActiveNav('nav-browse');

    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Failed to save recipe: ' + error.message);
    }
}

// Set up import functionality
function setupImport() {
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('json-file');
    const pasteArea = document.getElementById('json-paste');

    importBtn.addEventListener('click', async () => {
        if (!isAuthenticated()) {
            alert('Please sign in to import recipes');
            return;
        }

        // Check if file is selected
        if (fileInput.files.length > 0) {
            await importFromFile(fileInput.files[0]);
        } else if (pasteArea.value.trim()) {
            await importFromText(pasteArea.value);
        } else {
            showStatus('import-status', 'Please upload a file or paste JSON', true);
        }
    });
}

// Import from file
async function importFromFile(file) {
    try {
        showStatus('import-status', 'Importing...', false);
        const results = await handleRecipeFileUpload(file);
        showImportResults(results);
    } catch (error) {
        console.error('Error importing from file:', error);
        showStatus('import-status', 'Failed to import: ' + error.message, true);
    }
}

// Import from pasted text
async function importFromText(jsonText) {
    try {
        showStatus('import-status', 'Importing...', false);
        const results = await importRecipesFromJSON(jsonText);
        showImportResults(results);
    } catch (error) {
        console.error('Error importing from text:', error);
        showStatus('import-status', 'Failed to import: ' + error.message, true);
    }
}

// Show import results
function showImportResults(results) {
    let message = `Import complete! Imported: ${results.imported}`;

    if (results.failed > 0) {
        message += `, Failed: ${results.failed}`;
    }
    if (results.invalid > 0) {
        message += `, Invalid: ${results.invalid}`;
    }

    if (results.errors && results.errors.length > 0) {
        message += '\n\nErrors:\n' + results.errors.map(e => `- ${e.recipe}: ${e.error}`).join('\n');
    }

    showStatus('import-status', message, results.failed > 0 || results.invalid > 0);

    // Clear form if successful
    if (results.imported > 0) {
        document.getElementById('json-file').value = '';
        document.getElementById('json-paste').value = '';
    }
}

// Set up export functionality
function setupExport() {
    const exportAllBtn = document.getElementById('export-all-btn');

    exportAllBtn.addEventListener('click', async () => {
        if (!isAuthenticated()) {
            alert('Please sign in to export recipes');
            return;
        }

        try {
            showStatus('export-status', 'Exporting...', false);
            const recipes = await exportAllRecipes();

            if (recipes.length === 0) {
                showStatus('export-status', 'No recipes to export', true);
                return;
            }

            const jsonString = JSON.stringify(recipes, null, 2);
            const timestamp = new Date().toISOString().split('T')[0];
            downloadJSON(jsonString, `recipes-export-${timestamp}.json`);

            showStatus('export-status', `Exported ${recipes.length} recipe(s) successfully!`, false);
        } catch (error) {
            console.error('Error exporting recipes:', error);
            showStatus('export-status', 'Failed to export: ' + error.message, true);
        }
    });
}

// Set up back button
function setupBackButton() {
    const backBtn = document.getElementById('back-to-list');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showView('browse-view');
            setActiveNav('nav-browse');
        });
    }
}

// ============ Tag Management ============

let currentRecipeTags = [];

// Initialize tag input handling
function setupTagInput() {
    const tagInput = document.getElementById('recipe-tags-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    
    if (!tagInput || !addTagBtn) return;
    
    // Add tag on button click
    addTagBtn.addEventListener('click', () => {
        addTag(tagInput.value.trim());
        tagInput.value = '';
    });
    
    // Add tag on Enter key
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(tagInput.value.trim());
            tagInput.value = '';
        }
    });
    
    // Allow comma-separated tags
    tagInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.includes(',')) {
            const tags = value.split(',').map(t => t.trim()).filter(t => t);
            tags.forEach(tag => addTag(tag));
            tagInput.value = '';
        }
    });
}

// Add a tag
function addTag(tagName) {
    if (!tagName) return;
    
    // Normalize: lowercase and remove special characters except spaces and hyphens
    tagName = tagName.toLowerCase().replace(/[^\w\s-]/g, '');
    
    // Check if tag already exists
    if (currentRecipeTags.includes(tagName)) {
        return;
    }
    
    // Add to array
    currentRecipeTags.push(tagName);
    
    // Update display
    renderTags();
}

// Remove a tag
function removeTag(tagName) {
    currentRecipeTags = currentRecipeTags.filter(t => t !== tagName);
    renderTags();
}

// Render tags in the form
function renderTags() {
    const tagsList = document.getElementById('recipe-tags-list');
    if (!tagsList) return;
    
    tagsList.innerHTML = '';
    
    currentRecipeTags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `
            ${tag}
            <button type="button" class="tag-remove" data-tag="${tag}">&times;</button>
        `;
        
        // Add remove handler
        const removeBtn = tagEl.querySelector('.tag-remove');
        removeBtn.addEventListener('click', () => removeTag(tag));
        
        tagsList.appendChild(tagEl);
    });
}

// Load tags into form when editing
function loadTags(tags) {
    currentRecipeTags = tags || [];
    renderTags();
}

// Clear tags
function clearTags() {
    currentRecipeTags = [];
    renderTags();
}

// ============ Tag Filtering UI ============

// Render available tags as filter buttons
function renderTagFilters() {
    const container = document.getElementById('tag-filter-container');
    const tagsDiv = document.getElementById('available-tags');
    
    if (!container || !tagsDiv) return;
    
    const allTags = getAllTags(currentRecipes);
    
    if (allTags.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    tagsDiv.innerHTML = '';
    
    allTags.forEach(tag => {
        const tagBtn = document.createElement('button');
        tagBtn.className = 'tag-filter';
        tagBtn.textContent = tag;
        tagBtn.dataset.tag = tag;
        
        // Check if this tag is selected
        if (getSelectedTags().includes(tag)) {
            tagBtn.classList.add('active');
        }
        
        tagBtn.addEventListener('click', () => {
            toggleTagFilter(tag);
            renderTagFilters();
            applyFilters();
        });
        
        tagsDiv.appendChild(tagBtn);
    });
}

// Update applyFilters to include tag filtering
const originalApplyFilters = applyFilters;
applyFilters = function() {
    let filtered = filterRecipes(currentSearchQuery, currentSortBy);
    filtered = filterByTags(filtered, getSelectedTags());
    renderRecipesList(filtered);
    renderTagFilters();
};
