<script lang="ts">
	// Gulungan film: SVG sederhana yang berputar pelan.
	let { size = 220, speed = 18 }: { size?: number; speed?: number } = $props();
	const holes = Array.from({ length: 6 }, (_, i) => {
		const a = (i * Math.PI) / 3;
		return { x: 100 + Math.cos(a) * 56, y: 100 + Math.sin(a) * 56 };
	});
</script>

<svg
	class="reel"
	viewBox="0 0 200 200"
	width={size}
	height={size}
	style="--spd:{speed}s"
	aria-hidden="true"
>
	<circle cx="100" cy="100" r="96" fill="#0c0807" stroke="#f3e4cf" stroke-opacity="0.55" stroke-width="2" />
	<circle cx="100" cy="100" r="86" fill="none" stroke="#f2cf7a" stroke-opacity="0.35" stroke-width="1" />
	{#each holes as h, i (i)}
		<circle cx={h.x} cy={h.y} r="24" fill="#5a160c" stroke="#f3e4cf" stroke-opacity="0.35" />
	{/each}
	<circle cx="100" cy="100" r="16" fill="#1c100c" stroke="#f2cf7a" stroke-width="2" />
	<circle cx="100" cy="100" r="5" fill="#f2cf7a" />
</svg>

<style>
	.reel {
		display: block;
		animation: spin var(--spd) linear infinite;
		filter: drop-shadow(0 18px 24px rgb(0 0 0 / 0.5));
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
