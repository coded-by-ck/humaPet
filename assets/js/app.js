import { auth, db, firebaseReady } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const STORAGE_KEY = "humapet-social-state-v2";
const DB_NAME = "humapetSocialDB";
const DB_VERSION = 1;
const MEDIA_STORE = "media";
const MAX_MEDIA_WARNING = 6 * 1024 * 1024;

const defaultState = {
  activeView: "feed",
  activeFilter: "Todos",
  searchTerm: "",
  activePostId: null,
  activeStoryId: null,
  userProfile: {
    tutorName: "Ana Clara",
    username: "@anaclara.pet",
    petName: "Mel",
    species: "Cachorro",
    breed: "Golden Retriever",
    age: "3 anos",
    bio: "Carinhosa, brincalhona e apaixonada por passeios.",
    petAvatar: "🐶",
    tutorAvatar: "AC",
    petAvatarMediaId: null,
    tutorAvatarMediaId: null,
  },
  posts: [
    {
      id: 1,
      petName: "Mel",
      tutorName: "Ana Clara",
      avatar: "🐶",
      category: "saúde",
      caption: "Consulta em dia, vacina atualizada e muita saúde!",
      visualTitle: "Check-up completo",
      visualEmoji: "🩺",
      likes: 128,
      liked: false,
      saved: false,
      createdAt: "há 12 min",
      comments: [
        { user: "Rafael", text: "Saúde em primeiro lugar 🐾" },
        { user: "Camila", text: "Que linda!" },
      ],
    },
    {
      id: 2,
      petName: "Thor",
      tutorName: "Ana",
      avatar: "🐕",
      category: "passeio",
      caption: "Primeiro passeio do dia concluído e energia renovada.",
      visualTitle: "Passeio no parque",
      visualEmoji: "🌿",
      likes: 142,
      liked: false,
      saved: false,
      createdAt: "há 28 min",
      comments: [
        { user: "Bia", text: "Passeio faz bem demais!" },
        { user: "Lucas", text: "Thor venceu a preguiça por todos nós." },
      ],
    },
    {
      id: 3,
      petName: "Luna",
      tutorName: "Rafael",
      avatar: "🐩",
      category: "banho",
      caption: "Dia de banho e muito drama por aqui. No fim, saiu cheirosa e plena.",
      visualTitle: "Banho premium",
      visualEmoji: "🫧",
      likes: 248,
      liked: false,
      saved: false,
      createdAt: "há 43 min",
      comments: [
        { user: "Ana Clara", text: "A carinha de injustiçada deve ter vindo forte." },
      ],
    },
    {
      id: 4,
      petName: "Simba",
      tutorName: "Lucas",
      avatar: "🐱",
      category: "humor",
      caption: "Alguém mais tem um gato que acha que manda na casa?",
      visualTitle: "Dono da casa",
      visualEmoji: "😼",
      likes: 319,
      liked: false,
      saved: false,
      createdAt: "há 2 h",
      comments: [
        { user: "Rafael", text: "A resposta é: todos." },
        { user: "Camila", text: "Simba só está exercendo a gerência." },
      ],
    },
  ],
  stories: [
    { id: 1, petName: "Seu pet", avatar: "+", title: "Novo momento", text: "Adicione uma história do seu pet.", seen: false },
    { id: 2, petName: "Mel", avatar: "🐶", title: "Passeio da manhã", text: "Energia renovada por aqui!", seen: false },
    { id: 3, petName: "Thor", avatar: "🐕", title: "Meta concluída", text: "Trinta minutos de parque e muita alegria.", seen: false },
    { id: 4, petName: "Luna", avatar: "🐩", title: "Banho do dia", text: "Drama, espuma e final feliz.", seen: false },
    { id: 5, petName: "Simba", avatar: "🐱", title: "Observando tudo", text: "Julgamento silencioso no sofá.", seen: false },
    { id: 6, petName: "Nina", avatar: "🐾", title: "Rotina tranquila", text: "Água, comida e soneca em dia.", seen: false },
  ],
  checklist: [
    { id: "agua", label: "Água trocada", done: true },
    { id: "alimentacao", label: "Alimentação", done: true },
    { id: "passeio", label: "Passeio", done: false },
    { id: "brincadeira", label: "Brincadeira", done: false },
    { id: "higiene", label: "Higiene", done: false },
  ],
};

let state;
let storyTimer = null;
let currentUser = null;
let currentUserProfile = null;
let unsubscribeFirebasePosts = null;
let savedPostIds = new Set();

const reels = [
  { pet: "Bob", caption: "Quando escuta o pote de ração", icon: "🍽", likes: "12.8k" },
  { pet: "Luna", caption: "O banho que virou novela", icon: "🫧", likes: "8.4k" },
  { pet: "Thor", caption: "Passeio no parque", icon: "🌿", likes: "15.1k" },
  { pet: "Simba", caption: "Meu gato julgando todo mundo", icon: "🐱", likes: "21.7k" },
];

const categories = [
  ["Cães", "🐶"], ["Gatos", "🐱"], ["Adoção", "♡"], ["Saúde", "✓"], ["Dicas", "✦"],
  ["Rotina", "⌁"], ["Produtos", "◇"], ["Serviços", "⌕"], ["Antes e depois", "↔"], ["Pets engraçados", "☻"],
];

const ecosystemModules = [
  ["HumaPet Social", "Compartilhe momentos, siga pets e participe da comunidade.", "social"],
  ["HumaPet Care", "Organize vacinas, consultas, rotina, peso e lembretes.", "care"],
  ["HumaPet Adoção", "Conecte pets que precisam de um lar com pessoas responsáveis.", "adoption"],
  ["HumaPet Vet", "Encontre veterinários, clínicas e acompanhe consultas.", "vet"],
  ["HumaPet Shop", "Descubra petshops, produtos e serviços próximos.", "shop"],
  ["HumaPet Serviços", "Banho e tosa, dog walker, hospedagem, adestramento e transporte pet.", "services"],
];

const adoptionPets = [
  { name: "Amora", species: "Gata", age: "1 ano", city: "São Paulo", status: "Disponível" },
  { name: "Bento", species: "Cachorro", age: "2 anos", city: "Curitiba", status: "Disponível" },
  { name: "Nina", species: "Gata", age: "8 meses", city: "Campinas", status: "Disponível" },
];

const communities = [
  ["Tutores de cães", "Rotina, passeios e boas práticas para cães de todos os portes.", "18.4k membros"],
  ["Gateiros do HumaPet", "Um espaço para quem sabe que o gato é o dono da casa.", "14.2k membros"],
  ["Adoção responsável", "Conexões, orientações e histórias sobre adoção consciente.", "9.8k membros"],
  ["Dicas de saúde pet", "Cuidados preventivos, consultas, vacinas e bem-estar.", "22.1k membros"],
  ["Passeios e parques", "Descubra lugares pet friendly e combine passeios.", "7.6k membros"],
  ["Alimentação natural", "Troca de experiências sobre alimentação com responsabilidade.", "6.9k membros"],
  ["Pets idosos", "Cuidado, carinho e rotina para pets na melhor idade.", "5.4k membros"],
  ["Filhotes", "Primeiros cuidados, adaptação, brincadeiras e socialização.", "12.7k membros"],
];

