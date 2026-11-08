import type { Action } from 'svelte/action';

/** Munculkan elemen dengan animasi saat masuk viewport. */
export const reveal: Action<HTMLElement, number | undefined> = (node, delay = 0) => {
	node.classList.add('reveal');
	node.style.transitionDelay = `${delay}ms`;
	const io = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				node.classList.add('in');
				io.disconnect();
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
};

/* ---------- Parallax (satu listener scroll untuk semua elemen) ---------- */
const subs = new Set<() => void>();
let queued = false;
let bound = false;

function run() {
	queued = false;
	subs.forEach((fn) => fn());
}
function queue() {
	if (!queued) {
		queued = true;
		requestAnimationFrame(run);
	}
}
function bindOnce() {
	if (bound) return;
	bound = true;
	addEventListener('scroll', queue, { passive: true });
	addEventListener('resize', queue);
}

/**
 * Parallax berbasis scroll. Nilai positif = bergerak lebih lambat (terasa jauh),
 * negatif = lebih cepat (terasa dekat). Hasilnya disimpan di CSS variable --py.
 */
export const parallax: Action<HTMLElement, number | undefined> = (node, speed = 0.15) => {
	let k = speed;
	const host = (node.closest('[data-parallax]') as HTMLElement | null) ?? node.parentElement ?? node;
	const update = () => {
		const r = host.getBoundingClientRect();
		if (r.bottom < -300 || r.top > innerHeight + 300) return;
		const d = r.top + r.height / 2 - innerHeight / 2;
		node.style.setProperty('--py', `${(-d * k).toFixed(1)}px`);
	};
	bindOnce();
	subs.add(update);
	update();
	return {
		update(v) {
			k = v ?? 0.15;
			update();
		},
		destroy() {
			subs.delete(update);
		}
	};
};

/** Efek miring 3D mengikuti kursor + kilau cahaya. */
export const tilt: Action<HTMLElement, number | undefined> = (node, max = 10) => {
	let m = max;
	const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!fine || reduce) return {};
	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width - 0.5;
		const y = (e.clientY - r.top) / r.height - 0.5;
		node.style.setProperty('--rx', `${(-y * m * 2).toFixed(2)}deg`);
		node.style.setProperty('--ry', `${(x * m * 2).toFixed(2)}deg`);
		node.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
		node.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
	};
	const leave = () => {
		node.style.setProperty('--rx', '0deg');
		node.style.setProperty('--ry', '0deg');
	};
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		update(v) {
			m = v ?? 10;
		},
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
};
