<script lang="ts">
  import { imageStore } from "$lib/stores/imageStore";
  import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-svelte";

  type Tool = {
    id: typeof $imageStore.activeTool;
    name: string;
    icon: string;
  };

  const tools: Tool[] = [
    { id: "adjustments", name: "Adjustments", icon: "sliders" },
    { id: "value-simplification", name: "Paint by Numbers", icon: "palette" },
    { id: "grid", name: "Grid Overlay", icon: "grid" },
    { id: "measure", name: "Measure", icon: "ruler" },
    { id: "color-picker", name: "Color Picker", icon: "eyedropper" },
  ];

  let dropdownOpen = false;

  $: currentToolIndex = tools.findIndex((t) => t.id === $imageStore.activeTool);
  $: currentToolName = tools[currentToolIndex]?.name || "Unknown";
  $: canGoPrev = currentToolIndex > 0;
  $: canGoNext = currentToolIndex < tools.length - 1;

  function previousTool() {
    if (canGoPrev) {
      imageStore.setActiveTool(tools[currentToolIndex - 1].id);
    }
  }

  function nextTool() {
    if (canGoNext) {
      imageStore.setActiveTool(tools[currentToolIndex + 1].id);
    }
  }

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function selectTool(toolId: typeof $imageStore.activeTool) {
    imageStore.setActiveTool(toolId);
    dropdownOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".tool-nav-container")) {
      dropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="tool-nav-container relative">
  <div class="tool-nav">
    <button
      class="nav-arrow"
      on:click|stopPropagation={previousTool}
      disabled={!canGoPrev}
      aria-label="Previous tool"
    >
      <ChevronLeft size={20} />
    </button>

    <button class="tool-name" on:click|stopPropagation={toggleDropdown}>
      {currentToolName}
      <ChevronDown
        size={16}
        class="ml-1 transition-transform duration-200 {dropdownOpen
          ? 'rotate-180'
          : ''}"
      />
    </button>

    <button
      class="nav-arrow"
      on:click|stopPropagation={nextTool}
      disabled={!canGoNext}
      aria-label="Next tool"
    >
      <ChevronRight size={20} />
    </button>
  </div>

  {#if dropdownOpen}
    <div class="tool-dropdown">
      {#each tools as tool}
        <button
          class="dropdown-item"
          class:active={tool.id === $imageStore.activeTool}
          on:click|stopPropagation={() => selectTool(tool.id)}
        >
          <span class="tool-icon">{tool.icon}</span>
          <span>{tool.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tool-nav-container {
    position: relative;
  }

  .tool-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    background-color: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 150ms ease;
    border-radius: 6px;
  }

  .nav-arrow:hover:not(:disabled) {
    background-color: var(--color-border-subtle);
    color: var(--color-text-primary);
  }

  .nav-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .tool-name {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 200px;
    height: 36px;
    padding: 0 16px;
    margin: 0 8px;
    background: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .tool-name:hover {
    background-color: var(--color-border-subtle);
    border-color: var(--color-border-strong);
  }

  .tool-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    padding: 4px;
    z-index: 1000;
    animation: slideDown 200ms ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .dropdown-item:hover {
    background-color: var(--color-border-subtle);
  }

  .dropdown-item.active {
    background-color: var(--color-accent-primary);
    color: white;
  }

  .tool-icon {
    margin-right: 12px;
    font-size: 12px;
    opacity: 0.7;
  }
</style>
