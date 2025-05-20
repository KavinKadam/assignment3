const difficultySettings = {
  easy: { pairs: 3, time: 45 },
  medium: { pairs: 6, time: 75 },
  hard: { pairs: 9, time: 120 }
};

let allPokemon = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let clickCount = 0;
let timerInterval;
let remainingTime = 0;
let powerUsed = false;

$(document).ready(() => {
  fetch("https://pokeapi.co/api/v2/pokemon?limit=1500")
      .then(res => res.json())
      .then(data => allPokemon = data.results)
      .catch(err => console.error("Failed to fetch Pokémon list", err));

  $("#startBtn").click(startGame);
  $("#resetBtn").click(resetGame);
  $("#themeToggle").click(() => $("body").toggleClass("dark"));
  $("#powerUpBtn").click(triggerPowerUp);
});

function startGame() {
  const difficulty = $("#difficulty").val();
  const { pairs, time } = difficultySettings[difficulty];

  matchedPairs = 0;
  clickCount = 0;
  remainingTime = time;
  powerUsed = false;
  updateStatus();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingTime--;
    updateStatus();
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      gameOver(false);
    }
  }, 1000);

  const selected = getRandomPokemon(pairs);
  const duplicated = shuffle([...selected, ...selected]);
  renderCards(duplicated);
}

function getRandomPokemon(count) {
  const selected = [];
  const usedIndexes = new Set();
  while (selected.length < count) {
    const index = Math.floor(Math.random() * 1025);
    if (!usedIndexes.has(index)) {
      usedIndexes.add(index);
      selected.push(allPokemon[index]);
    }
  }
  return selected;
}

async function renderCards(pokemonArray) {
  const grid = $("#game_grid");
  grid.empty();

  const promises = pokemonArray.map(async (poke, i) => {
    const details = await fetch(poke.url).then(res => res.json());
    const imgUrl = details.sprites.other["official-artwork"].front_default;

    const card = $("<div class='card'></div>").data("poke", poke.name);
    const front = $(`<img class='front_face' src='${imgUrl}' />`);
    const back = $(`<img class='back_face' src='assets/back.webp' />`);

    card.append(front).append(back);
    card.click(() => handleCardClick(card));

    grid.append(card);
  });

  await Promise.all(promises);
}

function handleCardClick(card) {
  if (lockBoard || card.hasClass("matched") || card.hasClass("flip")) return;
  card.addClass("flip");
  clickCount++;
  updateStatus();

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;

  const match = firstCard.data("poke") === secondCard.data("poke");

  if (match) {
    firstCard.addClass("matched");
    secondCard.addClass("matched");
    matchedPairs++;
    resetFlips();
    if (matchedPairs === $(".card").length / 2) gameOver(true);
  } else {
    setTimeout(() => {
      firstCard.removeClass("flip");
      secondCard.removeClass("flip");
      resetFlips();
    }, 1000);
  }
}

function resetFlips() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function updateStatus() {
  $("#clickCount").text(`Clicks: ${clickCount}`);
  $("#pairsMatched").text(`Matched: ${matchedPairs}`);
  const total = $(".card").length / 2;
  $("#pairsLeft").text(`Left: ${total - matchedPairs}`);
  $("#timer").text(`Time: ${remainingTime}s`);
}

function gameOver(won) {
  clearInterval(timerInterval);
  $("#message").text(won ? "You Win!" : "Game Over!");
  $(".card").off("click");
}

function resetGame() {
  clearInterval(timerInterval);
  $("#game_grid").empty();
  $("#message").text("");
  updateStatus();
  [firstCard, secondCard] = [null, null];
}

function shuffle(arr) {
  const newArr = arr.slice();
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = i - Math.floor(Math.random() * Math.min(3, i + 1)); // reduce tight clustering
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function triggerPowerUp() {
  if (powerUsed) return;
  powerUsed = true;
  $(".card").addClass("flip");
  setTimeout(() => {
    $(".card").not(".matched").removeClass("flip");
  }, 3000);
}