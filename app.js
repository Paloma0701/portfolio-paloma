const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dock = document.querySelector('.dock');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let dockResetTimer;
const dockItems = [...dock.querySelectorAll('.dock-item')];
function resetDock() { clearTimeout(dockResetTimer); dockItems.forEach(item => { item.style.removeProperty('--shift'); item.style.removeProperty('--scale'); item.style.removeProperty('--lift'); item.style.removeProperty('--z'); item.classList.remove('tapped'); }); }
function magnifyDock(clientX) {
  if (reducedMotion.matches) return;
  const bounds = dock.getBoundingClientRect();
  const influences = dockItems.map(item => {
    const center = bounds.left + item.offsetLeft + item.offsetWidth / 2;
    return Math.max(0, 1 - Math.abs(clientX - center) / (item.offsetWidth * 1.6));
  });
  const magnification = finePointer.matches ? .43 : .24;
  const expansions = influences.map((value, i) => value * magnification * dockItems[i].offsetWidth);
  let shift = -expansions.reduce((a, b) => a + b, 0) / 2;
  dockItems.forEach((item, i) => {
    item.style.setProperty('--shift', `${shift + expansions[i] / 2}px`);
    item.style.setProperty('--scale', (1 + influences[i] * magnification).toFixed(3));
    item.style.setProperty('--lift', `${-influences[i] * 9}px`);
    item.style.setProperty('--z', Math.round(influences[i] * 10) + 1);
    shift += expansions[i];
  });
}
dock.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  resetDock();
  magnifyDock(e.clientX);
});
dock.addEventListener('pointermove', e => {
  if (e.pointerType !== 'touch' || e.buttons) magnifyDock(e.clientX);
});
dock.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') resetDock(); });
dock.addEventListener('pointercancel', resetDock);
dockItems.forEach(item => {
  item.addEventListener('focus', () => { const r = item.getBoundingClientRect(); magnifyDock(r.left + r.width / 2); });
  item.addEventListener('blur', resetDock);
  item.addEventListener('click', () => { resetDock(); item.classList.add('tapped'); const r = item.getBoundingClientRect(); magnifyDock(r.left + r.width / 2); if (!finePointer.matches) dockResetTimer = setTimeout(resetDock, 1600); });
});
document.addEventListener('pointerdown', e => { if (!dock.contains(e.target)) resetDock(); });
const stage = document.querySelector('#carousel-stage');
const carousel = document.querySelector('.carousel');
const counter = document.querySelector('#project-counter');
const dialog = document.querySelector('.video-dialog');
const player = document.querySelector('#project-video');
const autoButton = document.querySelector('#autoplay');
let projects = [], cards = [], current = 0, paused = reducedMotion.matches, inView = false, hovering = false, lastInteraction = Date.now();
let lastCard = null, pointerStart = null, swiped = false;
function renderCarousel() {
  const mobile = window.innerWidth <= 700;
  const spacing = mobile ? Math.min(stage.clientWidth * .43, 245) : stage.clientWidth * .185;
  cards.forEach((card, index) => {
    let offset = (index - current + projects.length) % projects.length;
    if (offset > projects.length / 2) offset -= projects.length;
    card.dataset.position = String(offset);
    card.dataset.hidden = String(Math.abs(offset) > 2);
    card.style.setProperty('--offset', `${offset * spacing}px`);
    card.tabIndex = Math.abs(offset) <= 2 ? 0 : -1;
    card.setAttribute('aria-hidden', String(Math.abs(offset) > 2));
    card.setAttribute('aria-label', offset === 0 ? `Assistir: ${projects[index].title}` : `Selecionar: ${projects[index].title}`);
    card.setAttribute('aria-current', String(offset === 0));
  });
  counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
}
function move(amount, manual = true) {
  if (!projects.length) return;
  current = (current + amount + projects.length) % projects.length;
  if (manual) lastInteraction = Date.now();
  renderCarousel();
}
function openVideo(index, card) {
  lastCard = card;
  const project = projects[index];
  document.querySelector('#video-title').textContent = project.title;
  document.querySelector('#video-error').hidden = true;
  document.querySelector('#video-download').href = project.src;
  player.poster = project.poster;
  player.src = project.src;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  player.play().catch(() => {});
}
function closeVideo() { dialog.close(); }
dialog.addEventListener('close', () => {
  player.pause(); player.removeAttribute('src'); player.load();
  document.body.style.overflow = '';
  lastInteraction = Date.now();
  lastCard?.focus({ preventScroll: true });
});
document.querySelector('.close-video').addEventListener('click', closeVideo);
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeVideo(); } });
player.addEventListener('error', () => { if (player.hasAttribute('src')) document.querySelector('#video-error').hidden = false; });
document.querySelector('#previous').addEventListener('click', () => move(-1));
document.querySelector('#next').addEventListener('click', () => move(1));
function updateAutoplay() { autoButton.setAttribute('aria-pressed', String(paused)); autoButton.setAttribute('aria-label', paused ? 'Ativar rotação automática' : 'Pausar rotação automática'); }
autoButton.addEventListener('click', () => { paused = !paused; lastInteraction = Date.now(); updateAutoplay(); });
updateAutoplay();
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; resetDock(); updateAutoplay(); });
carousel.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); } });
carousel.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hovering = true; });
carousel.addEventListener('pointerleave', () => { hovering = false; });
stage.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0) return;
  pointerStart = { x: e.clientX, y: e.clientY };
  swiped = false;
  lastInteraction = Date.now();
  e.target.closest('.project-card')?.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointerup', e => {
  if (!pointerStart) return;
  const dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; move(dx < 0 ? 1 : -1); }
  pointerStart = null;
});
stage.addEventListener('pointercancel', () => { pointerStart = null; });
window.addEventListener('resize', () => { if (projects.length) renderCarousel(); });
new IntersectionObserver(entries => { inView = entries[0].isIntersecting; }, { threshold: .25 }).observe(carousel);
setInterval(() => { if (inView && !paused && !hovering && !document.hidden && !dialog.open && !(finePointer.matches && carousel.contains(document.activeElement)) && Date.now() - lastInteraction > 5500) move(1, false); }, 5500);
async function loadProjects() {
  try {
    const response = await fetch('assets/projects.json');
    if (!response.ok) throw new Error('Project list unavailable');
    projects = await response.json();
    if (!projects.length) throw new Error('Project list empty');
    stage.replaceChildren();
    cards = projects.map((project, index) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'project-card';
      const image = document.createElement('img'); image.src = project.poster; image.alt = ''; image.width = 480; image.height = 854; image.loading = index < 3 || index > projects.length - 3 ? 'eager' : 'lazy'; image.draggable = false;
      const shade = document.createElement('span'); shade.className = 'card-shade';
      const caption = document.createElement('span'); caption.className = 'card-caption';
      const title = document.createElement('strong'); title.textContent = project.title;
      const label = document.createElement('span'); label.textContent = 'Edição de vídeo';
      caption.append(label, title);
      const play = document.createElement('span'); play.className = 'card-play'; play.setAttribute('aria-hidden', 'true'); play.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 3v18l16-9z"/></svg>';
      card.append(image, shade, caption, play);
      card.addEventListener('click', () => {
        if (swiped) { swiped = false; return; }
        lastInteraction = Date.now();
        if (index === current) openVideo(index, card);
        else { current = index; renderCarousel(); }
      });
      stage.append(card);
      return card;
    });
    renderCarousel();
  } catch {
    stage.replaceChildren();
    const message = document.createElement('p'); message.className = 'loading'; message.textContent = 'Os projetos não carregaram. ';
    const retry = document.createElement('button'); retry.textContent = 'Tentar novamente'; retry.addEventListener('click', loadProjects); message.append(retry); stage.append(message);
  }
}
loadProjects();

const skillsSection = document.querySelector('.skills');
skillsSection.classList.add('animate-skills');
skillsSection.querySelectorAll('.skill-track > span').forEach((bar, index) => bar.style.setProperty('--bar-delay', `${index * 140}ms`));
const skillsObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) {
      skillsSection.classList.remove('is-visible');
    } else if (entry.intersectionRatio >= .12) {
      skillsSection.classList.add('is-visible');
    }
  }
}, { threshold: [0, .12] });
skillsObserver.observe(skillsSection);
