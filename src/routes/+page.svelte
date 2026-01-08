<script lang="ts">
  import ImageCanvas from "../components/ImageCanvas.svelte";
  import ToolNavigation from "../components/ToolNavigation.svelte";
  import AnalysisPanel from "../components/AnalysisPanel.svelte";
  import { imageStore } from "$lib/stores/imageStore";
  import {
    RotateCcw,
    RotateCw,
    ZoomIn,
    ZoomOut,
    Maximize2,
    HelpCircle,
  } from "lucide-svelte";
</script>

<div class="app-container">
  <!-- Header -->
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">Image Analyzer</h1>
      {#if $imageStore.current}
        <span class="file-name">Untitled.jpg</span>
      {/if}
    </div>

    <div class="header-right">
      <button class="icon-btn" aria-label="Undo" title="Undo">
        <RotateCcw size={18} />
      </button>
      <button class="icon-btn" aria-label="Redo" title="Redo">
        <RotateCw size={18} />
      </button>

      <div class="divider-vertical"></div>

      <button class="icon-btn" aria-label="Zoom out" title="Zoom out">
        <ZoomOut size={18} />
      </button>
      <span class="zoom-display">100%</span>
      <button class="icon-btn" aria-label="Zoom in" title="Zoom in">
        <ZoomIn size={18} />
      </button>
      <button class="icon-btn" aria-label="Fit to screen" title="Fit to screen">
        <Maximize2 size={18} />
      </button>

      <div class="divider-vertical"></div>

      <button class="icon-btn" aria-label="Help" title="Help">
        <HelpCircle size={18} />
      </button>
    </div>
  </header>

  <!-- Tool Navigation -->
  <ToolNavigation />

  <!-- Main Content -->
  <div class="main-content">
    <!-- Tool Panel -->
    <aside class="tool-panel">
      <AnalysisPanel />
    </aside>

    <!-- Canvas Area -->
    <main class="canvas-area">
      <ImageCanvas />
    </main>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background-color: var(--color-bg-primary);
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 24px;
    background-color: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .app-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .file-name {
    font-size: 14px;
    font-weight: 400;
    color: var(--color-text-secondary);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .icon-btn:hover {
    background-color: var(--color-border-subtle);
    color: var(--color-text-primary);
  }

  .icon-btn:active {
    background-color: var(--color-border-default);
  }

  .zoom-display {
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-family-mono);
    color: var(--color-text-primary);
    min-width: 48px;
    text-align: center;
    margin: 0 4px;
  }

  .divider-vertical {
    width: 1px;
    height: 20px;
    background-color: var(--color-border-subtle);
    margin: 0 8px;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .tool-panel {
    width: 320px;
    flex-shrink: 0;
    background-color: var(--color-bg-secondary);
    border-right: 1px solid var(--color-border-subtle);
    overflow-y: auto;
  }

  .canvas-area {
    flex: 1;
    min-width: 0;
    background-color: var(--color-canvas);
  }
</style>
