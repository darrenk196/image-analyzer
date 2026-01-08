<script lang="ts">
  import { imageStore } from "$lib/stores/imageStore";
  import {
    extractDominantColors,
    posterizeImage,
    rgbToHex,
    mapColorsToPalette,
  } from "$lib/utils/imageProcessing";
  import { palettes, paletteCategories } from "$lib/utils/palettes";
  import { debounce } from "$lib/utils/timing";

  let isProcessing = false;
  let pendingUpdate = false;

  // Debounced color extraction - runs after user stops changing sliders
  const debouncedExtractColors = debounce(async () => {
    if (!$imageStore.current) return;

    isProcessing = true;
    pendingUpdate = false;

    // Extract colors from current image
    const imageData = new Uint8ClampedArray($imageStore.current.data);
    const width = $imageStore.current.width;
    const height = $imageStore.current.height;

    let colors = extractDominantColors(
      imageData,
      width,
      height,
      $imageStore.valueSimplification.levels,
      8 // More aggressive sampling for speed
    );

    // Map to palette if enabled
    if ($imageStore.valueSimplification.paletteEnabled) {
      const palette = palettes[$imageStore.valueSimplification.selectedPalette];
      if (palette) {
        colors = mapColorsToPalette(colors, palette.colors);
      }
    }

    imageStore.setExtractedColors(colors);
    isProcessing = false;
  }, 300); // Wait 300ms after slider stops moving

  function handleLevelChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    imageStore.setValueSimplificationLevels(value);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function setPreset(levels: number) {
    imageStore.setValueSimplificationLevels(levels);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function copyColorToClipboard(hex: string) {
    navigator.clipboard.writeText(hex);
  }

  function handlePaletteChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    imageStore.setSelectedPalette(value);
    pendingUpdate = true;
    debouncedExtractColors();
  }

  function togglePalette() {
    imageStore.setPaletteEnabled(
      !$imageStore.valueSimplification.paletteEnabled
    );
    pendingUpdate = true;
    debouncedExtractColors();
  }

  // Auto-extract colors when switching to this tool
  $: if (
    $imageStore.activeTool === "value-simplification" &&
    $imageStore.current
  ) {
    debouncedExtractColors();
  }
</script>

