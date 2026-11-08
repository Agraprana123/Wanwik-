<script lang="ts">
	import { onMount } from 'svelte';

	type Photo = { src: string; emoji: string; caption: string; text?: string };
	let { photos }: { photos: Photo[] } = $props();

	/* ---------- DOM refs & UI state ---------- */
	let wrapEl: HTMLElement;
	let stageEl: HTMLElement;
	let canvasEl: HTMLCanvasElement;
	let labelEl: HTMLElement;
	let pageEl: HTMLElement;

	let isOpen = $state(false);
	let current = $state(0);
	let blocks = $state<{ src: string; full: boolean; ratio: number }[]>([]);

	let api: { open: (n: number) => void; close: () => void; next: () => void } | null = null;

	const fallbackText = 'Satu potong kecil dari cerita kita, disimpan supaya tidak ikut hilang bersama waktu.';
	const nextIndex = $derived((current + 1) % photos.length);

	/** Gambar fade-in setelah selesai dimuat. */
	function fadeIn(node: HTMLImageElement) {
		const done = () => node.classList.add('in');
		if (node.complete) requestAnimationFrame(done);
		else node.addEventListener('load', done, { once: true });
	}

	/* ---------- Pemuat skrip (three r128 + GSAP, dari cdnjs) ---------- */
	const loaded = new Map<string, Promise<void>>();
	function loadScript(src: string) {
		if (!loaded.has(src)) {
			loaded.set(
				src,
				new Promise<void>((res, rej) => {
					const s = document.createElement('script');
					s.src = src;
					s.async = false;
					s.onload = () => res();
					s.onerror = () => rej(new Error('Gagal memuat ' + src));
					document.head.appendChild(s);
				})
			);
		}
		return loaded.get(src)!;
	}

	onMount(() => {
		let disposed = false;
		let cleanup = () => {};

		(async () => {
			const w = window as any;
			if (!w.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
			if (!w.gsap) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
			if (disposed) return;
			cleanup = init(w.THREE, w.gsap);
		})().catch((e) => console.error(e));

		return () => {
			disposed = true;
			cleanup();
		};
	});

	function init(THREE: any, gsap: any) {
		const NP = photos.length;
		const REPEAT = 3;
		const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
		const wrapv = (min: number, max: number, v: number) => {
			const r = max - min;
			return ((((v - min) % r) + r) % r) + min;
		};

		/* ===================== Tekstur dari foto / placeholder ===================== */
		const BIG = 1024;
		const art: HTMLCanvasElement[] = [];
		const sharpCv: HTMLCanvasElement[] = [];
		const blurCv: HTMLCanvasElement[] = [];
		const sharpTex: any[] = [];
		const blurTex: any[] = [];
		const imgs: (HTMLImageElement | null)[] = photos.map(() => null);

		const palettes = [
			['#3a1a12', '#0f0706'],
			['#4a1d12', '#120805'],
			['#33160f', '#0c0605'],
			['#40190f', '#100705']
		];

		function mkCanvas(s: number) {
			const c = document.createElement('canvas');
			c.width = c.height = s;
			return c;
		}

		function drawArt(ctx: CanvasRenderingContext2D, s: number, i: number) {
			const p = photos[i];
			const img = imgs[i];
			if (img && img.naturalWidth) {
				const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
				const dw = img.naturalWidth * k;
				const dh = img.naturalHeight * k;
				ctx.drawImage(img, (s - dw) / 2, (s - dh) / 2, dw, dh);
				const g = ctx.createLinearGradient(0, s * 0.62, 0, s);
				g.addColorStop(0, 'rgba(18,4,12,0)');
				g.addColorStop(1, 'rgba(18,4,12,.85)');
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, s, s);
			} else {
				const pal = palettes[i % palettes.length];
				const g = ctx.createLinearGradient(0, 0, s * (0.4 + 0.2 * (i % 3)), s);
				g.addColorStop(0, pal[0]);
				g.addColorStop(1, pal[1]);
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, s, s);
				const r = ctx.createRadialGradient(s * 0.32, s * 0.28, 0, s * 0.32, s * 0.28, s * 0.62);
				r.addColorStop(0, 'rgba(255,140,80,.38)');
				r.addColorStop(1, 'rgba(255,140,80,0)');
				ctx.fillStyle = r;
				ctx.fillRect(0, 0, s, s);

				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = `${s * 0.26}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
				ctx.fillStyle = '#fff';
				ctx.fillText(p.emoji, s / 2, s * 0.42);

				ctx.font = `500 ${s * 0.026}px "DM Sans", sans-serif`;
				ctx.fillStyle = 'rgba(243,228,207,.6)';
				(ctx as any).letterSpacing = `${s * 0.006}px`;
				ctx.fillText(`FRAME ${String(i + 1).padStart(2, '0')}`, s / 2, s * 0.62);
				(ctx as any).letterSpacing = '0px';
			}
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = `italic 400 ${s * 0.052}px "Playfair Display", Georgia, serif`;
			ctx.fillStyle = '#f3e4cf';
			ctx.fillText(p.caption, s / 2, s * 0.78, s * 0.6);
		}

		function refresh(i: number) {
			const a = art[i].getContext('2d')!;
			a.clearRect(0, 0, BIG, BIG);
			drawArt(a, BIG, i);
			const sc = sharpCv[i].getContext('2d')!;
			sc.drawImage(art[i], 0, 0, 512, 512);
			const bc = blurCv[i].getContext('2d')!;
			bc.drawImage(art[i], 0, 0, 24, 24);
			sharpTex[i].needsUpdate = true;
			blurTex[i].needsUpdate = true;
		}

		for (let i = 0; i < NP; i++) {
			art.push(mkCanvas(BIG));
			sharpCv.push(mkCanvas(512));
			blurCv.push(mkCanvas(24));
			sharpTex.push(new THREE.CanvasTexture(sharpCv[i]));
			const bt = new THREE.CanvasTexture(blurCv[i]);
			bt.minFilter = bt.magFilter = THREE.LinearFilter;
			blurTex.push(bt);
			refresh(i);
			if (photos[i].src) {
				const im = new Image();
				im.crossOrigin = 'anonymous';
				im.onload = () => {
					imgs[i] = im;
					refresh(i);
				};
				im.src = photos[i].src;
			}
		}
		// Gambar ulang setelah font siap
		(document as any).fonts?.load('italic 40px "Playfair Display"').then(() => {
			(document as any).fonts.ready.then(() => photos.forEach((_, i) => refresh(i)));
		});

		/* ===================== Renderer & kamera ===================== */
		const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(5, 1, 0.1, 1000);
		const world = new THREE.Group();
		scene.add(world);

		let aspect = 1;
		const placeCamera = () => {
			camera.position.set(0, 100 / 7.5, aspect < 1 ? 55 : 35);
			camera.lookAt(0, 0, 0);
		};

		/* ===================== Shader kartu ===================== */
		const vert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
		const frag = `
			varying vec2 vUv;
			uniform vec2 uMeshSize; uniform vec2 uImageSize;
			uniform sampler2D uImageTexture; uniform sampler2D uBlurTexture;
			uniform float uOpacity;
			void main(){
				vec2 ratio = vec2(
					min((uMeshSize.x/uMeshSize.y)/(uImageSize.x/uImageSize.y), 1.0),
					min((uMeshSize.y/uMeshSize.x)/(uImageSize.y/uImageSize.x), 1.0));
				vec2 uvCover = vUv*ratio + (1.0-ratio)*0.5;
				vec4 sharp = texture2D(uImageTexture, uvCover);
				vec4 blur = texture2D(uBlurTexture, uvCover);
				vec4 progress = vec4(1.0);
				float margin = 0.15;
				progress.rgb *= smoothstep(0.0, margin, vUv.x);
				progress.rgb *= smoothstep(1.0, 1.0 - margin, vUv.x);
				progress.rgb *= smoothstep(0.0, margin, vUv.y);
				progress.rgb *= smoothstep(1.0, 1.0 - margin, vUv.y);
				blur.a *= 0.75;
				vec4 color = mix(sharp, blur, 1.0 - progress.r);
				color.a *= uOpacity;
				gl_FragColor = color;
			}`;

		/* ===================== Kartu ===================== */
		const GAP = 0.375;
		const BE = 4 / 3;
		const SC = 1 - (BE - 1) * 0.5;
		const H0 = 1.5 * SC;
		const W0 = 1.5 * BE * SC;
		const geo = new THREE.BoxGeometry(H0, W0, 0.0175);

		type Card = {
			n: number; i: number; mesh: any; hit: any; inner: any; holder: any;
			order: number; visK: number; on: boolean;
		};
		const cards: Card[] = [];
		for (let n = 0; n < NP * REPEAT; n++) {
			const i = n % NP;
			const mat = new THREE.ShaderMaterial({
				transparent: true,
				vertexShader: vert,
				fragmentShader: frag,
				uniforms: {
					uMeshSize: { value: new THREE.Vector2(H0, W0) },
					uImageSize: { value: new THREE.Vector2(1, 1) },
					uImageTexture: { value: sharpTex[i] },
					uBlurTexture: { value: blurTex[i] },
					uOpacity: { value: 1 }
				}
			});
			const mesh = new THREE.Mesh(geo, mat);
			const hit = new THREE.Mesh(
				geo,
				new THREE.MeshBasicMaterial({ opacity: 0, transparent: true, depthWrite: false })
			);
			hit.scale.x = 1.5;
			const inner = new THREE.Group();
			inner.add(mesh);
			const holder = new THREE.Group();
			holder.add(inner);
			holder.add(hit);
			world.add(holder);
			cards.push({ n, i, mesh, hit, inner, holder, order: n, visK: 1, on: true });
		}

		/* ===================== Gerak ===================== */
		const scroll = { current: 0, previous: 0 };
		const mouse = {
			x: -1, y: -1, has: false,
			drag: { x: 0, y: 0, active: false },
			on: { x: 0, y: 0 },
			down: false, sx: 0, sy: 0
		};
		let M = 0;
		const intro = { x: -20 };
		let ready = false;
		let inView = false;
		let opened: Card | null = null;
		let hovered: Card | null = null;

		function layout() {
			M += (mouse.drag.x - mouse.drag.y - M) * 0.1;
			scroll.previous += (scroll.current - scroll.previous) * 0.15;
			const J = scroll.previous / 25 - M / 100 + intro.x;
			const N = cards.length;
			const len = Math.max(N, 24);
			const F = (len * GAP) / 2;
			const step = len / N;
			cards.forEach((c, k) => {
				c.order = k * step;
				c.visK += ((c.on ? 1 : 0) - c.visK) * 0.12;
				c.mesh.material.uniforms.uOpacity.value = c.visK;
				if (!opened) {
					const x = wrapv(-F, F, (c.order - J) * GAP);
					const z = aspect < 1 ? -x * 6 : -x * aspect * 1.5;
					c.holder.position.set(x, -(1 - c.visK) * 1.2, z);
					c.holder.rotation.x = 0;
					c.holder.rotation.y = -Math.PI / 6;
					c.holder.visible = c.visK > 0.02 && Math.abs(z) < 12.5;
				}
			});
		}

		/* ---------- Hover ---------- */
		const ray = new THREE.Raycaster();
		const ndc = new THREE.Vector2();
		function setHover(c: Card | null) {
			if (c === hovered) return;
			if (hovered) {
				gsap.to(hovered.inner.position, { x: 0, y: 0, duration: 0.5, ease: 'expo.out' });
			}
			hovered = c;
			if (c) {
				gsap.to(c.inner.position, { x: 2 / 3, y: -0.1, duration: 0.5, ease: 'expo.out' });
				canvasEl.style.cursor = 'pointer';
				labelEl.textContent = photos[c.i].caption;
				labelEl.style.opacity = '1';
			} else {
				canvasEl.style.cursor = '';
				labelEl.style.opacity = '0';
			}
		}
		function pick() {
			if (!ready || opened || mouse.drag.active || !mouse.has) {
				if (!mouse.has && hovered) setHover(null);
				return;
			}
			ndc.set(mouse.x, mouse.y);
			ray.setFromCamera(ndc, camera);
			const vis = cards.filter((c) => c.holder.visible && c.on);
			const hits = ray.intersectObjects(vis.map((c) => c.hit), false);
			setHover(hits.length ? vis.find((c) => c.hit === hits[0].object) ?? null : null);
		}

		/* ---------- Buka / tutup proyek ---------- */
		function buildBlocks(i: number) {
			const src = art[i];
			const specs: [number[], number[], boolean, number][] = [
				[[0, 0.08, 1, 0.84], [720, 600], false, 1.2],
				[[0.18, 0, 0.64, 1], [540, 840], false, 0.64],
				[[0, 0.2, 1, 0.6], [1080, 648], true, 1.67],
				[[0.05, 0.05, 0.5, 0.5], [600, 600], false, 1],
				[[0.45, 0.45, 0.5, 0.5], [600, 600], false, 1]
			];
			return specs.map(([[x, y, cw, ch], [ow, oh], full, ratio]) => {
				const c = document.createElement('canvas');
				c.width = ow;
				c.height = oh;
				c.getContext('2d')!.drawImage(src, x * BIG, y * BIG, cw * BIG, ch * BIG, 0, 0, ow, oh);
				return { src: c.toDataURL('image/jpeg', 0.85), full, ratio };
			});
		}
		function fillPage(i: number) {
			current = i;
			blocks = buildBlocks(i);
		}

		function openTile(t: Card) {
			if (opened) return;
			opened = t;
			setHover(null);
			isOpen = true;
			cards.forEach((c) => {
				if (c !== t) c.holder.visible = false;
			});
			t.inner.position.set(0, 0, 0);
			gsap.to(t.holder.position, {
				x: 0,
				duration: (1.25 / 3) * 2,
				ease: 'expo.out',
				onUpdate: () => {
					t.holder.position.z = -t.holder.position.x * aspect * 1.5;
				}
			});
			gsap.to(t.holder.rotation, { y: 0, duration: 1.25, ease: 'expo.inOut' });
			gsap.to(camera.position, {
				x: 0,
				y: 0,
				z: innerWidth < 640 ? 35 : 30,
				duration: 1.25,
				ease: 'expo.inOut',
				onUpdate: () => camera.lookAt(0, 0, 0),
				onComplete: () => {
					if (opened !== t) return;
					fillPage(t.i);
					pageEl.scrollTop = 0;
					gsap.set(pageEl, { visibility: 'visible' });
					gsap.fromTo(
						pageEl,
						{ opacity: 0 },
						{
							opacity: 1,
							duration: 0.5,
							ease: 'power1.inOut',
							onComplete: () => {
								if (opened === t) t.holder.visible = false;
							}
						}
					);
				}
			});
		}

		function closeTile() {
			if (!opened) return;
			gsap.killTweensOf(pageEl);
			gsap.killTweensOf(camera.position);
			gsap.killTweensOf(opened.holder.position);
			gsap.killTweensOf(opened.holder.rotation);
			gsap.set(pageEl, { opacity: 0, visibility: 'hidden' });
			isOpen = false;
			opened.holder.rotation.y = -Math.PI / 6;
			placeCamera();
			opened = null;
			intro.x = -20;
			gsap.to(intro, { x: 0, duration: 2, ease: 'expo.out' });
		}

		function nextTile() {
			gsap.to(pageEl, {
				opacity: 0,
				duration: 0.25,
				onComplete: () => {
					fillPage(nextIndex);
					pageEl.scrollTop = 0;
					gsap.to(pageEl, { opacity: 1, duration: 0.5, ease: 'power1.inOut' });
				}
			});
		}
		api = { open: (n) => openTile(cards[n]), close: closeTile, next: nextTile };

		/* ===================== Input ===================== */
		const setMouse = (e: PointerEvent) => {
			const r = canvasEl.getBoundingClientRect();
			mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
			mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
			mouse.has = true;
			labelEl.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
		};
		const onDown = (e: PointerEvent) => {
			if (!ready || opened) return;
			setMouse(e);
			mouse.down = true;
			mouse.sx = e.clientX;
			mouse.sy = e.clientY;
			mouse.on.x = mouse.drag.x - e.clientX;
			mouse.on.y = mouse.drag.y - e.clientY;
			canvasEl.setPointerCapture(e.pointerId);
		};
		const onMove = (e: PointerEvent) => {
			setMouse(e);
			if (!mouse.down) return;
			if (!mouse.drag.active && Math.hypot(e.clientX - mouse.sx, e.clientY - mouse.sy) > 3) {
				mouse.drag.active = true;
				setHover(null);
				canvasEl.style.cursor = 'grabbing';
				gsap.to(world.scale, { x: 0.825, y: 0.825, z: 0.825, duration: 0.75, ease: 'expo.out' });
			}
			if (mouse.drag.active) {
				mouse.drag.x = mouse.on.x + e.clientX;
				mouse.drag.y = mouse.on.y + e.clientY;
			}
		};
		const endDrag = (e: PointerEvent, cancelled: boolean) => {
			if (!mouse.down) return;
			mouse.down = false;
			if (mouse.drag.active) {
				mouse.drag.active = false;
				canvasEl.style.cursor = '';
				gsap.to(world.scale, { x: 1, y: 1, z: 1, duration: 0.75, ease: 'expo.out' });
				return;
			}
			if (cancelled) return;
			setMouse(e);
			pick();
			if (hovered) openTile(hovered);
		};
		const onUp = (e: PointerEvent) => endDrag(e, false);
		const onCancel = (e: PointerEvent) => endDrag(e, true);
		const onLeave = () => {
			if (mouse.down) return;
			mouse.has = false;
			setHover(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') return closeTile();
			if (opened || !inView) return;
			if (e.key === 'ArrowRight') scroll.current += 12;
			if (e.key === 'ArrowLeft') scroll.current -= 12;
		};
		canvasEl.addEventListener('pointerdown', onDown);
		canvasEl.addEventListener('pointermove', onMove);
		canvasEl.addEventListener('pointerup', onUp);
		canvasEl.addEventListener('pointercancel', onCancel);
		canvasEl.addEventListener('pointerleave', onLeave);
		addEventListener('keydown', onKey);

		/* Scroll halaman menggeser tumpukan */
		const SPAN = 12; // jumlah kartu yang dilewati selama satu section
		const onScroll = () => {
			if (opened) return;
			const r = wrapEl.getBoundingClientRect();
			const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
			scroll.current = p * SPAN * 25;
		};
		addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		/* ===================== Ukuran ===================== */
		const resize = () => {
			const w = stageEl.clientWidth || innerWidth;
			const h = stageEl.clientHeight || innerHeight;
			renderer.setSize(w, h);
			aspect = w / h;
			camera.aspect = aspect;
			camera.updateProjectionMatrix();
			if (!opened) placeCamera();
		};
		const ro = new ResizeObserver(resize);
		ro.observe(stageEl);
		resize();

		/* ===================== Masuk & render ===================== */
		let introduced = false;
		const io = new IntersectionObserver(
			(en) => {
				inView = en[0].isIntersecting;
				if (inView && !introduced) {
					introduced = true;
					world.scale.set(0.825, 0.825, 0.825);
					setTimeout(() => {
						ready = true;
						gsap.to(intro, { x: 0, duration: 2, ease: 'expo.out' });
						gsap.to(world.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'expo.out', delay: 1.25 });
					}, 250);
				}
			},
			{ threshold: 0.2 }
		);
		io.observe(wrapEl);

		let raf = 0;
		const tick = () => {
			raf = requestAnimationFrame(tick);
			if (!inView) return;
			layout();
			pick();
			renderer.render(scene, camera);
		};
		tick();

		return () => {
			cancelAnimationFrame(raf);
			io.disconnect();
			ro.disconnect();
			removeEventListener('scroll', onScroll);
			removeEventListener('keydown', onKey);
			canvasEl.removeEventListener('pointerdown', onDown);
			canvasEl.removeEventListener('pointermove', onMove);
			canvasEl.removeEventListener('pointerup', onUp);
			canvasEl.removeEventListener('pointercancel', onCancel);
			canvasEl.removeEventListener('pointerleave', onLeave);
			gsap.killTweensOf([intro, world.scale, camera.position, pageEl]);
			cards.forEach((c) => {
				gsap.killTweensOf([c.inner.position, c.holder.position, c.holder.rotation]);
				c.mesh.material.dispose();
				c.hit.material.dispose();
			});
			geo.dispose();
			sharpTex.forEach((t) => t.dispose());
			blurTex.forEach((t) => t.dispose());
			renderer.dispose();
			api = null;
		};
	}
</script>

<section class="gallery" id="kenangan" bind:this={wrapEl}>
	<div class="stage" bind:this={stageEl}>
		<canvas bind:this={canvasEl} aria-label="Galeri kenangan 3D"></canvas>
		<div class="g-head">
			<p class="eyebrow">Galeri kenangan</p>
			<h2 class="title">Putar waktu, <em>temukan kita</em></h2>
		</div>
		<p class="hint">↓ scroll atau geser · klik adegan untuk membuka ↓</p>
	</div>
</section>

<span class="label" bind:this={labelEl} aria-hidden="true"></span>

<!-- ===================== Halaman proyek ===================== -->
<div class="pg" bind:this={pageEl} aria-hidden={!isOpen}>
	<header class="pg-head">
		<div class="pg-in">
			<span class="clap">Scene {String(current + 1).padStart(2, '0')} · Take 1</span>
			<h1>{photos[current].caption}</h1>
			<p>{photos[current].text ?? fallbackText}</p>
		</div>
	</header>

	<div class="strip" aria-hidden="true"></div>
	{#key current}
		<div class="pg-grid">
			{#each blocks as b, k (k)}
				<div class="blk" class:full={b.full} style="aspect-ratio:{b.ratio}">
					<img use:fadeIn src={b.src} alt="{photos[current].caption} — {k + 1}" />
				</div>
			{/each}
		</div>
	{/key}
	<div class="strip" aria-hidden="true"></div>

	<footer class="pg-next">
		<div class="row">
			<span class="k">Adegan</span><span>{current + 1} dari {photos.length}</span>
		</div>
		<button type="button" class="row nx" onclick={() => api?.next()}>
			<span class="k">Adegan berikutnya</span><span>{photos[nextIndex].caption}</span>
		</button>
	</footer>
</div>

<button
	type="button"
	class="back glass"
	class:show={isOpen}
	tabindex={isOpen ? 0 : -1}
	onclick={() => api?.close()}
>
	← Kembali ke galeri
</button>

<style>
	.gallery {
		position: relative;
		height: 430vh;
	}
	.stage {
		position: sticky;
		top: 0;
		height: 100svh;
		overflow: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: pan-y;
	}
	.g-head {
		position: absolute;
		inset: 11svh 0 auto 0;
		padding: 0 1.25rem;
		text-align: center;
		pointer-events: none;
	}
	.hint {
		position: absolute;
		inset: auto 0 5svh 0;
		text-align: center;
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--muted);
		pointer-events: none;
		padding: 0 1rem;
	}

	/* label mengikuti kursor */
	.label {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 30;
		pointer-events: none;
		font-family: var(--serif);
		font-style: italic;
		font-size: 0.95rem;
		color: var(--cream);
		text-shadow: 0 2px 12px rgb(0 0 0 / 0.8);
		opacity: 0;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	/* halaman proyek */
	.pg {
		position: fixed;
		inset: 0;
		z-index: 35;
		overflow-y: auto;
		overscroll-behavior: none;
		background: radial-gradient(120% 60% at 50% 0%, #5a160c 0%, #150a07 70%);
		display: flex;
		flex-direction: column;
		opacity: 0;
		visibility: hidden;
	}
	.pg-head {
		height: 50vh;
		min-height: 20rem;
		margin-top: 3.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}
	.pg-in {
		padding: 5rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
	}
	.pg-in h1 {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(2rem, 5vw, 3.4rem);
		line-height: 1.1;
	}
	.pg-in p {
		max-width: 34ch;
		color: var(--muted);
		font-size: 0.98rem;
		line-height: 1.65;
	}
	.pg-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.blk {
		position: relative;
		overflow: hidden;
		background: #0c0807;
		box-shadow: inset 0 0 0 6px #0c0807;
	}
	.blk.full {
		grid-column: 1 / -1;
	}
	.blk img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.6s cubic-bezier(0.215, 0.61, 0.355, 1);
	}
	.blk img:global(.in) {
		opacity: 1;
	}
	.pg-next {
		height: 50vh;
		min-height: 20rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 14px 14px 5rem;
		font-size: 0.85rem;
	}
	.row {
		width: min(32rem, 100%);
		display: flex;
		padding: 0.6rem 0;
		border: 0;
		border-top: 1px solid var(--glass-b);
		background: none;
		color: var(--cream);
		font: inherit;
		text-align: left;
	}
	.k {
		width: 8.25rem;
		flex: none;
		opacity: 0.3;
		transition: opacity 0.5s;
	}
	.nx {
		cursor: pointer;
	}
	.nx:hover .k {
		opacity: 1;
	}

	.back {
		position: fixed;
		z-index: 45;
		left: 50%;
		bottom: 18px;
		translate: -50% 0;
		padding: 0.7rem 1.3rem;
		border-radius: 999px;
		color: var(--cream);
		font: 500 0.85rem var(--sans);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.6s;
	}
	.back.show {
		opacity: 1;
		pointer-events: auto;
		transition-delay: 1.4s;
	}
	.back:hover {
		background: rgb(243 228 207 / 0.12);
	}

	@media (max-width: 760px) {
		.g-head :global(.title) {
			font-size: 1.9rem;
		}
	}
</style>
