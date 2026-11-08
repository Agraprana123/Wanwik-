<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	type P = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		s: number;
		r: number;
		vr: number;
		ph: number;
		c: string;
		a: number;
		life: number;
		max: number;
		kind: 0 | 1 | 2; // 0 = jatuh, 1 = jejak kursor, 2 = ledakan klik
	};

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const colors = ['255,77,134', '255,143,177', '255,217,227', '255,207,158', '255,120,160'];
		const rnd = (a: number, b: number) => a + Math.random() * (b - a);
		const pick = () => colors[Math.floor(Math.random() * colors.length)];

		let w = 0;
		let h = 0;
		let boost = 0;
		let lastScroll = scrollY;
		let lastSpark = 0;
		let raf = 0;
		const parts: P[] = [];

		function resize() {
			const dpr = Math.min(devicePixelRatio || 1, 2);
			w = innerWidth;
			h = innerHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function petal(anywhere = false): P {
			return {
				x: rnd(0, w),
				y: anywhere ? rnd(0, h) : rnd(-80, -10),
				vx: rnd(-0.15, 0.15),
				vy: rnd(0.3, 0.9),
				s: rnd(5, 13),
				r: rnd(0, 6.28),
				vr: rnd(-0.02, 0.02),
				ph: rnd(0, 6.28),
				c: pick(),
				a: rnd(0.25, 0.7),
				life: 0,
				max: Infinity,
				kind: 0
			};
		}

		function heart(s: number) {
			ctx.beginPath();
			ctx.moveTo(0, s * 0.6);
			ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.7, -s * 1.0, 0, -s * 0.35);
			ctx.bezierCurveTo(s * 0.7, -s * 1.0, s * 1.3, -s * 0.1, 0, s * 0.6);
			ctx.closePath();
			ctx.fill();
		}

		function seed() {
			parts.length = 0;
			if (reduce) return;
			const n = Math.round(Math.min(46, Math.max(18, w / 36)));
			for (let i = 0; i < n; i++) parts.push(petal(true));
		}

		function frame() {
			raf = requestAnimationFrame(frame);
			if (document.hidden) return;
			ctx.clearRect(0, 0, w, h);
			boost *= 0.92;

			for (let i = parts.length - 1; i >= 0; i--) {
				const p = parts[i];
				p.life++;
				p.r += p.vr;

				if (p.kind === 0) {
					p.ph += 0.012;
					p.x += p.vx + Math.sin(p.ph) * 0.45;
					p.y += p.vy + boost * p.s * 0.06;
					if (p.y > h + 30 || p.y < -120) {
						Object.assign(p, petal());
					}
					if (p.x < -30) p.x = w + 20;
					if (p.x > w + 30) p.x = -20;
				} else {
					if (p.kind === 2) p.vy += 0.06;
					p.x += p.vx;
					p.y += p.vy;
					if (p.life > p.max) {
						parts.splice(i, 1);
						continue;
					}
				}

				const fade = p.kind === 0 ? 1 : 1 - p.life / p.max;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.kind === 0 ? p.r : p.r * 0.5);
				ctx.fillStyle = `rgba(${p.c},${(p.a * fade).toFixed(3)})`;
				heart(p.s);
				ctx.restore();
			}
		}

		function onScroll() {
			boost = Math.max(-14, Math.min(14, boost + (scrollY - lastScroll) * 0.12));
			lastScroll = scrollY;
		}

		function onMove(e: PointerEvent) {
			if (reduce || e.pointerType !== 'mouse') return;
			const t = performance.now();
			if (t - lastSpark < 45) return;
			lastSpark = t;
			if (parts.length > 400) return;
			parts.push({
				x: e.clientX,
				y: e.clientY,
				vx: rnd(-0.5, 0.5),
				vy: rnd(-0.9, -0.2),
				s: rnd(3, 6.5),
				r: rnd(-0.5, 0.5),
				vr: rnd(-0.05, 0.05),
				ph: 0,
				c: pick(),
				a: 0.9,
				life: 0,
				max: 50,
				kind: 1
			});
		}

		function onDown(e: PointerEvent) {
			if (reduce) return;
			for (let i = 0; i < 16 && parts.length < 420; i++) {
				const ang = rnd(0, Math.PI * 2);
				const sp = rnd(1.5, 4.8);
				parts.push({
					x: e.clientX,
					y: e.clientY,
					vx: Math.cos(ang) * sp,
					vy: Math.sin(ang) * sp - 1.5,
					s: rnd(5, 11),
					r: rnd(0, 6.28),
					vr: rnd(-0.1, 0.1),
					ph: 0,
					c: pick(),
					a: 1,
					life: 0,
					max: 75,
					kind: 2
				});
			}
		}

		resize();
		seed();
		raf = requestAnimationFrame(frame);

		const onResize = () => {
			resize();
			seed();
		};
		addEventListener('resize', onResize);
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('pointermove', onMove, { passive: true });
		addEventListener('pointerdown', onDown, { passive: true });

		return () => {
			cancelAnimationFrame(raf);
			removeEventListener('resize', onResize);
			removeEventListener('scroll', onScroll);
			removeEventListener('pointermove', onMove);
			removeEventListener('pointerdown', onDown);
		};
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}
</style>
