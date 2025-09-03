// Recipe Collection App
class RecipeApp {
    constructor() {
        this.recipes = [];
        this.availableTags = [];
        this.currentRecipe = null;
        this.currentScale = 1;
        this.isMetric = true;
        this.activeFilters = new Set();
        this.currentView = 'home';
        
        this.init();
    }
    
    async init() {
        await this.loadRecipes();
        this.setupEventListeners();
        this.renderTagChips();
        this.renderRecipes();
        this.updateRecipeCount();
    }
    
    // Data Management
    async loadRecipes() {
        try {
            // Try loading from JSON file first
            const response = await fetch('recipes.json');
            if (response.ok) {
                const data = await response.json();
                this.recipes = data.recipes || [];
                this.availableTags = data.availableTags || [];
                return;
            }
        } catch (error) {
            console.log('Loading from JSON failed, trying localStorage:', error);
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem('recipeApp_recipes');
        if (stored) {
            const data = JSON.parse(stored);
            this.recipes = Array.isArray(data) ? data : data.recipes || [];
        }
        
        // Set default tags if none loaded
        if (this.availableTags.length === 0) {
            this.availableTags = [
                'Bread', 'Pizza', 'BBQ', 'Asian', 'Indian', 'Breakfast', 'Mexican',
                'Desserts', 'Soups', 'Salads', 'Pasta', 'Seafood', 'Vegetarian', 'Grilling',
                'Appetizers', 'Beverages', 'Holiday', 'Quick & Easy', 'Slow Cooker',
                'Chicken', 'Rice', 'One-Pan', 'Dinner', 'Cuban', 'Pork', 'Italian'
            ];
        }
    }
    
    saveRecipes() {
        // Save to localStorage as backup
        const data = {
            recipes: this.recipes,
            availableTags: this.availableTags
        };
        localStorage.setItem('recipeApp_recipes', JSON.stringify(data));
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Claude Integration - Add recipe from URL
    addRecipeFromUrl(recipeData) {
        const requiredFields = ['name', 'ingredients', 'instructions', 'tags'];
        const missingFields = requiredFields.filter(field => !recipeData[field]);
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            return false;
        }
        
        const newRecipe = {
            id: recipeData.id || this.generateId(),
            name: recipeData.name,
            tags: recipeData.tags || [],
            sourceUrl: recipeData.sourceUrl || null,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            servings: recipeData.servings || null,
            totalTime: recipeData.totalTime || null,
            dateAdded: new Date().toISOString()
        };
        
        // Check if recipe already exists
        const existingRecipe = this.recipes.find(r => r.name === newRecipe.name);
        if (existingRecipe) {
            console.log('Recipe already exists:', newRecipe.name);
            return false;
        }
        
        this.recipes.push(newRecipe);
        this.saveRecipes();
        this.renderRecipes();
        this.updateRecipeCount();
        
        const sourceText = recipeData.sourceUrl ? ` from ${new URL(recipeData.sourceUrl).hostname}` : '';
        this.showToast(`Recipe "${newRecipe.name}" added successfully${sourceText}!`);
        
        return true;
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('addRecipeBtn').addEventListener('click', () => this.showView('addRecipe'));
        document.getElementById('backBtn').addEventListener('click', () => this.showView('home'));
        document.getElementById('addRecipeBackBtn').addEventListener('click', () => this.showView('home'));
        document.getElementById('cookingBackBtn').addEventListener('click', () => this.showView('recipeDetail'));
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('searchClear').addEventListener('click', () => this.clearSearch());
        
        // Unit toggle
        document.getElementById('unitToggle').addEventListener('click', () => this.toggleUnits());
        
        // Recipe detail actions
        document.getElementById('cookingModeBtn').addEventListener('click', () => this.showCookingMode());
        document.getElementById('editBtn').addEventListener('click', () => this.editRecipe());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteRecipe());
        
        // Recipe scaling
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setScale(parseFloat(e.target.dataset.scale)));
        });
        
        // Add recipe form
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('saveRecipeBtn').addEventListener('click', () => this.saveRecipe());
        
        // Upload area
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('click', () => document.getElementById('photoInput').click());
        
        // Toast close
        document.querySelector('.toast-close').addEventListener('click', () => this.hideToast());
    }
    
    // View Management
    showView(viewName) {
        const views = ['homeView', 'recipeDetailView', 'addRecipeView', 'cookingModeView'];
        views.forEach(view => {
            document.getElementById(view).classList.add('hidden');
        });
        
        document.getElementById(viewName + 'View').classList.remove('hidden');
        this.currentView = viewName;
        
        if (viewName === 'home') {
            this.renderRecipes();
        }
    }
    
    // Recipe Rendering
    renderRecipes() {
        const container = document.getElementById('recipeList');
        const filteredRecipes = this.getFilteredRecipes();
        
        if (filteredRecipes.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        container.innerHTML = filteredRecipes
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .map(recipe => this.getRecipeCardHTML(recipe))
            .join('');
        
        // Add click listeners
        container.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showRecipeDetail(card.dataset.recipeId);
            });
        });
    }
    
    getRecipeCardHTML(recipe) {
        const date = new Date(recipe.dateAdded).toLocaleDateString();
        const tags = recipe.tags.slice(0, 3).map(tag => 
            `<span class="recipe-tag">${tag}</span>`
        ).join('');
        
        return `
            <div class="recipe-card" data-recipe-id="${recipe.id}">
                <div class="recipe-card-header">
                    <h3 class="recipe-card-title">${recipe.name}</h3>
                    <span class="recipe-card-date">${date}</span>
                </div>
                <div class="recipe-card-tags">${tags}</div>
            </div>
        `;
    }
    
    getEmptyStateHTML() {
        const hasFilters = this.activeFilters.size > 0 || document.getElementById('searchInput').value.trim();
        
        if (hasFilters) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No recipes found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
        }
        
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No recipes yet</h3>
                <p>Add your first recipe by clicking the + button</p>
            </div>
        `;
    }
    
    // Recipe Detail
    showRecipeDetail(recipeId) {
        this.currentRecipe = this.recipes.find(r => r.id === recipeId);
        if (!this.currentRecipe) return;
        
        this.currentScale = 1;
        this.renderRecipeDetail();
        this.showView('recipeDetail');
    }
    
    renderRecipeDetail() {
        if (!this.currentRecipe) return;
        
        document.getElementById('recipeTitle').textContent = this.currentRecipe.name;
        
        // Render tags
        const tagsContainer = document.getElementById('recipeTags');
        tagsContainer.innerHTML = this.currentRecipe.tags.map(tag => 
            `<span class="recipe-tag">${tag}</span>`
        ).join('');
        
        // Render source URL if available
        const dateContainer = document.getElementById('recipeDate');
        let dateHtml = 'Added ' + new Date(this.currentRecipe.dateAdded).toLocaleDateString();
        if (this.currentRecipe.sourceUrl) {
            dateHtml += ` • <a href="${this.currentRecipe.sourceUrl}" target="_blank" rel="noopener noreferrer" class="source-link">View Original Recipe</a>`;
        }
        dateContainer.innerHTML = dateHtml;
        
        this.renderIngredients();
        
        // Render instructions
        const instructionsContainer = document.getElementById('instructionList');
        instructionsContainer.innerHTML = this.currentRecipe.instructions.map(instruction => 
            `<li>${instruction}</li>`
        ).join('');
        
        // Update scale buttons
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.scale) === this.currentScale);
        });
    }
    
    renderIngredients() {
        const container = document.getElementById('ingredientList');
        container.innerHTML = this.currentRecipe.ingredients.map(ingredient => {
            const scaledAmount = this.scaleAmount(ingredient.amount, ingredient.unit);
            const convertedAmount = this.convertUnits(scaledAmount, ingredient.unit);
            
            return `
                <li>
                    <input type="checkbox" class="ingredient-checkbox">
                    <span class="ingredient-amount">${convertedAmount.amount} ${convertedAmount.unit}</span>
                    <span class="ingredient-item">${ingredient.item}</span>
                </li>
            `;
        }).join('');
    }
    
    // Recipe Scaling and Units
    setScale(scale) {
        this.currentScale = scale;
        this.renderIngredients();
        
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scale);
        });
    }
    
    scaleAmount(amount, unit) {
        const nonScalableUnits = ['whole', 'each', 'clove', 'slice'];
        return nonScalableUnits.includes(unit) ? amount : amount * this.currentScale;
    }
    
    toggleUnits() {
        this.isMetric = !this.isMetric;
        document.querySelector('.unit-text').textContent = this.isMetric ? 'Metric' : 'US';
        
        if (this.currentRecipe) {
            this.renderIngredients();
        }
    }
    
    convertUnits(amount, unit) {
        if (this.isMetric) {
            return this.formatAmount(amount, unit);
        }
        
        const conversions = {
            'g': { factor: 0.035274, unit: 'oz' },
            'kg': { factor: 2.20462, unit: 'lbs' },
            'ml': { factor: 0.033814, unit: 'fl oz' },
            'l': { factor: 4.22675, unit: 'cups' },
            '°C': { formula: (c) => Math.round(c * 9/5 + 32), unit: '°F' }
        };
        
        const conversion = conversions[unit];
        if (conversion) {
            if (conversion.formula) {
                return { amount: conversion.formula(amount), unit: conversion.unit };
            } else {
                return this.formatAmount(amount * conversion.factor, conversion.unit);
            }
        }
        
        return this.formatAmount(amount, unit);
    }
    
    formatAmount(amount, unit) {
        let formattedAmount;
        
        if (amount < 0.125) formattedAmount = '⅛';
        else if (amount < 0.25) formattedAmount = '¼';
        else if (amount < 0.375) formattedAmount = '⅓';
        else if (amount < 0.5) formattedAmount = '½';
        else if (amount < 0.625) formattedAmount = '⅝';
        else if (amount < 0.75) formattedAmount = '⅔';
        else if (amount < 0.875) formattedAmount = '¾';
        else if (amount < 1) formattedAmount = '⅞';
        else if (amount % 1 === 0) formattedAmount = amount.toString();
        else if (amount < 10) formattedAmount = amount.toFixed(1);
        else formattedAmount = Math.round(amount).toString();
        
        return { amount: formattedAmount, unit: unit };
    }
    
    // Search and Filter
    handleSearch(query) {
        document.getElementById('searchClear').style.display = query ? 'block' : 'none';
        this.renderRecipes();
        this.updateRecipeCount();
    }
    
    clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchClear').style.display = 'none';
        this.renderRecipes();
        this.updateRecipeCount();
    }
    
    getFilteredRecipes() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        
        return this.recipes.filter(recipe => {
            const matchesSearch = !query || 
                recipe.name.toLowerCase().includes(query) ||
                recipe.ingredients.some(ing => ing.item.toLowerCase().includes(query)) ||
                recipe.instructions.some(inst => inst.toLowerCase().includes(query));
            
            const matchesTags = this.activeFilters.size === 0 ||
                [...this.activeFilters].every(tag => recipe.tags.includes(tag));
            
            return matchesSearch && matchesTags;
        });
    }
    
    renderTagChips() {
        const container = document.getElementById('tagChips');
        container.innerHTML = this.availableTags.map(tag => `
            <div class="tag-chip" data-tag="${tag}">${tag}</div>
        `).join('');
        
        container.querySelectorAll('.tag-chip').forEach(chip => {
            chip.addEventListener('click', () => this.toggleTagFilter(chip.dataset.tag, chip));
        });
    }
    
    toggleTagFilter(tag, chipElement) {
        if (this.activeFilters.has(tag)) {
            this.activeFilters.delete(tag);
            chipElement.classList.remove('active');
        } else {
            this.activeFilters.add(tag);
            chipElement.classList.add('active');
        }
        
        this.renderRecipes();
        this.updateRecipeCount();
    }
    
    updateRecipeCount() {
        const filteredCount = this.getFilteredRecipes().length;
        const total = this.recipes.length;
        const countText = filteredCount === total ? 
            `${total} recipe${total !== 1 ? 's' : ''}` :
            `${filteredCount} of ${total} recipes`;
        
        document.getElementById('recipeCount').textContent = countText;
    }
    
    // Cooking Mode
    showCookingMode() {
        if (!this.currentRecipe) return;
        
        let titleHtml = this.currentRecipe.name;
        if (this.currentRecipe.sourceUrl) {
            titleHtml += `<br><small><a href="${this.currentRecipe.sourceUrl}" target="_blank" rel="noopener noreferrer" class="cooking-source-link">View Original Recipe</a></small>`;
        }
        document.getElementById('cookingTitle').innerHTML = titleHtml;
        
        // Render ingredients for cooking mode
        const ingredientsContainer = document.getElementById('cookingIngredients');
        ingredientsContainer.innerHTML = this.currentRecipe.ingredients.map(ingredient => {
            const scaledAmount = this.scaleAmount(ingredient.amount, ingredient.unit);
            const convertedAmount = this.convertUnits(scaledAmount, ingredient.unit);
            
            return `<li>${convertedAmount.amount} ${convertedAmount.unit} ${ingredient.item}</li>`;
        }).join('');
        
        // Render instructions for cooking mode
        const instructionsContainer = document.getElementById('cookingInstructions');
        instructionsContainer.innerHTML = this.currentRecipe.instructions.map((instruction, index) => `
            <div class="cooking-step">
                <div class="cooking-step-number">Step ${index + 1}</div>
                ${instruction}
            </div>
        `).join('');
        
        this.showView('cookingMode');
        this.requestWakeLock();
    }
    
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake lock request failed:', err);
        }
    }
    
    // Recipe Management
    deleteRecipe() {
        if (!this.currentRecipe) return;
        
        if (confirm('Are you sure you want to delete this recipe?')) {
            this.recipes = this.recipes.filter(r => r.id !== this.currentRecipe.id);
            this.saveRecipes();
            this.showToast('Recipe deleted successfully');
            this.showView('home');
        }
    }
    
    // Add Recipe
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showLoading('Processing recipe photo...');
        
        setTimeout(() => {
            this.hideLoading();
            this.showToast('Photo uploaded! Please review and edit the extracted recipe details below.');
            
            document.getElementById('recipeName').value = 'Recipe from Photo';
            document.getElementById('recipeIngredients').value = 'Please edit the extracted ingredients...';
            document.getElementById('recipeInstructions').value = 'Please edit the extracted instructions...';
        }, 2000);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            document.getElementById('photoInput').files = files;
            this.handlePhotoUpload({ target: { files } });
        }
    }
    
    clearForm() {
        document.getElementById('recipeName').value = '';
        document.getElementById('recipeIngredients').value = '';
        document.getElementById('recipeInstructions').value = '';
        
        document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.parentElement.classList.remove('selected');
        });
    }
    
    saveRecipe() {
        const name = document.getElementById('recipeName').value.trim();
        const ingredientsText = document.getElementById('recipeIngredients').value.trim();
        const instructionsText = document.getElementById('recipeInstructions').value.trim();
        
        if (!name || !ingredientsText || !instructionsText) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const ingredients = this.parseIngredients(ingredientsText);
        const instructions = instructionsText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^\d+\.\s*/, ''));
        
        const selectedTags = [];
        document.querySelectorAll('.tag-checkbox:checked').forEach(checkbox => {
            selectedTags.push(checkbox.value);
        });
        
        const newRecipe = {
            id: this.generateId(),
            name,
            tags: selectedTags,
            ingredients,
            instructions,
            dateAdded: new Date().toISOString()
        };
        
        this.recipes.push(newRecipe);
        this.saveRecipes();
        this.clearForm();
        this.showToast('Recipe saved successfully! 💡 Tip: You can also add recipes by sharing URLs with Claude.');
        this.showView('home');
    }
    
    parseIngredients(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const match = line.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]*)\s+(.+)$/);
                
                if (match) {
                    let amount = match[1];
                    
                    if (amount.includes('/')) {
                        const [whole, fraction] = amount.split(' ');
                        if (fraction && fraction.includes('/')) {
                            const [num, den] = fraction.split('/');
                            amount = (parseFloat(whole || 0) + parseFloat(num) / parseFloat(den)).toString();
                        } else if (amount.includes('/')) {
                            const [num, den] = amount.split('/');
                            amount = (parseFloat(num) / parseFloat(den)).toString();
                        }
                    }
                    
                    return {
                        amount: parseFloat(amount),
                        unit: match[2] || 'whole',
                        item: match[3]
                    };
                }
                
                return {
                    amount: 1,
                    unit: 'whole',
                    item: line
                };
            });
    }
    
    // Utility Functions
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.querySelector('.toast-message').textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => this.hideToast(), 3000);
    }
    
    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Setup tag selector in add recipe form
    const tagSelector = document.getElementById('tagSelector');
    const availableTags = [
        'Bread', 'Pizza', 'BBQ', 'Asian', 'Indian', 'Breakfast', 'Mexican',
        'Desserts', 'Soups', 'Salads', 'Pasta', 'Seafood', 'Vegetarian', 'Grilling',
        'Appetizers', 'Beverages', 'Holiday', 'Quick & Easy', 'Slow Cooker',
        'Chicken', 'Rice', 'One-Pan', 'Dinner', 'Cuban', 'Pork', 'Italian'
    ];
    
    tagSelector.innerHTML = availableTags.map(tag => `
        <label class="tag-checkbox">
            <input type="checkbox" value="${tag}">
            <span>${tag}</span>
        </label>
    `).join('');
    
    tagSelector.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.target.parentElement.classList.toggle('selected', e.target.checked);
        });
    });
    
    // Initialize the app
    const app = new RecipeApp();
    
    // Make app globally accessible for Claude to add recipes
    window.recipeApp = app;
});