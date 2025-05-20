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
  const duplicated = [];
  selected.forEach(poke => {
    duplicated.push({ ...poke });
    duplicated.push({ ...poke });
  });

  const spaced = improvedShuffle(duplicated);
  renderCards(spaced);
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

function improvedShuffle(arr) {
  const totalSlots = arr.length;

  const gridElement = document.getElementById('game_grid');
  const cardWidth = 110;
  const gridWidth = Math.floor(gridElement.offsetWidth / cardWidth);

  const placed = new Array(totalSlots).fill(null);
  const used = new Set();

  function getXY(index) {
    return [index % gridWidth, Math.floor(index / gridWidth)];
  }

  function areVisuallyAdjacent(i1, i2) {
    const [x1, y1] = getXY(i1);
    const [x2, y2] = getXY(i2);
    return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
  }

  for (let i = 0; i < arr.length; i += 2) {
    const pair = arr[i];

    let idx1;
    do {
      idx1 = Math.floor(Math.random() * totalSlots);
    } while (used.has(idx1));
    placed[idx1] = pair;
    used.add(idx1);

    let idx2, attempts = 0;
    do {
      idx2 = Math.floor(Math.random() * totalSlots);
      attempts++;
    } while (
        used.has(idx2) ||
        (areVisuallyAdjacent(idx1, idx2) && attempts < 100)
        );
    placed[idx2] = pair;
    used.add(idx2);
  }

  return placed;
}

function triggerPowerUp() {
  if (powerUsed) return;
  powerUsed = true;
  $(".card").addClass("flip");
  setTimeout(() => {
    $(".card").not(".matched").removeClass("flip");
  }, 3000);
}