const services = [
  ["Clínica Vitta Pet", "Veterinário", "Consultas, vacinas e acompanhamento preventivo.", "2,4 km", "4.9"],
  ["HumaPet Shop Jardins", "Petshop", "Produtos, acessórios e itens essenciais para o dia a dia.", "1,2 km", "4.8"],
  ["Banho Zen", "Banho e tosa", "Cuidado estético com conforto e segurança.", "900 m", "4.7"],
  ["Passos Felizes", "Dog walker", "Passeios planejados para rotina e gasto de energia.", "1,8 km", "4.8"],
  ["Casa Pet Weekend", "Hospedagem", "Acolhimento temporário para viagens e emergências.", "3,1 km", "4.6"],
  ["EducaPet", "Adestrador", "Educação positiva e comportamento para pets.", "2,7 km", "4.9"],
  ["Pet Move", "Transporte pet", "Deslocamento seguro para consultas e serviços.", "1,5 km", "4.7"],
  ["Lar de Patas", "Adoção", "ONGs e iniciativas de adoção responsável.", "4,2 km", "4.8"],
];

const careCards = [
  ["Próxima vacina", "Antirrábica em 18 dias", "Saúde"],
  ["Consulta marcada", "12 de junho, 14:00", "Agenda"],
  ["Banho e tosa", "Sábado às 10:30", "Rotina"],
  ["Passeio diário", "Meta de 30 minutos", "Atividade"],
  ["Alimentação", "2 refeições registradas", "Nutrição"],
  ["Medicamento", "Suplemento às 20:00", "Lembrete"],
  ["Peso", "28,4 kg estável", "Saúde"],
  ["Humor do pet", "Feliz e brincalhona", "Bem-estar"],
];

const petTutors = {
  Mel: "Ana Clara",
  Thor: "Ana",
  Luna: "Rafael",
  Simba: "Lucas",
  Nina: "Bia",
};

const categoryIcons = {
  "passeio": "\u{1F33F}",
  ["sa\u00fade"]: "\u{1FA7A}",
  ["sa\u00c3\u00bade"]: "\u{1FA7A}",
  "banho": "\u{1FAE7}",
  "humor": "\u{1F638}",
  ["ado\u00e7\u00e3o"]: "\u2661",
  ["ado\u00c3\u00a7\u00c3\u00a3o"]: "\u2661",
  "dica": "\u2726",
  "rotina": "\u2301",
  "foto": "\u{1F43E}",
  "texto": "\u2726",
  ["v\u00eddeo curto"]: "\u25b6",
  ["v\u00c3\u00addeo curto"]: "\u25b6",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const legacyBrand = ["Huma", "pet"].join("");

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function normalizePost(post, index = 0) {
  const category = post.category || post.type || "rotina";
  const id = post.id === 0 || post.id ? String(post.id) : String(createId() + index);
  return {
    id,
    uid: post.uid || null,
    username: post.username || "",
    petName: post.petName || post.pet || "Pet",
    tutorName: post.tutorName || post.owner || "Tutor HumaPet",
    avatar: post.avatar || post.visualEmoji || post.icon || "🐾",
    category,
    caption: (post.caption || post.text || "Novo momento no HumaPet Social.").replaceAll(legacyBrand, "HumaPet"),
    visualTitle: post.visualTitle || post.petName || post.pet || "Momento pet",
    visualEmoji: post.visualEmoji || post.icon || categoryIcons[category] || "🐾",
    likes: Number(post.likes ?? post.likesCount) || 0,
    commentsCount: Number(post.commentsCount) || (Array.isArray(post.comments) ? post.comments.length : 0),
    liked: Boolean(post.liked),
    saved: Boolean(post.saved),
    createdAt: post.createdAt && typeof post.createdAt === "string" ? post.createdAt : "há pouco",
    isLocal: Boolean(post.isLocal),
    isFirebase: Boolean(post.isFirebase),
    mediaId: post.mediaId || null,
    mediaUrl: post.mediaUrl || null,
    mediaType: post.mediaType || null,
    mediaName: post.mediaName || null,
    mediaSize: Number(post.mediaSize) || 0,
    comments: Array.isArray(post.comments)
      ? post.comments.map((comment) => typeof comment === "string" ? { user: "Tutor", text: comment } : {
        user: comment.user || "Tutor",
        text: comment.text || "",
      })
      : [],
  };
}

function normalizeStory(story, index = 0) {
  return {
    id: Number(story.id) || index + 1,
    petName: story.petName || story.title || "Pet",
    avatar: story.avatar || story.petName?.slice(0, 2) || "🐾",
    title: story.title || "Momento pet",
    text: (story.text || "Um novo story no HumaPet Social.").replaceAll(legacyBrand, "HumaPet"),
    seen: Boolean(story.seen),
    isLocal: Boolean(story.isLocal),
    mediaId: story.mediaId || null,
    mediaType: story.mediaType || null,
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);
    const parsed = JSON.parse(saved);
    const merged = {
      ...structuredClone(defaultState),
      ...parsed,
      activeView: "feed",
      activeFilter: "Todos",
      searchTerm: "",
      activePostId: null,
      activeStoryId: null,
    };
    merged.posts = Array.isArray(merged.posts) ? merged.posts.map(normalizePost) : structuredClone(defaultState.posts);
    merged.stories = Array.isArray(merged.stories) ? merged.stories.map(normalizeStory) : structuredClone(defaultState.stories);
    merged.checklist = Array.isArray(merged.checklist) ? merged.checklist : structuredClone(defaultState.checklist);
    merged.userProfile = { ...structuredClone(defaultState.userProfile), ...(merged.userProfile || {}) };
    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

state = loadState();

function saveState() {
  const persistable = {
    posts: state.posts,
    stories: state.stories,
    checklist: state.checklist,
    userProfile: state.userProfile,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
}

function openMediaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMedia(file) {
  if (!file) return null;
  const db = await openMediaDB();
  const id = `media-${createId()}`;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, "readwrite");
    transaction.objectStore(MEDIA_STORE).put({
      id,
      blob: file,
      type: file.type,
      name: file.name,
      size: file.size,
      createdAt: Date.now(),
    });
    transaction.oncomplete = () => resolve({ id, type: file.type, name: file.name, size: file.size });
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadMedia(id) {
  if (!id) return null;
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, "readonly");
    const request = transaction.objectStore(MEDIA_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearMedia() {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, "readwrite");
    transaction.objectStore(MEDIA_STORE).clear();
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

const saveUserProfile = () => saveState();
const loadUserProfile = () => state.userProfile;
const savePosts = () => saveState();
const loadPosts = () => state.posts;
const saveStories = () => saveState();
const loadStories = () => state.stories;

const escapeHTML = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function renderMediaElement(mediaId, mediaType, altText = "Mídia do post") {
  if (!mediaId || !mediaType) return "";
  const safeId = escapeHTML(mediaId);
  const safeType = escapeHTML(mediaType);
  if (mediaType.startsWith("video/")) {
    return `<video class="local-media" data-media-id="${safeId}" data-media-type="${safeType}" controls playsinline preload="metadata"></video>`;
  }
  return `<img class="local-media" data-media-id="${safeId}" data-media-type="${safeType}" alt="${escapeHTML(altText)}">`;
}

function renderRemoteMedia(mediaUrl, mediaType, altText = "Midia do post") {
  if (!mediaUrl || !mediaType) return "";
  const safeUrl = escapeHTML(mediaUrl);
  if (mediaType.startsWith("video/")) {
    return `<video class="local-media" src="${safeUrl}" controls playsinline preload="metadata"></video>`;
  }
  return `<img class="local-media" src="${safeUrl}" alt="${escapeHTML(altText)}">`;
}

async function hydrateMedia(root = document) {
  const elements = [...root.querySelectorAll("[data-media-id]")];
  await Promise.all(elements.map(async (element) => {
    if (element.dataset.loadedMedia === element.dataset.mediaId) return;
    try {
      const item = await loadMedia(element.dataset.mediaId);
      if (!item?.blob) return;
      element.src = URL.createObjectURL(item.blob);
      element.dataset.loadedMedia = element.dataset.mediaId;
    } catch {
      element.closest(".media-frame")?.classList.add("media-missing");
    }
  }));
}

function previewFile(file, container) {
  if (!container || !file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    container.innerHTML = `<video class="local-media preview-media" src="${url}" controls playsinline></video>`;
  } else {
    container.innerHTML = `<img class="local-media preview-media" src="${url}" alt="Prévia da mídia selecionada">`;
  }
}

const showToast = (message) => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
};

const isFirebaseMode = () => firebaseReady && Boolean(auth && db);

const authMessage = (error) => {
  const code = error?.code || "";
  if (code.includes("invalid-email")) return "Email inválido.";
  if (code.includes("weak-password")) return "Use uma senha com pelo menos 6 caracteres.";
  if (code.includes("email-already-in-use")) return "Esse email já está cadastrado.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email ou senha incorretos.";
  if (code.includes("permission-denied")) return "Permissão negada. Revise as regras do Firebase.";
  return "Não foi possível concluir a ação. Tente novamente.";
};

function requireAuth() {
  if (!isFirebaseMode() || currentUser) return true;
  openAuthModal("login");
  showToast("Entre para continuar.");
  return false;
}

function profileFromUserDoc(data = {}) {
  return {
    tutorName: data.tutorName || "Ana Clara",
    username: data.username || "@anaclara.pet",
    petName: data.mainPetName || data.petName || "Mel",
    species: data.petSpecies || data.species || "Cachorro",
    breed: data.petBreed || data.breed || "Golden Retriever",
    age: data.petAge || data.age || "3 anos",
    bio: data.bio || "Carinhosa, brincalhona e apaixonada por passeios.",
    petAvatar: data.avatarUrl || (data.mainPetName || "Mel").slice(0, 2),
    tutorAvatar: (data.tutorName || "Ana Clara").slice(0, 2),
    petAvatarMediaId: null,
    tutorAvatarMediaId: null,
  };
}

function getActiveProfile() {
  return currentUserProfile || loadUserProfile();
}

function formatFirebaseDate(value) {
  const date = value?.toDate?.();
  if (!date) return "há pouco";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function mapFirebasePost(snapshot) {
  const data = snapshot.data();
  return normalizePost({
    id: snapshot.id,
    uid: data.uid,
    tutorName: data.tutorName,
    username: data.username,
    petName: data.petName,
    avatar: data.petName?.slice(0, 2) || "HP",
    category: data.category || "foto",
    caption: data.caption,
    visualTitle: data.visualTitle || data.category || "Post HumaPet",
    visualEmoji: data.visualEmoji || categoryIcons[data.category] || "♡",
    likesCount: data.likesCount,
    liked: false,
    saved: savedPostIds.has(snapshot.id),
    createdAt: formatFirebaseDate(data.createdAt),
    mediaUrl: data.mediaUrl || null,
    mediaType: data.mediaType || null,
    commentsCount: data.commentsCount || 0,
    comments: [],
    isFirebase: true,
  });
}

async function hydrateFirebaseInteractions() {
  if (!isFirebaseMode() || !currentUser) return;
  await Promise.all(state.posts.filter((post) => post.isFirebase).map(async (post) => {
    const [likeSnap, savedSnap] = await Promise.all([
      getDoc(doc(db, "posts", post.id, "likes", currentUser.uid)),
      getDoc(doc(db, "users", currentUser.uid, "savedPosts", post.id)),
    ]);
    post.liked = likeSnap.exists();
    post.saved = savedSnap.exists();
    if (post.saved) savedPostIds.add(post.id);
  }));
}

async function hydrateFirebaseComments(previewOnly = true) {
  if (!isFirebaseMode()) return;
  await Promise.all(state.posts.filter((post) => post.isFirebase).map(async (post) => {
    const commentsQuery = previewOnly
      ? query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "desc"), limit(2))
      : query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(commentsQuery);
    post.comments = snapshot.docs.map((item) => {
      const data = item.data();
      return { user: data.tutorName || data.username || "Tutor", text: data.text || "" };
    });
  }));
}

async function loadFirebaseCommentsForPost(postId) {
  if (!isFirebaseMode()) return [];
  const commentsQuery = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(commentsQuery);
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { user: data.tutorName || data.username || "Tutor", text: data.text || "" };
  });
}

