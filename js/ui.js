// UI Rendering and DOM Manipulation

let currentRecipeId = null;

// Show specific view
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Update navigation active state
function setActiveNav(navId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const navBtn = document.getElementById(navId);
    if (navBtn) {
        navBtn.classList.add('active');
    }
}

// Render recipes list
function renderRecipesList(recipes) {
    const recipesList = document.getElementById('recipes-list');
    const noRecipes = document.getElementById('no-recipes');

    if (!recipes || recipes.length === 0) {
        recipesList.innerHTML = '';
        noRecipes.style.display = 'block';
        return;
    }

    noRecipes.style.display = 'none';
    recipesList.innerHTML = recipes.map(recipe => createRecipeCard(recipe)).join('');

    // Add click handlers to recipe cards
    recipesList.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            const recipeId = card.dataset.recipeId;
            showRecipeDetail(recipeId);
        });
    });
}

// Create recipe card HTML
function createRecipeCard(recipe) {
    const prepTime = durationToMinutes(recipe.prepTime);
    const cookTime = durationToMinutes(recipe.cookTime);
    const totalTime = prepTime && cookTime ? prepTime + cookTime : null;

    const timeInfo = [];
    if (prepTime) timeInfo.push(`Prep: ${prepTime}m`);
    if (cookTime) timeInfo.push(`Cook: ${cookTime}m`);
    if (totalTime) timeInfo.push(`Total: ${totalTime}m`);

    return `
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <h3>${escapeHtml(recipe.name)}</h3>
            ${recipe.description ? `<p class="recipe-description">${escapeHtml(recipe.description)}</p>` : ''}
            <div class="recipe-meta">
                ${timeInfo.length > 0 ? `<span>${timeInfo.join(' | ')}</span>` : ''}
                ${recipe.recipeYield ? `<span>${escapeHtml(recipe.recipeYield)}</span>` : ''}
            ${renderTagsHTML(recipe.recipeTags)}
            </div>
        </div>
    `;
}

// Show recipe detail view
async function showRecipeDetail(recipeId) {
    try {
        const recipe = await getRecipe(recipeId);
        currentRecipeId = recipeId;

        const detailContainer = document.getElementById('recipe-detail');
        detailContainer.innerHTML = createRecipeDetailHTML(recipe);

        // Add event listeners to action buttons
        const cookModeBtn = document.getElementById('cook-mode-btn');
        const editBtn = document.getElementById('edit-recipe-btn');
        const deleteBtn = document.getElementById('delete-recipe-btn');
        const exportBtn = document.getElementById('export-recipe-btn');

        if (cookModeBtn) {
            cookModeBtn.addEventListener('click', () => toggleCookMode(cookModeBtn));
        }
        if (editBtn) {
            editBtn.addEventListener('click', () => editRecipe(recipeId));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => confirmDeleteRecipe(recipeId));
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => exportSingleRecipe(recipe));
        }

        showView('detail-view');
    } catch (error) {
        console.error('Error showing recipe detail:', error);
        alert('Failed to load recipe: ' + error.message);
    }
}

