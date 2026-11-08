<script lang="ts">
	import { onMount } from 'svelte';
	import Heart3D from '../lib/components/Heart3D.svelte';
	import { reveal, tilt, parallax } from '../lib/actions';
	import { couple, story, photos, reasons, letter } from '../lib/config';

	/* ---------- Hitung mundur: waktu bersama ---------- */
	let now = $state(Date.now());
	const start = new Date(`${couple.startDate}T00:00:00`).getTime();
	const elapsed = $derived(Math.max(0, now - start));
	const counts = $derived([
		{ label: 'Hari', value: Math.floor(elapsed / 864e5) },
		{ label: 'Jam', value: Math.floor(elapsed / 36e5) % 24 },
		{ label: 'Menit', value: Math.floor(elapsed / 6e4) % 60 },
		{ label: 'Detik', value: Math.floor(elapsed / 1e3) % 60 }
	]);

	/* ---------- State yang terhubung ke scroll ---------- */
	let progress = $state(0);
	let heroP = $state(0);
	let ringAngle = $state(0);
	let lineP = $state(0);
	let lit = $state(0);

	let heroEl: HTMLElement;
	let timelineEl: HTMLElement;
	let ringEl: HTMLElement;
	let letterEl: HTMLElement;

	const words = letter.split(/\s+/);
	let flipped = $state<boolean[]>(reasons.map(() => false));

	function onHeroMove(e: PointerEvent) {
		heroEl.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
		heroEl.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
	}

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
		let raf = 0;

		const update = () => {
			raf = 0;
			const vh = innerHeight;
			const max = document.documentElement.scrollHeight - vh;
			progress = max > 0 ? clamp(scrollY / max) : 0;
			heroP = clamp(scrollY / vh);

			if (ringEl) {
				const r = ringEl.getBoundingClientRect();
				ringAngle = clamp(-r.top / (r.height - vh)) * 360;
			}
			if (timelineEl) {
				const r = timelineEl.getBoundingClientRect();
				lineP = clamp((vh * 0.7 - r.top) / r.height);
			}
			if (letterEl) {
				const r = letterEl.getBoundingClientRect();
				const p = clamp(-r.top / (r.height - vh));
				lit = Math.ceil(clamp(p * 1.25) * words.length);
			}
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};

		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		update();

		return () => {
			clearInterval(timer);
			cancelAnimationFrame(raf);
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		};
	});
</script>

<svelte:window onpointermove={onHeroMove} />

<div class="progress" style="transform: scaleX({progress})"></div>

<nav class="nav glass" aria-label="Navigasi">
	<a class="brand" href="#kita">{couple.me[0]}<span>♥</span>{couple.partner[0]}</a>
	<div class="links">
		<a href="#waktu">Waktu</a>
		<a href="#cerita">Cerita</a>
		<a href="#kenangan">Kenangan</a>
		<a href="#alasan">Alasan</a>
		<a href="#surat">Surat</a>
	</div>
</nav>