async function loadSavedPostIds() {
  savedPostIds = new Set();
  if (!isFirebaseMode() || !currentUser) return;
  const snapshot = await getDocs(collection(db, "users", currentUser.uid, "savedPosts"));
  snapshot.forEach((item) => savedPostIds.add(item.id));
}

function openAuthModal(mode = "login") {
  const modal = $("#authModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setAuthMode(mode);
}

function closeAuthModal() {
  const modal = $("#authModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function setAuthMode(mode) {
  $$("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });
  $("#loginForm")?.classList.toggle("is-hidden", mode !== "login");
  $("#signupForm")?.classList.toggle("is-hidden", mode !== "signup");
}

async function createUserProfileDocument(user, formData) {
  const normalizedUsername = formData.username.trim().startsWith("@")
    ? formData.username.trim()
    : `@${formData.username.trim()}`;
  const payload = {
    uid: user.uid,
    tutorName: formData.tutorName,
    email: user.email,
    username: normalizedUsername,
    mainPetName: formData.petName,
    petSpecies: formData.petSpecies,
    petBreed: formData.petBreed,
    petAge: formData.petAge,
    bio: formData.bio,
    avatarUrl: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", user.uid), payload);
  return payload;
}

async function loadFirebaseProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  currentUserProfile = profileFromUserDoc(snapshot.data());
  state.userProfile = currentUserProfile;
  saveUserProfile();
  return currentUserProfile;
}

function renderAuthState() {
  const status = $("#authStatus");
  const openLogin = $("#openLogin");
  const openSignup = $("#openSignup");
  const logoutButton = $("#logoutButton");
  if (!status) return;

  if (!isFirebaseMode()) {
    status.innerHTML = `<strong>Visitante</strong><small>Configure o Firebase para login real. O modal já está disponível.</small>`;
    openLogin.hidden = false;
    openSignup.hidden = false;
    logoutButton.hidden = true;
    return;
  }

  if (currentUser) {
    const profile = getActiveProfile();
    status.innerHTML = `<strong>${escapeHTML(profile.tutorName)}</strong><small>${escapeHTML(profile.petName)} · ${escapeHTML(profile.username)}</small>`;
    openLogin.hidden = true;
    openSignup.hidden = true;
    logoutButton.hidden = false;
    return;
  }

  status.innerHTML = `<strong>Visitante</strong><small>Entre para publicar, curtir e salvar posts.</small>`;
  openLogin.hidden = false;
  openSignup.hidden = false;
  logoutButton.hidden = true;
}

function subscribeToFirebasePosts() {
  if (!isFirebaseMode()) return;
  if (unsubscribeFirebasePosts) unsubscribeFirebasePosts();

  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  unsubscribeFirebasePosts = onSnapshot(postsQuery, async (snapshot) => {
    if (snapshot.empty) {
      state.posts = structuredClone(defaultState.posts).map(normalizePost);
      renderAll();
      return;
    }

    state.posts = snapshot.docs.map(mapFirebasePost);
    try {
      await hydrateFirebaseInteractions();
      await hydrateFirebaseComments(true);
    } catch (error) {
      console.warn("HumaPet Social: não foi possível carregar interações do Firebase.", error);
    }
    renderAll();
    if (state.activePostId && getPost(state.activePostId)) renderPostModal(state.activePostId);
  }, (error) => {
    console.warn("HumaPet Social: feed Firebase indisponível.", error);
    showToast(authMessage(error));
    state.posts = loadPosts().length ? loadPosts() : structuredClone(defaultState.posts).map(normalizePost);
    renderAll();
  });
}

async function bootstrapFirebaseAuth() {
  if (!isFirebaseMode()) {
    renderAuthState();
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentUserProfile = null;
    savedPostIds = new Set();
    if (user) {
      try {
        await loadFirebaseProfile(user.uid);
        await loadSavedPostIds();
      } catch (error) {
        console.warn("HumaPet Social: erro ao carregar perfil.", error);
        showToast(authMessage(error));
      }
    }
    renderAuthState();
    subscribeToFirebasePosts();
    renderAll();
  });
}

const getPost = (id) => state.posts.find((post) => String(post.id) === String(id));

const filteredPosts = () => state.posts.filter((post) => {
  const filter = state.activeFilter === "Todos" || post.category === state.activeFilter || post.category === state.activeFilter.toLowerCase();
  const haystack = `${post.petName} ${post.tutorName} ${post.caption} ${post.category} ${post.visualTitle}`.toLowerCase();
  return filter && haystack.includes(state.searchTerm.toLowerCase());
});

const visualMarkup = (post, button = false) => {
  const hasMedia = post.mediaId || post.mediaUrl;
  const attrs = button
    ? `class="post-visual post-visual-button ${hasMedia ? "media-frame" : ""}" data-action="open-post" data-tone="${escapeHTML(post.category)}" role="button" tabindex="0" aria-label="Abrir post de ${escapeHTML(post.petName)}"`
    : `class="post-visual ${hasMedia ? "media-frame" : ""}" data-tone="${escapeHTML(post.category)}"`;

  if (post.mediaUrl) {
    return `
      <div ${attrs}>
        ${renderRemoteMedia(post.mediaUrl, post.mediaType, `Mídia de ${post.petName}`)}
      </div>
    `;
  }

  if (post.mediaId) {
    return `
      <div ${attrs}>
        ${renderMediaElement(post.mediaId, post.mediaType, `Mídia de ${post.petName}`)}
      </div>
    `;
  }

  return `
    <div ${attrs}>
      <span class="visual-icon" aria-hidden="true">${escapeHTML(post.visualEmoji || categoryIcons[post.category] || post.avatar)}</span>
      <span class="visual-glow" aria-hidden="true"></span>
      <strong>${escapeHTML(post.visualTitle || post.petName)}</strong>
      <small>${escapeHTML(post.category)}</small>
    </div>
  `;
};

const setActiveView = (view) => {
  state.activeView = view;
  $$(".app-view").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });
  $$("[data-view-link]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.viewLink === view);
  });
  $("#searchPanel").classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function renderStories() {
  $("#storiesList").innerHTML = state.stories.map((story) => `
    <button class="story-button ${story.petName === "Seu pet" ? "is-add-story" : ""} ${story.seen ? "is-seen" : ""}" type="button" data-story-id="${story.id}" aria-label="Abrir story de ${escapeHTML(story.petName)}">
      <span class="story-avatar">${story.mediaId ? renderMediaElement(story.mediaId, story.mediaType, `Story de ${story.petName}`) : escapeHTML(story.avatar)}</span>
      <span>${escapeHTML(story.petName)}</span>
    </button>
  `).join("");
  hydrateMedia($("#storiesList"));
}

