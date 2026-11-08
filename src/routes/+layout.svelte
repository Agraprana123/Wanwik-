<script lang="ts">
	import './layout.css';
	import { couple } from '../lib/config';

	let { children } = $props();
</script>

<svelte:head>
	<title>{couple.me} &amp; {couple.partner} · Cerita Kita</title>
	<meta name="description" content="Sebuah rumah kecil di internet untuk cerita cinta kita." />
	<meta name="theme-color" content="#1a0a07" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="grain" aria-hidden="true"></div>

{@render children()}