// Create recipe detail HTML
function createRecipeDetailHTML(recipe) {
    const prepTime = durationToMinutes(recipe.prepTime);
    const cookTime = durationToMinutes(recipe.cookTime);
    const totalTime = prepTime && cookTime ? prepTime + cookTime : null;

    return `
        <h2>${escapeHtml(recipe.name)}</h2>
        ${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''}

        <div class="detail-actions">
            <button id="cook-mode-btn" class="btn-cook-mode">🍳 Cook Mode</button>
            <button id="edit-recipe-btn" class="btn-secondary">Edit</button>
            <button id="export-recipe-btn" class="btn-secondary">Export</button>
            <button id="delete-recipe-btn" class="btn-danger">Delete</button>
        </div>

        <div class="recipe-info">
            ${prepTime ? `<div class="info-item"><span class="info-label">Prep Time</span><span class="info-value">${prepTime} min</span></div>` : ''}
            ${cookTime ? `<div class="info-item"><span class="info-label">Cook Time</span><span class="info-value">${cookTime} min</span></div>` : ''}
            ${totalTime ? `<div class="info-item"><span class="info-label">Total Time</span><span class="info-value">${totalTime} min</span></div>` : ''}
            ${recipe.recipeYield ? `<div class="info-item"><span class="info-label">Yield</span><span class="info-value">${escapeHtml(recipe.recipeYield)}</span></div>` : ''}
        </div>
n        ${renderTagsHTML(recipe.recipeTags)}

        ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;">` : ''}

        <div class="recipe-section">
            <h3>Ingredients</h3>
            <ul class="ingredient-list">
                ${recipe.recipeIngredient.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
            </ul>
        </div>

        <div class="recipe-section">
            <h3>Instructions</h3>
            <div class="instructions">${escapeHtml(recipe.recipeInstructions)}</div>
        </div>

        ${recipe.source || recipe.sourceUrl ? `
            <div class="recipe-source">
                Source: ${recipe.source ? escapeHtml(recipe.source) : ''}
                ${recipe.sourceUrl ? `<a href="${escapeHtml(recipe.sourceUrl)}" target="_blank" rel="noopener">View Original</a>` : ''}
            </div>
        ` : ''}
    `;
}

// Edit recipe
async function editRecipe(recipeId) {
    try {
        const recipe = await getRecipe(recipeId);
        currentRecipeId = recipeId;

        // Populate form
        document.getElementById('recipe-name').value = recipe.name || '';
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-preptime').value = durationToMinutes(recipe.prepTime) || '';
        document.getElementById('recipe-cooktime').value = durationToMinutes(recipe.cookTime) || '';
        document.getElementById('recipe-yield').value = recipe.recipeYield || '';
        document.getElementById('recipe-ingredients').value = recipe.recipeIngredient.join('\n');
        document.getElementById('recipe-instructions').value = recipe.recipeInstructions || '';
        document.getElementById('recipe-source').value = recipe.source || '';
        document.getElementById('recipe-sourceurl').value = recipe.sourceUrl || '';
        document.getElementById('recipe-image').value = recipe.image || '';
        
        // Load tags
        loadTags(recipe.recipeTags);

        // Update form title
        document.getElementById('edit-title').textContent = 'Edit Recipe';

        showView('edit-view');
        setActiveNav('nav-add');
    } catch (error) {
        console.error('Error loading recipe for edit:', error);
        alert('Failed to load recipe: ' + error.message);
    }
}

// Clear recipe form
function clearRecipeForm() {
    document.getElementById('recipe-form').reset();
    document.getElementById('edit-title').textContent = 'Add New Recipe';
    currentRecipeId = null;
    clearTags();
}

// Confirm delete recipe
async function confirmDeleteRecipe(recipeId) {
    if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        try {
            await deleteRecipe(recipeId);
            alert('Recipe deleted successfully');
            showView('browse-view');
            setActiveNav('nav-browse');
            // Recipes will be reloaded by the listener
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Failed to delete recipe: ' + error.message);
        }
    }
}

// Export single recipe
function exportSingleRecipe(recipe) {
    const exported = exportRecipe(recipe);
    const jsonString = JSON.stringify(exported, null, 2);
    downloadJSON(jsonString, `recipe-${recipe.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`);
}

// Download JSON file
function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show status message
function showStatus(elementId, message, isError = false) {
    const statusEl = document.getElementById(elementId);
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'status-message ' + (isError ? 'error' : 'success');
        statusEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show loading state
function showLoading(message = 'Loading') {
    const recipesList = document.getElementById('recipes-list');
    if (recipesList) {
        recipesList.innerHTML = `<div class="loading">${message}</div>`;
    }
}

// Render tags HTML
function renderTagsHTML(tags) {
    if (!tags || tags.length === 0) return '';
    return '<div class="recipe-tags">' + tags.map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('') + '</div>';
}

// ============ Cook Mode (Wake Lock) ============

let wakeLock = null;

// Toggle Cook Mode
async function toggleCookMode(button) {
    if (wakeLock) {
        // Disable Cook Mode
        await releaseCookMode(button);
    } else {
        // Enable Cook Mode
        await enableCookMode(button);
    }
}

// Enable Cook Mode (request wake lock)
async function enableCookMode(button) {
    // Check if Wake Lock API is supported
    if (!('wakeLock' in navigator)) {
        alert('Cook Mode is not supported on this device/browser. Please use a modern mobile browser.');
        return;
    }

    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active');

        // Update button visual state
        button.classList.add('active');
        button.innerHTML = '✓ Cook Mode Active';

        // Listen for wake lock release (e.g., when user switches tabs)
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
            wakeLock = null;
            button.classList.remove('active');
            button.innerHTML = '🍳 Cook Mode';
        });

    } catch (err) {
        console.error('Failed to activate Cook Mode:', err);
        alert(`Failed to activate Cook Mode: ${err.message}`);
    }
}

// Release Cook Mode (release wake lock)
async function releaseCookMode(button) {
    if (wakeLock) {
        try {
            await wakeLock.release();
            wakeLock = null;
            button.classList.remove('active');
            button.innerHTML = '🍳 Cook Mode';
            console.log('Cook Mode disabled');
        } catch (err) {
            console.error('Failed to release wake lock:', err);
        }
    }
}

// Release wake lock when navigating away from detail view
window.addEventListener('beforeunload', () => {
    if (wakeLock) {
        wakeLock.release();
    }
});