function renderPosts() {
  const posts = filteredPosts();
  const feed = $("#feedList");

  if (!posts.length) {
    feed.innerHTML = `
      <article class="empty-state">
        <h2>Nenhum post encontrado</h2>
        <p>Tente outro filtro, busque outro termo ou crie uma nova publicação.</p>
      </article>
    `;
    return;
  }

  feed.innerHTML = posts.map((post) => `
    <article class="post-card" data-post-id="${post.id}">
      <header class="post-header">
        <div class="post-avatar circle-avatar" aria-hidden="true">${escapeHTML(post.avatar)}</div>
        <div class="post-meta">
          <div class="post-identity">
            <h3>${escapeHTML(post.petName)}</h3>
            <p><span>${escapeHTML(post.tutorName)}</span> · ${escapeHTML(post.createdAt)}</p>
          </div>
          <button class="more-button" type="button" aria-label="Mais opções do post">...</button>
        </div>
      </header>

      ${visualMarkup(post, true)}

      <p class="post-caption">${escapeHTML(post.caption)}</p>

      <div class="post-stats">
        <strong>${post.likes} curtidas</strong>
        <button type="button" data-action="open-post" class="comments-link">${post.commentsCount || post.comments.length} comentários · Ver comentários</button>
      </div>

      <footer class="post-actions">
        <button class="post-action ${post.liked ? "is-active is-liked" : ""}" type="button" data-action="like" aria-label="Curtir post de ${escapeHTML(post.petName)}"><span>♡</span>Curtir</button>
        <button class="post-action" type="button" data-action="comment" aria-label="Comentar post de ${escapeHTML(post.petName)}"><span>⌕</span>Comentar</button>
        <button class="post-action" type="button" data-action="share" aria-label="Compartilhar post de ${escapeHTML(post.petName)}"><span>↗</span>Compartilhar</button>
        <button class="post-action ${post.saved ? "is-active is-saved" : ""}" type="button" data-action="save" aria-label="Salvar post de ${escapeHTML(post.petName)}"><span>◇</span>${post.saved ? "Salvo" : "Salvar"}</button>
      </footer>

      <div class="comments">
        ${post.comments.slice(0, 2).map((comment) => `<div class="comment"><strong>${escapeHTML(comment.user)}</strong> ${escapeHTML(comment.text)}</div>`).join("")}
      </div>

      <form class="quick-comment is-open" data-comment-form>
        <label class="sr-only">Adicione um comentário</label>
        <input type="text" maxlength="120" placeholder="Adicione um comentário...">
        <button type="submit">Publicar</button>
      </form>
    </article>
  `).join("");
  hydrateMedia(feed);
}

const renderReels = () => {
  $("#reelsList").innerHTML = reels.map((reel) => `
    <article class="reel-card" data-icon="${escapeHTML(reel.icon)}">
      <span class="reel-badge">Reel pet</span>
      <div class="reel-content">
        <h2>${escapeHTML(reel.pet)}</h2>
        <p>${escapeHTML(reel.caption)}</p>
        <small>Som original - HumaPet</small>
      </div>
      <div class="reel-actions" aria-label="Ações do reel de ${escapeHTML(reel.pet)}">
        <button type="button" aria-label="Curtir reel"><span>♡</span><small>${escapeHTML(reel.likes)}</small></button>
        <button type="button" aria-label="Comentar reel"><span>⌕</span><small>128</small></button>
        <button type="button" aria-label="Compartilhar reel"><span>↗</span><small>Enviar</small></button>
        <button type="button" aria-label="Salvar reel"><span>◇</span><small>Salvar</small></button>
      </div>
    </article>
  `).join("");
};

