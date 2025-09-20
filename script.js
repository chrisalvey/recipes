// Recipe Website JavaScript - Complete Application Logic
class RecipeManager {
    constructor() {
        this.recipes = {};
        this.currentRecipe = null;
        this.currentScale = 1;
        this.useMetric = false;
        this.activeFilters = new Set();
        this.searchTerm = '';
        this.cookingMode = {
            active: false,
            currentStep: 0,
            steps: []
        };
        
        this.init();
    }

    async init() {
        await this.loadRecipes();
        this.initializePage();
        this.setupEventListeners();
    }

    async loadRecipes() {
        try {
            const response = await fetch('recipes.json');
            if (response.ok) {
                this.recipes = await response.json();
            } else {
                console.warn('recipes.json not found, using empty recipe collection');
                this.recipes = {};
            }
        } catch (error) {
            console.warn('Could not load recipes.json:', error);
            this.recipes = {};
        }
    }

    initializePage() {
        const path = window.location.pathname;
        const isRecipePage = path.includes('recipe.html');
        
        if (isRecipePage) {
            this.initializeRecipePage();
        } else {
            this.initializeIndexPage();
        }
    }

    initializeIndexPage() {
        this.renderRecipeGrid();
        this.renderFilterChips();
        this.updateStats();
        this.hideLoading();
    }

    initializeRecipePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('id');
        
