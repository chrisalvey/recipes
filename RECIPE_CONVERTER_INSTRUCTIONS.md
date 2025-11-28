# Recipe Converter Project - Instructions for Claude Code

Copy the text below and paste it into a new Claude Code chat/project:

---

Create a simple recipe converter web app:

1. Single HTML page with:
   - Text area for pasting recipe text
   - File upload for recipe images
   - "Convert to JSON-LD" button
   - Output area showing the converted JSON
   - "Download JSON" button

2. Convert recipes to schema.org/Recipe JSON-LD format with these fields:
   - @context: "https://schema.org"
   - @type: "Recipe"
   - name (required)
   - recipeIngredient (array of strings, required)
   - recipeInstructions (string, required)
   - description, prepTime, cookTime, totalTime, recipeYield, image, source, sourceUrl (all optional)

3. Time format: ISO 8601 duration (e.g., "PT15M" for 15 minutes, "PT1H30M" for 1.5 hours)

4. Support batch mode: convert multiple recipes into a JSON array

5. Use Claude API (via prompt engineering) to extract recipe data from text/images

Keep it simple - no framework needed, just HTML/CSS/vanilla JavaScript.

---

## Reference Examples

See these files for the expected JSON format:
- example-recipe.json (single recipe)
- example-batch-import.json (multiple recipes)

## Key Requirements

**Required fields:**
- name
- recipeIngredient (must be an array)
- recipeInstructions (can be a string)

**Time format examples:**
- 15 minutes → "PT15M"
- 1 hour 30 minutes → "PT1H30M"
- 45 minutes → "PT45M"

**Format notes:**
- Ingredients: must be array ["2 cups flour", "1 egg"]
- Instructions: can be string with \n\n for new paragraphs