const renderExplore = () => {
  $("#exploreGrid").innerHTML = categories.map(([name, icon]) => `
    <button class="explore-card" type="button" aria-label="Explorar ${escapeHTML(name)}">
      <span aria-hidden="true">${escapeHTML(icon)}</span>
      <h3>${escapeHTML(name)}</h3>
      <p>Descubra ideias, posts e dicas sobre ${escapeHTML(name.toLowerCase())}.</p>
    </button>
  `).join("");
  $("#ecosystemGrid").innerHTML = ecosystemModules.map(([name, description, type]) => `
    <article class="ecosystem-card" data-module="${escapeHTML(type)}">
      <span aria-hidden="true">${type === "care" || type === "vet" ? "✓" : type === "adoption" ? "♡" : type === "shop" ? "◇" : "⌁"}</span>
      <h3>${escapeHTML(name)}</h3>
      <p>${escapeHTML(description)}</p>
    </article>
  `).join("");
  $("#adoptionGrid").innerHTML = adoptionPets.map((pet) => `
    <article class="adoption-card">
      <div class="adoption-avatar" aria-hidden="true">${pet.species === "Gata" ? "🐱" : "🐶"}</div>
      <div>
        <h3>${escapeHTML(pet.name)}</h3>
        <p>${escapeHTML(pet.species)} · ${escapeHTML(pet.age)} · ${escapeHTML(pet.city)}</p>
        <span>${escapeHTML(pet.status)}</span>
      </div>
      <button class="detail-button" type="button">Quero conhecer</button>
    </article>
  `).join("");
};

const renderCommunities = () => {
  $("#communitiesGrid").innerHTML = communities.map(([name, description, members]) => `
    <article class="community-card">
      <h3>${escapeHTML(name)}</h3>
      <p>${escapeHTML(description)}</p>
      <small>${escapeHTML(members)}</small>
      <br><br>
      <button class="join-button" type="button" data-join>Participar</button>
    </article>
  `).join("");
};

const renderServices = () => {
  $("#servicesGrid").innerHTML = services.map(([name, type, description, distance, rating]) => `
    <article class="service-card">
      <h3>${escapeHTML(name)}</h3>
      <div class="service-meta service-type"><span>${escapeHTML(type)}</span></div>
      <p>${escapeHTML(description)}</p>
      <div class="service-meta">
        <span>${escapeHTML(distance)}</span>
        <span>★ ${escapeHTML(rating)}</span>
      </div>
      <button class="detail-button" type="button">Ver detalhes</button>
    </article>
  `).join("");
};

function renderProfile() {
  const profile = getActiveProfile();
  const profilePosts = state.posts.filter((post) => post.isLocal || post.uid === currentUser?.uid || post.petName === profile.petName);
  const totalLikes = profilePosts.reduce((sum, post) => sum + post.likes, 0);
  $("#profileTitle").textContent = profile.petName;
  $("#profileSubtitle").textContent = `${profile.species} · ${profile.breed} · ${profile.age} · Tutor: ${profile.tutorName}`;
  $("#profileBio").textContent = profile.bio;
  const petPhoto = $(".pet-photo");
  petPhoto.textContent = profile.petAvatar || profile.petName.slice(0, 2);
  petPhoto.innerHTML = profile.petAvatarMediaId
    ? renderMediaElement(profile.petAvatarMediaId, "image/*", `Avatar de ${profile.petName}`)
    : escapeHTML(profile.petAvatar || profile.petName.slice(0, 2));
  const composerAvatar = $("#quickComposerAvatar");
  if (composerAvatar) {
    composerAvatar.innerHTML = profile.petAvatarMediaId
      ? renderMediaElement(profile.petAvatarMediaId, "image/*", `Avatar de ${profile.petName}`)
      : escapeHTML(profile.petAvatar || profile.petName.slice(0, 2));
  }

  const stats = $(".stats-row");
  if (stats) {
    stats.innerHTML = `
      <div><strong>${profilePosts.length}</strong><span>Posts</span></div>
      <div><strong>2.8k</strong><span>Seguidores</span></div>
      <div><strong>318</strong><span>Seguindo</span></div>
      <div><strong>${totalLikes}</strong><span>Curtidas</span></div>
    `;
  }

  $("#profileGallery").innerHTML = (profilePosts.length ? profilePosts : state.posts.slice(0, 6)).map((post) => `
    <button class="gallery-card" type="button" data-post-id="${post.id}" data-action="open-post" data-tone="${escapeHTML(post.category)}">
      ${post.mediaUrl ? renderRemoteMedia(post.mediaUrl, post.mediaType, `Post de ${post.petName}`) : post.mediaId ? renderMediaElement(post.mediaId, post.mediaType, `Post de ${post.petName}`) : `<span class="visual-icon" aria-hidden="true">${escapeHTML(post.visualEmoji || post.avatar)}</span><strong>${escapeHTML(post.visualTitle || post.petName)}</strong>`}
    </button>
  `).join("");

  renderSavedPosts();
  hydrateMedia($("#profileGallery"));
  hydrateMedia(petPhoto);
  if ($("#quickComposerAvatar")) hydrateMedia($("#quickComposerAvatar"));
  fillProfileForm();
  updateCreatePetOptions();
}

function fillProfileForm() {
  const profile = getActiveProfile();
  $("#profileTutorName").value = profile.tutorName;
  $("#profileUsername").value = profile.username;
  $("#profilePetName").value = profile.petName;
  $("#profileSpecies").value = profile.species;
  $("#profileBreed").value = profile.breed;
  $("#profileAge").value = profile.age;
  $("#profileBioInput").value = profile.bio;
}

function updateCreatePetOptions() {
  const profile = getActiveProfile();
  const pets = [profile.petName, "Mel", "Thor", "Luna", "Simba", "Nina"].filter(Boolean);
  const uniquePets = [...new Set(pets)];
  $("#createPet").innerHTML = uniquePets.map((pet) => `<option>${escapeHTML(pet)}</option>`).join("");
}

function renderSavedPosts() {
  const saved = state.posts.filter((post) => post.saved);
  const grid = $("#savedPostsGrid");
  if (!grid) return;

  if (!saved.length) {
    grid.innerHTML = `<article class="empty-state compact-empty">Você ainda não salvou nenhum post.</article>`;
    return;
  }

  grid.innerHTML = saved.map((post) => `
    <button class="saved-post-card" type="button" data-post-id="${post.id}" data-action="open-post">
      ${post.mediaUrl ? renderRemoteMedia(post.mediaUrl, post.mediaType, `Post salvo de ${post.petName}`) : post.mediaId ? renderMediaElement(post.mediaId, post.mediaType, `Post salvo de ${post.petName}`) : `<span>${escapeHTML(post.visualEmoji || post.avatar)}</span>`}
      <strong>${escapeHTML(post.visualTitle)}</strong>
      <small>${escapeHTML(post.petName)}</small>
    </button>
  `).join("");
  hydrateMedia(grid);
}

const renderCare = () => {
  $("#careGrid").innerHTML = careCards.map(([title, description, tag]) => `
    <article class="care-card">
      <div class="care-meta"><span>${escapeHTML(tag)}</span></div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
    </article>
  `).join("");

  $("#checklist").innerHTML = state.checklist.map((item) => `
    <label class="check-item">
      <input type="checkbox" data-check-id="${item.id}" ${item.done ? "checked" : ""}>
      <span>${escapeHTML(item.label)}</span>
    </label>
  `).join("");
};

const renderSidebars = () => {
  $("#featuredPets").innerHTML = state.stories.slice(1, 5).map((story) => `
    <article class="featured-item">
      <span class="featured-avatar">${escapeHTML(story.avatar)}</span>
      <div><strong>${escapeHTML(story.petName)}</strong><small>Perfil em destaque</small></div>
    </article>
  `).join("");

  $("#nearServices").innerHTML = services.slice(0, 3).map(([name, type, , distance, rating]) => `
    <article class="near-item">
      <div><strong>${escapeHTML(name)}</strong><small>${escapeHTML(type)} · ${escapeHTML(distance)} · ★ ${escapeHTML(rating)}</small></div>
    </article>
  `).join("");
};

function renderAll() {
  renderStories();
  renderPosts();
  renderReels();
  renderExplore();
  renderCommunities();
  renderServices();
  renderProfile();
  renderCare();
  renderSidebars();
}