        if (recipeId && this.recipes[recipeId]) {
            this.currentRecipe = this.recipes[recipeId];
            this.renderRecipe();
        } else {
            this.showRecipeNotFound();
        }
        this.hideLoading();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndRenderRecipes();
                this.toggleSearchClear();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.cookingMode.active) {
                    this.toggleCookingMode();
                } else {
                    this.hideAddRecipeModal();
                }
            }
            
            if (this.cookingMode.active) {
                if (e.key === 'ArrowLeft') this.previousCookingStep();
                if (e.key === 'ArrowRight') this.nextCookingStep();
                if (e.key === ' ') {
                    e.preventDefault();
                    this.nextCookingStep();
                }
            }
        });
    }

    // Recipe Grid Rendering
    renderRecipeGrid() {
        const grid = document.getElementById('recipe-grid');
        if (!grid) return;

        const recipeArray = Object.entries(this.recipes);
        
        if (recipeArray.length === 0) {
            this.showEmptyState();
            return;
        }

        grid.innerHTML = recipeArray.map(([id, recipe]) => this.createRecipeCard(id, recipe)).join('');
    }

    createRecipeCard(id, recipe) {
        const primaryTag = recipe.tags?.[0] || '';
        const otherTags = recipe.tags?.slice(1) || [];
        const dateAdded = recipe.dateAdded ? new Date(recipe.dateAdded).toLocaleDateString() : '';

        return `
            <div class="recipe-card" onclick="navigateToRecipe('${id}')">
                <div class="recipe-card-content">
                    <h3 class="recipe-card-title">${recipe.name}</h3>
                    <div class="recipe-card-meta">
                        <span>⏱️ ${recipe.totalTime || 'N/A'}</span>
                        <span>🍽️ ${recipe.yield || 'N/A'}</span>
                    </div>
                    <div class="recipe-card-tags">
                        ${primaryTag ? `<span class="recipe-tag primary-tag">${primaryTag}</span>` : ''}
                        ${otherTags.map(tag => `<span class="recipe-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Filtering and Search
    renderFilterChips() {
        const container = document.getElementById('filter-chips');
        if (!container) return;

        const allTags = new Set();
        Object.values(this.recipes).forEach(recipe => {
            recipe.tags?.forEach(tag => allTags.add(tag));
        });

        container.innerHTML = Array.from(allTags)
            .sort()
            .map(tag => `
                <button class="filter-chip ${this.activeFilters.has(tag) ? 'active' : ''}" 
                        onclick="recipeManager.toggleFilter('${tag}')">
                    ${tag}
                </button>
            `).join('');
    }

    toggleFilter(tag) {
        if (this.activeFilters.has(tag)) {
            this.activeFilters.delete(tag);
        } else {
            this.activeFilters.add(tag);
        }
        
        this.filterAndRenderRecipes();
        this.renderFilterChips();
        this.toggleFilterClear();
    }

    filterAndRenderRecipes() {
        const grid = document.getElementById('recipe-grid');
        const emptyState = document.getElementById('empty-state');
        if (!grid) return;

        const filteredRecipes = Object.entries(this.recipes).filter(([id, recipe]) => {
            const matchesSearch = !this.searchTerm || 
                recipe.name.toLowerCase().includes(this.searchTerm) ||
                recipe.tags?.some(tag => tag.toLowerCase().includes(this.searchTerm));
            
            const matchesFilters = this.activeFilters.size === 0 ||
                recipe.tags?.some(tag => this.activeFilters.has(tag));
            
            return matchesSearch && matchesFilters;
        });

        if (filteredRecipes.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            grid.style.display = 'grid';
            emptyState.style.display = 'none';
            grid.innerHTML = filteredRecipes.map(([id, recipe]) => this.createRecipeCard(id, recipe)).join('');
        }

        this.updateStats(filteredRecipes.length);
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            this.searchTerm = '';
            this.filterAndRenderRecipes();
            this.toggleSearchClear();
        }
    }

    clearFilters() {
        this.activeFilters.clear();
        this.filterAndRenderRecipes();
        this.renderFilterChips();
        this.toggleFilterClear();
    }

    toggleSearchClear() {
        const clearBtn = document.querySelector('.search-clear');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }

    toggleFilterClear() {
        const clearBtn = document.querySelector('.filter-clear');
        if (clearBtn) {
            clearBtn.style.display = this.activeFilters.size > 0 ? 'block' : 'none';
        }
    }

    // Stats
    updateStats(filteredCount = null) {
        const totalRecipes = document.getElementById('total-recipes');
        const totalTags = document.getElementById('total-tags');
        
        if (totalRecipes) {
            const count = filteredCount !== null ? filteredCount : Object.keys(this.recipes).length;
            totalRecipes.textContent = count;
        }
        
        if (totalTags) {
            const allTags = new Set();
            Object.values(this.recipes).forEach(recipe => {
                recipe.tags?.forEach(tag => allTags.add(tag));
            });
            totalTags.textContent = allTags.size;
        }
    }

    // Recipe Page Rendering
    renderRecipe() {
        if (!this.currentRecipe) return;

        document.getElementById('page-title').textContent = this.currentRecipe.name;
        document.getElementById('recipe-title').textContent = this.currentRecipe.name;
        
        this.renderRecipeMeta();
        this.renderIngredients();
        this.renderInstructions();
        this.renderNotes();
        this.setupCookingModeSteps();
    }

    renderRecipeMeta() {
        const recipe = this.currentRecipe;
        
        // Tags
        const tagsContainer = document.getElementById('recipe-tags');
        if (tagsContainer && recipe.tags) {
            tagsContainer.innerHTML = recipe.tags.map(tag => 
                `<span class="recipe-tag">${tag}</span>`
            ).join('');
        }

        // Stats
        document.getElementById('total-time').textContent = recipe.totalTime || 'N/A';
        document.getElementById('recipe-yield').textContent = recipe.yield || 'N/A';
        
        const dateAdded = document.getElementById('date-added');
        if (dateAdded && recipe.dateAdded) {
            dateAdded.textContent = new Date(recipe.dateAdded).toLocaleDateString();
        }
    }

    renderIngredients() {
        const container = document.getElementById('ingredients-container');
        if (!container || !this.currentRecipe.ingredients) return;

        container.innerHTML = this.currentRecipe.ingredients.map((group, groupIndex) => {
            const groupTitle = group.groupName ? 
                `<h4 class="ingredient-group-title">${group.groupName}</h4>` : '';
            
            const ingredients = group.items.map((item, itemIndex) => {
                const scaledAmount = this.scaleAmount(item.amount);
                const displayUnit = this.convertUnit(item.unit, scaledAmount);
                
                return `
                    <div class="ingredient-item" onclick="toggleIngredientCheck(this)">
                        <div class="ingredient-checkbox"></div>
                        <span class="ingredient-amount">${this.formatAmount(scaledAmount)}</span>
                        <span class="ingredient-unit">${displayUnit}</span>
                        <span class="ingredient-name">${item.item}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="ingredient-group">
                    ${groupTitle}
                    <div class="ingredient-list">
                        ${ingredients}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderInstructions() {
        const container = document.getElementById('instructions-container');
        if (!container || !this.currentRecipe.instructions) return;

        let stepCounter = 0;
        
        container.innerHTML = this.currentRecipe.instructions.map(group => {
            const timeHeader = group.timeHeader ? 
                `<h4 class="instruction-time-header">${group.timeHeader}</h4>` : '';
            
            const steps = group.steps.map(step => {
                stepCounter++;
                const timeDisplay = step.time ? 
                    `<div class="step-time">${step.time}</div>` : '';
                
                return `
                    <div class="instruction-step" onclick="toggleStepCompletion(this)">
                        <div class="step-number">${stepCounter}</div>
                        <div class="step-content">
                            ${timeDisplay}
                            <div class="step-text">${step.text}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="instruction-group">
                    ${timeHeader}
                    <div class="instruction-steps">
                        ${steps}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderNotes() {
        const section = document.getElementById('notes-section');
        const container = document.getElementById('notes-container');
        
        if (!section || !container) return;

        if (this.currentRecipe.notes && this.currentRecipe.notes.length > 0) {
            section.style.display = 'block';
            container.innerHTML = this.currentRecipe.notes.map(note => 
                `<div class="note-item">${note}</div>`
            ).join('');
        } else {
            section.style.display = 'none';
        }
    }

    // Scaling and Unit Conversion
    scaleRecipe(factor) {
        this.currentScale = parseFloat(factor);
        this.renderIngredients();
        this.updateScaleButtons();
    }

    updateScaleButtons() {
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="scaleRecipe(${this.currentScale})"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        const customInput = document.querySelector('.custom-scale');
        if (customInput && ![0.5, 1, 1.5, 2].includes(this.currentScale)) {
            customInput.value = this.currentScale;
        }
    }

    scaleAmount(amount) {
        if (typeof amount !== 'number') return amount;
        return amount * this.currentScale;
    }

    toggleUnits() {
        this.useMetric = !this.useMetric;
        this.renderIngredients();
    }

    convertUnit(unit, amount) {
        if (!this.useMetric || !unit) return unit;

        const conversions = {
            'cups': () => amount >= 1 ? `${(amount * 240).toFixed(0)}ml` : `${(amount * 240).toFixed(0)}ml`,
            'cup': () => amount >= 1 ? `${(amount * 240).toFixed(0)}ml` : `${(amount * 240).toFixed(0)}ml`,
            'tablespoons': () => `${(amount * 15).toFixed(0)}ml`,
            'tablespoon': () => `${(amount * 15).toFixed(0)}ml`,
            'tbsp': () => `${(amount * 15).toFixed(0)}ml`,
            'teaspoons': () => `${(amount * 5).toFixed(0)}ml`,
            'teaspoon': () => `${(amount * 5).toFixed(0)}ml`,
            'tsp': () => `${(amount * 5).toFixed(0)}ml`,
            'ounces': () => `${(amount * 28.35).toFixed(0)}g`,
            'ounce': () => `${(amount * 28.35).toFixed(0)}g`,
            'oz': () => `${(amount * 28.35).toFixed(0)}g`,
            'pounds': () => amount >= 1 ? `${(amount * 0.454).toFixed(1)}kg` : `${(amount * 454).toFixed(0)}g`,
            'pound': () => amount >= 1 ? `${(amount * 0.454).toFixed(1)}kg` : `${(amount * 454).toFixed(0)}g`,
            'lb': () => amount >= 1 ? `${(amount * 0.454).toFixed(1)}kg` : `${(amount * 454).toFixed(0)}g`,
            'lbs': () => amount >= 1 ? `${(amount * 0.454).toFixed(1)}kg` : `${(amount * 454).toFixed(0)}g`,
            'fahrenheit': () => `${Math.round((amount - 32) * 5/9)}°C`,
            '°f': () => `${Math.round((amount - 32) * 5/9)}°C`,
            'f': () => `${Math.round((amount - 32) * 5/9)}°C`
        };

        const unitLower = unit.toLowerCase();
        return conversions[unitLower] ? conversions[unitLower]() : unit;
    }

    formatAmount(amount) {
        if (typeof amount !== 'number') return amount;
        
        // Handle fractions for common amounts
        const fractions = {
            0.125: '⅛', 0.25: '¼', 0.333: '⅓', 0.5: '½', 
            0.667: '⅔', 0.75: '¾', 1.5: '1½', 2.5: '2½'
        };
        
        // Check for exact fraction matches
        for (const [decimal, fraction] of Object.entries(fractions)) {
            if (Math.abs(amount - parseFloat(decimal)) < 0.01) {
                return fraction;
            }
        }
        
        // Handle mixed numbers
        if (amount > 1) {
            const whole = Math.floor(amount);
            const decimal = amount - whole;
            
            for (const [dec, frac] of Object.entries(fractions)) {
                if (Math.abs(decimal - parseFloat(dec)) < 0.01) {
                    return whole + frac.slice(1); // Remove the "1" from fractions like "1½"
                }
            }
        }
        
        // Default formatting
        return amount % 1 === 0 ? amount.toString() : amount.toFixed(2).replace(/\.?0+$/, '');
    }

    // Cooking Mode
    setupCookingModeSteps() {
        this.cookingMode.steps = [];
        
        if (!this.currentRecipe.instructions) return;

        this.currentRecipe.instructions.forEach(group => {
            group.steps.forEach((step, index) => {
                this.cookingMode.steps.push({
                    timeHeader: group.timeHeader,
                    time: step.time,
                    text: step.text,
                    stepNumber: this.cookingMode.steps.length + 1
                });
            });
        });
    }

    toggleCookingMode() {
        const overlay = document.getElementById('cooking-mode-overlay');
        const btn = document.getElementById('cooking-mode-btn');
        
        if (!overlay || !btn) return;

        this.cookingMode.active = !this.cookingMode.active;
        
        if (this.cookingMode.active) {
            overlay.classList.add('active');
            btn.classList.add('active');
            this.cookingMode.currentStep = 0;
            this.renderCurrentCookingStep();
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('active');
            btn.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    renderCurrentCookingStep() {
        const currentStepEl = document.getElementById('current-cooking-step');
        const progressEl = document.getElementById('cooking-progress');
        const progressTextEl = document.getElementById('progress-text');
        const prevBtn = document.getElementById('prev-step-btn');
        const nextBtn = document.getElementById('next-step-btn');
        
        if (!currentStepEl || this.cookingMode.steps.length === 0) return;

        const step = this.cookingMode.steps[this.cookingMode.currentStep];
        const progress = ((this.cookingMode.currentStep + 1) / this.cookingMode.steps.length) * 100;

        currentStepEl.innerHTML = `
            <div class="cooking-step-number">Step ${step.stepNumber}</div>
            ${step.time ? `<div class="cooking-step-time">${step.time}</div>` : ''}
            <div class="cooking-step-text">${step.text}</div>
        `;

        if (progressEl) progressEl.style.width = `${progress}%`;
        if (progressTextEl) progressTextEl.textContent = `Step ${this.cookingMode.currentStep + 1} of ${this.cookingMode.steps.length}`;
        
        if (prevBtn) prevBtn.disabled = this.cookingMode.currentStep === 0;
        if (nextBtn) {
            nextBtn.disabled = this.cookingMode.currentStep === this.cookingMode.steps.length - 1;
            nextBtn.textContent = this.cookingMode.currentStep === this.cookingMode.steps.length - 1 ? 'Complete' : 'Next';
        }
    }

    nextCookingStep() {
        if (this.cookingMode.currentStep < this.cookingMode.steps.length - 1) {
            this.cookingMode.currentStep++;
            this.renderCurrentCookingStep();
        } else {
            this.toggleCookingMode();
        }
    }

    previousCookingStep() {
        if (this.cookingMode.currentStep > 0) {
            this.cookingMode.currentStep--;
            this.renderCurrentCookingStep();
        }
    }

    // Modal Management
    showAddRecipeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideAddRecipeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.clearImageUpload();
        }
    }

    // Image Upload Handling
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('upload-preview');
            const uploadZone = document.getElementById('upload-zone');
            const previewImage = document.getElementById('preview-image');
            
            if (preview && uploadZone && previewImage) {
                previewImage.src = e.target.result;
                uploadZone.style.display = 'none';
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    clearImageUpload() {
        const preview = document.getElementById('upload-preview');
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('recipe-image');
        
        if (preview && uploadZone && fileInput) {
            preview.style.display = 'none';
            uploadZone.style.display = 'block';
            fileInput.value = '';
        }
    }

    processRecipeImage() {
        // This would integrate with Claude or another AI service
        // For now, show instructions to user
        alert(`To add this recipe:

1. Upload this image to Claude
2. Ask: "Extract this recipe and format as JSON for my recipe website"
3. Copy the JSON object Claude provides
4. Add it to your recipes.json file
5. Refresh the page

The recipe will appear automatically!`);
        
        this.hideAddRecipeModal();
    }

    // Manual Recipe Entry
    addManualRecipe(event) {
        event.preventDefault();
        const form = event.target;
        const name = form.querySelector('input[placeholder="Recipe name"]').value;
        const tags = form.querySelector('input[placeholder="Tags (comma separated)"]').value;
        
        const recipeId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const newRecipe = {
            id: recipeId,
            name: name,
            tags: tagsArray,
            totalTime: "",
            yield: "",
            dateAdded: Date.now(),
            ingredients: [{
                groupName: null,
                items: [
                    { amount: "", unit: "", item: "Add ingredients here" }
                ]
            }],
            instructions: [{
                timeHeader: null,
                steps: [
                    { time: null, text: "Add instructions here" }
                ]
            }],
            notes: []
        };
        
        // Show JSON for user to copy
        const jsonOutput = JSON.stringify({ [recipeId]: newRecipe }, null, 2);
        
        const textarea = document.createElement('textarea');
        textarea.value = `Add this to your recipes.json file:\n\n${jsonOutput}`;
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';
        
        const container = document.createElement('div');
        container.innerHTML = '<h4>Copy this JSON to recipes.json:</h4>';
        container.appendChild(textarea);
        
        // Replace modal content temporarily
        const modalContent = document.querySelector('.modal-content');
        const originalContent = modalContent.innerHTML;
        modalContent.innerHTML = '';
        modalContent.appendChild(container);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'primary-btn';
        closeBtn.style.marginTop = '1rem';
        closeBtn.onclick = () => {
            modalContent.innerHTML = originalContent;
            this.hideAddRecipeModal();
        };
        container.appendChild(closeBtn);
        
        textarea.select();
    }

    // Utility Functions
    showEmptyState() {
        const grid = document.getElementById('recipe-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (grid && emptyState) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <div class="empty-icon">👨‍🍳</div>
                <h3>No recipes yet</h3>
                <p>Start building your collection by adding your first recipe!</p>
                <button class="primary-btn" onclick="showAddRecipeModal()">Add Recipe</button>
            `;
        }
    }

    showRecipeNotFound() {
        const notFound = document.getElementById('recipe-not-found');
        const content = document.querySelector('.recipe-content');
        
        if (notFound && content) {
            notFound.style.display = 'block';
            content.style.display = 'none';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading-state');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // Recipe Actions
    printRecipe() {
        window.print();
    }

    shareRecipe() {
        if (navigator.share && this.currentRecipe) {
            navigator.share({
                title: this.currentRecipe.name,
                text: `Check out this recipe: ${this.currentRecipe.name}`,
                url: window.location.href
            });
        } else {
            // Fallback to copying URL
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Recipe URL copied to clipboard!');
            });
        }
    }
}

// Global Functions (called from HTML)
function navigateToRecipe(recipeId) {
    window.location.href = `recipe.html?id=${recipeId}`;
}

function showAddRecipeModal() {
    if (window.recipeManager) {
        window.recipeManager.showAddRecipeModal();
    }
}

function hideAddRecipeModal() {
    if (window.recipeManager) {
        window.recipeManager.hideAddRecipeModal();
    }
}

function handleImageUpload(event) {
    if (window.recipeManager) {
        window.recipeManager.handleImageUpload(event);
    }
}

function clearImageUpload() {
    if (window.recipeManager) {
        window.recipeManager.clearImageUpload();
    }
}

function processRecipeImage() {
    if (window.recipeManager) {
        window.recipeManager.processRecipeImage();
    }
}

function addManualRecipe(event) {
    if (window.recipeManager) {
        window.recipeManager.addManualRecipe(event);
    }
}

function clearSearch() {
    if (window.recipeManager) {
        window.recipeManager.clearSearch();
    }
}

function clearFilters() {
    if (window.recipeManager) {
        window.recipeManager.clearFilters();
    }
}

function scaleRecipe(factor) {
    if (window.recipeManager) {
        window.recipeManager.scaleRecipe(factor);
    }
}

function toggleUnits() {
    if (window.recipeManager) {
        window.recipeManager.toggleUnits();
    }
}

function toggleCookingMode() {
    if (window.recipeManager) {
        window.recipeManager.toggleCookingMode();
    }
}

function nextCookingStep() {
    if (window.recipeManager) {
        window.recipeManager.nextCookingStep();
    }
}

function previousCookingStep() {
    if (window.recipeManager) {
        window.recipeManager.previousCookingStep();
    }
}

function printRecipe() {
    if (window.recipeManager) {
        window.recipeManager.printRecipe();
    }
}

function shareRecipe() {
    if (window.recipeManager) {
        window.recipeManager.shareRecipe();
    }
}

function toggleIngredientCheck(element) {
    const checkbox = element.querySelector('.ingredient-checkbox');
    if (checkbox) {
        checkbox.classList.toggle('checked');
        element.classList.toggle('checked');
    }
}

function toggleStepCompletion(element) {
    element.classList.toggle('completed');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.recipeManager = new RecipeManager();
});

// Service Worker Registration (for offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}