<main class="page">
	<!-- ===================== HERO ===================== -->
	<section
		class="hero"
		id="kita"
		data-parallax
		bind:this={heroEl}
		style="--hp:{heroP}"
	>
		<div class="orb o1" use:parallax={0.4}></div>
		<div class="orb o2" use:parallax={-0.2}></div>

		<div class="float f1" style="--d:38" use:parallax={-0.22}><span class="chip glass">Selamanya</span></div>
		<div class="float f2" style="--d:-30" use:parallax={0.18}><span class="chip glass">Forever</span></div>
		<div class="float f3" style="--d:52" use:parallax={-0.3}><span class="chip glass">♥ Kita</span></div>
		<div class="float f4" style="--d:-44" use:parallax={0.26}><span class="chip glass">Cinta</span></div>

		<div class="hero-inner">
			<p class="eyebrow in-up" style="--dl:0.1s">Sebuah cerita cinta</p>
			<div class="heart-wrap" style="--dl:0.3s"><Heart3D /></div>
			<h1 class="names" aria-label="{couple.me} dan {couple.partner}">
				<span class="name" aria-hidden="true">
					{#each [...couple.me] as ch, i (i)}<i style="--i:{i}">{ch}</i>{/each}
				</span>
				<span class="amp" aria-hidden="true">&amp;</span>
				<span class="name" aria-hidden="true">
					{#each [...couple.partner] as ch, i (i)}<i style="--i:{i + 4}">{ch}</i>{/each}
				</span>
			</h1>
			<p class="tagline in-up" style="--dl:1.4s">{couple.tagline}</p>
		</div>

		<a class="scroll-cue" href="#waktu" aria-label="Gulir ke bawah"><i></i><span>Scroll</span></a>
	</section>

	<!-- ===================== COUNTER ===================== -->
	<section class="sec" id="waktu">
		<p class="eyebrow" use:reveal>Waktu yang kita lewati</p>
		<h2 class="title" use:reveal={100}>
			Sudah <em>{counts[0].value.toLocaleString('id-ID')}</em> hari<br />aku memilihmu
		</h2>
		<div class="counts">
			{#each counts as c, i (c.label)}
				<div class="count-wrap" use:reveal={i * 120}>
					<div class="count glass tilt" use:tilt={14}>
						<b>{String(c.value).padStart(2, '0')}</b>
						<span>{c.label}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ===================== STORY ===================== -->
	<section class="sec story" id="cerita" bind:this={timelineEl}>
		<p class="eyebrow" use:reveal>Perjalanan kita</p>
		<h2 class="title" use:reveal={100}>Bab demi bab, <em>kita</em></h2>

		<div class="timeline" style="--lp:{lineP}">
			<div class="line"><i></i></div>
			{#each story as item, i (item.title)}
				<article class="t-item" class:right={i % 2 === 1} use:reveal>
					<span class="dot">{item.emoji}</span>
					<div class="t-card glass tilt" use:tilt={7}>
						<time>{item.date}</time>
						<h3>{item.title}</h3>
						<p>{item.text}</p>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<!-- ===================== 3D GALLERY RING ===================== -->
	<section class="gallery" id="kenangan" bind:this={ringEl}>
		<div class="sticky">
			<div class="g-head">
				<p class="eyebrow">Galeri kenangan</p>
				<h2 class="title">Putar waktu, <em>temukan kita</em></h2>
			</div>
			<div class="scene">
				<div class="carousel" style="--n:{photos.length}; --a:{ringAngle.toFixed(2)}">
					{#each photos as p, i (p.caption)}
						<figure class="pcard" style="--i:{i}">
							{#if p.src}
								<img src={p.src} alt={p.caption} loading="lazy" />
							{:else}
								<div class="ph"><span>{p.emoji}</span><small>Foto #{i + 1}</small></div>
							{/if}
							<figcaption>{p.caption}</figcaption>
						</figure>
					{/each}
				</div>
			</div>
			<p class="hint">↓ scroll untuk memutar ↓</p>
		</div>
	</section>

	<!-- ===================== REASONS ===================== -->
	<section class="sec" id="alasan">
		<p class="eyebrow" use:reveal>Alasan-alasan kecil</p>
		<h2 class="title" use:reveal={100}>Kenapa aku <em>jatuh cinta</em></h2>
		<div class="grid">
			{#each reasons as r, i (r.front)}
				<div class="flip-wrap" use:reveal={(i % 3) * 120}>
					<button
						type="button"
						class="flip"
						class:on={flipped[i]}
						onclick={() => (flipped[i] = !flipped[i])}
						aria-pressed={flipped[i]}
					>
						<span class="face front glass">
							<span class="ico">{r.icon}</span>
							<span class="ft">{r.front}</span>
							<small>sentuh untuk membuka</small>
						</span>
						<span class="face back">
							<span class="bt">{r.back}</span>
						</span>
					</button>
				</div>
			{/each}
		</div>
	</section>

	<!-- ===================== LETTER ===================== -->
	<section class="letter" id="surat" bind:this={letterEl}>
		<div class="sticky letter-sticky">
			<p class="eyebrow">Surat kecil untukmu</p>
			<p class="words">
				{#each words as w, i (i)}<span class:lit={i < lit}>{w}</span>{' '}{/each}
			</p>
			<p class="sign">— {couple.me}</p>
		</div>
	</section>

	<!-- ===================== FINALE ===================== -->
	<section class="finale" data-parallax>
		<div class="rings" aria-hidden="true" use:parallax={-0.1}>
			<div class="rings-spin"><i class="rg a"></i><i class="rg b"></i></div>
		</div>
		<h2 class="script" use:reveal>Aku mencintaimu</h2>
		<p class="fin-text" use:reveal={150}>{couple.finale}</p>
		<p class="hint" use:reveal={250}>Klik di mana saja — hujan hati ♥</p>
		<footer>Dibuat dengan ♥ oleh {couple.me} · {new Date().getFullYear()}</footer>
	</section>
</main>

<style>
	.page {
		position: relative;
		z-index: 2;
	}

	/* ---------- Progress & nav ---------- */
	.progress {
		position: fixed;
		inset: 0 0 auto 0;
		height: 3px;
		z-index: 60;
		transform-origin: left;
		background: linear-gradient(90deg, var(--gold), var(--pink), var(--rose));
		box-shadow: 0 0 14px var(--rose);
	}
	.nav {
		position: fixed;
		z-index: 40;
		top: 14px;
		left: 50%;
		translate: -50% 0;
		display: flex;
		align-items: center;
		gap: 1.4rem;
		padding: 0.55rem 1.1rem;
		border-radius: 999px;
		font-size: 0.85rem;
		animation: navIn 1s var(--ease) 0.6s both;
	}
	.brand {
		font-family: var(--serif);
		font-weight: 700;
		letter-spacing: 0.05em;
	}
	.brand span {
		color: var(--rose);
		margin: 0 0.25em;
	}
	.links {
		display: flex;
		gap: 1.1rem;
	}
	.links a {
		color: var(--muted);
		transition: color 0.2s;
	}
	.links a:hover {
		color: #fff;
	}
	@keyframes navIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
	}

	/* ---------- Hero ---------- */
	.hero {
		--mx: 0;
		--my: 0;
		position: relative;
		min-height: 100svh;
		display: grid;
		place-items: center;
		padding: 6rem 1.25rem 4rem;
		overflow: hidden;
		text-align: center;
	}
	.hero-inner {
		position: relative;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.2rem;
		opacity: calc(1 - var(--hp) * 1.5);
		transform: translateY(calc(var(--hp) * -60px)) scale(calc(1 - var(--hp) * 0.1));
	}
	.in-up {
		animation: inUp 1.2s var(--ease) var(--dl, 0s) both;
	}
	.heart-wrap {
		margin: 1rem 0 2.8rem;
		animation: inZoom 1.6s var(--ease) var(--dl, 0s) both;
	}
	.names {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.1em 0.25em;
		font-family: var(--serif);
		font-weight: 700;
		font-size: clamp(2.6rem, 9vw, 6.2rem);
		line-height: 1.05;
		letter-spacing: -0.02em;
	}
	.name i {
		display: inline-block;
		font-style: normal;
		background: linear-gradient(180deg, #fff 20%, var(--blush) 60%, var(--pink));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: rise 1.2s var(--ease) both;
		animation-delay: calc(0.7s + var(--i) * 70ms);
	}
	.amp {
		font-family: var(--script);
		font-weight: 400;
		font-size: 1.1em;
		color: var(--rose);
		text-shadow: 0 0 40px rgb(255 77 134 / 0.8);
		animation: rise 1.2s var(--ease) 1.1s both;
	}
	.tagline {
		font-family: var(--serif);
		font-style: italic;
		font-size: clamp(1.05rem, 2.4vw, 1.5rem);
		color: var(--muted);
	}
	.orb {
		position: absolute;
		border-radius: 50%;
		translate: 0 var(--py, 0px);
		filter: blur(2px);
		pointer-events: none;
	}
	.o1 {
		width: 38vmin;
		height: 38vmin;
		left: 6%;
		top: 14%;
		background: radial-gradient(circle at 30% 30%, rgb(255 143 177 / 0.45), transparent 70%);
	}
	.o2 {
		width: 30vmin;
		height: 30vmin;
		right: 8%;
		bottom: 12%;
		background: radial-gradient(circle at 30% 30%, rgb(255 207 158 / 0.35), transparent 70%);
	}
	.float {
		position: absolute;
		z-index: 2;
		translate: 0 var(--py, 0px);
		transform: translate3d(calc(var(--mx) * var(--d) * 1px), calc(var(--my) * var(--d) * 1px), 0);
		transition: transform 0.5s var(--ease);
	}
	.chip {
		display: inline-block;
		padding: 0.5rem 1.1rem;
		border-radius: 999px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 1rem;
		animation: bob 6s ease-in-out infinite;
	}
	.f1 {
		left: 9%;
		top: 30%;
	}
	.f2 {
		right: 10%;
		top: 24%;
	}
	.f3 {
		left: 16%;
		bottom: 20%;
	}
	.f4 {
		right: 15%;
		bottom: 26%;
	}
	.f2 .chip {
		animation-delay: -2s;
	}
	.f3 .chip {
		animation-delay: -4s;
	}
	.f4 .chip {
		animation-delay: -1s;
	}
	.scroll-cue {
		position: absolute;
		bottom: 1.6rem;
		left: 50%;
		translate: -50% 0;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--muted);
		opacity: calc(1 - var(--hp) * 4);
	}
	.scroll-cue i {
		width: 22px;
		height: 36px;
		border: 1.5px solid var(--muted);
		border-radius: 14px;
		position: relative;
	}
	.scroll-cue i::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 7px;
		width: 3px;
		height: 7px;
		margin-left: -1.5px;
		border-radius: 3px;
		background: var(--pink);
		animation: wheel 1.8s ease-in-out infinite;
	}

	/* ---------- Counter ---------- */
	.counts {
		margin-top: 3rem;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}
	.count {
		padding: 1.8rem 0.5rem;
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.count b {
		font-family: var(--serif);
		font-size: clamp(1.8rem, 5.6vw, 3.6rem);
		line-height: 1;
		font-variant-numeric: tabular-nums;
		background: linear-gradient(180deg, #fff, var(--pink));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.count span {
		font-size: 0.72rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: var(--muted);
	}

	/* ---------- Timeline ---------- */
	.timeline {
		position: relative;
		margin-top: 4rem;
		text-align: left;
	}
	.line {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: rgb(255 255 255 / 0.1);
	}
	.line i {
		position: absolute;
		inset: 0;
		transform-origin: top;
		transform: scaleY(var(--lp));
		background: linear-gradient(var(--pink), var(--rose));
		box-shadow: 0 0 18px var(--rose);
	}
	.t-item {
		position: relative;
		width: 50%;
		padding: 0 3rem 3.2rem 0;
	}
	.t-item.right {
		margin-left: 50%;
		padding: 0 0 3.2rem 3rem;
	}
	.dot {
		position: absolute;
		top: 1.2rem;
		right: -19px;
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #2a0a1f;
		border: 2px solid var(--rose);
		box-shadow: 0 0 20px rgb(255 77 134 / 0.7);
		font-size: 1.05rem;
		z-index: 2;
	}
	.t-item.right .dot {
		right: auto;
		left: -19px;
	}
	.t-card {
		padding: 1.6rem 1.7rem;
		border-radius: 22px;
	}
	.t-card time {
		font-size: 0.74rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.t-card h3 {
		font-family: var(--serif);
		font-size: 1.5rem;
		margin: 0.35rem 0 0.5rem;
	}
	.t-card p {
		color: var(--muted);
	}

	/* ---------- 3D Gallery ---------- */
	.gallery {
		position: relative;
		height: 430vh;
	}
	.sticky {
		position: sticky;
		top: 0;
		height: 100svh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		text-align: center;
	}
	.g-head {
		padding: 0 1.25rem;
	}
	.scene {
		perspective: 1500px;
		width: 100%;
		height: clamp(260px, 52vh, 420px);
		display: grid;
		place-items: center;
		margin-top: 1rem;
	}
	.carousel {
		--cw: clamp(150px, 22vw, 240px);
		--ch: calc(var(--cw) * 1.35);
		--r: calc(var(--cw) / 2 / tan(180deg / var(--n)) + 34px);
		position: relative;
		width: var(--cw);
		height: var(--ch);
		transform-style: preserve-3d;
		transform: translateZ(calc(var(--r) * -1)) rotateY(calc(var(--a) * -1deg));
	}
	.pcard {
		position: absolute;
		inset: 0;
		margin: 0;
		border-radius: 20px;
		overflow: hidden;
		backface-visibility: hidden;
		border: 1px solid var(--glass-b);
		background: #1d0715;
		box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.7);
		transform: rotateY(calc(var(--i) * 360deg / var(--n))) translateZ(var(--r));
		-webkit-box-reflect: below 8px linear-gradient(transparent 72%, rgb(255 255 255 / 0.16));
	}
	.pcard img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.ph {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background:
			radial-gradient(circle at 30% 20%, rgb(255 143 177 / 0.55), transparent 60%),
			linear-gradient(160deg, #5a1236, #25091a);
	}
	.ph span {
		font-size: clamp(2.4rem, 6vw, 3.6rem);
	}
	.ph small {
		color: var(--muted);
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.65rem;
	}
	.pcard figcaption {
		position: absolute;
		inset: auto 0 0 0;
		padding: 2.2rem 0.9rem 0.9rem;
		text-align: center;
		font-family: var(--serif);
		font-style: italic;
		font-size: 0.95rem;
		background: linear-gradient(transparent, rgb(18 4 12 / 0.9));
	}
	.hint {
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--muted);
		animation: bob 3s ease-in-out infinite;
	}

	/* ---------- Reasons ---------- */
	.grid {
		margin-top: 3.4rem;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.4rem;
	}
	.flip-wrap {
		perspective: 1100px;
	}
	.flip {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 4.6;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		transform-style: preserve-3d;
		transition:
			transform 0.9s var(--ease),
			translate 0.3s;
	}
	.flip:hover {
		translate: 0 -6px;
	}
	.flip.on {
		transform: rotateY(180deg);
	}
	.face {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		padding: 1.4rem;
		border-radius: 24px;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.ico {
		font-size: 2.6rem;
	}
	.ft {
		font-family: var(--serif);
		font-size: 1.45rem;
		font-weight: 600;
	}
	.face small {
		color: var(--muted);
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.back {
		transform: rotateY(180deg);
		background: linear-gradient(150deg, var(--rose), #b0245f);
		box-shadow: 0 25px 60px -20px rgb(255 60 120 / 0.6);
	}
	.bt {
		font-family: var(--serif);
		font-style: italic;
		font-size: clamp(1rem, 1.7vw, 1.25rem);
		line-height: 1.5;
	}

	/* ---------- Letter ---------- */
	.letter {
		position: relative;
		height: 320vh;
	}
	.letter-sticky {
		padding: 0 1.5rem;
		max-width: 900px;
		margin: 0 auto;
	}
	.words {
		font-family: var(--serif);
		font-style: italic;
		font-size: clamp(1.25rem, 3vw, 2.2rem);
		line-height: 1.6;
	}
	.words span {
		color: rgb(255 244 240 / 0.16);
		transition:
			color 0.5s,
			text-shadow 0.5s;
	}
	.words span.lit {
		color: var(--cream);
		text-shadow: 0 0 26px rgb(255 77 134 / 0.45);
	}
	.sign {
		margin-top: 1rem;
		font-family: var(--script);
		font-size: 2.4rem;
		color: var(--pink);
	}

	/* ---------- Finale ---------- */
	.finale {
		position: relative;
		padding: 8rem 1.25rem 3rem;
		text-align: center;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
	}
	.rings {
		--rs: 130px;
		position: relative;
		width: 220px;
		height: 200px;
		perspective: 900px;
		translate: 0 var(--py, 0px);
	}
	.rings-spin {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		animation: ringspin 14s linear infinite;
	}
	.rg {
		position: absolute;
		width: var(--rs);
		height: var(--rs);
		left: calc(50% - var(--rs) / 2);
		top: calc(50% - var(--rs) / 2);
		border-radius: 50%;
		background: conic-gradient(from 20deg, #fff1d6, #e3a95c, #fff1d6, #b9772f, #fff1d6);
		-webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10px));
		mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10px));
	}
	.rg.a {
		transform: translateX(-32px);
	}
	.rg.b {
		transform: translateX(32px) rotateX(90deg);
	}
	.script {
		font-family: var(--script);
		font-weight: 400;
		font-size: clamp(3.2rem, 11vw, 7rem);
		line-height: 1.1;
		color: var(--pink);
		text-shadow: 0 0 50px rgb(255 77 134 / 0.7);
	}
	.fin-text {
		max-width: 34rem;
		font-family: var(--serif);
		font-style: italic;
		font-size: clamp(1.05rem, 2.2vw, 1.4rem);
		color: var(--muted);
	}
	footer {
		margin-top: 4rem;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		color: rgb(255 226 234 / 0.45);
	}

	/* ---------- Keyframes ---------- */
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(70px) rotateX(-70deg);
			filter: blur(10px);
		}
	}
	@keyframes inUp {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
	}
	@keyframes inZoom {
		from {
			opacity: 0;
			transform: scale(0.4) translateY(40px);
		}
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
	@keyframes wheel {
		0% {
			opacity: 0;
			transform: translateY(0);
		}
		30% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@keyframes ringspin {
		from {
			transform: rotateX(-20deg) rotateY(0deg);
		}
		to {
			transform: rotateX(-20deg) rotateY(360deg);
		}
	}

	/* ---------- Responsif ---------- */
	@media (max-width: 860px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.float {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.links {
			display: none;
		}
		.counts {
			grid-template-columns: repeat(2, 1fr);
		}
		.line {
			left: 19px;
		}
		.t-item,
		.t-item.right {
			width: 100%;
			margin-left: 0;
			padding: 0 0 2.4rem 3.4rem;
		}
		.dot,
		.t-item.right .dot {
			left: 0;
			right: auto;
		}
		.g-head .title {
			font-size: 1.9rem;
		}
	}
	@media (max-width: 480px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.flip {
			aspect-ratio: 4 / 3;
		}
	}
</style>