async function handleSharePost(id) {
  const post = getPost(id);
  if (!post) return;
  const text = `HumaPet Social · ${post.petName}: ${post.caption}`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    }
    showToast("Link do post copiado!");
  } catch {
    showToast("Link do post copiado!");
  }
}

async function handleCreatePost(event) {
  event.preventDefault();
  const profile = getActiveProfile();
  const petName = $("#createPet").value || profile.petName;
  const category = $("#createType").value;
  const caption = $("#createCaption").value.trim();
  const visualTitle = $("#createVisualTitle").value.trim();
  const visualEmoji = $("#createVisualEmoji").value.trim() || categoryIcons[category] || "🐾";
  const file = $("#createMediaFile")?.files?.[0] || null;
  if (!caption && !visualTitle) {
    showToast("Escreva uma legenda ou um título visual.");
    return;
  }

  if (isFirebaseMode()) {
    if (!requireAuth()) return;
    try {
      await addDoc(collection(db, "posts"), {
        uid: currentUser.uid,
        tutorName: profile.tutorName,
        username: profile.username,
        petName,
        petSpecies: profile.species,
        caption,
        category,
        visualTitle: visualTitle || category,
        visualEmoji,
        mediaUrl: "",
        mediaType: "",
        likesCount: 0,
        commentsCount: 0,
        savedCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      event.target.reset();
      $("#createPreview").innerHTML = "<span>♡</span><strong>Prévia do post</strong>";
      $("#mediaWarning").textContent = "Post salvo como card visual no Firestore.";
      setActiveView("feed");
      showToast("Post publicado com sucesso!");
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }

  let media = null;
  try {
    media = file ? await saveMedia(file) : null;
  } catch {
    showToast("Não foi possível salvar essa mídia localmente.");
    return;
  }

  state.posts.unshift({
    id: String(createId()),
    petName,
    tutorName: profile.tutorName || petTutors[petName] || "Tutor HumaPet",
    avatar: profile.petAvatar || visualEmoji,
    category,
    caption,
    visualTitle,
    visualEmoji,
    mediaId: media?.id || null,
    mediaType: media?.type || null,
    mediaName: media?.name || null,
    mediaSize: media?.size || 0,
    isLocal: true,
    likes: 0,
    liked: false,
    saved: false,
    createdAt: "agora",
    comments: [{ user: "HumaPet", text: "Post novo no feed!" }],
    commentsCount: 1,
  });

  saveState();
  event.target.reset();
  $("#createPreview").innerHTML = "<span>♡</span><strong>Prévia do post</strong>";
  $("#mediaWarning").textContent = "Post salvo como card visual local.";
  renderAll();
  setActiveView("feed");
  showToast("Post publicado com sucesso!");
}

async function handleLikePost(id) {
  const post = getPost(id);
  if (!post) return;
  if (isFirebaseMode() && post.isFirebase) {
    if (!requireAuth()) return;
    try {
      const likeRef = doc(db, "posts", post.id, "likes", currentUser.uid);
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, "posts", post.id), { likesCount: increment(-1), updatedAt: serverTimestamp() });
        post.liked = false;
        post.likes = Math.max(0, post.likes - 1);
        showToast("Curtida removida.");
      } else {
        await setDoc(likeRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, "posts", post.id), { likesCount: increment(1), updatedAt: serverTimestamp() });
        post.liked = true;
        post.likes += 1;
        showToast("Você curtiu esse post.");
      }
      renderPosts();
      renderProfile();
      if (String(state.activePostId) === String(id)) renderPostModal(post.id);
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }
  if (isFirebaseMode() && !requireAuth()) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  saveState();
  renderPosts();
  renderProfile();
  if (String(state.activePostId) === String(id)) renderPostModal(post.id);
  showToast(post.liked ? "Você curtiu esse post." : "Curtida removida.");
}

