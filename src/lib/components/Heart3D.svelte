<script lang="ts">
	// Hati 3D sungguhan: tumpukan lapisan SVG di sumbu Z (CSS 3D transforms).
	const LAYERS = 38;
	const DEPTH = 54;

	const layers = Array.from({ length: LAYERS }, (_, i) => {
		const t = (i / (LAYERS - 1)) * 2 - 1;
		const round = Math.sqrt(1 - t * t);
		return {
			z: +(t * DEPTH).toFixed(1),
			s: +(0.3 + 0.7 * round).toFixed(3),
			l: Math.round(28 + 36 * Math.abs(t))
		};
	});

	const dots = Array.from({ length: 16 }, (_, i) => ({
		a: Math.round((i * 360) / 16),
		r: +(0.78 + 0.22 * Math.sin(i * 1.9)).toFixed(2),
		y: Math.round(Math.sin(i * 1.7) * 62),
		sz: 5 + (i % 4) * 2
	}));

	let rx = $state(0);
	let ry = $state(0);

	function onMove(e: PointerEvent) {
		ry = (e.clientX / innerWidth - 0.5) * 44;
		rx = -(e.clientY / innerHeight - 0.5) * 30;
	}
</script>

<svelte:window onpointermove={onMove} />

<div class="stage" aria-hidden="true">
	<div class="glow"></div>
	<div class="tilt" style="--rx:{rx}deg; --ry:{ry}deg">
		<div class="beat">
			<div class="spin">
				{#each layers as l (l.z)}
					<svg
						class="layer"
						viewBox="0 0 24 24"
						style="transform: translateZ({l.z}px) scale({l.s}); fill: hsl(346 92% {l.l}%);"
					>
						<path
							d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
						/>
					</svg>
				{/each}
			</div>
		</div>
		<div class="orbits">
			{#each dots as d (d.a)}
				<span style="--a:{d.a}deg; --r:{d.r}; --y:{d.y}px; --sz:{d.sz}px"></span>
			{/each}
		</div>
	</div>
	<div class="floor"></div>
</div>

<style>
	.stage {
		--size: clamp(190px, 40vw, 300px);
		position: relative;
		width: var(--size);
		height: var(--size);
		perspective: 1000px;
	}
	.glow {
		position: absolute;
		inset: -35%;
		background: radial-gradient(circle, rgb(255 60 120 / 0.55), transparent 62%);
		filter: blur(34px);
		animation: glow 2.6s ease-in-out infinite;
		pointer-events: none;
	}
	.tilt {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transform: rotateX(var(--rx)) rotateY(var(--ry));
		transition: transform 0.35s ease-out;
	}
	.beat {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		animation: beat 2.4s ease-in-out infinite;
	}
	.spin {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		animation: sway 8s ease-in-out infinite;
	}
	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.orbits {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		animation: orbit 18s linear infinite;
	}
	.orbits span {
		position: absolute;
		top: 50%;
		left: 50%;
		width: var(--sz);
		height: var(--sz);
		margin: calc(var(--sz) / -2);
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #fff, var(--pink) 45%, var(--rose));
		box-shadow: 0 0 14px rgb(255 120 170 / 0.9);
		transform: rotateY(var(--a)) translateZ(calc(var(--size) * var(--r))) translateY(var(--y));
	}
	.floor {
		position: absolute;
		left: 14%;
		right: 14%;
		bottom: -46px;
		height: 26px;
		background: radial-gradient(closest-side, rgb(255 60 120 / 0.5), transparent);
		filter: blur(6px);
		animation: floor 8s ease-in-out infinite;
	}

	@keyframes sway {
		0%,
		100% {
			transform: translateY(0) rotateY(-38deg) rotateZ(-4deg);
		}
		50% {
			transform: translateY(-16px) rotateY(38deg) rotateZ(4deg);
		}
	}
	@keyframes beat {
		0%,
		70%,
		100% {
			scale: 1;
		}
		14% {
			scale: 1.08;
		}
		28% {
			scale: 1;
		}
		42% {
			scale: 1.05;
		}
	}
	@keyframes orbit {
		to {
			transform: rotateY(360deg);
		}
	}
	@keyframes glow {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(0.95);
		}
		50% {
			opacity: 1;
			transform: scale(1.08);
		}
	}
	@keyframes floor {
		0%,
		100% {
			transform: scaleX(1);
			opacity: 0.9;
		}
		50% {
			transform: scaleX(0.72);
			opacity: 0.55;
		}
	}
</style>
