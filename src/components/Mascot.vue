<script setup lang="ts">
/** "Echo": a round little listener with oversized headphones. */
withDefaults(defineProps<{ mood?: 'happy' | 'sad' | 'wow'; size?: number; bob?: boolean }>(), {
  mood: 'happy',
  size: 96,
  bob: false,
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" :class="bob && 'animate-bob'" aria-hidden="true">
    <!-- shadow -->
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="currentColor" class="text-line" />
    <!-- body -->
    <circle cx="60" cy="64" r="42" fill="#4f7bff" />
    <path d="M24 78a42 42 0 0 0 72 0a50 30 0 0 1-72 0z" fill="#3a5fe0" />
    <ellipse cx="60" cy="86" rx="20" ry="13" fill="#a9c0ff" />
    <!-- headphone band -->
    <path d="M18 60a42 46 0 0 1 84 0" fill="none" stroke="#3c3c3c" stroke-width="7" stroke-linecap="round" />
    <!-- ear cups -->
    <rect x="8" y="50" width="18" height="30" rx="9" fill="#ff5a6a" />
    <rect x="12" y="55" width="7" height="20" rx="3.5" fill="#e23e50" />
    <rect x="94" y="50" width="18" height="30" rx="9" fill="#ff5a6a" />
    <rect x="101" y="55" width="7" height="20" rx="3.5" fill="#e23e50" />
    <!-- eyes -->
    <template v-if="mood === 'happy'">
      <circle cx="45" cy="58" r="11" fill="#fff" />
      <circle cx="75" cy="58" r="11" fill="#fff" />
      <circle cx="47" cy="60" r="6" fill="#3c3c3c" />
      <circle cx="77" cy="60" r="6" fill="#3c3c3c" />
      <circle cx="49" cy="57" r="2" fill="#fff" />
      <circle cx="79" cy="57" r="2" fill="#fff" />
      <path d="M50 76q10 9 20 0" fill="none" stroke="#3c3c3c" stroke-width="4" stroke-linecap="round" />
    </template>
    <template v-else-if="mood === 'wow'">
      <path d="M36 60q9-10 18 0" fill="none" stroke="#3c3c3c" stroke-width="5" stroke-linecap="round" />
      <path d="M66 60q9-10 18 0" fill="none" stroke="#3c3c3c" stroke-width="5" stroke-linecap="round" />
      <path d="M48 73q12 16 24 0z" fill="#3c3c3c" />
      <path d="M53 78q7 5 14 0" fill="#ff5a6a" />
    </template>
    <template v-else>
      <circle cx="45" cy="60" r="10" fill="#fff" />
      <circle cx="75" cy="60" r="10" fill="#fff" />
      <circle cx="46" cy="63" r="5.5" fill="#3c3c3c" />
      <circle cx="76" cy="63" r="5.5" fill="#3c3c3c" />
      <path d="M37 52l14-6M83 52l-14-6" stroke="#3c3c3c" stroke-width="4" stroke-linecap="round" />
      <path d="M51 81q9-7 18 0" fill="none" stroke="#3c3c3c" stroke-width="4" stroke-linecap="round" />
    </template>
    <!-- cheeks -->
    <circle cx="32" cy="73" r="5" fill="#ff86b6" opacity=".55" />
    <circle cx="88" cy="73" r="5" fill="#ff86b6" opacity=".55" />
  </svg>
</template>