async function handleSavePost(id) {
  const post = getPost(id);
  if (!post) return;
  if (isFirebaseMode() && post.isFirebase) {
    if (!requireAuth()) return;
    try {
      const savedRef = doc(db, "users", currentUser.uid, "savedPosts", post.id);
      const savedSnap = await getDoc(savedRef);
      if (savedSnap.exists()) {
        await deleteDoc(savedRef);
        await updateDoc(doc(db, "posts", post.id), { savedCount: increment(-1), updatedAt: serverTimestamp() });
        savedPostIds.delete(post.id);
        post.saved = false;
        showToast("Post removido dos salvos.");
      } else {
        await setDoc(savedRef, { postId: post.id, savedAt: serverTimestamp() });
        await updateDoc(doc(db, "posts", post.id), { savedCount: increment(1), updatedAt: serverTimestamp() });
        savedPostIds.add(post.id);
        post.saved = true;
        showToast("Post salvo!");
      }
      renderPosts();
      renderProfile();
      if (String(state.activePostId) === String(id)) renderPostModal(post.id);
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }
  if (isFirebaseMode() && !requireAuth()) return;
  post.saved = !post.saved;
  saveState();
  renderPosts();
  renderProfile();
  if (String(state.activePostId) === String(id)) renderPostModal(post.id);
  showToast(post.saved ? "Post salvo!" : "Post removido dos salvos.");
}

async function handleAddComment(id, text, user = "Você") {
  const post = getPost(id);
  if (!post || !text.trim()) return;
  if (isFirebaseMode() && post.isFirebase) {
    if (!requireAuth()) return;
    try {
      const profile = getActiveProfile();
      await addDoc(collection(db, "posts", post.id, "comments"), {
        uid: currentUser.uid,
        tutorName: profile.tutorName,
        username: profile.username,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), { commentsCount: increment(1), updatedAt: serverTimestamp() });
      post.comments.push({ user: profile.tutorName, text: text.trim() });
      post.commentsCount += 1;
      renderPosts();
      renderProfile();
      if (String(state.activePostId) === String(id)) renderPostModal(post.id);
      showToast("Comentário publicado!");
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }
  if (isFirebaseMode() && !requireAuth()) return;
  post.comments.push({ user, text: text.trim() });
  post.commentsCount += 1;
  saveState();
  renderPosts();
  renderProfile();
  if (String(state.activePostId) === String(id)) renderPostModal(post.id);
  showToast("Comentário publicado!");
}

function renderPostModal(id) {
  const post = getPost(id);
  if (!post) return;
  state.activePostId = String(id);
  $("#postModalBody").innerHTML = `
    <div class="modal-visual-wrap">${visualMarkup(post)}</div>
    <section class="modal-content-wrap">
      <header class="post-header modal-post-header">
        <div class="post-avatar circle-avatar" aria-hidden="true">${escapeHTML(post.avatar)}</div>
        <div class="post-meta">
          <div class="post-identity">
            <h2 id="postModalTitle">${escapeHTML(post.petName)}</h2>
            <p><span>${escapeHTML(post.tutorName)}</span>${post.username ? ` · ${escapeHTML(post.username)}` : ""} · ${escapeHTML(post.createdAt)}</p>
          </div>
          <span class="type-badge">${escapeHTML(post.category)}</span>
        </div>
      </header>
      <p class="post-caption">${escapeHTML(post.caption)}</p>
      <div class="post-stats"><strong>${post.likes} curtidas</strong><span>${post.commentsCount || post.comments.length} comentários</span></div>
      <footer class="post-actions modal-actions">
        <button class="post-action ${post.liked ? "is-active is-liked" : ""}" type="button" data-modal-action="like"><span>♡</span>Curtir</button>
        <button class="post-action" type="button" data-modal-action="share"><span>↗</span>Compartilhar</button>
        <button class="post-action ${post.saved ? "is-active is-saved" : ""}" type="button" data-modal-action="save"><span>◇</span>${post.saved ? "Salvo" : "Salvar"}</button>
      </footer>
      <div class="comments modal-comments">
        ${post.comments.length ? post.comments.map((comment) => `<div class="comment"><strong>${escapeHTML(comment.user)}</strong> ${escapeHTML(comment.text)}</div>`).join("") : `<div class="comment">Ainda não há comentários.</div>`}
      </div>
      <form class="quick-comment is-open modal-comment-form" data-modal-comment>
        <label class="sr-only">Adicionar comentário</label>
        <input type="text" maxlength="120" placeholder="Adicione um comentário...">
        <button type="submit">Publicar</button>
      </form>
    </section>
  `;
  $("#postModal").classList.add("is-open");
  $("#postModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  hydrateMedia($("#postModal"));

  if (post.isFirebase) {
    loadFirebaseCommentsForPost(post.id).then((comments) => {
      const livePost = getPost(post.id);
      if (!livePost || String(state.activePostId) !== String(post.id)) return;
      livePost.comments = comments;
      const box = $("#postModal .modal-comments");
      if (box) {
        box.innerHTML = comments.length
          ? comments.map((comment) => `<div class="comment"><strong>${escapeHTML(comment.user)}</strong> ${escapeHTML(comment.text)}</div>`).join("")
          : `<div class="comment">Ainda não há comentários.</div>`;
      }
    }).catch(() => showToast("Não foi possível carregar os comentários."));
  }
}

function closePostModal() {
  $("#postModal")?.classList.remove("is-open");
  $("#postModal")?.setAttribute("aria-hidden", "true");
  state.activePostId = null;
  document.body.classList.remove("modal-open");
}

function openStoryCreateModal() {
  $("#storyCreateModal")?.classList.add("is-open");
  $("#storyCreateModal")?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeStoryCreateModal() {
  $("#storyCreateModal")?.classList.remove("is-open");
  $("#storyCreateModal")?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function closeStoryModal() {
  window.clearTimeout(storyTimer);
  $("#storyModal")?.classList.remove("is-open");
  $("#storyModal")?.setAttribute("aria-hidden", "true");
  state.activeStoryId = null;
  document.body.classList.remove("modal-open");
}

function renderStoryModal(id) {
  const story = state.stories.find((item) => item.id === Number(id));
  if (!story) return;
  if (story.petName === "Seu pet") {
    openStoryCreateModal();
    return;
  }
  story.seen = true;
  state.activeStoryId = story.id;
  saveState();
  renderStories();
  $("#storyModalBody").innerHTML = `
    <div class="story-big-avatar">${story.mediaId ? renderMediaElement(story.mediaId, story.mediaType, `Story de ${story.petName}`) : escapeHTML(story.avatar)}</div>
    <span class="kicker">${escapeHTML(story.petName)}</span>
    <h2 id="storyModalTitle">${escapeHTML(story.title)}</h2>
    <p>${escapeHTML(story.text)}</p>
    ${story.isLocal ? `<button class="secondary-button remove-story-button" type="button" data-remove-story="${story.id}">Remover story</button>` : ""}
  `;
  hydrateMedia($("#storyModalBody"));
  $("#storyProgressBar").style.animation = "none";
  window.requestAnimationFrame(() => {
    $("#storyProgressBar").style.animation = "storyProgress 4s linear forwards";
  });
  $("#storyModal").classList.add("is-open");
  $("#storyModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.clearTimeout(storyTimer);
  storyTimer = window.setTimeout(closeStoryModal, 4200);
}

function resetCreatePreview() {
  $("#createPreview").innerHTML = "<span>♡</span><strong>Prévia do post</strong>";
  $("#mediaWarning").textContent = "Nesta fase, os posts usam card visual com categoria, título e emoji.";
}

document.addEventListener("click", async (event) => {
  const viewLink = event.target.closest("[data-view-link]");
  if (viewLink) {
    event.preventDefault();
    if (viewLink.dataset.viewLink === "create" && !requireAuth()) return;
    setActiveView(viewLink.dataset.viewLink);
    return;
  }

  const authMode = event.target.closest("[data-auth-mode]");
  if (authMode) {
    setAuthMode(authMode.dataset.authMode);
    return;
  }

  if (event.target.closest("#openLogin")) {
    openAuthModal("login");
    return;
  }

  if (event.target.closest("#openSignup")) {
    openAuthModal("signup");
    return;
  }

  if (event.target.closest("#logoutButton")) {
    if (!isFirebaseMode()) {
      showToast("Firebase ainda não configurado.");
      return;
    }
    try {
      await signOut(auth);
      showToast("Você saiu da conta.");
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.activeFilter = filter.dataset.filter;
    $$(".pill-filter").forEach((button) => button.classList.toggle("is-active", button === filter));
    renderPosts();
    return;
  }

  const storyButton = event.target.closest("[data-story-id]");
  if (storyButton) {
    renderStoryModal(storyButton.dataset.storyId);
    return;
  }

  const quickCreate = event.target.closest("[data-quick-create]");
  if (quickCreate) {
    if (!requireAuth()) return;
    $("#createType").value = quickCreate.dataset.quickCreate;
    $("#createType").dispatchEvent(new Event("change"));
    setActiveView("create");
    $("#createCaption").focus();
    return;
  }

  const postCard = event.target.closest("[data-post-id]");
  const actionButton = event.target.closest("[data-action]");
  if (postCard && actionButton) {
    const id = postCard.dataset.postId;
    const action = actionButton.dataset.action;
    if (action === "open-post" && event.target.closest("video.local-media")) return;
    if (action === "like") await handleLikePost(id);
    if (action === "save") await handleSavePost(id);
    if (action === "share") await handleSharePost(id);
    if (action === "comment") postCard.querySelector("[data-comment-form] input").focus();
    if (action === "open-post") renderPostModal(id);
    return;
  }

  const joinButton = event.target.closest("[data-join]");
  if (joinButton) {
    joinButton.classList.toggle("is-joined");
    joinButton.textContent = joinButton.classList.contains("is-joined") ? "Participando" : "Participar";
    showToast(joinButton.classList.contains("is-joined") ? "Você entrou na comunidade." : "Você saiu da comunidade.");
  }

  if (event.target.closest(".reel-actions button")) showToast("Interação rápida simulada.");
  if (event.target.closest(".explore-card")) showToast("Categoria aberta em modo mockado.");
  if (event.target.closest(".detail-button")) showToast("Detalhes do serviço em modo mockado.");
  if (event.target.closest("[data-close-auth]")) closeAuthModal();
  if (event.target.closest("[data-close-modal]")) closePostModal();
  if (event.target.closest("[data-close-story]")) closeStoryModal();
  if (event.target.closest("[data-close-story-create]")) closeStoryCreateModal();
  if (event.target === $("#authModal")) closeAuthModal();
  if (event.target === $("#postModal")) closePostModal();
  if (event.target === $("#storyModal")) closeStoryModal();
  if (event.target === $("#storyCreateModal")) closeStoryCreateModal();

  const removeStory = event.target.closest("[data-remove-story]");
  if (removeStory) {
    state.stories = state.stories.filter((story) => story.id !== Number(removeStory.dataset.removeStory));
    saveStories();
    closeStoryModal();
    renderStories();
    showToast("Story removido.");
  }
});

$("#loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isFirebaseMode()) {
    showToast("Configure o Firebase em assets/js/firebase.js para usar login real.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, $("#loginEmail").value.trim(), $("#loginPassword").value);
    event.target.reset();
    closeAuthModal();
    showToast("Login realizado com sucesso!");
  } catch (error) {
    showToast(authMessage(error));
  }
});

$("#signupForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isFirebaseMode()) {
    showToast("Configure o Firebase em assets/js/firebase.js para criar conta real.");
    return;
  }
  const formData = {
    tutorName: $("#signupTutorName").value.trim(),
    username: $("#signupUsername").value.trim(),
    email: $("#signupEmail").value.trim(),
    password: $("#signupPassword").value,
    petName: $("#signupPetName").value.trim(),
    petSpecies: $("#signupPetSpecies").value.trim(),
    petBreed: $("#signupPetBreed").value.trim(),
    petAge: $("#signupPetAge").value.trim(),
    bio: $("#signupBio").value.trim(),
  };
  try {
    const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    await updateProfile(credential.user, { displayName: formData.tutorName });
    const profileData = await createUserProfileDocument(credential.user, formData);
    currentUserProfile = profileFromUserDoc(profileData);
    state.userProfile = currentUserProfile;
    saveUserProfile();
    event.target.reset();
    closeAuthModal();
    renderAll();
    renderAuthState();
    showToast("Conta criada com sucesso!");
  } catch (error) {
    showToast(authMessage(error));
  }
});

$("#feedList")?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-comment-form]");
  if (!form) return;
  event.preventDefault();
  const id = form.closest("[data-post-id]").dataset.postId;
  const input = form.querySelector("input");
  await handleAddComment(id, input.value);
  input.value = "";
});

$("#postModal")?.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-modal-action]");
  if (!action || !state.activePostId) return;
  if (action.dataset.modalAction === "like") await handleLikePost(state.activePostId);
  if (action.dataset.modalAction === "save") await handleSavePost(state.activePostId);
  if (action.dataset.modalAction === "share") await handleSharePost(state.activePostId);
});

