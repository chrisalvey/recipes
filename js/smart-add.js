// Smart Add - Intelligent recipe text parsing

let smartParsedRecipe = null;
let smartUploadedImages = [];

// Initialize Smart Add when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const smartText = document.getElementById('smart-text');
    const smartParseBtn = document.getElementById('smart-parse-btn');
    const smartSaveBtn = document.getElementById('smart-save-btn');
    const smartClearBtn = document.getElementById('smart-clear-btn');
    const smartDropZone = document.getElementById('smart-drop-zone');
    const smartImageUpload = document.getElementById('smart-image-upload');
    const smartFileList = document.getElementById('smart-file-list');
    const smartImagePreviews = document.getElementById('smart-image-previews');

    if (!smartParseBtn) return; // Exit if Smart Add view doesn't exist yet

    // Parse button
    smartParseBtn.addEventListener('click', () => {
        parseSmartRecipe();
    });

    // Save button
    smartSaveBtn.addEventListener('click', async () => {
        if (smartParsedRecipe) {
            await saveSmartRecipe();
        }
    });

    // Clear button
    smartClearBtn.addEventListener('click', () => {
        clearSmartAdd();
    });

    // Image upload handling
    smartDropZone.addEventListener('click', () => smartImageUpload.click());

    smartDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        smartDropZone.style.borderColor = '#3498db';
        smartDropZone.style.background = '#f0f7ff';
    });

    smartDropZone.addEventListener('dragleave', () => {
        smartDropZone.style.borderColor = '';
        smartDropZone.style.background = '';
    });

    smartDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        smartDropZone.style.borderColor = '';
        smartDropZone.style.background = '';
        handleSmartFiles(e.dataTransfer.files);
    });

    smartImageUpload.addEventListener('change', (e) => {
        handleSmartFiles(e.target.files);
    });

    function handleSmartFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    smartUploadedImages.push({
                        name: file.name,
                        data: e.target.result
                    });
                    updateSmartFileList();
                };
                reader.readAsDataURL(file);
            }
        }
    }

    function updateSmartFileList() {
        if (smartUploadedImages.length > 0) {
            smartDropZone.classList.add('has-files');
            smartFileList.textContent = `${smartUploadedImages.length} image(s) selected`;

            smartImagePreviews.innerHTML = '';
            smartUploadedImages.forEach((img) => {
                const imgEl = document.createElement('img');
                imgEl.src = img.data;
                imgEl.className = 'image-preview';
                imgEl.style.width = '80px';
                imgEl.style.height = '80px';
                imgEl.style.objectFit = 'cover';
                imgEl.style.borderRadius = '4px';
                imgEl.style.border = '1px solid #ddd';
                smartImagePreviews.appendChild(imgEl);
            });
        } else {
            smartDropZone.classList.remove('has-files');
            smartFileList.textContent = '';
            smartImagePreviews.innerHTML = '';
        }
    }
});

// Parse recipe from text or images
async function parseSmartRecipe() {
    const text = document.getElementById('smart-text').value.trim();

    if (!text && smartUploadedImages.length === 0) {
        showSmartStatus('error', 'Please paste recipe text or upload an image');
        return;
    }

    // If there are images, use Claude API to extract recipe from image
    if (smartUploadedImages.length > 0) {
        await parseRecipeFromImage(text);
        return;
    }

    // Otherwise, parse text directly
    showSmartStatus('loading', 'Parsing recipe...');

    try {
        const parsed = parseRecipeText(text);
        smartParsedRecipe = parsed;

        // Show preview
        displaySmartPreview(parsed);

        document.getElementById('smart-save-btn').style.display = 'inline-block';
        showSmartStatus('success', 'Recipe parsed! Review below and click "Save to Collection"');
    } catch (error) {
        console.error('Parse error:', error);
        showSmartStatus('error', 'Could not parse recipe. Please check the format and try again.');
    }
}