<div class="adjustments-panel">
  <h2 class="panel-title">Value Simplification</h2>

  {#if !$imageStore.current}
    <p class="empty-message">Load an image to start.</p>
  {:else}
    <section class="control-section">
      <h3 class="section-header">LEVELS</h3>
      <div class="control-item">
        <div class="control-label-row">
          <span class="control-label">Value Levels</span>
          <span class="control-value">{pendingUpdate ? "Updating" : $imageStore.valueSimplification.levels}</span>
        </div>
        <input
          id="value-levels"
          type="range"
          min="2"
          max="10"
          value={$imageStore.valueSimplification.levels}
          on:input={handleLevelChange}
          class="slider"
        />
        <div class="slider-scale"><span>2</span><span>10</span></div>
      </div>
    </section>

    <section class="control-section">
      <h3 class="section-header">OPACITY</h3>
      <div class="control-item">
        <div class="control-label-row">
          <span class="control-label">Opacity</span>
          <span class="control-value">{Math.round($imageStore.valueSimplification.opacity * 100)}%</span>
        </div>
        <input
          id="value-opacity"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={$imageStore.valueSimplification.opacity}
          on:input={(e) =>
            imageStore.setValueSimplificationOpacity(
              parseFloat(e.currentTarget.value)
            )}
          class="slider"
        />
      </div>
    </section>

    <section class="control-section">
      <h3 class="section-header">PRESETS</h3>
      <div class="preset-row">
        {#each [3, 5, 8] as level, idx}
          <button
            class={`chip ${$imageStore.valueSimplification.levels === level ? "active" : ""}`}
            on:click={() => setPreset(level)}
          >
            {idx === 0 ? "Quick" : idx === 1 ? "Standard" : "Detail"}
          </button>
        {/each}
      </div>
    </section>

    <section class="control-section">
      <h3 class="section-header">PAINT BY NUMBERS</h3>
      <div class="toggle-row">
        <span class="control-label">Enable</span>
        <button
          class={`switch ${$imageStore.valueSimplification.paintByNumbersEnabled ? "active" : ""}`}
          on:click={() =>
            imageStore.setPaintByNumbersEnabled(
              !$imageStore.valueSimplification.paintByNumbersEnabled
            )}
          aria-pressed={$imageStore.valueSimplification.paintByNumbersEnabled}
        >
          <span class="switch-thumb"></span>
        </button>
      </div>

      {#if $imageStore.valueSimplification.paintByNumbersEnabled}
        <div class="mode-grid">
          <button
            class={`chip ${
              $imageStore.valueSimplification.paintByNumbersMode === "blocks"
                ? "active"
                : ""
            }`}
            on:click={() => imageStore.setPaintByNumbersMode("blocks")}
          >
            Color Blocks
          </button>
          <button
            class={`chip ${
              $imageStore.valueSimplification.paintByNumbersMode === "lines"
                ? "active"
                : ""
            }`}
            on:click={() => imageStore.setPaintByNumbersMode("lines")}
          >
            Line Guide
          </button>
        </div>
        <p class="hint-text">
          {#if $imageStore.valueSimplification.paintByNumbersMode === "blocks"}
            Solid color blocks for painting reference
          {:else}
            Outlined regions for drawing guide
          {/if}
        </p>
      {/if}
    </section>

    <section class="control-section">
      <h3 class="section-header">COLOR PALETTE</h3>
      <div class="toggle-row">
        <span class="control-label">Apply Palette</span>
        <button
          class={`switch ${$imageStore.valueSimplification.paletteEnabled ? "active" : ""}`}
          on:click={togglePalette}
          aria-pressed={$imageStore.valueSimplification.paletteEnabled}
        >
          <span class="switch-thumb"></span>
        </button>
      </div>

      {#if $imageStore.valueSimplification.paletteEnabled}
        <div class="control-item">
          <label for="palette-select" class="control-label small">Palette Selection</label>
          <select
            id="palette-select"
            value={$imageStore.valueSimplification.selectedPalette}
            on:change={handlePaletteChange}
            class="select"
          >
            {#each Object.entries(paletteCategories) as [category, label]}
              <optgroup {label}>
                {#each Object.entries(palettes) as [key, palette]}
                  {#if palette.category === category}
                    <option value={key}>{palette.name}</option>
                  {/if}
                {/each}
              </optgroup>
            {/each}
          </select>

          {#if palettes[$imageStore.valueSimplification.selectedPalette]}
            <div class="palette-preview">
              <p class="hint-text">
                {palettes[$imageStore.valueSimplification.selectedPalette].description}
              </p>
              <div class="palette-swatches">
                {#each palettes[$imageStore.valueSimplification.selectedPalette].colors as color}
                  <div class="swatch" style={`background-color: ${color}`} title={color}></div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <section class="control-section">
      <h3 class="section-header">EXTRACTED COLORS</h3>
      {#if $imageStore.valueSimplification.extractedColors.length > 0}
        <div class="color-list">
          {#each $imageStore.valueSimplification.extractedColors as color, idx (idx)}
            <button class="color-row" on:click={() => copyColorToClipboard(color.hex)}>
              <div
                class="color-chip"
                style={`background-color: rgb(${color.r}, ${color.g}, ${color.b})`}
                aria-label={`Color: ${color.hex}`}
              ></div>
              <div class="color-meta">
                <p class="color-hex">{color.hex}</p>
              </div>
              <span class="color-copy">Copy</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="hint-text">Colors will appear here</p>
      {/if}
    </section>
  {/if}
</div>

<style>
  .adjustments-panel {
    height: 100%;
    padding: 24px;
    overflow-y: auto;
  }

  .panel-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: 12px;
  }

  .empty-message {
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .control-section {
    margin-bottom: 28px;
  }

  .section-header {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    margin-bottom: 14px;
  }

  .control-item {
    margin-bottom: 16px;
  }

  .control-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .control-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .control-label.small {
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .control-value {
    font-size: 13px;
    font-family: var(--font-family-mono);
    color: var(--color-text-secondary);
  }

  .slider {
    width: 100%;
    height: 4px;
    background: var(--color-border-subtle);
    border-radius: 2px;
    outline: none;
    appearance: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border: none;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  .slider-scale {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-tertiary);
    margin-top: 6px;
  }

  .preset-row,
  .mode-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 10px;
  }

  .chip {
    padding: 10px 12px;
    background: var(--color-border-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .chip:hover {
    background: var(--color-border-strong);
  }

  .chip.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: white;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .switch {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: var(--color-border-subtle);
    border: 1px solid var(--color-border-default);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .switch-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: all 150ms ease;
  }

  .switch.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
  }

  .switch.active .switch-thumb {
    transform: translateX(18px);
    background: white;
  }

  .select {
    width: 100%;
    padding: 10px 12px;
    background: var(--color-surface-700);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-default);
    border-radius: 8px;
    font-size: 13px;
  }

  .palette-preview {
    margin-top: 10px;
    padding: 10px;
    background: var(--color-surface-700);
    border-radius: 8px;
    border: 1px solid var(--color-border-subtle);
  }

  .palette-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .swatch {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid var(--color-border-default);
  }

  .hint-text {
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin-top: 8px;
  }

  .color-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: var(--color-surface-700);
    border-radius: 8px;
    border: 1px solid var(--color-border-subtle);
    cursor: pointer;
    transition: background 120ms ease;
    text-align: left;
  }

  .color-row:hover {
    background: var(--color-surface-600);
  }

  .color-chip {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid var(--color-border-default);
  }

  .color-meta {
    flex: 1;
  }

  .color-hex {
    font-family: var(--font-family-mono);
    font-size: 13px;
    color: var(--color-text-primary);
  }

  .color-copy {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }
</style>