$("#postModal")?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-modal-comment]");
  if (!form || !state.activePostId) return;
  event.preventDefault();
  const input = form.querySelector("input");
  await handleAddComment(state.activePostId, input.value);
  input.value = "";
});

$("#createPostForm")?.addEventListener("submit", handleCreatePost);
$("#createPostForm")?.addEventListener("reset", () => window.setTimeout(resetCreatePreview, 0));

$("#createMediaFile")?.addEventListener("change", () => {
  $("#mediaWarning").textContent = "Upload de imagem/vídeo está desativado nesta fase. Use título, categoria e emoji.";
});

$("#createCaption")?.addEventListener("input", () => {
  $("#createPreview strong").textContent = $("#createVisualTitle").value.trim() || $("#createCaption").value.trim() || "Prévia do post";
});

$("#createVisualTitle")?.addEventListener("input", (event) => {
  $("#createPreview strong").textContent = event.target.value.trim() || "Prévia do post";
});

$("#createVisualEmoji")?.addEventListener("input", (event) => {
  $("#createPreview span").textContent = event.target.value.trim() || "♡";
});

$("#createType")?.addEventListener("change", (event) => {
  $("#createVisualEmoji").value = categoryIcons[event.target.value] || "🐾";
  $("#createPreview span").textContent = $("#createVisualEmoji").value;
});

$("#profileForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isFirebaseMode()) {
    if (!requireAuth()) return;
    const updatedProfile = {
      tutorName: $("#profileTutorName").value.trim() || "Tutor HumaPet",
      username: $("#profileUsername").value.trim() || "@humapet",
      mainPetName: $("#profilePetName").value.trim() || "Mel",
      petSpecies: $("#profileSpecies").value.trim() || "Cachorro",
      petBreed: $("#profileBreed").value.trim() || "Sem raça definida",
      petAge: $("#profileAge").value.trim() || "Idade não informada",
      bio: $("#profileBioInput").value.trim() || "Tutor conectado ao HumaPet Social.",
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, "users", currentUser.uid), updatedProfile);
      currentUserProfile = profileFromUserDoc(updatedProfile);
      state.userProfile = currentUserProfile;
      saveUserProfile();
      renderAuthState();
      renderProfile();
      showToast("Perfil atualizado no Firebase.");
    } catch (error) {
      showToast(authMessage(error));
    }
    return;
  }
  state.userProfile = {
    ...state.userProfile,
    tutorName: $("#profileTutorName").value.trim() || "Ana Clara",
    username: $("#profileUsername").value.trim() || "@anaclara.pet",
    petName: $("#profilePetName").value.trim() || "Mel",
    species: $("#profileSpecies").value.trim() || "Cachorro",
    breed: $("#profileBreed").value.trim() || "Golden Retriever",
    age: $("#profileAge").value.trim() || "3 anos",
    bio: $("#profileBioInput").value.trim() || "Carinhosa, brincalhona e apaixonada por passeios.",
    petAvatar: ($("#profilePetName").value.trim() || "Mel").slice(0, 2),
    tutorAvatar: ($("#profileTutorName").value.trim() || "Ana Clara").slice(0, 2),
  };
  saveUserProfile();
  renderProfile();
  renderSidebars();
  showToast("Perfil salvo com sucesso!");
});

$("#editProfileButton")?.addEventListener("click", () => {
  $("#profileSettings").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#profileTutorName").focus();
});

$("#clearLocalData")?.addEventListener("click", async () => {
  if (!window.confirm("Limpar dados locais e restaurar o protótipo inicial?")) return;
  localStorage.removeItem(STORAGE_KEY);
  await clearMedia();
  state = loadState();
  renderAll();
  setActiveView("feed");
  showToast("Dados locais limpos.");
});

$("#storyMediaFile")?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  previewFile(file, $("#storyUploadPreview"));
});

$("#storyForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("#storyMediaFile").files[0];
  let media = null;
  try {
    media = file ? await saveMedia(file) : null;
  } catch {
    showToast("Não foi possível salvar a mídia do story.");
    return;
  }
  const profile = getActiveProfile();
  state.stories.unshift({
    id: createId(),
    petName: profile.petName,
    avatar: profile.petAvatar || profile.petName.slice(0, 2),
    title: $("#storyTitleInput").value.trim(),
    text: $("#storyTextInput").value.trim(),
    seen: false,
    isLocal: true,
    mediaId: media?.id || null,
    mediaType: media?.type || null,
  });
  saveStories();
  event.target.reset();
  $("#storyUploadPreview").innerHTML = "<span>+</span><strong>Prévia do story</strong>";
  closeStoryCreateModal();
  renderStories();
  showToast("Story publicado com sucesso!");
});

$("#searchInput")?.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  renderPosts();
  if (state.activeView !== "feed") setActiveView("feed");
});

$("#mobileSearchToggle")?.addEventListener("click", () => {
  $("#searchPanel").classList.toggle("is-open");
  $("#searchInput").focus();
});

$("#checklist")?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-check-id]");
  if (!checkbox) return;
  const item = state.checklist.find((check) => check.id === checkbox.dataset.checkId);
  item.done = checkbox.checked;
  saveState();
  showToast(item.done ? "Cuidado marcado como feito." : "Cuidado desmarcado.");
});

$("#shareProfile")?.addEventListener("click", async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(`Perfil de ${getActiveProfile().petName} no HumaPet Social.`);
    }
    showToast("Perfil copiado para compartilhar.");
  } catch {
    showToast("Compartilhamento de perfil simulado.");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuthModal();
    closePostModal();
    closeStoryModal();
    closeStoryCreateModal();
  }
});

const setupDesktopSearch = () => {
  $("#searchPanel")?.classList.toggle("is-desktop", window.matchMedia("(min-width: 860px)").matches);
};

window.addEventListener("resize", setupDesktopSearch);

renderAll();
setupDesktopSearch();
bootstrapFirebaseAuth();