// Parse recipe from image using Claude API
async function parseRecipeFromImage(additionalText) {
    showSmartStatus('loading', 'Extracting recipe from image with AI...');
    document.getElementById('smart-parse-btn').disabled = true;

    try {
        // Get API key from localStorage
        let CLAUDE_API_KEY = localStorage.getItem('claudeApiKey');

        // If no key, prompt user to enter it
        if (!CLAUDE_API_KEY) {
            CLAUDE_API_KEY = prompt('Enter your Claude API key:\n\n(Get one from https://console.anthropic.com/settings/keys)\n\nYour key will be saved securely in your browser.');

            if (!CLAUDE_API_KEY) {
                showSmartStatus('error', 'API key required for image parsing');
                document.getElementById('smart-parse-btn').disabled = false;
                return;
            }

            // Save to localStorage
            localStorage.setItem('claudeApiKey', CLAUDE_API_KEY);
            showSmartStatus('success', 'API key saved! Processing image...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const content = [];

        // Add images
        for (const img of smartUploadedImages) {
            const base64Data = img.data.split(',')[1]; // Remove data:image/...;base64, prefix
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        // Add text prompt
        let prompt = 'Extract the recipe from the image(s) and return it as a JSON object with these exact fields:\n\n';
        prompt += '{\n';
        prompt += '  "name": "recipe name",\n';
        prompt += '  "description": "brief description (optional)",\n';
        prompt += '  "recipeIngredient": ["ingredient 1", "ingredient 2", ...],\n';
        prompt += '  "recipeInstructions": "step by step instructions as a single string",\n';
        prompt += '  "prepTime": "PT15M" (ISO 8601 format, optional),\n';
        prompt += '  "cookTime": "PT30M" (ISO 8601 format, optional),\n';
        prompt += '  "recipeYield": "4 servings" (optional),\n';
        prompt += '  "recipeTags": ["tag1", "tag2", ...] (optional, categorize recipe like bread, italian, etc.),\n';
        prompt += '  "source": "source name" (optional)\n';
        prompt += '}\n\n';
        prompt += 'Return ONLY the JSON object, no markdown formatting or explanation.';

        if (additionalText) {
            prompt += '\n\nAdditional context: ' + additionalText;
        }

        content.push({ type: 'text', text: prompt });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                messages: [
                    { role: 'user', content: content }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        let responseText = data.content[0].text;

        // Clean up response
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(responseText);
        smartParsedRecipe = parsed;

        // Show preview
        displaySmartPreview(parsed);

        document.getElementById('smart-save-btn').style.display = 'inline-block';
        showSmartStatus('success', 'Recipe extracted from image! Review below and click "Save to Collection"');
    } catch (error) {
        console.error('Image parse error:', error);
        showSmartStatus('error', 'Failed to extract recipe from image: ' + error.message);
    } finally {
        document.getElementById('smart-parse-btn').disabled = false;
    }
}

// Parse recipe text using pattern matching
function parseRecipeText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const recipe = {
        name: '',
        description: '',
        recipeIngredient: [],
        recipeInstructions: '',
        prepTime: null,
        cookTime: null,
        totalTime: null,
        recipeYield: '',
        source: '',
        sourceUrl: '',
        recipeTags: []
    };

    let currentSection = 'header';
    let instructionsLines = [];

    // Extract name (usually first non-empty line or line with title-like format)
    if (lines.length > 0) {
        recipe.name = lines[0].replace(/^#+\s*/, ''); // Remove markdown headers if present
    }

    // Helper function to check if a line looks like an ingredient
    function looksLikeIngredient(line) {
        // Ingredients often start with numbers, fractions, or bullet points
        return line.match(/^[-•*\d⅛⅙⅕¼⅓⅜⅖½⅗⅝⅔¾⅘⅚⅞]\s*/);
    }

    // Helper function to check if a line looks like an instruction step
    function looksLikeInstruction(line) {
        // Instructions often start with action verbs or numbers
        const actionVerbs = /^(add|mix|stir|bake|cook|heat|boil|fry|saute|chop|dice|slice|preheat|pour|combine|whisk|blend|season|serve|place|remove|set|bring|reduce|increase|cover|uncover|let|allow|transfer|drain|rinse|wash|peel|cut|melt|simmer|roast|grill|broil|spread|sprinkle|garnish|fold|knead|roll|shape|form|refrigerate|chill|freeze|\d+\.?)/i;
        return actionVerbs.test(line);
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Extract times and servings from descriptive lines
        if (i < 5) { // Check first few lines for metadata
            const prepMatch = line.match(/prep(?:\s+time)?:\s*(\d+)\s*(min|minute|minutes|hour|hours|hr|hrs)/i);
            if (prepMatch) {
                const amount = parseInt(prepMatch[1]);
                const unit = prepMatch[2].toLowerCase();
                recipe.prepTime = unit.startsWith('h') ? `PT${amount}H` : `PT${amount}M`;
            }

            const cookMatch = line.match(/cook(?:\s+time)?:\s*(\d+)\s*(min|minute|minutes|hour|hours|hr|hrs)/i);
            if (cookMatch) {
                const amount = parseInt(cookMatch[1]);
                const unit = cookMatch[2].toLowerCase();
                recipe.cookTime = unit.startsWith('h') ? `PT${amount}H` : `PT${amount}M`;
            }

            const servesMatch = line.match(/(?:serves|servings|yield|makes):\s*(.+)/i);
            if (servesMatch) {
                recipe.recipeYield = servesMatch[1].trim();
            }
        }

        // Detect section headers
        if (lowerLine.match(/^ingredients?:?$/)) {
            currentSection = 'ingredients';
            continue;
        } else if (lowerLine.match(/^(?:instructions?|directions?|steps?|method):?$/)) {
            currentSection = 'instructions';
            continue;
        } else if (lowerLine.match(/^(?:source|from|recipe\s+from):?$/)) {
            currentSection = 'source';
            continue;
        } else if (lowerLine.match(/^(?:tags?|categories?):?$/)) {
            currentSection = 'tags';
            continue;
        }

        // Smart section detection if no explicit headers found
        if (currentSection === 'header' && i > 2) {
            // After the header section, try to intelligently detect ingredients vs instructions
            if (looksLikeIngredient(line) && recipe.recipeIngredient.length === 0) {
                currentSection = 'ingredients';
            } else if (looksLikeInstruction(line) && recipe.recipeIngredient.length > 0 && instructionsLines.length === 0) {
                currentSection = 'instructions';
            }
        }

        // Add content to appropriate section
        if (currentSection === 'ingredients') {
            // Clean up ingredient line
            let ingredient = line.replace(/^[-•*]\s*/, '').trim();
            if (ingredient) {
                recipe.recipeIngredient.push(ingredient);
            }
        } else if (currentSection === 'instructions') {
            instructionsLines.push(line);
        } else if (currentSection === 'source') {
            recipe.source = line;
            // Check if it's a URL
            if (line.match(/^https?:\/\//)) {
                recipe.sourceUrl = line;
            }
        } else if (currentSection === 'tags') {
            // Parse tags - can be comma-separated or on separate lines
            const tagsList = line.replace(/^[-•*]\s*/, '').split(',').map(t => t.trim().toLowerCase()).filter(t => t);
            recipe.recipeTags.push(...tagsList);
        } else if (currentSection === 'header' && i > 0 && !line.match(/prep|cook|serves|yield|makes/i)) {
            // This might be a description
            if (!recipe.description && line.length > 10) {
                recipe.description = line;
            }
        }
    }

    // Join instructions
    recipe.recipeInstructions = instructionsLines.join('\n\n');

    // Validation with helpful messages
    if (!recipe.name) {
        throw new Error('Could not find recipe name. Make sure the recipe title is on the first line.');
    }
    if (recipe.recipeIngredient.length === 0) {
        throw new Error('Could not find ingredients. Try adding an "Ingredients:" line, or start each ingredient with a number, dash (-), or bullet (•).');
    }
    if (!recipe.recipeInstructions) {
        throw new Error('Could not find instructions. Try adding an "Instructions:" line before the cooking steps.');
    }

    return recipe;
}

// Display preview of parsed recipe
function displaySmartPreview(recipe) {
    const preview = document.getElementById('smart-preview');
    const content = document.getElementById('smart-preview-content');

    let html = `
        <h4>${escapeHtml(recipe.name)}</h4>
        ${recipe.description ? `<p><em>${escapeHtml(recipe.description)}</em></p>` : ''}

        <div class="recipe-meta">
            ${recipe.prepTime ? `<span>Prep: ${formatDuration(recipe.prepTime)}</span>` : ''}
            ${recipe.cookTime ? `<span>Cook: ${formatDuration(recipe.cookTime)}</span>` : ''}
            ${recipe.recipeYield ? `<span>Yield: ${escapeHtml(recipe.recipeYield)}</span>` : ''}
        </div>

        <h5>Ingredients (${recipe.recipeIngredient.length})</h5>
        <ul>
            ${recipe.recipeIngredient.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
        </ul>

        <h5>Instructions</h5>
        <p style="white-space: pre-wrap;">${escapeHtml(recipe.recipeInstructions)}</p>

        ${recipe.source ? `<p><small>Source: ${escapeHtml(recipe.source)}</small></p>` : ''}
    `;

    content.innerHTML = html;
    preview.style.display = 'block';
}

// Format ISO 8601 duration for display
function formatDuration(duration) {
    if (!duration) return '';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ');
}

// Save parsed recipe to Firebase
async function saveSmartRecipe() {
    if (!isAuthenticated()) {
        showSmartStatus('error', 'Please sign in to save recipes');
        return;
    }

    if (!smartParsedRecipe) {
        showSmartStatus('error', 'No recipe to save');
        return;
    }

    try {
        showSmartStatus('loading', 'Saving recipe...');
        document.getElementById('smart-save-btn').disabled = true;

        await addRecipe(smartParsedRecipe);

        showSmartStatus('success', 'Recipe saved! Redirecting to browse...');

        // Clear and go back to browse after a moment
        setTimeout(() => {
            clearSmartAdd();
            showView('browse-view');
            setActiveNav('nav-browse');
        }, 1500);
    } catch (error) {
        console.error('Error saving recipe:', error);
        showSmartStatus('error', 'Failed to save recipe: ' + error.message);
        document.getElementById('smart-save-btn').disabled = false;
    }
}

// Clear Smart Add form
function clearSmartAdd() {
    document.getElementById('smart-text').value = '';
    document.getElementById('smart-save-btn').style.display = 'none';
    document.getElementById('smart-preview').style.display = 'none';
    smartParsedRecipe = null;
    smartUploadedImages = [];
    updateSmartFileList();
    showSmartStatus('', '');
}

// Show status message
function showSmartStatus(type, message) {
    const status = document.getElementById('smart-status');
    status.className = 'status-message';

    if (type) {
        status.classList.add(type);
        status.textContent = message;
        status.style.display = 'block';
    } else {
        status.style.display = 'none';
    }
}

// Escape HTML (use existing function if available, otherwise define it)
if (typeof escapeHtml !== 'function') {
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
