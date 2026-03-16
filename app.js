import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  runTransaction,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*
  1) Replace this config with your own Firebase config
  2) Keep the collection name as "guesses" unless you want to change it
*/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const boyBtn = document.getElementById("boyBtn");
const girlBtn = document.getElementById("girlBtn");
const nameInput = document.getElementById("nameInput");
const messageEl = document.getElementById("message");

const boyCountEl = document.getElementById("boyCount");
const girlCountEl = document.getElementById("girlCount");
const boyPercentEl = document.getElementById("boyPercent");
const girlPercentEl = document.getElementById("girlPercent");
const boyBarEl = document.getElementById("boyBar");
const girlBarEl = document.getElementById("girlBar");
const totalVotesEl = document.getElementById("totalVotes");
const guessesListEl = document.getElementById("guessesList");

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setVotingState(disabled) {
  boyBtn.disabled = disabled;
  girlBtn.disabled = disabled;
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#d93025" : "#2c7a3f";
}

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "just now";
  return timestamp.toDate().toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function createConfetti() {
  for (let i = 0; i < 42; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${8 + Math.random() * 10}px`;
    piece.style.background = Math.random() > 0.5 ? "#5aa9ff" : "#ff86b7";
    piece.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

async function submitGuess(choice) {
  const rawName = nameInput.value;
  const cleanName = rawName.trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName) {
    showMessage("Please enter your name first.", true);
    return;
  }

  if (cleanName.length < 2) {
    showMessage("Please enter a longer name.", true);
    return;
  }

  setVotingState(true);
  showMessage("Submitting your vote...");

  const guessRef = doc(db, "guesses", normalized);

  try {
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(guessRef);

      if (existing.exists()) {
        throw new Error("duplicate-name");
      }

      transaction.set(guessRef, {
        name: cleanName,
        normalizedName: normalized,
        guess: choice,
        createdAt: new Date()
      });
    });

    showMessage(
      choice === "Boy"
        ? `Thanks, ${cleanName}! You joined Team Boy 💙`
        : `Thanks, ${cleanName}! You joined Team Girl 💖`
    );

    nameInput.value = "";
    createConfetti();
  } catch (error) {
    if (error.message === "duplicate-name") {
      showMessage("That name has already been used for a vote.", true);
    } else {
      console.error(error);
      showMessage("Something went wrong while saving the vote.", true);
    }
  } finally {
    setVotingState(false);
  }
}

boyBtn.addEventListener("click", () => submitGuess("Boy"));
girlBtn.addEventListener("click", () => submitGuess("Girl"));

const guessesQuery = query(collection(db, "guesses"), orderBy("createdAt", "desc"));

onSnapshot(guessesQuery, (snapshot) => {
  const guesses = snapshot.docs.map((docSnap) => docSnap.data());

  const boyCount = guesses.filter((g) => g.guess === "Boy").length;
  const girlCount = guesses.filter((g) => g.guess === "Girl").length;
  const total = boyCount + girlCount;

  const boyPercent = total ? Math.round((boyCount / total) * 100) : 0;
  const girlPercent = total ? Math.round((girlCount / total) * 100) : 0;

  boyCountEl.textContent = boyCount;
  girlCountEl.textContent = girlCount;
  boyPercentEl.textContent = `${boyPercent}%`;
  girlPercentEl.textContent = `${girlPercent}%`;

  boyBarEl.style.width = `${boyPercent}%`;
  girlBarEl.style.width = `${girlPercent}%`;

  totalVotesEl.textContent = `${total} total vote${total === 1 ? "" : "s"}`;

  if (!guesses.length) {
    guessesListEl.innerHTML = `<div class="empty">No votes yet — be the first!</div>`;
    return;
  }

  guessesListEl.innerHTML = guesses
    .slice(0, 20)
    .map((entry) => {
      const tagClass = entry.guess === "Boy" ? "tag-boy" : "tag-girl";
      return `
        <div class="guess-item">
          <div class="guess-name">${escapeHtml(entry.name)}</div>
          <div class="guess-meta">
            <span class="tag ${tagClass}">${entry.guess === "Boy" ? "💙 Team Boy" : "💖 Team Girl"}</span>
            <span class="time-text">${formatTime(entry.createdAt)}</span>
          </div>
        </div>
      `;
    })
    .join("");
});